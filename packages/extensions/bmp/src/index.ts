/**
 * @activepieces/ext-bmp
 * 
 * BMP Extension for Activepieces
 * 
 * Provides multi-tenant organization management, environment-specific configurations,
 * extended user roles (SUPER_ADMIN, OWNER), and account switching functionality.
 * 
 * This extension package organizes BMP-specific code that is protected from 
 * upstream merges via .gitattributes. The actual implementation files remain
 * in their original locations within packages/server and packages/web for 
 * compatibility with the Activepieces architecture.
 * 
 * Key features:
 * - Organization & Environment management (multi-tenant support)
 * - Super Admin / Owner role hierarchy
 * - Account switching for context navigation
 * - BMP-specific UI components and routes
 * 
 * @license MIT
 */

// Server module metadata
export * from './server'

// Web module metadata
export * from './web'

// Shared types (actual implementation)
export * from './shared'

// Master feature flag for BMP functionality
export const BMP_EXTENSION_VERSION = '1.0.0'
export const BMP_EXTENSION_ENABLED = true
