/// <reference types='vitest' />
import path from 'path';
import fs from 'fs';

import tsconfigPaths from 'vite-tsconfig-paths';
import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv } from 'vite';
import checker from 'vite-plugin-checker';
import tailwindcss from '@tailwindcss/vite';
import customHtmlPlugin from './vite-plugins/html-plugin';

// Load root .env file to get AP_BMP_ENABLED and other env vars
function loadRootEnv() {
  const rootEnvPath = path.resolve(__dirname, '../../.env');
  const envVars: Record<string, string> = {};
  
  if (fs.existsSync(rootEnvPath)) {
    const content = fs.readFileSync(rootEnvPath, 'utf-8');
    content.split('\n').forEach(line => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const [key, ...valueParts] = trimmed.split('=');
        if (key) {
          envVars[key.trim()] = valueParts.join('=').trim().replace(/^["']|["']$/g, '');
        }
      }
    });
  }
  
  return envVars;
}

export default defineConfig(({ command, mode }) => {
  const isDev = command === 'serve' || mode === 'development';
  
  // Load environment from root .env file
  const rootEnv = loadRootEnv();

  const AP_TITLE = 'Activepieces';
  const AP_FAVICON = 'https://activepieces.com/favicon.ico';

  return {
    root: __dirname,
    cacheDir: '../../node_modules/.vite/packages/web',
    server: {
      allowedHosts: ['overdiversely-preeruptive-margaretta.ngrok-free.dev'],
      proxy: {
        '/api': {
          target: 'http://127.0.0.1:3000',
          secure: false,
          changeOrigin: true,
          headers: {
            Host: '127.0.0.1:4300',
          },
          ws: true,
          configure: (proxy) => {
            proxy.on('error', (err) => {
              if (err.message.includes('ECONNRESET') || err.message.includes('ECONNREFUSED')) {
                return;
              }
              console.error('[vite] proxy error:', err.message);
            });
          },
        },
        '/mcp': {
          target: 'http://127.0.0.1:3000',
          secure: false,
          changeOrigin: true,
        },
        '/.well-known/oauth-authorization-server': {
          target: 'http://127.0.0.1:3000',
          secure: false,
          changeOrigin: true,
        },
      },
      port: 4300,
      host: '0.0.0.0',
    },

    preview: {
      port: 4300,
      host: 'localhost',
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
        '@activepieces/shared': path.resolve(
          __dirname,
          '../../packages/shared/src',
        ),
        'ee-embed-sdk': path.resolve(
          __dirname,
          '../../packages/ee/embed-sdk/src',
        ),
        '@activepieces/pieces-framework': path.resolve(
          __dirname,
          '../../packages/pieces/framework/src',
        ),
        '@activepieces/pieces-common': path.resolve(
          __dirname,
          '../../packages/pieces/common/src',
        ),
        // request-filtering-agent extends Node.js http.Agent and cannot run in the browser.
        // SSRF protection is server-side only, so we stub it out for the browser bundle.
        'request-filtering-agent': path.resolve(
          __dirname,
          './src/stubs/request-filtering-agent.ts',
        ),
      },
    },
    optimizeDeps: {
      include: ['@activepieces/shared', '@activepieces/pieces-framework', '@activepieces/pieces-common'],
      esbuildOptions: {
        loader: {
          '.ts': 'ts',
        },
      },
    },
    plugins: [
      react(),
      tailwindcss(),
      tsconfigPaths(),
      customHtmlPlugin({
        title: AP_TITLE,
        icon: AP_FAVICON,
      }),
      ...(isDev
        ? [
            checker({
              typescript: {
                buildMode: true,
                tsconfigPath: './tsconfig.json',
                root: __dirname,
              },
            }),
          ]
        : []),
    ],

    // Expose BMP feature flag from environment (loaded from root .env)
    define: {
      'import.meta.env.VITE_BMP_ENABLED': JSON.stringify(
        process.env.AP_BMP_ENABLED ?? rootEnv.AP_BMP_ENABLED ?? 'false'
      ),
    },

    build: {
      outDir: '../../dist/packages/web',
      emptyOutDir: true,
      reportCompressedSize: true,
      commonjsOptions: {
        transformMixedEsModules: true,
      },
      rollupOptions: {
        onLog(level, log, handler) {
          if (
            log.cause &&
            log.message.includes(`Can't resolve original location of error.`)
          ) {
            return;
          }
          handler(level, log);
        },
      },
    },
  };
});
