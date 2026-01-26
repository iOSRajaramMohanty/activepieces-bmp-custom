import {
  createCustomApiCallAction,
  httpClient,
  HttpMethod,
  AuthenticationType,
} from '@activepieces/pieces-common';
import {
  createPiece,
  PieceAuth,
} from '@activepieces/pieces-framework';
import { PieceCategory } from '@activepieces/shared';
import { sendMessageAction } from './lib/actions/send-message';
import { sendBulkMessageAction } from './lib/actions/send-bulk-message';
import { receiveWebhook } from './lib/triggers/receive-webhook';
import { API_ENDPOINTS, getBaseUrl, debugLog } from './lib/common/config';

export const adaBmpAuth = PieceAuth.SecretText({
  displayName: 'API Token',
  description: 'Enter your ADA BMP API token',
  required: true,
  validate: async ({ auth, server }) => {
    try {
      console.log('[ADA-BMP] ===== TOKEN VALIDATION START =====');
      console.log('[ADA-BMP] Token (first 10 chars):', auth.substring(0, 10) + '...');
      console.log('[ADA-BMP] Server context available:', !!server);
      
      // IMPORTANT: Use environment variable ONLY (no fallback URLs)
      // This ensures strict environment isolation - tokens are validated ONLY against
      // the API URL configured for the current environment
      const envUrl = process.env.ADA_BMP_API_URL;
      
      if (!envUrl) {
        console.error('[ADA-BMP] ===== NO API URL CONFIGURED =====');
        return {
          valid: false,
          error: 'ADA_BMP_API_URL environment variable is not configured. Please configure the API URL in your environment metadata or .env file for this environment (Dev/Staging/Production).',
        };
      }
      
      const apiUrl = `${envUrl.replace(/\/$/, '')}/user/checkToken`;
      console.log('[ADA-BMP] Validating against URL:', apiUrl);
      
      // Validate token by calling /user/checkToken endpoint with accessToken in body
      const response = await httpClient.sendRequest({
        method: HttpMethod.POST,
        url: apiUrl,
        body: {
          accessToken: auth,
        },
      });

      console.log('[ADA-BMP] Response Status:', response.status);
      console.log('[ADA-BMP] Response Body:', JSON.stringify(response.body, null, 2));

      if (response.status === 200) {
        console.log('[ADA-BMP] ===== TOKEN VALIDATION SUCCESS =====');
        console.log('[ADA-BMP] Token is valid for environment API URL:', apiUrl);
        return {
          valid: true,
        };
      }

      console.log('[ADA-BMP] ===== TOKEN VALIDATION FAILED =====');
      
      if (response.status === 401 || response.status === 403) {
        return {
          valid: false,
          error: `Invalid token: Authentication failed. This token is not valid for the ${envUrl} API. Please ensure you are using the correct token for this environment (Dev/Staging/Production).`,
        };
      }
      
      if (response.status === 400) {
        const errorBody = response.body;
        const errorMessage = errorBody?.message || errorBody?.error || 'Invalid token format or token expired';
        return {
          valid: false,
          error: `Token validation failed: ${errorMessage}. Please check your API token for this environment.`,
        };
      }
      
      return {
        valid: false,
        error: `Token validation returned status ${response.status}. Please check your API token and environment configuration.`,
      };
    } catch (error: any) {
      console.error('[ADA-BMP] ===== TOKEN VALIDATION ERROR =====');
      console.error('[ADA-BMP] Error Type:', error.constructor.name);
      console.error('[ADA-BMP] Error Message:', error.message);
      console.error('[ADA-BMP] Error Response Status:', error.response?.status);
      console.error('[ADA-BMP] Error Response Body:', error.response?.body);
      
      // Check for specific error responses
      if (error.response?.status === 401 || error.response?.status === 403) {
        return {
          valid: false,
          error: 'Invalid token: Authentication failed. This token is not valid for the configured API URL. Please ensure you are using the correct token for this environment.',
        };
      }
      
      if (error.response?.status === 400) {
        const errorBody = error.response?.body;
        const errorMessage = errorBody?.message || errorBody?.error || 'Invalid token format or token expired';
        return {
          valid: false,
          error: `Token validation failed: ${errorMessage}`,
        };
      }
      
      return {
        valid: false,
        error: `Failed to validate token: ${error.message || 'Unknown error'}. Please ensure ADA_BMP_API_URL is correctly configured in your environment metadata.`,
      };
    }
  },
});

export const adaBmp = createPiece({
  displayName: 'ADA BMP',
  description: 'Multi-channel messaging platform supporting WhatsApp, Facebook, Line, and Instagram',
  minimumSupportedRelease: '0.36.1',
  logoUrl: '/ada-logo.png',
  categories: [PieceCategory.COMMUNICATION],
  auth: adaBmpAuth,
  authors: [],
  actions: [
    sendMessageAction,
    sendBulkMessageAction,
    createCustomApiCallAction({
      baseUrl: () => getBaseUrl(),
      auth: adaBmpAuth,
      authMapping: async (auth) => {
        // auth is an object: { type: "SECRET_TEXT", secret_text: "token" }
        // We need to extract the secret_text property
        const token = (auth as any).secret_text;
        debugLog('Custom API Call - Using token from auth.secret_text');
        
        return {
          Authorization: `Bearer ${token}`,
        };
      },
    }),
  ],
  triggers: [
    receiveWebhook,
  ],
});
