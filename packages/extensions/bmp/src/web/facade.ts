/**
 * BMP Web Facade
 * 
 * Provides utilities and type definitions for BMP web functionality.
 * This file contains helpers for components that have BMP code mixed with core.
 */

/**
 * Platform roles with BMP extensions
 */
export const BMP_PLATFORM_ROLES = {
    SUPER_ADMIN: 'SUPER_ADMIN',
    OWNER: 'OWNER',
    ADMIN: 'ADMIN',
    OPERATOR: 'OPERATOR',
    MEMBER: 'MEMBER',
} as const

export type BmpPlatformRole = typeof BMP_PLATFORM_ROLES[keyof typeof BMP_PLATFORM_ROLES]

/**
 * Check if role is a privileged BMP role (SUPER_ADMIN or OWNER)
 */
export function isPrivilegedRole(role: string | undefined): boolean {
    return role === BMP_PLATFORM_ROLES.SUPER_ADMIN || role === BMP_PLATFORM_ROLES.OWNER
}

/**
 * Check if role is SUPER_ADMIN
 */
export function isSuperAdmin(role: string | undefined): boolean {
    return role === BMP_PLATFORM_ROLES.SUPER_ADMIN
}

/**
 * Check if role is OWNER
 */
export function isOwner(role: string | undefined): boolean {
    return role === BMP_PLATFORM_ROLES.OWNER
}

/**
 * Account switch types for session management
 */
export const ACCOUNT_SWITCH_TYPES = {
    SUPER_ADMIN_TO_OWNER: 'SUPER_ADMIN_TO_OWNER',
    OWNER_TO_ADMIN: 'OWNER_TO_ADMIN',
} as const

export type AccountSwitchType = typeof ACCOUNT_SWITCH_TYPES[keyof typeof ACCOUNT_SWITCH_TYPES]

/**
 * Get default route based on platform role
 */
export function getDefaultRouteForRole(role: string | undefined): string {
    switch (role) {
        case BMP_PLATFORM_ROLES.SUPER_ADMIN:
            return '/super-admin'
        case BMP_PLATFORM_ROLES.OWNER:
            return '/owner-dashboard'
        default:
            return '/flows'
    }
}

/**
 * Check if sidebar should show BMP-specific items
 */
export function shouldShowBmpSidebarItems(role: string | undefined): boolean {
    return isPrivilegedRole(role)
}

/**
 * Get sidebar items for BMP roles
 */
export function getBmpSidebarItems(role: string | undefined): string[] {
    if (role === BMP_PLATFORM_ROLES.SUPER_ADMIN) {
        return ['owner-dashboard', 'users', 'setup', 'organizations', 'infrastructure']
    }
    if (role === BMP_PLATFORM_ROLES.OWNER) {
        return ['users', 'projects', 'organizations']
    }
    return []
}

/**
 * Files that have BMP modifications mixed with core code
 */
export const BMP_MIXED_WEB_FILES = {
    authenticationSession: 'packages/web/src/lib/authentication-session.ts',
    platformRoutes: 'packages/web/src/app/routes/platform-routes.tsx',
    platformDefaultRoute: 'packages/web/src/app/guards/platform-default-route.tsx',
    sidebarUser: 'packages/web/src/app/components/sidebar/sidebar-user.tsx',
    inviteUserDialog: 'packages/web/src/features/members/components/invite-user/invite-user-dialog.tsx',
    propertiesUtils: 'packages/web/src/app/builder/piece-properties/properties-utils.tsx',
    appConnectionsHooks: 'packages/web/src/features/connections/hooks/app-connections-hooks.ts',
    globalConnectionsHooks: 'packages/web/src/features/connections/hooks/global-connections-hooks.ts',
} as const

// Feature flag
export const BMP_WEB_FACADE_ENABLED = true
