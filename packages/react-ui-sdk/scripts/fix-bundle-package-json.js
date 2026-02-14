#!/usr/bin/env node
/**
 * Fixes the package.json in the bundle output so main/exports point to ./index.js
 * (The bundle outputs index.js at root, not in dist/)
 */
const fs = require('fs');
const path = require('path');

const bundleDir = path.resolve(__dirname, '../../../dist/packages/react-ui-sdk-bundled');
const pkgPath = path.join(bundleDir, 'package.json');

if (!fs.existsSync(pkgPath)) {
  console.error('Bundle package.json not found at', pkgPath);
  process.exit(1);
}

const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
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

// Replace workspace:* with file: path so the bundle works when consumed outside the monorepo
// (e.g. angular-test-app). Path is relative to the bundle: dist/packages/react-ui-sdk-bundled
if (pkg.dependencies && pkg.dependencies['@activepieces/shared'] === 'workspace:*') {
  pkg.dependencies['@activepieces/shared'] = 'file:../../../packages/shared';
}

fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');
console.log('✅ Fixed bundle package.json: main -> ./index.js');
