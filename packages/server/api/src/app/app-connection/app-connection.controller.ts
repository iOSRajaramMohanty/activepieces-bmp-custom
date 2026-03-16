import { ApId,
    AppConnectionOwners,
    AppConnectionScope,
    AppConnectionWithoutSensitiveData,
    ApplicationEventName,
    EnvironmentType,
    ErrorCode,
    ListAppConnectionOwnersRequestQuery,
    ListAppConnectionsRequestQuery,
    Permission,
    PlatformRole,
    PrincipalType,
    ReplaceAppConnectionsRequestBody,
    SeekPage,
    SERVICE_KEY_SECURITY_OPENAPI,
    UpdateConnectionValueRequestBody,
    UpsertAppConnectionRequestBody,
} from '@activepieces/shared'
import { FastifyPluginCallbackZod } from 'fastify-type-provider-zod'
import { StatusCodes } from 'http-status-codes'
import { z } from 'zod'
import { ProjectResourceType } from '../core/security/authorization/common'
import { securityAccess } from '../core/security/authorization/fastify-security'
import { applicationEvents } from '../helper/application-events'
import { securityHelper } from '../helper/security-helper'
import { userService } from '../user/user-service'
import { appConnectionService } from './app-connection-service/app-connection-service'
import { AppConnectionEntity } from './app-connection.entity'

const isBmpPiece = (pieceName: string): boolean =>
    pieceName === '@activepieces/piece-ada-bmp'

export const appConnectionController: FastifyPluginCallbackZod = (app, _opts, done) => {
    app.post('/', UpsertAppConnectionRequest, async (request, reply) => {
        const ownerId = await securityHelper.getUserIdFromRequest(request)
        const currentUser = ownerId ? await userService(request.log).getOneOrFail({ id: ownerId }) : null
        const appConnection = await appConnectionService(request.log).upsert({
            platformId: request.principal.platform.id,
            projectIds: [request.projectId],
            type: request.body.type,
            externalId: request.body.externalId,
            value: request.body.value,
            displayName: request.body.displayName,
            pieceName: request.body.pieceName,
            ownerId,
            scope: AppConnectionScope.PROJECT,
            metadata: request.body.metadata,
            pieceVersion: request.body.pieceVersion,
            creatorPlatformRole: currentUser?.platformRole,
        })
        applicationEvents(request.log).sendUserEvent(request, {
            action: ApplicationEventName.CONNECTION_UPSERTED,
            data: {
                connection: appConnection,
            },
        })
        await reply
            .status(StatusCodes.CREATED)
            .send(appConnection)
    })

    app.post('/:id', UpdateConnectionValueRequest, async (request) => {
        const appConnection = await appConnectionService(request.log).update({
            id: request.params.id,
            platformId: request.principal.platform.id,
            projectIds: [request.projectId],
            scope: AppConnectionScope.PROJECT,
            request: {
                displayName: request.body.displayName,
                projectIds: null,
                metadata: request.body.metadata,
            },
        })
        return appConnection
    })

    app.get('/', ListAppConnectionsRequest, async (request): Promise<SeekPage<AppConnectionWithoutSensitiveData>> => {
        const { displayName, pieceName, status, cursor, limit, scope } = request.query

        const appConnections = await appConnectionService(request.log).list({
            pieceName,
            displayName,
            status,
            scope,
            platformId: request.principal.platform.id,
            projectId: request.projectId,
            cursorRequest: cursor ?? null,
            limit: limit ?? DEFAULT_PAGE_SIZE,
            externalIds: undefined,
        })

        let platformRole: PlatformRole = PlatformRole.OWNER
        if (request.principal.type === PrincipalType.USER) {
            const currentUser = await userService(request.log).getOneOrFail({ id: request.principal.id })
            platformRole = currentUser.platformRole
        }

        const allowedEnvsByRole: Record<string, string[]> = {
            [PlatformRole.MEMBER]: [EnvironmentType.DEVELOPMENT, EnvironmentType.STAGING],
            [PlatformRole.OPERATOR]: [EnvironmentType.PRODUCTION],
            [PlatformRole.ADMIN]: [EnvironmentType.DEVELOPMENT, EnvironmentType.STAGING, EnvironmentType.PRODUCTION],
            [PlatformRole.OWNER]: [EnvironmentType.DEVELOPMENT, EnvironmentType.STAGING, EnvironmentType.PRODUCTION],
            [PlatformRole.SUPER_ADMIN]: [EnvironmentType.DEVELOPMENT, EnvironmentType.STAGING, EnvironmentType.PRODUCTION],
        }
        const allowedEnvs = allowedEnvsByRole[platformRole] ?? [EnvironmentType.DEVELOPMENT, EnvironmentType.STAGING, EnvironmentType.PRODUCTION]

        const filteredData = appConnections.data.filter((conn) => {
            const creatorRole = (conn.metadata as Record<string, string> | undefined)?.creatorPlatformRole
            if (platformRole !== PlatformRole.ADMIN && platformRole !== PlatformRole.OWNER && platformRole !== PlatformRole.SUPER_ADMIN) {
                if (platformRole === PlatformRole.MEMBER && creatorRole === PlatformRole.OPERATOR) return false
                if (platformRole === PlatformRole.OPERATOR && creatorRole === PlatformRole.MEMBER) return false
            }
            if (isBmpPiece(conn.pieceName)) {
                const connEnv = (conn.metadata as Record<string, string> | undefined)?.environment
                if (connEnv && !allowedEnvs.includes(connEnv)) return false
            }
            return true
        })

        const appConnectionsWithoutSensitiveData: SeekPage<AppConnectionWithoutSensitiveData> = {
            ...appConnections,
            data: filteredData.map(appConnectionService(request.log).removeSensitiveData),
        }
        return appConnectionsWithoutSensitiveData
    },
    )
    app.get('/owners', ListAppConnectionOwnersRequest, async (request): Promise<SeekPage<AppConnectionOwners>> => {
        const owners = await appConnectionService(request.log).getOwners({
            projectId: request.projectId,
            platformId: request.principal.platform.id,
        })
        return {
            data: owners,
            next: null,
            previous: null,
        }
    },
    )

    app.post('/replace', ReplaceAppConnectionsRequest, async (request, reply) => {
        const { sourceAppConnectionId, targetAppConnectionId } = request.body
        await appConnectionService(request.log).replace({
            sourceAppConnectionId,
            targetAppConnectionId,
            projectId: request.projectId,
            platformId: request.principal.platform.id,
            userId: request.principal.id,
        })
        await reply.status(StatusCodes.NO_CONTENT).send()
    })

    app.delete('/:id', DeleteAppConnectionRequest, async (request, reply): Promise<void> => {
        const connection = await appConnectionService(request.log).getOneOrThrowWithoutValue({
            id: request.params.id,
            platformId: request.principal.platform.id,
            projectId: request.projectId,
        })
        
        // Prevent deletion of auto-created BMP connections
        // These connections are managed by the system and should not be deleted by users
        if (connection.externalId?.startsWith('bmp-auto-')) {
            throw new ActivepiecesError({
                code: ErrorCode.AUTHORIZATION,
                params: {
                    message: 'Auto-created BMP connections cannot be deleted. This connection is managed by the system.',
                },
            })
        }
        
        applicationEvents(request.log).sendUserEvent(request, {
            action: ApplicationEventName.CONNECTION_DELETED,
            data: {
                connection,
            },
        })
        await appConnectionService(request.log).delete({
            id: request.params.id,
            platformId: request.principal.platform.id,
            scope: AppConnectionScope.PROJECT,
            projectId: request.projectId,
        })
        await reply.status(StatusCodes.NO_CONTENT).send()
    })

    done()
}

