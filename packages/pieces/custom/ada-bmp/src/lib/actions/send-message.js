"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendMessageAction = void 0;
const pieces_framework_1 = require("@activepieces/pieces-framework");
const pieces_common_1 = require("@activepieces/pieces-common");
const index_1 = require("../../index");
const props_1 = require("../common/props");
const config_1 = require("../common/config");
exports.sendMessageAction = (0, pieces_framework_1.createAction)({
    auth: index_1.adaBmpAuth,
    name: 'send_message',
    displayName: 'Send Message',
    description: 'Send a message through ADA BMP to WhatsApp, Facebook, Line, or Instagram',
    props: {
        info: props_1.channelInfo,
        channel: (0, props_1.adaBmpChannel)(true),
        account: (0, props_1.adaBmpAccount)(true),
        recipientType: props_1.recipientInputType,
        recipientSelection: pieces_framework_1.Property.DynamicProperties({
            displayName: '',
            description: '',
            required: true,
            refreshers: ['recipientType', 'channel', 'account'],
            auth: index_1.adaBmpAuth,
            props: async ({ auth, recipientType, channel, account, server, project }) => {
                const props = {};
                if (recipientType === 'select') {
                    // Fetch recipients and create dropdown
                    let recipientOptions = [];
                    let isDisabled = false;
                    if (!auth) {
                        recipientOptions = [{ label: 'Connect your ADA BMP account', value: '' }];
                        isDisabled = true;
                    }
                    else if (!channel || !account) {
                        recipientOptions = [{ label: 'Select channel and account first', value: '' }];
                        isDisabled = true;
                    }
                    else {
                        try {
                            // Fetch metadata from organization/environment
                            const contextServer = server;
                            const contextProject = project;
                            const metadata = await (0, config_1.fetchMetadata)(contextProject?.id, contextServer, pieces_common_1.httpClient, auth);
                            const platformCode = props_1.CHANNEL_TO_PLATFORM[channel];
                            if (!platformCode) {
                                recipientOptions = [{ label: 'Invalid channel selected', value: '' }];
                                isDisabled = true;
                            }
                            else {
                                const accountsUrl = config_1.API_ENDPOINTS.getAccounts(platformCode, metadata, auth);
                                const accountsResponse = await pieces_common_1.httpClient.sendRequest({
                                    method: pieces_common_1.HttpMethod.GET,
                                    url: accountsUrl,
                                    authentication: {
                                        type: pieces_common_1.AuthenticationType.BEARER_TOKEN,
                                        token: (0, config_1.extractApiToken)(auth),
                                    },
                                });
                                const accountsBody = accountsResponse.body;
                                const selectedAccount = accountsBody.data.find((acc) => acc.id === account);
                                if (!selectedAccount) {
                                    recipientOptions = [{ label: 'Account not found', value: '' }];
                                    isDisabled = true;
                                }
                                else {
                                    // Fetch recipients
                                    const apiUrl = config_1.API_ENDPOINTS.getRecipients(selectedAccount.accountNo, platformCode, metadata, auth);
                                    const response = await pieces_common_1.httpClient.sendRequest({
                                        method: pieces_common_1.HttpMethod.GET,
                                        url: apiUrl,
                                        authentication: {
                                            type: pieces_common_1.AuthenticationType.BEARER_TOKEN,
                                            token: (0, config_1.extractApiToken)(auth),
                                        },
                                    });
                                    const body = response.body;
                                    if (!body.data || body.data.length === 0) {
                                        recipientOptions = [{ label: 'No active conversations found', value: '' }];
                                        isDisabled = false;
                                    }
                                    else {
                                        // Get unique recipients
                                        const uniqueRecipientsMap = new Map();
                                        body.data.forEach((msg) => {
                                            if (!uniqueRecipientsMap.has(msg.customerNo)) {
                                                uniqueRecipientsMap.set(msg.customerNo, {
                                                    customerName: msg.customerName,
                                                    customerNo: msg.customerNo,
                                                });
                                            }
                                        });
                                        const recipients = Array.from(uniqueRecipientsMap.values());
                                        recipientOptions = recipients.map((recipient) => ({
                                            label: recipient.customerName
                                                ? `${recipient.customerName} (${recipient.customerNo})`
                                                : recipient.customerNo,
                                            value: recipient.customerNo,
                                        }));
                                        isDisabled = false;
                                    }
                                }
                            }
                        }
                        catch (error) {
                            recipientOptions = [{ label: 'Failed to load recipients', value: '' }];
                            isDisabled = true;
                        }
                    }
                    props.recipientFromList = pieces_framework_1.Property.StaticDropdown({
                        displayName: 'Select Recipient',
                        description: 'Select a recipient from active conversations',
                        required: true,
                        options: {
                            disabled: isDisabled,
                            options: recipientOptions,
                        },
                    });
                }
                else {
                    // Show only manual input (for 'manual' type)
                    props.recipientManual = pieces_framework_1.Property.ShortText({
                        displayName: 'Recipient ID',
                        description: 'Enter the recipient ID manually (e.g., phone number for WhatsApp, user ID for LINE). You can also use variables like {{previousStep.phoneNumber}}',
                        required: true,
                    });
                }
                return props;
            },
        }),
        message: props_1.messageText,
    },
    async run(context) {
        // Fetch organization/environment metadata
        const metadata = await (0, config_1.fetchMetadata)(context.project.id, context.server, pieces_common_1.httpClient, context.auth);
        // Extract the actual token from the auth object
        const token = (0, config_1.extractApiToken)(context.auth);
        const { channel, account, recipientType, recipientSelection, message } = context.propsValue;
        // Get the recipient ID from the dynamic property
        const recipientId = recipientType === 'select'
            ? recipientSelection?.recipientFromList
            : recipientSelection?.recipientManual;
        if (!recipientId) {
            return {
                success: false,
                error: 'Recipient ID is required. Please select from list or enter manually.',
            };
        }
        try {
            // Map channel name to platform code
            const platformCode = props_1.CHANNEL_TO_PLATFORM[channel];
            if (!platformCode) {
                throw new Error(`Invalid channel: ${channel}`);
            }
            // Fetch account details to get the account number (from field)
            (0, config_1.debugLog)('Fetching account details', { accountId: account }, metadata);
            const accountsUrl = config_1.API_ENDPOINTS.getAccounts(platformCode, metadata, context.auth);
            const accountsResponse = await pieces_common_1.httpClient.sendRequest({
                method: pieces_common_1.HttpMethod.GET,
                url: accountsUrl,
                authentication: {
                    type: pieces_common_1.AuthenticationType.BEARER_TOKEN,
                    token,
                },
            });
            const accountsBody = accountsResponse.body;
            // Find the selected account
            const selectedAccount = accountsBody.data.find((acc) => acc.id === account);
            if (!selectedAccount) {
                throw new Error('Selected account not found');
            }
            const apiUrl = config_1.API_ENDPOINTS.sendMessage(metadata, context.auth);
            (0, config_1.debugLog)('Sending message', {
                url: apiUrl,
                channel,
                platform: platformCode,
                from: selectedAccount.accountNo,
                to: recipientId,
            }, metadata);
            const response = await pieces_common_1.httpClient.sendRequest({
                method: pieces_common_1.HttpMethod.POST,
                url: apiUrl,
                authentication: {
                    type: pieces_common_1.AuthenticationType.BEARER_TOKEN,
                    token,
                },
                body: {
                    from: selectedAccount.accountNo,
                    platform: platformCode,
                    text: message,
                    to: recipientId,
                    type: 'text',
                    channel: 'LIVECHAT',
                },
            });
            (0, config_1.debugLog)('Message sent successfully', { status: response.status });
            return {
                success: true,
                data: response.body,
            };
        }
        catch (error) {
            (0, config_1.debugLog)('Failed to send message', error);
            return {
                success: false,
                error: error.message || 'Failed to send message',
            };
        }
    },
});
//# sourceMappingURL=send-message.js.map