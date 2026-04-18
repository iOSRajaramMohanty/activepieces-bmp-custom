import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { t } from 'i18next';
import { toast } from 'sonner';

import { internalErrorToast } from '@/components/ui/sonner';

import {
  chatbotEmbedApi,
  type ChatbotEmbedSettings,
  type ChatbotEmbedUpdateRequest,
} from '../lib/chatbot-embed-api';

const chatbotEmbedQueryKeyRoot = ['chatbot-embed'] as const;

export const chatbotEmbedHooks = {
  useChatbotEmbedSettings(projectId: string) {
    return useQuery({
      queryKey: [...chatbotEmbedQueryKeyRoot, projectId],
      queryFn: () => chatbotEmbedApi.get(projectId),
      enabled: projectId.length > 0,
      meta: { showErrorDialog: true, loadSubsetOptions: {} },
    });
  },

  useUpdateChatbotEmbed(projectId: string) {
    const queryClient = useQueryClient();

    return useMutation({
      mutationFn: (request: ChatbotEmbedUpdateRequest) =>
        chatbotEmbedApi.update(projectId, request),
      onSuccess: (data) => {
        queryClient.setQueryData<ChatbotEmbedSettings>(
          [...chatbotEmbedQueryKeyRoot, projectId],
          data,
        );
      },
      onError: () => {
        internalErrorToast();
      },
    });
  },

  useRotateChatbotEmbedKey(projectId: string) {
    const queryClient = useQueryClient();

    return useMutation({
      mutationFn: () => chatbotEmbedApi.rotateKey(projectId),
      onSuccess: (data) => {
        queryClient.setQueryData<ChatbotEmbedSettings>(
          [...chatbotEmbedQueryKeyRoot, projectId],
          data,
        );
        toast.success(t('ChatbotEmbedKeyRotated'));
      },
      onError: () => {
        internalErrorToast();
      },
    });
  },
};
