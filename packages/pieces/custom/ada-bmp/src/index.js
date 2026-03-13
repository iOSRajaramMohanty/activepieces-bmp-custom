"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.adaBmp = exports.adaBmpAuth = void 0;
const pieces_common_1 = require("@activepieces/pieces-common");
const pieces_framework_1 = require("@activepieces/pieces-framework");
const shared_1 = require("@activepieces/shared");
const send_message_1 = require("./lib/actions/send-message");
const send_bulk_message_1 = require("./lib/actions/send-bulk-message");
const receive_webhook_1 = require("./lib/triggers/receive-webhook");
const new_message_callback_1 = require("./lib/triggers/new-message-callback");
const config_1 = require("./lib/common/config");
exports.adaBmpAuth = pieces_framework_1.PieceAuth.CustomAuth({
    displayName: 'ADA BMP Connection',
    description: 'Configure your ADA BMP API connection with environment-specific settings',
    required: true,
    props: {
        apiToken: pieces_framework_1.Property.ShortText({
            displayName: 'API Token',
            description: 'Enter your ADA BMP API token',
            required: true,
        }),
        environment: pieces_framework_1.Property.StaticDropdown({
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
            const typedAuth = auth;
            // API URL must come from organization_environment.metadata (injected as process.env.ADA_BMP_API_URL)
            const apiUrl = process.env.ADA_BMP_API_URL?.trim();
            if (!apiUrl) {
                return {
                    valid: false,
                    error: `No API URL configured for "${typedAuth.environment}" environment. Configure ADA_BMP_API_URL in Organization > Environments > [your org] > Configure for the selected environment.`,
                };
            }
            const checkTokenUrl = `${apiUrl.replace(/\/$/, '')}/user/checkToken`;
            console.log('[ADA-BMP Auth] Validating against URL:', checkTokenUrl);
            // Validate token by calling /user/checkToken endpoint
            const response = await pieces_common_1.httpClient.sendRequest({
                method: pieces_common_1.HttpMethod.POST,
                url: checkTokenUrl,
                body: {
                    accessToken: typedAuth.apiToken,
                },
            });
            console.log('[ADA-BMP Auth] Response Status:', response.status);
            console.log('[ADA-BMP Auth] Response Body:', JSON.stringify(response.body, null, 2));
            if (response.status === 200) {
                console.log('[ADA-BMP Auth] Token validated for environment:', typedAuth.environment);
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
            if (response.status >= 500 && response.status < 600) {
                return {
                    valid: false,
                    error: `BMP ${typedAuth.environment} API is temporarily unavailable (server error ${response.status}). Please try again later or use a different environment.`,
                };
            }
            return {
                valid: false,
                error: `Token validation returned status ${response.status}. Please check your API token.`,
            };
        }
        catch (error) {
            console.error('[ADA-BMP Auth] ===== TOKEN VALIDATION ERROR =====');
            console.error('[ADA-BMP Auth] Error Type:', error.constructor.name);
            console.error('[ADA-BMP Auth] Error Message:', error.message);
            console.error('[ADA-BMP Auth] Error Response Status:', error.response?.status);
            console.error('[ADA-BMP Auth] Error Response Body:', error.response?.body);
            if (error.response?.status === 401 || error.response?.status === 403) {
                return {
                    valid: false,
                    error: `Invalid token: Authentication failed for ${auth.environment} environment.`,
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
            const status = error.response?.status;
            if (status >= 500 && status < 600) {
                const env = auth?.environment ?? 'API';
                return {
                    valid: false,
                    error: `BMP ${env} API is temporarily unavailable (server error ${status}). Please try again later or use a different environment.`,
                };
            }
            return {
                valid: false,
                error: `Failed to validate token: ${error.message || 'Unknown error'}`,
            };
        }
    },
});
exports.adaBmp = (0, pieces_framework_1.createPiece)({
    displayName: 'ADA BMP',
    description: 'Multi-channel messaging platform supporting WhatsApp, Facebook, Line, and Instagram',
    minimumSupportedRelease: '0.36.1',
    logoUrl: 'https://imagedelivery.net/ZvxstLLilyjMGnog41fs3g/ff4be95c-e460-492f-b112-128c64056100/public',
    categories: [shared_1.PieceCategory.COMMUNICATION],
    auth: exports.adaBmpAuth,
    events: {
        parseAndReply: ({ payload }) => {
            let body = payload.body;
            if (body == null || (typeof body === 'object' && Object.keys(body).length === 0)) {
                const raw = payload.rawBody;
                if (typeof raw === 'string') {
                    try {
                        body = JSON.parse(raw);
                    }
                    catch {
                        body = {};
                    }
                }
            }
            else if (typeof body === 'string') {
                try {
                    body = JSON.parse(body);
                }
                catch {
                    body = {};
                }
            }
            const parsed = (body ?? {});
            if (parsed.challenge) {
                return { reply: { headers: {}, body: parsed.challenge } };
            }
            // Required fields from BMP: platform, accountNo, eventType (top-level). Accept nested under .data if needed.
            const top = parsed;
            const data = (top.data && typeof top.data === 'object' && top.data !== null ? top.data : top);
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
            const authHeader = payload.headers?.['authorization'] ??
                payload.headers?.['Authorization'] ??
                payload.headers?.['x-webhook-secret'] ??
                payload.headers?.['X-Webhook-Secret'];
            const token = typeof authHeader === 'string' ? authHeader.replace(/^Bearer\s+/i, '').trim() : '';
            return webhookSecret === undefined || webhookSecret === '' ? true : token === webhookSecret;
        },
    },
    authors: [],
    actions: [
        send_message_1.sendMessageAction,
        send_bulk_message_1.sendBulkMessageAction,
        (0, pieces_common_1.createCustomApiCallAction)({
            baseUrl: (auth) => {
                // auth is CustomAuth with apiToken, environment, and optional apiUrl
                const customAuth = auth;
                if (customAuth.apiUrl) {
                    (0, config_1.debugLog)('Custom API Call - Using custom API URL:', customAuth.apiUrl);
                    return customAuth.apiUrl;
                }
                // Fallback to environment variable or default
                const envKey = `${customAuth.environment.toUpperCase().replace(/\s+/g, '_')}_ADA_BMP_API_URL`;
                const url = process.env[envKey] || process.env.ADA_BMP_API_URL || (0, config_1.getBaseUrl)();
                (0, config_1.debugLog)('Custom API Call - Using API URL:', url);
                return url;
            },
            auth: exports.adaBmpAuth,
            authMapping: async (auth) => {
                // auth is CustomAuth with apiToken, environment, and optional apiUrl
                const customAuth = auth;
                const token = customAuth.apiToken;
                (0, config_1.debugLog)('Custom API Call - Using token for environment:', customAuth.environment);
                return {
                    Authorization: `Bearer ${token}`,
                };
            },
        }),
    ],
    triggers: [
        receive_webhook_1.receiveWebhook,
        new_message_callback_1.newMessageCallbackTrigger,
    ],
});
//# sourceMappingURL=index.js.map