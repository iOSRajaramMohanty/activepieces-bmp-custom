import { OAuth2AuthorizationMethod } from '@activepieces/pieces-framework'
import {
    ActivepiecesError,
    AppConnectionType,
    CloudOAuth2ConnectionValue,
    ErrorCode,
    OAuth2GrantType,
    apId,
    resolveValueFromProps,
} from '@activepieces/shared'
import { FastifyBaseLogger } from 'fastify'

import { apAxios } from '../../../../../server/api/src/app/helper/ap-axios'
import { encryptUtils } from '../../../../../server/api/src/app/helper/encryption'
import { repoFactory } from '../../../../../server/api/src/app/core/db/repo-factory'
import { CloudOAuthAppEntity } from '../../../../../server/api/src/app/cloud-oauth/cloud-oauth-app.entity'
import {
    ClaimOAuth2Request,
    RefreshOAuth2Request,
} from '../../../../../server/api/src/app/app-connection/app-connection-service/oauth2/oauth2-service'
import { oauth2Util } from '../../../../../server/api/src/app/app-connection/app-connection-service/oauth2/oauth2-util'

export type CreateCloudOAuthAppRequest = {
    pieceName: string
    clientId: string
    clientSecret: string
}

export type UpdateCloudOAuthAppRequest = {
    clientId: string
    clientSecret?: string
}

const mergeNonNull = <
    T extends Record<string, unknown>,
>(
    appConnection: T,
    oAuth2Response: T,
): T => {
    // Merge only non-nullish values to avoid wiping existing refresh_token
    return {
        ...appConnection,
        ...Object.fromEntries(
            Object.entries(oAuth2Response).filter(([, value]) => value !== null && value !== undefined),
        ),
    }
}

