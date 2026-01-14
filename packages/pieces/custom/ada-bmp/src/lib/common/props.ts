import { Property } from '@activepieces/pieces-framework';
import { httpClient, HttpMethod, AuthenticationType } from '@activepieces/pieces-common';
import { adaBmpAuth } from '../../index';
import { API_ENDPOINTS, debugLog } from './config';

/**
 * Mapping from channel names to platform codes
 */
export const CHANNEL_TO_PLATFORM: Record<string, string> = {
  'Whatsapp': 'WA',
  'Facebook': 'FB',
  'Instagram': 'IG',
  'Line': 'LINE',
};

export const channelInfo = Property.MarkDown({
  value: `
**Channel Selection**

Select a channel to send messages. Available channels: WhatsApp, Facebook, Line, and Instagram.
`,
});

export const adaBmpChannel = <R extends boolean>(required: R) =>
  Property.Dropdown<string, R, typeof adaBmpAuth>({
    auth: adaBmpAuth,
    displayName: 'Channel',
    description: 'Select the messaging channel (WhatsApp, Facebook, Line, Instagram)',
    required,
    refreshers: [],
    async options({ auth }) {
      if (!auth) {
        return {
          disabled: true,
          placeholder: 'Connect your ADA BMP account',
          options: [],
        };
      }

      try {
        const apiUrl = API_ENDPOINTS.getChannels();
        debugLog('Fetching channels from /user/mymenu', { url: apiUrl });
        
        // Fetch menu from the API using auth.secret_text
        const response = await httpClient.sendRequest({
          method: HttpMethod.GET,
          url: apiUrl,
          authentication: {
            type: AuthenticationType.BEARER_TOKEN,
            token: (auth as any).secret_text,
          },
        });

        debugLog('Menu response received', { status: response.status });

        // Parse the response to extract channels
        // Response structure: { status, errorCode, message, data: [ { name, subMenu: [...] } ] }
        const body = response.body as {
          status: number;
          errorCode: number;
          message: string;
          data: Array<{
            id: string;
            name: string;
            subMenu: Array<{
              id: string;
              name: string;
              subMenu: any[];
            }>;
          }>;
        };

        // Find the "Channel" menu item
        const channelMenu = body.data.find((item) => item.name === 'Channel');
        
        if (!channelMenu || !channelMenu.subMenu) {
          debugLog('Channel menu not found in response');
          return {
            disabled: true,
            placeholder: 'No channels found',
            options: [],
          };
        }

        // Extract channels from the subMenu
        const channels = channelMenu.subMenu.map((channel) => ({
          id: channel.id,
          name: channel.name,
        }));

        debugLog('Channels extracted successfully', { count: channels.length, channels });
        
        return {
          disabled: false,
          placeholder: 'Select channel',
          options: channels.map((channel) => ({
            label: channel.name,
            value: channel.name, // Use name as value so we can map to platform code
          })),
        };
      } catch (error) {
        debugLog('Failed to fetch channels', error);
        return {
          disabled: true,
          placeholder: 'Failed to load channels',
          options: [],
        };
      }
    },
  });

export const adaBmpAccount = <R extends boolean>(required: R) =>
  Property.Dropdown<string, R, typeof adaBmpAuth>({
    auth: adaBmpAuth,
    displayName: 'Account',
    description: 'Select the account to use for this channel',
    required,
    refreshers: ['channel'], // Refresh when channel changes
    async options({ auth, channel }) {
      if (!auth) {
        return {
          disabled: true,
          placeholder: 'Connect your ADA BMP account',
          options: [],
        };
      }

      if (!channel) {
        return {
          disabled: true,
          placeholder: 'Select a channel first',
          options: [],
        };
      }

      try {
        // Map channel name to platform code
        const platformCode = CHANNEL_TO_PLATFORM[channel as string];
        
        if (!platformCode) {
          debugLog('Unknown channel', { channel });
          return {
            disabled: true,
            placeholder: 'Invalid channel selected',
            options: [],
          };
        }

        const apiUrl = API_ENDPOINTS.getAccounts(platformCode);
        debugLog('Fetching accounts', { url: apiUrl, platform: platformCode });
        
        // Fetch accounts from the API
        const response = await httpClient.sendRequest({
          method: HttpMethod.GET,
          url: apiUrl,
          authentication: {
            type: AuthenticationType.BEARER_TOKEN,
            token: (auth as any).secret_text,
          },
        });

        debugLog('Accounts response received', { status: response.status });

        // Parse the response
        // Response structure: { status, message, data: [ { id, name, accountNo, ... } ], pageNo, pageSize, pageTotal, totalRecord }
        const body = response.body as {
          status: number;
          message: string;
          data: Array<{
            id: string;
            platform: string;
            clientId: string;
            clientName: string;
            name: string;
            accountNo: string;
            status: string;
            coreAppStatus: string;
            profileImage?: string;
            about?: string;
          }>;
          pageNo: number;
          pageSize: number;
          pageTotal: number;
          totalRecord: number;
        };

        if (!body.data || body.data.length === 0) {
          debugLog('No accounts found', { platform: platformCode });
          return {
            disabled: true,
            placeholder: 'No accounts available for this channel',
            options: [],
          };
        }

        const accounts = body.data;
        debugLog('Accounts fetched successfully', { count: accounts.length });
        
        return {
          disabled: false,
          placeholder: 'Select account',
          options: accounts.map((account) => ({
            label: `${account.name} (${account.accountNo})`,
            value: account.id,
          })),
        };
      } catch (error) {
        debugLog('Failed to fetch accounts', error);
        return {
          disabled: true,
          placeholder: 'Failed to load accounts',
          options: [],
        };
      }
    },
  });

