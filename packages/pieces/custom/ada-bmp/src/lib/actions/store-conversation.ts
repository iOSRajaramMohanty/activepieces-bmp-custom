import { createAction, Property, StoreScope } from '@activepieces/pieces-framework';
import { adaBmpAuth } from '../common/auth';

const STORE_KEY_PREFIX = 'bmp-conv:';
const DEFAULT_RETENTION_DAYS = 30;

function filterByRetention(
  messages: ConversationMessage[],
  retentionDays: number,
): ConversationMessage[] {
  const cutoff = Date.now() - retentionDays * 24 * 60 * 60 * 1000;
  return messages.filter((msg) => new Date(msg.timestamp).getTime() >= cutoff);
}

export const storeConversationAction = createAction({
  auth: adaBmpAuth,
  name: 'store_conversation',
  displayName: 'Store Conversation',
  description:
    'Store a conversation message for a customer mobile number. Messages older than the retention period are automatically purged.',
  props: {
    mobileNumber: Property.ShortText({
      displayName: 'Mobile Number',
      description:
        'The customer mobile number used as the conversation identifier (e.g. +91XXXXXXXXXX)',
      required: true,
    }),
    role: Property.StaticDropdown({
      displayName: 'Role',
      description: 'Who sent this message',
      required: true,
      options: {
        disabled: false,
        options: [
          { label: 'User', value: 'user' },
          { label: 'Agent', value: 'agent' },
          { label: 'System', value: 'system' },
        ],
      },
    }),
    content: Property.LongText({
      displayName: 'Content',
      description: 'The message content to store',
      required: true,
    }),
    summary: Property.LongText({
      displayName: 'Summary',
      description:
        'Optional rolling summary of the conversation. If provided, replaces the existing summary.',
      required: false,
    }),
    retentionDays: Property.Number({
      displayName: 'Retention Days',
      description:
        'Number of days to keep messages. Messages older than this are automatically removed. Defaults to 30.',
      required: false,
      defaultValue: DEFAULT_RETENTION_DAYS,
    }),
  },
  async run(context) {
    const { mobileNumber, role, content, summary, retentionDays } =
      context.propsValue;
    const effectiveRetention = retentionDays ?? DEFAULT_RETENTION_DAYS;
    const storeKey = `${STORE_KEY_PREFIX}${mobileNumber.trim()}`;

    const existing = await context.store.get<ConversationData>(
      storeKey,
      StoreScope.PROJECT,
    );

    const now = new Date().toISOString();
    const roleValue: 'user' | 'agent' | 'system' =
      role === 'agent' ? 'agent' : role === 'system' ? 'system' : 'user';
    const newMessage: ConversationMessage = {
      role: roleValue,
      content,
      timestamp: now,
    };

    const previousMessages = existing?.messages ?? [];
    const allMessages = [...previousMessages, newMessage];
    const retainedMessages = filterByRetention(allMessages, effectiveRetention);

    const updated: ConversationData = {
      mobileNumber: mobileNumber.trim(),
      messages: retainedMessages,
      summary: summary ?? existing?.summary ?? '',
      lastUpdated: now,
      messageCount: retainedMessages.length,
      retentionDays: effectiveRetention,
    };

    await context.store.put(storeKey, updated, StoreScope.PROJECT);

    return {
      success: true,
      mobileNumber: updated.mobileNumber,
      messageCount: updated.messageCount,
      lastUpdated: updated.lastUpdated,
      retentionDays: effectiveRetention,
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
