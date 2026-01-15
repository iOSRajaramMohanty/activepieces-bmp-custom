import { api } from './api';
import { AuthenticationResponse } from '@activepieces/shared';

export interface SuperAdminPlatform {
  id: string;
  name: string;
  owner_email: string;
  userCount: string;
  projectCount: string;
  created: string;
  updated: string;
}

export interface SuperAdminUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  platformRole: string;
  platformName: string;
  platformId: string;
  status: string;
  created: string;
  updated: string;
  lastActiveDate?: string;
  externalId?: string;
}

export interface SuperAdminProject {
  id: string;
  displayName: string;
  platformName: string;
  platformId: string;
  ownerEmail: string;
  flowCount: string;
  created: string;
  updated: string;
}

export interface SuperAdminStats {
  totalPlatforms: number;
  totalUsers: number;
  totalProjects: number;
  totalFlows: number;
  totalSuperAdmins: number;
  totalOwners: number;
  totalAdmins: number;
  totalOperators: number;
  totalMembers: number;
}

export interface CreateTenantRequest {
  name: string;
  ownerEmail: string;
  ownerPassword: string;
  ownerFirstName: string;
  ownerLastName: string;
}

export interface CreateTenantResponse {
  id: string;
  name: string;
  ownerId: string;
  ownerEmail: string;
  message: string;
}

export const superAdminApi = {
  getAllPlatforms() {
    return api.get<SuperAdminPlatform[]>('/v1/super-admin/platforms');
  },

  getAllUsers() {
    return api.get<SuperAdminUser[]>('/v1/super-admin/users');
  },

  getAllProjects() {
    return api.get<SuperAdminProject[]>('/v1/super-admin/projects');
  },

  getPlatformUsers(platformId: string) {
    return api.get<SuperAdminUser[]>(
      `/v1/super-admin/platforms/${platformId}/users`,
    );
  },

  getPlatformProjects(platformId: string) {
    return api.get<SuperAdminProject[]>(
      `/v1/super-admin/platforms/${platformId}/projects`,
    );
  },

  getSystemStats() {
    return api.get<SuperAdminStats>('/v1/super-admin/stats');
  },

  createTenant(data: CreateTenantRequest) {
    return api.post<CreateTenantResponse>('/v1/super-admin/tenants', data);
  },

  deleteTenant(platformId: string) {
    return api.delete<{ success: boolean; message: string }>(
      `/v1/super-admin/tenants/${platformId}`,
    );
  },

  deleteUser(userId: string) {
    return api.delete<{ success: boolean; message: string }>(
      `/v1/super-admin/users/${userId}`,
    );
  },

  switchToTenant(platformId: string) {
    return api.post<AuthenticationResponse>(
      `/v1/super-admin/tenants/${platformId}/switch`,
    );
  },

  getAccountSwitchingActivities(limit?: number) {
    return api.get<AccountSwitchingActivity[]>(
      '/v1/super-admin/account-switching-activities',
      { limit },
    );
  },
};

export interface AccountSwitchingActivity {
  id: string;
  created: string;
  updated: string;
  originalUserId: string;
  switchedToUserId: string;
  switchType: 'SUPER_ADMIN_TO_OWNER' | 'OWNER_TO_ADMIN';
  originalUserEmail: string;
  switchedToUserEmail: string;
  originalPlatformId: string | null;
  switchedToPlatformId: string;
}
