import { AppEventRoutingHooks, PieceRegistration } from '@activepieces/server-api/src/app/trigger/app-event-routing/app-event-routing.hooks'
import path from 'path'

// Get the workspace root directory by finding the root from process.cwd() or using a known marker
function getWorkspaceRoot(): string {
    // In dev mode, process.cwd() is typically the workspace root
    // Check for package.json with "activepieces" name to verify
    let currentDir = process.cwd()
    
    // Walk up until we find the workspace root (has packages/pieces directory)
    for (let i = 0; i < 10; i++) {
        const piecesDir = path.join(currentDir, 'packages', 'pieces')
        try {
            // eslint-disable-next-line @typescript-eslint/no-require-imports
            require('fs').accessSync(piecesDir)
            return currentDir
        }
        catch {
            currentDir = path.dirname(currentDir)
        }
    }
    
    // Fallback to process.cwd()
    return process.cwd()
}

const workspaceRoot = getWorkspaceRoot()

// Helper to safely load a piece using filesystem path (returns null if not available/built)
function tryLoadPiece(piecePath: string, packageName: string, exportName: string, urlName?: string): PieceRegistration | null {
    try {
        const fullPath = path.join(workspaceRoot, piecePath)
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const pieceModule = require(fullPath)
        const piece = pieceModule[exportName] || pieceModule.default
        if (piece) {
            return {
                urlName: urlName ?? exportName,
                packageName,
                piece,
            }
        }
    }
    catch {
        // Piece not available (not built in dev environment), skip silently
    }
    return null
}

export const bmpAppEventRoutingHooks: AppEventRoutingHooks = {
    getRegisteredPieces(): PieceRegistration[] {
        const pieces: PieceRegistration[] = []

        // All pieces that support APP_WEBHOOK triggers
        // Loaded using filesystem paths to work with tsx/node runtime
        const allPieces = [
            // BMP-specific piece (in custom pieces folder)
            { piecePath: 'packages/pieces/custom/ada-bmp/src/index.ts', packageName: '@activepieces/piece-ada-bmp', exportName: 'adaBmp', urlName: 'ada-bmp' },
            // Standard pieces from upstream (in community pieces folder)
            { piecePath: 'packages/pieces/community/slack/src/index.ts', packageName: '@activepieces/piece-slack', exportName: 'slack' },
            { piecePath: 'packages/pieces/community/square/src/index.ts', packageName: '@activepieces/piece-square', exportName: 'square' },
            { piecePath: 'packages/pieces/community/facebook-leads/src/index.ts', packageName: '@activepieces/piece-facebook-leads', exportName: 'facebookLeads', urlName: 'facebook-leads' },
            { piecePath: 'packages/pieces/community/intercom/src/index.ts', packageName: '@activepieces/piece-intercom', exportName: 'intercom' },
        ]

        for (const { piecePath, packageName, exportName, urlName } of allPieces) {
            const registration = tryLoadPiece(piecePath, packageName, exportName, urlName)
            if (registration) {
                pieces.push(registration)
            }
        }

        return pieces
    },
}
