import { api } from '@/lib/api';

export type ChatbotMode = 'builder' | 'agent';

export type ChatbotMessage = {
  role: 'user' | 'assistant';
  content: string;
  created: string;
};

export type ChatbotMessageResponse = {
  mode: ChatbotMode;
  sessionId: string;
  flowId: string | null;
  reply: string;
  messages: ChatbotMessage[];
};

export type SendChatbotMessageRequest = {
  mode: ChatbotMode;
  message: string;
  sessionId?: string;
  flowId?: string;
  metadata?: Record<string, unknown>;
};

export type ChatbotSessionResponse = {
  sessionId: string;
  mode: ChatbotMode;
  flowId: string | null;
  messages: ChatbotMessage[];
};

export const chatbotMessageApi = {
  async sendMessage(
    projectId: string,
    request: SendChatbotMessageRequest,
  ): Promise<ChatbotMessageResponse> {
    return await api.post<ChatbotMessageResponse>(
      '/v1/chatbot/message',
      request,
      { projectId },
    );
  },

  async getSession(
    projectId: string,
    params: { sessionId: string; mode: ChatbotMode },
  ): Promise<ChatbotSessionResponse> {
    return await api.get<ChatbotSessionResponse>('/v1/chatbot/session', {
      projectId,
      sessionId: params.sessionId,
      mode: params.mode,
    });
  },
};
