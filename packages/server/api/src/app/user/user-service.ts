import {
    ActivepiecesError,
    ApEdition,
    apId,
    assertNotNullOrUndefined,
    Cursor,
    ErrorCode,
    isNil,
    PlatformId,
    PlatformRole,
    ProjectId,
    ProjectType,
    SeekPage,
    spreadIfDefined,
    User,
    UserId,
    UserIdentity,
    UserStatus,
    UserWithBadges,
    UserWithMetaInformation,
} from '@activepieces/shared'
import dayjs from 'dayjs'
import { In } from 'typeorm'
import { userIdentityService } from '../authentication/user-identity/user-identity-service'
import { databaseConnection } from '../database/database-connection'
import { repoFactory } from '../core/db/repo-factory'
import { platformProjectService } from '../ee/projects/platform-project-service'
import { projectMemberRepo } from '../ee/projects/project-role/project-role.service'
import { buildPaginator } from '../helper/pagination/build-paginator'
import { paginationHelper } from '../helper/pagination/pagination-utils'
import { system } from '../helper/system/system'
import { platformService } from '../platform/platform.service'
import { projectService } from '../project/project-service'
import { organizationService } from '../organization/organization.service'
import { UserEntity, UserSchema } from './user-entity'


export const userRepo = repoFactory(UserEntity)