const DEFAULT_PAGE_SIZE = 10


const UpsertAppConnectionRequest = {
    config: {
        security: securityAccess.project(
            [PrincipalType.USER, PrincipalType.SERVICE],
            Permission.WRITE_APP_CONNECTION,
            {
                type: ProjectResourceType.BODY,
            },
        ),
    },
    schema: {
        tags: ['app-connections'],
        security: [SERVICE_KEY_SECURITY_OPENAPI],
        description: 'Upsert an app connection based on the app name',
        body: UpsertAppConnectionRequestBody,
        Response: {
            [StatusCodes.CREATED]: AppConnectionWithoutSensitiveData,
        },
    },
}

const UpdateConnectionValueRequest = {
    config: {
        security: securityAccess.project(
            [PrincipalType.USER, PrincipalType.SERVICE],
            Permission.WRITE_APP_CONNECTION,
            {
                type: ProjectResourceType.TABLE,
                tableName: AppConnectionEntity,
            },
        ),
    },
    schema: {
        tags: ['app-connections'],
        security: [SERVICE_KEY_SECURITY_OPENAPI],
        description: 'Update an app connection value',
        body: UpdateConnectionValueRequestBody,
        params: z.object({
            id: ApId,
        }),
    },
}

const ReplaceAppConnectionsRequest = {
    config: {
        security: securityAccess.project(
            [PrincipalType.USER, PrincipalType.SERVICE],
            Permission.WRITE_APP_CONNECTION,
            {
                type: ProjectResourceType.BODY,
            },
        ),
    },
    schema: {
        tags: ['app-connections'],
        security: [SERVICE_KEY_SECURITY_OPENAPI],
        description: 'Replace app connections',
        body: ReplaceAppConnectionsRequestBody,
        response: {
            [StatusCodes.NO_CONTENT]: z.never(),
        },
    },
}

const ListAppConnectionsRequest = {
    config: {
        security: securityAccess.project(
            [PrincipalType.USER, PrincipalType.SERVICE],
            Permission.READ_APP_CONNECTION,
            {
                type: ProjectResourceType.QUERY,
            },
        ),
    },
    schema: {
        tags: ['app-connections'],
        security: [SERVICE_KEY_SECURITY_OPENAPI],
        querystring: ListAppConnectionsRequestQuery,
        description: 'List app connections',
        response: {
            [StatusCodes.OK]: SeekPage(AppConnectionWithoutSensitiveData),
        },
    },
}
const ListAppConnectionOwnersRequest = {
    config: {
        security: securityAccess.project(
            [PrincipalType.USER, PrincipalType.SERVICE],
            Permission.READ_APP_CONNECTION,
            {
                type: ProjectResourceType.QUERY,
            },
        ),
    },
    schema: {
        querystring: ListAppConnectionOwnersRequestQuery,
        tags: ['app-connections'],
        security: [SERVICE_KEY_SECURITY_OPENAPI],
        description: 'List app connection owners',
        response: {
            [StatusCodes.OK]: SeekPage(AppConnectionOwners),
        },
    },
}

const DeleteAppConnectionRequest = {
    config: {
        security: securityAccess.project(
            [PrincipalType.USER, PrincipalType.SERVICE],
            Permission.WRITE_APP_CONNECTION,
            {
                type: ProjectResourceType.TABLE,
                tableName: AppConnectionEntity,
            },
        ),
    },
    schema: {
        tags: ['app-connections'],
        security: [SERVICE_KEY_SECURITY_OPENAPI],
        description: 'Delete an app connection',
        params: z.object({
            id: ApId,
        }),
        response: {
            [StatusCodes.NO_CONTENT]: z.never(),
        },
    },
}
