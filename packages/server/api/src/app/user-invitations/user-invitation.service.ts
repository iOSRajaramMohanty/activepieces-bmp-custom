import { ActivepiecesError, apId, assertEqual, assertNotNullOrUndefined, ErrorCode, InvitationStatus, InvitationType, isNil, Platform, PlatformRole, ProjectType, SeekPage, spreadIfDefined, User, UserInvitation, UserInvitationWithLink } from '@activepieces/shared'
import { FastifyBaseLogger } from 'fastify'
import { IsNull } from 'typeorm'
import { userIdentityService } from '../authentication/user-identity/user-identity-service'
import { repoFactory } from '../core/db/repo-factory'
import { domainHelper } from '../ee/custom-domains/domain-helper'
import { smtpEmailSender } from '../ee/helper/email/email-sender/smtp-email-sender'
import { emailService } from '../ee/helper/email/email-service'
import { projectMemberService } from '../ee/projects/project-members/project-member.service'
import { projectRoleService } from '../ee/projects/project-role/project-role.service'
import { jwtUtils } from '../helper/jwt-utils'
import { buildPaginator } from '../helper/pagination/build-paginator'
import { paginationHelper } from '../helper/pagination/pagination-utils'
import { platformService } from '../platform/platform.service'
import { projectService } from '../project/project-service'
import { userService } from '../user/user-service'
import { organizationService } from '../organization/organization.service'
import { UserInvitationEntity } from './user-invitation.entity'

const repo = repoFactory(UserInvitationEntity)

