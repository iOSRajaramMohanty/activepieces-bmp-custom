import {
  ListProjectMembersRequestQuery,
  ProjectMemberWithUser,
  UpdateProjectMemberRoleRequestBody,
  SeekPage,
} from '@activepieces/shared';
import axios from 'axios';

import { api } from '@/lib/api';

export const projectMembersApi = {
  async list(request: ListProjectMembersRequestQuery) {
    try {
      const response = await api.get<
        | SeekPage<ProjectMemberWithUser>
        | { statusCode: number; error: string; message: string }
      >('/v1/project-members', request, {
        // Suppress console errors for 404 (endpoint may not be available in all environments)
        validateStatus: (status) =>
          status === 404 || (status >= 200 && status < 300),
      });

      // Check if response is an error object (404 response)
      if (
        response &&
        typeof response === 'object' &&
        'statusCode' in response &&
        response.statusCode === 404
      ) {
        return {
          data: [],
          next: null,
          previous: null,
        } as SeekPage<ProjectMemberWithUser>;
      }

      return response as SeekPage<ProjectMemberWithUser>;
    } catch (error: any) {
      // Handle 404 errors gracefully - endpoint may not be available in all environments
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        return {
          data: [],
          next: null,
          previous: null,
        } as SeekPage<ProjectMemberWithUser>;
      }
      throw error;
    }
  },
  update(memberId: string, request: UpdateProjectMemberRoleRequestBody) {
    return api.post<void>(`/v1/project-members/${memberId}`, request);
  },
  delete(id: string): Promise<void> {
    return api.delete<void>(`/v1/project-members/${id}`);
  },
};
