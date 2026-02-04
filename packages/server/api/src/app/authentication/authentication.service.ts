import { OtpType } from '@activepieces/ee-shared'
import { AppSystemProp, cryptoUtils } from '@activepieces/server-shared'
import { ActivepiecesError, ApEdition, ApFlagId, assertNotNullOrUndefined, AuthenticationResponse, ErrorCode, InvitationType, isNil, PlatformRole, PlatformWithoutSensitiveData, ProjectType, User, UserIdentity, UserIdentityProvider, UserStatus } from '@activepieces/shared'
import { FastifyBaseLogger } from 'fastify'
import { otpService } from '../ee/authentication/otp/otp-service'
import { flagService } from '../flags/flag.service'
import { system } from '../helper/system/system'
import { platformService } from '../platform/platform.service'
import { platformUtils } from '../platform/platform.utils'
import { projectService } from '../project/project-service'
import { userService } from '../user/user-service'
import { userInvitationsService } from '../user-invitations/user-invitation.service'
import { authenticationUtils } from './authentication-utils'
import { userIdentityService } from './user-identity/user-identity-service'

export const authenticationService = (log: FastifyBaseLogger) => ({
    async signUp(params: SignUpParams): Promise<AuthenticationResponse> {
        // If platformId is not provided, check for accepted invitations first
        if (isNil(params.platformId)) {
            // Check if there's an accepted invitation for this email
            const allAcceptedInvitations = await userInvitationsService(log).getAcceptedInvitationsByEmailWithoutPlatform({
                email: params.email,
            })
            
            if (allAcceptedInvitations.length > 0) {
                // Use the first platform invitation's platformId
                const platformInvitation = allAcceptedInvitations.find(inv => inv.type === InvitationType.PLATFORM)
                if (platformInvitation) {
                    log.info({ 
                        email: params.email,
                        invitationId: platformInvitation.id,
                        platformId: platformInvitation.platformId
                    }, '[signUp] Found accepted invitation, using invitation platformId')
                    params.platformId = platformInvitation.platformId
                }
            }
        }
        
        if (!isNil(params.platformId)) {
            await authenticationUtils.assertEmailAuthIsEnabled({
                platformId: params.platformId,
                provider: params.provider,
            })
            await authenticationUtils.assertDomainIsAllowed({
                email: params.email,
                platformId: params.platformId,
            })
        }
        
        if (isNil(params.platformId)) {
            // No invitation found, create new platform
            const userIdentity = await userIdentityService(log).create({
                ...params,
                verified: params.provider === UserIdentityProvider.GOOGLE || params.provider === UserIdentityProvider.JWT || params.provider === UserIdentityProvider.SAML,
            })
            return createUserAndPlatform(userIdentity, log)
        }

        await authenticationUtils.assertUserIsInvitedToPlatformOrProject(log, {
            email: params.email,
            platformId: params.platformId,
        })
        
        // Get the accepted invitation to determine the platform role
        const acceptedInvitations = await userInvitationsService(log).getAcceptedInvitationsByEmail({
            email: params.email,
            platformId: params.platformId,
        })
        log.info({ 
            email: params.email, 
            platformId: params.platformId,
            invitationsCount: acceptedInvitations.length,
            invitations: acceptedInvitations.map(inv => ({ 
                id: inv.id, 
                type: inv.type, 
                platformRole: inv.platformRole,
                status: inv.status 
            }))
        }, '[signUp] Found accepted invitations')
        
        const platformInvitation = acceptedInvitations.find(inv => inv.type === InvitationType.PLATFORM)
        
        // Ensure we have a valid platformRole from invitation
        let invitedPlatformRole = PlatformRole.MEMBER
        if (platformInvitation?.platformRole) {
            invitedPlatformRole = platformInvitation.platformRole
        } else if (platformInvitation) {
            log.warn({ 
                email: params.email,
                invitationId: platformInvitation.id,
                invitationType: platformInvitation.type,
                platformRole: platformInvitation.platformRole
            }, '[signUp] WARNING: Platform invitation found but platformRole is null/undefined, defaulting to MEMBER')
        } else {
            log.warn({ 
                email: params.email,
                platformId: params.platformId,
                invitationsCount: acceptedInvitations.length
            }, '[signUp] WARNING: No platform invitation found, defaulting to MEMBER')
        }
        
        log.info({ 
            email: params.email,
            platformInvitationId: platformInvitation?.id,
            invitedPlatformRole,
            platformRoleFromInvitation: platformInvitation?.platformRole,
            hasPlatformInvitation: !!platformInvitation
        }, '[signUp] Using platform role from invitation')
        
        const userIdentity = await userIdentityService(log).create({
            ...params,
            verified: true,
        })
        
        // Check if user already exists (from previous signup attempt)
        const existingUser = await userService.getOneByIdentityAndPlatform({
            identityId: userIdentity.id,
            platformId: params.platformId,
        })
        
        if (existingUser) {
            log.warn({ 
                userId: existingUser.id,
                email: params.email,
                existingRole: existingUser.platformRole,
                expectedRole: invitedPlatformRole
            }, '[signUp] User already exists, will update role if needed')
            
            // Update existing user's role to match invitation
            if (existingUser.platformRole !== invitedPlatformRole && platformInvitation?.platformRole) {
                await userService.update({
                    id: existingUser.id,
                    platformId: params.platformId,
                    platformRole: invitedPlatformRole,
                })
                log.info({ 
                    userId: existingUser.id,
                    email: params.email,
                    oldRole: existingUser.platformRole,
                    newRole: invitedPlatformRole
                }, '[signUp] Updated existing user role to match invitation')
            }
        }
        
        // Check if this is an organization-based admin invitation (no environment required; shared project per org)
        const isOrganizationAdminInvitation = platformInvitation &&
            platformInvitation.platformRole === PlatformRole.ADMIN &&
            !isNil(platformInvitation.organizationId)
        
        let user: User
        if (isOrganizationAdminInvitation) {
            // For organization admins, create user WITHOUT auto-project creation
            // The organization-specific project will be created during provisionUserInvitation
            log.info({
                email: params.email,
                organizationId: platformInvitation.organizationId,
                environment: platformInvitation.environment,
            }, '[signUp] Organization ADMIN signup - skipping auto-project creation')
            
            if (existingUser) {
                user = existingUser
                log.info({
                    userId: user.id,
                    email: params.email,
                }, '[signUp] Using existing user for organization ADMIN')
            } else {
                user = await userService.create({
                    identityId: userIdentity.id,
                    platformId: params.platformId,
                    platformRole: invitedPlatformRole,
                })
                log.info({
                    userId: user.id,
                    email: params.email,
                }, '[signUp] Created new user for organization ADMIN (no auto-project)')
            }
        } else {
            // Standard flow: create user with generic project
            user = await userService.getOrCreateWithProject({
                identity: userIdentity,
                platformId: params.platformId,
                platformRole: invitedPlatformRole,
            })
            
            log.info({ 
                userId: user.id,
                email: params.email,
                createdPlatformRole: user.platformRole,
                expectedPlatformRole: invitedPlatformRole,
                wasExistingUser: !!existingUser
            }, '[signUp] User created/retrieved with platform role')
        }
        
        // Provision invitation (this will create the organization-specific project for org admins)
        await userInvitationsService(log).provisionUserInvitation({
            email: params.email,
            user,
        })
        
        // Verify and fix the role after provisioning to ensure it matches invitation
        const updatedUser = await userService.getOneOrFail({ id: user.id })
        if (updatedUser.platformRole !== invitedPlatformRole && platformInvitation?.platformRole) {
            log.warn({ 
                userId: updatedUser.id,
                email: params.email,
                currentRole: updatedUser.platformRole,
                expectedRole: invitedPlatformRole,
                invitationRole: platformInvitation.platformRole
            }, '[signUp] Role mismatch detected, correcting to invitation role')
            
            await userService.update({
                id: user.id,
                platformId: params.platformId,
                platformRole: invitedPlatformRole,
            })
            
            const correctedUser = await userService.getOneOrFail({ id: user.id })
            log.info({ 
                userId: correctedUser.id,
                email: params.email,
                correctedPlatformRole: correctedUser.platformRole,
                expectedPlatformRole: invitedPlatformRole
            }, '[signUp] Role corrected to match invitation')
        } else {
            log.info({ 
                userId: updatedUser.id,
                email: params.email,
                finalPlatformRole: updatedUser.platformRole,
                expectedPlatformRole: invitedPlatformRole
            }, '[signUp] Final platform role after provisioning')
        }

        return authenticationUtils.getProjectAndToken({
            userId: user.id,
            platformId: params.platformId,
            projectId: null,
        })
    },
    async signInWithPassword(params: SignInWithPasswordParams): Promise<AuthenticationResponse> {
        const identity = await userIdentityService(log).verifyIdentityPassword(params)
        log.info({ identityId: identity.id, email: params.email }, '[signInWithPassword] Identity verified')
        log.info({ predefinedPlatformId: params.predefinedPlatformId }, '[signInWithPassword] predefinedPlatformId')
        
        const platformId = isNil(params.predefinedPlatformId) ? await getPersonalPlatformIdForIdentity(identity.id) : params.predefinedPlatformId
        log.info({ platformId, email: params.email }, '[signInWithPassword] Resolved platformId')
        
        if (isNil(platformId)) {
            // Additional debugging: check if user exists
            const users = await userService.getByIdentityId({ identityId: identity.id })
            log.error({ 
                email: params.email, 
                identityId: identity.id,
                usersFound: users.length,
                users: users.map(u => ({ id: u.id, platformId: u.platformId, platformRole: u.platformRole, status: u.status }))
            }, '[signInWithPassword] No platform found for identity')
            
            throw new ActivepiecesError({
                code: ErrorCode.AUTHENTICATION,
                params: {
                    message: 'No platform found for identity',
                },
            })
        }
        await authenticationUtils.assertEmailAuthIsEnabled({
            platformId,
            provider: UserIdentityProvider.EMAIL,
        })
        await authenticationUtils.assertDomainIsAllowed({
            email: params.email,
            platformId,
        })
        log.info(`[signInWithPassword] Looking up user with identityId: ${identity.id}, platformId: ${platformId}`)
        
        const user = await userService.getOneByIdentityAndPlatform({
            identityId: identity.id,
            platformId,
        })
        log.info(`[signInWithPassword] User lookup result: ${user ? user.id : 'NULL'}`)
        
        assertNotNullOrUndefined(user, 'User not found')
        return authenticationUtils.getProjectAndToken({
            userId: user.id,
            platformId,
            projectId: null,
        })
    },
    async federatedAuthn(params: FederatedAuthnParams): Promise<AuthenticationResponse> {
        const platformId = isNil(params.predefinedPlatformId) ? await getPersonalPlatformIdForFederatedAuthn(params.email, log) : params.predefinedPlatformId
        const userIdentity = await userIdentityService(log).getIdentityByEmail(params.email)

        if (isNil(platformId)) {
            if (!isNil(userIdentity)) {
                // User already exists, create a new personal platform and return token
                return createUserAndPlatform(userIdentity, log)
            }
            // Create New Identity and Platform
            return authenticationService(log).signUp({
                email: params.email,
                firstName: params.firstName,
                lastName: params.lastName,
                newsLetter: params.newsLetter,
                trackEvents: params.trackEvents,
                provider: params.provider,
                platformId: null,
                password: await cryptoUtils.generateRandomPassword(),
                imageUrl: params.imageUrl,
            })
        }
        if (isNil(userIdentity)) {
            return authenticationService(log).signUp({
                email: params.email,
                firstName: params.firstName,
                lastName: params.lastName,
                newsLetter: params.newsLetter,
                trackEvents: params.trackEvents,
                provider: params.provider,
                platformId,
                password: await cryptoUtils.generateRandomPassword(),
                imageUrl: params.imageUrl,
            })
        }
        const user = await userService.getOrCreateWithProject({
            identity: userIdentity,
            platformId,
        })
        await userInvitationsService(log).provisionUserInvitation({
            email: params.email,
            user,
        })
        return authenticationUtils.getProjectAndToken({
            userId: user.id,
            platformId,
            projectId: null,
        })
    },
    async switchPlatform(params: SwitchPlatformParams): Promise<AuthenticationResponse> {
        const platforms = await platformService.listPlatformsForIdentityWithAtleastProject({ identityId: params.identityId })
        const platform = platforms.find((platform) => platform.id === params.platformId)
        await assertUserCanSwitchToPlatform(null, platform)

        assertNotNullOrUndefined(platform, 'Platform not found')
        const user = await getUserForPlatform(params.identityId, platform)
        return authenticationUtils.getProjectAndToken({
            userId: user.id,
            platformId: platform.id,
            projectId: null,
        })
    },
})