export const userService = {
    async create(params: CreateParams): Promise<User> {
        const user: NewUser = {
            id: apId(),
            identityId: params.identityId,
            platformRole: params.platformRole,
            status: UserStatus.ACTIVE,
            externalId: params.externalId,
            platformId: params.platformId,
        }
        return userRepo().save(user)
    },
    async getOrCreateWithProject({ identity, platformId, platformRole }: GetOrCreateWithProjectParams): Promise<User> {
        const user = await this.getOneByIdentityAndPlatform({
            identityId: identity.id,
            platformId,
        })
        if (isNil(user)) {
            const newUser = await this.create({
                identityId: identity.id,
                platformId,
                platformRole: platformRole ?? PlatformRole.MEMBER,
            })

            // Only create personal project for ADMIN users
            // Operators, Members, Owners, and Super Admins should not have personal projects
            // They will use admin's personal projects instead
            if (newUser.platformRole === PlatformRole.ADMIN) {
                await projectService.create({
                    displayName: identity.firstName + '\'s Project',
                    ownerId: newUser.id,
                    platformId,
                    type: ProjectType.PERSONAL,
                })
            }
            return newUser
        }
        return user
    },
    async updateLastActiveDate({ id }: UpdateLastActiveDateParams): Promise<void> {
        await userRepo().update({ id }, { lastActiveDate: dayjs().toISOString() })
    },
    async update({ id, status, platformId, platformRole, externalId, organizationId }: UpdateParams): Promise<UserWithMetaInformation> {
        const user = await this.getOrThrow({ id })
        assertNotNullOrUndefined(user.platformId, 'platformId')

        if (user.platformId !== platformId) {
            throw new ActivepiecesError({
                code: ErrorCode.ENTITY_NOT_FOUND,
                params: {
                    entityType: 'user',
                    entityId: id,
                },
            })
        }

        const platform = await platformService.getOneOrThrow(user.platformId)
        if (platform.ownerId === user.id && status === UserStatus.INACTIVE) {
            throw new ActivepiecesError({
                code: ErrorCode.VALIDATION,
                params: {
                    message: 'Admin cannot be deactivated',
                },
            })
        }

        await userRepo().update({
            id,
            platformId,
        }, {
            ...spreadIfDefined('status', status),
            ...spreadIfDefined('platformRole', platformRole),
            ...spreadIfDefined('externalId', externalId),
            ...spreadIfDefined('organizationId', organizationId),
        })

        return this.getMetaInformation({ id })
    },
    async getUsersByIdentityId({ identityId }: GetUsersByIdentityIdParams): Promise<Pick<User, 'id' | 'platformId'>[]> {
        return userRepo().find({ where: { identityId } }).then((users) => users.map((user) => ({ id: user.id, platformId: user.platformId })))
    },
    async list({ platformId, externalId, cursorRequest, limit, currentUserId, currentUserRole }: ListParams): Promise<SeekPage<UserWithMetaInformation>> {
        const decodedCursor = paginationHelper.decodeCursor(cursorRequest)
        const paginator = buildPaginator({
            entity: UserEntity,
            query: {
                limit,
                afterCursor: decodedCursor.nextCursor,
                beforeCursor: decodedCursor.previousCursor,
            },
        })
        
        const queryBuilder = userRepo().createQueryBuilder('user').where({
            platformId,
            ...spreadIfDefined('externalId', externalId),
        })
        
        // Apply role-based filtering for user list visibility
        // OWNER (tenant): Can see all users in the platform
        // ADMIN (sub-owner): Can only see users who are members of their personal project (their operators/members)
        // OPERATOR/MEMBER: Should not access this endpoint (controlled by security)
        if (currentUserRole === PlatformRole.ADMIN && currentUserId) {
            // ADMIN can only see:
            // 1. Themselves
            // 2. OPERATORS/MEMBERS who are members of their personal project
            
            // First, get the admin's personal project
            const adminProject = await projectService.getOneByOwnerAndPlatform({
                ownerId: currentUserId,
                platformId,
            })
            
            if (adminProject) {
                // Get user IDs who are members of this project
                const projectMemberUserIds = await databaseConnection().createQueryBuilder()
                    .select('pm."userId"')
                    .from('project_member', 'pm')
                    .where('pm."projectId" = :projectId', { projectId: adminProject.id })
                    .getRawMany()
                
                const memberUserIds = projectMemberUserIds.map((pm: any) => pm.userId)
                
                // Filter to show only: the admin themselves + their project members
                queryBuilder.andWhere('user.id IN (:...userIds)', { 
                    userIds: [currentUserId, ...memberUserIds] 
                })
            } else {
                // If admin has no project, only show themselves
                queryBuilder.andWhere('user.id = :currentUserId', { currentUserId })
            }
        }
        
        const { data, cursor } = await paginator.paginate(queryBuilder)

        const usersWithMetaInformation = await Promise.all(data.map(this.getMetaInformation))
        return paginationHelper.createPage<UserWithMetaInformation>(usersWithMetaInformation, cursor)
    },
    async getOneByIdentityIdOnly({ identityId }: GetOneByIdentityIdOnlyParams): Promise<User | null> {
        return userRepo().findOneBy({ identityId })
    },
    async getByIdentityId({ identityId }: GetByIdentityId): Promise<UserSchema[]> {
        return userRepo().find({ where: { identityId } })
    },
    async getOneByIdentityAndPlatform({ identityId, platformId }: GetOneByIdentityIdParams): Promise<User | null> {
        return userRepo().findOneBy({ identityId, platformId })
    },
    async get({ id }: IdParams): Promise<User | null> {
        return userRepo().findOneBy({ id })
    },
    async getOrThrow({ id }: IdParams): Promise<User> {
        const user = await userRepo().findOneBy({ id })
        if (isNil(user)) {
            throw new ActivepiecesError({
                code: ErrorCode.ENTITY_NOT_FOUND,
                params: { entityType: 'user', entityId: id },
            })
        }
        return user
    },
    async getOneOrFail({ id }: IdParams): Promise<User> {
        if (!id) {
            throw new Error('User ID is required for getOneOrFail')
        }
        return userRepo().findOneOrFail({ where: { id } })
    },
    async getOneByIdAndPlatformIdOrThrow({ id, platformId }: GetOneByIdAndPlatformIdParams): Promise<UserWithBadges> {
        const user = await userRepo().findOne({ where: { id, platformId }, relations: { badges: true } })
        if (isNil(user)) {
            throw new ActivepiecesError({
                code: ErrorCode.ENTITY_NOT_FOUND,
                params: { entityType: 'user', entityId: id },
            })
        }
        const meta = await this.getMetaInformation({ id })
        return {
            ...meta,
            badges: user.badges.map((badge) => ({
                name: badge.name,
                created: badge.created,
            })),
        }
    },
    async delete({ id, platformId }: DeleteParams): Promise<void> {
        // Check if the user being deleted is an ADMIN
        const userToDelete = await userRepo().findOne({
            where: { id, platformId },
        })

        if (!userToDelete) {
            return
        }

        // Store the identityId before deleting the user
        const identityId = userToDelete.identityId

        // If deleting an ADMIN (sub-owner), delete ONLY their personal project and associated data
        // Do NOT delete other ADMINs or their operators/members - each ADMIN is isolated
        if (userToDelete.platformRole === PlatformRole.ADMIN) {
            // Get the admin's personal project(s)
            const { ProjectEntity } = await import('../project/project-entity')
            const projectRepo = repoFactory(ProjectEntity)
            const adminProjects = await projectRepo().find({
                where: { ownerId: id, platformId },
            })

            // Delete all projects owned by this admin
            // This must be done BEFORE deleting the user due to foreign key constraints
            for (const project of adminProjects) {
                // Delete organization-environment record if exists
                const { OrganizationEnvironmentEntity } = await import('../organization/organization-environment.entity')
                const orgEnvRepo = repoFactory(OrganizationEnvironmentEntity)
                await orgEnvRepo().delete({ projectId: project.id })
                
                // Delete the project (this will cascade delete flows, connections, etc.)
                await projectRepo().delete({ id: project.id })
            }
        }

        // Delete the user record (ADMIN, OPERATOR, or MEMBER)
        // IMPORTANT about what gets deleted:
        // - flows created by the user - flows belong to the project, not the user (already deleted with project)
        // - project_member entries are automatically CASCADE deleted by the database
        await userRepo().delete({
            id,
            platformId,
        })

        // Delete user_identity only if no other users reference it (same identity can exist on multiple platforms)
        if (identityId) {
            const otherUsersWithSameIdentity = await userRepo().count({
                where: { identityId },
            })
            if (otherUsersWithSameIdentity === 0) {
                await userIdentityService(system.globalLogger()).delete({ id: identityId })
            }
        }
    },

    async getByPlatformRole(id: PlatformId, role: PlatformRole): Promise<UserSchema[]> {
        return userRepo().find({ where: { platformId: id, platformRole: role }, relations: { identity: true } })
    },
    async listProjectUsers({ platformId, projectId }: ListUsersForProjectParams): Promise<UserWithMetaInformation[]> {
        const users = await getUsersForProject(platformId, projectId)
        const usersWithMetaInformation = await userRepo().find({ where: { platformId, id: In(users) }, relations: { identity: true } }).then((users) => users.map(this.getMetaInformation))
        return Promise.all(usersWithMetaInformation)
    },
    async getByPlatformAndExternalId({
        platformId,
        externalId,
    }: GetByPlatformAndExternalIdParams): Promise<User | null> {
        return userRepo().findOneBy({
            platformId,
            externalId,
        })
    },
    async getMetaInformation({ id }: IdParams): Promise<UserWithMetaInformation> {
        const user = await userRepo().findOneByOrFail({ id })
        const identity = await userIdentityService(system.globalLogger()).getBasicInformation(user.identityId)
        
        // Fetch organization name and environment if organizationId exists
        let organizationName: string | null = null
        let environment: string | null = null
        
        if (user.organizationId) {
            // For getMetaInformation, we need to fetch organization without access control restrictions
            // since this is used internally to enrich user data. Use a direct database query.
            try {
                const { OrganizationEntity } = await import('../organization/organization.entity')
                const orgRepo = repoFactory(OrganizationEntity)
                const organization = await orgRepo().findOneBy({ id: user.organizationId })
                organizationName = organization?.name || null
            } catch (error) {
                // If organization fetch fails, log but don't throw - organizationName will remain null
                const errorMessage = error instanceof Error ? error.message : String(error)
                system.globalLogger().warn(`Failed to fetch organization ${user.organizationId} for user ${user.id}: ${errorMessage}`)
            }
            
            // Fetch environment from organization_environment table
            const { OrganizationEnvironmentEntity } = await import('../organization/organization-environment.entity')
            const orgEnvRepo = repoFactory(OrganizationEnvironmentEntity)
            
            if (user.platformRole === PlatformRole.ADMIN) {
                // For admins, find their environment directly
                const orgEnv = await orgEnvRepo().findOne({
                    where: { adminUserId: user.id },
                })
                environment = orgEnv?.environment || null
            } else if (user.platformRole === PlatformRole.OPERATOR || user.platformRole === PlatformRole.MEMBER) {
                // For operators/members, find their admin's environment via project membership
                const { ProjectMemberEntity } = await import('../ee/projects/project-members/project-member.entity')
                const { ProjectEntity } = await import('../project/project-entity')
                const projectMemberRepo = repoFactory(ProjectMemberEntity)
                const projectRepo = repoFactory(ProjectEntity)
                
                // Find the project this operator/member belongs to
                const membership = await projectMemberRepo().findOne({
                    where: { userId: user.id },
                })
                
                if (membership) {
                    // Find the project and its owner (admin)
                    const project = await projectRepo().findOne({
                        where: { id: membership.projectId },
                    })
                    
                    if (project) {
                        // Find the admin's environment
                        const orgEnv = await orgEnvRepo().findOne({
                            where: { adminUserId: project.ownerId },
                        })
                        environment = orgEnv?.environment || null
                    }
                }
            }
        }
        
        return {
            id: user.id,
            email: identity.email,
            firstName: identity.firstName,
            lastName: identity.lastName,
            platformId: user.platformId,
            platformRole: user.platformRole,
            status: user.status,
            externalId: user.externalId,
            created: user.created,
            updated: user.updated,
            lastActiveDate: user.lastActiveDate,
            imageUrl: identity.imageUrl,
            organizationId: user.organizationId,
            organizationName,
            environment,
        }
    },

    async addOwnerToPlatform({
        id,
        platformId,
    }: UpdatePlatformIdParams): Promise<void> {
        // Get current user to preserve their role (especially for OWNER role)
        const user = await userRepo().findOneByOrFail({ id })
        await userRepo().update(id, {
            updated: dayjs().toISOString(),
            // Preserve OWNER role if it exists, otherwise set to ADMIN
            platformRole: user.platformRole === PlatformRole.OWNER ? PlatformRole.OWNER : PlatformRole.ADMIN,
            platformId,
        })
    },

    isUserPrivileged(user: User): boolean {
        // Only OWNER and SUPER_ADMIN are privileged and can see all projects in their platform without filters
        return user.platformRole === PlatformRole.OWNER || user.platformRole === PlatformRole.SUPER_ADMIN
    },
}


