"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.newMessageCallbackTrigger = void 0;
const pieces_framework_1 = require("@activepieces/pieces-framework");
const pieces_common_1 = require("@activepieces/pieces-common");
const index_1 = require("../../index");
const props_1 = require("../common/props");
const config_1 = require("../common/config");
/**
 * BMP callback URL trigger (Slack-style app webhook).
 * BMP backend must send platform, accountNo, and eventType in every request.
 * Only flows whose selected channel/account match the payload will run.
 */
exports.newMessageCallbackTrigger = (0, pieces_framework_1.createTrigger)({
    auth: index_1.adaBmpAuth,
    name: 'new_message_callback',
    displayName: 'New message receive',
    description: 'Triggers when BMP sends an event to the callback URL. BMP must send platform, accountNo, and eventType. Only runs when payload matches the selected channel and account.',
    props: {
        info: props_1.channelInfo,
        channel: (0, props_1.adaBmpChannel)(true),
        account: (0, props_1.adaBmpAccount)(true),
    },
    type: pieces_framework_1.TriggerStrategy.APP_WEBHOOK,
    sampleData: undefined,
    onEnable: async (context) => {
        const channel = context.propsValue.channel;
        const accountId = context.propsValue.account;
        if (!channel || !accountId) {
            throw new Error('Channel and Account are required. Please select a channel and account for this trigger.');
        }
        const platformCode = props_1.CHANNEL_TO_PLATFORM[channel];
        if (!platformCode) {
            throw new Error(`Unknown channel: ${channel}. Please select a valid channel.`);
        }
        const accountsUrl = config_1.API_ENDPOINTS.getAccounts(platformCode, undefined, context.auth);
        const response = await pieces_common_1.httpClient.sendRequest({
            method: pieces_common_1.HttpMethod.GET,
            url: accountsUrl,
            authentication: {
                type: pieces_common_1.AuthenticationType.BEARER_TOKEN,
                token: (0, config_1.extractApiToken)(context.auth),
            },
        });
        const body = response.body;
        const selectedAccount = body.data?.find((a) => a.id === accountId);
        if (!selectedAccount) {
            throw new Error(`Account not found for selected channel. Please reselect channel and account.`);
        }
        const identifierValue = `${platformCode}:${selectedAccount.accountNo}`;
        (0, config_1.debugLog)('New message callback: registering listener', { identifierValue, eventType: 'Message' });
        context.app.createListeners({
            events: ['Message'],
            identifierValue,
        });
    },
    onDisable: async () => {
        // Listeners are removed by the platform when the trigger is disabled
    },
    run: async (context) => {
        const body = context.payload.body;
        const platform = body?.platform != null ? String(body.platform).trim() : '';
        const accountNo = body?.accountNo != null ? String(body.accountNo).trim() : '';
        const eventType = body?.eventType != null ? String(body.eventType).trim() : '';
        if (!platform || !accountNo || !eventType) {
            return [];
        }
        return [body];
    },
});
//# sourceMappingURL=new-message-callback.js.map