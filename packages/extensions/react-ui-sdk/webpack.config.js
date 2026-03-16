const { composePlugins, withNx } = require('@nx/webpack');
const path = require('path');
const NormalModuleReplacementPlugin = require('webpack').NormalModuleReplacementPlugin;

module.exports = composePlugins(withNx(), (config) => {
  // Configure output for pure ES module format (no CommonJS require)
  config.experiments = config.experiments || {};
  config.experiments.outputModule = true;
  
  config.output = config.output || {};
  // Output as ES module
  config.output.module = true;
  config.output.library = {
    type: 'module',
  };
  
  // Manually expose to window after module loads
  // Add a plugin to expose exports to window
  if (!config.plugins) {
    config.plugins = [];
  }
  
  // Add DefinePlugin to replace import.meta at build time
  const webpack = require('webpack');
  config.plugins.push(
    new webpack.DefinePlugin({
      'import.meta.env': JSON.stringify({ MODE: 'development' }),
      'import.meta.url': JSON.stringify(''),
    })
  );
  
  // Add custom plugin to expose module exports after webpack runtime executes
  // Create a custom plugin that runs after compilation to expose exports
  class ExposeModulePlugin {
    apply(compiler) {
      compiler.hooks.thisCompilation.tap('ExposeModulePlugin', (compilation) => {
        compilation.hooks.processAssets.tap(
          {
            name: 'ExposeModulePlugin',
            stage: webpack.Compilation.PROCESS_ASSETS_STAGE_OPTIMIZE,
          },
          (assets) => {
            // Modify the output to expose module exports
            const chunk = Array.from(compilation.chunks)[0];
            const filename = chunk.files.values().next().value;
            const asset = assets[filename];
            
            if (asset) {
              let source = asset.source();
              
              // First, convert ES module exports to CommonJS (before wrapping in IIFE)
              const exportMatch = source.match(/export\s+\{([^}]+)\}\s*;?\s*$/m);
              if (exportMatch) {
                const exports = exportMatch[1].split(',').map(e => e.trim()).filter(Boolean);
                const exportAssignments = exports.map(exp => {
                  // Handle "name as alias" syntax
                  const parts = exp.split(/\s+as\s+/);
                  const exportName = parts[0].trim();
                  const alias = parts[1] ? parts[1].trim() : exportName;
                  return `  ${alias}: ${exportName}`;
                }).join(',\n');
                
                // Replace export statement with object assignment
                source = source.replace(
                  /export\s+\{[^}]+\}\s*;?\s*$/m,
                  `\n// Convert ES exports to CommonJS for script tag loading\n(function() {\n  var exports = {\n${exportAssignments}\n  };\n  \n  // Expose to window\n  if (typeof window !== 'undefined') {\n    window.__AP_SDK_MODULE__ = exports;\n    console.log('✅ SDK module exposed to window:', Object.keys(exports));\n  }\n})();`
                );
              }
              
              // Replace any remaining import.meta references
              let modifiedSource = source;
              
              // Replace ALL import.meta references (including in strings/comments)
              modifiedSource = modifiedSource.replace(
                /import\.meta\.url/g,
                '(typeof window !== "undefined" ? window.location.href : "")'
              );
              
              modifiedSource = modifiedSource.replace(
                /import\.meta\.env/g,
                '{ MODE: "development" }'
              );
              
              modifiedSource = modifiedSource.replace(
                /import\.meta/g,
                '{ env: { MODE: "development" }, url: (typeof window !== "undefined" ? window.location.href : "") }'
              );
              
              // Fix publicPath for SDK script-tag loading: prefer window.__AP_SDK_BASE_PATH__ (set by
              // host before loading), fallback to document.currentScript or script search
              modifiedSource = modifiedSource.replace(
                /if \(typeof \(typeof window !== "undefined" \? window\.location\.href : ""\) === "string"\) scriptUrl = \(typeof window !== "undefined" \? window\.location\.href : ""\)/,
                'if (typeof window !== "undefined" && window.__AP_SDK_BASE_PATH__) { scriptUrl = window.__AP_SDK_BASE_PATH__; } else if (typeof document !== "undefined") { if (document.currentScript && document.currentScript.src) { scriptUrl = document.currentScript.src; } else { var _sc = document.getElementsByTagName("script"); for (var _i = _sc.length - 1; _i >= 0; _i--) { var _src = _sc[_i].src; if (_src && _src.indexOf("sdk/index.js") !== -1) { scriptUrl = _src; break; } } } } if (!scriptUrl && typeof (typeof window !== "undefined" ? window.location.href : "") === "string") { scriptUrl = (typeof window !== "undefined" ? window.location.href : ""); }'
              );
              // Set locales path in same block so i18n finds it (must run before i18n init)
              modifiedSource = modifiedSource.replace(
                /(__webpack_require__\.p = scriptUrl;)/,
                '$1; if (typeof window !== "undefined" && scriptUrl) { window.__ACTIVEPIECES_SDK_LOCALES_PATH__ = scriptUrl + "locales/{{lng}}/{{ns}}.json"; }'
              );
              
              // Webpack generates require() calls for externalized modules
              // We need to replace these with a polyfill that works in browser context
              // The key is to replace require() BEFORE webpack's external handling code runs
              // So we replace require() calls that reference external modules
              
              // First, replace require() calls for Angular externals with a stub
              // This defers the error until Angular is actually used
              // The stub will throw when accessed, providing a helpful error message
              modifiedSource = modifiedSource.replace(
                /\brequire\s*\(\s*["']@angular\/core["']\s*\)/g,
                '(function() { return { __ANGULAR_STUB__: true, __ERROR__: "@angular/core is externalized and must be provided by the Angular host application" }; })()'
              );
              modifiedSource = modifiedSource.replace(
                /\brequire\s*\(\s*["']@angular\/common["']\s*\)/g,
                '(function() { return { __ANGULAR_STUB__: true, __ERROR__: "@angular/common is externalized and must be provided by the Angular host application" }; })()'
              );
              
              // Replace all other require() calls with __webpack_require__
              modifiedSource = modifiedSource.replace(
                /\brequire\s*\(/g,
                '__webpack_require__('
              );
              
              // Wrap in IIFE to avoid global scope conflicts (e.g., 'chrome' variable, 'FlowBuilder')
              // The IIFE scope will naturally shadow any global variables that the bundle declares
              // IMPORTANT: We need to ensure React's scheduler runs synchronously by NOT using setTimeout
              // in the module exposure code below
              modifiedSource = `(function() {\n"use strict";\n${modifiedSource}\n})();\n`;
              // The minified bundle handles variable scoping correctly without IIFE
              
              // Append fallback code to expose exports after webpack runtime executes
              // This is a backup in case the export conversion didn't work
              const exposeCode = `
// Expose module exports to window for script tag access
(function() {
  if (typeof window !== 'undefined') {
    // Wait for webpack runtime to complete
    setTimeout(function() {
      try {
        // For webpack ES module output, exports are in module scope
        // Try to access via webpack's module system
        if (typeof __webpack_require__ !== 'undefined') {
          // Get the entry module from webpack's cache
          var entryModuleId = __webpack_require__.s;
          if (entryModuleId && __webpack_require__.cache && __webpack_require__.cache[entryModuleId]) {
            var entryModule = __webpack_require__.cache[entryModuleId];
            // For ES modules, webpack stores exports in module.exports
            if (entryModule && entryModule.exports) {
              window.__AP_SDK_MODULE__ = entryModule.exports;
              console.log('✅ SDK module exposed via webpack cache');
              return;
            }
          }
        }
        
        // Fallback: try __webpack_exports__ if available
        if (typeof __webpack_exports__ !== 'undefined') {
          window.__AP_SDK_MODULE__ = __webpack_exports__;
          console.log('✅ SDK module exposed via __webpack_exports__');
          return;
        }
        
        // Only warn if module was not already exposed by the primary export conversion
        if (typeof window.__AP_SDK_MODULE__ === 'undefined') {
          console.warn('⚠️ Could not find webpack exports. Module may not be accessible.');
        }
      } catch(e) {
        console.error('❌ Error exposing SDK module:', e);
      }
    }, 100);
  }
})();
`;
              compilation.updateAsset(filename, new webpack.sources.ConcatSource(modifiedSource, exposeCode));
            }
          }
        );
      });
    }
  }
  
  config.plugins.push(new ExposeModulePlugin());
  
  // Ensure we're outputting ES modules, not CommonJS
  config.output.environment = {
    module: true,
    dynamicImport: true,
    arrowFunction: true,
    const: true,
    destructuring: true,
    forOf: true,
  };
  
  // Force webpack to use ES module format for all modules
  config.optimization = config.optimization || {};
  config.optimization.moduleIds = 'deterministic';
  
  // Add alias for web imports - resolve relative paths
  config.resolve = config.resolve || {};
  // Path to packages/web/src from packages/extensions/react-ui-sdk
  const webSrcPath = path.resolve(__dirname, '../../web/src');
  const workspaceRoot = path.resolve(__dirname, '../../../');
  
  // Add path aliases for web internal imports (@/...) and workspace packages
  // IMPORTANT: Alias React, ReactDOM, React Query, and React Router to ensure only ONE instance is bundled
  // Multiple instances cause hooks errors ("useState is null", "No QueryClient set", "useLocation outside Router")
  const reactPath = path.resolve(workspaceRoot, 'node_modules/react');
  const reactDomPath = path.resolve(workspaceRoot, 'node_modules/react-dom');
  const reactQueryPath = path.resolve(workspaceRoot, 'node_modules/@tanstack/react-query');
  // Use the same react-router-dom instance that packages/web uses
  const reactRouterDomPath = path.resolve(workspaceRoot, 'node_modules/.bun/react-router-dom@6.11.2+bf16f8eded5e12ee/node_modules/react-router-dom');
  const reactRouterPath = path.resolve(workspaceRoot, 'node_modules/.bun/react-router@6.11.2+b1ab299f0a400331/node_modules/react-router');
  
  // Force single instance of floating-ui for Radix Popper positioning
  const floatingUiCorePath = path.resolve(workspaceRoot, 'node_modules/.bun/@floating-ui+core@1.7.5/node_modules/@floating-ui/core');
  const floatingUiDomPath = path.resolve(workspaceRoot, 'node_modules/.bun/@floating-ui+dom@1.7.6/node_modules/@floating-ui/dom');
  const floatingUiReactDomPath = path.resolve(workspaceRoot, 'node_modules/.bun/@floating-ui+react-dom@2.1.8+bf16f8eded5e12ee/node_modules/@floating-ui/react-dom');
  
  config.resolve.alias = {
    ...config.resolve.alias,
    // Force single React instance - critical for hooks to work
    'react': reactPath,
    'react-dom': reactDomPath,
    'react/jsx-runtime': path.resolve(reactPath, 'jsx-runtime'),
    'react/jsx-dev-runtime': path.resolve(reactPath, 'jsx-dev-runtime'),
    // Force single React Query instance - critical for QueryClient context
    '@tanstack/react-query': reactQueryPath,
    // Force single React Router instance - critical for useLocation/useNavigate hooks
    'react-router-dom': reactRouterDomPath,
    'react-router': reactRouterPath,
    // Force single floating-ui instance - critical for Radix Popper positioning
    '@floating-ui/core': floatingUiCorePath,
    '@floating-ui/dom': floatingUiDomPath,
    '@floating-ui/react-dom': floatingUiReactDomPath,
    '@': webSrcPath, // Map @/ to web/src/
    '@activepieces/shared': path.resolve(workspaceRoot, 'packages/shared/src'),
    '@activepieces/ee-shared': path.resolve(workspaceRoot, 'packages/ee/shared/src'),
    '@activepieces/pieces-framework': path.resolve(workspaceRoot, 'packages/pieces/framework/src'),
    '@activepieces/pieces-common': path.resolve(workspaceRoot, 'packages/pieces/common/src'),
    '@activepieces/piece-ai': path.resolve(workspaceRoot, 'packages/pieces/community/ai/src'),
    // Stub out EE embed SDK for CE build
    'ee-embed-sdk': path.resolve(__dirname, 'src/stubs/ee-embed-sdk-stub.ts'),
  };
  
  // Add modules directory to resolve paths from workspace root
  config.resolve.modules = [
    ...(config.resolve.modules || ['node_modules']),
    workspaceRoot,
    path.resolve(__dirname, '../../packages'),
  ];
  
  // Ensure .tsx and .ts files are resolved
  config.resolve.extensions = [
    '.tsx',
    '.ts',
    '.jsx',
    '.js',
    '.json',
    ...(config.resolve.extensions || []),
  ];

  // Add plugin to replace relative react-ui paths with absolute paths
  if (!config.plugins) {
    config.plugins = [];
  }
  
  // Replace relative imports like ../../../web/src/... with absolute paths
  config.plugins.push(
    new NormalModuleReplacementPlugin(
      /^\.\.\/\.\.\/\.\.\/web\/src\//,
      (resource) => {
        // Get the relative path after web/src/
        const match = resource.request.match(/\.\.\/\.\.\/\.\.\/web\/src\/(.+)/);
        if (match) {
          const relativePath = match[1];
          resource.request = path.resolve(webSrcPath, relativePath);
        }
      }
    )
  );

  // Don't externalize dependencies - bundle everything for standalone browser usage
  // When loaded directly in browser, bare module specifiers won't resolve
  // So we bundle React and other dependencies into the SDK
  // Note: Angular components are excluded from the browser bundle (see index.browser.ts)
  // so no Angular externals are needed
  config.externals = {
    // All dependencies are bundled for browser compatibility
  };

  // Add fallbacks for Node.js modules (needed for browser bundle)
  config.resolve.fallback = {
    ...config.resolve.fallback,
    'util': false,
    'path': false,
    'fs': false,
    'stream': false,
    'crypto': false,
    'http': false,
    'https': false,
    'net': false,
    'tls': false,
    'url': false,
    'zlib': false,
    'os': false,
    'assert': false,
    'buffer': false,
    'querystring': false,
  };

  // Handle mime-types package that tries to use Node.js 'path' module
  // We need to provide a browser-compatible shim or exclude it
  // Since mime-types is used by axios/form-data, we'll provide a minimal shim
  config.plugins.push(
    new NormalModuleReplacementPlugin(
      /^path$/,
      (resource) => {
        // Replace path module with an empty object for browser compatibility
        resource.request = path.resolve(__dirname, 'src/stubs/path-stub.js');
      }
    )
  );

  // Handle util module used by form-data/delayed-stream
  // Provide browser-compatible polyfill for util.inherits
  config.plugins.push(
    new NormalModuleReplacementPlugin(
      /^util$/,
      (resource) => {
        resource.request = path.resolve(__dirname, 'src/stubs/util-stub.js');
      }
    )
  );

  // Handle stream module used by form-data/delayed-stream
  // Provide browser-compatible polyfill for Stream class
  config.plugins.push(
    new NormalModuleReplacementPlugin(
      /^stream$/,
      (resource) => {
        resource.request = path.resolve(__dirname, 'src/stubs/stream-stub.js');
      }
    )
  );

  // Handle CSS imports and assets
  config.module = config.module || {};
  config.module.rules = config.module.rules || [];
  
  // Add/update CSS rule to include postcss-loader for Tailwind (web styles.css)
  const cssRuleIndex = config.module.rules.findIndex(rule => 
    rule.test && rule.test.toString().includes('css')
  );
  const cssLoaders = ['style-loader', 'css-loader', {
    loader: 'postcss-loader',
    options: {
      postcssOptions: {
        config: path.resolve(__dirname, '../../web/postcss.config.js'),
      },
    },
  }];
  if (cssRuleIndex >= 0) {
    config.module.rules[cssRuleIndex].use = cssLoaders;
  } else {
    config.module.rules.push({
      test: /\.css$/i,
      use: cssLoaders,
    });
  }
  
  // Add asset loaders for images and other files
  const hasAssetRule = config.module.rules.some(rule => 
    rule.test && (rule.test.toString().includes('png') || rule.test.toString().includes('jpg') || rule.test.toString().includes('svg'))
  );
  
  if (!hasAssetRule) {
    config.module.rules.push({
      test: /\.(png|jpe?g|gif|svg|ico|webp)$/i,
      type: 'asset/resource',
      generator: {
        filename: 'assets/[name][ext]',
      },
    });
  }

  return config;
});
