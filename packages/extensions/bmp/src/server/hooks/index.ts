/**
 * BMP Server Hooks
 * 
 * Hook implementations for integrating BMP functionality into core Activepieces.
 * 
 * Currently, the BMP-specific logic is embedded in core files:
 * - app-connection-service.ts (isBmpPiece, environment metadata validation)
 * - piece-metadata-controller.ts (organization environment metadata injection)
 * - user-service.ts (organization meta info, role-based filtering)
 * 
 * TODO: After validation, extract this logic into hook implementations here
 * and register them via a hook system in core.
 */

// Export hook type definitions (to be implemented)
export interface BmpConnectionHooks {
    validateBmpConnection: (params: {
        pieceName: string
        projectId: string
        auth: unknown
    }) => Promise<{ environmentMetadata: Record<string, unknown> }>
}

export interface BmpUserHooks {
    enrichUserMetadata: (params: {
        userId: string
        organizationId?: string
    }) => Promise<{ organizationName?: string; environment?: string }>
}

export interface BmpEngineHooks {
    injectEnvironmentMetadata: (params: {
        projectId: string
        pieceName: string
    }) => Promise<Record<string, unknown>>
}

// Placeholder implementations - to be filled when hook system is created
export const bmpConnectionHooks: Partial<BmpConnectionHooks> = {}
export const bmpUserHooks: Partial<BmpUserHooks> = {}
export const bmpEngineHooks: Partial<BmpEngineHooks> = {}
