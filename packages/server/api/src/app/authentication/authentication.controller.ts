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
import { FastifyBaseLogger } from 'fastify'

/**
 * Map roleName string to PlatformRole enum
 * Valid values: SUPER_ADMIN, OWNER, ADMIN, MEMBER, OPERATOR
 * Defaults to ADMIN if roleName is not provided or invalid
 */
function mapRoleNameToPlatformRole(roleName?: string): PlatformRole {
    if (!roleName) {
        return PlatformRole.ADMIN // Default role
    }
    
    const normalizedRoleName = roleName.toUpperCase().trim()
    
    // Map roleName to PlatformRole enum
    switch (normalizedRoleName) {
        case 'SUPER_ADMIN':
            return PlatformRole.SUPER_ADMIN
        case 'OWNER':
            return PlatformRole.OWNER
        case 'ADMIN':
            return PlatformRole.ADMIN
        case 'MEMBER':
            return PlatformRole.MEMBER
        case 'OPERATOR':
            return PlatformRole.OPERATOR
        default:
            // Invalid role name, default to ADMIN
            return PlatformRole.ADMIN
    }
}

/**
 * Helper function to handle SDK clientId and organization creation/assignment
 * This ensures users with the same clientId share the same organization
 */
async function handleSDKClientIdAndOrganization({
    user,
    clientId,
    clientName,
    platformId,
    log,
}: {
    user: { id: string; clientId?: string | null; organizationId?: string | null }
    clientId: string
    clientName?: string
    platformId: string
    log: FastifyBaseLogger
}): Promise<void> {
    if (!user.clientId) {
        // Store clientId
        await userService.update({
            id: user.id,
            platformId,
            clientId,
        })
        log.info({
            userId: user.id,
            clientId,
        }, '[handleSDKClientIdAndOrganization] Stored clientId for user')
        
        // Reload user to get updated clientId
        const updatedUser = await userService.getOneOrFail({ id: user.id })
        
        // Check if any other user with the same clientId already has an organization
        const usersWithSameClientId = await userService.getByClientIdAndPlatform({
            clientId,
            platformId,
        })
        
        const existingOrgUser = usersWithSameClientId.find(u => u.id !== updatedUser.id && u.organizationId)
        
        let organization
        if (existingOrgUser && existingOrgUser.organizationId) {
            // Another user with same clientId already has an organization - use it
            const { organizationService } = await import('../organization/organization.service')
            organization = await organizationService.getById(existingOrgUser.organizationId)
            if (organization) {
                log.info({
                    userId: updatedUser.id,
                    existingUserId: existingOrgUser.id,
                    organizationId: organization.id,
                    organizationName: organization.name,
                    clientId,
                }, '[handleSDKClientIdAndOrganization] Found existing organization from another user with same clientId')
            }
        }
        
        // If no existing organization found and clientName provided, create one
        if (!organization && clientName) {
            const { organizationService } = await import('../organization/organization.service')
            try {
                // Convert clientName to uppercase and extract only letters (organization name must match pattern ^[A-Z]+$)
                const orgName = clientName.toUpperCase().replace(/[^A-Z]/g, '')
                if (orgName && orgName.length >= 1 && orgName.length <= 50) {
                    organization = await organizationService.getOrCreate({
                        name: orgName,
                        platformId,
                    })
                    
                    log.info({
                        userId: updatedUser.id,
                        organizationId: organization.id,
                        organizationName: organization.name,
                        clientId,
                    }, '[handleSDKClientIdAndOrganization] Created new organization for clientId')
                } else {
                    log.warn({
                        userId: updatedUser.id,
                        clientName,
                        processedOrgName: orgName,
                    }, '[handleSDKClientIdAndOrganization] Invalid organization name after processing (must be 1-50 uppercase letters)')
                }
            } catch (orgError: any) {
                log.error({
                    userId: updatedUser.id,
                    error: orgError,
                    clientName,
                    clientId,
                }, '[handleSDKClientIdAndOrganization] Failed to create organization')
            }
        }
        
        // Assign user to organization if not already assigned and organization exists
        if (organization && organization.id && !updatedUser.organizationId) {
            await userService.update({
                id: updatedUser.id,
                platformId,
                organizationId: organization.id,
            })
            
            log.info({
                userId: updatedUser.id,
                organizationId: organization.id,
                organizationName: organization.name,
                clientId,
            }, '[handleSDKClientIdAndOrganization] Assigned user to organization')
        } else if (!clientName) {
            log.info({
                userId: updatedUser.id,
                clientId,
            }, '[handleSDKClientIdAndOrganization] clientId stored but no clientName provided and no existing organization found, skipping organization assignment')
        }
    } else if (user.clientId !== clientId) {
        // Update clientId if different
        log.warn({
            userId: user.id,
            existingClientId: user.clientId,
            providedClientId: clientId,
        }, '[handleSDKClientIdAndOrganization] ClientId mismatch, updating user clientId')
        
        await userService.update({
            id: user.id,
            platformId,
            clientId,
        })
    } else {
        log.info({
            userId: user.id,
            clientId,
        }, '[handleSDKClientIdAndOrganization] User already has matching clientId')
    }
}

