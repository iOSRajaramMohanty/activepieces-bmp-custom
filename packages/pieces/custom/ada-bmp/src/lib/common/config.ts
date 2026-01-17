/**
 * ADA BMP Configuration
 * 
 * This module centralizes all configuration for the ADA BMP piece.
 * API URLs can be configured via environment variables.
 */

/**
 * Get the base API URL from environment variable or use default
 * 
 * Environment Variable: ADA_BMP_API_URL
 * Default: https://api.ada-bmp.com
 * 
 * Example:
 *   export ADA_BMP_API_URL=https://api-staging.ada-bmp.com
 *   export ADA_BMP_API_URL=http://localhost:8080
 */
export const getBaseUrl = (): string => {
  const envUrl = process.env.ADA_BMP_API_URL;
  const defaultUrl = 'https://bmpapistgjkt.cl.bmp.ada-asia.my';
  const baseUrl = envUrl || defaultUrl;
  
  // Log for debugging
  if (envUrl) {
    console.log('[ADA-BMP Config] Using ADA_BMP_API_URL from environment:', envUrl);
  } else {
    console.log('[ADA-BMP Config] ADA_BMP_API_URL not found in environment, using default:', defaultUrl);
  }
  
  // Remove trailing slash if present
  const finalUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
  console.log('[ADA-BMP Config] Final base URL:', finalUrl);
  return finalUrl;
};

/**
 * API Endpoint Configuration
 */
export const API_ENDPOINTS = {
  /**
   * User token validation endpoint
   * POST /user/checkToken
   */
  validateToken: () => `${getBaseUrl()}/user/checkToken`,
  
  /**
   * Get available channels endpoint
   * GET /account
   */
  getChannels: () => `${getBaseUrl()}/account`,
  
  /**
   * Get accounts for a specific platform
   * GET /account?platform={platform}
   */
  getAccounts: (platform: string) => `${getBaseUrl()}/account?platform=${platform}`,
  
  /**
   * Send message endpoint
   * POST /message
   */
  sendMessage: () => `${getBaseUrl()}/message`,
  
  /**
   * Get recipients/conversations for an account
   * GET /msglog/live?accountNo={accountNo}&platform={platform}
   */
  getRecipients: (accountNo: string, platform: string) => `${getBaseUrl()}/msglog/live?accountNo=${accountNo}&platform=${platform}`,
  
  /**
   * Get contact categories for a platform
   * GET /contact-category?platform={platform}
   */
  getContactCategories: (platform: string) => `${getBaseUrl()}/contact-category?platform=${platform}`,
  
  /**
   * Send bulk message endpoint
   * POST /contact-category/bulkmessage
   */
  sendBulkMessage: () => `${getBaseUrl()}/contact-category/bulkmessage`,
  
  /**
   * Get templates for a specific account
   * GET /account/{accountId}/template
   */
  getTemplates: (accountId: string) => `${getBaseUrl()}/account/${accountId}/template`,
};

/**
 * Configuration constants
 */
export const CONFIG = {
  // Timeout for API requests (in milliseconds)
  requestTimeout: parseInt(process.env.ADA_BMP_TIMEOUT || '30000', 10),
  
  // Enable debug logging
  debug: process.env.ADA_BMP_DEBUG === 'true',
  
  // API version (if needed for headers)
  apiVersion: process.env.ADA_BMP_API_VERSION || 'v1',
};

/**
 * Helper function to log debug messages
 */
export const debugLog = (message: string, data?: any) => {
  if (CONFIG.debug) {
    console.log(`[ADA-BMP] ${message}`, data || '');
  }
};
