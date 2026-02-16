#!/usr/bin/env node

/**
 * Validates and fixes react-ui-sdk bundle configuration
 * 
 * This script ensures that the bundle target has generatePackageJson set to false
 * to prevent Nx dependency graph analysis errors when using file: protocol dependencies.
 * 
 * Run automatically before bundle builds to prevent build failures.
 */

const fs = require('fs');
const path = require('path');

const PROJECT_JSON_PATH = path.join(__dirname, '../project.json');

console.log('🔍 Validating react-ui-sdk bundle configuration...');

try {
  // Read project.json
  const projectJson = JSON.parse(fs.readFileSync(PROJECT_JSON_PATH, 'utf8'));
  
  let needsUpdate = false;
  
  // Check bundle target
  if (projectJson.targets && projectJson.targets.bundle) {
    const bundleTarget = projectJson.targets.bundle;
    
    // Check if generatePackageJson is enabled
    if (bundleTarget.options && bundleTarget.options.generatePackageJson === true) {
      console.log('⚠️  Found generatePackageJson: true in bundle target');
      console.log('📝 Setting generatePackageJson: false (browser bundles don\'t need package.json)');
      
      bundleTarget.options.generatePackageJson = false;
      needsUpdate = true;
    } else if (bundleTarget.options && bundleTarget.options.generatePackageJson === false) {
      console.log('✅ Bundle configuration is correct (generatePackageJson: false)');
    } else {
      console.log('ℹ️  generatePackageJson not specified, adding explicit false value');
      bundleTarget.options = bundleTarget.options || {};
      bundleTarget.options.generatePackageJson = false;
      needsUpdate = true;
    }
  } else {
    console.log('⚠️  Bundle target not found in project.json');
    process.exit(1);
  }
  
  // Write back if needed
  if (needsUpdate) {
    fs.writeFileSync(
      PROJECT_JSON_PATH,
      JSON.stringify(projectJson, null, 2) + '\n',
      'utf8'
    );
    console.log('✅ Updated project.json successfully');
  }
  
  console.log('✅ Bundle configuration validation complete\n');
  process.exit(0);
  
} catch (error) {
  console.error('❌ Error validating bundle configuration:', error.message);
  process.exit(1);
}
