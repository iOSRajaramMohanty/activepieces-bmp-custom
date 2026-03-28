import {
  createTrigger,
  TriggerStrategy,
  Property,
  type Trigger,
} from '@activepieces/pieces-framework';
import { httpClient, HttpMethod, AuthenticationType } from '@activepieces/pieces-common';
import { adaBmpAuth } from '../common/auth';
import { API_ENDPOINTS, bmpLogger } from '../common/config';

const CACHE_KEY = 'ada_bmp_webhook_id';
const PROJECT_METADATA_BISUAT_TOKEN_KEY = 'bisuatToken';

/**
 * Webhook trigger for ADA BMP that receives webhook events.
 * 
 * This trigger uses BISUAT tokens (separate from BMP connection tokens):
 * - BISUAT token: Stored in project metadata via UI (Project Settings > General > BMP API Token)
 *   Used ONLY for webhook verification when BMP sends webhooks
 * - BMP connection token: From context.auth, used for API calls in actions (send-message, send-bulk-message)
 *   These are DIFFERENT tokens with different purposes
 * 
 * This ensures:
 * - Webhook verification uses BISUAT token from project metadata (stored by admin via UI)
 * - API actions use BMP connection token from context.auth
 * - Complete separation between webhook authentication and API authentication
 */
export const receiveWebhook: Trigger = createTrigger({
  auth: adaBmpAuth,
  name: 'receive_webhook',
  displayName: 'Receive Webhook',
  description: 'Triggers when BMP sends a webhook event. Uses BISUAT token from project metadata (separate from BMP connection token).',
  props: {
    webhookInstructions: Property.MarkDown({
      value: `
**Webhook Setup (Admin Only):**

This trigger uses **BISUAT tokens** (separate from BMP connection tokens).

**Important:** 
- **BISUAT Token**: Configured via Project Settings > General > BMP API Token
  - Used ONLY for webhook verification
  - Stored in project metadata
  - Must be different from your BMP connection token

- **BMP Connection Token**: Used in connection settings for API calls
  - Used for send-message, send-bulk-message actions
  - Different from BISUAT token

**Webhook URL:**
\`\`\`text
{{webhookUrl}}
\`\`\`

**How it works:**
1. Admin stores BISUAT token in Project Settings > General > BMP API Token
2. BISUAT token is stored in project metadata (accessible to all webhook triggers)
3. When BMP sends webhooks, the BISUAT token is verified against project metadata
4. BISUAT token is completely separate from BMP connection token used for API calls
      `,
    }),
    verifyToken: Property.Checkbox({
      displayName: 'Verify Token',
      description: 'If enabled, verifies the token in incoming webhook requests. BMP should send the token in the Authorization header or payload.',
      required: false,
      defaultValue: true,
    }),
  },
  type: TriggerStrategy.WEBHOOK,
  sampleData: {
    event: 'message.received',
    timestamp: '2024-01-01T00:00:00Z',
    data: {
      id: 'msg_123',
      from: '+1234567890',
      to: '+0987654321',
      message: 'Sample webhook message',
      platform: 'whatsapp',
    },
  },
  async onEnable(context) {
    try {
      const projectId = context.project.id;
      const serverToken = context.server.token;
      const apiUrl = context.server.apiUrl;

      const projectUrl = `${apiUrl}v1/projects/${projectId}`;
      bmpLogger.request({ method: 'GET', url: projectUrl });
      const projectResponse = await httpClient.sendRequest({
        method: HttpMethod.GET,
        url: projectUrl,
        authentication: {
          type: AuthenticationType.BEARER_TOKEN,
          token: serverToken,
        },
      });
      bmpLogger.response({ status: projectResponse.status, body: projectResponse.body });

      const project = projectResponse.body as { metadata?: Record<string, unknown> };
      const bisuatToken = project.metadata?.[PROJECT_METADATA_BISUAT_TOKEN_KEY] as string | undefined;

      if (!bisuatToken) {
        bmpLogger.warn('BISUAT token not found in project metadata. Please configure it via Project Settings > General > BMP API Token');
      } else {
        bmpLogger.info('BISUAT token found in project metadata');
      }

      const webhookUrl = context.webhookUrl;

      if (bisuatToken) {
        try {
          const webhookRegUrl = `${API_ENDPOINTS.validateToken().replace('/user/checkToken', '/webhook')}`;
          const webhookBody = {
            url: webhookUrl,
            events: ['message.received', 'message.sent'],
          };
          bmpLogger.request({ method: 'POST', url: webhookRegUrl, body: webhookBody });
          const response = await httpClient.sendRequest({
            method: HttpMethod.POST,
            url: webhookRegUrl,
            authentication: {
              type: AuthenticationType.BEARER_TOKEN,
              token: bisuatToken,
            },
            body: webhookBody,
          });
          bmpLogger.response({ status: response.status, body: response.body });

          const webhookId = (response.body as Record<string, unknown>).id || (response.body as Record<string, unknown>).webhook_id;
          if (webhookId) {
            await context.store.put(CACHE_KEY, webhookId);
            bmpLogger.info('Webhook registered successfully', { webhookId });
          }
        } catch (webhookError: unknown) {
          const err = webhookError instanceof Error ? webhookError : new Error(String(webhookError));
          bmpLogger.warn('Webhook registration failed', err.message);
        }
      } else {
        bmpLogger.warn('BISUAT token not configured. Webhook verification will fail until token is set via Project Settings.');
      }
    } catch (error: unknown) {
      const err = error instanceof Error ? error : new Error(String(error));
      bmpLogger.error('Error in onEnable', err.message);
      throw new Error(`Failed to enable webhook: ${err.message || 'Unknown error'}`);
    }
  },

  async onDisable(context) {
    try {
      const webhookId = await context.store.get<string>(CACHE_KEY);

      const projectId = context.project.id;
      const serverToken = context.server.token;
      const apiUrl = context.server.apiUrl;

      const disableProjectUrl = `${apiUrl}v1/projects/${projectId}`;
      bmpLogger.request({ method: 'GET', url: disableProjectUrl });
      const projectResponse = await httpClient.sendRequest({
        method: HttpMethod.GET,
        url: disableProjectUrl,
        authentication: {
          type: AuthenticationType.BEARER_TOKEN,
          token: serverToken,
        },
      });
      bmpLogger.response({ status: projectResponse.status, body: projectResponse.body });

      const project = projectResponse.body as { metadata?: Record<string, unknown> };
      const token = project.metadata?.[PROJECT_METADATA_BISUAT_TOKEN_KEY] as string | undefined;

      if (webhookId && token) {
        try {
          const deleteUrl = `${API_ENDPOINTS.validateToken().replace('/user/checkToken', '/webhook')}/${webhookId}`;
          bmpLogger.request({ method: 'DELETE', url: deleteUrl });
          const deleteResponse = await httpClient.sendRequest({
            method: HttpMethod.DELETE,
            url: deleteUrl,
            authentication: {
              type: AuthenticationType.BEARER_TOKEN,
              token,
            },
          });
          bmpLogger.response({ status: deleteResponse.status, body: deleteResponse.body });

          await context.store.delete(CACHE_KEY);
          bmpLogger.info('Webhook unregistered successfully');
        } catch (webhookError: unknown) {
          const err = webhookError instanceof Error ? webhookError : new Error(String(webhookError));
          bmpLogger.warn('Webhook unregistration failed', err.message);
        }
      } else {
        bmpLogger.info('No webhook ID or token found, skipping deletion');
      }
    } catch (error: unknown) {
      const err = error instanceof Error ? error : new Error(String(error));
      bmpLogger.warn('Webhook disable failed', err.message);
    }
  },

  async run(context) {
    const verifyToken = context.propsValue.verifyToken ?? true;
    const payload = context.payload.body || context.payload;

    bmpLogger.info('Webhook received', { verifyToken, payloadKeys: Object.keys(payload || {}), payload });

    if (verifyToken) {
      const projectId = context.project.id;
      const serverToken = context.server.token;
      const apiUrl = context.server.apiUrl;

      let token: string | undefined;
      try {
        const runProjectUrl = `${apiUrl}v1/projects/${projectId}`;
        bmpLogger.request({ method: 'GET', url: runProjectUrl });
        const projectResponse = await httpClient.sendRequest({
          method: HttpMethod.GET,
          url: runProjectUrl,
          authentication: {
            type: AuthenticationType.BEARER_TOKEN,
            token: serverToken,
          },
        });
        bmpLogger.response({ status: projectResponse.status, body: projectResponse.body });

        const project = projectResponse.body as { metadata?: Record<string, unknown> };
        token = project.metadata?.[PROJECT_METADATA_BISUAT_TOKEN_KEY] as string | undefined;

        if (!token) {
          throw new Error('BISUAT token not found in project metadata. Please configure it via Project Settings > General > BMP API Token. Note: This is different from your BMP connection token.');
        }
      } catch (error: unknown) {
        const err = error instanceof Error ? error : new Error(String(error));
        bmpLogger.error('Failed to retrieve token from project metadata', err.message);
        throw new Error(`Failed to retrieve BMP token: ${err.message || 'Unknown error'}`);
      }

      const authHeader = context.payload.headers?.['authorization'] || 
                        context.payload.headers?.['Authorization'] ||
                        context.payload.headers?.['x-api-token'] ||
                        context.payload.headers?.['X-API-Token'];

      if (authHeader) {
        const headerToken = authHeader.replace(/^Bearer\s+/i, '');
        if (headerToken !== token) {
          bmpLogger.warn('Token verification failed (header)');
          throw new Error('Invalid webhook token: Token mismatch in Authorization header');
        }
        bmpLogger.info('Token verified successfully (header)');
      } else {
        const payloadRecord = payload as Record<string, unknown>;
        const payloadToken = (payloadRecord?.token ?? payloadRecord?.accessToken) as string | undefined;
        if (payloadToken) {
          if (payloadToken !== token) {
            bmpLogger.warn('Token verification failed (payload)');
            throw new Error('Invalid webhook token: Token mismatch in payload');
          }
          bmpLogger.info('Token verified successfully (payload)');
        } else {
          bmpLogger.warn('Token verification enabled but no token found in headers or payload', {
            headers: Object.keys(context.payload.headers || {}),
          });
        }
      }
    }

    return [payload];
  },
});
