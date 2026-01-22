import { OrganizationEnvironment } from '@activepieces/shared'
import { EntitySchema } from 'typeorm'
import { BaseColumnSchemaPart } from '../database/database-common'

export type OrganizationEnvironmentSchema = OrganizationEnvironment

export const OrganizationEnvironmentEntity = new EntitySchema<OrganizationEnvironmentSchema>({
    name: 'organization_environment',
    columns: {
        ...BaseColumnSchemaPart,
        organizationId: {
            type: String,
            nullable: false,
        },
        environment: {
            type: String,
            nullable: false,
        },
        adminUserId: {
            type: String,
            nullable: true,
        },
        projectId: {
            type: String,
            nullable: true,
        },
        platformId: {
            type: String,
            nullable: false,
        },
    },
    indices: [
        {
            name: 'idx_org_env_organization_id',
            columns: ['organizationId'],
            unique: false,
        },
        {
            name: 'idx_org_env_unique',
            columns: ['organizationId', 'environment'],
            unique: true,
        },
        {
            name: 'idx_org_env_admin_user_id',
            columns: ['adminUserId'],
            unique: false,
        },
    ],
})