export const cloudOAuthService = (log: FastifyBaseLogger) => {
    const cloudOAuthAppRepo = repoFactory(CloudOAuthAppEntity)

    const getWithSecret = async ({
        pieceName,
        clientId,
    }: {
        pieceName: string
        clientId: string
    }) => {
        const app = await cloudOAuthAppRepo().findOne({
            where: { pieceName, clientId },
        })
        if (!app) {
            return null
        }

        return {
            clientId: app.clientId,
            clientSecret: await encryptUtils.decryptString(app.clientSecret),
        }
    }

    return {
        // -------------------------- Admin CRUD --------------------------
        async listAdminApps(): Promise<Array<{
            id: string
            created: string
            updated: string
            pieceName: string
            clientId: string
        }>> {
            const apps = await cloudOAuthAppRepo().find({
                select: ['id', 'created', 'updated', 'pieceName', 'clientId'],
            } as any)
            return apps.map((app) => ({
                id: app.id,
                created: app.created.toISOString(),
                updated: app.updated.toISOString(),
                pieceName: app.pieceName,
                clientId: app.clientId,
            }))
        },

        async create(request: CreateCloudOAuthAppRequest) {
            const clientSecretEncrypted = await encryptUtils.encryptString(request.clientSecret)
            const app = cloudOAuthAppRepo().create({
                id: apId(),
                pieceName: request.pieceName,
                clientId: request.clientId,
                clientSecret: clientSecretEncrypted,
            })
            return await cloudOAuthAppRepo().save(app)
        },

        async update(id: string, request: UpdateCloudOAuthAppRequest) {
            const repo = cloudOAuthAppRepo()
            const existing = await repo.findOne({ where: { id } })
            if (!existing) {
                throw new ActivepiecesError({
                    code: ErrorCode.ENTITY_NOT_FOUND,
                    params: {
                        entityType: 'CloudOAuthApp',
                    },
                })
            }

            existing.clientId = request.clientId
            if (request.clientSecret && request.clientSecret.length > 0) {
                existing.clientSecret = await encryptUtils.encryptString(request.clientSecret)
            }
            return await repo.save(existing)
        },

        async delete(id: string): Promise<void> {
            await cloudOAuthAppRepo().delete({ id })
        },

        // -------------------------- Connection UI --------------------------
        async listApps(): Promise<Record<string, { clientId: string }>> {
            const apps = await cloudOAuthAppRepo().find()
            const result: Record<string, { clientId: string }> = {}

            for (const app of apps) {
                // Full name key (preferred for piecesOAuth2AppsMap)
                result[app.pieceName] = { clientId: app.clientId }
                // Short key fallback (useful for UIs that strip prefix)
                const shortName = app.pieceName.replace('@activepieces/piece-', '')
                result[shortName] = { clientId: app.clientId }
            }

            return result
        },

        // -------------------------- OAuth Exchange --------------------------
        async claim({
            request,
            pieceName,
        }: ClaimOAuth2Request): Promise<CloudOAuth2ConnectionValue> {
            const cloudApp = await getWithSecret({
                pieceName,
                clientId: request.clientId,
            })

            if (!cloudApp) {
                throw new ActivepiecesError({
                    code: ErrorCode.INVALID_CLOUD_CLAIM,
                    params: { pieceName },
                })
            }

            const grantType = request.grantType ?? OAuth2GrantType.AUTHORIZATION_CODE
            const authorizationMethod = request.authorizationMethod ?? OAuth2AuthorizationMethod.BODY

            log.info({
                pieceName,
                clientId: request.clientId,
                tokenUrl: request.tokenUrl,
                redirectUrl: request.redirectUrl,
                hasRedirectUrl: !!request.redirectUrl,
                grantType,
                authorizationMethod,
            }, '[BMP CloudOAuth] claim: building token request')

            const body: Record<string, string> = {
                grant_type: grantType,
                code: request.code,
            }

            // Include redirect_uri if provided (required by many OAuth providers like Salesforce)
            if (request.redirectUrl) {
                body.redirect_uri = request.redirectUrl
            }

            if (request.codeVerifier) {
                body.code_verifier = request.codeVerifier
            }

            const headers: Record<string, string> = {
                'content-type': 'application/x-www-form-urlencoded',
                accept: 'application/json',
            }

            switch (authorizationMethod) {
                case OAuth2AuthorizationMethod.BODY:
                    body.client_id = request.clientId
                    body.client_secret = cloudApp.clientSecret
                    break
                case OAuth2AuthorizationMethod.HEADER:
                    headers.authorization = `Basic ${Buffer.from(`${request.clientId}:${cloudApp.clientSecret}`).toString('base64')}`
                    break
                default:
                    throw new Error(`Unknown authorization method: ${authorizationMethod}`)
            }

            const tokenResponse = await apAxios.post(
                request.tokenUrl,
                new URLSearchParams(body),
                { headers, timeout: 10000 },
            )

            const formatted = oauth2Util(log).formatOAuth2Response(tokenResponse.data as any)

            return {
                ...formatted,
                type: AppConnectionType.CLOUD_OAUTH2,
                token_url: request.tokenUrl,
                client_id: request.clientId,
                grant_type: grantType,
                props: request.props,
                authorization_method: authorizationMethod as any,
            } as CloudOAuth2ConnectionValue
        },

        async refresh({
            pieceName,
            connectionValue,
        }: RefreshOAuth2Request<CloudOAuth2ConnectionValue>): Promise<CloudOAuth2ConnectionValue> {
            const cloudApp = await getWithSecret({
                pieceName,
                clientId: connectionValue.client_id,
            })

            if (!cloudApp) {
                throw new ActivepiecesError({
                    code: ErrorCode.INVALID_CLOUD_CLAIM,
                    params: { pieceName },
                })
            }

            if (!oauth2Util(log).isExpired(connectionValue)) {
                return connectionValue
            }

            const grantType = connectionValue.grant_type ?? OAuth2GrantType.AUTHORIZATION_CODE
            const authorizationMethod = connectionValue.authorization_method ?? OAuth2AuthorizationMethod.BODY

            const body: Record<string, string> = {}
            switch (grantType) {
                case OAuth2GrantType.AUTHORIZATION_CODE: {
                    body.grant_type = 'refresh_token'
                    body.refresh_token = connectionValue.refresh_token
                    break
                }
                case OAuth2GrantType.CLIENT_CREDENTIALS: {
                    body.grant_type = OAuth2GrantType.CLIENT_CREDENTIALS
                    if (connectionValue.scope) {
                        body.scope = resolveValueFromProps(connectionValue.props, connectionValue.scope)
                    }
                    if (connectionValue.props) {
                        Object.entries(connectionValue.props).forEach(([key, value]) => {
                            body[key] = String(value)
                        })
                    }
                    break
                }
                default:
                    throw new Error(`Unknown grant type: ${grantType}`)
            }

            const headers: Record<string, string> = {
                'content-type': 'application/x-www-form-urlencoded',
                accept: 'application/json',
            }

            switch (authorizationMethod) {
                case OAuth2AuthorizationMethod.BODY:
                    body.client_id = connectionValue.client_id
                    body.client_secret = cloudApp.clientSecret
                    break
                case OAuth2AuthorizationMethod.HEADER:
                    headers.authorization = `Basic ${Buffer.from(`${connectionValue.client_id}:${cloudApp.clientSecret}`).toString('base64')}`
                    break
                default:
                    throw new Error(`Unknown authorization method: ${authorizationMethod}`)
            }

            const tokenResponse = await apAxios.post(
                connectionValue.token_url,
                new URLSearchParams(body),
                { headers, timeout: 20000 },
            )

            const merged = mergeNonNull(
                connectionValue,
                oauth2Util(log).formatOAuth2Response(tokenResponse.data as any),
            )

            return {
                ...merged,
                props: connectionValue.props,
                type: AppConnectionType.CLOUD_OAUTH2,
            } as CloudOAuth2ConnectionValue
        },
    }
}

