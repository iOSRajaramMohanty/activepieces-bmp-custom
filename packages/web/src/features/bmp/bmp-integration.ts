import { isBmpEnabled } from '@/app/routes/bmp-routes'

export { isBmpEnabled }

/**
 * BMP fork policy: use this module for BMP-aware client scope so merges with upstream
 * rarely need to replay inline `isBmpEnabled()` logic across many components.
 */
export function userOrganizationIdForListScope(
  organizationId: string | null | undefined,
): string | undefined {
  return isBmpEnabled() ? organizationId ?? undefined : undefined
}
