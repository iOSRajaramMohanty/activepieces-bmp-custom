import { securityAccess } from '@activepieces/server-shared'
import {
    ActivepiecesError,
    assertNotNullOrUndefined,
    ErrorCode,
    InvitationStatus,
    InvitationType,
    isNil,
    ListUserInvitationsRequest,
    Permission,
    PlatformRole,
    Principal,
    PrincipalType,
    ProjectRole,
    SeekPage,
    SendUserInvitationRequest,
    SERVICE_KEY_SECURITY_OPENAPI,
    UserInvitation,
    UserInvitationWithLink,
} from '@activepieces/shared'
import { FastifyPluginAsyncTypebox, Type } from '@fastify/type-provider-typebox'
import dayjs from 'dayjs'
import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import { StatusCodes } from 'http-status-codes'
import { platformMustBeOwnedByCurrentUser, platformMustHaveFeatureEnabled, projectMustBeTeamType } from '../ee/authentication/ee-authorization'
import { assertRoleHasPermission } from '../ee/authentication/project-role/rbac-middleware'
import { projectRoleService } from '../ee/projects/project-role/project-role.service'
import { projectService } from '../project/project-service'
import { userService } from '../user/user-service'
import { userInvitationsService } from './user-invitation.service'

export const invitationModule: FastifyPluginAsyncTypebox = async (app) => {
    await app.register(invitationController, { prefix: '/v1/user-invitations' })
}

