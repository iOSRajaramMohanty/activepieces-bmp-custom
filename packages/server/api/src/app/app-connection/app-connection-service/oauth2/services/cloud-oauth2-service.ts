
import { OAuth2AuthorizationMethod } from '@activepieces/pieces-framework'
import {
    ActivepiecesError,
    AppConnectionType,
    CloudOAuth2ConnectionValue,
    ErrorCode,
} from '@activepieces/shared'
import { FastifyBaseLogger } from 'fastify'
import { isBmpEnabled } from '../../../../bmp/bmp-runtime'
import { apAxios } from '../../../../helper/ap-axios'
import { system } from '../../../../helper/system/system'
import {
    ClaimOAuth2Request,
    OAuth2Service,
    RefreshOAuth2Request,
} from '../oauth2-service'
import { cloudOAuthHooks } from '../../../cloud-oauth-hooks'

export const cloudOAuth2Service = (log: FastifyBaseLogger): OAuth2Service<CloudOAuth2ConnectionValue> => ({
    refresh: async (params: RefreshOAuth2Request<CloudOAuth2ConnectionValue>): Promise<CloudOAuth2ConnectionValue> => {
        if (isBmpEnabled()) {
            return cloudOAuthHooks.get(log).refresh(params)
        }

        const { pieceName, connectionValue } = params
        const requestBody = {
            refreshToken: connectionValue.refresh_token,
            pieceName,
            clientId: connectionValue.client_id,
            edition: system.getEdition(),
            authorizationMethod: connectionValue.authorization_method,
            tokenUrl: connectionValue.token_url,
        }
        // [AP OAuth Cloud] Temporary logging: refresh flow
        log.info({
            pieceName,
            clientId: connectionValue.client_id,
            edition: system.getEdition(),
            tokenUrl: connectionValue.token_url,
            url: 'https://secrets.activepieces.com/refresh',
        }, '[AP OAuth Cloud] refresh: calling secrets.activepieces.com/refresh')

        const response = (
            await apAxios.post('https://secrets.activepieces.com/refresh', requestBody, {
                timeout: 20000,
            })
        ).data

        log.info({
            pieceName,
            clientId: connectionValue.client_id,
            hasAccessToken: !!response?.access_token,
            hasRefreshToken: !!response?.refresh_token,
        }, '[AP OAuth Cloud] refresh: success')

        return {
            ...connectionValue,
            ...response,
            props: connectionValue.props,
            type: AppConnectionType.CLOUD_OAUTH2,
        }
    },
    claim: async (params: ClaimOAuth2Request): Promise<CloudOAuth2ConnectionValue> => {
        if (isBmpEnabled()) {
            return cloudOAuthHooks.get(log).claim(params)
        }

        const { request, pieceName } = params
        try {
            const cloudRequest: ClaimWithCloudRequest = {
                code: request.code,
                codeVerifier: request.codeVerifier,
                authorizationMethod: request.authorizationMethod,
                clientId: request.clientId,
                tokenUrl: request.tokenUrl,
                pieceName,
                edition: system.getEdition(),
            }

            // [AP OAuth Cloud] Temporary logging: claim flow (token exchange)
            log.info({
                pieceName,
                clientId: request.clientId,
                edition: system.getEdition(),
                tokenUrl: request.tokenUrl,
                codeLength: request.code?.length ?? 0,
                hasCodeVerifier: !!request.codeVerifier,
                url: 'https://secrets.activepieces.com/claim',
            }, '[AP OAuth Cloud] claim: calling secrets.activepieces.com/claim')

            const value = (
                await apAxios.post<CloudOAuth2ConnectionValue>(
                    'https://secrets.activepieces.com/claim',
                    cloudRequest,
                    {
                        timeout: 10000,
                    },
                )
            ).data

            log.info({
                pieceName,
                clientId: request.clientId,
                hasAccessToken: !!value?.access_token,
                hasRefreshToken: !!value?.refresh_token,
            }, '[AP OAuth Cloud] claim: success')

            return {
                ...value,
                token_url: request.tokenUrl,
                props: request.props,
            }
        }
        catch (e: unknown) {
            // Extract detailed error information
            const axiosError = e as any
            const responseStatus = axiosError?.response?.status
            const responseData = axiosError?.response?.data
            const errorMessage = e instanceof Error ? e.message : String(e)
            
            log.error({
                error: e,
                pieceName,
                code: request.code?.substring(0, 20) + '...', // Log partial code for debugging
                clientId: request.clientId,
                tokenUrl: request.tokenUrl,
                authorizationMethod: request.authorizationMethod,
                hasCodeVerifier: !!request.codeVerifier,
                edition: system.getEdition(),
                responseStatus,
                responseData,
                errorMessage,
            }, '[CloudOAuth2] Failed to claim authorization code')
            
            throw new ActivepiecesError({
                code: ErrorCode.INVALID_CLOUD_CLAIM,
                params: {
                    pieceName,
                },
            })
        }
    },
})

type ClaimWithCloudRequest = {
    pieceName: string
    code: string
    codeVerifier: string | undefined
    authorizationMethod: OAuth2AuthorizationMethod | undefined
    edition: string
    clientId: string
    tokenUrl: string
}
