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
 * Get the base API URL from auth, metadata, environment variable, or use default
 * 
 * Priority order:
 * 1. auth.apiUrl (CustomAuth override)
 * 2. metadata.ADA_BMP_API_URL (from organization/environment metadata)
 * 3. environment-specific env var (e.g., DEVELOPMENT_ADA_BMP_API_URL based on auth.environment)
 * 4. process.env.ADA_BMP_API_URL (generic environment variable)
 * 5. Default URL
 * 
 * @param metadata - Optional metadata from organization/environment
 * @param auth - Optional auth object (CustomAuth with apiToken, environment, apiUrl)
 */
export const getBaseUrl = (metadata?: AdaBmpMetadata, auth?: any): string => {
  // Debug logging - FULL auth object inspection
  console.log('[ADA-BMP Config] 🔍 getBaseUrl called');
  console.log('[ADA-BMP Config]    Full auth object:', JSON.stringify(auth, null, 2));
  
  // Extract auth values - handle empty strings properly
  const authApiUrlRaw = auth?.props?.apiUrl || auth?.apiUrl;
  const authEnvironment = auth?.props?.environment || auth?.environment;
  
  // Convert empty string to undefined for proper fallback logic
  const authApiUrl = (typeof authApiUrlRaw === 'string' && authApiUrlRaw.trim() !== '') ? authApiUrlRaw : undefined;
  
  console.log('[ADA-BMP Config]    authApiUrl (raw):', JSON.stringify(authApiUrlRaw));
  console.log('[ADA-BMP Config]    authApiUrl (processed):', JSON.stringify(authApiUrl));
  console.log('[ADA-BMP Config]    authEnvironment:', authEnvironment);
  
  // Priority 1: CustomAuth override (user-provided API URL in connection settings)
  // Only if explicitly filled in (not empty)
  if (authApiUrl) {
    const finalUrl = authApiUrl.endsWith('/') ? authApiUrl.slice(0, -1) : authApiUrl;
    console.log('[ADA-BMP Config] ✅ Using custom API URL from connection settings:', finalUrl);
    return finalUrl;
  }
  
  if (authApiUrlRaw === '') {
    console.log('[ADA-BMP Config] ℹ️  API URL field is empty - will use environment-based resolution');
  }
  
  // Priority 2: Connection metadata (stored during validation from database)
  // This is the URL that was resolved and validated when the connection was created
  // Check multiple possible locations where metadata might be stored
  console.log('[ADA-BMP Config] 🔍 Checking for connection metadata in auth object...');
  console.log('[ADA-BMP Config]    auth keys:', auth ? Object.keys(auth) : 'no auth');
  console.log('[ADA-BMP Config]    auth.metadata:', auth?.metadata ? 'exists' : 'missing');
  console.log('[ADA-BMP Config]    auth.props:', auth?.props ? Object.keys(auth.props) : 'no props');
  
  const connectionMetadata = 
    auth?.metadata || 
    (auth?.props && typeof auth.props === 'object' && auth.props.metadata) ||
    (auth?.__metadata);  // Sometimes stored with __ prefix
  
  const connectionApiUrl = connectionMetadata?.ADA_BMP_API_URL;
  
  if (connectionApiUrl) {
    const finalUrl = connectionApiUrl.endsWith('/') ? connectionApiUrl.slice(0, -1) : connectionApiUrl;
    console.log('[ADA-BMP Config] ✅ Using API URL from connection metadata (validated at creation):', finalUrl);
    console.log('[ADA-BMP Config]    Source:', connectionMetadata?.ADA_BMP_RESOLVED_FROM || 'unknown');
    console.log('[ADA-BMP Config]    Environment:', connectionMetadata?.ADA_BMP_ENVIRONMENT || 'unknown');
    return finalUrl;
  }
  
  console.log('[ADA-BMP Config] ⚠️  Connection metadata not found, will check database and fallbacks...');
  
  // Priority 3: Database organization/environment metadata (from fetchMetadata)
  console.log('[ADA-BMP Config] 🔍 Checking metadata parameter:', JSON.stringify(metadata, null, 2));
  const metadataUrl = metadata?.ADA_BMP_API_URL;
  
  if (metadataUrl) {
    const finalUrl = metadataUrl.endsWith('/') ? metadataUrl.slice(0, -1) : metadataUrl;
    console.log('[ADA-BMP Config] ✅ Using API URL from database organization/environment metadata:', finalUrl);
    return finalUrl;
  }
  
  // Priority 4: Environment-specific URL mapping (since database fetch doesn't work in sandbox)
  // Map environment names to their API URLs
  if (authEnvironment) {
    const environmentUrlMap: Record<string, string> = {
      'Dev': 'https://bmpapidev2.cl.bmp.ada-asia.my',
      'Development': 'https://bmpapidev2.cl.bmp.ada-asia.my',
      'Staging': 'https://bmpapistgjkt.cl.bmp.ada-asia.my',
      'Stage': 'https://bmpapistgjkt.cl.bmp.ada-asia.my',
      'Production': 'https://bmpapi.bmp.ada-asia.my',
      'Prod': 'https://bmpapi.bmp.ada-asia.my',
    };
    
    const envUrl = environmentUrlMap[authEnvironment];
    if (envUrl) {
      console.log(`[ADA-BMP Config] ✅ Using environment-specific URL for ${authEnvironment}:`, envUrl);
      console.log('[ADA-BMP Config]    Source: environment mapping');
      return envUrl;
    } else {
      console.log(`[ADA-BMP Config] ⚠️  No URL mapping found for environment: ${authEnvironment}`);
    }
  }
  
  // Priority 5: Environment-specific environment variable (legacy/fallback)
  // Try to get environment-specific URL from env var if we know the environment
  let envSpecificUrl: string | undefined = undefined;
  if (authEnvironment) {
    const envKey = `${authEnvironment.toUpperCase().replace(/\s+/g, '_')}_ADA_BMP_API_URL`;
    envSpecificUrl = process.env[envKey];
    
    if (envSpecificUrl) {
      const finalUrl = envSpecificUrl.endsWith('/') ? envSpecificUrl.slice(0, -1) : envSpecificUrl;
      console.log(`[ADA-BMP Config] ✅ Using environment-specific URL from ${envKey}:`, finalUrl);
      return finalUrl;
    }
  }
  
  // Priority 5: Organization-level default (immutable, from .env)
  const defaultUrl = process.env.ADA_BMP_API_URL;
  
  if (defaultUrl) {
    const finalUrl = defaultUrl.endsWith('/') ? defaultUrl.slice(0, -1) : defaultUrl;
    console.log('[ADA-BMP Config] ⚠️  Using organization-level default API URL (fallback):', finalUrl);
    console.log('[ADA-BMP Config]    Note: No environment-specific URL found for:', authEnvironment || 'unknown environment');
    return finalUrl;
  }
  
  // Priority 6: Hardcoded fallback (should never reach here)
  const hardcodedFallback = 'https://bmpapi.bmp.ada-asia.my';
  console.error('[ADA-BMP Config] ❌ No API URL configured anywhere! Using hardcoded fallback:', hardcodedFallback);
  console.error('[ADA-BMP Config]    Please configure ADA_BMP_API_URL in .env file');
  console.error('[ADA-BMP Config]    Environment:', authEnvironment || 'not specified');
  return hardcodedFallback;
};

