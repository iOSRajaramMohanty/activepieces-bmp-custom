import { z } from 'zod'
import { StatusCodes } from 'http-status-codes'
import type { FastifyInstance } from 'fastify'
import {
    ActivepiecesError,
    ErrorCode,
    PlatformRole,
    PrincipalType,
} from '@activepieces/shared'
import { securityAccess } from '../../../../../server/api/src/app/core/security/authorization/fastify-security'
import { cloudOAuthService } from '../services/cloud-oauth.service'
import { userService } from '../../../../../server/api/src/app/user/user-service'

export const cloudOAuthController = async (app: FastifyInstance) => {
    const assertSuperAdmin = async (request: any) => {
        const userId = request.principal?.id
        const user = await userService(request.log).getOneOrFail({ id: userId })
        if (user.platformRole !== PlatformRole.SUPER_ADMIN) {
            throw new ActivepiecesError({
                code: ErrorCode.AUTHORIZATION,
                params: { message: 'Only super admins can access this endpoint' },
            })
        }
    }

    app.get(
        '/apps',
        {
            config: {
                security: securityAccess.publicPlatform([PrincipalType.USER]),
            },
            schema: {
                response: {
                    [StatusCodes.OK]: z.record(
                        z.string(),
                        z.object({
                            clientId: z.string(),
                        }),
                    ),
                },
            },
        },
        async (request: any) => {
            return cloudOAuthService(request.log).listApps()
        },
    )

    app.get(
        '/admin/apps',
        {
            config: {
                security: securityAccess.publicPlatform([PrincipalType.USER]),
            },
            schema: {
                response: {
                    [StatusCodes.OK]: z.array(
                        z.object({
                            id: z.string(),
                            created: z.string(),
                            updated: z.string(),
                            pieceName: z.string(),
                            clientId: z.string(),
                        }),
                    ),
                },
            },
        },
        async (request: any) => {
            await assertSuperAdmin(request)
            return cloudOAuthService(request.log).listAdminApps()
        },
    )

    app.post(
        '/admin/apps',
        {
            config: {
                security: securityAccess.publicPlatform([PrincipalType.USER]),
            },
            schema: {
                body: z.object({
                    pieceName: z.string().min(1),
                    clientId: z.string().min(1),
                    clientSecret: z.string().min(1),
                }),
                response: {
                    [StatusCodes.OK]: z.object({
                        id: z.string(),
                        pieceName: z.string(),
                        clientId: z.string(),
                    }),
                },
            },
        },
        async (request: any) => {
            await assertSuperAdmin(request)
            const created = await cloudOAuthService(request.log).create(request.body)
            return {
                id: created.id,
                pieceName: created.pieceName,
                clientId: created.clientId,
            }
        },
    )

    app.patch(
        '/admin/apps/:id',
        {
            config: {
                security: securityAccess.publicPlatform([PrincipalType.USER]),
            },
            schema: {
                params: z.object({
                    id: z.string(),
                }),
                body: z.object({
                    clientId: z.string().min(1),
                    clientSecret: z.string().optional(),
                }),
                response: {
                    [StatusCodes.OK]: z.object({
                        id: z.string(),
                        pieceName: z.string(),
                        clientId: z.string(),
                    }),
                },
            },
        },
        async (request: any) => {
            await assertSuperAdmin(request)
            const updated = await cloudOAuthService(request.log).update(
                request.params.id,
                request.body,
            )
            return {
                id: updated.id,
                pieceName: updated.pieceName,
                clientId: updated.clientId,
            }
        },
    )

    app.delete(
        '/admin/apps/:id',
        {
            config: {
                security: securityAccess.publicPlatform([PrincipalType.USER]),
            },
            schema: {
                params: z.object({
                    id: z.string(),
                }),
                response: {
                    [StatusCodes.OK]: z.null(),
                },
            },
        },
        async (request: any) => {
            await assertSuperAdmin(request)
            await cloudOAuthService(request.log).delete(request.params.id)
            return null
        },
    )
}

