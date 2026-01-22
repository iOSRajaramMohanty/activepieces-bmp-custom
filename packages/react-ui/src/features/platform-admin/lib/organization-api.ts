import { api } from '@/lib/api';
import {
  Organization,
  OrganizationEnvironment,
  CreateOrganizationRequest,
  CheckAdminAvailabilityRequest,
  CheckAdminAvailabilityResponse,
  SeekPage,
} from '@activepieces/shared';

export const organizationApi = {
  create(request: CreateOrganizationRequest) {
    return api.post<Organization>('/v1/organizations', request);
  },

  list(platformId: string, params?: { limit?: number; cursor?: string }) {
    return api.get<SeekPage<Organization>>('/v1/organizations', {
      platformId,
      ...params,
    });
  },

  getById(id: string) {
    return api.get<Organization>(`/v1/organizations/${id}`);
  },

  getEnvironments(organizationId: string) {
    return api.get<OrganizationEnvironment[]>(
      `/v1/organizations/${organizationId}/environments`
    );
  },

  checkAdminAvailability(request: CheckAdminAvailabilityRequest) {
    return api.post<CheckAdminAvailabilityResponse>(
      '/v1/organizations/check-admin',
      request
    );
  },

  getOrCreate(request: CreateOrganizationRequest) {
    return api.post<Organization>('/v1/organizations/get-or-create', request);
  },

  update(id: string, updates: Partial<Organization>) {
    return api.patch<Organization>(`/v1/organizations/${id}`, updates);
  },

  delete(id: string) {
    return api.delete(`/v1/organizations/${id}`);
  },
};
