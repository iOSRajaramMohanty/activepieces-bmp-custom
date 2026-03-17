/**
 * BMP Entity - Account Switching Activity
 * This entity is part of the BMP (Business Process Management) extension.
 * Entity definition kept in core for TypeORM compilation compatibility.
 */
import { EntitySchema } from 'typeorm'
import {
    BaseColumnSchemaPart,
    ApIdSchema,
} from '../database/database-common'

export type AccountSwitchingActivitySchema = {
    id: string
    created: Date
    updated: Date
    originalUserId: string
    switchedToUserId: string
    switchType: 'SUPER_ADMIN_TO_OWNER' | 'OWNER_TO_ADMIN'
    originalUserEmail: string
    switchedToUserEmail: string
    originalPlatformId: string | null
    switchedToPlatformId: string
}

export const AccountSwitchingActivityEntity = new EntitySchema<AccountSwitchingActivitySchema>({
    name: 'account_switching_activity',
    columns: {
        ...BaseColumnSchemaPart,
        originalUserId: {
            ...ApIdSchema,
            nullable: false,
        },
        switchedToUserId: {
            ...ApIdSchema,
            nullable: false,
        },
        switchType: {
            type: String,
            nullable: false,
        },
        originalUserEmail: {
            type: String,
            nullable: false,
        },
        switchedToUserEmail: {
            type: String,
            nullable: false,
        },
        originalPlatformId: {
            ...ApIdSchema,
            nullable: true,
        },
        switchedToPlatformId: {
            ...ApIdSchema,
            nullable: false,
        },
    },
    indices: [
        {
            name: 'idx_account_switching_activity_original_user_id',
            columns: ['originalUserId'],
        },
        {
            name: 'idx_account_switching_activity_switched_to_user_id',
            columns: ['switchedToUserId'],
        },
        {
            name: 'idx_account_switching_activity_created',
            columns: ['created'],
        },
    ],
})
