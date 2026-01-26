/**
 * ADA BMP Configuration
 * 
 * This module centralizes all configuration for the ADA BMP piece.
 * API URLs can be configured via:
 * 1. Organization/Environment metadata (preferred)
 * 2. Environment variables (fallback)
 * 3. Default values (last resort)
 */

import { AuthenticationType } from '@activepieces/pieces-common';

/**
 * Metadata structure for ADA BMP configuration
 */
export interface AdaBmpMetadata {
  ADA_BMP_API_URL?: string;
  ADA_BMP_TIMEOUT?: number;
  ADA_BMP_DEBUG?: boolean;
}

/**
 * Get the base API URL from metadata, environment variable, or use default
 * 
 * Priority order:
 * 1. metadata.ADA_BMP_API_URL (from organization/environment metadata)
 * 2. process.env.ADA_BMP_API_URL (from environment variables)
 * 3. Default URL
 * 
 * @param metadata - Optional metadata from organization/environment
 */
export const getBaseUrl = (metadata?: AdaBmpMetadata): string => {
  // Priority 1: Organization/Environment metadata
  const metadataUrl = metadata?.ADA_BMP_API_URL;
  
  // Priority 2: Environment variable
  const envUrl = process.env.ADA_BMP_API_URL;
  
  // Priority 3: Default
  const defaultUrl = 'https://bmpapistgjkt.cl.bmp.ada-asia.my';
  
  const baseUrl = metadataUrl || envUrl || defaultUrl;
  
  // Log for debugging
  if (metadataUrl) {
    console.log('[ADA-BMP Config] Using ADA_BMP_API_URL from organization/environment metadata:', metadataUrl);
  } else if (envUrl) {
    console.log('[ADA-BMP Config] Using ADA_BMP_API_URL from environment:', envUrl);
  } else {
    console.log('[ADA-BMP Config] ADA_BMP_API_URL not found, using default:', defaultUrl);
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
  validateToken: (metadata?: AdaBmpMetadata) => `${getBaseUrl(metadata)}/user/checkToken`,
  
  /**
   * Get available channels endpoint
   * GET /account
   */
  getChannels: (metadata?: AdaBmpMetadata) => `${getBaseUrl(metadata)}/account`,
  
  /**
   * Get accounts for a specific platform
   * GET /account?platform={platform}
   */
  getAccounts: (platform: string, metadata?: AdaBmpMetadata) => `${getBaseUrl(metadata)}/account?platform=${platform}`,
  
  /**
   * Send message endpoint
   * POST /message
   */
  sendMessage: (metadata?: AdaBmpMetadata) => `${getBaseUrl(metadata)}/message`,
  
  /**
   * Get recipients/conversations for an account
   * GET /msglog/live?accountNo={accountNo}&platform={platform}
   */
  getRecipients: (accountNo: string, platform: string, metadata?: AdaBmpMetadata) => `${getBaseUrl(metadata)}/msglog/live?accountNo=${accountNo}&platform=${platform}`,
  
  /**
   * Get contact categories for a platform
   * GET /contact-category?platform={platform}
   */
  getContactCategories: (platform: string, metadata?: AdaBmpMetadata) => `${getBaseUrl(metadata)}/contact-category?platform=${platform}`,
  
  /**
   * Send bulk message endpoint
   * POST /contact-category/bulkmessage
   */
  sendBulkMessage: (metadata?: AdaBmpMetadata) => `${getBaseUrl(metadata)}/contact-category/bulkmessage`,
  
  /**
   * Get templates for a specific account
   * GET /account/{accountId}/template
   */
  getTemplates: (accountId: string, metadata?: AdaBmpMetadata) => `${getBaseUrl(metadata)}/account/${accountId}/template`,
};

/**
 * Get configuration values from metadata or environment variables
 */
export const getConfig = (metadata?: AdaBmpMetadata) => ({
  // Timeout for API requests (in milliseconds)
  requestTimeout: metadata?.ADA_BMP_TIMEOUT 
    ? parseInt(String(metadata.ADA_BMP_TIMEOUT), 10)
    : parseInt(process.env.ADA_BMP_TIMEOUT || '30000', 10),
  
  // Enable debug logging
  debug: metadata?.ADA_BMP_DEBUG !== undefined 
    ? Boolean(metadata.ADA_BMP_DEBUG)
    : process.env.ADA_BMP_DEBUG === 'true',
  
  // API version (if needed for headers)
  apiVersion: process.env.ADA_BMP_API_VERSION || 'v1',
});

/**
 * Configuration constants (for backward compatibility)
 */
export const CONFIG = getConfig();

/**
 * Helper function to log debug messages
 */
export const debugLog = (message: string, data?: any, metadata?: AdaBmpMetadata) => {
  const config = getConfig(metadata);
  if (config.debug) {
    console.log(`[ADA-BMP] ${message}`, data || '');
  }
};

/**
 * Fetch organization/environment metadata for a project
 * This function makes an API call to get the metadata based on the project's organization and environment
 */
export async function fetchMetadata(
  projectId: string,
  server: { apiUrl: string; token: string },
  httpClient: any
): Promise<AdaBmpMetadata | undefined> {
  try {
    // First, get the project to find its organization
    const projectResponse = await httpClient.sendRequest({
      method: 'GET',
      url: `${server.apiUrl}/v1/projects/${projectId}`,
      authentication: {
        type: AuthenticationType.BEARER_TOKEN,
        token: server.token,
      },
    });

    if (!projectResponse.body?.organizationId) {
      console.log('[ADA-BMP Config] Project has no organizationId, skipping metadata fetch');
      return undefined;
    }

    const organizationId = projectResponse.body.organizationId;
    const environment = projectResponse.body.environment || 'Production'; // Default to Production

    // IMPORTANT: Get organization environments - this will be filtered by the backend
    // to return only the environment the user is admin of.
    // This ensures environment isolation - admins can only access their own environment's metadata.
    const environmentsResponse = await httpClient.sendRequest({
      method: 'GET',
      url: `${server.apiUrl}/v1/organizations/${organizationId}/environments`,
      authentication: {
        type: AuthenticationType.BEARER_TOKEN,
        token: server.token,
      },
    });

    if (!environmentsResponse.body || !Array.isArray(environmentsResponse.body)) {
      console.log('[ADA-BMP Config] No environments found for organization');
      return undefined;
    }

    // Find the environment that matches the project's environment
    // Due to backend filtering, this will only find the user's own environment
    const matchingEnv = environmentsResponse.body.find(
      (env: any) => env.environment === environment
    );

    if (matchingEnv?.metadata) {
      console.log('[ADA-BMP Config] Found environment metadata:', {
        environment,
        hasMetadata: !!matchingEnv.metadata,
        apiUrl: (matchingEnv.metadata as AdaBmpMetadata)?.ADA_BMP_API_URL,
      });
      return matchingEnv.metadata as AdaBmpMetadata;
    }

    // Fallback to organization-level metadata
    const orgResponse = await httpClient.sendRequest({
      method: 'GET',
      url: `${server.apiUrl}/v1/organizations/${organizationId}`,
      authentication: {
        type: AuthenticationType.BEARER_TOKEN,
        token: server.token,
      },
    });

    if (orgResponse.body?.metadata) {
      console.log('[ADA-BMP Config] Using organization-level metadata');
      return orgResponse.body.metadata as AdaBmpMetadata;
    }

    console.log('[ADA-BMP Config] No metadata found at organization or environment level');
    return undefined;
  } catch (error: any) {
    console.error('[ADA-BMP Config] Error fetching metadata:', error.message);
    // Don't throw - fall back to environment variables
    return undefined;
  }
}
