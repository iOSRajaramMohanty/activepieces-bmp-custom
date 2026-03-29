import { apId, FilteredPieceBehavior, PlatformRole, UserIdentityProvider } from '@activepieces/shared'
import { userIdentityService } from '../../authentication/user-identity/user-identity-service'
import { defaultTheme } from '../../flags/theme'
import { system } from '../../helper/system/system'
import { platformRepo } from '../../platform/platform.service'
import { userService } from '../../user/user-service'
import { databaseConnection } from '../database-connection'
import { DataSeed } from './data-seed'

const log = system.globalLogger()

const SUPER_ADMIN = {
    email: 'demo@user.com',
    password: 'SuperAdmin2024!',
    firstName: 'ada',
    lastName: 'bmp',
}

async function superAdminExists(): Promise<boolean> {
    const identityService = userIdentityService(log)
    const identity = await identityService.getIdentityByEmail(SUPER_ADMIN.email)
    if (!identity) {
        return false
    }
    const existingUsers = await userService(log).getByIdentityId({ identityId: identity.id })
    return existingUsers.some((u) => u.platformRole === PlatformRole.SUPER_ADMIN && u.platformId)
}

async function createSuperAdmin(): Promise<void> {
    const identityService = userIdentityService(log)

    let identity = await identityService.getIdentityByEmail(SUPER_ADMIN.email)
    if (!identity) {
        identity = await identityService.create({
            email: SUPER_ADMIN.email,
            password: SUPER_ADMIN.password,
            firstName: SUPER_ADMIN.firstName,
            lastName: SUPER_ADMIN.lastName,
            trackEvents: false,
            newsLetter: false,
            provider: UserIdentityProvider.EMAIL,
            verified: true,
        })
    }

    const existingUsers = await userService(log).getByIdentityId({ identityId: identity.id })
    const existingAdmin = existingUsers.find((u) => u.platformRole === PlatformRole.SUPER_ADMIN)
    const userId = existingAdmin
        ? existingAdmin.id
        : (await userService(log).create({
            identityId: identity.id,
            platformId: null,
            platformRole: PlatformRole.SUPER_ADMIN,
        })).id

    const platform = await platformRepo().save({
        id: apId(),
        ownerId: userId,
        name: 'ADA BMP Platform',
        primaryColor: defaultTheme.colors.primary.default,
        logoIconUrl: defaultTheme.logos.logoIconUrl,
        fullLogoUrl: defaultTheme.logos.fullLogoUrl,
        favIconUrl: defaultTheme.logos.favIconUrl,
        emailAuthEnabled: true,
        filteredPieceNames: [],
        enforceAllowedAuthDomains: false,
        allowedAuthDomains: [],
        filteredPieceBehavior: FilteredPieceBehavior.BLOCKED,
        federatedAuthProviders: {},
        cloudAuthEnabled: true,
        pinnedPieces: [],
    })

    await databaseConnection().query(
        'UPDATE "user" SET "platformId" = $1, "updated" = NOW() WHERE id = $2',
        [platform.id, userId],
    )

    log.info({ email: SUPER_ADMIN.email, userId, platformId: platform.id }, '[superAdminSeed] Super admin created successfully')
}

async function runSuperAdminSeed(): Promise<void> {
    if (await superAdminExists()) {
        log.info('[superAdminSeed] Super admin already exists, skipping')
        return
    }
    await createSuperAdmin()
}

export const superAdminSeed: DataSeed = {
    run: runSuperAdminSeed,
}
