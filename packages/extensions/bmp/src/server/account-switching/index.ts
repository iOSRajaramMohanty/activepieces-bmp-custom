/**
 * Account Switching Module - BMP Extension
 * 
 * This module provides account switching functionality for navigating between
 * user contexts (Super Admin → Owner → Admin).
 * 
 * Files location: packages/server/api/src/app/account-switching/
 * - account-switching-activity.entity.ts - TypeORM entity for tracking switches
 * - account-switching-activity.service.ts - Account switching operations
 * 
 * These files are protected from upstream merges via .gitattributes (merge=ours)
 */

export const ACCOUNT_SWITCHING_MODULE_PATHS = {
    entity: 'packages/server/api/src/app/account-switching/account-switching-activity.entity.ts',
    service: 'packages/server/api/src/app/account-switching/account-switching-activity.service.ts',
} as const

// Feature flag for Account Switching functionality
export const BMP_ACCOUNT_SWITCHING_ENABLED = true
