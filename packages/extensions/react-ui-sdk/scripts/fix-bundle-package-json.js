#!/usr/bin/env node
/**
 * Fixes the package.json in the bundle output so main/exports point to ./index.js
 * (The bundle outputs index.js at root, not in dist/)
 */
const fs = require('fs');
const path = require('path');

const bundleDir = path.resolve(__dirname, '../../../../dist/packages/extensions/react-ui-sdk-bundled');
const pkgPath = path.join(bundleDir, 'package.json');
const sourcePkgPath = path.resolve(__dirname, '../package.json');

let pkg;
if (fs.existsSync(pkgPath)) {
  pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
} else if (fs.existsSync(sourcePkgPath)) {
  pkg = JSON.parse(fs.readFileSync(sourcePkgPath, 'utf8'));
  fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');
  console.log('Created package.json in bundle from source');
} else {
  console.error('No package.json found at', pkgPath, 'or', sourcePkgPath);
  process.exit(1);
}

const publishScope = (process.env.SDK_PUBLISH_SCOPE ?? '').trim().replace(/^@/, '');
const publishRegistry = (process.env.SDK_PUBLISH_REGISTRY ?? '').trim();
const repositoryUrl = (process.env.SDK_PUBLISH_REPO_URL ?? '').trim();

pkg.main = './index.js';
pkg.types = undefined; // Bundle has no .d.ts
pkg.exports = {
  '.': {
    import: './index.js',
    require: './index.js',
    types: undefined,
  },
};

// Remove types from exports if undefined
if (pkg.exports['.'].types === undefined) {
  delete pkg.exports['.'].types;
}

// For registry publishing: avoid monorepo-only dependency specifiers.
if (pkg.dependencies?.['@activepieces/shared']) {
  delete pkg.dependencies['@activepieces/shared'];
}

// Publishable metadata for GitHub Packages (or any private registry).
if (publishScope.length > 0) {
  pkg.name = `@${publishScope}/react-ui-sdk`;
}
if (publishRegistry.length > 0) {
  pkg.publishConfig = {
    ...(pkg.publishConfig ?? {}),
    registry: publishRegistry,
  };
}
if (repositoryUrl.length > 0) {
  pkg.repository = {
    type: 'git',
    url: repositoryUrl,
  };
}
pkg.private = false;

// The bundle output is self-contained; publish only what consumers need.
pkg.files = [
  'index.js',
  '*.woff2',
  'assets',
  'locales',
  'LICENSE',
  'README.md',
  'package.json',
];

fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');
console.log('✅ Fixed bundle package.json: main -> ./index.js');
