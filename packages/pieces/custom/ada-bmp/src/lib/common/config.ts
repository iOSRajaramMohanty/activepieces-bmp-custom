/**
 * ADA BMP Configuration
 *
 * API URLs are read ONLY from organization_environment.metadata (ADA_BMP_API_URL).
 * No static defaults or env vars - admins must configure each environment in
 * Organization > Environments > [org] > Configure.
 */

import { AuthenticationType } from '@activepieces/pieces-common';

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
export const getBaseUrl = (metadata?: AdaBmpMetadata, auth?: any): string => {
  const authEnvironment = auth?.props?.environment || auth?.environment;

  const metadataUrl = metadata?.ADA_BMP_API_URL;
  if (metadataUrl && metadataUrl.trim()) {
    const finalUrl = metadataUrl.endsWith('/') ? metadataUrl.slice(0, -1) : metadataUrl.trim();
    return finalUrl;
  }
  const envUrl = process.env.ADA_BMP_API_URL?.trim();
  if (envUrl) {
    return envUrl.endsWith('/') ? envUrl.slice(0, -1) : envUrl;
  }

  throw new Error(
    `No API URL configured for ${authEnvironment || 'selected'} environment. ` +
    'Please configure ADA_BMP_API_URL in Organization > Environments > [your org] > Configure for the selected environment.',
  );
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

  /**
   * Upload contact parameters (CSV file)
   * POST /contact/upload-parameters
   */
  uploadContactParameters: (metadata?: AdaBmpMetadata, auth?: unknown) => `${getBaseUrl(metadata, auth)}/contact/upload-parameters`,
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
 * Centralized API logger for ADA BMP.
 *
 * Toggle via env var  ADA_BMP_LOGGING=true|false  (defaults to true).
 * Or flip the constant below for a quick source-level override.
 */
const LOGGING_ENABLED_OVERRIDE: boolean | undefined = undefined; // set true/false to force, or undefined to use env var

function isLoggingEnabled(): boolean {
  if (LOGGING_ENABLED_OVERRIDE !== undefined) return LOGGING_ENABLED_OVERRIDE;
  return process.env.ADA_BMP_LOGGING !== 'false';
}

export const bmpLogger = {
  request(details: { method: string; url: string; body?: unknown; [k: string]: unknown }) {
    if (!isLoggingEnabled()) return;
    console.log('[ADA-BMP API] Request:', details);
  },
  response(details: { status: number; body?: unknown }) {
    if (!isLoggingEnabled()) return;
    console.log('[ADA-BMP API] Response:', details);
  },
  info(message: string, data?: unknown) {
    if (!isLoggingEnabled()) return;
    console.log(`[ADA-BMP] ${message}`, data ?? '');
  },
  warn(message: string, data?: unknown) {
    if (!isLoggingEnabled()) return;
    console.warn(`[ADA-BMP] ${message}`, data ?? '');
  },
  error(message: string, data?: unknown) {
    if (!isLoggingEnabled()) return;
    console.error(`[ADA-BMP] ${message}`, data ?? '');
  },
};

export const debugLog = (message: string, data?: unknown, metadata?: AdaBmpMetadata) => {
  const config = getConfig(metadata);
  if (config.debug) {
    console.log(`[ADA-BMP] ${message}`, data || '');
  }
};

/**
 * Get server API URL from environment or infer from frontend URL
 */
function stripTrailingSlash(url: string): string {
  return url.endsWith('/') ? url.slice(0, -1) : url;
}

function getServerApiUrl(server?: { apiUrl: string }): string | undefined {
  if (server?.apiUrl) {
    return stripTrailingSlash(server.apiUrl);
  }

  if (process.env.AP_API_URL) {
    return stripTrailingSlash(process.env.AP_API_URL);
  }

  if (process.env.AP_FRONTEND_URL) {
    try {
      new URL(process.env.AP_FRONTEND_URL);
      return 'http://localhost:80/api';
    } catch (e) {
      console.error('[ADA-BMP Config] Failed to parse AP_FRONTEND_URL:', e);
    }
  }

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
      bmpLogger.info('Config: Auth context available but cannot extract server token from it');
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
  
  bmpLogger.error('Config: Invalid auth structure', auth);
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
        bmpLogger.info('Config: Using projectId from auth context');
      }
      if (!effectiveProjectId && auth.metadata?.projectId) {
        effectiveProjectId = auth.metadata.projectId;
        bmpLogger.info('Config: Using projectId from auth.metadata');
      }
    }
    
    // If we don't have projectId or server context, we're likely in a sandbox
    // Try to construct what we need from environment variables
    const apiUrl = getServerApiUrl(server);
    const token = getAuthToken(server, auth);
    
    bmpLogger.info('Config: Metadata fetch context', {
      hasProjectId: !!effectiveProjectId,
      hasServer: !!server,
      apiUrl: apiUrl ? apiUrl.replace(/\/\/.*@/, '//*****@') : undefined,
      hasToken: !!token,
      nodeEnv: process.env.NODE_ENV,
      isInSandbox: !server || !projectId,
      extractedFromAuth: effectiveProjectId !== projectId,
    });

    if (!effectiveProjectId || !apiUrl || !token) {
      bmpLogger.info('Config: Missing required context for metadata fetch, falling back to environment variables');
      return undefined;
    }
    
    // Use effectiveProjectId for API call
    projectId = effectiveProjectId;
    
    const projectResponse = await httpClient.sendRequest({
      method: 'GET',
      url: `${apiUrl}/v1/worker/project`,
      authentication: {
        type: AuthenticationType.BEARER_TOKEN,
        token: token,
      },
    });

    if (!projectResponse.body?.organizationId) {
      bmpLogger.info('Config: Project has no organizationId, skipping metadata fetch');
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
      bmpLogger.info('Config: No environments found for organization');
      return undefined;
    }

    bmpLogger.info('Config: Looking for environment', {
      targetEnvironment: environment,
      availableEnvironments: environmentsResponse.body.map((e: any) => ({
        name: e.environment,
        hasMetadata: !!e.metadata,
        apiUrl: e.metadata?.ADA_BMP_API_URL,
      })),
    });
    
    const matchingEnv = environmentsResponse.body.find(
      (env: any) => env.environment === environment
    );

    if (matchingEnv?.metadata) {
      bmpLogger.info('Config: Found environment-specific metadata', {
        environment,
        apiUrl: (matchingEnv.metadata as AdaBmpMetadata)?.ADA_BMP_API_URL,
      });
      return matchingEnv.metadata as AdaBmpMetadata;
    }

    bmpLogger.warn('Config: No environment-specific metadata found, falling back to organization metadata');

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
      bmpLogger.info('Config: Using organization-level metadata');
      return orgResponse.body.metadata as AdaBmpMetadata;
    }

    bmpLogger.info('Config: No metadata found at organization or environment level');
    return undefined;
  } catch (error: unknown) {
    const err = error instanceof Error ? error : new Error(String(error));
    bmpLogger.error('Config: Error fetching metadata', err.message);
    return undefined;
  }
}
