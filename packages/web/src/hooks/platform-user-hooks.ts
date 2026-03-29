import { SeekPage, UserWithMetaInformation } from '@activepieces/shared';
import { useQuery } from '@tanstack/react-query';

import { platformUserApi } from '@/api/platform-user-api';

import { platformHooks } from './platform-hooks';

export const platformUserHooks = {
  useUsers: () => {
    const { platform } = platformHooks.useCurrentPlatform();

    return useQuery<SeekPage<UserWithMetaInformation>, Error>({
      queryKey: ['users', platform?.id],
      queryFn: async () => {
        try {
          console.log(
            '[platformUserHooks] Fetching users for platform:',
            platform?.id,
          );
          const results = await platformUserApi.list({
            limit: 2000,
          });
          console.log('[platformUserHooks] Users fetched:', {
            count: results?.data?.length || 0,
            total: results?.data?.length || 0,
            platformId: platform?.id,
          });
          return results;
        } catch (error) {
          console.error('[platformUserHooks] Error fetching users:', error);
          throw error;
        }
      },
      enabled: !!platform?.id,
      retry: 2,
    });
  },
};
