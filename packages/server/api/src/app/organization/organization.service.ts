import { databaseConnection } from '../database/database-connection'
import { OrganizationEntity } from './organization.entity'
import { OrganizationEnvironmentEntity } from './organization-environment.entity'
import {
    ActivepiecesError,
    ErrorCode,
    InvitationStatus,
    Organization,
    PlatformRole,
    SeekPage,
    apId,
} from '@activepieces/shared'
import { UserEntity } from '../user/user-entity'
import { AppConnectionEntity } from '../app-connection/app-connection.entity'
import { In, IsNull, Like, Not } from 'typeorm'
import { UserInvitationEntity } from '../user-invitations/user-invitation.entity'
import { FlowEntity } from '../flows/flow/flow.entity'
import { ProjectEntity } from '../project/project-entity'
import pino from 'pino'
import { userService } from '../user/user-service'

const serviceLogger = pino({ level: 'info' })

export const organizationService = {
    async create(params: CreateOrganizationParams): Promise<Organization> {
        const { name, platformId } = params

        // Check if organization with same name already exists in platform
        const existingOrg = await databaseConnection().getRepository(OrganizationEntity).findOneBy({
            name,
            platformId,
        })

        if (existingOrg) {
            throw new ActivepiecesError({
                code: ErrorCode.VALIDATION,
                params: {
                    message: `Organization "${name}" already exists in this platform`,
                },
            })
        }

        const newOrganization: Partial<Organization> = {
            id: apId(),
            name,
            platformId,
            metadata: {},
        }

        return await databaseConnection().getRepository(OrganizationEntity).save(newOrganization)
    },

    async getById(id: string, userId?: string, userOrganizationId?: string | undefined, userPlatformRole?: string): Promise<Organization | null> {
        const organization = await databaseConnection().getRepository(OrganizationEntity).findOneBy({ id })
        
        if (!organization) {
            return null
        }

        // Check if user has access to this organization
        if (userId && userOrganizationId && userPlatformRole) {
            const isPrivileged = userPlatformRole === 'OWNER' || userPlatformRole === 'SUPER_ADMIN'
            if (!isPrivileged && organization.id !== userOrganizationId) {
                // User doesn't have access to this organization
                return null
            }
        }

        return organization
    },

    async getByNameAndPlatform(name: string, platformId: string): Promise<Organization | null> {
        return await databaseConnection().getRepository(OrganizationEntity).findOneBy({
            name,
            platformId,
        })
    },

    async list(params: ListOrganizationsParams): Promise<SeekPage<Organization>> {
        const { platformId, limit = 50, cursor, userId: _userId, userOrganizationId, userPlatformRole, availableForAdminInvite } = params

        const query = databaseConnection()
            .getRepository(OrganizationEntity)
            .createQueryBuilder('organization')
            .where('organization.platformId = :platformId', { platformId })
            .orderBy('organization.name', 'ASC')
            .take(limit + 1)

        // Filter by user's organization unless they're OWNER or SUPER_ADMIN
        const isPrivileged = userPlatformRole === 'OWNER' || userPlatformRole === 'SUPER_ADMIN'
        if (!isPrivileged && userOrganizationId) {
            query.andWhere('organization.id = :userOrganizationId', { userOrganizationId })
        }

        if (availableForAdminInvite === true) {
            const blockedIds = await getOrganizationIdsBlockedFromAdminInvite(platformId)
            if (blockedIds.length > 0) {
                query.andWhere('organization.id NOT IN (:...blockedIds)', { blockedIds })
            }
        }

        if (cursor) {
            query.andWhere('organization.id > :cursor', { cursor })
        }

        const organizations = await query.getMany()

        const hasMore = organizations.length > limit
        if (hasMore) {
            organizations.pop()
        }

        return {
            data: organizations,
            next: hasMore ? organizations[organizations.length - 1].id : null,
            previous: null,
        }
    },

    async update(id: string, updates: Partial<Organization>, userId?: string, userOrganizationId?: string | undefined, userPlatformRole?: string): Promise<Organization> {
        const organization = await this.getById(id, userId, userOrganizationId, userPlatformRole)
        
        if (!organization) {
            throw new ActivepiecesError({
                code: ErrorCode.ENTITY_NOT_FOUND,
                params: {
                    entityId: id,
                    entityType: 'organization',
                },
            })
        }

        // Additional authorization check for update
        if (userId && userOrganizationId && userPlatformRole) {
            const isPrivileged = userPlatformRole === 'OWNER' || userPlatformRole === 'SUPER_ADMIN'
            if (!isPrivileged && organization.id !== userOrganizationId) {
                throw new ActivepiecesError({
                    code: ErrorCode.ENTITY_NOT_FOUND,
                    params: {
                        entityId: id,
                        entityType: 'organization',
                    },
                })
            }
        }

        await databaseConnection().getRepository(OrganizationEntity).update(id, updates as any)
        
        return await this.getById(id, userId, userOrganizationId, userPlatformRole) as Organization
    },

    async delete(id: string): Promise<void> {
        // 1. Delete organization environments first (they reference projects)
        await databaseConnection()
            .getRepository(OrganizationEnvironmentEntity)
            .delete({ organizationId: id })

        // 2. Get all users that belong to this organization
        const usersInOrg = await databaseConnection()
            .getRepository(UserEntity)
            .find({ where: { organizationId: id } })
        
        const userIds = usersInOrg.map(u => u.id)

        if (userIds.length > 0) {
            // 3. Delete projects (and related flows) owned by users in this organization
            const projectsOwnedByOrgUsers = await databaseConnection()
                .getRepository(ProjectEntity)
                .find({ where: { ownerId: In(userIds) } })
            
            const projectIds = projectsOwnedByOrgUsers.map(p => p.id)

            if (projectIds.length > 0) {
                await databaseConnection()
                    .getRepository(FlowEntity)
                    .delete({ projectId: In(projectIds) })
                await databaseConnection()
                    .getRepository(ProjectEntity)
                    .delete({ id: In(projectIds) })
            }

            // 4. Delete app connections owned by users in this organization
            await databaseConnection()
                .getRepository(AppConnectionEntity)
                .delete({ ownerId: In(userIds) })

            // 5. Delete users and user_identity (userService deletes user, then user_identity when no other users reference it)
            for (const user of usersInOrg) {
                if (!user.platformId) {
                    await databaseConnection()
                        .getRepository(UserEntity)
                        .update({ id: user.id }, { organizationId: null as any })
                    continue
                }
                try {
                    await userService(serviceLogger).delete({ id: user.id, platformId: user.platformId })
                } catch (error: any) {
                    if (error?.message?.includes('fk_platform') || error?.code === '23503') {
                        await databaseConnection()
                            .getRepository(UserEntity)
                            .update({ id: user.id }, { organizationId: null as any })
                    } else {
                        throw error
                    }
                }
            }
        }

        // Delete all BMP auto-created app connections (externalId starts with 'bmp-auto-')
        // These connections are created automatically for users in this organization
        await databaseConnection()
            .getRepository(AppConnectionEntity)
            .delete({ externalId: Like('bmp-auto-%') })

        // Finally delete the organization itself
        await databaseConnection().getRepository(OrganizationEntity).delete(id)
    },

    async getOrCreate(params: CreateOrganizationParams): Promise<Organization> {
        const existing = await this.getByNameAndPlatform(params.name, params.platformId)
        
        if (existing) {
            return existing
        }

        return await this.create(params)
    },

    async assertOrganizationIsAvailableForAdminInvite(platformId: string, organizationId: string): Promise<void> {
        const blocked = await getOrganizationIdsBlockedFromAdminInvite(platformId)
        if (blocked.includes(organizationId)) {
            throw new ActivepiecesError({
                code: ErrorCode.VALIDATION,
                params: {
                    message: 'organizationAlreadyHasAdmin',
                },
            })
        }
    },
}

