import { useQuery } from '@tanstack/react-query';

import { superAdminApi } from '@/lib/super-admin-api';

export const superAdminHooks = {
  useAllPlatforms: () => {
    return useQuery({
      queryKey: ['super-admin-platforms'],
      queryFn: () => superAdminApi.getAllPlatforms(),
      staleTime: 30000, // 30 seconds
    });
  },

  useAllUsers: () => {
    return useQuery({
      queryKey: ['super-admin-users'],
      queryFn: () => superAdminApi.getAllUsers(),
      staleTime: 30000,
    });
  },

  useAllProjects: () => {
    return useQuery({
      queryKey: ['super-admin-projects'],
      queryFn: () => superAdminApi.getAllProjects(),
      staleTime: 30000,
    });
  },

  usePlatformUsers: (platformId: string | null) => {
    return useQuery({
      queryKey: ['super-admin-platform-users', platformId],
      queryFn: () => superAdminApi.getPlatformUsers(platformId!),
      enabled: !!platformId,
      staleTime: 30000,
    });
  },

  usePlatformProjects: (platformId: string | null) => {
    return useQuery({
      queryKey: ['super-admin-platform-projects', platformId],
      queryFn: () => superAdminApi.getPlatformProjects(platformId!),
      enabled: !!platformId,
      staleTime: 30000,
    });
  },

  useSystemStats: () => {
    return useQuery({
      queryKey: ['super-admin-stats'],
      queryFn: () => superAdminApi.getSystemStats(),
      staleTime: 30000,
    });
  },
};
