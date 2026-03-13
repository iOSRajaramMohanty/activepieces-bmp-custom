import { TriggerStrategy } from '@activepieces/pieces-framework';
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
export declare const receiveWebhook: import("@activepieces/pieces-framework").ITrigger<TriggerStrategy.WEBHOOK, import("@activepieces/pieces-framework").CustomAuthProperty<{
    apiToken: import("@activepieces/pieces-framework").ShortTextProperty<true>;
    environment: import("@activepieces/pieces-framework").StaticDropdownProperty<string, true>;
}>, {
    webhookInstructions: import("node_modules/@activepieces/pieces-framework/dist/src/lib/property/input/markdown-property").MarkDownProperty;
    verifyToken: import("@activepieces/pieces-framework").CheckboxProperty<false>;
}> | import("@activepieces/pieces-framework").ITrigger<TriggerStrategy.POLLING, import("@activepieces/pieces-framework").CustomAuthProperty<{
    apiToken: import("@activepieces/pieces-framework").ShortTextProperty<true>;
    environment: import("@activepieces/pieces-framework").StaticDropdownProperty<string, true>;
}>, {
    webhookInstructions: import("node_modules/@activepieces/pieces-framework/dist/src/lib/property/input/markdown-property").MarkDownProperty;
    verifyToken: import("@activepieces/pieces-framework").CheckboxProperty<false>;
}> | import("@activepieces/pieces-framework").ITrigger<TriggerStrategy.MANUAL, import("@activepieces/pieces-framework").CustomAuthProperty<{
    apiToken: import("@activepieces/pieces-framework").ShortTextProperty<true>;
    environment: import("@activepieces/pieces-framework").StaticDropdownProperty<string, true>;
}>, {
    webhookInstructions: import("node_modules/@activepieces/pieces-framework/dist/src/lib/property/input/markdown-property").MarkDownProperty;
    verifyToken: import("@activepieces/pieces-framework").CheckboxProperty<false>;
}> | import("@activepieces/pieces-framework").ITrigger<TriggerStrategy.APP_WEBHOOK, import("@activepieces/pieces-framework").CustomAuthProperty<{
    apiToken: import("@activepieces/pieces-framework").ShortTextProperty<true>;
    environment: import("@activepieces/pieces-framework").StaticDropdownProperty<string, true>;
}>, {
    webhookInstructions: import("node_modules/@activepieces/pieces-framework/dist/src/lib/property/input/markdown-property").MarkDownProperty;
    verifyToken: import("@activepieces/pieces-framework").CheckboxProperty<false>;
}>;