/**
 * API Endpoint Configuration
 */
export const API_ENDPOINTS = {
  /**
   * User token validation endpoint
   * POST /user/checkToken
   */
  validateToken: (metadata?: AdaBmpMetadata, auth?: any) => `${getBaseUrl(metadata, auth)}/user/checkToken`,
  
  /**
   * Get available channels endpoint
   * GET /account
   */
  getChannels: (metadata?: AdaBmpMetadata, auth?: any) => `${getBaseUrl(metadata, auth)}/account`,
  
  /**
   * Get accounts for a specific platform
   * GET /account?platform={platform}
   */
  getAccounts: (platform: string, metadata?: AdaBmpMetadata, auth?: any) => `${getBaseUrl(metadata, auth)}/account?platform=${platform}`,
  
  /**
   * Send message endpoint
   * POST /message
   */
  sendMessage: (metadata?: AdaBmpMetadata, auth?: any) => `${getBaseUrl(metadata, auth)}/message`,
  
  /**
   * Get recipients/conversations for an account
   * GET /msglog/live?accountNo={accountNo}&platform={platform}
   */
  getRecipients: (accountNo: string, platform: string, metadata?: AdaBmpMetadata, auth?: any) => `${getBaseUrl(metadata, auth)}/msglog/live?accountNo=${accountNo}&platform=${platform}`,
  
  /**
   * Get contact categories for a platform
   * GET /contact-category?platform={platform}
   */
  getContactCategories: (platform: string, metadata?: AdaBmpMetadata, auth?: any) => `${getBaseUrl(metadata, auth)}/contact-category?platform=${platform}`,
  
  /**
   * Send bulk message endpoint
   * POST /contact-category/bulkmessage
   */
  sendBulkMessage: (metadata?: AdaBmpMetadata, auth?: any) => `${getBaseUrl(metadata, auth)}/contact-category/bulkmessage`,
  
  /**
   * Get templates for a specific account
   * GET /account/{accountId}/template
   */
  getTemplates: (accountId: string, metadata?: AdaBmpMetadata, auth?: any) => `${getBaseUrl(metadata, auth)}/account/${accountId}/template`,
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
 * Get server API URL from environment or infer from frontend URL
 */
function getServerApiUrl(server?: { apiUrl: string }): string | undefined {
  // Priority 1: Use server.apiUrl if provided (normal execution context)
  if (server?.apiUrl) {
    return server.apiUrl;
  }
  
  // Priority 2: Check for AP_API_URL environment variable
  if (process.env.AP_API_URL) {
    return process.env.AP_API_URL;
  }
  
  // Priority 3: Infer from AP_FRONTEND_URL
  // In Docker, AP_FRONTEND_URL is typically set to the ngrok URL
  // The API is typically at the same host
  if (process.env.AP_FRONTEND_URL) {
    try {
      const frontendUrl = new URL(process.env.AP_FRONTEND_URL);
      // API is at same host, port 80 (inside container)
      return `http://localhost:80/api`;
    } catch (e) {
      console.error('[ADA-BMP Config] Failed to parse AP_FRONTEND_URL:', e);
    }
  }
  
  // Priority 4: Default for Docker environment
  // Inside Docker container, the API is on localhost:80
  return 'http://localhost:80/api';
}

/**
 * Get authentication token for Activepieces API calls
 * In sandbox, we need to extract token from the connection/auth context
 */
function getAuthToken(server?: { token: string }, auth?: any): string | undefined {
  // Priority 1: Use server.token if provided
  if (server?.token) {
    return server.token;
  }
  
  // Priority 2: Extract from auth context (for sandbox)
  // The auth object contains the connection details
  if (auth && typeof auth === 'object') {
    // Try to extract token from the secret_text field
    if ((auth as any).secret_text) {
      // This is the piece's auth token, not the server token
      // We need a different approach
      console.log('[ADA-BMP Config] Auth context available but cannot extract server token from it');
    }
  }
  
  return undefined;
}

/**
 * Extract ADA BMP API token from auth object
 * Supports both SecretText (legacy) and CustomAuth (new) structures
 * 
 * @param auth - The auth object (either string for SecretText or object for CustomAuth)
 * @returns The API token string
 */
export function extractApiToken(auth: any): string {
  if (!auth) {
    throw new Error('No authentication provided');
  }
  
  // CustomAuth structure with props wrapper: { type: 'CUSTOM_AUTH', props: { apiToken, environment, apiUrl } }
  if (typeof auth === 'object' && auth.type === 'CUSTOM_AUTH' && auth.props && auth.props.apiToken) {
    return auth.props.apiToken;
  }
  
  // CustomAuth structure (direct): { apiToken, environment, apiUrl }
  if (typeof auth === 'object' && auth.apiToken) {
    return auth.apiToken;
  }
  
  // SecretText structure (legacy): { secret_text: "token" }
  if (typeof auth === 'object' && auth.secret_text) {
    return auth.secret_text;
  }
  
  // Direct string (rare case)
  if (typeof auth === 'string') {
    return auth;
  }
  
  console.error('[ADA-BMP Config] Invalid auth structure:', auth);
  throw new Error('Unable to extract API token from auth object');
}

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
export async function fetchMetadata(
  projectId: string | undefined,
  server: { apiUrl: string; token: string } | undefined,
  httpClient: any,
  auth?: any
): Promise<AdaBmpMetadata | undefined> {
  try {
    // Try to get projectId from multiple sources
    // In sandbox, projectId might be passed through connection metadata
    let effectiveProjectId = projectId;
    
    // If auth is provided and has connection metadata, try to extract projectId
    if (!effectiveProjectId && auth && typeof auth === 'object') {
      // Check if auth has projectId embedded (for sandbox scenarios)
      if (auth.projectId) {
        effectiveProjectId = auth.projectId;
        console.log('[ADA-BMP Config] Using projectId from auth context');
      }
      // Check if it's stored in metadata
      if (!effectiveProjectId && auth.metadata?.projectId) {
        effectiveProjectId = auth.metadata.projectId;
        console.log('[ADA-BMP Config] Using projectId from auth.metadata');
      }
    }
    
    // If we don't have projectId or server context, we're likely in a sandbox
    // Try to construct what we need from environment variables
    const apiUrl = getServerApiUrl(server);
    const token = getAuthToken(server, auth);
    
    console.log('[ADA-BMP Config] Metadata fetch context:', {
      hasProjectId: !!effectiveProjectId,
      hasServer: !!server,
      apiUrl: apiUrl ? apiUrl.replace(/\/\/.*@/, '//*****@') : undefined, // Mask credentials
      hasToken: !!token,
      nodeEnv: process.env.NODE_ENV,
      isInSandbox: !server || !projectId,
      extractedFromAuth: effectiveProjectId !== projectId,
    });
    
    // If we're missing critical information, skip metadata fetch
    if (!effectiveProjectId || !apiUrl || !token) {
      console.log('[ADA-BMP Config] Missing required context for metadata fetch, falling back to environment variables');
      console.log('[ADA-BMP Config] NOTE: For environment-specific configuration, ensure connection stores projectId in metadata');
      return undefined;
    }
    
    // Use effectiveProjectId for API call
    projectId = effectiveProjectId;
    
    // First, get the project to find its organization
    const projectResponse = await httpClient.sendRequest({
      method: 'GET',
      url: `${apiUrl}/v1/projects/${projectId}`,
      authentication: {
        type: AuthenticationType.BEARER_TOKEN,
        token: token,
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
      url: `${apiUrl}/v1/organizations/${organizationId}/environments`,
      authentication: {
        type: AuthenticationType.BEARER_TOKEN,
        token: token,
      },
    });

    if (!environmentsResponse.body || !Array.isArray(environmentsResponse.body)) {
      console.log('[ADA-BMP Config] No environments found for organization');
      return undefined;
    }

    // Find the environment that matches the project's environment
    // Due to backend filtering, this will only find the user's own environment
    console.log('[ADA-BMP Config] Looking for environment:', {
      targetEnvironment: environment,
      availableEnvironments: environmentsResponse.body.map((e: any) => ({
        name: e.environment,
        hasMetadata: !!e.metadata,
        apiUrl: e.metadata?.ADA_BMP_API_URL
      }))
    });
    
    const matchingEnv = environmentsResponse.body.find(
      (env: any) => env.environment === environment
    );

    if (matchingEnv?.metadata) {
      console.log('[ADA-BMP Config] ✅ Found environment-specific metadata:', {
        environment,
        hasMetadata: !!matchingEnv.metadata,
        apiUrl: (matchingEnv.metadata as AdaBmpMetadata)?.ADA_BMP_API_URL,
      });
      return matchingEnv.metadata as AdaBmpMetadata;
    }
    
    console.log('[ADA-BMP Config] ⚠️ No environment-specific metadata found, falling back to organization metadata');

    // Fallback to organization-level metadata
    const orgResponse = await httpClient.sendRequest({
      method: 'GET',
      url: `${apiUrl}/v1/organizations/${organizationId}`,
      authentication: {
        type: AuthenticationType.BEARER_TOKEN,
        token: token,
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
