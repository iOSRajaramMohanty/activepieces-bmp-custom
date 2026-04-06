import { PlatformRole } from '@activepieces/shared'
import { system } from '../helper/system/system'
import { AppSystemProp } from '../helper/system/system-props'

/**
 * BMP fork policy: keep all `AP_BMP_ENABLED` branching in this folder when possible.
 * Core files should only import these helpers so merges with upstream/main mostly
 * re-apply a single import + one-line call instead of re-merging scattered flag logic.
 */
export function isBmpEnabled(): boolean {
    return system.getBoolean(AppSystemProp.BMP_ENABLED) ?? false
}

export function effectiveUserOrganizationIdForScope(
    organizationId: string | null | undefined,
): string | undefined {
    if (!isBmpEnabled()) {
        return undefined
    }
    return organizationId || undefined
}

export function shouldIsolateOrganizationEnvironmentsForUser(params: {
    platformRole: PlatformRole | string
}): boolean {
    if (!isBmpEnabled()) {
        return false
    }
    return params.platformRole !== PlatformRole.OWNER && params.platformRole !== PlatformRole.SUPER_ADMIN
}

export function canInitializeOrganizationEnvironments(params: {
    platformRole: PlatformRole | string
    userOrganizationId: string | null | undefined
    targetOrganizationId: string
}): boolean {
    if (params.platformRole === PlatformRole.OWNER || params.platformRole === PlatformRole.SUPER_ADMIN) {
        return true
    }
    if (params.platformRole !== PlatformRole.ADMIN) {
        return false
    }
    if (!isBmpEnabled()) {
        return true
    }
    return params.userOrganizationId === params.targetOrganizationId
}
