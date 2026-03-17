/**
 * Account Switching Module Facade
 * 
 * Provides a facade for accessing account switching functionality from the BMP extension.
 * The actual implementation remains in packages/server/api/src/app/account-switching/
 * 
 * Account Switching Flow:
 * 1. SUPER_ADMIN → OWNER: Super admin switches into a tenant owner's context
 * 2. OWNER → ADMIN: Owner switches into an admin's context within their platform
 * 
 * All switches are logged for audit purposes.
 */

// Use a generic logger type to avoid fastify dependency
type Logger = {
    info: (obj: unknown, msg?: string) => void
    error: (obj: unknown, msg?: string) => void
    warn: (obj: unknown, msg?: string) => void
    debug: (obj: unknown, msg?: string) => void
}

/**
 * Account switch types
 */
export type AccountSwitchType = 'SUPER_ADMIN_TO_OWNER' | 'OWNER_TO_ADMIN'

/**
 * Account switching activity record
 */
export interface AccountSwitchingActivity {
    id: string
    created: Date
    updated: Date
    originalUserId: string
    switchedToUserId: string
    switchType: AccountSwitchType
    originalUserEmail: string
    switchedToUserEmail: string
    originalPlatformId: string | null
    switchedToPlatformId: string
}

/**
 * Parameters for logging an account switch
 */
export interface LogActivityParams {
    originalUserId: string
    switchedToUserId: string
    switchType: AccountSwitchType
    originalUserEmail: string
    switchedToUserEmail: string
    originalPlatformId: string | null
    switchedToPlatformId: string
}

/**
 * Account switching service interface
 */
export interface AccountSwitchingServiceInterface {
    logActivity(params: LogActivityParams): Promise<AccountSwitchingActivity>
    getActivitiesByOriginalUser(originalUserId: string): Promise<AccountSwitchingActivity[]>
    getActivitiesBySwitchedToUser(switchedToUserId: string): Promise<AccountSwitchingActivity[]>
    getAllActivities(limit?: number): Promise<AccountSwitchingActivity[]>
}

/**
 * Check if account switching is enabled
 */
export function isAccountSwitchingEnabled(): boolean {
    return process.env.AP_BMP_ENABLED === 'true' && 
           process.env.AP_BMP_ACCOUNT_SWITCHING !== 'false'
}

/**
 * Validate a switch type
 */
export function isValidSwitchType(switchType: string): switchType is AccountSwitchType {
    return switchType === 'SUPER_ADMIN_TO_OWNER' || switchType === 'OWNER_TO_ADMIN'
}

/**
 * Get the reverse switch type (for switching back)
 */
export function getReverseSwitchType(switchType: AccountSwitchType): AccountSwitchType | null {
    switch (switchType) {
        case 'SUPER_ADMIN_TO_OWNER':
            return null // Super admin doesn't need to switch back
        case 'OWNER_TO_ADMIN':
            return null // Owner doesn't need to switch back via this mechanism
        default:
            return null
    }
}