async function getUsersForProject(platformId: PlatformId, projectId: string): Promise<UserId[]> {
    const platformAdmins = await userRepo().find({ where: { platformId, platformRole: PlatformRole.ADMIN } }).then((users) => users.map((user) => user.id))
    const edition = system.getEdition()
    if (edition === ApEdition.COMMUNITY) {
        return platformAdmins
    }
    const projectMembers = await projectMemberRepo().find({ where: { projectId, platformId } }).then((members) => members.map((member) => member.userId))
    return [...platformAdmins, ...projectMembers]
}

type UpdateLastActiveDateParams = {
    id: UserId
}

type GetOneByIdAndPlatformIdParams = {
    id: UserId
    platformId: PlatformId
}
type ListUsersForProjectParams = {
    projectId: ProjectId
    platformId: PlatformId
}

type DeleteParams = {
    id: UserId
    platformId: PlatformId
}


type ListParams = {
    platformId: PlatformId
    externalId?: string
    cursorRequest: Cursor
    limit?: number
    currentUserId?: UserId
    currentUserRole?: PlatformRole
}

type GetOneByIdentityIdOnlyParams = {
    identityId: string
}

type GetByIdentityId = {
    identityId: string
}


type GetOneByIdentityIdParams = {
    identityId: string
    platformId: PlatformId
}

type UpdateParams = {
    id: UserId
    status?: UserStatus
    platformId: PlatformId
    platformRole?: PlatformRole
    externalId?: string
    organizationId?: string
}

type CreateParams = {
    identityId: string
    platformId: string | null
    externalId?: string
    platformRole: PlatformRole
}
type GetUsersByIdentityIdParams = {
    identityId: string
}

type NewUser = Omit<User, 'created' | 'updated'>

type GetByPlatformAndExternalIdParams = {
    platformId: string
    externalId: string
}

type IdParams = {
    id: UserId
}

type UpdatePlatformIdParams = {
    id: UserId
    platformId: string
}

type GetOrCreateWithProjectParams = {
    identity: UserIdentity
    platformId: string
    platformRole?: PlatformRole
}