const invitationController: FastifyPluginAsyncTypebox = async (app) => {

    app.post('/', UpsertUserInvitationRequestParams, async (request, reply) => {
        const { email, type } = request.body
        let targetProjectId: string | null = null
        
        switch (type) {
            case InvitationType.PROJECT:
                await projectMustBeTeamType.call(app, request, reply)
                await assertPrincipalHasPermissionToProject(app, request, reply, request.principal, request.body.projectId, Permission.WRITE_INVITATION)
                break
            case InvitationType.PLATFORM:
                // Check if user is ADMIN or OWNER (non-EE check before EE hook)
                if (request.principal.type === PrincipalType.USER) {
                    const user = await userService.getOneOrFail({ id: request.principal.id })
                    const canInvite = (user.platformRole === PlatformRole.ADMIN || user.platformRole === PlatformRole.OWNER) && user.platformId === request.principal.platform.id
                    if (!canInvite) {
                        throw new ActivepiecesError({
                            code: ErrorCode.AUTHORIZATION,
                            params: {
                                message: 'Only platform admins and owners can invite users to the platform',
                            },
                        })
                    }
                    
                    // If ADMIN is inviting OPERATOR/MEMBER, store the admin's personal project ID
                    // This ensures the invited user is added to the correct admin's project
                    if (user.platformRole === PlatformRole.ADMIN && 
                        (request.body.platformRole === PlatformRole.OPERATOR || request.body.platformRole === PlatformRole.MEMBER)) {
                        const adminProject = await projectService.getOneByOwnerAndPlatform({
                            ownerId: user.id,
                            platformId: request.principal.platform.id,
                        })
                        if (adminProject) {
                            targetProjectId = adminProject.id
                            request.log.info({ 
                                adminId: user.id,
                                projectId: adminProject.id,
                                projectName: adminProject.displayName,
                                inviteeEmail: email,
                                inviteeRole: request.body.platformRole
                            }, '[POST /user-invitations] ADMIN inviting OPERATOR/MEMBER - storing admin\'s project ID for correct assignment')
                        } else {
                            throw new ActivepiecesError({
                                code: ErrorCode.ENTITY_NOT_FOUND,
                                params: {
                                    message: 'Admin does not have a personal project. Cannot invite users.',
                                },
                            })
                        }
                    }
                } else {
                    // For SERVICE principal, use EE hook
                    await platformMustBeOwnedByCurrentUser.call(app, request, reply)
                }
                break
        }
        const status = request.principal.type === PrincipalType.SERVICE ? InvitationStatus.ACCEPTED : InvitationStatus.PENDING
        const projectRole = await getProjectRoleAndAssertIfFound(request.principal.platform.id, request.body)
        const platformId = request.principal.platform.id

        const invitation = await userInvitationsService(request.log).create({
            email,
            type,
            platformId,
            platformRole: type === InvitationType.PROJECT ? null : request.body.platformRole,
            // For PLATFORM invitations from ADMIN to OPERATOR/MEMBER, store the admin's project ID
            projectId: type === InvitationType.PLATFORM ? targetProjectId : request.body.projectId,
            projectRoleId: type === InvitationType.PLATFORM ? null : projectRole?.id ?? null,
            invitationExpirySeconds: dayjs.duration(1, 'day').asSeconds(),
            status,
        })
        await reply.status(StatusCodes.CREATED).send(invitation)
    })

    app.get('/', ListUserInvitationsRequestParams, async (request, reply) => {
        if (!isNil(request.query.projectId) && request.query.type === InvitationType.PROJECT) {
            await projectMustBeTeamType.call(app, request, reply)
        }
        const projectId = await getProjectIdAndAssertPermission(app, request, reply, request.principal, request.query)
        
        // For PLATFORM invitations, ADMINs should only see invitations for their own project
        let filterProjectId = request.query.type === InvitationType.PROJECT ? projectId : null
        if (request.query.type === InvitationType.PLATFORM && request.principal.type === PrincipalType.USER) {
            const user = await userService.getOneOrFail({ id: request.principal.id })
            if (user.platformRole === PlatformRole.ADMIN) {
                // Get admin's personal project to filter invitations
                const adminProject = await projectService.getOneByOwnerAndPlatform({
                    ownerId: user.id,
                    platformId: request.principal.platform.id,
                })
                if (adminProject) {
                    filterProjectId = adminProject.id
                    request.log.info({ 
                        adminId: user.id,
                        projectId: adminProject.id 
                    }, '[GET /user-invitations] Filtering PLATFORM invitations for ADMIN to show only their project invitations')
                }
            }
        }
        
        const invitations = await userInvitationsService(request.log).list({
            platformId: request.principal.platform.id,
            projectId: filterProjectId,
            type: request.query.type,
            status: request.query.status,
            cursor: request.query.cursor ?? null,
            limit: request.query.limit ?? 10,
        })
        await reply.status(StatusCodes.OK).send(invitations)
    })

    app.post('/accept', AcceptUserInvitationRequestParams, async (request, reply) => {
        const invitation = await userInvitationsService(request.log).getOneByInvitationTokenOrThrow(request.body.invitationToken)
        await userInvitationsService(request.log).accept({
            invitationId: invitation.id,
            platformId: invitation.platformId,
        })
        // Refresh invitation to get updated status
        const updatedInvitation = await userInvitationsService(request.log).getOneOrThrow({
            id: invitation.id,
            platformId: invitation.platformId,
        })
        await reply.status(StatusCodes.OK).send(updatedInvitation)
    })

    app.delete('/:id', DeleteInvitationRequestParams, async (request, reply) => {
        const invitation = await userInvitationsService(request.log).getOneOrThrow({
            id: request.params.id,
            platformId: request.principal.platform.id,
        })
        switch (invitation.type) {
            case InvitationType.PROJECT: {
                assertNotNullOrUndefined(invitation.projectId, 'projectId')
                await projectMustBeTeamType.call(app, request, reply)
                await assertPrincipalHasPermissionToProject(app, request, reply, request.principal, invitation.projectId, Permission.WRITE_INVITATION)
                break
            }
            case InvitationType.PLATFORM:
                // Check if user is ADMIN or OWNER (non-EE check before EE hook)
                if (request.principal.type === PrincipalType.USER) {
                    const user = await userService.getOneOrFail({ id: request.principal.id })
                    const canDelete = (user.platformRole === PlatformRole.ADMIN || user.platformRole === PlatformRole.OWNER) && user.platformId === request.principal.platform.id
                    if (!canDelete) {
                        throw new ActivepiecesError({
                            code: ErrorCode.AUTHORIZATION,
                            params: {
                                message: 'Only platform admins and owners can delete platform invitations',
                            },
                        })
                    }
                } else {
                    // For SERVICE principal, use EE hook
                    await platformMustBeOwnedByCurrentUser.call(app, request, reply)
                }
                break
        }
        await userInvitationsService(request.log).delete({
            id: request.params.id,
            platformId: request.principal.platform.id,
        })
        await reply.status(StatusCodes.NO_CONTENT).send()
    })
}


