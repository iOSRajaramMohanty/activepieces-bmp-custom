/**
 * BMP Web Hooks - Extension
 * 
 * React hooks for BMP functionality.
 * 
 * Files location: packages/web/src/hooks/
 * - super-admin-hooks.ts - Hooks for Super Admin operations
 * 
 * These files are protected from upstream merges via .gitattributes (merge=ours)
 */

export const BMP_WEB_HOOKS_PATHS = {
    superAdminHooks: 'packages/web/src/hooks/super-admin-hooks.ts',
} as const

// Feature flag for BMP web hooks
export const BMP_WEB_HOOKS_ENABLED = true