/**
 * Authentication Controller
 * 
 * SDK API Usage:
 * ==============
 * 
 * For SDK integration, use the /auto-provision endpoint:
 * POST /v1/authentication/auto-provision
 * 
 * See the auto-provision endpoint documentation below for SDK usage details.
 */
export const authenticationController: FastifyPluginAsyncTypebox = async (
    app,
) => {
    /**
     * POST /v1/authentication/sign-up
     * 
     * Standard signup endpoint for non-SDK users.
     * For SDK integration, use /auto-provision instead.
     */
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

    /**
     * POST /v1/authentication/sign-in
     * 
     * Standard signin endpoint for non-SDK users.
     * For SDK integration, use /auto-provision instead.
     */
    app.post('/sign-in', SignInRequestOptions, async (request) => {
        // In multi-tenant mode, don't use predefined platform - let the service find the user's platform
        const multiTenantMode = isMultiTenantMode()
        const predefinedPlatformId = multiTenantMode ? null : await platformUtils.getPlatformIdForRequest(request)
        
        request.log.info(`[authenticationController] Sign-in attempt, predefinedPlatformId: ${predefinedPlatformId}`)
        
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
     * POST /v1/authentication/auto-provision
     * 
     * Auto-provision endpoint for SDK integration (BMP and other SDK clients).
     * This endpoint handles both signup and signin automatically.
     * 
     * SDK Usage (Required):
     * ====================
     * 
     * Request Body:
     * {
     *   "email": "user@example.com",
     *   "password": "password123",
     *   "firstName": "John",
     *   "lastName": "Doe",
     *   "platformId": "2Y6xAoWbvjiBgdRsBDcbP",  // Required: Platform ID of OWNER role user
     *   "clientId": "unique-client-id-123",     // Required: Unique client identifier
     *   "clientName": "MyClient",                // Optional: From localStorage (ada.clientName) - used for organization creation
     *   "roleName": "ADMIN"                      // Optional: From localStorage (ada.roleName) - platform role (SUPER_ADMIN, OWNER, ADMIN, MEMBER, OPERATOR). Defaults to ADMIN if not provided.
     * }
     * 
     * Important Notes:
     * - platformId must be the platform ID of a user with role type OWNER (tenant owner)
     * - clientId is required when platformId is provided
     * - clientId is stored in the user record for identification
     * - Users with the same clientId automatically share the same organization
     * - Organization name is derived from clientName (uppercase letters only, max 50 chars)
     * - Example: "MyClient" → "MYCLIENT"
     * - roleName: Valid values are SUPER_ADMIN, OWNER, ADMIN, MEMBER, OPERATOR (case-insensitive)
     * - If roleName is not provided or invalid, defaults to ADMIN
     * 
     * Flow:
     * 1. Try to sign in first (user may already exist)
     * 2. If sign-in fails, proceed to sign-up:
     *    - Check if identity exists (from another platform)
     *    - If identity exists: verify password and create user on this platform
     *    - If identity doesn't exist: create invitation and sign up
     * 3. Handle clientId and organization:
     *    - Store clientId in user record
     *    - Check if other users with same clientId have an organization
     *    - If yes: assign user to existing organization
     *    - If no: create organization from clientName (if provided)
     * 4. Return authentication response with isNewUser flag
     */
    app.post('/auto-provision', AutoProvisionRequestOptions, async (request) => {
        const { email, password, firstName, lastName } = request.body
        const providedPlatformId = request.body.platformId
        const clientId = request.body.clientId
        const clientName = request.body.clientName
        const roleName = request.body.roleName // From localStorage: ada.roleName
        
        // SDK mode: Use provided platformId, otherwise resolve from request
        const platformId = providedPlatformId || await platformUtils.getPlatformIdForRequest(request)
        
        if (!platformId) {
            throw new ActivepiecesError({
                code: ErrorCode.VALIDATION,
                params: {
                    message: 'Platform ID could not be determined. Please provide platformId parameter or ensure the request is made to a valid platform.',
                },
            })
        }
        
        // SDK mode: If platformId is provided, clientId should also be provided
        if (providedPlatformId && !clientId) {
            throw new ActivepiecesError({
                code: ErrorCode.VALIDATION,
                params: {
                    message: 'SDK mode requires both platformId and clientId. Please provide clientId when using platformId.',
                },
            })
        }
        
        // SDK mode: If platformId and clientId provided, use SDK auth flow
        const isSDKMode = !!providedPlatformId && !!clientId
        
        // Map roleName to PlatformRole, default to ADMIN if not provided
        const platformRole = mapRoleNameToPlatformRole(roleName)
        
        request.log.info({ 
            email, 
            platformId,
            isSDKMode,
            hasClientId: !!clientId,
            hasClientName: !!clientName,
            roleName,
            platformRole,
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
            
            // SDK mode: Handle clientId and organization after successful sign-in
            if (isSDKMode && clientId) {
                const user = await userService.getOneOrFail({ id: signInResponse.id })
                await handleSDKClientIdAndOrganization({
                    user,
                    clientId,
                    clientName,
                    platformId,
                    log: request.log,
                })
            }
            
            request.log.info({ 
                email, 
                userId: signInResponse.id,
                isSDKMode,
            }, '[auto-provision] User already exists, signed in successfully')
            
            return {
                ...signInResponse,
                isNewUser: false,
            }
        } catch (signInError: any) {
            // User doesn't exist or wrong password - continue to sign-up flow
            request.log.info({ 
                email, 
                errorCode: signInError?.params?.code || signInError?.code,
                isSDKMode,
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
                    platformRole, // Use custom role from roleName or default ADMIN
                })
                userId = newUser.id
                
                // SDK mode: Handle clientId and organization for new user
                if (isSDKMode && clientId) {
                    await handleSDKClientIdAndOrganization({
                        user: newUser,
                        clientId,
                        clientName,
                        platformId,
                        log: request.log,
                    })
                    // Reload user to get updated organizationId
                    const updatedUser = await userService.getOneOrFail({ id: userId })
                    userId = updatedUser.id
                }
                
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
            // No invitation - create one with specified role (or default ADMIN)
            request.log.info({ 
                email, 
                platformId,
                platformRole,
                roleName,
            }, '[auto-provision] Creating auto-invitation with platform role')
            
            await userInvitationsService(request.log).create({
                email,
                type: InvitationType.PLATFORM,
                platformId,
                platformRole, // Use custom role from roleName or default ADMIN
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
        
        // SDK mode: Handle clientId and organization after signup
        if (isSDKMode && clientId) {
            const user = await userService.getOneOrFail({ id: signUpResponse.id })
            await handleSDKClientIdAndOrganization({
                user,
                clientId,
                clientName,
                platformId,
                log: request.log,
            })
        }
        
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
        description: 'Creates an invitation and signs up a user automatically. If user exists, signs them in. Supports SDK mode with platformId, clientId, and clientName.',
        body: Type.Object({
            email: Type.String({ format: 'email' }),
            password: Type.String({ minLength: 1 }),
            firstName: Type.String({ minLength: 1 }),
            lastName: Type.String({ minLength: 1 }),
            /**
             * SDK Mode (Optional):
             * Platform ID of the tenant/platform. If provided, clientId should also be provided.
             * If not provided, platformId is resolved from request context (hostname/domain).
             */
            platformId: Type.Optional(Type.String({
                description: '[SDK Optional] Platform ID - If provided with clientId, uses SDK authentication flow. Otherwise resolves from request.',
            })),
            /**
             * SDK Mode (Optional):
             * Unique client identifier. Required when platformId is provided.
             * Stored in user record and used for organization creation.
             */
            clientId: Type.Optional(Type.String({
                description: '[SDK Optional] Client ID - Required when platformId is provided. Used for organization creation.',
            })),
            /**
             * SDK Mode (Optional):
             * Client name from localStorage (ada.clientName). Used to create organization
             * if user doesn't have clientId.
             */
            clientName: Type.Optional(Type.String({
                description: '[SDK Optional] Client name from localStorage (ada.clientName) - Used for organization creation.',
            })),
            /**
             * SDK Mode (Optional):
             * Platform role name from localStorage (ada.roleName). Valid values:
             * SUPER_ADMIN, OWNER, ADMIN, MEMBER, OPERATOR
             * If not provided, defaults to ADMIN.
             */
            roleName: Type.Optional(Type.String({
                description: '[SDK Optional] Platform role name from localStorage (ada.roleName) - Valid: SUPER_ADMIN, OWNER, ADMIN, MEMBER, OPERATOR. Defaults to ADMIN if not provided.',
            })),
        }),
    },
}
