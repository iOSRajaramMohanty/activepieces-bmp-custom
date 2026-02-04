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
import { FastifyBaseLogger, FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import { StatusCodes } from 'http-status-codes'
import { userIdentityService } from '../authentication/user-identity/user-identity-service'
import { platformMustBeOwnedByCurrentUser, platformMustHaveFeatureEnabled, projectMustBeTeamType } from '../ee/authentication/ee-authorization'
import { assertRoleHasPermission } from '../ee/authentication/project-role/rbac-middleware'
import { projectRoleService } from '../ee/projects/project-role/project-role.service'
import { projectService } from '../project/project-service'
import { userService } from '../user/user-service'
import { organizationService } from '../organization/organization.service'
import { organizationEnvironmentService } from '../organization/organization-environment.service'
import { userInvitationsService } from './user-invitation.service'

export const invitationModule: FastifyPluginAsyncTypebox = async (app) => {
    await app.register(invitationController, { prefix: '/v1/user-invitations' })
}

const invitationController: FastifyPluginAsyncTypebox = async (app) => {

    app.post('/', UpsertUserInvitationRequestParams, async (request, reply) => {
        const { email, type } = request.body
        let targetProjectId: string | null = null
        let organizationId: string | null = null
        let environment: string | null = null
        
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
                    
                    // Handle organization for ADMIN invitations from OWNER
                    // ADMIN invite: organization only, no environment; multiple Admins per org allowed
                    if (user.platformRole === PlatformRole.OWNER && request.body.platformRole === PlatformRole.ADMIN) {
                        if (!request.body.organizationName) {
                            throw new ActivepiecesError({
                                code: ErrorCode.VALIDATION,
                                params: {
                                    message: 'Organization name is required when inviting admins',
                                },
                            })
                        }
                        
                        const organization = await organizationService.getOrCreate({
                            name: request.body.organizationName,
                            platformId: request.principal.platform.id,
                        })
                        organizationId = organization.id
                        // No environment for ADMIN; org's shared project used on accept
                        
                        request.log.info({
                            organizationId: organization.id,
                            organizationName: organization.name,
                            inviteeEmail: email,
                        }, '[POST /user-invitations] OWNER inviting ADMIN with organization (no env slot check)')
                    }
                    
                    // If ADMIN is inviting OPERATOR/MEMBER, use the org's shared project (not admin's personal project)
                    if (user.platformRole === PlatformRole.ADMIN && 
                        (request.body.platformRole === PlatformRole.OPERATOR || request.body.platformRole === PlatformRole.MEMBER)) {
                        if (!user.organizationId) {
                            throw new ActivepiecesError({
                                code: ErrorCode.ENTITY_NOT_FOUND,
                                params: {
                                    message: 'Admin is not associated with an organization. Cannot invite users.',
                                },
                            })
                        }
                        const org = await organizationService.getById(user.organizationId)
                        if (!org?.projectId) {
                            throw new ActivepiecesError({
                                code: ErrorCode.ENTITY_NOT_FOUND,
                                params: {
                                    message: 'Organization does not have a shared project yet. Accept an admin invitation first.',
                                },
                            })
                        }
                        targetProjectId = org.projectId
                        organizationId = user.organizationId
                        request.log.info({ 
                            adminId: user.id,
                            projectId: org.projectId,
                            organizationId: organizationId,
                            inviteeEmail: email,
                            inviteeRole: request.body.platformRole
                        }, '[POST /user-invitations] ADMIN inviting OPERATOR/MEMBER - using org shared project')
                    }
                } else {
                    // For SERVICE principal, use EE hook
                    await platformMustBeOwnedByCurrentUser.call(app, request, reply)
                }
                break
        }
        const status = await shouldAutoAcceptInvitation(request.principal, request.body, request.log) ? InvitationStatus.ACCEPTED : InvitationStatus.PENDING
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
            organizationId,
            environment,
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
        
        // For PLATFORM invitations, ADMINs should see invitations for their org's shared project
        let filterProjectId = request.query.type === InvitationType.PROJECT ? projectId : null
        if (request.query.type === InvitationType.PLATFORM && request.principal.type === PrincipalType.USER) {
            const user = await userService.getOneOrFail({ id: request.principal.id })
            if (user.platformRole === PlatformRole.ADMIN && user.organizationId) {
                const org = await organizationService.getById(user.organizationId)
                if (org?.projectId) {
                    filterProjectId = org.projectId
                    request.log.info({ 
                        adminId: user.id,
                        projectId: org.projectId 
                    }, '[GET /user-invitations] Filtering PLATFORM invitations for ADMIN by org shared project')
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

async function shouldAutoAcceptInvitation(principal: Principal, request: SendUserInvitationRequest, log: FastifyBaseLogger): Promise<boolean> {
    if (principal.type === PrincipalType.SERVICE) {
        return true
    }
    
    if (request.type === InvitationType.PLATFORM) {
        return false
    }
    
    const identity = await userIdentityService(log).getIdentityByEmail(request.email)
    if (isNil(identity)) {
        return false
    }
    
    const user = await userService.getOneByIdentityIdOnly({ identityId: identity.id })
    return !isNil(user)
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
        security: securityAccess.unscoped([PrincipalType.USER, PrincipalType.SERVICE]),
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
