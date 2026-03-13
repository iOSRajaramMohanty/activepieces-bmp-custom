import { FastifyPluginAsyncTypebox } from '@fastify/type-provider-typebox'
import { Type } from '@sinclair/typebox'
import { z } from 'zod'
import { organizationService } from './organization.service'
import { organizationEnvironmentService } from './organization-environment.service'
import {
    CreateOrganizationRequest,
    CheckAdminAvailabilityRequest,
    CheckAdminAvailabilityResponse,
    Organization,
    OrganizationEnvironment,
    EnvironmentType,
    ActivepiecesError,
    ErrorCode,
    PrincipalType,
    PlatformRole,
    SeekPage,
} from '@activepieces/shared'
import { StatusCodes } from 'http-status-codes'
import { securityAccess } from '@activepieces/server-common'

export const organizationController: FastifyPluginAsyncTypebox = async (app) => {
    // Create organization
    app.post('/', CreateOrganizationRequestParams, async (request, reply) => {
        const { name, platformId } = request.body as { name: string; platformId: string }

        const organization = await organizationService.create({
            name,
            platformId,
        })

        return reply.status(StatusCodes.CREATED).send(organization)
    })

    // List organizations
    app.get('/', ListOrganizationsRequestParams, async (request) => {
        const { platformId, limit, cursor } = request.query as { platformId: string; limit?: number; cursor?: string }
        
        // Get current user's organization info
        const { userService } = await import('../user/user-service')
        const currentUser = await userService(request.log).getOneOrFail({ id: request.principal.id })

        return await organizationService.list({
            platformId,
            limit,
            cursor,
            userId: request.principal.id,
            userOrganizationId: currentUser.organizationId || undefined,
            userPlatformRole: currentUser.platformRole,
        })
    })

    // List organization environments - MUST be registered before /:id route
    app.get('/:id/environments', GetOrganizationEnvironmentsRequestParams, async (request) => {
        const { id } = request.params as { id: string }
        
        console.log('[organization.controller] GET /:id/environments', {
            organizationId: id,
            principalId: request.principal?.id,
            params: request.params,
        })
        
        if (!id) {
            throw new ActivepiecesError({
                code: ErrorCode.VALIDATION,
                params: {
                    message: 'Organization ID is required',
                },
            })
        }

        // Get current user's organization info for access control
        const { userService } = await import('../user/user-service')
        if (!request.principal?.id) {
            throw new ActivepiecesError({
                code: ErrorCode.AUTHENTICATION,
                params: {
                    message: 'User ID is required',
                },
            })
        }
        
        try {
            const currentUser = await userService(request.log).getOneOrFail({ id: request.principal.id })
            console.log('[organization.controller] User found:', { userId: currentUser.id })

            // Check if user has access to this organization
            const organization = await organizationService.getById(
                id,
                request.principal.id,
                currentUser.organizationId || undefined,
                currentUser.platformRole
            )
            if (!organization) {
                throw new ActivepiecesError({
                    code: ErrorCode.ENTITY_NOT_FOUND,
                    params: {
                        entityId: id,
                        entityType: 'organization',
                    },
                })
            }

            // Get all environments for this organization
            const allEnvironments = await organizationEnvironmentService.listByOrganization(id)
            
            // Admins can see and configure Dev/Staging/Prod metadata for their org.
            // Owners see all. Members/Operators see envs for their org (read-only; no configure).
            let filteredEnvironments = allEnvironments
            if (currentUser.platformRole !== PlatformRole.OWNER && currentUser.platformRole !== PlatformRole.SUPER_ADMIN) {
                // Admin with this org: see all envs (can configure metadata)
                // Member/Operator with this org: see all envs (read-only, Configure disabled)
                if (currentUser.organizationId !== id) {
                    filteredEnvironments = []
                }
            }
            
            console.log('[organization.controller] Environments found:', { 
                count: filteredEnvironments.length,
                sample: filteredEnvironments[0] ? {
                    id: filteredEnvironments[0].id,
                    environment: filteredEnvironments[0].environment,
                    hasMetadata: !!filteredEnvironments[0].metadata,
                    adminUserId: filteredEnvironments[0].adminUserId,
                } : null,
            })
            return filteredEnvironments
        } catch (error) {
            console.error('[organization.controller] Error in GET /:id/environments:', error)
            throw error
        }
    })

    // Get organization by ID - MUST be registered after /:id/environments
    app.get('/:id', GetOrganizationByIdRequestParams, async (request) => {
        const { id } = request.params as { id: string }

        // Get current user's organization info
        const { userService } = await import('../user/user-service')
        const currentUser = await userService(request.log).getOneOrFail({ id: request.principal.id })

        const organization = await organizationService.getById(
            id,
            request.principal.id,
            currentUser.organizationId || undefined,
            currentUser.platformRole
        )
        if (!organization) {
            throw new ActivepiecesError({
                code: ErrorCode.ENTITY_NOT_FOUND,
                params: {
                    entityId: id,
                    entityType: 'organization',
                },
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
            currentUser.organizationId || undefined,
            currentUser.platformRole
        )
        if (!organization) {
            throw new ActivepiecesError({
                code: ErrorCode.ENTITY_NOT_FOUND,
                params: { entityId: organizationId, entityType: 'organization' },
            })
        }

        const isAdminOrOwner = currentUser.platformRole === PlatformRole.OWNER ||
            currentUser.platformRole === PlatformRole.SUPER_ADMIN ||
            (currentUser.platformRole === PlatformRole.ADMIN && currentUser.organizationId === organizationId)
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
        const { organizationId, environmentId } = request.params as { organizationId: string; environmentId: string }
        const { metadata } = request.body as { metadata?: unknown }

        // Get current user's organization info for access control
        const { userService } = await import('../user/user-service')
        const currentUser = await userService(request.log).getOneOrFail({ id: request.principal.id })

        // Check if user has access to this organization
        const organization = await organizationService.getById(
            organizationId,
            request.principal.id,
            currentUser.organizationId || undefined,
            currentUser.platformRole
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

        return await organizationEnvironmentService.update(environmentId, { metadata })
    })

    // Check admin availability for org-env
    app.post('/check-admin', CheckAdminRequestParams, async (request) => {
        const { organizationId, environment } = request.body as { organizationId: string; environment: EnvironmentType }

        return await organizationEnvironmentService.checkAdminAvailability({
            organizationId,
            environment
        })
    })

    // Get or create organization
    app.post('/get-or-create', GetOrCreateOrganizationRequestParams, async (request) => {
        const { name, platformId } = request.body as { name: string; platformId: string }

        return await organizationService.getOrCreate({
            name,
            platformId,
        })
    })

    // Update organization
    app.patch('/:id', UpdateOrganizationRequestParams, async (request) => {
        const { id } = request.params as { id: string }
        const updates = request.body as Partial<{ name?: string; platformId?: string; metadata?: unknown }>

        // Get current user's organization info
        const { userService } = await import('../user/user-service')
        const currentUser = await userService(request.log).getOneOrFail({ id: request.principal.id })

        return await organizationService.update(
            id,
            updates,
            request.principal.id,
            currentUser.organizationId || undefined,
            currentUser.platformRole
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
        const { organizationId, platformRole } = request.body as { organizationId: string; platformRole: PlatformRole }
        const currentUserId = request.principal.id
        const platformId = request.principal.platform.id

        // Verify the organization exists
        const { userService } = await import('../user/user-service')
        const currentUser = await userService(request.log).getOneOrFail({ id: currentUserId })

        const organization = await organizationService.getById(
            organizationId,
            currentUserId,
            currentUser.organizationId || undefined,
            currentUser.platformRole
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
        body: CreateOrganizationRequest,
        response: {
            [StatusCodes.CREATED]: Organization,
        },
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
        }),
        // Response schema omitted due to TypeBox/Zod compatibility
    },
}

const GetOrganizationEnvironmentsRequestParams = {
    config: {
        security: securityAccess.publicPlatform([PrincipalType.USER]),
    },
    schema: {
        tags: ['organizations'],
        summary: 'List environments for an organization',
        params: z.object({
            id: z.string(),
        }),
        // Response schema omitted due to TypeBox/Zod compatibility
    },
}

const GetOrganizationByIdRequestParams = {
    config: {
        security: securityAccess.publicPlatform([PrincipalType.USER]),
    },
    schema: {
        tags: ['organizations'],
        summary: 'Get organization by ID',
        params: z.object({
            id: z.string(),
        }),
        // Response schema omitted due to TypeBox/Zod compatibility
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
        response: {
            [StatusCodes.OK]: OrganizationEnvironment,
        },
    },
}

const CheckAdminRequestParams = {
    config: {
        security: securityAccess.publicPlatform([PrincipalType.USER]),
    },
    schema: {
        tags: ['organizations'],
        summary: 'Check if admin slot is available for organization-environment',
        body: CheckAdminAvailabilityRequest,
        response: {
            [StatusCodes.OK]: CheckAdminAvailabilityResponse,
        },
    },
}

const GetOrCreateOrganizationRequestParams = {
    config: {
        security: securityAccess.publicPlatform([PrincipalType.USER]),
    },
    schema: {
        tags: ['organizations'],
        summary: 'Get existing organization or create new one',
        body: CreateOrganizationRequest,
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
