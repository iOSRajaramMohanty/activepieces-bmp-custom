import { createAction, Property } from '@activepieces/pieces-framework';
import { httpClient, HttpMethod, AuthenticationType } from '@activepieces/pieces-common';
import { adaBmpAuth } from '../../index';
import { 
  adaBmpChannel, 
  adaBmpAccount, 
  messageText,
  messageType,
  adaBmpContactCategory,
  channelInfo, 
  CHANNEL_TO_PLATFORM 
} from '../common/props';
import { API_ENDPOINTS, debugLog } from '../common/config';

export const sendBulkMessageAction = createAction({
  auth: adaBmpAuth,
  name: 'send_bulk_message',
  displayName: 'Send Bulk Message',
  description: 'Send bulk messages through ADA BMP to WhatsApp, Facebook, Line, or Instagram using contact categories',
  props: {
    info: channelInfo,
    channel: adaBmpChannel(true),
    account: adaBmpAccount(true),
    messageType: messageType,
    contactCategory: adaBmpContactCategory(true),
    message: messageText,
  },
  async run(context) {
    // Extract the actual token from the auth object
    const token = (context.auth as any).secret_text;
    const { channel, account, messageType: msgType, contactCategory, message } = context.propsValue;

    if (!contactCategory) {
      return {
        success: false,
        error: 'Contact category is required.',
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
      const accountsUrl = API_ENDPOINTS.getAccounts(platformCode);
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

      const apiUrl = API_ENDPOINTS.sendBulkMessage();
      debugLog('Sending bulk message', { 
        url: apiUrl,
        channel,
        platform: platformCode,
        from: selectedAccount.accountNo,
        contactCategory,
        messageType: msgType,
      });
      
      // Build request body based on message type
      const requestBody: Record<string, any> = {
        from: selectedAccount.accountNo,
        platform: platformCode,
        contactCategoryId: contactCategory,
        type: msgType,
        channel: 'BULK',
      };

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
