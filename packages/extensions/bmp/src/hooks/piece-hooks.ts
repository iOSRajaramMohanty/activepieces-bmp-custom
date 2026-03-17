/**
 * BMP Piece Hooks Implementation
 * 
 * Implements piece-related hooks for BMP functionality.
 * These hooks handle environment metadata injection for piece execution.
 */

import type { BmpPieceHooks } from './types'
import { isBmpPiece } from './connection-hooks'

/**
 * Environment metadata keys used by BMP pieces
 */
export const BMP_METADATA_KEYS = {
    API_URL: 'ADA_BMP_API_URL',
    TIMEOUT: 'ADA_BMP_TIMEOUT',
    DEBUG: 'ADA_BMP_DEBUG',
} as const

/**
 * Check if piece requires organization environment metadata
 */
export function requiresEnvironmentMetadata(pieceName: string): boolean {
    return isBmpPiece(pieceName)
}

/**
 * Prepare environment variables from metadata for sandbox injection
 */
export function prepareEnvVarsFromMetadata(
    metadata: Record<string, unknown> | undefined
): Record<string, string> {
    const envVars: Record<string, string> = {}
    
    if (!metadata) {
        return envVars
    }
    
    // Convert metadata values to environment variable strings
    for (const [key, value] of Object.entries(metadata)) {
        if (typeof value === 'string') {
            envVars[key] = value
        } else if (typeof value === 'number') {
            envVars[key] = String(value)
        } else if (typeof value === 'boolean') {
            envVars[key] = String(value)
        }
    }
    
    return envVars
}

/**
 * Validate that required BMP metadata is present
 */
export function validateBmpMetadata(
    metadata: Record<string, unknown> | undefined,
    environment: string | undefined
): { valid: boolean; error?: string } {
    if (!metadata) {
        return {
            valid: false,
            error: `No metadata configured for ${environment || 'selected'} environment.`,
        }
    }
    
    const apiUrl = metadata[BMP_METADATA_KEYS.API_URL]
    if (!apiUrl || typeof apiUrl !== 'string' || apiUrl.trim() === '') {
        return {
            valid: false,
            error: `No API URL configured for ${environment || 'selected'} environment. Configure ${BMP_METADATA_KEYS.API_URL} in Organization > Environments > [your org] > Configure for the selected environment.`,
        }
    }
    
    return { valid: true }
}

/**
 * Default BMP metadata values
 */
export const DEFAULT_BMP_METADATA = {
    [BMP_METADATA_KEYS.TIMEOUT]: 30000,
    [BMP_METADATA_KEYS.DEBUG]: false,
} as const

/**
 * Piece hooks object for registration
 */
export const pieceHooks: Partial<BmpPieceHooks> = {}