async function assertUserCanSwitchToPlatform(currentPlatformId: string | null, platform: PlatformWithoutSensitiveData | undefined): Promise<void> {
    if (isNil(platform)) {
        throw new ActivepiecesError({
            code: ErrorCode.AUTHORIZATION,
            params: {
                message: 'The user is not a member of the platform',
            },
        })
    }
    const samePlatform = currentPlatformId === platform.id
    const allowToSwitch = !platformUtils.isCustomerOnDedicatedDomain(platform) || samePlatform
    if (!allowToSwitch) {
        throw new ActivepiecesError({
            code: ErrorCode.AUTHENTICATION,
            params: {
                message: 'The user is not a member of the platform',
            },
        })
    }
}

async function getUserForPlatform(identityId: string, platform: PlatformWithoutSensitiveData): Promise<User> {
    const user = await userService.getOneByIdentityAndPlatform({
        identityId,
        platformId: platform.id,
    })
    if (isNil(user)) {
        throw new ActivepiecesError({
            code: ErrorCode.AUTHORIZATION,
            params: {
                message: 'User is not member of the platform',
            },
        })
    }
    return user
}

async function createUserAndPlatform(userIdentity: UserIdentity, log: FastifyBaseLogger): Promise<AuthenticationResponse> {
    const user = await userService.create({
        identityId: userIdentity.id,
        platformRole: PlatformRole.ADMIN,
        platformId: null,
    })
    const platform = await platformService.create({
        ownerId: user.id,
        name: userIdentity.firstName + '\'s Platform',
    })
    await userService.addOwnerToPlatform({
        platformId: platform.id,
        id: user.id,
    })
    const defaultProject = await projectService.create({
        displayName: userIdentity.firstName + '\'s Project',
        ownerId: user.id,
        platformId: platform.id,
        type: ProjectType.PERSONAL,
    })

    const cloudEdition = system.getEdition()

    switch (cloudEdition) {
        case ApEdition.CLOUD:
            await otpService(log).createAndSend({
                platformId: platform.id,
                email: userIdentity.email,
                type: OtpType.EMAIL_VERIFICATION,
            })
            break
        case ApEdition.COMMUNITY:
        case ApEdition.ENTERPRISE:
            await userIdentityService(log).verify(userIdentity.id)
            break
    }

    await flagService.save({
        id: ApFlagId.USER_CREATED,
        value: true,
    })
    await authenticationUtils.sendTelemetry({
        identity: userIdentity,
        user,
        project: defaultProject,
        log,
    })
    await authenticationUtils.saveNewsLetterSubscriber(user, platform.id, userIdentity, log)

    return authenticationUtils.getProjectAndToken({
        userId: user.id,
        platformId: platform.id,
        projectId: defaultProject.id,
    })
}

