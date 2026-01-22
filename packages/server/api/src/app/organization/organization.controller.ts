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

        return await organizationService.list({
            platformId,
            limit,
            cursor,
        })
    })

    // Get organization by ID
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

        const organization = await organizationService.getById(id)
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

    // List organization environments
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

        return await organizationEnvironmentService.listByOrganization(id)
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

        return await organizationService.update(id, updates)
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
}