export const userInvitationsService = (log: FastifyBaseLogger) => ({
    async getOneByInvitationTokenOrThrow(invitationToken: string): Promise<UserInvitation> {
        const decodedToken = await jwtUtils.decodeAndVerify<UserInvitationToken>({
            jwt: invitationToken,
            key: await jwtUtils.getJwtSecret(),
        })
        const invitation = await repo().findOneBy({
            id: decodedToken.id,
        })
        if (isNil(invitation)) {
            throw new ActivepiecesError({
                code: ErrorCode.ENTITY_NOT_FOUND,
                params: {
                    entityId: `id=${decodedToken.id}`,
                    entityType: 'UserInvitation',
                },
            })
        }
        return invitation
    },
    async provisionUserInvitation({ user, email }: ProvisionUserInvitationParams): Promise<void> {
        const invitations = await repo().createQueryBuilder('user_invitation')
            .where('LOWER("user_invitation"."email") = :email', { email: email.toLowerCase().trim() })
            .andWhere('"user_invitation"."platformId" = :platformId', { platformId: user.platformId })
            .andWhere({
                status: InvitationStatus.ACCEPTED,
            })
            .getMany()

        log.info({ count: invitations.length }, '[provisionUserInvitation] list invitations')
        for (const invitation of invitations) {
            log.info({ invitation }, '[provisionUserInvitation] provision')
            switch (invitation.type) {
                case InvitationType.PLATFORM: {
                    assertNotNullOrUndefined(invitation.platformRole, 'platformRole')
                    if (invitation.platformRole === PlatformRole.ADMIN && invitation.organizationId) {
                        log.info({
                            userId: user.id,
                            email,
                            organizationId: invitation.organizationId,
                        }, '[provisionUserInvitation] Processing ADMIN invitation with organization')
                        
                        const organization = await organizationService.getById(invitation.organizationId)
                        if (isNil(organization)) {
                            throw new ActivepiecesError({
                                code: ErrorCode.ENTITY_NOT_FOUND,
                                params: {
                                    message: 'Organization not found',
                                },
                            })
                        }
                        
                        await userService(log).update({
                            id: user.id,
                            platformId: invitation.platformId,
                            platformRole: invitation.platformRole,
                        })
                        const { UserEntity } = await import('../user/user-entity')
                        await repoFactory(UserEntity)().update({ id: user.id }, { organizationId: invitation.organizationId })
                        
                        // If org has no shared project yet, create it; otherwise join existing
                        const { OrganizationEntity } = await import('../organization/organization.entity')
                        const { databaseConnection } = await import('../database/database-connection')
                        
                        if (isNil(organization.projectId)) {
                            const projectDisplayName = `${organization.name} Project`
                            const project = await projectService(log).create({
                                displayName: projectDisplayName,
                                ownerId: user.id,
                                platformId: invitation.platformId,
                                type: ProjectType.PERSONAL,
                            })
                            const { ProjectEntity } = await import('../project/project-entity')
                            await repoFactory(ProjectEntity)().update({ id: project.id }, { organizationId: invitation.organizationId })
                            await databaseConnection().getRepository(OrganizationEntity).update(organization.id, { projectId: project.id })
                            log.info({
                                userId: user.id,
                                email,
                                projectId: project.id,
                                organizationId: invitation.organizationId,
                            }, '[provisionUserInvitation] Created shared project for org (first Admin)')
                        } else {
                            log.info({
                                userId: user.id,
                                email,
                                projectId: organization.projectId,
                                organizationId: invitation.organizationId,
                            }, '[provisionUserInvitation] Admin joined existing org shared project (no projectMemberService)')
                        }
                        
                        break
                    }
                    
                    await userService(log).update({
                        id: user.id,
                        platformId: invitation.platformId,
                        platformRole: invitation.platformRole,
                    })
                    
                    // OPERATOR/MEMBER: use org's shared project; set organizationId for visibility-based access (no projectMemberService)
                    if (invitation.platformRole === PlatformRole.OPERATOR || invitation.platformRole === PlatformRole.MEMBER) {
                        log.info({ 
                            userId: user.id, 
                            email, 
                            platformRole: invitation.platformRole,
                            invitationProjectId: invitation.projectId,
                            invitationOrganizationId: invitation.organizationId
                        }, '[provisionUserInvitation] OPERATOR/MEMBER - org shared project, visibility-based access')
                        
                        if (isNil(invitation.projectId) || isNil(invitation.organizationId)) {
                            throw new ActivepiecesError({
                                code: ErrorCode.ENTITY_NOT_FOUND,
                                params: {
                                    message: 'Invitation is missing project or organization information.',
                                },
                            })
                        }
                        
                        const { UserEntity } = await import('../user/user-entity')
                        await repoFactory(UserEntity)().update({ id: user.id }, { organizationId: invitation.organizationId })
                        
                        log.info({ 
                            userId: user.id,
                            email,
                            projectId: invitation.projectId,
                            organizationId: invitation.organizationId
                        }, '[provisionUserInvitation] OPERATOR/MEMBER assigned organizationId; access via visibility filter (no projectMemberService)')
                    }
                    break
                }
                case InvitationType.PROJECT: {
                    const { projectId, projectRoleId } = invitation
                    assertNotNullOrUndefined(projectId, 'projectId')
                    assertNotNullOrUndefined(projectRoleId, 'projectRoleId')
                    const platform = await platformService(log).getOneWithPlanOrThrow(invitation.platformId)
                    assertEqual(platform.plan.projectRolesEnabled, true, 'Project roles are not enabled', 'PROJECT_ROLES_NOT_ENABLED')

                    const projectRole = await projectRoleService.getOneOrThrowById({
                        id: projectRoleId,
                    })

                    const project = await projectService(log).exists({
                        projectId,
                        isSoftDeleted: false,
                    })
                    if (!isNil(project)) {
                        await projectMemberService(log).upsert({
                            projectId,
                            userId: user.id,
                            projectRoleName: projectRole.name,
                        })
                    }
                    break
                }
            }
            await repo().delete({
                id: invitation.id,
            })
        }
    },
    async create({
        email,
        platformId,
        projectId,
        type,
        projectRoleId,
        platformRole,
        organizationId,
        environment,
        invitationExpirySeconds,
        status,
    }: CreateParams): Promise<UserInvitationWithLink> {
        const id = apId()
        
        // Validate platformRole for PLATFORM invitations
        if (type === InvitationType.PLATFORM) {
            assertNotNullOrUndefined(platformRole, 'platformRole is required for PLATFORM invitations')
            log.info({ 
                email, 
                platformId, 
                platformRole, 
                organizationId,
                environment,
                type 
            }, '[createInvitation] Creating PLATFORM invitation with platformRole')
        }
        
        await repo().upsert({
            id,
            status,
            type,
            email: email.toLowerCase().trim(),
            platformId,
            projectRoleId: type === InvitationType.PLATFORM ? undefined : projectRoleId!,
            platformRole: type === InvitationType.PROJECT ? undefined : platformRole!,
            // For PLATFORM invitations, projectId can be set when ADMIN invites OPERATOR/MEMBER
            // For PROJECT invitations, projectId is always required
            projectId: type === InvitationType.PROJECT ? projectId! : (projectId ?? undefined),
            organizationId: organizationId ?? undefined,
            environment: environment as any ?? undefined,
        }, ['email', 'platformId', 'projectId'])
        
        // Verify the invitation was saved correctly
        const savedInvitation = await this.getOneOrThrow({ id, platformId })
        if (type === InvitationType.PLATFORM && savedInvitation.platformRole !== platformRole) {
            log.error({ 
                email,
                platformId,
                expectedRole: platformRole,
                savedRole: savedInvitation.platformRole,
                invitationId: savedInvitation.id
            }, '[createInvitation] ERROR: PlatformRole mismatch after save!')
        }

        const userInvitation = await this.getOneOrThrow({
            id,
            platformId,
        })
        if (status === InvitationStatus.ACCEPTED) {
            await this.accept({
                invitationId: id,
                platformId,
            })
            if (smtpEmailSender(log).isSmtpConfigured()) {
                await emailService(log).sendProjectMemberAdded({
                    userInvitation,
                })
            }
            return userInvitation
        }
        return enrichWithInvitationLink(userInvitation, invitationExpirySeconds, log)
    },
    async list(params: ListUserParams): Promise<SeekPage<UserInvitation>> {
        const decodedCursor = paginationHelper.decodeCursor(params.cursor ?? null)
        const paginator = buildPaginator({
            entity: UserInvitationEntity,
            query: {
                limit: params.limit,
                order: 'ASC',
                afterCursor: decodedCursor.nextCursor,
                beforeCursor: decodedCursor.previousCursor,
            },
        })
        const queryBuilder = repo().createQueryBuilder('user_invitation')
            .where({
                platformId: params.platformId,
                ...spreadIfDefined('projectId', params.projectId),
                ...spreadIfDefined('status', params.status),
                ...spreadIfDefined('type', params.type),
            })
        const { data, cursor } = await paginator.paginate(queryBuilder)
        const enrichedData = await Promise.all(data.map(async (invitation) => {
            return {
                projectRole: !isNil(invitation.projectRoleId) ? await projectRoleService.getOneOrThrowById({
                    id: invitation.projectRoleId,
                }) : null,
                ...invitation,
            }
        }))
        return paginationHelper.createPage<UserInvitation>(await Promise.all(enrichedData), cursor)
    },
    async delete({ id, platformId }: PlatformAndIdParams): Promise<void> {
        const invitation = await this.getOneOrThrow({ id, platformId })
        await repo().delete({
            id: invitation.id,
            platformId,
        })
    },
    async getOneOrThrow({ id, platformId }: PlatformAndIdParams): Promise<UserInvitation> {
        const invitation = await repo().findOne({
            where: {
                id,
                platformId,
            },
        })
        if (isNil(invitation)) {
            throw new ActivepiecesError({
                code: ErrorCode.ENTITY_NOT_FOUND,
                params: {
                    entityId: `id=${id}`,
                    entityType: 'UserInvitation',
                },
            })
        }
        return invitation
    },
    async accept({ invitationId, platformId }: AcceptParams): Promise<{ registered: boolean }> {
        const invitation = await this.getOneOrThrow({ id: invitationId, platformId })
        await repo().update(invitation.id, {
            status: InvitationStatus.ACCEPTED,
        })
        
        // Refresh the invitation to ensure status is updated
        const updatedInvitation = await this.getOneOrThrow({ id: invitationId, platformId })
        log.info({ 
            invitationId, 
            platformId, 
            email: updatedInvitation.email,
            status: updatedInvitation.status,
            organizationId: updatedInvitation.organizationId,
            environment: updatedInvitation.environment,
        }, '[accept] Invitation status updated to ACCEPTED')
        
        const identity = await userIdentityService(log).getIdentityByEmail(invitation.email)
        if (isNil(identity)) {
            return {
                registered: false,
            }
        }
        const isOrganizationAdminInvitation =
            invitation.type === InvitationType.PLATFORM &&
            invitation.platformRole === PlatformRole.ADMIN &&
            !isNil(invitation.organizationId)
        let user: User
        if (isOrganizationAdminInvitation) {
            const existingUser = await userService(log).getOneByIdentityAndPlatform({
                identityId: identity.id,
                platformId: invitation.platformId,
            })
            if (isNil(existingUser)) {
                user = await userService(log).create({
                    identityId: identity.id,
                    platformId: invitation.platformId,
                    platformRole: PlatformRole.ADMIN,
                })
            } else {
                user = existingUser
            }
        } else {
            user = await userService(log).getOrCreateWithProject({
                identity,
                platformId: invitation.platformId,
            })
        }
        await this.provisionUserInvitation({
            email: invitation.email,
            user,
        })
        return {
            registered: true,
        }
    },
    async hasAnyAcceptedInvitations({
        email,
        platformId,
    }: HasAnyAcceptedInvitationsParams): Promise<boolean> {
        const invitations = await repo().createQueryBuilder().where({
            platformId,
            status: InvitationStatus.ACCEPTED,
        }).andWhere('LOWER(user_invitation.email) = :email', { email: email.toLowerCase().trim() })
            .getMany()
        return invitations.length > 0
    },
    async getAcceptedInvitationsByEmail({
        email,
        platformId,
    }: HasAnyAcceptedInvitationsParams): Promise<UserInvitation[]> {
        return repo().createQueryBuilder('user_invitation')
            .where('LOWER("user_invitation"."email") = :email', { email: email.toLowerCase().trim() })
            .andWhere({
                platformId,
                status: InvitationStatus.ACCEPTED,
            })
            .getMany()
    },
    async getAcceptedInvitationsByEmailWithoutPlatform({
        email,
    }: { email: string }): Promise<UserInvitation[]> {
        return repo().createQueryBuilder('user_invitation')
            .where('LOWER("user_invitation"."email") = :email', { email: email.toLowerCase().trim() })
            .andWhere({
                status: InvitationStatus.ACCEPTED,
            })
            .getMany()
    },
    async getByEmailAndPlatformIdOrThrow({
        email,
        platformId,
        projectId,
    }: GetOneByPlatformIdAndEmailParams): Promise<UserInvitation | null> {
        return repo().findOneBy({
            email,
            platformId,
            projectId: isNil(projectId) ? IsNull() : projectId,
        })
    },
})


