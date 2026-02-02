import {
  createCustomApiCallAction,
  httpClient,
  HttpMethod,
  AuthenticationType,
} from '@activepieces/pieces-common';
import {
  createPiece,
  PieceAuth,
  Property,
} from '@activepieces/pieces-framework';
import { PieceCategory } from '@activepieces/shared';
import { sendMessageAction } from './lib/actions/send-message';
import { sendBulkMessageAction } from './lib/actions/send-bulk-message';
import { receiveWebhook } from './lib/triggers/receive-webhook';
import { newMessageCallbackTrigger } from './lib/triggers/new-message-callback';
import { API_ENDPOINTS, getBaseUrl, debugLog } from './lib/common/config';

export const adaBmpAuth = PieceAuth.CustomAuth({
  displayName: 'ADA BMP Connection',
  description: 'Configure your ADA BMP API connection with environment-specific settings',
  required: true,
  props: {
    apiToken: Property.ShortText({
      displayName: 'API Token',
      description: 'Enter your ADA BMP API token',
      required: true,
    }),
    environment: Property.StaticDropdown({
      displayName: 'Environment',
      description: 'Select the environment for this connection (filtered by your organization)',
      required: true,
      options: {
        disabled: false,
        options: [
          { label: 'Dev', value: 'Dev' },
          { label: 'Staging', value: 'Staging' },
          { label: 'Production', value: 'Production' },
        ],
      },
    }),
  },
  validate: async ({ auth }) => {
    try {
      // Type the auth object
      const typedAuth = auth as {
        apiToken: string;
        environment: string;
      };
      
      console.log('[ADA-BMP Auth] ===== TOKEN VALIDATION START =====');
      console.log('[ADA-BMP Auth] Token (first 10 chars):', typedAuth.apiToken.substring(0, 10) + '...');
      console.log('[ADA-BMP Auth] Selected Environment:', typedAuth.environment);
      
      let apiUrl: string | undefined;
      let resolvedFrom: string;
      
      // Try environment-specific variable first (e.g., STAGING_ADA_BMP_API_URL)
      const envKey = `${typedAuth.environment.toUpperCase().replace(/\s+/g, '_')}_ADA_BMP_API_URL`;
      apiUrl = process.env[envKey];
      resolvedFrom = 'environment_specific';
      
      if (apiUrl) {
        console.log(`[ADA-BMP Auth] Using environment-specific URL from ${envKey}:`, apiUrl);
      }
      
      // Fall back to default ADA_BMP_API_URL from .env
      if (!apiUrl) {
        apiUrl = process.env.ADA_BMP_API_URL;
        resolvedFrom = 'environment_default';
        console.log('[ADA-BMP Auth] Using default API URL from ADA_BMP_API_URL:', apiUrl);
      }
      
      // If still no URL, validation must fail
      if (!apiUrl) {
        console.error('[ADA-BMP Auth] ===== NO API URL CONFIGURED =====');
        console.error('[ADA-BMP Auth] Environment selected:', typedAuth.environment);
        console.error('[ADA-BMP Auth] No API URL found in environment variables');
        return {
          valid: false,
          error: `No API URL configured for "${typedAuth.environment}" environment.\n\nPlease ask your platform admin to configure the ADA_BMP_API_URL in the .env file.\n\nFor Staging: https://bmpapistgjkt.cl.bmp.ada-asia.my\nFor Dev: https://bmpapidev2.cl.bmp.ada-asia.my\nFor Production: https://bmpapi.bmp.ada-asia.my`,
        };
      }
      
      const checkTokenUrl = `${apiUrl.replace(/\/$/, '')}/user/checkToken`;
      console.log('[ADA-BMP Auth] Validating against URL:', checkTokenUrl);
      
      // Validate token by calling /user/checkToken endpoint
      const response = await httpClient.sendRequest({
        method: HttpMethod.POST,
        url: checkTokenUrl,
        body: {
          accessToken: typedAuth.apiToken,
        },
      });

      console.log('[ADA-BMP Auth] Response Status:', response.status);
      console.log('[ADA-BMP Auth] Response Body:', JSON.stringify(response.body, null, 2));

      if (response.status === 200) {
        console.log('[ADA-BMP Auth] ===== TOKEN VALIDATION SUCCESS =====');
        console.log('[ADA-BMP Auth] Token is valid for environment:', typedAuth.environment);
        console.log('[ADA-BMP Auth] Validation API URL:', apiUrl);
        console.log('[ADA-BMP Auth] Resolved from:', resolvedFrom);
        console.log('[ADA-BMP Auth] During flow execution, the API URL will be fetched from database metadata if configured');
        
        // Don't store API URL in connection metadata - let database metadata take precedence
        // The .env URL is only used for validation; runtime will use database metadata
        return {
          valid: true,
          metadata: {
            ADA_BMP_ENVIRONMENT: typedAuth.environment,
            ADA_BMP_VALIDATED_AT: new Date().toISOString(),
            ADA_BMP_DEBUG: process.env.ADA_BMP_DEBUG === 'true',
            ADA_BMP_TIMEOUT: parseInt(process.env.ADA_BMP_TIMEOUT || '30000', 10),
          },
        };
      }

      console.log('[ADA-BMP Auth] ===== TOKEN VALIDATION FAILED =====');
      
      if (response.status === 401 || response.status === 403) {
        return {
          valid: false,
          error: `Invalid token for ${typedAuth.environment} environment. Please ensure you are using the correct token for the ${apiUrl} API.`,
        };
      }
      
      if (response.status === 400) {
        const errorBody = response.body;
        const errorMessage = errorBody?.message || errorBody?.error || 'Invalid token format or token expired';
        return {
          valid: false,
          error: `Token validation failed: ${errorMessage}`,
        };
      }
      
      return {
        valid: false,
        error: `Token validation returned status ${response.status}. Please check your API token.`,
      };
    } catch (error: any) {
      console.error('[ADA-BMP Auth] ===== TOKEN VALIDATION ERROR =====');
      console.error('[ADA-BMP Auth] Error Type:', error.constructor.name);
      console.error('[ADA-BMP Auth] Error Message:', error.message);
      console.error('[ADA-BMP Auth] Error Response Status:', error.response?.status);
      console.error('[ADA-BMP Auth] Error Response Body:', error.response?.body);
      
      if (error.response?.status === 401 || error.response?.status === 403) {
        return {
          valid: false,
          error: `Invalid token: Authentication failed for ${(auth as any).environment} environment.`,
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
        error: `Failed to validate token: ${error.message || 'Unknown error'}`,
      };
    }
  },
});

/** Payload shape when BMP sends an event to the callback URL. BMP backend must send platform, accountNo, eventType. */
type BmpCallbackPayload = {
  challenge?: string;
  event?: string;
  eventType?: string;
  platform?: string;
  accountNo?: string;
  identifierValue?: string;
  tenantId?: string;
  apiUrl?: string;
  data?: unknown;
};

export const adaBmp = createPiece({
  displayName: 'ADA BMP',
  description: 'Multi-channel messaging platform supporting WhatsApp, Facebook, Line, and Instagram',
  minimumSupportedRelease: '0.36.1',
  logoUrl: '/ada-logo.png',
  categories: [PieceCategory.COMMUNICATION],
  auth: adaBmpAuth,
  events: {
    parseAndReply: ({ payload }) => {
      let body = payload.body;
      if (body == null || (typeof body === 'object' && Object.keys(body as object).length === 0)) {
        const raw = (payload as { rawBody?: string | Buffer }).rawBody;
        if (typeof raw === 'string') {
          try {
            body = JSON.parse(raw) as BmpCallbackPayload;
          } catch {
            body = {};
          }
        }
      } else if (typeof body === 'string') {
        try {
          body = JSON.parse(body) as BmpCallbackPayload;
        } catch {
          body = {};
        }
      }
      const parsed = (body ?? {}) as BmpCallbackPayload;
      if (parsed.challenge) {
        return { reply: { headers: {}, body: parsed.challenge } };
      }
      // Required fields from BMP: platform, accountNo, eventType (top-level). Accept nested under .data if needed.
      const top = parsed as Record<string, unknown>;
      const data = (top.data && typeof top.data === 'object' && top.data !== null ? top.data : top) as Record<string, unknown>;
      const platform = (parsed.platform ?? data.platform) != null ? String(parsed.platform ?? data.platform).trim() : '';
      const accountNo = (parsed.accountNo ?? data.accountNo) != null ? String(parsed.accountNo ?? data.accountNo).trim() : '';
      const eventType = (parsed.eventType ?? data.eventType ?? parsed.event ?? data.event) != null ? String(parsed.eventType ?? data.eventType ?? parsed.event ?? data.event).trim() : '';
      if (!platform || !accountNo || !eventType) {
        return { event: undefined, identifierValue: undefined };
      }
      // const event = parsed.event ?? parsed.eventType ?? 'Message';
      // Route all event types to the same listener; do not check eventType === 'Message' so any value (Message, Delivery, Read, etc.) is accepted
      const event = 'Message';
      const identifierValue = `${platform}:${accountNo}`;
      return { event, identifierValue };
    },
    verify: ({ webhookSecret, payload }) => {
      const authHeader =
        payload.headers?.['authorization'] ??
        payload.headers?.['Authorization'] ??
        payload.headers?.['x-webhook-secret'] ??
        payload.headers?.['X-Webhook-Secret'];
      const token = typeof authHeader === 'string' ? authHeader.replace(/^Bearer\s+/i, '').trim() : '';
      return webhookSecret === undefined || webhookSecret === '' ? true : token === webhookSecret;
    },
  },
  authors: [],
  actions: [
    sendMessageAction,
    sendBulkMessageAction,
    createCustomApiCallAction({
      baseUrl: (auth) => {
        // auth is CustomAuth with apiToken, environment, and optional apiUrl
        const customAuth = auth as any;
        
        if (customAuth.apiUrl) {
          debugLog('Custom API Call - Using custom API URL:', customAuth.apiUrl);
          return customAuth.apiUrl;
        }
        
        // Fallback to environment variable or default
        const envKey = `${customAuth.environment.toUpperCase().replace(/\s+/g, '_')}_ADA_BMP_API_URL`;
        const url = process.env[envKey] || process.env.ADA_BMP_API_URL || getBaseUrl();
        debugLog('Custom API Call - Using API URL:', url);
        return url;
      },
      auth: adaBmpAuth,
      authMapping: async (auth) => {
        // auth is CustomAuth with apiToken, environment, and optional apiUrl
        const customAuth = auth as any;
        const token = customAuth.apiToken;
        debugLog('Custom API Call - Using token for environment:', customAuth.environment);
        
        return {
          Authorization: `Bearer ${token}`,
        };
      },
    }),
  ],
  triggers: [
    receiveWebhook,
    newMessageCallbackTrigger,
  ],
});
