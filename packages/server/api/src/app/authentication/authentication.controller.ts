import { ApplicationEventName } from '@activepieces/ee-shared'
import { AppSystemProp, networkUtils, securityAccess } from '@activepieces/server-shared'
import {
    ActivepiecesError,
    assertNotNullOrUndefined,
    ErrorCode,
    InvitationStatus,
    InvitationType,
    PlatformRole,
    PrincipalType,
    SignInRequest,
    SignUpRequest,
    SwitchPlatformRequest,
    UserIdentityProvider,
} from '@activepieces/shared'
import { RateLimitOptions } from '@fastify/rate-limit'
import { FastifyPluginAsyncTypebox, Type } from '@fastify/type-provider-typebox'
import { StatusCodes } from 'http-status-codes'
import dayjs from 'dayjs'
import { applicationEvents } from '../helper/application-events'
import { system } from '../helper/system/system'
import { platformUtils } from '../platform/platform.utils'
import { userService } from '../user/user-service'
import { userInvitationsService } from '../user-invitations/user-invitation.service'
import { authenticationService } from './authentication.service'
import { isMultiTenantMode, multiTenantAuthService } from './multi-tenant-auth.service'

export const authenticationController: FastifyPluginAsyncTypebox = async (
    app,
) => {
    app.post('/sign-up', SignUpRequestOptions, async (request) => {
        // Check if public signup is disabled (only for multi-tenant mode)
        const publicSignupEnabled = system.get(AppSystemProp.PUBLIC_SIGNUP_ENABLED) !== 'false'
        const multiTenantMode = isMultiTenantMode()
        
        if (!publicSignupEnabled && multiTenantMode) {
            throw new ActivepiecesError({
                code: ErrorCode.AUTHORIZATION,
                params: {
                    message: 'Public signup is disabled. Only super admins can create new tenants.',
                },
            })
        }
        
        let signUpResponse

        // IMPORTANT: Check for accepted invitations FIRST, regardless of multi-tenant mode
        // If user has an accepted invitation, they should join that platform, not create a new one
        const allAcceptedInvitations = await userInvitationsService(request.log).getAcceptedInvitationsByEmailWithoutPlatform({
            email: request.body.email,
        })
        
        request.log.info({ 
            email: request.body.email,
            invitationsFound: allAcceptedInvitations.length,
            invitations: allAcceptedInvitations.map(inv => ({
                id: inv.id,
                type: inv.type,
                platformId: inv.platformId,
                platformRole: inv.platformRole,
                status: inv.status
            }))
        }, '[authenticationController] Checking for accepted invitations')
        
        const platformInvitation = allAcceptedInvitations.find(inv => inv.type === InvitationType.PLATFORM)
        const hasPlatformInvitation = !!platformInvitation
        
        if (hasPlatformInvitation) {
            // User has an accepted invitation - use regular signup flow to join the invited platform
            request.log.info({ 
                email: request.body.email,
                invitationId: platformInvitation.id,
                invitationPlatformId: platformInvitation.platformId,
                invitationPlatformRole: platformInvitation.platformRole
            }, '[authenticationController] Found accepted invitation, using invitation platform (bypassing multi-tenant mode)')
            
            // Pass null for platformId - signUp() will resolve it from the invitation
            signUpResponse = await authenticationService(request.log).signUp({
                ...request.body,
                provider: UserIdentityProvider.EMAIL,
                platformId: null, // Will be resolved from invitation in signUp()
            })
        } else if (multiTenantMode) {
            // Multi-tenant mode: Each signup gets their own isolated platform (only if no invitation)
            request.log.info('[authenticationController] Multi-tenant mode: Creating new platform for signup (no invitation found)')
            signUpResponse = await multiTenantAuthService(request.log).signUpWithNewPlatform({
                ...request.body,
                provider: UserIdentityProvider.EMAIL,
            })
        } else {
            // Standard mode: Use existing platform or create based on edition rules
            request.log.info('[authenticationController] Standard mode: Using platform resolution')
            const platformId = await platformUtils.getPlatformIdForRequest(request)
            signUpResponse = await authenticationService(request.log).signUp({
                ...request.body,
                provider: UserIdentityProvider.EMAIL,
                platformId: platformId ?? null,
            })
        }

        applicationEvents(request.log).sendUserEvent({
            platformId: signUpResponse.platformId!,
            userId: signUpResponse.id,
            projectId: signUpResponse.projectId,
            ip: networkUtils.extractClientRealIp(request, system.get(AppSystemProp.CLIENT_REAL_IP_HEADER)),
        }, {
            action: ApplicationEventName.USER_SIGNED_UP,
            data: {
                source: 'credentials',
            },
        })

        return signUpResponse
    })

    app.post('/sign-in', SignInRequestOptions, async (request) => {
        // In multi-tenant mode, don't use predefined platform - let the service find the user's platform
        const multiTenantMode = isMultiTenantMode()
        const predefinedPlatformId = multiTenantMode ? null : await platformUtils.getPlatformIdForRequest(request)
        
        request.log.info(`[authenticationController] Sign-in attempt, multi-tenant: ${multiTenantMode}, predefinedPlatformId: ${predefinedPlatformId}`)
        
        const response = await authenticationService(request.log).signInWithPassword({
            email: request.body.email,
            password: request.body.password,
            predefinedPlatformId,
        })

        const responsePlatformId = response.platformId
        assertNotNullOrUndefined(responsePlatformId, 'Platform ID is required')
        applicationEvents(request.log).sendUserEvent({
            platformId: responsePlatformId,
            userId: response.id,
            projectId: response.projectId,
            ip: networkUtils.extractClientRealIp(request, system.get(AppSystemProp.CLIENT_REAL_IP_HEADER)),
        }, {
            action: ApplicationEventName.USER_SIGNED_IN,
            data: {},
        })

        return response
    })

    app.post('/switch-platform', SwitchPlatformRequestOptions, async (request) => {
        const user = await userService.getOneOrFail({ id: request.principal.id })
        return authenticationService(request.log).switchPlatform({
            identityId: user.identityId,
            platformId: request.body.platformId,
        })
    })

    /**
     * Auto-provision endpoint for BMP integration.
     * This endpoint creates an invitation for a user (if they don't have one) and then signs them up.
     * Used when BMP frontend needs to automatically create Activepieces accounts.
     * 
     * Flow:
     * 1. Check if user already exists and can sign in
     * 2. If not, auto-create an ADMIN invitation (so they get a project)
     * 3. Sign up the user with the invitation
     * 4. If identity already exists but user doesn't exist on this platform, create user directly
     * 5. Return the auth response
     */
    app.post('/auto-provision', AutoProvisionRequestOptions, async (request) => {
        const { email, password, firstName, lastName } = request.body
        const platformId = await platformUtils.getPlatformIdForRequest(request)
        
        if (!platformId) {
            throw new ActivepiecesError({
                code: ErrorCode.VALIDATION,
                params: {
                    message: 'Platform ID could not be determined. Ensure the request is made to a valid platform.',
                },
            })
        }
        
        request.log.info({ 
            email, 
            platformId 
        }, '[auto-provision] Starting auto-provision for BMP user')
        
        // Import user identity service for direct identity lookup
        const { userIdentityService } = await import('./user-identity/user-identity-service')
        
        // First, try to sign in - user may already exist on this platform
        try {
            const signInResponse = await authenticationService(request.log).signInWithPassword({
                email,
                password,
                predefinedPlatformId: platformId,
            })
            
            request.log.info({ 
                email, 
                userId: signInResponse.id 
            }, '[auto-provision] User already exists, signed in successfully')
            
            return {
                ...signInResponse,
                isNewUser: false,
            }
        } catch (signInError: any) {
            // User doesn't exist or wrong password - continue to sign-up flow
            request.log.info({ 
                email, 
                errorCode: signInError?.params?.code || signInError?.code 
            }, '[auto-provision] Sign-in failed, proceeding to auto-provision')
        }
        
        // Check if the identity already exists (from another platform or previous attempt)
        const existingIdentity = await userIdentityService(request.log).getIdentityByEmail(email)
        
        if (existingIdentity) {
            // Identity exists - verify password matches
            request.log.info({ 
                email, 
                identityId: existingIdentity.id 
            }, '[auto-provision] Identity exists, verifying password')
            
            try {
                // This will throw if password doesn't match
                await userIdentityService(request.log).verifyIdentityPassword({ email, password })
            } catch (pwError: any) {
                // Password doesn't match - don't allow account takeover
                request.log.warn({ 
                    email,
                    errorCode: pwError?.code 
                }, '[auto-provision] Password verification failed for existing identity')
                throw new ActivepiecesError({
                    code: ErrorCode.INVALID_CREDENTIALS,
                    params: null,
                })
            }
            
            request.log.info({ 
                email, 
                identityId: existingIdentity.id 
            }, '[auto-provision] Password verified')
            
            // Check if user already exists on this platform
            const existingUser = await userService.getOneByIdentityAndPlatform({
                identityId: existingIdentity.id,
                platformId,
            })
            
            const { projectService } = await import('../project/project-service')
            const { ProjectType } = await import('@activepieces/shared')
            const { authenticationUtils } = await import('./authentication-utils')
            
            let userId: string
            let projectId: string | null = null
            let isNewUser = false
            
            if (existingUser) {
                // User exists on this platform - check if they have a project
                request.log.info({ 
                    email, 
                    userId: existingUser.id 
                }, '[auto-provision] User already exists on this platform')
                
                userId = existingUser.id
                
                // Check for existing project
                const existingProject = await projectService.getOneByOwnerAndPlatform({
                    ownerId: userId,
                    platformId,
                })
                
                if (existingProject) {
                    projectId = existingProject.id
                    request.log.info({ 
                        email, 
                        userId,
                        projectId 
                    }, '[auto-provision] User has existing project')
                } else {
                    // User exists but no project - create one
                    request.log.info({ 
                        email, 
                        userId 
                    }, '[auto-provision] User exists but no project, creating one')
                    
                    const newProject = await projectService.create({
                        displayName: `${existingIdentity.firstName}'s Project`,
                        ownerId: userId,
                        platformId,
                        type: ProjectType.PERSONAL,
                    })
                    projectId = newProject.id
                    isNewUser = true // Treat as new since they didn't have a working account
                }
            } else {
                // User doesn't exist on this platform - create user and project
                request.log.info({ 
                    email, 
                    identityId: existingIdentity.id 
                }, '[auto-provision] Creating user on this platform')
                
                const newUser = await userService.create({
                    identityId: existingIdentity.id,
                    platformId,
                    platformRole: PlatformRole.ADMIN, // Grant ADMIN so they get a project
                })
                userId = newUser.id
                
                // Create a project for this user
                const newProject = await projectService.create({
                    displayName: `${existingIdentity.firstName}'s Project`,
                    ownerId: userId,
                    platformId,
                    type: ProjectType.PERSONAL,
                })
                projectId = newProject.id
                isNewUser = true
            }
            
            request.log.info({ 
                email, 
                userId,
                projectId,
                isNewUser 
            }, '[auto-provision] User ready with project')
            
            // Get the authentication response
            const authResponse = await authenticationUtils.getProjectAndToken({
                userId,
                platformId,
                projectId,
            })
            
            if (isNewUser) {
                applicationEvents(request.log).sendUserEvent({
                    platformId: authResponse.platformId!,
                    userId: authResponse.id,
                    projectId: authResponse.projectId,
                    ip: networkUtils.extractClientRealIp(request, system.get(AppSystemProp.CLIENT_REAL_IP_HEADER)),
                }, {
                    action: ApplicationEventName.USER_SIGNED_UP,
                    data: {
                        source: 'credentials',
                    },
                })
            }
            
            return {
                ...authResponse,
                isNewUser,
            }
        }
        
        // Identity doesn't exist - create invitation and sign up normally
        // Check if user already has an accepted invitation
        const existingInvitations = await userInvitationsService(request.log).getAcceptedInvitationsByEmail({
            email,
            platformId,
        })
        
        if (existingInvitations.length === 0) {
            // No invitation - create one with ADMIN role so user gets a project
            request.log.info({ 
                email, 
                platformId 
            }, '[auto-provision] Creating auto-invitation with ADMIN role')
            
            await userInvitationsService(request.log).create({
                email,
                type: InvitationType.PLATFORM,
                platformId,
                platformRole: PlatformRole.ADMIN,
                projectId: null,
                projectRoleId: null,
                organizationId: null,
                environment: null,
                invitationExpirySeconds: dayjs.duration(1, 'day').asSeconds(),
                status: InvitationStatus.ACCEPTED, // Auto-accept the invitation
            })
            
            request.log.info({ 
                email, 
                platformId 
            }, '[auto-provision] Auto-invitation created')
        } else {
            request.log.info({ 
                email, 
                existingInvitationsCount: existingInvitations.length 
            }, '[auto-provision] User already has invitations')
        }
        
        // Now sign up the user (this will create identity + user + project)
        const signUpResponse = await authenticationService(request.log).signUp({
            email,
            password,
            firstName,
            lastName,
            trackEvents: true,
            newsLetter: false,
            provider: UserIdentityProvider.EMAIL,
            platformId,
        })
        
        request.log.info({ 
            email, 
            userId: signUpResponse.id,
            projectId: signUpResponse.projectId 
        }, '[auto-provision] User signed up successfully')
        
        applicationEvents(request.log).sendUserEvent({
            platformId: signUpResponse.platformId!,
            userId: signUpResponse.id,
            projectId: signUpResponse.projectId,
            ip: networkUtils.extractClientRealIp(request, system.get(AppSystemProp.CLIENT_REAL_IP_HEADER)),
        }, {
            action: ApplicationEventName.USER_SIGNED_UP,
            data: {
                source: 'credentials',
            },
        })
        
        return {
            ...signUpResponse,
            isNewUser: true,
        }
    })

}

