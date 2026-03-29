import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { t } from 'i18next';
import { toast } from 'sonner';

import {
  cloudOAuthApi,
  CloudOAuthApp,
  CloudOAuthAppCreateRequest,
  CloudOAuthAppUpdateRequest,
} from './cloud-oauth-api';

const QUERY_KEY = 'cloud-oauth-apps';

export const cloudOAuthHooks = {
  useCloudOAuthApps() {
    return useQuery<CloudOAuthApp[], Error>({
      queryKey: [QUERY_KEY],
      queryFn: () => cloudOAuthApi.list(),
      staleTime: 30000,
    });
  },

  useCreateCloudOAuthApp() {
    const queryClient = useQueryClient();

    return useMutation({
      mutationFn: (request: CloudOAuthAppCreateRequest) =>
        cloudOAuthApi.create(request),
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
        toast.success(t('OAuth app created successfully'));
      },
      onError: (error: any) => {
        toast.error(t('Error'), {
          description:
            error?.response?.data?.message || error?.message || t('Failed'),
        });
      },
    });
  },

  useUpdateCloudOAuthApp() {
    const queryClient = useQueryClient();

    return useMutation({
      mutationFn: ({
        id,
        request,
      }: {
        id: string;
        request: CloudOAuthAppUpdateRequest;
      }) => cloudOAuthApi.update(id, request),
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
        toast.success(t('OAuth app updated successfully'));
      },
      onError: (error: any) => {
        toast.error(t('Error'), {
          description:
            error?.response?.data?.message || error?.message || t('Failed'),
        });
      },
    });
  },

  useDeleteCloudOAuthApp() {
    const queryClient = useQueryClient();

    return useMutation({
      mutationFn: (id: string) => cloudOAuthApi.delete(id),
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
        toast.success(t('OAuth app deleted'));
      },
      onError: (error: any) => {
        toast.error(t('Error'), {
          description:
            error?.response?.data?.message || error?.message || t('Failed'),
        });
      },
    });
  },
};
