import {
  UpsertOAuth2AppRequest,
  ApEdition,
  ApFlagId,
  AppConnectionType,
} from '@activepieces/shared';
import { useMutation, useQuery } from '@tanstack/react-query';
import { t } from 'i18next';
import { toast } from 'sonner';

import { PiecesOAuth2AppsMap } from '@/features/connections/utils/oauth2-utils';
import { flagsHooks } from '@/hooks/flags-hooks';
import { platformHooks } from '@/hooks/platform-hooks';

import { oauthAppsApi } from '../api/oauth-apps';

export const oauthAppsMutations = {
  useDeleteOAuthApp: (refetch: () => void, setOpen: (open: boolean) => void) =>
    useMutation({
      mutationFn: async (credentialId: string) => {
        await oauthAppsApi.delete(credentialId);
        refetch();
      },
      onSuccess: () => {
        toast.success(t('OAuth2 Credentials Deleted'), {
          duration: 3000,
        });
        setOpen(false);
      },
    }),

  useUpsertOAuthApp: (
    refetch: () => void,
    setOpen: (open: boolean) => void,
    onConfigurationDone: () => void,
  ) =>
    useMutation({
      mutationFn: async (request: UpsertOAuth2AppRequest) => {
        await oauthAppsApi.upsert(request);
        refetch();
      },
      onSuccess: () => {
        toast.success(t('OAuth2 Credentials Updated'), {
          duration: 3000,
        });
        onConfigurationDone();
        setOpen(false);
      },
    }),
};

export const oauthAppsQueries = {
  useOAuthAppConfigured(pieceId: string) {
    const query = useQuery({
      queryKey: ['oauth2-apps-configured'],
      queryFn: async () => {
        const response = await oauthAppsApi.listPlatformOAuth2Apps({
          limit: 1000000,
        });
        return response.data;
      },
      select: (data) => {
        return data.find((app) => app.pieceName === pieceId);
      },
      staleTime: Infinity,
    });
    return {
      refetch: query.refetch,
      oauth2App: query.data,
    };
  },
  usePiecesOAuth2AppsMap() {
    const { platform } = platformHooks.useCurrentPlatform();
    const { data: edition } = flagsHooks.useFlag<ApEdition>(ApFlagId.EDITION);

    return useQuery<PiecesOAuth2AppsMap, Error>({
      queryKey: ['oauth-apps'],
      queryFn: async () => {
        // [AP OAuth] Temporary logging: how piecesOAuth2AppsMap is built
        console.log('[AP OAuth] Building piecesOAuth2AppsMap', {
          edition,
          cloudAuthEnabled: platform.cloudAuthEnabled,
        });

        const apps =
          edition === ApEdition.COMMUNITY
            ? {
                data: [],
              }
            : await oauthAppsApi.listPlatformOAuth2Apps({
                limit: 1000000,
                cursor: undefined,
              });

        if (edition === ApEdition.COMMUNITY) {
          console.log(
            '[AP OAuth] Platform apps: skipped (COMMUNITY edition, using empty list)',
          );
        } else {
          console.log('[AP OAuth] Platform apps: GET /v1/oauth-apps', {
            count: apps.data.length,
            pieceNames: apps.data.map((a) => a.pieceName),
          });
        }

        const cloudApps = !platform.cloudAuthEnabled
          ? {}
          : await oauthAppsApi.listCloudOAuth2Apps(edition!);

        if (!platform.cloudAuthEnabled) {
          console.log(
            '[AP OAuth] Cloud apps: skipped (cloudAuthEnabled is false)',
          );
        } else {
          console.log(
            '[AP OAuth] Cloud apps: GET https://secrets.activepieces.com/apps',
            {
              pieceNames: Object.keys(cloudApps),
              count: Object.keys(cloudApps).length,
            },
          );
        }

        const appsMap: PiecesOAuth2AppsMap = {};

        Object.entries(cloudApps).forEach(([pieceName, app]) => {
          appsMap[pieceName] = {
            cloudOAuth2App: {
              oauth2Type: AppConnectionType.CLOUD_OAUTH2,
              clientId: app.clientId,
            },
            platformOAuth2App: null,
          };
        });
        apps.data.forEach((app) => {
          appsMap[app.pieceName] = {
            platformOAuth2App: {
              oauth2Type: AppConnectionType.PLATFORM_OAUTH2,
              clientId: app.clientId,
            },
            cloudOAuth2App: appsMap[app.pieceName]?.cloudOAuth2App ?? null,
          };
        });

        console.log('[AP OAuth] piecesOAuth2AppsMap result', {
          pieceNames: Object.keys(appsMap),
          byPiece: Object.fromEntries(
            Object.entries(appsMap).map(([name, entry]) => [
              name,
              {
                cloud: !!entry?.cloudOAuth2App,
                platform: !!entry?.platformOAuth2App,
              },
            ]),
          ),
        });
        return appsMap;
      },
      staleTime: 0,
    });
  },
};

export type PieceToClientIdMap = {
  [
    pieceName: `${string}-${
      | AppConnectionType.CLOUD_OAUTH2
      | AppConnectionType.PLATFORM_OAUTH2}`
  ]: {
    oauth2Type:
      | AppConnectionType.CLOUD_OAUTH2
      | AppConnectionType.PLATFORM_OAUTH2;
    clientId: string;
  };
};
