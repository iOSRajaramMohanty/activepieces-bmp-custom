"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.receiveWebhook = void 0;
const pieces_framework_1 = require("@activepieces/pieces-framework");
const pieces_common_1 = require("@activepieces/pieces-common");
const index_1 = require("../../index");
const config_1 = require("../common/config");
const CACHE_KEY = 'ada_bmp_webhook_id';
const PROJECT_METADATA_BISUAT_TOKEN_KEY = 'bisuatToken'; // Key for storing BISUAT token in project metadata (separate from BMP connection token)
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
exports.receiveWebhook = (0, pieces_framework_1.createTrigger)({
    auth: index_1.adaBmpAuth, // Note: This auth is NOT used for webhook verification, only for onEnable/onDisable operations
    name: 'receive_webhook',
    displayName: 'Receive Webhook',
    description: 'Triggers when BMP sends a webhook event. Uses BISUAT token from project metadata (separate from BMP connection token).',
    props: {
        webhookInstructions: pieces_framework_1.Property.MarkDown({
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
        verifyToken: pieces_framework_1.Property.Checkbox({
            displayName: 'Verify Token',
            description: 'If enabled, verifies the token in incoming webhook requests. BMP should send the token in the Authorization header or payload.',
            required: false,
            defaultValue: true,
        }),
    },
    type: pieces_framework_1.TriggerStrategy.WEBHOOK,
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
            // Note: BISUAT token should be stored via UI (Project Settings > General > BMP API Token)
            // We do NOT use context.auth here to avoid mixing BMP connection token with BISUAT token
            // The BISUAT token must be configured separately by admin via the UI
            const projectId = context.project.id;
            const serverToken = context.server.token;
            const apiUrl = context.server.apiUrl;
            // Check if BISUAT token exists in project metadata (configured via UI)
            const projectResponse = await pieces_common_1.httpClient.sendRequest({
                method: pieces_common_1.HttpMethod.GET,
                url: `${apiUrl}v1/projects/${projectId}`,
                authentication: {
                    type: pieces_common_1.AuthenticationType.BEARER_TOKEN,
                    token: serverToken,
                },
            });
            const project = projectResponse.body;
            const bisuatToken = project.metadata?.[PROJECT_METADATA_BISUAT_TOKEN_KEY];
            if (!bisuatToken) {
                (0, config_1.debugLog)('BISUAT token not found in project metadata');
                console.warn('[ADA-BMP] BISUAT token not found in project metadata. Please configure it via Project Settings > General > BMP API Token');
                // Don't throw - allow trigger to be enabled, token verification will fail in run() if not configured
            }
            else {
                (0, config_1.debugLog)('BISUAT token found in project metadata (configured via UI)');
            }
            // Register webhook with BMP API using BISUAT token (if available)
            // Note: Using BISUAT token from metadata, NOT BMP connection token
            const webhookUrl = context.webhookUrl;
            if (bisuatToken) {
                (0, config_1.debugLog)('Registering webhook with BMP API using BISUAT token', { webhookUrl });
                // Example: Register webhook with BMP API using BISUAT token
                // Adjust the endpoint and payload based on your BMP API documentation
                try {
                    const response = await pieces_common_1.httpClient.sendRequest({
                        method: pieces_common_1.HttpMethod.POST,
                        url: `${config_1.API_ENDPOINTS.validateToken().replace('/user/checkToken', '/webhook')}`, // Example endpoint
                        authentication: {
                            type: pieces_common_1.AuthenticationType.BEARER_TOKEN,
                            token: bisuatToken, // Use BISUAT token, NOT BMP connection token
                        },
                        body: {
                            url: webhookUrl,
                            events: ['message.received', 'message.sent'], // Adjust based on BMP events
                        },
                    });
                    // Store webhook ID for later deletion
                    const webhookId = response.body.id || response.body.webhook_id;
                    if (webhookId) {
                        await context.store.put(CACHE_KEY, webhookId);
                        (0, config_1.debugLog)('Webhook registered successfully', { webhookId });
                    }
                }
                catch (webhookError) {
                    (0, config_1.debugLog)('Webhook registration with BMP API failed', webhookError);
                    // Don't fail the enable - webhook might be registered manually
                    console.warn('[ADA-BMP] Webhook registration failed. You may need to register manually:', webhookError.message);
                }
            }
            else {
                (0, config_1.debugLog)('Skipping webhook registration - BISUAT token not configured');
                console.warn('[ADA-BMP] BISUAT token not configured. Webhook verification will fail until token is set via Project Settings.');
            }
        }
        catch (error) {
            (0, config_1.debugLog)('Failed to enable webhook trigger', error);
            throw new Error(`Failed to enable webhook: ${error.message || 'Unknown error'}`);
        }
    },
    async onDisable(context) {
        try {
            const webhookId = await context.store.get(CACHE_KEY);
            // Get token from project metadata (not from context.auth, as it might not be available)
            const projectId = context.project.id;
            const serverToken = context.server.token;
            const apiUrl = context.server.apiUrl;
            // Get project to retrieve stored token
            const projectResponse = await pieces_common_1.httpClient.sendRequest({
                method: pieces_common_1.HttpMethod.GET,
                url: `${apiUrl}v1/projects/${projectId}`,
                authentication: {
                    type: pieces_common_1.AuthenticationType.BEARER_TOKEN,
                    token: serverToken,
                },
            });
            const project = projectResponse.body;
            const token = project.metadata?.[PROJECT_METADATA_BISUAT_TOKEN_KEY]; // Use BISUAT token, not BMP connection token
            if (webhookId && token) {
                (0, config_1.debugLog)('Unregistering webhook', { webhookId });
                // Unregister webhook with BMP API
                try {
                    await pieces_common_1.httpClient.sendRequest({
                        method: pieces_common_1.HttpMethod.DELETE,
                        url: `${config_1.API_ENDPOINTS.validateToken().replace('/user/checkToken', '/webhook')}/${webhookId}`,
                        authentication: {
                            type: pieces_common_1.AuthenticationType.BEARER_TOKEN,
                            token,
                        },
                    });
                    await context.store.delete(CACHE_KEY);
                    (0, config_1.debugLog)('Webhook unregistered successfully');
                }
                catch (webhookError) {
                    (0, config_1.debugLog)('Webhook unregistration with BMP API failed', webhookError);
                    console.warn('[ADA-BMP] Webhook unregistration failed:', webhookError.message);
                }
            }
            else {
                (0, config_1.debugLog)('No webhook ID or token found, skipping deletion');
            }
            // Note: We don't remove the token from project metadata here
            // as it might be used by other webhook triggers in the same project
        }
        catch (error) {
            (0, config_1.debugLog)('Failed to disable webhook trigger', error);
            console.warn('[ADA-BMP] Webhook disable failed:', error.message);
        }
    },
    async run(context) {
        const verifyToken = context.propsValue.verifyToken ?? true;
        const payload = context.payload.body || context.payload;
        (0, config_1.debugLog)('Webhook received', {
            verifyToken,
            payloadKeys: Object.keys(payload || {}),
        });
        // Token verification in the run method
        // BISUAT token is retrieved from project metadata (stored by admin via UI)
        // This is SEPARATE from BMP connection token used in actions
        if (verifyToken) {
            // Get token from project metadata
            const projectId = context.project.id;
            const serverToken = context.server.token;
            const apiUrl = context.server.apiUrl;
            let token;
            try {
                const projectResponse = await pieces_common_1.httpClient.sendRequest({
                    method: pieces_common_1.HttpMethod.GET,
                    url: `${apiUrl}v1/projects/${projectId}`,
                    authentication: {
                        type: pieces_common_1.AuthenticationType.BEARER_TOKEN,
                        token: serverToken,
                    },
                });
                const project = projectResponse.body;
                token = project.metadata?.[PROJECT_METADATA_BISUAT_TOKEN_KEY];
                if (!token) {
                    (0, config_1.debugLog)('BISUAT token not found in project metadata');
                    throw new Error('BISUAT token not found in project metadata. Please configure it via Project Settings > General > BMP API Token. Note: This is different from your BMP connection token.');
                }
            }
            catch (error) {
                (0, config_1.debugLog)('Failed to retrieve token from project metadata', error);
                throw new Error(`Failed to retrieve BMP token: ${error.message || 'Unknown error'}`);
            }
            // Option 1: Verify token from Authorization header
            const authHeader = context.payload.headers?.['authorization'] ||
                context.payload.headers?.['Authorization'] ||
                context.payload.headers?.['x-api-token'] ||
                context.payload.headers?.['X-API-Token'];
            if (authHeader) {
                const headerToken = authHeader.replace(/^Bearer\s+/i, '');
                if (headerToken !== token) {
                    (0, config_1.debugLog)('Token verification failed (header)', {
                        received: headerToken.substring(0, 10) + '...',
                        expected: token.substring(0, 10) + '...',
                    });
                    throw new Error('Invalid webhook token: Token mismatch in Authorization header');
                }
                (0, config_1.debugLog)('Token verified successfully (header)');
            }
            else {
                // Option 2: Verify token from payload
                const payloadToken = payload?.token || payload?.accessToken;
                if (payloadToken) {
                    if (payloadToken !== token) {
                        (0, config_1.debugLog)('Token verification failed (payload)', {
                            received: payloadToken.substring(0, 10) + '...',
                            expected: token.substring(0, 10) + '...',
                        });
                        throw new Error('Invalid webhook token: Token mismatch in payload');
                    }
                    (0, config_1.debugLog)('Token verified successfully (payload)');
                }
                else {
                    // If no token found but verification is enabled, log warning
                    (0, config_1.debugLog)('Token verification enabled but no token found in headers or payload', {
                        headers: Object.keys(context.payload.headers || {}),
                    });
                    // Note: You can uncomment the line below if strict verification is required
                    // throw new Error('Token verification enabled but no token found in webhook request');
                }
            }
        }
        // Return the payload to trigger the flow
        return [payload];
    },
});
//# sourceMappingURL=receive-webhook.js.map