async function getOrganizationIdsBlockedFromAdminInvite(platformId: string): Promise<string[]> {
    const adminUsers = await databaseConnection()
        .getRepository(UserEntity)
        .find({
            where: {
                platformId,
                platformRole: PlatformRole.ADMIN,
                organizationId: Not(IsNull()),
            },
            select: ['organizationId'],
        })
    const fromUsers = adminUsers
        .map((u) => u.organizationId)
        .filter((id): id is string => id != null && id !== '')

    const adminInvites = await databaseConnection()
        .getRepository(UserInvitationEntity)
        .createQueryBuilder('inv')
        .where('inv.platformId = :platformId', { platformId })
        .andWhere('inv.platformRole = :adminRole', { adminRole: PlatformRole.ADMIN })
        .andWhere('inv.organizationId IS NOT NULL')
        .andWhere('inv.status IN (:...statuses)', {
            statuses: [InvitationStatus.PENDING, InvitationStatus.ACCEPTED],
        })
        .getMany()
    const fromInvites = adminInvites
        .map((inv) => inv.organizationId)
        .filter((id): id is string => id != null && id !== '')

    return [...new Set([...fromUsers, ...fromInvites])]
}

type CreateOrganizationParams = {
    name: string
    platformId: string
}

type ListOrganizationsParams = {
    platformId: string
    limit?: number
    cursor?: string | null
    userId?: string
    userOrganizationId?: string | undefined
    userPlatformRole?: string
    availableForAdminInvite?: boolean
}
