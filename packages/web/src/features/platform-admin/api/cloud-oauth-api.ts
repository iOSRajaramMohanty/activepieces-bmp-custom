import { api } from '@/lib/api';

export type CloudOAuthApp = {
  id: string;
  created: string;
  updated: string;
  pieceName: string;
  clientId: string;
};

export type CloudOAuthAppCreateRequest = {
  pieceName: string;
  clientId: string;
  clientSecret: string;
};

export type CloudOAuthAppUpdateRequest = {
  clientId: string;
  clientSecret?: string;
};

type CloudOAuthAppResponse = Pick<
  CloudOAuthApp,
  'id' | 'pieceName' | 'clientId'
>;

export const cloudOAuthApi = {
  list(): Promise<CloudOAuthApp[]> {
    return api.get<CloudOAuthApp[]>('/v1/cloud-oauth/admin/apps');
  },

  create(request: CloudOAuthAppCreateRequest): Promise<CloudOAuthAppResponse> {
    return api.post<CloudOAuthAppResponse>(
      '/v1/cloud-oauth/admin/apps',
      request,
    );
  },

  update(
    id: string,
    request: CloudOAuthAppUpdateRequest,
  ): Promise<CloudOAuthAppResponse> {
    return api.patch<CloudOAuthAppResponse>(
      `/v1/cloud-oauth/admin/apps/${id}`,
      request,
    );
  },

  delete(id: string): Promise<void> {
    return api.delete<void>(`/v1/cloud-oauth/admin/apps/${id}`);
  },
};
