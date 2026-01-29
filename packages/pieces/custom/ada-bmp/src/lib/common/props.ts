import { Property } from '@activepieces/pieces-framework';
import { httpClient, HttpMethod, AuthenticationType } from '@activepieces/pieces-common';
import { adaBmpAuth } from '../../index';
import { API_ENDPOINTS, debugLog, fetchMetadata, extractApiToken } from './config';

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
    async options({ auth, server, project }) {
      if (!auth) {
        return {
          disabled: true,
          placeholder: 'Connect your ADA BMP account',
          options: [],
        };
      }

      try {
        // Fetch metadata from organization/environment
        const contextServer = (server as any);
        const contextProject = (project as any);
        
        console.log('[ADA-BMP Props] Channel options called', { 
          hasServer: !!contextServer, 
          hasProject: !!contextProject,
          projectId: contextProject?.id,
          serverApiUrl: contextServer?.apiUrl
        });
        
        // In sandbox mode (Docker), server and project may not be available
        // Pass auth context to help fetchMetadata try to access the API
        const metadata = await fetchMetadata(
          contextProject?.id,
          contextServer,
          httpClient,
          auth
        );
        
        console.log('[ADA-BMP Props] Metadata fetched', { 
          hasMetadata: !!metadata,
          metadataApiUrl: metadata?.ADA_BMP_API_URL 
        });
        
        const apiUrl = API_ENDPOINTS.getChannels(metadata, auth);
        debugLog('Fetching channels from /account', { url: apiUrl, hasMetadata: !!metadata }, metadata);
        
        // Fetch accounts from the API using auth.secret_text
        const response = await httpClient.sendRequest({
          method: HttpMethod.GET,
          url: apiUrl,
          authentication: {
            type: AuthenticationType.BEARER_TOKEN,
            token: extractApiToken(auth),
          },
        });

        debugLog('Account response received', { status: response.status });
        console.log('[ADA-BMP Props] 📊 Channel API Response Status:', response.status);
        console.log('[ADA-BMP Props] 📊 Channel API Response Body:', JSON.stringify(response.body, null, 2));
        console.log('[ADA-BMP Props] 📊 Response has data array?:', Array.isArray(response.body?.data));
        console.log('[ADA-BMP Props] 📊 Data array length:', response.body?.data?.length || 0);

        // Parse the response to extract channels
        // Response structure: { status, message, data: [ { platform, ... } ], pageNo, pageSize, pageTotal, totalRecord }
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
            [key: string]: any;
          }>;
          pageNo: number;
          pageSize: number;
          pageTotal: number;
          totalRecord: number;
        };

        if (!body.data || body.data.length === 0) {
          debugLog('No accounts found in response');
          return {
            disabled: true,
            placeholder: 'No channels found',
            options: [],
          };
        }

        // Extract unique platforms from accounts
        const platformSet = new Set<string>();
        body.data.forEach((account) => {
          if (account.platform) {
            platformSet.add(account.platform);
          }
        });

        // Map platform codes to channel names
        const platformToChannel: Record<string, string> = {
          'WA': 'Whatsapp',
          'FB': 'Facebook',
          'IG': 'Instagram',
          'LINE': 'Line',
        };

        // Convert platforms to channels
        const channels = Array.from(platformSet)
          .map((platform) => ({
            platform,
            name: platformToChannel[platform] || platform,
          }))
          .filter((channel) => channel.name !== channel.platform); // Only include known platforms

        if (channels.length === 0) {
          debugLog('No valid channels found');
          return {
            disabled: true,
            placeholder: 'No channels found',
            options: [],
          };
        }

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

