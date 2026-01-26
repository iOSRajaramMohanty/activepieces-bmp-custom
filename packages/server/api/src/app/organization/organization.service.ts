import { databaseConnection } from '../database/database-connection'
import { OrganizationEntity } from './organization.entity'
import { Organization, apId, SeekPage } from '@activepieces/shared'
import { ActivepiecesError, ErrorCode } from '@activepieces/shared'

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
        const { platformId, limit = 50, cursor, userId, userOrganizationId, userPlatformRole } = params

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
        await databaseConnection().getRepository(OrganizationEntity).delete(id)
    },

    async getOrCreate(params: CreateOrganizationParams): Promise<Organization> {
        const existing = await this.getByNameAndPlatform(params.name, params.platformId)
        
        if (existing) {
            return existing
        }

        return await this.create(params)
    },
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
}