export const recipientInputType = Property.StaticDropdown({
  displayName: 'Recipient Input Type',
  description: 'Choose how to specify the recipient',
  required: true,
  defaultValue: 'select',
  options: {
    options: [
      {
        label: 'Select from Active Conversations',
        value: 'select',
      },
      {
        label: 'Enter Manually',
        value: 'manual',
      },
    ],
  },
});

export const recipientFromList = <R extends boolean>(required: R) =>
  Property.Dropdown<string, R, typeof adaBmpAuth>({
    auth: adaBmpAuth,
    displayName: 'Select Recipient',
    description: 'Select a recipient from active conversations',
    required,
    refreshers: ['channel', 'account'], // Refresh when channel or account changes
    async options({ auth, channel, account }) {
      if (!auth) {
        return {
          disabled: true,
          placeholder: 'Connect your ADA BMP account',
          options: [],
        };
      }

      if (!channel || !account) {
        return {
          disabled: true,
          placeholder: 'Select channel and account first',
          options: [],
        };
      }

      try {
        // Map channel name to platform code
        const platformCode = CHANNEL_TO_PLATFORM[channel as string];
        
        if (!platformCode) {
          debugLog('Unknown channel', { channel });
          return {
            disabled: true,
            placeholder: 'Invalid channel selected',
            options: [],
          };
        }

        // First, fetch the account details to get accountNo
        const accountsUrl = API_ENDPOINTS.getAccounts(platformCode);
        const accountsResponse = await httpClient.sendRequest({
          method: HttpMethod.GET,
          url: accountsUrl,
          authentication: {
            type: AuthenticationType.BEARER_TOKEN,
            token: (auth as any).secret_text,
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
          debugLog('Selected account not found', { accountId: account });
          return {
            disabled: true,
            placeholder: 'Account not found',
            options: [],
          };
        }

        // Now fetch recipients using the accountNo
        const apiUrl = API_ENDPOINTS.getRecipients(selectedAccount.accountNo, platformCode);
        debugLog('Fetching recipients', { url: apiUrl, accountNo: selectedAccount.accountNo, platform: platformCode });
        
        const response = await httpClient.sendRequest({
          method: HttpMethod.GET,
          url: apiUrl,
          authentication: {
            type: AuthenticationType.BEARER_TOKEN,
            token: (auth as any).secret_text,
          },
        });

        debugLog('Recipients response received', { status: response.status });

        // Parse the response structure
        const body = response.body as {
          status: number;
          errorCode: number;
          message: string;
          latestId: string;
          data: Array<{
            id: string;
            platform: string;
            accountNo: string;
            direction: string;
            customerName: string;
            customerNo: string;
            msgType: string;
            msgTime: string;
            content: string;
            currentStatus: string;
            [key: string]: any;
          }>;
        };

        if (!body.data || body.data.length === 0) {
          debugLog('No recipients found', { platform: platformCode });
          return {
            disabled: false,
            placeholder: 'No active conversations found',
            options: [],
          };
        }

        // Get unique recipients (since there may be multiple messages from same customer)
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
        debugLog('Recipients fetched successfully', { count: recipients.length });
        
        return {
          disabled: false,
          placeholder: 'Select recipient',
          options: recipients.map((recipient) => {
            // Create a meaningful label with customer name and ID
            const label = recipient.customerName 
              ? `${recipient.customerName} (${recipient.customerNo})`
              : recipient.customerNo;
            
            return {
              label: label,
              value: recipient.customerNo,
            };
          }),
        };
      } catch (error) {
        debugLog('Failed to fetch recipients', error);
        return {
          disabled: true,
          placeholder: 'Failed to load recipients',
          options: [],
        };
      }
    },
  });

export const recipientManual = <R extends boolean>(required: R) =>
  Property.ShortText({
    displayName: 'Recipient ID (Manual)',
    description: 'Enter the recipient ID manually (e.g., phone number for WhatsApp, user ID for LINE). You can also use variables like {{previousStep.phoneNumber}}',
    required,
  });

export const messageText = Property.LongText({
  displayName: 'Message',
  description: 'The message text to send. You can use variables from previous steps like {{previousStep.fieldName}}',
  required: true,
});
