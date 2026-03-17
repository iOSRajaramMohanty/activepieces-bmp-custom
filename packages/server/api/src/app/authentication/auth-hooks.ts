import { PlatformRole } from '@activepieces/shared'
import { hooksFactory } from '../helper/hooks-factory'

/**
 * Auth Hooks Interface
 * 
 * Defines extension points for authentication-related functionality.
 * BMP extension overrides these hooks to add SUPER_ADMIN/OWNER role handling.
 */
export type AuthHooks = {
    /**
     * Check if a platform role is considered "privileged"
     * Privileged roles have elevated access (e.g., can see all organizations)
     * 
     * Default: Only ADMIN is privileged
     * BMP Override: SUPER_ADMIN and OWNER are also privileged
     */
    isPrivilegedRole(platformRole: PlatformRole | string | undefined): boolean

    /**
     * Get the default route for a user based on their role
     * 
     * Default: /flows for all users
     * BMP Override: Different routes for SUPER_ADMIN and OWNER
     */
    getDefaultRoute(platformRole: PlatformRole | string | undefined): string

    /**
     * Check if a user should skip project membership checks
     * Some roles (like SUPER_ADMIN) operate without project context
     * 
     * Default: false
     * BMP Override: true for SUPER_ADMIN
     */
    shouldSkipProjectCheck(platformRole: PlatformRole | string | undefined): boolean
}

/**
 * Default auth hooks (community edition behavior)
 * Only ADMIN is considered privileged, all users go to /flows
 */
export const authHooks = hooksFactory.create<AuthHooks>(_log => ({
    isPrivilegedRole: (platformRole: PlatformRole | string | undefined) => {
        return platformRole === PlatformRole.ADMIN
    },
    getDefaultRoute: (_platformRole: PlatformRole | string | undefined) => {
        return '/flows'
    },
    shouldSkipProjectCheck: (_platformRole: PlatformRole | string | undefined) => {
        return false
    },
}))
