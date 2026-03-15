import { createAction, Property, type Action } from '@activepieces/pieces-framework';
import { httpClient, HttpMethod, AuthenticationType } from '@activepieces/pieces-common';
import { adaBmpAuth } from '../common/auth';
import { 
  adaBmpChannel, 
  adaBmpAccount, 
  recipientInputType, 
  messageText, 
  channelInfo, 
  CHANNEL_TO_PLATFORM 
} from '../common/props';
import { API_ENDPOINTS, debugLog, fetchMetadata, AdaBmpMetadata, extractApiToken } from '../common/config';

export const sendMessageAction: Action = createAction({
  auth: adaBmpAuth,
  name: 'send_message',
  displayName: 'Send Message',
  description: 'Send a message through ADA BMP to WhatsApp, Facebook, Line, or Instagram',
  props: {
    info: channelInfo,
    channel: adaBmpChannel(true),
    account: adaBmpAccount(true),
    recipientType: recipientInputType,
    recipientSelection: Property.DynamicProperties({
      displayName: '',
      description: '',
      required: true,
      refreshers: ['recipientType', 'channel', 'account'],
      auth: adaBmpAuth,
      props: async ({ auth, recipientType, channel, account, server, project }) => {
        const props: Record<string, any> = {};
        
        if (recipientType === 'select') {
          // Fetch recipients and create dropdown
          let recipientOptions: Array<{ label: string; value: string }> = [];
          let isDisabled = false;

          if (!auth) {
            recipientOptions = [{ label: 'Connect your ADA BMP account', value: '' }];
            isDisabled = true;
          } else if (!channel || !account) {
            recipientOptions = [{ label: 'Select channel and account first', value: '' }];
            isDisabled = true;
          } else {
            try {
              // Fetch metadata from organization/environment
              const contextServer = (server as any);
        const contextProject = (project as any);
        const metadata = await fetchMetadata(contextProject?.id, contextServer, httpClient, auth);
              
              const platformCode = CHANNEL_TO_PLATFORM[channel as string];
              
              if (!platformCode) {
                recipientOptions = [{ label: 'Invalid channel selected', value: '' }];
                isDisabled = true;
              } else {
                const accountsUrl = API_ENDPOINTS.getAccounts(platformCode, metadata, auth);
                const accountsResponse = await httpClient.sendRequest({
                  method: HttpMethod.GET,
                  url: accountsUrl,
                  authentication: {
                    type: AuthenticationType.BEARER_TOKEN,
                    token: extractApiToken(auth),
                  },
                });

                const accountsBody = accountsResponse.body as {
                  data: Array<{ id: string; accountNo: string; platform: string }>;
                };

                const selectedAccount = accountsBody.data.find((acc) => acc.id === account);
                if (!selectedAccount) {
                  recipientOptions = [{ label: 'Account not found', value: '' }];
                  isDisabled = true;
                } else {
                  // Fetch recipients
                  const apiUrl = API_ENDPOINTS.getRecipients(selectedAccount.accountNo, platformCode, metadata, auth);
                  const response = await httpClient.sendRequest({
                    method: HttpMethod.GET,
                    url: apiUrl,
                    authentication: {
                      type: AuthenticationType.BEARER_TOKEN,
                      token: extractApiToken(auth),
                    },
                  });

                  const body = response.body as {
                    data: Array<{ customerName: string; customerNo: string }>;
                  };

                  if (!body.data || body.data.length === 0) {
                    recipientOptions = [{ label: 'No active conversations found', value: '' }];
                    isDisabled = false;
                  } else {
                    // Get unique recipients
                    const uniqueRecipientsMap = new Map<string, { customerName: string; customerNo: string }>();
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
            } catch (error) {
              recipientOptions = [{ label: 'Failed to load recipients', value: '' }];
              isDisabled = true;
            }
          }

          props.recipientFromList = Property.StaticDropdown({
            displayName: 'Select Recipient',
            description: 'Select a recipient from active conversations',
            required: true,
            options: {
              disabled: isDisabled,
              options: recipientOptions,
            },
          });
        } else {
          // Show only manual input (for 'manual' type)
          props.recipientManual = Property.ShortText({
            displayName: 'Recipient ID',
            description: 'Enter the recipient ID manually (e.g., phone number for WhatsApp, user ID for LINE). You can also use variables like {{previousStep.phoneNumber}}',
            required: true,
          });
        }
        
        return props;
      },
    }),
    message: messageText,
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
    const { channel, account, recipientType, recipientSelection, message } = context.propsValue;

    // Get the recipient ID from the dynamic property
    const recipientId = recipientType === 'select' 
      ? (recipientSelection as any)?.recipientFromList 
      : (recipientSelection as any)?.recipientManual;

    if (!recipientId) {
      return {
        success: false,
        error: 'Recipient ID is required. Please select from list or enter manually.',
      };
    }

    try {
      // Map channel name to platform code
      const platformCode = CHANNEL_TO_PLATFORM[channel as string];
      
      if (!platformCode) {
        throw new Error(`Invalid channel: ${channel}`);
      }

      // Fetch account details to get the account number (from field)
      debugLog('Fetching account details', { accountId: account }, metadata);
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

      const apiUrl = API_ENDPOINTS.sendMessage(metadata, context.auth);
      debugLog('Sending message', { 
        url: apiUrl,
        channel,
        platform: platformCode,
        from: selectedAccount.accountNo,
        to: recipientId,
      }, metadata);
      
      const response = await httpClient.sendRequest({
        method: HttpMethod.POST,
        url: apiUrl,
        authentication: {
          type: AuthenticationType.BEARER_TOKEN,
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

      debugLog('Message sent successfully', { status: response.status });
      
      return {
        success: true,
        data: response.body,
      };
    } catch (error: any) {
      debugLog('Failed to send message', error);
      return {
        success: false,
        error: error.message || 'Failed to send message',
      };
    }
  },
});
