/**
 * EE Import Validator
 * 
 * This utility validates that no Enterprise Edition (EE) code is imported
 * in the SDK. This is critical for maintaining MIT license compliance.
 * 
 * This validator is used at build-time to ensure EE exclusion.
 */

const EE_IMPORT_PATTERNS = [
  /from\s+['"]@activepieces\/ee-/,
  /from\s+['"]ee-embed-sdk/,
  /from\s+['"]@activepieces\/ee\//,
  /import\s+.*\s+from\s+['"]@activepieces\/ee-/,
  /import\s+.*\s+from\s+['"]ee-embed-sdk/,
  /require\(['"]@activepieces\/ee-/,
  /require\(['"]ee-embed-sdk/,
  /packages\/ee\//,
  /packages\/server\/api\/src\/app\/ee\//,
];

const EE_PATH_PATTERNS = [
  /packages\/ee\//,
  /packages\/server\/api\/src\/app\/ee\//,
  /\.\.\/.*\/ee\//,
  /\.\/ee\//,
];

/**
 * Validates that a file does not contain EE imports
 */
export function validateFileContent(content: string, filePath: string): {
  isValid: boolean;
  violations: string[];
} {
  const violations: string[] = [];

  // Check for EE import patterns
  EE_IMPORT_PATTERNS.forEach((pattern, index) => {
    if (pattern.test(content)) {
      violations.push(`EE import pattern detected (pattern ${index + 1}): ${pattern}`);
    }
  });

  // Check for EE paths in imports
  EE_PATH_PATTERNS.forEach((pattern) => {
    if (pattern.test(content)) {
      violations.push(`EE path detected in file: ${filePath}`);
    }
  });

  return {
    isValid: violations.length === 0,
    violations,
  };
}

/**
 * Validates that a file path is not in an EE directory
 */
export function validateFilePath(filePath: string): boolean {
  return !EE_PATH_PATTERNS.some((pattern) => pattern.test(filePath));
}

/**
 * Gets a list of EE-related package names that should be blocked
 */
export function getBlockedEEPackages(): string[] {
  return [
    '@activepieces/ee-shared',
    '@activepieces/ee-auth',
    '@activepieces/ee/billing/ui',
    'ee-embed-sdk',
  ];
}
