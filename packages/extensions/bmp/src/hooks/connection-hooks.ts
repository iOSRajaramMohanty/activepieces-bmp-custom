/**
 * BMP Connection Hooks Implementation
 * 
 * Implements connection-related hooks for BMP pieces.
 * These hooks are called by core Activepieces code when processing
 * BMP piece connections.
 */

import type { BmpConnectionHooks } from './types'

const BMP_PIECE_NAME = '@activepieces/piece-ada-bmp'
const BMP_AUTO_CONNECTION_PREFIX = 'bmp-auto-'
const ADA_BMP_API_URL_KEY = 'ADA_BMP_API_URL'

/**
 * Check if a piece is a BMP piece
 */
export const isBmpPiece: BmpConnectionHooks['isBmpPiece'] = (pieceName: string): boolean => {
    return pieceName === BMP_PIECE_NAME
}

/**
 * Check if a connection can be deleted
 * Prevents deletion of auto-created BMP connections
 */
export const canDeleteConnection: BmpConnectionHooks['canDeleteConnection'] = (params) => {
    const { connectionName, pieceName } = params
    
    if (!isBmpPiece(pieceName)) {
        return { allowed: true }
    }
    
    if (connectionName.startsWith(BMP_AUTO_CONNECTION_PREFIX)) {
        return {
            allowed: false,
            reason: 'Auto-created BMP connections cannot be deleted. They are managed automatically by the system.',
        }
    }
    
    return { allowed: true }
}

/**
 * Extract environment from connection auth
 */
export function extractEnvironmentFromAuth(auth: unknown): string | undefined {
    const authObj = auth as { props?: { environment?: string }; environment?: string } | undefined
    return authObj?.props?.environment ?? authObj?.environment
}

/**
 * Check if environment metadata has API URL configured
 */
export function hasApiUrlConfigured(metadata: Record<string, unknown> | undefined): boolean {
    return !!metadata?.[ADA_BMP_API_URL_KEY]
}

/**
 * Get API URL from environment metadata
 */
export function getApiUrlFromMetadata(metadata: Record<string, unknown> | undefined): string | undefined {
    return metadata?.[ADA_BMP_API_URL_KEY] as string | undefined
}

/**
 * Create error message for missing API URL configuration
 */
export function getMissingApiUrlError(environment: string | undefined): string {
    return `No API URL configured for ${environment || 'selected'} environment. Configure ${ADA_BMP_API_URL_KEY} in Organization > Environments > [your org] > Configure for the selected environment.`
}

/**
 * Connection hooks object for registration
 */
export const connectionHooks: Partial<BmpConnectionHooks> = {
    isBmpPiece,
    canDeleteConnection,
}
