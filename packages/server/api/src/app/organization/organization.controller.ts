import {
    ActivepiecesError,
    EnvironmentType,
    ErrorCode,
    PlatformRole,
    PrincipalType,
} from '@activepieces/shared'
import { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { StatusCodes } from 'http-status-codes'
import { z } from 'zod'
import {
    canInitializeOrganizationEnvironments,
    effectiveUserOrganizationIdForScope,
    shouldIsolateOrganizationEnvironmentsForUser,
} from '../bmp/bmp-runtime'
import { securityAccess } from '../core/security/authorization/fastify-security'
import { organizationEnvironmentService } from './organization-environment.service'
import { organizationService } from './organization.service'

// Zod schemas for request validation (converted from TypeBox for Zod validator compatibility)
const CreateOrganizationRequestZod = z.object({
    name: z.string().min(1).max(50).regex(/^[A-Z]+$/, 'Organization name must be uppercase letters only'),
    platformId: z.string(),
})

const CheckAdminAvailabilityRequestZod = z.object({
    organizationId: z.string(),
    environment: z.enum(['DEVELOPMENT', 'STAGING', 'PRODUCTION']),
})

export const organizationController: FastifyPluginAsyncZod = async (app) => {
    // Create organization
    app.post('/', CreateOrganizationRequestParams, async (request, reply) => {
        const { name, platformId } = request.body as { name: string, platformId: string }

        const organization = await organizationService.create({
            name,
            platformId,
        })

        return reply.status(StatusCodes.CREATED).send(organization)
    })

    // List organizations
    app.get('/', ListOrganizationsRequestParams, async (request) => {
        const { platformId, limit, cursor, availableForAdminInvite } = request.query as {
            platformId: string
            limit?: number
            cursor?: string
            availableForAdminInvite?: boolean
        }

        // Get current user's organization info
        const { userService } = await import('../user/user-service')
        const currentUser = await userService(request.log).getOneOrFail({ id: request.principal.id })

        return organizationService.list({
            platformId,
            limit,
            cursor,
            userId: request.principal.id,
            userOrganizationId: effectiveUserOrganizationIdForScope(currentUser.organizationId),
            userPlatformRole: currentUser.platformRole,
            availableForAdminInvite,
        })
    })

    app.get('/:id/environments', GetOrganizationEnvironmentsRequestParams, async (request) => {
        const { id } = request.params as { id: string }

        if (!id) {
            throw new ActivepiecesError({
                code: ErrorCode.VALIDATION,
                params: { message: 'Organization ID is required' },
            })
        }

        const allEnvironments = await organizationEnvironmentService.listByOrganization(id)

        if (request.principal.type === PrincipalType.ENGINE) {
            return allEnvironments
        }

        const { userService } = await import('../user/user-service')
        const currentUser = await userService(request.log).getOneOrFail({ id: request.principal.id })

        const organization = await organizationService.getById(
            id,
            request.principal.id,
            effectiveUserOrganizationIdForScope(currentUser.organizationId),
            currentUser.platformRole,
        )
        if (!organization) {
            throw new ActivepiecesError({
                code: ErrorCode.ENTITY_NOT_FOUND,
                params: { entityId: id, entityType: 'organization' },
            })
        }

        let filteredEnvironments = allEnvironments
        if (shouldIsolateOrganizationEnvironmentsForUser({ platformRole: currentUser.platformRole })) {
            if (currentUser.organizationId !== id) {
                filteredEnvironments = []
            }
        }

        return filteredEnvironments
    })

    app.get('/:id', GetOrganizationByIdRequestParams, async (request) => {
        const { id } = request.params as { id: string }

        if (request.principal.type === PrincipalType.ENGINE) {
            const organization = await organizationService.getById(id)
            if (!organization) {
                throw new ActivepiecesError({
                    code: ErrorCode.ENTITY_NOT_FOUND,
                    params: { entityId: id, entityType: 'organization' },
                })
            }
            return organization
        }

        const { userService } = await import('../user/user-service')
        const currentUser = await userService(request.log).getOneOrFail({ id: request.principal.id })

        const organization = await organizationService.getById(
            id,
            request.principal.id,
            effectiveUserOrganizationIdForScope(currentUser.organizationId),
            currentUser.platformRole,
        )
        if (!organization) {
            throw new ActivepiecesError({
                code: ErrorCode.ENTITY_NOT_FOUND,
                params: { entityId: id, entityType: 'organization' },
            })
        }
        return organization
    })

    // Initialize Dev, Staging, Prod environments for an organization (Admin/Owner only)
    app.post('/:organizationId/environments/initialize', InitializeEnvironmentsRequestParams, async (request, reply) => {
        const { organizationId } = request.params as { organizationId: string }
        const { userService } = await import('../user/user-service')
        const currentUser = await userService(request.log).getOneOrFail({ id: request.principal.id })

        const organization = await organizationService.getById(
            organizationId,
            request.principal.id,
            effectiveUserOrganizationIdForScope(currentUser.organizationId),
            currentUser.platformRole,
        )
        if (!organization) {
            throw new ActivepiecesError({
                code: ErrorCode.ENTITY_NOT_FOUND,
                params: { entityId: organizationId, entityType: 'organization' },
            })
        }

        const isAdminOrOwner = canInitializeOrganizationEnvironments({
            platformRole: currentUser.platformRole,
            userOrganizationId: currentUser.organizationId,
            targetOrganizationId: organizationId,
        })
        if (!isAdminOrOwner) {
            throw new ActivepiecesError({
                code: ErrorCode.VALIDATION,
                params: { message: 'Only admins and owners can setup environment metadata' },
            })
        }

        const platformId = request.principal.platform.id
        const envs: EnvironmentType[] = [EnvironmentType.DEVELOPMENT, EnvironmentType.STAGING, EnvironmentType.PRODUCTION]
        const created: typeof allEnvironments = []

        for (const env of envs) {
            const existing = await organizationEnvironmentService.getByOrgAndEnv(organizationId, env)
            if (!existing) {
                const orgEnv = await organizationEnvironmentService.create({
                    organizationId,
                    environment: env,
                    platformId,
                })
                created.push(orgEnv)
            }
        }

        const allEnvironments = await organizationEnvironmentService.listByOrganization(organizationId)
        return reply.status(StatusCodes.OK).send(allEnvironments)
    })

    // Update organization environment metadata
    app.patch('/:organizationId/environments/:environmentId/metadata', UpdateEnvironmentMetadataRequestParams, async (request) => {
        const { organizationId, environmentId } = request.params as { organizationId: string, environmentId: string }
        const { metadata } = request.body as { metadata?: unknown }

        // Get current user's organization info for access control
        const { userService } = await import('../user/user-service')
        const currentUser = await userService(request.log).getOneOrFail({ id: request.principal.id })

        // Check if user has access to this organization
        const organization = await organizationService.getById(
            organizationId,
            request.principal.id,
            effectiveUserOrganizationIdForScope(currentUser.organizationId),
            currentUser.platformRole,
        )
        if (!organization) {
            throw new ActivepiecesError({
                code: ErrorCode.ENTITY_NOT_FOUND,
                params: {
                    entityId: organizationId,
                    entityType: 'organization',
                },
            })
        }

        // Get the environment to verify it belongs to the organization
        const orgEnv = await organizationEnvironmentService.getById(environmentId)
        if (!orgEnv || orgEnv.organizationId !== organizationId) {
            throw new ActivepiecesError({
                code: ErrorCode.ENTITY_NOT_FOUND,
                params: {
                    entityId: environmentId,
                    entityType: 'organization_environment',
                },
            })
        }

        return organizationEnvironmentService.update(environmentId, { metadata })
    })

    // Check admin availability for org-env
    app.post('/check-admin', CheckAdminRequestParams, async (request) => {
        const body = request.body as { organizationId: string, environment: string }
        const environment = body.environment as EnvironmentType

        return organizationEnvironmentService.checkAdminAvailability({
            organizationId: body.organizationId,
            environment,
        })
    })

    // Get or create organization
    app.post('/get-or-create', GetOrCreateOrganizationRequestParams, async (request) => {
        const { name, platformId } = request.body as { name: string, platformId: string }

        return organizationService.getOrCreate({
            name,
            platformId,
        })
    })

    // Update organization
    app.patch('/:id', UpdateOrganizationRequestParams, async (request) => {
        const { id } = request.params as { id: string }
        const updates = request.body as Partial<{ name?: string, platformId?: string, metadata?: unknown }>

        // Get current user's organization info
        const { userService } = await import('../user/user-service')
        const currentUser = await userService(request.log).getOneOrFail({ id: request.principal.id })

        return organizationService.update(
            id,
            updates,
            request.principal.id,
            effectiveUserOrganizationIdForScope(currentUser.organizationId),
            currentUser.platformRole,
        )
    })

    // Delete organization
    app.delete('/:id', DeleteOrganizationRequestParams, async (request, reply) => {
        const { id } = request.params as { id: string }

        await organizationService.delete(id)

        return reply.status(StatusCodes.NO_CONTENT).send(null)
    })

    // Get allowed environments for current user based on their adminUserId
    // Used by pieces to dynamically filter environment options
    app.get('/current-user/allowed-environments', GetAllowedEnvironmentsRequestParams, async (request) => {
        const currentUserId = request.principal.id
        const { userService } = await import('../user/user-service')
        const currentUser = await userService(request.log).getOneOrFail({ id: currentUserId })

        // Derive allowed environments from platform role (BMP connection popup filtering)
        let environments: string[]
        switch (currentUser.platformRole) {
            case PlatformRole.MEMBER:
                environments = [EnvironmentType.DEVELOPMENT, EnvironmentType.STAGING]
                break
            case PlatformRole.OPERATOR:
                environments = [EnvironmentType.PRODUCTION]
                break
            case PlatformRole.ADMIN:
            case PlatformRole.OWNER:
            case PlatformRole.SUPER_ADMIN:
            default:
                environments = [EnvironmentType.DEVELOPMENT, EnvironmentType.STAGING, EnvironmentType.PRODUCTION]
                break
        }

        return {
            environments,
            organizationId: currentUser.organizationId ?? '',
            userId: currentUserId,
        }
    })

    // Assign current user to an organization (auto-setup endpoint)
    // This allows the frontend to automatically assign users to organizations
    app.post('/assign-user', AssignUserRequestParams, async (request) => {
        const { organizationId, platformRole } = request.body as { organizationId: string, platformRole: PlatformRole }
        const currentUserId = request.principal.id
        const platformId = request.principal.platform.id

        // Verify the organization exists
        const { userService } = await import('../user/user-service')
        const currentUser = await userService(request.log).getOneOrFail({ id: currentUserId })

        const organization = await organizationService.getById(
            organizationId,
            currentUserId,
            effectiveUserOrganizationIdForScope(currentUser.organizationId),
            currentUser.platformRole,
        )
        if (!organization) {
            throw new ActivepiecesError({
                code: ErrorCode.ENTITY_NOT_FOUND,
                params: {
                    entityId: organizationId,
                    entityType: 'organization',
                },
            })
        }

        // Determine the role to assign
        // If user has no platformRole or is MEMBER, and they're being assigned to an org,
        // promote them to ADMIN so they can manage environments
        let roleToAssign = platformRole || currentUser.platformRole
        if (!roleToAssign || roleToAssign === PlatformRole.MEMBER) {
            roleToAssign = PlatformRole.ADMIN
        }

        // Update the user's organizationId and platformRole
        await userService(request.log).update({
            id: currentUserId,
            platformId,
            organizationId,
            platformRole: roleToAssign,
        })

        console.log('[organization.controller] User assigned to organization:', {
            userId: currentUserId,
            organizationId,
            platformRole: roleToAssign,
        })

        return {
            success: true,
            userId: currentUserId,
            organizationId,
            platformRole: roleToAssign,
        }
    })
}

const CreateOrganizationRequestParams = {
    config: {
        security: securityAccess.publicPlatform([PrincipalType.USER]),
    },
    schema: {
        tags: ['organizations'],
        summary: 'Create an organization',
        body: CreateOrganizationRequestZod,
        // Response schema omitted due to TypeBox/Zod compatibility
    },
}

const ListOrganizationsRequestParams = {
    config: {
        security: securityAccess.publicPlatform([PrincipalType.USER]),
    },
    schema: {
        tags: ['organizations'],
        summary: 'List organizations',
        querystring: z.object({
            platformId: z.string(),
            limit: z.coerce.number().min(1).max(100).optional(),
            cursor: z.string().optional(),
            availableForAdminInvite: z.coerce.boolean().optional(),
        }),
        // Response schema omitted due to TypeBox/Zod compatibility
    },
}

const GetOrganizationEnvironmentsRequestParams = {
    config: {
        security: securityAccess.publicPlatform([PrincipalType.USER, PrincipalType.ENGINE]),
    },
    schema: {
        tags: ['organizations'],
        summary: 'List environments for an organization',
        params: z.object({
            id: z.string(),
        }),
    },
}

const GetOrganizationByIdRequestParams = {
    config: {
        security: securityAccess.publicPlatform([PrincipalType.USER, PrincipalType.ENGINE]),
    },
    schema: {
        tags: ['organizations'],
        summary: 'Get organization by ID',
        params: z.object({
            id: z.string(),
        }),
    },
}

const InitializeEnvironmentsRequestParams = {
    config: {
        security: securityAccess.publicPlatform([PrincipalType.USER]),
    },
    schema: {
        tags: ['organizations'],
        summary: 'Create Dev, Staging, Prod environments for an organization',
        params: z.object({
            organizationId: z.string(),
        }),
        // Response schema omitted due to TypeBox/Zod compatibility
    },
}

const UpdateEnvironmentMetadataRequestParams = {
    config: {
        security: securityAccess.publicPlatform([PrincipalType.USER]),
    },
    schema: {
        tags: ['organizations'],
        summary: 'Update metadata for an organization environment',
        params: z.object({
            organizationId: z.string(),
            environmentId: z.string(),
        }),
        body: z.object({
            metadata: z.unknown().optional(),
        }),
        // Response schema omitted due to TypeBox/Zod compatibility
    },
}

const CheckAdminRequestParams = {
    config: {
        security: securityAccess.publicPlatform([PrincipalType.USER]),
    },
    schema: {
        tags: ['organizations'],
        summary: 'Check if admin slot is available for organization-environment',
        body: CheckAdminAvailabilityRequestZod,
        // Response schema omitted due to TypeBox/Zod compatibility
    },
}

const GetOrCreateOrganizationRequestParams = {
    config: {
        security: securityAccess.publicPlatform([PrincipalType.USER]),
    },
    schema: {
        tags: ['organizations'],
        summary: 'Get existing organization or create new one',
        body: CreateOrganizationRequestZod,
        // Response schema omitted due to TypeBox/Zod compatibility
    },
}

const UpdateOrganizationRequestParams = {
    config: {
        security: securityAccess.publicPlatform([PrincipalType.USER]),
    },
    schema: {
        tags: ['organizations'],
        summary: 'Update organization',
        params: z.object({
            id: z.string(),
        }),
        body: z.object({
            name: z.string().optional(),
            metadata: z.unknown().optional(),
        }),
        // Response schema omitted due to TypeBox/Zod compatibility
    },
}

const DeleteOrganizationRequestParams = {
    config: {
        security: securityAccess.publicPlatform([PrincipalType.USER]),
    },
    schema: {
        tags: ['organizations'],
        summary: 'Delete organization',
        params: z.object({
            id: z.string(),
        }),
        response: {
            [StatusCodes.NO_CONTENT]: z.null(),
        },
    },
}

const GetAllowedEnvironmentsRequestParams = {
    config: {
        security: securityAccess.publicPlatform([PrincipalType.USER]),
    },
    schema: {
        tags: ['organizations'],
        summary: 'Get allowed environments for current user (based on adminUserId)',
        response: {
            [StatusCodes.OK]: z.object({
                environments: z.array(z.string()),
                organizationId: z.string(),
                userId: z.string(),
            }),
        },
    },
}

const AssignUserRequestParams = {
    config: {
        security: securityAccess.publicPlatform([PrincipalType.USER]),
    },
    schema: {
        tags: ['organizations'],
        summary: 'Assign current user to an organization',
        body: z.object({
            organizationId: z.string(),
            platformRole: z.nativeEnum(PlatformRole).optional(),
        }),
        response: {
            [StatusCodes.OK]: z.object({
                success: z.boolean(),
                userId: z.string(),
                organizationId: z.string(),
                platformRole: z.string(),
            }),
        },
    },
}
