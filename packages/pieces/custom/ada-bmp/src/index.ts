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
import { API_ENDPOINTS, getBaseUrl, debugLog } from './lib/common/config';

export const adaBmpAuth = PieceAuth.SecretText({
  displayName: 'API Token',
  description: 'Enter your ADA BMP API token',
  required: true,
  validate: async ({ auth }) => {
    try {
      // Validate token by calling /user/checkToken endpoint (POST method)
      // This endpoint expects accessToken in the request body
      const apiUrl = API_ENDPOINTS.validateToken(); // /user/checkToken endpoint
      console.log('[ADA-BMP] ===== TOKEN VALIDATION START =====');
      console.log('[ADA-BMP] URL:', apiUrl);
      console.log('[ADA-BMP] Token (first 10 chars):', auth.substring(0, 10) + '...');
      
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
        return {
          valid: true,
        };
      }

      console.log('[ADA-BMP] ===== TOKEN VALIDATION FAILED (non-200) =====');
      return {
        valid: false,
        error: 'Invalid token',
      };
    } catch (error: any) {
      console.error('[ADA-BMP] ===== TOKEN VALIDATION ERROR =====');
      console.error('[ADA-BMP] Error Type:', error.constructor.name);
      console.error('[ADA-BMP] Error Message:', error.message);
      console.error('[ADA-BMP] Error Response Status:', error.response?.status);
      console.error('[ADA-BMP] Error Response Body:', error.response?.body);
      
      // Check if it's an authentication error
      if (error.response?.status === 401 || error.response?.status === 403) {
        return {
          valid: false,
          error: 'Invalid token: Authentication failed. Please check your API token.',
        };
      }
      
      // If it's a 400 error, provide more detailed error message from the API
      if (error.response?.status === 400) {
        const errorBody = error.response?.body;
        const errorMessage = errorBody?.message || errorBody?.error || 'Invalid token format or token expired';
        return {
          valid: false,
          error: `Token validation failed: ${errorMessage}. Please check your API token and ensure ADA_BMP_API_URL is correctly set in your .env file.`,
        };
      }
      
      return {
        valid: false,
        error: `Failed to validate token: ${error.message || 'Unknown error'}`,
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
  triggers: [],
});