const getProjectRoleAndAssertIfFound = async (platformId: string, request: SendUserInvitationRequest): Promise<ProjectRole | null> => {
    const { type } = request
    if (type === InvitationType.PLATFORM) {
        return null
    }
    const projectRoleName = request.projectRole

    const projectRole = await projectRoleService.getOneOrThrow({
        name: projectRoleName,
        platformId,
    })
    return projectRole
}
async function getProjectIdAndAssertPermission<R extends Principal>(
    app: FastifyInstance,
    request: FastifyRequest,
    reply: FastifyReply,
    principal: R,
    requestQuery: ListUserInvitationsRequest,
): Promise<string | null> {
    if (principal.type === PrincipalType.SERVICE) {
        if (isNil(requestQuery.projectId)) {
            return null
        }
        await assertPrincipalHasPermissionToProject(app, request, reply, principal, requestQuery.projectId, Permission.READ_INVITATION)
        return requestQuery.projectId
    }
    return requestQuery.projectId ?? null
}


async function assertPrincipalHasPermissionToProject<R extends Principal & { platform: { id: string } }>(
    fastify: FastifyInstance,
    request: FastifyRequest, reply: FastifyReply, principal: R,
    projectId: string, permission: Permission): Promise<void> {
    const project = await projectService.getOneOrThrow(projectId)
    if (isNil(project) || project.platformId !== principal.platform.id) {
        throw new ActivepiecesError({
            code: ErrorCode.AUTHORIZATION,
            params: {
                message: 'user does not have access to the project',
            },
        })
    }
    await platformMustHaveFeatureEnabled((platform) => platform.plan.projectRolesEnabled).call(fastify, request, reply)
    await assertRoleHasPermission(request.principal, projectId, permission, request.log)
}


const ListUserInvitationsRequestParams = {
    config: {
        security: securityAccess.publicPlatform([PrincipalType.USER, PrincipalType.SERVICE]),
    },
    schema: {
        tags: ['user-invitations'],
        security: [SERVICE_KEY_SECURITY_OPENAPI],
        querystring: ListUserInvitationsRequest,
        response: {
            [StatusCodes.OK]: SeekPage(UserInvitation),
        },
    },
}

const AcceptUserInvitationRequestParams = {
    config: {
        security: securityAccess.public(),
    },
    schema: {
        body: Type.Object({
            invitationToken: Type.String(),
        }),
    },
}

const DeleteInvitationRequestParams = {
    config: {
        security: securityAccess.publicPlatform([PrincipalType.USER, PrincipalType.SERVICE]),
    },
    schema: {
        tags: ['user-invitations'],
        security: [SERVICE_KEY_SECURITY_OPENAPI],
        params: Type.Object({
            id: Type.String(),
        }),
        response: {
            [StatusCodes.NO_CONTENT]: Type.Never(),
        },
    },
}

const UpsertUserInvitationRequestParams = {
    config: {
        security: securityAccess.publicPlatform([PrincipalType.USER, PrincipalType.SERVICE]),
    },
    schema: {
        body: SendUserInvitationRequest,
        description: 'Send a user invitation to a user. If the user already has an invitation, the invitation will be updated.',
        tags: ['user-invitations'],
        security: [SERVICE_KEY_SECURITY_OPENAPI],
        response: {
            [StatusCodes.CREATED]: UserInvitationWithLink,
        },
    },
}