async function generateInvitationLink(userInvitation: UserInvitation, expireyInSeconds: number): Promise<string> {
    const token = await jwtUtils.sign({
        payload: {
            id: userInvitation.id,
        },
        expiresInSeconds: expireyInSeconds,
        key: await jwtUtils.getJwtSecret(),
    })

    return domainHelper.getPublicUrl({
        platformId: userInvitation.platformId,
        path: `invitation?token=${token}&email=${encodeURIComponent(userInvitation.email)}`,
    })
}
const enrichWithInvitationLink = async (userInvitation: UserInvitation, expireyInSeconds: number, log: FastifyBaseLogger) => {
    const invitationLink = await generateInvitationLink(userInvitation, expireyInSeconds)
    if (!smtpEmailSender(log).isSmtpConfigured()) {
        return {
            ...userInvitation,
            link: invitationLink,
        }
    }
    await emailService(log).sendInvitation({
        userInvitation,
        invitationLink,
    })
    return userInvitation
}
type ListUserParams = {
    platformId: string
    type: InvitationType
    projectId: string | null
    status?: InvitationStatus
    limit: number
    cursor: string | null
}

type HasAnyAcceptedInvitationsParams = {
    email: string
    platformId: string
}
type ProvisionUserInvitationParams = {
    user: User
    email: string
}

type PlatformAndIdParams = {
    id: string
    platformId: string
}
export type UserInvitationToken = {
    id: string
}

type AcceptParams = {
    invitationId: string
    platformId: string
}

type CreateParams = {
    email: string
    platformId: string
    platformRole: PlatformRole | null
    projectId: string | null
    status: InvitationStatus
    type: InvitationType
    projectRoleId: string | null
    organizationId: string | null
    environment: string | null
    invitationExpirySeconds: number
}



type GetOneByPlatformIdAndEmailParams = {
    email: string
    platformId: string
    projectId: string | null
}