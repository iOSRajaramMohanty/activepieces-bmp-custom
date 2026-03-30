import { createAction, Property, StoreScope } from '@activepieces/pieces-framework';
import { adaBmpAuth } from '../common/auth';

const STORE_KEY_PREFIX = 'bmp-conv:';

function filterByDays(
  messages: ConversationMessage[],
  days: number,
): ConversationMessage[] {
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
  return messages.filter((msg) => new Date(msg.timestamp).getTime() >= cutoff);
}

export const getConversationAction = createAction({
  auth: adaBmpAuth,
  name: 'get_conversation',
  displayName: 'Get Conversation',
  description:
    'Retrieve the stored conversation history and summary for a customer mobile number.',
  props: {
    mobileNumber: Property.ShortText({
      displayName: 'Mobile Number',
      description:
        'The customer mobile number used as the conversation identifier (e.g. +91XXXXXXXXXX)',
      required: true,
    }),
    includeMessages: Property.Checkbox({
      displayName: 'Include Messages',
      description:
        'Whether to return the full message history. If unchecked, only the summary is returned.',
      required: false,
      defaultValue: true,
    }),
    lastNDays: Property.Number({
      displayName: 'Last N Days',
      description:
        'Optional. Return only messages from the last N days. Leave empty to return all stored messages.',
      required: false,
    }),
  },
  async run(context) {
    const { mobileNumber, includeMessages, lastNDays } = context.propsValue;
    const storeKey = `${STORE_KEY_PREFIX}${mobileNumber.trim()}`;

    const data = await context.store.get<ConversationData>(
      storeKey,
      StoreScope.PROJECT,
    );

    if (!data) {
      return {
        found: false,
        mobileNumber: mobileNumber.trim(),
        messages: [],
        summary: '',
        messageCount: 0,
        lastUpdated: null,
      };
    }

    let messages = data.messages ?? [];

    if (lastNDays != null && lastNDays > 0) {
      messages = filterByDays(messages, lastNDays);
    }

    return {
      found: true,
      mobileNumber: data.mobileNumber,
      messages: includeMessages !== false ? messages : [],
      summary: data.summary,
      messageCount: messages.length,
      lastUpdated: data.lastUpdated,
    };
  },
});

type ConversationMessage = {
  role: 'user' | 'agent' | 'system';
  content: string;
  timestamp: string;
};

type ConversationData = {
  mobileNumber: string;
  messages: ConversationMessage[];
  summary: string;
  lastUpdated: string;
  messageCount: number;
  retentionDays: number;
};
