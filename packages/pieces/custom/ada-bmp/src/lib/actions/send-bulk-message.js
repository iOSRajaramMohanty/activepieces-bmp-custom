"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendBulkMessageAction = void 0;
const pieces_framework_1 = require("@activepieces/pieces-framework");
const pieces_common_1 = require("@activepieces/pieces-common");
const index_1 = require("../../index");
const props_1 = require("../common/props");
const config_1 = require("../common/config");
exports.sendBulkMessageAction = (0, pieces_framework_1.createAction)({
    auth: index_1.adaBmpAuth,
    name: 'send_bulk_message',
    displayName: 'Send Bulk Message',
    description: 'Send bulk messages through ADA BMP to WhatsApp, Facebook, Line, or Instagram using contact categories',
    props: {
        info: props_1.channelInfo,
        channel: (0, props_1.adaBmpChannelForBulk)(true),
        contactCategory: (0, props_1.adaBmpContactCategory)(true),
        messageType: props_1.messageType,
        account: (0, props_1.adaBmpAccount)(true),
        templateCategory: props_1.adaBmpTemplateCategory,
        template: (0, props_1.adaBmpTemplate)(false),
        message: pieces_framework_1.Property.LongText({
            displayName: 'Message / OTP',
            description: 'Message content. For AUTHENTICATION templates, enter the OTP value here.',
            required: true,
        }),
    },
    async run(context) {
        // Fetch organization/environment metadata
        const metadata = await (0, config_1.fetchMetadata)(context.project.id, context.server, pieces_common_1.httpClient, context.auth);
        // Extract the actual token from the auth object
        const token = (0, config_1.extractApiToken)(context.auth);
        const { channel, account, messageType: msgType, contactCategory, templateCategory, template, message } = context.propsValue;
        // Validate contact category
        if (!contactCategory) {
            return {
                success: false,
                error: 'Contact category is required.',
            };
        }
        // Validate template category - only required when Message Type is "Send WA Template" (value: 'template')
        if (msgType === 'template' && !templateCategory) {
            return {
                success: false,
                error: 'Template Category is required when Message Type is "Send WA Template".',
            };
        }
        try {
            // Map channel name to platform code
            const platformCode = props_1.CHANNEL_TO_PLATFORM[channel];
            if (!platformCode) {
                throw new Error(`Invalid channel: ${channel}`);
            }
            // Fetch account details to get the account number (from field)
            (0, config_1.debugLog)('Fetching account details', { accountId: account });
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
            const apiUrl = config_1.API_ENDPOINTS.sendBulkMessage(metadata, context.auth);
            (0, config_1.debugLog)('Sending bulk message', {
                url: apiUrl,
                channel,
                platform: platformCode,
                from: selectedAccount.accountNo,
                contactCategory,
                messageType: msgType,
            });
            // Parse template data if provided
            let templateData = null;
            if (template) {
                try {
                    const parsed = JSON.parse(template);
                    templateData = parsed;
                }
                catch (error) {
                    (0, config_1.debugLog)('Failed to parse template data', error);
                }
            }
            // Build request body based on message type and template category
            let requestBody;
            // Check if this is a MARKETING/UTILITY template with call permission request
            const isMarketingOrUtility = templateData && (templateData.category === 'MARKETING' || templateData.category === 'UTILITY');
            const hasCallPermissionRequest = templateData?.isCallPermissionRequest === true;
            if (isMarketingOrUtility && hasCallPermissionRequest && templateData) {
                // Use MARKETING/UTILITY template format with call permission request
                requestBody = {
                    from: selectedAccount.accountNo,
                    to: [contactCategory], // API expects array, but we only have one value
                    type: 'template',
                    buttons: [],
                    templateLang: 'en',
                    templateName: templateData.name,
                    headerType: 'TEXT',
                    platform: platformCode,
                    channel: 'CONTACT',
                    payload: null,
                    tag2: 'Send bulk to contact category',
                };
                (0, config_1.debugLog)('Using MARKETING/UTILITY template format with call permission', {
                    templateName: templateData.name,
                    category: templateData.category,
                }, metadata);
            }
            else if (templateData && templateData.category === 'AUTHENTICATION') {
                // Use AUTHENTICATION template format with OTP value
                const otpValue = message || '';
                requestBody = {
                    from: selectedAccount.accountNo,
                    to: [contactCategory], // API expects array, but we only have one value
                    type: 'template',
                    buttons: [null, null],
                    templateData: [otpValue],
                    templateLang: 'en',
                    templateName: templateData.name,
                    templateButton: [[otpValue], []],
                    headerType: 'TEXT',
                    platform: platformCode,
                    channel: 'CONTACT',
                    payload: ["", ""],
                    tag2: 'Send bulk to contact category',
                };
                (0, config_1.debugLog)('Using AUTHENTICATION template format', {
                    templateName: templateData.name,
                    otpValue: otpValue ? '[REDACTED]' : '[EMPTY]',
                });
            }
            else {
                // Use standard message format
                requestBody = {
                    from: selectedAccount.accountNo,
                    to: [contactCategory], // API expects array, but we only have one value
                    type: msgType,
                    channel: 'CONTACT', // Channel type for bulk messages via contact category
                    platform: platformCode,
                    tag2: 'Send bulk to contact category',
                };
                // Add template ID if provided (non-AUTHENTICATION templates)
                if (templateData) {
                    requestBody.templateId = templateData.id;
                }
                // Add message content based on type
                if (msgType === 'text') {
                    requestBody.text = message;
                }
                else if (msgType === 'media') {
                    requestBody.text = message;
                    // Media URL should be added separately if needed
                }
                else {
                    // For button, list, template, catalog - message text is typically still used
                    requestBody.text = message;
                }
            }
            const response = await pieces_common_1.httpClient.sendRequest({
                method: pieces_common_1.HttpMethod.POST,
                url: apiUrl,
                authentication: {
                    type: pieces_common_1.AuthenticationType.BEARER_TOKEN,
                    token,
                },
                body: requestBody,
            });
            (0, config_1.debugLog)('Bulk message sent successfully', { status: response.status });
            return {
                success: true,
                data: response.body,
            };
        }
        catch (error) {
            (0, config_1.debugLog)('Failed to send bulk message', error);
            return {
                success: false,
                error: error.message || 'Failed to send bulk message',
            };
        }
    },
});
//# sourceMappingURL=send-bulk-message.js.map