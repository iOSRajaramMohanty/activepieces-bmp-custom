import { Permission, PrincipalType } from '@activepieces/shared'
import { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { StatusCodes } from 'http-status-codes'
import { z } from 'zod'
import { authenticationUtils } from '../authentication/authentication-utils'
import { ProjectResourceType } from '../core/security/authorization/common'
import { securityAccess } from '../core/security/authorization/fastify-security'
import { chatbotEmbedService } from './chatbot-embed.service'
import { chatbotPublicMessageRateLimiter } from './chatbot-public-message-rate-limiter'
import { chatbotSessionService } from './chatbot-session.service'
import { chatbotService } from './chatbot.service'

export const chatbotModule: FastifyPluginAsyncZod = async (app) => {
    await app.register(chatbotController, { prefix: '/v1/chatbot' })
}

const ChatbotMessageOkResponse = z.object({
    mode: z.enum(['builder', 'agent']),
    sessionId: z.string(),
    flowId: z.string().nullable(),
    reply: z.string(),
    messages: z.array(
        z.object({
            role: z.enum(['user', 'assistant']),
            content: z.string(),
            created: z.string(),
        }),
    ),
})

const chatbotController: FastifyPluginAsyncZod = async (app) => {
    app.post('/public/message', PublicChatbotMessageRequest, async (request, reply) => {
        const body = request.body
        await chatbotPublicMessageRateLimiter(request.log).enforceOrThrow({
            request,
            projectId: body.projectId,
            publishableKey: body.publishableKey,
        })
        const refererHeader = typeof request.headers.referer === 'string' ? request.headers.referer : undefined
        const { ownerUserId } = await chatbotEmbedService(request.log).validatePublicEmbedMessageAccess({
            projectId: body.projectId,
            publishableKey: body.publishableKey,
            mode: body.mode,
            originHeader: request.headers.origin,
            refererHeader,
        })
        const result = await chatbotService(request.log).handleMessage({
            projectId: body.projectId,
            userId: ownerUserId,
            mode: body.mode,
            message: body.message,
            sessionId: body.sessionId,
            flowId: body.flowId,
            metadata: body.metadata,
        })
        return reply.status(StatusCodes.OK).send(result)
    })

    app.get('/public/session', GetPublicChatbotSessionRequest, async (request, reply) => {
        const query = request.query
        await chatbotPublicMessageRateLimiter(request.log).enforceOrThrow({
            request,
            projectId: query.projectId,
            publishableKey: query.publishableKey,
        })
        const refererHeader = typeof request.headers.referer === 'string' ? request.headers.referer : undefined
        await chatbotEmbedService(request.log).validatePublicEmbedMessageAccess({
            projectId: query.projectId,
            publishableKey: query.publishableKey,
            mode: query.mode,
            originHeader: request.headers.origin,
            refererHeader,
        })
        const session = await chatbotSessionService(request.log).getSessionForProject({
            projectId: query.projectId,
            sessionId: query.sessionId,
            mode: query.mode,
        })
        if (session === null) {
            return reply.status(StatusCodes.NOT_FOUND).send()
        }
        return reply.status(StatusCodes.OK).send(session)
    })

    app.post('/message', CreateChatbotMessageRequest, async (request, reply) => {
        const userId = await authenticationUtils(request.log).extractUserIdFromRequest(request)
        const result = await chatbotService(request.log).handleMessage({
            projectId: request.projectId,
            userId,
            mode: request.body.mode,
            message: request.body.message,
            sessionId: request.body.sessionId,
            flowId: request.body.flowId,
            metadata: request.body.metadata,
        })
        return reply.status(StatusCodes.OK).send(result)
    })

    app.get('/session', GetChatbotSessionRequest, async (request, reply) => {
        const session = await chatbotSessionService(request.log).getSessionForProject({
            projectId: request.projectId,
            sessionId: request.query.sessionId,
            mode: request.query.mode,
        })
        if (session === null) {
            return reply.status(StatusCodes.NOT_FOUND).send()
        }
        return reply.status(StatusCodes.OK).send(session)
    })

    app.get('/embed', GetEmbedSettingsRequest, async (request, reply) => {
        const settings = await chatbotEmbedService(request.log).getOrCreate({ projectId: request.projectId })
        return reply.status(StatusCodes.OK).send(settings)
    })

    app.post('/embed', UpdateEmbedSettingsRequest, async (request, reply) => {
        const settings = await chatbotEmbedService(request.log).update({
            projectId: request.projectId,
            update: request.body,
        })
        return reply.status(StatusCodes.OK).send(settings)
    })

    app.post('/embed/rotate-key', RotateEmbedKeyRequest, async (request, reply) => {
        const settings = await chatbotEmbedService(request.log).rotateKey({ projectId: request.projectId })
        return reply.status(StatusCodes.OK).send(settings)
    })
}

const ChatbotSessionResponse = z.object({
    sessionId: z.string(),
    mode: z.enum(['builder', 'agent']),
    flowId: z.string().nullable(),
    messages: z.array(
        z.object({
            role: z.enum(['user', 'assistant']),
            content: z.string(),
            created: z.string(),
        }),
    ),
})

const GetChatbotSessionRequest = {
    config: {
        security: securityAccess.project(
            [PrincipalType.USER],
            Permission.READ_FLOW,
            {
                type: ProjectResourceType.QUERY,
            },
        ),
    },
    schema: {
        tags: ['chatbot'],
        querystring: z.object({
            projectId: z.string(),
            sessionId: z.string(),
            mode: z.enum(['builder', 'agent']),
        }),
        response: {
            [StatusCodes.OK]: ChatbotSessionResponse,
            [StatusCodes.NOT_FOUND]: z.void(),
        },
    },
}

const CreateChatbotMessageRequest = {
    config: {
        security: securityAccess.project(
            [PrincipalType.USER],
            Permission.WRITE_FLOW,
            {
                type: ProjectResourceType.QUERY,
            },
        ),
    },
    schema: {
        tags: ['chatbot'],
        querystring: z.object({
            projectId: z.string(),
        }),
        body: z.object({
            mode: z.enum(['builder', 'agent']),
            message: z.string().min(1),
            sessionId: z.string().optional(),
            flowId: z.string().optional(),
            metadata: z.record(z.string(), z.unknown()).optional(),
        }),
        response: {
            [StatusCodes.OK]: ChatbotMessageOkResponse,
        },
    },
}

const PublicChatbotMessageRequest = {
    config: {
        security: securityAccess.public(),
    },
    schema: {
        tags: ['chatbot'],
        body: z.object({
            projectId: z.string().min(1),
            publishableKey: z.string().min(1),
            mode: z.enum(['builder', 'agent']),
            message: z.string().min(1),
            sessionId: z.string().optional(),
            flowId: z.string().optional(),
            metadata: z.record(z.string(), z.unknown()).optional(),
        }),
        response: {
            [StatusCodes.OK]: ChatbotMessageOkResponse,
        },
    },
}

const GetPublicChatbotSessionRequest = {
    config: {
        security: securityAccess.public(),
    },
    schema: {
        tags: ['chatbot'],
        querystring: z.object({
            projectId: z.string().min(1),
            publishableKey: z.string().min(1),
            sessionId: z.string().min(1),
            mode: z.enum(['builder', 'agent']),
        }),
        response: {
            [StatusCodes.OK]: ChatbotSessionResponse,
            [StatusCodes.NOT_FOUND]: z.void(),
        },
    },
}

const EmbedSettingsResponse = z.object({
    id: z.string(),
    created: z.string().optional(),
    updated: z.string().optional(),
    projectId: z.string(),
    enabled: z.boolean(),
    publishableKey: z.string(),
    allowedDomains: z.array(z.string()),
    builderEnabled: z.boolean(),
    agentEnabled: z.boolean(),
})

const GetEmbedSettingsRequest = {
    config: {
        security: securityAccess.project(
            [PrincipalType.USER],
            Permission.READ_FLOW,
            {
                type: ProjectResourceType.QUERY,
            },
        ),
    },
    schema: {
        tags: ['chatbot'],
        querystring: z.object({
            projectId: z.string(),
        }),
        response: {
            [StatusCodes.OK]: EmbedSettingsResponse,
        },
    },
}

const UpdateEmbedSettingsRequest = {
    config: {
        security: securityAccess.project(
            [PrincipalType.USER],
            Permission.WRITE_FLOW,
            {
                type: ProjectResourceType.QUERY,
            },
        ),
    },
    schema: {
        tags: ['chatbot'],
        querystring: z.object({
            projectId: z.string(),
        }),
        body: z.object({
            enabled: z.boolean().optional(),
            allowedDomains: z.array(z.string()).optional(),
            builderEnabled: z.boolean().optional(),
            agentEnabled: z.boolean().optional(),
        }),
        response: {
            [StatusCodes.OK]: EmbedSettingsResponse,
        },
    },
}

const RotateEmbedKeyRequest = {
    config: {
        security: securityAccess.project(
            [PrincipalType.USER],
            Permission.WRITE_FLOW,
            {
                type: ProjectResourceType.QUERY,
            },
        ),
    },
    schema: {
        tags: ['chatbot'],
        querystring: z.object({
            projectId: z.string(),
        }),
        response: {
            [StatusCodes.OK]: EmbedSettingsResponse,
        },
    },
}

