import { AppSystemProp, cryptoUtils } from '@activepieces/server-common'
import {
    ApEdition,
    ApFlagId,
    AuthenticationResponse,
    PlatformRole,
    ProjectType,
    UserIdentity,
    UserIdentityProvider,
    OtpType,
} from '@activepieces/shared'
import { FastifyBaseLogger } from 'fastify'
import { otpService } from '../ee/authentication/otp/otp-service'
import { flagService } from '../flags/flag.service'
import { system } from '../helper/system/system'
import { platformService } from '../platform/platform.service'
import { projectService } from '../project/project-service'
import { userService } from '../user/user-service'
import { authenticationUtils } from './authentication-utils'
import { userIdentityService } from './user-identity/user-identity-service'

/**
 * Multi-Tenant Authentication Service
 * 
 * This service enables true multi-tenancy in Community Edition by:
 * - Creating a new platform for each signup
 * - Providing complete data isolation between tenants
 * - Working without Enterprise Edition license
 * 
 * Architecture:
 * User 1 → Platform A (isolated)
 * User 2 → Platform B (isolated)
 * User 3 → Platform C (isolated)
 */
export const multiTenantAuthService = (log: FastifyBaseLogger) => ({
    /**
     * Sign up a new user with their own dedicated platform
     * 
     * Flow:
     * 1. Create user identity
     * 2. Create user account
     * 3. Create dedicated platform for this user
     * 4. Create default project within the platform
     * 5. Set up user as platform admin
     * 6. Send verification email (if needed)
     * 7. Return authentication token
     */
    async signUpWithNewPlatform(params: SignUpWithNewPlatformParams): Promise<AuthenticationResponse> {
        log.info('[multiTenantAuthService] Creating new platform for user signup')

        // Step 1: Create user identity
        const userIdentity = await userIdentityService(log).create({
            email: params.email,
            firstName: params.firstName,
            lastName: params.lastName,
            password: params.password,
            trackEvents: params.trackEvents,
            newsLetter: params.newsLetter,
            provider: params.provider,
            verified: params.provider === UserIdentityProvider.GOOGLE || 
                     params.provider === UserIdentityProvider.JWT || 
                     params.provider === UserIdentityProvider.SAML,
        })

        log.info(`[multiTenantAuthService] Created user identity: ${userIdentity.id}`)

        // Step 2: Create user account (without platform initially)
        const user = await userService(log).create({
            identityId: userIdentity.id,
            platformRole: PlatformRole.ADMIN,
            platformId: null,
        })

        log.info(`[multiTenantAuthService] Created user: ${user.id}`)

        // Step 3: Create dedicated platform for this user
        const platformName = params.organizationName || `${userIdentity.firstName}'s Organization`
        const platform = await platformService(log).create({
            ownerId: user.id,
            name: platformName,
        })

        log.info(`[multiTenantAuthService] Created platform: ${platform.id} (${platform.name})`)

        // Step 4: Associate user with their platform
        await userService(log).addOwnerToPlatform({
            platformId: platform.id,
            id: user.id,
        })

        log.info(`[multiTenantAuthService] Associated user with platform`)

        // Step 5: Create default project within the platform
        const projectName = params.projectName || `${userIdentity.firstName}'s Project`
        const defaultProject = await projectService(log).create({
            displayName: projectName,
            ownerId: user.id,
            platformId: platform.id,
            type: ProjectType.PERSONAL,
        })

        log.info(`[multiTenantAuthService] Created default project: ${defaultProject.id}`)

        // Step 6: Handle email verification based on edition
        const cloudEdition = system.getEdition()
        switch (cloudEdition) {
            case ApEdition.CLOUD:
                await otpService(log).createAndSend({
                    platformId: platform.id,
                    email: userIdentity.email,
                    type: OtpType.EMAIL_VERIFICATION,
                })
                log.info('[multiTenantAuthService] Email verification sent (Cloud edition)')
                break
            case ApEdition.COMMUNITY:
            case ApEdition.ENTERPRISE:
                await userIdentityService(log).verify(userIdentity.id)
                log.info('[multiTenantAuthService] User auto-verified (CE/EE edition)')
                break
        }

        // Step 7: Set flag if this is the first user
        await flagService(log).save({
            id: ApFlagId.USER_CREATED,
            value: true,
        })

        // Step 8: Send telemetry
        await authenticationUtils(log).sendTelemetry({
            identity: userIdentity,
            user,
            project: defaultProject,
        })

        // Step 9: Save newsletter subscriber if applicable
        await authenticationUtils(log).saveNewsLetterSubscriber(user, platform.id, userIdentity)

        log.info(`[multiTenantAuthService] Multi-tenant signup complete for user ${user.id}`)

        // Step 10: Return authentication token
        return authenticationUtils(log).getProjectAndToken({
            userId: user.id,
            platformId: platform.id,
            projectId: defaultProject.id,
        })
    },

    /**
     * Sign up with federated authentication (Google, SAML, etc.) in multi-tenant mode
     */
    async federatedSignUpWithNewPlatform(params: FederatedSignUpParams): Promise<AuthenticationResponse> {
        log.info('[multiTenantAuthService] Federated signup with new platform')

        // Generate a random password (not used for federated auth)
        const password = await cryptoUtils.generateRandomPassword()

        return this.signUpWithNewPlatform({
            email: params.email,
            firstName: params.firstName,
            lastName: params.lastName,
            password,
            trackEvents: params.trackEvents,
            newsLetter: params.newsLetter,
            provider: params.provider,
            organizationName: params.organizationName,
            projectName: params.projectName,
        })
    },
})

/**
 * Check if multi-tenant mode is enabled
 */
export function isMultiTenantMode(): boolean {
    const edition = system.getEdition()
    const multiTenantEnabled = system.get(AppSystemProp.MULTI_TENANT_MODE) === 'true'
    
    // Multi-tenant mode works with any edition, but is primarily for CE
    return multiTenantEnabled
}

type SignUpWithNewPlatformParams = {
    email: string
    firstName: string
    lastName: string
    password: string
    trackEvents: boolean
    newsLetter: boolean
    provider: UserIdentityProvider
    organizationName?: string
    projectName?: string
}

type FederatedSignUpParams = {
    email: string
    firstName: string
    lastName: string
    trackEvents: boolean
    newsLetter: boolean
    provider: UserIdentityProvider
    organizationName?: string
    projectName?: string
}
