import { Organization } from '@activepieces/shared'
import { EntitySchema } from 'typeorm'
import { BaseColumnSchemaPart } from '../database/database-common'

export type OrganizationSchema = Organization

export const OrganizationEntity = new EntitySchema<OrganizationSchema>({
    name: 'organization',
    columns: {
        ...BaseColumnSchemaPart,
        name: {
            type: String,
            nullable: false,
        },
        platformId: {
            type: String,
            nullable: false,
        },
        metadata: {
            type: 'jsonb',
            nullable: true,
        },
    },
    indices: [
        {
            name: 'idx_organization_platform_id',
            columns: ['platformId'],
            unique: false,
        },
        {
            name: 'idx_organization_platform_id_name',
            columns: ['platformId', 'name'],
            unique: true,
        },
    ],
})
