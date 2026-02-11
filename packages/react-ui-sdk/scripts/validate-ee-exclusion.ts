#!/usr/bin/env ts-node
/**
 * EE Exclusion Validator Script
 * 
 * This script validates that the SDK does not contain any EE imports.
 * It runs as part of the build process and will fail the build if violations are found.
 * 
 * Usage: ts-node scripts/validate-ee-exclusion.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import { validateFileContent, validateFilePath, getBlockedEEPackages } from '../src/utils/ee-import-validator';

const SDK_ROOT = path.resolve(__dirname, '..');
const SRC_DIR = path.join(SDK_ROOT, 'src');

interface ValidationResult {
  file: string;
  isValid: boolean;
  violations: string[];
}

/**
 * Recursively finds all TypeScript files in a directory
 */
function findTSFiles(dir: string, fileList: string[] = []): string[] {
  const files = fs.readdirSync(dir);

  files.forEach((file) => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      // Skip node_modules, dist, and test directories
      if (!['node_modules', 'dist', '.git', 'coverage'].includes(file)) {
        findTSFiles(filePath, fileList);
      }
    } else if (file.endsWith('.ts') || file.endsWith('.tsx')) {
      // Skip test files
      if (!file.includes('.spec.') && !file.includes('.test.')) {
        fileList.push(filePath);
      }
    }
  });

  return fileList;
}

/**
 * Validates package.json for EE dependencies
 */
function validatePackageJson(): { isValid: boolean; violations: string[] } {
  const packageJsonPath = path.join(SDK_ROOT, 'package.json');
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
  const violations: string[] = [];
  const blockedPackages = getBlockedEEPackages();

  // Check dependencies
  const allDeps = {
    ...packageJson.dependencies,
    ...packageJson.devDependencies,
    ...packageJson.peerDependencies,
  };

  Object.keys(allDeps).forEach((dep) => {
    if (blockedPackages.some((blocked) => dep.includes(blocked.replace('@activepieces/', '')))) {
      violations.push(`EE package found in dependencies: ${dep}`);
    }
  });

  return {
    isValid: violations.length === 0,
    violations,
  };
}

/**
 * Main validation function
 */
function validateSDK(): boolean {
  console.log('🔍 Validating EE exclusion in React UI SDK...\n');

  const results: ValidationResult[] = [];
  const tsFiles = findTSFiles(SRC_DIR);

  // Validate package.json
  console.log('📦 Validating package.json...');
  const packageJsonResult = validatePackageJson();
  if (!packageJsonResult.isValid) {
    console.error('❌ Package.json violations:');
    packageJsonResult.violations.forEach((v) => console.error(`   - ${v}`));
    results.push({
      file: 'package.json',
      isValid: false,
      violations: packageJsonResult.violations,
    });
  } else {
    console.log('✅ package.json is valid\n');
  }

  // Validate TypeScript files
  console.log(`📝 Validating ${tsFiles.length} TypeScript files...\n`);
  tsFiles.forEach((filePath) => {
    const relativePath = path.relative(SDK_ROOT, filePath);

    // Validate file path
    if (!validateFilePath(filePath)) {
      results.push({
        file: relativePath,
        isValid: false,
        violations: ['File path contains EE directory reference'],
      });
      return;
    }

    // Validate file content
    const content = fs.readFileSync(filePath, 'utf-8');
    const validation = validateFileContent(content, relativePath);

    if (!validation.isValid) {
      results.push({
        file: relativePath,
        isValid: false,
        violations: validation.violations,
      });
    }
  });

  // Report results
  const invalidFiles = results.filter((r) => !r.isValid);

  if (invalidFiles.length === 0) {
    console.log('✅ All files passed EE exclusion validation!\n');
    return true;
  }

  console.error(`\n❌ Found ${invalidFiles.length} file(s) with EE import violations:\n`);
  invalidFiles.forEach((result) => {
    console.error(`📄 ${result.file}:`);
    result.violations.forEach((violation) => {
      console.error(`   ❌ ${violation}`);
    });
    console.error('');
  });

  console.error('🚫 Build failed: EE imports are not allowed in CE SDK.\n');
  return false;
}

// Run validation
if (require.main === module) {
  const isValid = validateSDK();
  process.exit(isValid ? 0 : 1);
}

export { validateSDK };
