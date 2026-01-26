import { databaseConnection } from '../database/database-connection'
import { OrganizationEnvironmentEntity } from './organization-environment.entity'
import { UserIdentityEntity } from '../authentication/user-identity/user-identity-entity'
import { 
    OrganizationEnvironment, 
    EnvironmentType, 
    apId,
    CheckAdminAvailabilityResponse,
    ActivepiecesError,
    ErrorCode,
} from '@activepieces/shared'

export const organizationEnvironmentService = {
    async create(params: CreateOrganizationEnvironmentParams): Promise<OrganizationEnvironment> {
        const { organizationId, environment, platformId, adminUserId, projectId } = params

        // Check if this org-env combination already exists
        const existing = await this.getByOrgAndEnv(organizationId, environment)
        
        if (existing) {
            throw new ActivepiecesError({
                code: ErrorCode.VALIDATION,
                params: {
                    message: `Environment ${environment} already exists for this organization`,
                },
            })
        }

        const newOrgEnv: Partial<OrganizationEnvironment> = {
            id: apId(),
            organizationId,
            environment,
            platformId,
            adminUserId: adminUserId || undefined,
            projectId: projectId || undefined,
            metadata: {},
        }

        return await databaseConnection()
            .getRepository(OrganizationEnvironmentEntity)
            .save(newOrgEnv)
    },

    async getById(id: string): Promise<OrganizationEnvironment | null> {
        return await databaseConnection()
            .getRepository(OrganizationEnvironmentEntity)
            .findOneBy({ id })
    },

    async getByOrgAndEnv(
        organizationId: string,
        environment: EnvironmentType
    ): Promise<OrganizationEnvironment | null> {
        return await databaseConnection()
            .getRepository(OrganizationEnvironmentEntity)
            .findOneBy({
                organizationId,
                environment,
            })
    },

    async listByOrganization(organizationId: string): Promise<OrganizationEnvironment[]> {
        const orgEnvs = await databaseConnection()
            .getRepository(OrganizationEnvironmentEntity)
            .createQueryBuilder('orgEnv')
            .leftJoin('user', 'u', 'orgEnv.adminUserId = u.id')
            .leftJoin('user_identity', 'ui', 'u.identityId = ui.id')
            .where('orgEnv.organizationId = :organizationId', { organizationId })
            .select([
                'orgEnv.id',
                'orgEnv.created',
                'orgEnv.updated',
                'orgEnv.organizationId',
                'orgEnv.environment',
                'orgEnv.adminUserId',
                'orgEnv.projectId',
                'orgEnv.platformId',
                'orgEnv.metadata',
                'ui.email as "ui_email"',
            ])
            .orderBy(
                `CASE orgEnv.environment 
                    WHEN 'Dev' THEN 1 
                    WHEN 'Staging' THEN 2 
                    WHEN 'Production' THEN 3 
                    ELSE 4 
                END`
            )
            .getRawMany()
        
        console.log('[organization-environment.service] Raw query results:', {
            count: orgEnvs.length,
            sampleKeys: orgEnvs[0] ? Object.keys(orgEnvs[0]) : [],
            sample: orgEnvs[0],
        })
        
        // Map raw results to OrganizationEnvironment objects
        // Note: getRawMany() returns columns with table alias prefix (e.g., orgEnv_id)
        return orgEnvs.map((raw: any) => {
            // TypeORM getRawMany() prefixes columns with table alias and converts to snake_case
            // So 'orgEnv.id' becomes 'orgEnv_id' in the raw result
            const env = {
                id: raw.orgEnv_id || raw.id,
                created: raw.orgEnv_created || raw.created,
                updated: raw.orgEnv_updated || raw.updated,
                organizationId: raw.orgEnv_organizationId || raw.organizationId,
                environment: raw.orgEnv_environment || raw.environment,
                adminUserId: (raw.orgEnv_adminUserId || raw.adminUserId) || undefined,
                adminEmail: raw.ui_email || undefined,
                projectId: (raw.orgEnv_projectId || raw.projectId) || undefined,
                platformId: raw.orgEnv_platformId || raw.platformId,
                metadata: raw.orgEnv_metadata || raw.metadata || undefined,
            }
            
            // Validate required fields
            if (!env.id) {
                console.error('[organization-environment.service] Missing id in raw result. Available keys:', Object.keys(raw))
                console.error('[organization-environment.service] Raw result:', raw)
                throw new Error(`Missing required field 'id' in organization environment result. Available keys: ${Object.keys(raw).join(', ')}`)
            }
            
            if (!env.created || !env.updated || !env.organizationId || !env.environment || !env.platformId) {
                console.error('[organization-environment.service] Missing required fields in result:', {
                    hasId: !!env.id,
                    hasCreated: !!env.created,
                    hasUpdated: !!env.updated,
                    hasOrganizationId: !!env.organizationId,
                    hasEnvironment: !!env.environment,
                    hasPlatformId: !!env.platformId,
                    rawKeys: Object.keys(raw),
                })
            }
            
            return env
        }) as OrganizationEnvironment[]
    },

    async update(
        id: string,
        updates: Partial<OrganizationEnvironment>
    ): Promise<OrganizationEnvironment> {
        const orgEnv = await this.getById(id)
        
        if (!orgEnv) {
            throw new ActivepiecesError({
                code: ErrorCode.ENTITY_NOT_FOUND,
                params: {
                    entityId: id,
                    entityType: 'organization_environment',
                },
            })
        }

        // Use query builder for JSONB metadata updates
        const queryBuilder = databaseConnection()
            .getRepository(OrganizationEnvironmentEntity)
            .createQueryBuilder()
            .update(OrganizationEnvironmentEntity)
            .where('id = :id', { id })

        // Build update object, handling metadata separately
        const { metadata, ...otherUpdates } = updates
        const updateData: any = { ...otherUpdates }
        
        if (metadata !== undefined) {
            updateData.metadata = metadata
        }

        queryBuilder.set(updateData)
        await queryBuilder.execute()
        
        return await this.getById(id) as OrganizationEnvironment
    },

    async upsert(params: UpsertOrganizationEnvironmentParams): Promise<OrganizationEnvironment> {
        const { organizationId, environment, platformId, adminUserId, projectId } = params

        const existing = await this.getByOrgAndEnv(organizationId, environment)

        if (existing) {
            return await this.update(existing.id, { 
                adminUserId: adminUserId ?? undefined, 
                projectId: projectId ?? undefined 
            })
        }

        return await this.create({
            organizationId,
            environment,
            platformId,
            adminUserId,
            projectId,
        })
    },

    async checkAdminAvailability(params: {
        organizationId: string
        environment: EnvironmentType
    }): Promise<CheckAdminAvailabilityResponse> {
        const { organizationId, environment } = params
        const orgEnv = await databaseConnection()
            .getRepository(OrganizationEnvironmentEntity)
            .createQueryBuilder('orgEnv')
            .leftJoinAndSelect('user', 'u', 'orgEnv.adminUserId = u.id')
            .leftJoinAndSelect('user_identity', 'ui', 'u.identityId = ui.id')
            .where('orgEnv.organizationId = :organizationId', { organizationId })
            .andWhere('orgEnv.environment = :environment', { environment })
            .select([
                'orgEnv.id',
                'orgEnv.adminUserId',
                'ui.email',
            ])
            .getRawOne()

        if (!orgEnv || !orgEnv.adminUserId) {
            return {
                available: true,
            }
        }

        return {
            available: false,
            adminUserId: orgEnv.adminUserId,
            adminEmail: orgEnv.ui_email,
        }
    },

    async delete(id: string): Promise<void> {
        await databaseConnection()
            .getRepository(OrganizationEnvironmentEntity)
            .delete(id)
    },

    async getByAdminUserId(adminUserId: string): Promise<OrganizationEnvironment | null> {
        return await databaseConnection()
            .getRepository(OrganizationEnvironmentEntity)
            .findOneBy({ adminUserId })
    },

    async getAllByPlatform(platformId: string): Promise<OrganizationEnvironment[]> {
        return await databaseConnection()
            .getRepository(OrganizationEnvironmentEntity)
            .createQueryBuilder('orgEnv')
            .where('orgEnv.platformId = :platformId', { platformId })
            .orderBy('orgEnv.organizationId', 'ASC')
            .addOrderBy(
                `CASE orgEnv.environment 
                    WHEN 'Dev' THEN 1 
                    WHEN 'Staging' THEN 2 
                    WHEN 'Production' THEN 3 
                    ELSE 4 
                END`
            )
            .getMany()
    },
}

type CreateOrganizationEnvironmentParams = {
    organizationId: string
    environment: EnvironmentType
    platformId: string
    adminUserId?: string | null
    projectId?: string | null
}

type UpsertOrganizationEnvironmentParams = {
    organizationId: string
    environment: EnvironmentType
    platformId: string
    adminUserId?: string | null
    projectId?: string | null
}