export const adaBmpChannelForBulk = <R extends boolean>(required: R) =>
  Property.Dropdown<string, R, typeof adaBmpAuth>({
    auth: adaBmpAuth,
    displayName: 'Channel',
    description: 'Select the messaging channel (WhatsApp, Facebook, Instagram)',
    required,
    refreshers: [],
    async options({ auth, server, project }) {
      if (!auth) {
        return {
          disabled: true,
          placeholder: 'Connect your ADA BMP account',
          options: [],
        };
      }

      try {
        // Fetch metadata from organization/environment
        const contextServer = (server as any);
        const contextProject = (project as any);
        const metadata = await fetchMetadata(contextProject?.id, contextServer, httpClient, auth);
        
        const apiUrl = API_ENDPOINTS.getChannels(metadata, auth);
        debugLog('Fetching channels from /account', { url: apiUrl, hasMetadata: !!metadata }, metadata);
        
        // Fetch accounts from the API using auth.secret_text
        const response = await httpClient.sendRequest({
          method: HttpMethod.GET,
          url: apiUrl,
          authentication: {
            type: AuthenticationType.BEARER_TOKEN,
            token: extractApiToken(auth),
          },
        });

        debugLog('Account response received', { status: response.status });

        // Parse the response to extract channels
        // Response structure: { status, message, data: [ { platform, ... } ], pageNo, pageSize, pageTotal, totalRecord }
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
            [key: string]: any;
          }>;
          pageNo: number;
          pageSize: number;
          pageTotal: number;
          totalRecord: number;
        };

        if (!body.data || body.data.length === 0) {
          debugLog('No accounts found in response');
          return {
            disabled: true,
            placeholder: 'No channels found',
            options: [],
          };
        }

        // Extract unique platforms from accounts
        const platformSet = new Set<string>();
        body.data.forEach((account) => {
          if (account.platform) {
            platformSet.add(account.platform);
          }
        });

        // Map platform codes to channel names
        const platformToChannel: Record<string, string> = {
          'WA': 'Whatsapp',
          'FB': 'Facebook',
          'IG': 'Instagram',
          'LINE': 'Line',
        };

        // Convert platforms to channels and exclude Line
        const channels = Array.from(platformSet)
          .map((platform) => ({
            platform,
            name: platformToChannel[platform] || platform,
          }))
          .filter((channel) => channel.name !== channel.platform) // Only include known platforms
          .filter((channel) => channel.name !== 'Line' && channel.platform !== 'LINE'); // Exclude Line channel for bulk messages

        if (channels.length === 0) {
          debugLog('No valid channels found');
          return {
            disabled: true,
            placeholder: 'No channels found',
            options: [],
          };
        }

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
    async options({ auth, channel, server, project }) {
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
        // Fetch metadata from organization/environment
        const contextServer = (server as any);
        const contextProject = (project as any);
        const metadata = await fetchMetadata(contextProject?.id, contextServer, httpClient, auth);
        
        // Map channel name to platform code
        const platformCode = CHANNEL_TO_PLATFORM[channel as string];
        
        if (!platformCode) {
          debugLog('Unknown channel', { channel }, metadata);
          return {
            disabled: true,
            placeholder: 'Invalid channel selected',
            options: [],
          };
        }

        const apiUrl = API_ENDPOINTS.getAccounts(platformCode, metadata, auth);
        debugLog('Fetching accounts', { url: apiUrl, platform: platformCode, hasMetadata: !!metadata }, metadata);
        
        // Fetch accounts from the API
        const response = await httpClient.sendRequest({
          method: HttpMethod.GET,
          url: apiUrl,
          authentication: {
            type: AuthenticationType.BEARER_TOKEN,
            token: extractApiToken(auth),
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
    async options({ auth, channel, account, server, project }) {
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
        // Fetch metadata from organization/environment
        const contextServer = (server as any);
        const contextProject = (project as any);
        const metadata = await fetchMetadata(contextProject?.id, contextServer, httpClient, auth);
        
        // Map channel name to platform code
        const platformCode = CHANNEL_TO_PLATFORM[channel as string];
        
        if (!platformCode) {
          debugLog('Unknown channel', { channel }, metadata);
          return {
            disabled: true,
            placeholder: 'Invalid channel selected',
            options: [],
          };
        }

        // First, fetch the account details to get accountNo
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
          debugLog('Selected account not found', { accountId: account }, metadata);
          return {
            disabled: true,
            placeholder: 'Account not found',
            options: [],
          };
        }

        // Now fetch recipients using the accountNo
        const apiUrl = API_ENDPOINTS.getRecipients(selectedAccount.accountNo, platformCode, metadata, auth);
        debugLog('Fetching recipients', { url: apiUrl, accountNo: selectedAccount.accountNo, platform: platformCode, hasMetadata: !!metadata }, metadata);
        
        const response = await httpClient.sendRequest({
          method: HttpMethod.GET,
          url: apiUrl,
          authentication: {
            type: AuthenticationType.BEARER_TOKEN,
            token: extractApiToken(auth),
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

export const otpText = Property.ShortText({
  displayName: 'OTP',
  description: 'Enter the OTP value for authentication template',
  required: true,
});

export const messageType = Property.StaticDropdown({
  displayName: 'Message Type',
  description: 'Select the type of WhatsApp message to send',
  required: true,
  defaultValue: 'text',
  options: {
    options: [
      {
        label: 'Send WA Text',
        value: 'text',
      },
      {
        label: 'Send WA Button',
        value: 'button',
      },
      {
        label: 'Send WA List',
        value: 'list',
      },
      {
        label: 'Send WA Media',
        value: 'media',
      },
      {
        label: 'Send WA Template',
        value: 'template',
      },
      {
        label: 'Send WA Catalog',
        value: 'catalog',
      },
    ],
  },
});

export const adaBmpContactCategory = <R extends boolean>(required: R) =>
  Property.Dropdown<string, R, typeof adaBmpAuth>({
    auth: adaBmpAuth,
    displayName: 'Contact Category',
    description: 'Select a contact category to send bulk messages to',
    required,
    refreshers: ['channel'], // Refresh when channel changes
    async options({ auth, channel, server, project }): Promise<{ disabled: boolean; placeholder: string; options: Array<{ label: string; value: string }> }> {
      // Always return a valid structure - wrap everything in try-catch
      try {
        if (!auth) {
          return {
            disabled: true,
            placeholder: 'Connect your ADA BMP account',
            options: [],
          };
        }

        if (!channel || typeof channel !== 'string') {
          return {
            disabled: true,
            placeholder: 'Select a channel first',
            options: [],
          };
        }

        // Fetch metadata from organization/environment
        const contextServer = (server as any);
        const contextProject = (project as any);
        const metadata = await fetchMetadata(contextProject?.id, contextServer, httpClient, auth);
        
        // Map channel name to platform code
        const platformCode = CHANNEL_TO_PLATFORM[channel];
        
        if (!platformCode) {
          debugLog('Unknown channel', { channel, availableChannels: Object.keys(CHANNEL_TO_PLATFORM) }, metadata);
          return {
            disabled: true,
            placeholder: `Invalid channel selected: ${channel}`,
            options: [],
          };
        }

        const apiUrl = API_ENDPOINTS.getContactCategories(platformCode, metadata, auth);
        debugLog('Fetching contact categories', { url: apiUrl, platform: platformCode, hasMetadata: !!metadata }, metadata);
        
        // Fetch contact categories from the API
        let response;
        try {
          response = await httpClient.sendRequest({
            method: HttpMethod.GET,
            url: apiUrl,
            authentication: {
              type: AuthenticationType.BEARER_TOKEN,
              token: extractApiToken(auth),
            },
          });
        } catch (requestError: any) {
          debugLog('HTTP request failed', requestError);
          throw new Error(`Failed to fetch contact categories: ${requestError?.message || 'Network error'}`);
        }

        debugLog('Contact categories response received', { status: response.status });

        // Check if response status indicates an error
        if (response.status >= 400) {
          const errorBody = response.body as any;
          const errorMsg = errorBody?.message || errorBody?.error || `HTTP ${response.status}`;
          throw new Error(`API error: ${errorMsg}`);
        }

        // Parse the response
        // Response structure: { status, message, data: [ { id, name, totalMember, contactCategoryNumber, ... } ], pageNo, pageSize, pageTotal, totalRecord }
        let body: {
          status?: number;
          message?: string;
          data?: Array<{
            id: string;
            name: string;
            platform: string;
            totalMember: number;
            contactCategoryNumber?: number;
            [key: string]: any;
          }>;
          pageNo?: number;
          pageSize?: number;
          pageTotal?: number;
          totalRecord?: number;
        };

        try {
          body = response.body as typeof body;
        } catch (parseError: any) {
          debugLog('Failed to parse response body', parseError);
          throw new Error('Invalid response format from API');
        }

        // Check if response body has error structure
        if (body.status && body.status >= 400) {
          throw new Error(body.message || 'API returned an error');
        }

        if (!body.data || body.data.length === 0) {
          debugLog('No contact categories found', { platform: platformCode });
          return {
            disabled: false,
            placeholder: 'No contact categories available',
            options: [],
          };
        }

        // Sort by contactCategoryNumber in descending order (max value first)
        const categories = body.data.sort((a, b) => {
          const aNum = a.contactCategoryNumber ?? 0;
          const bNum = b.contactCategoryNumber ?? 0;
          return bNum - aNum; // Descending order (higher number first)
        });
        
        debugLog('Contact categories fetched and sorted successfully', { count: categories.length });
        
        // Ensure all options have valid label and value
        const validCategories = Array.isArray(categories) ? categories : [];
        const options = validCategories
          .filter((category) => {
            // Strict validation: both id and name must be present and non-empty
            if (!category || typeof category !== 'object') return false;
            const id = category.id;
            const name = category.name;
            return id != null && 
                   String(id).trim() !== '' &&
                   name != null && 
                   String(name).trim() !== '';
          })
          .map((category) => {
            try {
              const name = String(category.name || '').trim();
              const totalMember = Number(category.totalMember) || 0;
              const label = `${name} - ${totalMember} Contact${totalMember !== 1 ? 's' : ''}`;
              const value = String(category.id || '').trim();
              
              // Only return if both label and value are valid
              if (label && value) {
                return {
                  label: label,
                  value: value,
                };
              }
              return null;
            } catch (err) {
              debugLog('Error mapping category', { category, error: err });
              return null;
            }
          })
          .filter((option): option is { label: string; value: string } => {
            // Type guard to filter out null values
            return option !== null && 
                   typeof option === 'object' &&
                   typeof option.label === 'string' &&
                   typeof option.value === 'string' &&
                   option.label.length > 0 &&
                   option.value.length > 0;
          });

        return {
          disabled: false,
          placeholder: 'Select a contact category',
          options: Array.isArray(options) ? options : [], // Ensure it's always an array
        };
      } catch (error: any) {
        debugLog('Failed to fetch contact categories', error);
        const errorMessage = error?.message || error?.toString() || 'Unknown error occurred';
        console.error('Contact categories fetch error:', error);
        // Always return a valid structure with proper types
        const safeErrorMessage = typeof errorMessage === 'string' 
          ? errorMessage.substring(0, 100) 
          : 'Unknown error occurred';
        return {
          disabled: true,
          placeholder: `Error: ${safeErrorMessage}. Please check your connection and try again.`,
          options: [] as Array<{ label: string; value: string }>, // Explicitly type the empty array
        };
      }
    },
  });

// Template category filter property
// Note: required is set to false because it's only required when messageType === 'template'
// We handle this validation in the action's run method
// defaultValue is set to 'AUTHENTICATION' to ensure it's pre-selected by default
export const adaBmpTemplateCategory = Property.Dropdown<string, false, undefined>({
  auth: undefined,
  displayName: 'Template Category',
  description: 'Filter templates by category (defaults to AUTHENTICATION)',
  required: false, // Only required when Message Type is "Send WA Template" - validated in action
  defaultValue: 'AUTHENTICATION', // Default value should be pre-selected when enabled
  refreshers: ['messageType'], // Refresh when messageType changes
  options: async ({ messageType }) => {
    // Disable Template Category when Message Type is not "Send WA Template" (value: 'template')
    const isTemplateType = messageType === 'template';
    
    return {
      disabled: !isTemplateType,
      placeholder: isTemplateType 
        ? 'Select category (default: AUTHENTICATION)' 
        : 'Template Category is only available for "Send WA Template" message type',
      options: [
        { label: 'AUTHENTICATION', value: 'AUTHENTICATION' },
        { label: 'MARKETING', value: 'MARKETING' },
        { label: 'UTILITY', value: 'UTILITY' },
      ],
    };
  },
});

export const adaBmpTemplate = <R extends boolean>(required: R) =>
  Property.Dropdown<string, R, typeof adaBmpAuth>({
    auth: adaBmpAuth,
    displayName: 'Template',
    description: 'Select a template to use for the message (optional)',
    required,
    refreshers: ['account', 'messageType', 'templateCategory'], // Refresh when account, messageType, or templateCategory changes
    async options({ auth, account, messageType, templateCategory, server, project }) {
      // Always log the templateCategory value received
      console.log('[ADA-BMP Template Options] Options function called', {
        hasAuth: !!auth,
        account,
        messageType,
        templateCategory,
        templateCategoryType: typeof templateCategory,
      });
      
      if (!auth) {
        return {
          disabled: true,
          placeholder: 'Connect your ADA BMP account',
          options: [],
        };
      }

      // Only show template dropdown when Message Type is "Send WA Template" (value: 'template')
      if (messageType !== 'template') {
        return {
          disabled: true,
          placeholder: 'Template is only available for "Send WA Template" message type',
          options: [],
        };
      }

      if (!account) {
        return {
          disabled: true,
          placeholder: 'Select an account first',
          options: [],
        };
      }

      try {
        // Fetch metadata from organization/environment
        const contextServer = (server as any);
        const contextProject = (project as any);
        const metadata = await fetchMetadata(contextProject?.id, contextServer, httpClient, auth);
        
        const apiUrl = API_ENDPOINTS.getTemplates(account as string, metadata, auth);
        debugLog('Fetching templates', { url: apiUrl, accountId: account, hasMetadata: !!metadata }, metadata);
        
        // Fetch templates from the API
        const response = await httpClient.sendRequest({
          method: HttpMethod.GET,
          url: apiUrl,
          authentication: {
            type: AuthenticationType.BEARER_TOKEN,
            token: extractApiToken(auth),
          },
        });

        debugLog('Templates response received', { status: response.status });

        // Parse the response
        // Response structure: { status, message, data: [ { id, name, status, createdDate, ... } ], pageNo, pageSize, pageTotal, totalRecord }
        const body = response.body as {
          status: number;
          message: string;
          data: Array<{
            id: string;
            name: string;
            status: string;
            category: string;
            type?: string;
            content?: string;
            createdDate?: string | number | Date;
            isCallPermissionRequest?: boolean;
            [key: string]: any;
          }>;
          pageNo: number;
          pageSize: number;
          pageTotal: number;
          totalRecord: number;
        };

        if (!body.data || body.data.length === 0) {
          debugLog('No templates found', { accountId: account });
          return {
            disabled: false,
            placeholder: 'No templates available for this account',
            options: [],
          };
        }

        // Get the selected category filter, default to AUTHENTICATION
        // If templateCategory is not provided (first load), use AUTHENTICATION as default
        const selectedCategory = templateCategory && typeof templateCategory === 'string' 
          ? templateCategory 
          : 'AUTHENTICATION';
        
        // Always log for debugging (not just when ADA_BMP_DEBUG=true)
        console.log('[ADA-BMP Template Filter] Filtering by category', { 
          selectedCategory, 
          templateCategory,
          templateCategoryType: typeof templateCategory,
          totalTemplates: body.data.length,
          categoriesInResponse: [...new Set(body.data.map(t => t.category))],
        });
        
        // Filter only APPROVED templates by selected category, then sort by createdDate (newest first)
        // Normalize category comparison (trim and uppercase for consistency)
        const normalizedSelectedCategory = (selectedCategory || '').trim().toUpperCase();
        const templates = body.data
          .filter((template) => {
            const isApproved = template.status === 'APPROVED';
            const templateCategoryValue = (template.category || '').trim().toUpperCase();
            const matchesCategory = templateCategoryValue === normalizedSelectedCategory;
            
            // For MARKETING and UTILITY categories, only show templates where isCallPermissionRequest === true
            // For AUTHENTICATION category, show all templates (no isCallPermissionRequest filter)
            let matchesCallPermissionRequirement = true;
            if (normalizedSelectedCategory === 'MARKETING' || normalizedSelectedCategory === 'UTILITY') {
              matchesCallPermissionRequirement = template.isCallPermissionRequest === true;
            }
            
            const shouldInclude = isApproved && matchesCategory && matchesCallPermissionRequirement;
            
            // Always log filtering decisions for debugging
            if (!shouldInclude && isApproved && matchesCategory) {
              console.log('[ADA-BMP Template Filter] Template filtered out', {
                name: template.name,
                templateCategory: template.category,
                normalizedTemplateCategory: templateCategoryValue,
                selectedCategory: selectedCategory,
                normalizedSelectedCategory: normalizedSelectedCategory,
                isCallPermissionRequest: template.isCallPermissionRequest,
                matchesCategory,
                matchesCallPermissionRequirement,
                reason: !matchesCategory ? 'category mismatch' : !matchesCallPermissionRequirement ? 'isCallPermissionRequest is not true' : 'not approved',
              });
            }
            
            if (shouldInclude) {
              console.log('[ADA-BMP Template Filter] Template included', {
                name: template.name,
                category: template.category,
                isCallPermissionRequest: template.isCallPermissionRequest,
              });
            }
            
            return shouldInclude;
          })
          .sort((a, b) => {
            // Sort by createdDate (newest first)
            // Handle different date formats: string, timestamp, or Date object
            const getDateValue = (template: typeof a): number => {
              if (!template.createdDate) {
                return 0; // Put templates without date at the end
              }
              
              if (typeof template.createdDate === 'number') {
                return template.createdDate;
              }
              
              if (template.createdDate instanceof Date) {
                return template.createdDate.getTime();
              }
              
              if (typeof template.createdDate === 'string') {
                const date = new Date(template.createdDate);
                return isNaN(date.getTime()) ? 0 : date.getTime();
              }
              
              return 0;
            };
            
            const dateA = getDateValue(a);
            const dateB = getDateValue(b);
            
            // Sort descending (newest first)
            return dateB - dateA;
          });
        
        // Always log results for debugging
        console.log('[ADA-BMP Template Filter] Filtering complete', { 
          count: templates.length, 
          category: selectedCategory,
          filteredFrom: body.data.length,
          sortedBy: 'createdDate (newest first)',
          templateNames: templates.map(t => t.name),
        });
        
        debugLog('Templates fetched successfully', { 
          count: templates.length, 
          category: selectedCategory,
          filteredFrom: body.data.length,
          sortedBy: 'createdDate (newest first)'
        });
        
        return {
          disabled: false,
          placeholder: `Select template (optional) - ${selectedCategory} templates`,
          options: templates.map((template) => {
            return {
              label: template.name, // Display only the template name from API
              value: JSON.stringify({ 
                id: template.id, 
                name: template.name, 
                category: template.category,
                type: template.type,
                isCallPermissionRequest: template.isCallPermissionRequest || false
              }),
            };
          }),
        };
      } catch (error) {
        debugLog('Failed to fetch templates', error);
        return {
          disabled: true,
          placeholder: 'Failed to load templates',
          options: [],
        };
      }
    },
  });
