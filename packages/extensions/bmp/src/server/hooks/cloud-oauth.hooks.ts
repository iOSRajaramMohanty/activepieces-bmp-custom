import type { FastifyBaseLogger } from 'fastify'

import type { CloudOAuth2ConnectionValue } from '@activepieces/shared'
import type {
    ClaimOAuth2Request,
    RefreshOAuth2Request,
} from '../../../../../server/api/src/app/app-connection/app-connection-service/oauth2/oauth2-service'

import type { CloudOAuthHooks } from '../../../../../server/api/src/app/app-connection/cloud-oauth-hooks'

import { cloudOAuthService } from '../services/cloud-oauth.service'

// BMP hook implementation that connects core hook factory to the BMP service.
export const bmpCloudOAuthHooks = (log: FastifyBaseLogger): CloudOAuthHooks => {
    const svc = cloudOAuthService(log)
    return {
        listApps: () => svc.listApps(),
        claim: (request: ClaimOAuth2Request) => svc.claim(request),
        refresh: (request: RefreshOAuth2Request<CloudOAuth2ConnectionValue>) => svc.refresh(request),
    }
}

