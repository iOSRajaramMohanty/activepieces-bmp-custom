/**
 * Cloud OAuth Entity - cloud_oauth_app
 *
 * Entity is stored in core so TypeORM compilation can find it within the
 * server package `rootDir`.
 *
 * Sensitive `clientSecret` is stored encrypted inside a JSONB column.
 */
import { EntitySchema } from 'typeorm'
import { BaseColumnSchemaPart } from '../database/database-common'

export type CloudOAuthAppSchema = {
    id: string
    created: Date
    updated: Date
    pieceName: string
    clientId: string
    // Encrypted object: { iv, data }
    clientSecret: { iv: string, data: string }
}

export const CloudOAuthAppEntity = new EntitySchema<CloudOAuthAppSchema>({
    name: 'cloud_oauth_app',
    columns: {
        ...BaseColumnSchemaPart,
        pieceName: {
            type: String,
            nullable: false,
        },
        clientId: {
            type: String,
            nullable: false,
        },
        clientSecret: {
            type: 'jsonb',
            nullable: false,
        },
    },
    indices: [
        {
            name: 'uq_cloud_oauth_app_piece_name',
            columns: ['pieceName'],
            unique: true,
        },
    ],
})

