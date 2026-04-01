import { createTrigger, TriggerStrategy, Property, type Trigger } from '@activepieces/pieces-framework';
import { adaBmpAuth } from '../common/auth';
import { bmpLogger } from '../common/config';

export const receiveWebhook: Trigger = createTrigger({
  auth: adaBmpAuth,
  name: 'receive_webhook',
  displayName: 'Receive Webhook',
  description: 'Triggers when BMP sends a webhook event to this flow\'s webhook URL.',
  props: {
    webhookInstructions: Property.MarkDown({
      value: `
**Webhook Setup:**

Copy the webhook URL below and register it in BMP as the callback endpoint.

**Webhook URL:**
\`\`\`text
{{webhookUrl}}
\`\`\`

BMP will POST events to this URL and the flow will trigger for every incoming request.
      `,
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
  async onEnable() {
    bmpLogger.info('Receive Webhook trigger enabled');
  },
  async onDisable() {
    bmpLogger.info('Receive Webhook trigger disabled');
  },
  async run(context) {
    const contentType = context.payload.headers?.['content-type'] ?? context.payload.headers?.['Content-Type'] ?? '';
    const hasJsonBody = contentType.includes('application/json') && context.payload.body != null;
    if (!hasJsonBody) {
      bmpLogger.warn('Webhook ignored: only POST requests with a JSON body are accepted');
      return [];
    }
    const payload = context.payload.body as Record<string, unknown>;
    bmpLogger.info('Webhook received', { payloadKeys: Object.keys(payload) });
    return [payload];
  },
});
