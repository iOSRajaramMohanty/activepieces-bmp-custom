/**
 * BMP Auth Hooks Implementation
 * 
 * These hooks override the default auth behavior to support:
 * - SUPER_ADMIN and OWNER privileged roles
 * - Role-specific default routes
 * - Project membership bypass for super admins
 * 
 * Usage in app.ts:
 * ```typescript
 * if (bmpEnabled) {
 *   authHooks.set(bmpAuthHooks)
 * }
 * ```
 */

type Logger = {
    info: (msg: string | object, ...args: unknown[]) => void
    warn: (msg: string | object, ...args: unknown[]) => void
    error: (msg: string | object, ...args: unknown[]) => void
}

/**
 * Interface matching core AuthHooks
 */
export interface AuthHooksInterface {
    isPrivilegedRole(platformRole: string | undefined): boolean
    getDefaultRoute(platformRole: string | undefined): string
    shouldSkipProjectCheck(platformRole: string | undefined): boolean
}

const PRIVILEGED_ROLES = ['SUPER_ADMIN', 'OWNER', 'ADMIN']
const SUPER_ADMIN_ROLES = ['SUPER_ADMIN']

/**
 * BMP Auth Hooks Creator
 * 
 * Returns auth hooks with BMP-specific behavior:
 * - SUPER_ADMIN, OWNER, and ADMIN are privileged
 * - SUPER_ADMIN goes to /platform/super-admin
 * - OWNER goes to /platform/owner-dashboard  
 * - SUPER_ADMIN skips project checks
 */
export const bmpAuthHooks = (_log: Logger): AuthHooksInterface => ({
    isPrivilegedRole: (platformRole: string | undefined): boolean => {
        if (!platformRole) return false
        return PRIVILEGED_ROLES.includes(platformRole)
    },

    getDefaultRoute: (platformRole: string | undefined): string => {
        if (platformRole === 'SUPER_ADMIN') {
            return '/platform/super-admin'
        }
        if (platformRole === 'OWNER') {
            return '/platform/owner-dashboard'
        }
        return '/flows'
    },

    shouldSkipProjectCheck: (platformRole: string | undefined): boolean => {
        if (!platformRole) return false
        return SUPER_ADMIN_ROLES.includes(platformRole)
    },
})
