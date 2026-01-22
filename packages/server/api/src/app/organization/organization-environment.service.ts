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

    async listByOrganization(organizationId: string): Promise<any[]> {
        const orgEnvs = await databaseConnection()
            .getRepository(OrganizationEnvironmentEntity)
            .createQueryBuilder('orgEnv')
            .leftJoin('user', 'u', 'orgEnv.adminUserId = u.id')
            .leftJoin('user_identity', 'ui', 'u.identityId = ui.id')
            .where('orgEnv.organizationId = :organizationId', { organizationId })
            .select([
                'orgEnv.id as id',
                'orgEnv.created as created',
                'orgEnv.updated as updated',
                'orgEnv.organizationId as "organizationId"',
                'orgEnv.environment as environment',
                'orgEnv.adminUserId as "adminUserId"',
                'orgEnv.projectId as "projectId"',
                'orgEnv.platformId as "platformId"',
                'ui.email as "adminEmail"',
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
        
        return orgEnvs
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

        await databaseConnection()
            .getRepository(OrganizationEnvironmentEntity)
            .update(id, updates)
        
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
