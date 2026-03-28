import { createTrigger, TriggerStrategy, type Trigger } from '@activepieces/pieces-framework';
import { httpClient, HttpMethod, AuthenticationType } from '@activepieces/pieces-common';
import { adaBmpAuth } from '../common/auth';
import { channelInfo, adaBmpChannel, adaBmpAccount, CHANNEL_TO_PLATFORM } from '../common/props';
import { API_ENDPOINTS, extractApiToken, bmpLogger } from '../common/config';

/**
 * BMP callback URL trigger (Slack-style app webhook).
 * BMP backend must send platform, accountNo, and eventType in every request.
 * Only flows whose selected channel/account match the payload will run.
 */
export const newMessageCallbackTrigger: Trigger = createTrigger({
  auth: adaBmpAuth,
  name: 'new_message_callback',
  displayName: 'New message receive',
  description: 'Triggers when BMP sends an event to the callback URL. BMP must send platform, accountNo, and eventType. Only runs when payload matches the selected channel and account.',
  props: {
    info: channelInfo,
    channel: adaBmpChannel(true),
    account: adaBmpAccount(true),
  },
  type: TriggerStrategy.APP_WEBHOOK,
  sampleData: undefined,
  onEnable: async (context) => {
    const channel = context.propsValue.channel as string | undefined;
    const accountId = context.propsValue.account as string | undefined;
    if (!channel || !accountId) {
      throw new Error('Channel and Account are required. Please select a channel and account for this trigger.');
    }
    const platformCode = CHANNEL_TO_PLATFORM[channel];
    if (!platformCode) {
      throw new Error(`Unknown channel: ${channel}. Please select a valid channel.`);
    }
    const accountsUrl = API_ENDPOINTS.getAccounts(platformCode, undefined, context.auth);
    bmpLogger.request({ method: 'GET', url: accountsUrl });
    const response = await httpClient.sendRequest({
      method: HttpMethod.GET,
      url: accountsUrl,
      authentication: {
        type: AuthenticationType.BEARER_TOKEN,
        token: extractApiToken(context.auth),
      },
    });
    bmpLogger.response({ status: response.status, body: response.body });
    const body = response.body as { data?: Array<{ id: string; accountNo: string }> };
    const selectedAccount = body.data?.find((a) => a.id === accountId);
    if (!selectedAccount) {
      throw new Error(`Account not found for selected channel. Please reselect channel and account.`);
    }
    const identifierValue = `${platformCode}:${selectedAccount.accountNo}`;
    bmpLogger.info('New message callback: registering listener', { identifierValue, eventType: 'Message' });
    context.app.createListeners({
      events: ['Message'],
      identifierValue,
    });
  },
  onDisable: async () => {
    // Listeners are removed by the platform when the trigger is disabled
  },
  run: async (context) => {
    const body = context.payload.body as Record<string, unknown>;
    bmpLogger.info('Callback received', { platform: body?.platform, accountNo: body?.accountNo, eventType: body?.eventType });
    const platform = body?.platform != null ? String(body.platform).trim() : '';
    const accountNo = body?.accountNo != null ? String(body.accountNo).trim() : '';
    const eventType = body?.eventType != null ? String(body.eventType).trim() : '';
    if (!platform || !accountNo || !eventType) {
      bmpLogger.warn('Callback skipped: missing platform, accountNo, or eventType');
      return [];
    }
    return [body];
  },
});