async function getPersonalPlatformIdForFederatedAuthn(email: string, log: FastifyBaseLogger): Promise<string | null> {
    const identity = await userIdentityService(log).getIdentityByEmail(email)
    if (isNil(identity)) {
        return null
    }
    return getPersonalPlatformIdForIdentity(identity.id)
}

async function getPersonalPlatformIdForIdentity(identityId: string): Promise<string | null> {
    const edition = system.getEdition()
    
    // First, check if user has a direct platformId (for owners, super admins, admins, etc.)
    const users = await userService.getByIdentityId({ identityId })
    if (users.length > 0) {
        // Prioritize: active users with platformId, then any user with platformId
        const activeUserWithPlatform = users.find((u) => u.platformId && u.status === UserStatus.ACTIVE)
        if (activeUserWithPlatform?.platformId) {
            return activeUserWithPlatform.platformId
        }
        // If no active user found, try to find any user with platformId
        const userWithPlatform = users.find((u) => u.platformId)
        if (userWithPlatform?.platformId) {
            return userWithPlatform.platformId
        }
    }
    
    // Fallback: In Cloud edition or CE multi-tenant mode, find user's platform via projects
    if (edition === ApEdition.CLOUD) {
        const platforms = await platformService.listPlatformsForIdentityWithAtleastProject({ identityId })
        const platform = platforms.find((platform) => !platformUtils.isCustomerOnDedicatedDomain(platform))
        if (platform?.id) {
            return platform.id
        }
    }
    
    // In CE/EE multi-tenant mode, find the first platform the user owns or is a member of
    const multiTenantEnabled = system.get(AppSystemProp.MULTI_TENANT_MODE) === 'true'
    if (multiTenantEnabled) {
        const platforms = await platformService.listPlatformsForIdentityWithAtleastProject({ identityId })
        // Return the first platform (user's personal platform in multi-tenant mode)
        if (platforms.length > 0) {
            return platforms[0].id
        }
    }
    
    return null
}



type FederatedAuthnParams = {
    email: string
    firstName: string
    lastName: string
    newsLetter: boolean
    trackEvents: boolean
    provider: UserIdentityProvider
    predefinedPlatformId: string | null
    imageUrl?: string
}

type SignUpParams = {
    email: string
    firstName: string
    lastName: string
    password: string
    platformId: string | null
    trackEvents: boolean
    newsLetter: boolean
    provider: UserIdentityProvider
    imageUrl?: string
}

type SignInWithPasswordParams = {
    email: string
    password: string
    predefinedPlatformId: string | null
}

type SwitchPlatformParams = {
    identityId: string
    platformId: string
}
