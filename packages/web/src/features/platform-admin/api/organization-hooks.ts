import {
  CreateOrganizationRequest,
  CheckAdminAvailabilityRequest,
} from '@activepieces/shared';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { t } from 'i18next';
import { toast } from 'sonner';

import { organizationApi } from './organization-api';

export const organizationHooks = {
  useOrganizations(
    platformId: string,
    options?: { availableForAdminInvite?: boolean },
  ) {
    return useQuery({
      queryKey: [
        'organizations',
        platformId,
        options?.availableForAdminInvite ?? false,
      ],
      queryFn: () =>
        organizationApi.list(platformId, {
          limit: 100,
          ...(options?.availableForAdminInvite === true
            ? { availableForAdminInvite: true }
            : {}),
        }),
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

  useUpdateOrganization() {
    const queryClient = useQueryClient();

    return useMutation({
      mutationFn: ({
        id,
        updates,
      }: {
        id: string;
        updates: Partial<{ name: string; metadata: unknown }>;
      }) => organizationApi.update(id, updates),
      onSuccess: (data) => {
        queryClient.invalidateQueries({
          queryKey: ['organizations'],
        });
        queryClient.invalidateQueries({
          queryKey: ['organization', data.id],
        });
        toast.success(t('Organization metadata updated successfully'));
      },
      onError: (error: any) => {
        toast.error(t('Error'), {
          description:
            error?.response?.data?.message ||
            t('Failed to update organization metadata'),
        });
      },
    });
  },

  useInitializeEnvironments() {
    const queryClient = useQueryClient();

    return useMutation({
      mutationFn: (organizationId: string) =>
        organizationApi.initializeEnvironments(organizationId),
      onSuccess: (_, organizationId) => {
        queryClient.invalidateQueries({
          queryKey: ['organization-environments', organizationId],
        });
        queryClient.invalidateQueries({
          queryKey: ['organizations'],
        });
        toast.success(
          t(
            'Dev, Staging, Prod environments created. You can now configure metadata.',
          ),
        );
      },
      onError: (error: any) => {
        toast.error(t('Error'), {
          description:
            error?.response?.data?.message || t('Failed to setup environments'),
        });
      },
    });
  },

  useUpdateEnvironmentMetadata() {
    const queryClient = useQueryClient();

    return useMutation({
      mutationFn: ({
        organizationId,
        environmentId,
        metadata,
      }: {
        organizationId: string;
        environmentId: string;
        metadata: unknown;
      }) =>
        organizationApi.updateEnvironmentMetadata(
          organizationId,
          environmentId,
          metadata,
        ),
      onSuccess: (data, variables) => {
        queryClient.invalidateQueries({
          queryKey: ['organization-environments', variables.organizationId],
        });
        queryClient.invalidateQueries({
          queryKey: ['organizations'],
        });
        toast.success(t('Environment metadata updated successfully'));
      },
      onError: (error: any) => {
        toast.error(t('Error'), {
          description:
            error?.response?.data?.message ||
            t('Failed to update environment metadata'),
        });
      },
    });
  },
};
