import { apId } from '@activepieces/shared'
import { FastifyBaseLogger } from 'fastify'
import { repoFactory } from '../core/db/repo-factory'
import { AccountSwitchingActivityEntity, AccountSwitchingActivitySchema } from './account-switching-activity.entity'

const repo = repoFactory<AccountSwitchingActivitySchema>(AccountSwitchingActivityEntity)

export const accountSwitchingActivityService = (log: FastifyBaseLogger) => ({
    async logActivity(params: LogActivityParams): Promise<AccountSwitchingActivitySchema> {
        const activity: AccountSwitchingActivitySchema = {
            id: apId(),
            created: new Date(),
            updated: new Date(),
            originalUserId: params.originalUserId,
            switchedToUserId: params.switchedToUserId,
            switchType: params.switchType,
            originalUserEmail: params.originalUserEmail,
            switchedToUserEmail: params.switchedToUserEmail,
            originalPlatformId: params.originalPlatformId,
            switchedToPlatformId: params.switchedToPlatformId,
        }
        
        const saved = await repo().save(activity)
        log.info({
            activityId: saved.id,
            originalUserId: params.originalUserId,
            switchedToUserId: params.switchedToUserId,
            switchType: params.switchType,
        }, '[AccountSwitchingActivity] Logged account switch')
        
        return saved
    },

    async getActivitiesByOriginalUser(originalUserId: string): Promise<AccountSwitchingActivitySchema[]> {
        return repo().find({
            where: { originalUserId },
            order: { created: 'DESC' },
        })
    },

    async getActivitiesBySwitchedToUser(switchedToUserId: string): Promise<AccountSwitchingActivitySchema[]> {
        return repo().find({
            where: { switchedToUserId },
            order: { created: 'DESC' },
        })
    },

    async getAllActivities(limit: number = 100): Promise<AccountSwitchingActivitySchema[]> {
        return repo().find({
            order: { created: 'DESC' },
            take: limit,
        })
    },
})

type LogActivityParams = {
    originalUserId: string
    switchedToUserId: string
    switchType: 'SUPER_ADMIN_TO_OWNER' | 'OWNER_TO_ADMIN'
    originalUserEmail: string
    switchedToUserEmail: string
    originalPlatformId: string | null
    switchedToPlatformId: string
}
