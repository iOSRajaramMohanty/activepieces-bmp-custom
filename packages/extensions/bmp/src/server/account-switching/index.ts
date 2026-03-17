/**
 * Account Switching Module - BMP Extension
 * 
 * This module provides account switching functionality for navigating between
 * user contexts (Super Admin → Owner → Admin).
 * 
 * Account Switching Flow:
 * 1. SUPER_ADMIN → OWNER: Super admin switches into a tenant owner's context
 * 2. OWNER → ADMIN: Owner switches into an admin's context within their platform
 * 
 * All switches are logged for audit purposes with the following information:
 * - Original user ID and email
 * - Target user ID and email
 * - Switch type
 * - Platform IDs involved
 * - Timestamp
 * 
 * Files location: packages/server/api/src/app/account-switching/
 * - account-switching-activity.entity.ts - TypeORM entity for tracking switches
 * - account-switching-activity.service.ts - Account switching operations
 * 
 * These files are protected from upstream merges via .gitattributes (merge=ours)
 */

// Export facade interfaces and helpers
export * from './facade'

export const ACCOUNT_SWITCHING_MODULE_PATHS = {
    entity: 'packages/server/api/src/app/account-switching/account-switching-activity.entity.ts',
    service: 'packages/server/api/src/app/account-switching/account-switching-activity.service.ts',
} as const

// Feature flag for Account Switching functionality
export const BMP_ACCOUNT_SWITCHING_ENABLED = true
