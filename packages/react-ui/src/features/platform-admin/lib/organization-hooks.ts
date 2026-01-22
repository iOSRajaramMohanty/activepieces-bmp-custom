import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { organizationApi } from './organization-api';
import {
  CreateOrganizationRequest,
  CheckAdminAvailabilityRequest,
  EnvironmentType,
} from '@activepieces/shared';
import { toast } from 'sonner';
import { t } from 'i18next';

export const organizationHooks = {
  useOrganizations(platformId: string) {
    return useQuery({
      queryKey: ['organizations', platformId],
      queryFn: () => organizationApi.list(platformId, { limit: 100 }),
      enabled: !!platformId,
    });
  },

  useOrganization(id: string | undefined) {
    return useQuery({
      queryKey: ['organization', id],
      queryFn: () => organizationApi.getById(id!),
      enabled: !!id,
    });
  },

  useOrganizationEnvironments(organizationId: string | undefined) {
    return useQuery({
      queryKey: ['organization-environments', organizationId],
      queryFn: () => organizationApi.getEnvironments(organizationId!),
      enabled: !!organizationId,
    });
  },

  useCheckAdminAvailability() {
    return useMutation({
      mutationFn: (request: CheckAdminAvailabilityRequest) =>
        organizationApi.checkAdminAvailability(request),
    });
  },

  useCreateOrganization() {
    const queryClient = useQueryClient();

    return useMutation({
      mutationFn: (request: CreateOrganizationRequest) =>
        organizationApi.create(request),
      onSuccess: (_, variables) => {
        queryClient.invalidateQueries({
          queryKey: ['organizations', variables.platformId],
        });
        toast.success(t('Organization created successfully'));
      },
      onError: (error: any) => {
        toast.error(t('Error'), {
          description:
            error?.response?.data?.message ||
            t('Failed to create organization'),
        });
      },
    });
  },

  useGetOrCreateOrganization() {
    const queryClient = useQueryClient();

    return useMutation({
      mutationFn: (request: CreateOrganizationRequest) =>
        organizationApi.getOrCreate(request),
      onSuccess: (_, variables) => {
        queryClient.invalidateQueries({
          queryKey: ['organizations', variables.platformId],
        });
      },
    });
  },
};
