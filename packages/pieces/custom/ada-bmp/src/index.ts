import { createCustomApiCallAction } from '@activepieces/pieces-common';
import { createPiece } from '@activepieces/pieces-framework';
import { PieceCategory } from '@activepieces/shared';
import { sendMessageAction } from './lib/actions/send-message';
import { sendBulkMessageAction } from './lib/actions/send-bulk-message';
import { receiveWebhook } from './lib/triggers/receive-webhook';
import { newMessageCallbackTrigger } from './lib/triggers/new-message-callback';
import { getBaseUrl, debugLog } from './lib/common/config';
import { adaBmpAuth } from './lib/common/auth';

// Re-export adaBmpAuth for external usage
export { adaBmpAuth };

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
  logoUrl: 'https://imagedelivery.net/ZvxstLLilyjMGnog41fs3g/ff4be95c-e460-492f-b112-128c64056100/public',
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
