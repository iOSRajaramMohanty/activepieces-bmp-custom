/**
 * BMP Authentication Hooks Implementation
 * 
 * Implements authentication-related hooks for BMP functionality.
 */

import type { BmpAuthHooks } from './types'

const PRIVILEGED_ROLES = ['SUPER_ADMIN', 'OWNER']

/**
 * Check if user has privileged role
 */
export const isPrivilegedRole: BmpAuthHooks['isPrivilegedRole'] = (platformRole: string): boolean => {
    return PRIVILEGED_ROLES.includes(platformRole)
}

/**
 * Auth hooks object for registration
 */
export const authHooks: Partial<BmpAuthHooks> = {
    isPrivilegedRole,
}
