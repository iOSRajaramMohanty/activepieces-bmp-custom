/**
 * Runtime EE Check
 * 
 * Runtime validation to ensure no EE features are accessed.
 * This provides an additional safety layer beyond build-time checks.
 */

const EE_FEATURE_FLAGS = [
  'EMBEDDING_ENABLED',
  'SSO_ENABLED',
  'CUSTOM_BRANDING_ENABLED',
  'AUDIT_LOG_ENABLED',
  'API_KEYS_ENABLED',
  'SIGNING_KEYS_ENABLED',
  'PROJECT_ROLES_ENABLED',
  'GLOBAL_CONNECTIONS_ENABLED',
  'ORGANIZATIONS_ENABLED',
  'EVENT_DESTINATIONS_ENABLED',
];

/**
 * Checks if a feature flag is an EE feature
 */
export function isEEFeatureFlag(flag: string): boolean {
  return EE_FEATURE_FLAGS.some((eeFlag) => flag.includes(eeFlag));
}

/**
 * Validates that an EE feature is not being accessed
 */
export function validateNoEEFeatureAccess(feature: string): void {
  if (isEEFeatureFlag(feature)) {
    throw new Error(
      `EE Feature '${feature}' is not available in CE SDK. ` +
      `This SDK only supports Community Edition features.`
    );
  }
}

/**
 * Runtime check to ensure no EE components are loaded
 */
export function validateNoEEComponents(): void {
  if (typeof window !== 'undefined') {
    // Check for EE embed SDK in window object
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if ((window as any).activepieces?.constructor?.name?.includes('Embedded')) {
      console.warn(
        'Warning: EE embed SDK detected. The CE SDK should not use EE components.'
      );
    }
  }
}

/**
 * Initializes runtime EE checks
 */
export function initializeRuntimeEEChecks(): void {
  if (process.env.NODE_ENV === 'development') {
    validateNoEEComponents();
  }
}
