/**
 * Organization Module - BMP Extension
 * 
 * This module provides organization management functionality for BMP multi-tenancy.
 * 
 * The actual implementation files remain in packages/server/api/src/app/organization/
 * for compatibility with the Activepieces server architecture. This extension package
 * provides the public API, type definitions, and facade interfaces.
 * 
 * Files location: packages/server/api/src/app/organization/
 * - organization.entity.ts - TypeORM entity for organizations
 * - organization.service.ts - Organization CRUD operations
 * - organization.controller.ts - REST API endpoints
 * - organization.module.ts - Fastify module registration
 * - organization-environment.entity.ts - Environment entity (Dev/Staging/Prod)
 * - organization-environment.service.ts - Environment management
 * 
 * These files are protected from upstream merges via .gitattributes (merge=ours)
 */

// Re-export types from shared
export * from '../../shared/organization'

// Export facade interfaces and loaders
export * from './facade'

// Module paths for reference
export const ORGANIZATION_MODULE_PATHS = {
    entity: 'packages/server/api/src/app/organization/organization.entity.ts',
    service: 'packages/server/api/src/app/organization/organization.service.ts',
    controller: 'packages/server/api/src/app/organization/organization.controller.ts',
    module: 'packages/server/api/src/app/organization/organization.module.ts',
    environmentEntity: 'packages/server/api/src/app/organization/organization-environment.entity.ts',
    environmentService: 'packages/server/api/src/app/organization/organization-environment.service.ts',
} as const

// Feature flag for BMP organization functionality
export const BMP_ORGANIZATION_ENABLED = true
