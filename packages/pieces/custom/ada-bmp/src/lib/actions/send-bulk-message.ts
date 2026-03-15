import { createAction, Property, type Action } from '@activepieces/pieces-framework';
import { httpClient, HttpMethod, AuthenticationType } from '@activepieces/pieces-common';
import { adaBmpAuth } from '../common/auth';
import { 
  adaBmpChannelForBulk, 
  adaBmpAccount, 
  messageType,
  adaBmpContactCategory,
  adaBmpTemplate,
  adaBmpTemplateCategory,
  channelInfo, 
  CHANNEL_TO_PLATFORM 
} from '../common/props';
import { API_ENDPOINTS, debugLog, fetchMetadata, extractApiToken } from '../common/config';

export const sendBulkMessageAction: Action = createAction({
  auth: adaBmpAuth,
  name: 'send_bulk_message',
  displayName: 'Send Bulk Message',
  description: 'Send bulk messages through ADA BMP to WhatsApp, Facebook, Line, or Instagram using contact categories',
  props: {
    info: channelInfo,
    channel: adaBmpChannelForBulk(true),
    contactCategory: adaBmpContactCategory(true),
    messageType: messageType,
    account: adaBmpAccount(true),
    templateCategory: adaBmpTemplateCategory,
    template: adaBmpTemplate(false),
    message: Property.LongText({
      displayName: 'Message / OTP',
      description: 'Message content. For AUTHENTICATION templates, enter the OTP value here.',
      required: true,
    }),
  },
  async run(context) {
    // Fetch organization/environment metadata
    const metadata = await fetchMetadata(
      context.project.id,
      context.server as any,
      httpClient,
      context.auth
    );

    // Extract the actual token from the auth object
    const token = extractApiToken(context.auth);
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
      const platformCode = CHANNEL_TO_PLATFORM[channel as string];
      
      if (!platformCode) {
        throw new Error(`Invalid channel: ${channel}`);
      }

      // Fetch account details to get the account number (from field)
      debugLog('Fetching account details', { accountId: account });
      const accountsUrl = API_ENDPOINTS.getAccounts(platformCode, metadata, context.auth);
      const accountsResponse = await httpClient.sendRequest({
        method: HttpMethod.GET,
        url: accountsUrl,
        authentication: {
          type: AuthenticationType.BEARER_TOKEN,
          token,
        },
      });

      const accountsBody = accountsResponse.body as {
        status: number;
        message: string;
        data: Array<{
          id: string;
          accountNo: string;
          platform: string;
        }>;
      };

      // Find the selected account
      const selectedAccount = accountsBody.data.find((acc) => acc.id === account);
      
      if (!selectedAccount) {
        throw new Error('Selected account not found');
      }

      const apiUrl = API_ENDPOINTS.sendBulkMessage(metadata, context.auth);
      debugLog('Sending bulk message', { 
        url: apiUrl,
        channel,
        platform: platformCode,
        from: selectedAccount.accountNo,
        contactCategory,
        messageType: msgType,
      });
      
      // Parse template data if provided
      let templateData: { id: string; name: string; category: string; type?: string; isCallPermissionRequest?: boolean } | null = null;
      if (template) {
        try {
          const parsed = JSON.parse(template as string);
          templateData = parsed;
        } catch (error) {
          debugLog('Failed to parse template data', error);
        }
      }

      // Build request body based on message type and template category
      let requestBody: Record<string, any>;

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

        debugLog('Using MARKETING/UTILITY template format with call permission', { 
          templateName: templateData.name,
          category: templateData.category,
        }, metadata);
      } else if (templateData && templateData.category === 'AUTHENTICATION') {
        // Use AUTHENTICATION template format with OTP value
        const otpValue = message || '';

        requestBody = {
          from: selectedAccount.accountNo,
          to: [contactCategory], // API expects array, but we only have one value
          type: 'template',
          buttons: [null,null],
          templateData: [otpValue],
          templateLang: 'en',
          templateName: templateData.name,
          templateButton: [[otpValue],[]],
          headerType: 'TEXT',
          platform: platformCode,
          channel: 'CONTACT',
          payload: ["",""],
          tag2: 'Send bulk to contact category',
        };

        debugLog('Using AUTHENTICATION template format', { 
          templateName: templateData.name,
          otpValue: otpValue ? '[REDACTED]' : '[EMPTY]',
        });
      } else {
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
        } else if (msgType === 'media') {
          requestBody.text = message;
          // Media URL should be added separately if needed
        } else {
          // For button, list, template, catalog - message text is typically still used
          requestBody.text = message;
        }
      }

      const response = await httpClient.sendRequest({
        method: HttpMethod.POST,
        url: apiUrl,
        authentication: {
          type: AuthenticationType.BEARER_TOKEN,
          token,
        },
        body: requestBody,
      });

      debugLog('Bulk message sent successfully', { status: response.status });
      
      return {
        success: true,
        data: response.body,
      };
    } catch (error: any) {
      debugLog('Failed to send bulk message', error);
      return {
        success: false,
        error: error.message || 'Failed to send bulk message',
      };
    }
  },
});
