/**
 * ADA BMP Configuration
 *
 * API URLs are read ONLY from organization_environment.metadata (ADA_BMP_API_URL).
 * No static defaults or env vars - admins must configure each environment in
 * Organization > Environments > [org] > Configure.
 */
/**
 * Metadata structure for ADA BMP configuration (from organization_environment table)
 */
export interface AdaBmpMetadata {
    ADA_BMP_API_URL?: string;
    ADA_BMP_TIMEOUT?: number;
    ADA_BMP_DEBUG?: boolean;
}
/**
 * Get the base API URL from organization_environment metadata only.
 * Throws if ADA_BMP_API_URL is not configured for the selected environment.
 *
 * @param metadata - From organization_environment.metadata (passed by backend)
 * @param auth - Auth object with environment (Dev, Staging, Production)
 */
export declare const getBaseUrl: (metadata?: AdaBmpMetadata, auth?: any) => string;
/**
 * API Endpoint Configuration
 */
export declare const API_ENDPOINTS: {
    /**
     * User token validation endpoint
     * POST /user/checkToken
     */
    validateToken: (metadata?: AdaBmpMetadata, auth?: any) => string;
    /**
     * Get available channels endpoint
     * GET /account
     */
    getChannels: (metadata?: AdaBmpMetadata, auth?: any) => string;
    /**
     * Get accounts for a specific platform
     * GET /account?platform={platform}
     */
    getAccounts: (platform: string, metadata?: AdaBmpMetadata, auth?: any) => string;
    /**
     * Send message endpoint
     * POST /message
     */
    sendMessage: (metadata?: AdaBmpMetadata, auth?: any) => string;
    /**
     * Get recipients/conversations for an account
     * GET /msglog/live?accountNo={accountNo}&platform={platform}
     */
    getRecipients: (accountNo: string, platform: string, metadata?: AdaBmpMetadata, auth?: any) => string;
    /**
     * Get contact categories for a platform
     * GET /contact-category?platform={platform}
     */
    getContactCategories: (platform: string, metadata?: AdaBmpMetadata, auth?: any) => string;
    /**
     * Send bulk message endpoint
     * POST /contact-category/bulkmessage
     */
    sendBulkMessage: (metadata?: AdaBmpMetadata, auth?: any) => string;
    /**
     * Get templates for a specific account
     * GET /account/{accountId}/template
     */
    getTemplates: (accountId: string, metadata?: AdaBmpMetadata, auth?: any) => string;
};
/**
 * Get configuration values from metadata or environment variables
 */
export declare const getConfig: (metadata?: AdaBmpMetadata) => {
    requestTimeout: number;
    debug: boolean;
    apiVersion: string;
};
/**
 * Configuration constants (for backward compatibility)
 */
export declare const CONFIG: {
    requestTimeout: number;
    debug: boolean;
    apiVersion: string;
};
/**
 * Helper function to log debug messages
 */
export declare const debugLog: (message: string, data?: any, metadata?: AdaBmpMetadata) => void;
/**
 * Extract ADA BMP API token from auth object
 * Supports both SecretText (legacy) and CustomAuth (new) structures
 *
 * @param auth - The auth object (either string for SecretText or object for CustomAuth)
 * @returns The API token string
 */
export declare function extractApiToken(auth: any): string;
/**
 * Fetch organization/environment metadata for a project
 *
 * This function dynamically retrieves configuration based on the user's environment context.
 * It supports multi-environment setups where different users/organizations have different API URLs.
 *
 * ENVIRONMENT-SPECIFIC CONFIGURATION:
 * - Dev environment users → Dev API URL
 * - Staging environment users → Staging API URL
 * - Production environment users → Production API URL
 *
 * SANDBOX COMPATIBILITY:
 * When running in a sandbox (e.g., Docker), the server and project context may not be fully available.
 * This function attempts to work around these limitations by:
 * 1. Trying to extract projectId from auth/connection metadata
 * 2. Inferring the API URL from environment variables if not provided
 * 3. Gracefully degrading to environment variable fallback if metadata fetch fails
 */
export declare function fetchMetadata(projectId: string | undefined, server: {
    apiUrl: string;
    token: string;
} | undefined, httpClient: any, auth?: any): Promise<AdaBmpMetadata | undefined>;
