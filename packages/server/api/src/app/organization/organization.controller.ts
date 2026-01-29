import { FastifyPluginAsyncTypebox } from '@fastify/type-provider-typebox'
import { Type } from '@sinclair/typebox'
import { organizationService } from './organization.service'
import { organizationEnvironmentService } from './organization-environment.service'
import {
    CreateOrganizationRequest,
    ListOrganizationsRequest,
    CheckAdminAvailabilityRequest,
    CheckAdminAvailabilityResponse,
    Organization,
    SeekPage,
    OrganizationEnvironment,
    EnvironmentType,
    ActivepiecesError,
    ErrorCode,
    PrincipalType,
    PlatformRole,
} from '@activepieces/shared'
import { StatusCodes } from 'http-status-codes'
import { securityAccess } from '@activepieces/server-shared'

export const organizationController: FastifyPluginAsyncTypebox = async (app) => {
    // Create organization
    app.post('/', {
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
    }, async (request, reply) => {
        const { name, platformId } = request.body

        const organization = await organizationService.create({
            name,
            platformId,
        })

        return reply.status(StatusCodes.CREATED).send(organization)
    })

    // List organizations
    app.get('/', {
        config: {
            security: securityAccess.publicPlatform([PrincipalType.USER]),
        },
        schema: {
            tags: ['organizations'],
            summary: 'List organizations',
            querystring: Type.Object({
                platformId: Type.String(),
                limit: Type.Optional(Type.Number({ minimum: 1, maximum: 100 })),
                cursor: Type.Optional(Type.String()),
            }),
            response: {
                [StatusCodes.OK]: SeekPage(Organization),
            },
        },
    }, async (request) => {
        const { platformId, limit, cursor } = request.query
        
        // Get current user's organization info
        const { userService } = await import('../user/user-service')
        const currentUser = await userService.getOneOrFail({ id: request.principal.id })

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
    app.get('/:id/environments', {
        config: {
            security: securityAccess.publicPlatform([PrincipalType.USER]),
        },
        schema: {
            tags: ['organizations'],
            summary: 'List environments for an organization',
            params: Type.Object({
                id: Type.String(),
            }),
            response: {
                [StatusCodes.OK]: Type.Array(OrganizationEnvironment),
            },
        },
    }, async (request) => {
        const { id } = request.params
        
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
            const currentUser = await userService.getOneOrFail({ id: request.principal.id })
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
            
            // IMPORTANT: Filter environments based on user's admin role
            // Each environment admin can ONLY see and manage their own environment
            // Platform owners can see all environments
            let filteredEnvironments = allEnvironments
            
            if (currentUser.platformRole !== PlatformRole.OWNER) {
                // Non-owner users can only see environments where they are the admin
                filteredEnvironments = allEnvironments.filter(env => 
                    env.adminUserId === currentUser.id
                )
                
                console.log('[organization.controller] Filtered environments for non-owner:', {
                    userId: currentUser.id,
                    originalCount: allEnvironments.length,
                    filteredCount: filteredEnvironments.length,
                })
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
    app.get('/:id', {
        config: {
            security: securityAccess.publicPlatform([PrincipalType.USER]),
        },
        schema: {
            tags: ['organizations'],
            summary: 'Get organization by ID',
            params: Type.Object({
                id: Type.String(),
            }),
            response: {
                [StatusCodes.OK]: Organization,
            },
        },
    }, async (request) => {
        const { id } = request.params

        // Get current user's organization info
        const { userService } = await import('../user/user-service')
        const currentUser = await userService.getOneOrFail({ id: request.principal.id })

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

    // Update organization environment metadata
    app.patch('/:organizationId/environments/:environmentId/metadata', {
        config: {
            security: securityAccess.publicPlatform([PrincipalType.USER]),
        },
        schema: {
            tags: ['organizations'],
            summary: 'Update metadata for an organization environment',
            params: Type.Object({
                organizationId: Type.String(),
                environmentId: Type.String(),
            }),
            body: Type.Object({
                metadata: Type.Optional(Type.Unknown()),
            }),
            response: {
                [StatusCodes.OK]: OrganizationEnvironment,
            },
        },
    }, async (request) => {
        const { organizationId, environmentId } = request.params
        const { metadata } = request.body

        // Get current user's organization info for access control
        const { userService } = await import('../user/user-service')
        const currentUser = await userService.getOneOrFail({ id: request.principal.id })

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
    app.post('/check-admin', {
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
    }, async (request) => {
        const { organizationId, environment } = request.body

        return await organizationEnvironmentService.checkAdminAvailability({
            organizationId,
            environment
        })
    })

    // Get or create organization
    app.post('/get-or-create', {
        config: {
            security: securityAccess.publicPlatform([PrincipalType.USER]),
        },
        schema: {
            tags: ['organizations'],
            summary: 'Get existing organization or create new one',
            body: CreateOrganizationRequest,
            response: {
                [StatusCodes.OK]: Organization,
            },
        },
    }, async (request) => {
        const { name, platformId } = request.body

        return await organizationService.getOrCreate({
            name,
            platformId,
        })
    })

    // Update organization
    app.patch('/:id', {
        config: {
            security: securityAccess.publicPlatform([PrincipalType.USER]),
        },
        schema: {
            tags: ['organizations'],
            summary: 'Update organization',
            params: Type.Object({
                id: Type.String(),
            }),
            body: Type.Object({
                name: Type.Optional(Type.String()),
                metadata: Type.Optional(Type.Unknown()),
            }),
            response: {
                [StatusCodes.OK]: Organization,
            },
        },
    }, async (request) => {
        const { id } = request.params
        const updates = request.body

        // Get current user's organization info
        const { userService } = await import('../user/user-service')
        const currentUser = await userService.getOneOrFail({ id: request.principal.id })

        return await organizationService.update(
            id,
            updates,
            request.principal.id,
            currentUser.organizationId || undefined,
            currentUser.platformRole
        )
    })

    // Delete organization
    app.delete('/:id', {
        config: {
            security: securityAccess.publicPlatform([PrincipalType.USER]),
        },
        schema: {
            tags: ['organizations'],
            summary: 'Delete organization',
            params: Type.Object({
                id: Type.String(),
            }),
            response: {
                [StatusCodes.NO_CONTENT]: Type.Null(),
            },
        },
    }, async (request, reply) => {
        const { id } = request.params

        await organizationService.delete(id)

        return reply.status(StatusCodes.NO_CONTENT).send()
    })

    // Get allowed environments for current user based on their adminUserId
    // Used by pieces to dynamically filter environment options
    app.get('/current-user/allowed-environments', {
        config: {
            security: securityAccess.publicPlatform([PrincipalType.USER]),
        },
        schema: {
            tags: ['organizations'],
            summary: 'Get allowed environments for current user (based on adminUserId)',
            response: {
                [StatusCodes.OK]: Type.Object({
                    environments: Type.Array(Type.String()),
                    organizationId: Type.String(),
                    userId: Type.String(),
                }),
            },
        },
    }, async (request) => {
        try {
            console.log('[organization.controller] GET /current-user/allowed-environments');
            console.log('[organization.controller] Principal ID:', request.principal.id);
            
            const currentUserId = request.principal.id
            
            // Get current user's organization
            const { userService } = await import('../user/user-service')
            const currentUser = await userService.getOneOrFail({ id: currentUserId })
            
            console.log('[organization.controller] Current user organization:', currentUser.organizationId);
            console.log('[organization.controller] Current user ID:', currentUserId);
            
            if (!currentUser.organizationId) {
                console.warn('[organization.controller] User has no organizationId');
                return {
                    environments: ['Dev', 'Staging', 'Production'], // Default: all environments
                    organizationId: '',
                    userId: currentUserId,
                }
            }
            
            // Get ALL organization environments
            const orgEnvironments = await organizationEnvironmentService.listByOrganization(
                currentUser.organizationId
            )
            
            console.log('[organization.controller] All organization environments:', 
                orgEnvironments.map(e => `${e.environment} (admin: ${e.adminUserId})`).join(', '))
            
            // Filter to only environments where current user is the admin
            const userAdminEnvironments = orgEnvironments.filter(
                env => env.adminUserId === currentUserId
            )
            
            console.log('[organization.controller] User is admin of:', 
                userAdminEnvironments.map(e => e.environment).join(', '))
            
            // Extract environment types where user is admin
            const allowedEnvironments = userAdminEnvironments.map(env => env.environment)
            
            // If user is not admin of any environment, return all as default
            // (This handles platform admins or users without specific environment assignments)
            if (allowedEnvironments.length === 0) {
                console.warn('[organization.controller] User is not admin of any environment, returning all');
                return {
                    environments: ['Dev', 'Staging', 'Production'],
                    organizationId: currentUser.organizationId,
                    userId: currentUserId,
                }
            }
            
            return {
                environments: allowedEnvironments,
                organizationId: currentUser.organizationId,
                userId: currentUserId,
            }
        } catch (error) {
            console.error('[organization.controller] Error fetching allowed environments:', error)
            // Fallback: return all environments on error
            return {
                environments: ['Dev', 'Staging', 'Production'],
                organizationId: '',
                userId: request.principal.id,
            }
        }
    })
}