const rateLimitOptions: RateLimitOptions = {
    max: Number.parseInt(
        system.getOrThrow(AppSystemProp.API_RATE_LIMIT_AUTHN_MAX),
        10,
    ),
    timeWindow: system.getOrThrow(AppSystemProp.API_RATE_LIMIT_AUTHN_WINDOW),
}



const SwitchPlatformRequestOptions = {
    config: {
        security: securityAccess.publicPlatform([PrincipalType.USER]),
        rateLimit: rateLimitOptions,
    },
    schema: {
        body: SwitchPlatformRequest,
    },
}

const SignUpRequestOptions = {
    config: {
        security: securityAccess.public(),
        rateLimit: rateLimitOptions,
    },
    schema: {
        body: SignUpRequest,
    },
}

const SignInRequestOptions = {
    config: {
        security: securityAccess.public(),
        rateLimit: rateLimitOptions,
    },
    schema: {
        body: SignInRequest,
    },
}

const AutoProvisionRequestOptions = {
    config: {
        security: securityAccess.public(),
        rateLimit: rateLimitOptions,
    },
    schema: {
        tags: ['authentication'],
        summary: 'Auto-provision a user account (for BMP integration)',
        description: 'Creates an invitation and signs up a user automatically. If user exists, signs them in.',
        body: Type.Object({
            email: Type.String({ format: 'email' }),
            password: Type.String({ minLength: 1 }),
            firstName: Type.String({ minLength: 1 }),
            lastName: Type.String({ minLength: 1 }),
        }),
    },
}
