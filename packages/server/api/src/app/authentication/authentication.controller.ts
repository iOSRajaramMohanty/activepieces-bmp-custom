import { ApplicationEventName } from '@activepieces/ee-shared'
import { AppSystemProp, networkUtils, securityAccess } from '@activepieces/server-shared'
import {
    ActivepiecesError,
    assertNotNullOrUndefined,
    ErrorCode,
    InvitationType,
    PrincipalType,
    SignInRequest,
    SignUpRequest,
    SwitchPlatformRequest,
    UserIdentityProvider,
} from '@activepieces/shared'
import { RateLimitOptions } from '@fastify/rate-limit'
import { FastifyPluginAsyncTypebox } from '@fastify/type-provider-typebox'
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
