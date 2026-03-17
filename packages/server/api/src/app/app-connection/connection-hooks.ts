import { hooksFactory } from '../helper/hooks-factory'

/**
 * Connection Hooks Interface
 * 
 * Defines extension points for app connection functionality.
 * BMP extension overrides these hooks to handle environment-specific connections.
 */
export type ConnectionHooks = {
    /**
     * Check if a piece is a BMP piece that requires special handling
     * BMP pieces need environment metadata and API URL configuration
     * 
     * Default: false (no pieces are BMP pieces)
     * BMP Override: true for '@activepieces/piece-ada-bmp'
     */
    isBmpPiece(pieceName: string): boolean

    /**
     * Check if a connection can be deleted
     * Some connections (like auto-created BMP connections) should not be deleted
     * 
     * Default: true (all connections can be deleted)
     * BMP Override: false for connections with externalId starting with 'bmp-auto-'
     */
    canDeleteConnection(connection: { externalId?: string | null }): boolean

    /**
     * Get environment metadata for a BMP piece connection
     * This metadata includes API URL and other environment-specific config
     * 
     * Default: undefined (no environment metadata)
     * BMP Override: Fetches from organization environment settings
     */
    getEnvironmentMetadata(params: {
        pieceName: string
        environment?: string
        organizationId?: string
        platformId: string
    }): Promise<Record<string, unknown> | undefined>
}

/**
 * Default connection hooks (community edition behavior)
 * No BMP pieces, all connections can be deleted, no environment metadata
 */
export const connectionHooks = hooksFactory.create<ConnectionHooks>(_log => ({
    isBmpPiece: (_pieceName: string) => {
        return false
    },
    canDeleteConnection: (_connection: { externalId?: string | null }) => {
        return true
    },
    getEnvironmentMetadata: async (_params) => {
        return undefined
    },
}))
