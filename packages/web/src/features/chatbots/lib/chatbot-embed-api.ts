import { api } from '@/lib/api';

export type ChatbotEmbedSettings = {
  id: string;
  created?: string;
  updated?: string;
  projectId: string;
  enabled: boolean;
  publishableKey: string;
  allowedDomains: string[];
  builderEnabled: boolean;
  agentEnabled: boolean;
};

export type ChatbotEmbedUpdateRequest = {
  enabled?: boolean;
  allowedDomains?: string[];
  builderEnabled?: boolean;
  agentEnabled?: boolean;
};

export const chatbotEmbedApi = {
  async get(projectId: string): Promise<ChatbotEmbedSettings> {
    return await api.get<ChatbotEmbedSettings>('/v1/chatbot/embed', {
      projectId,
    });
  },

  async update(
    projectId: string,
    request: ChatbotEmbedUpdateRequest,
  ): Promise<ChatbotEmbedSettings> {
    return await api.post<ChatbotEmbedSettings>('/v1/chatbot/embed', request, {
      projectId,
    });
  },

  async rotateKey(projectId: string): Promise<ChatbotEmbedSettings> {
    return await api.post<ChatbotEmbedSettings>(
      '/v1/chatbot/embed/rotate-key',
      {},
      { projectId },
    );
  },
};
