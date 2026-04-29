import type { CloudOAuth2ConnectionValue } from '@activepieces/shared'
import { hooksFactory } from '../helper/hooks-factory'
import type {
    ClaimOAuth2Request,
    RefreshOAuth2Request,
} from './app-connection-service/oauth2/oauth2-service'

export type CloudOAuthHooks = {
    listApps: () => Promise<Record<string, { clientId: string }>>
    claim: (request: ClaimOAuth2Request) => Promise<CloudOAuth2ConnectionValue>
    refresh: (
        request: RefreshOAuth2Request<CloudOAuth2ConnectionValue>,
    ) => Promise<CloudOAuth2ConnectionValue>
}

/**
 * Default hooks (CE / BMP disabled):
 * - listApps => empty object (no configured apps)
 * - claim/refresh => throw (prevents accidental usage when not configured)
 */
export const cloudOAuthHooks = hooksFactory.create<CloudOAuthHooks>(_log => ({
    listApps: async () => ({}),
    claim: async () => {
        throw new Error('Cloud OAuth not configured')
    },
    refresh: async () => {
        throw new Error('Cloud OAuth not configured')
    },
}))

