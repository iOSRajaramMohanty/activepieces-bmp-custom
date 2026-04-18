import { FastifyInstance } from 'fastify'
import { StatusCodes } from 'http-status-codes'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createTestContext } from '../../../helpers/test-context'
import { setupTestEnvironment, teardownTestEnvironment } from '../../../helpers/test-setup'

let app: FastifyInstance | null = null

beforeAll(async () => {
    app = await setupTestEnvironment()
})

afterAll(async () => {
    await teardownTestEnvironment()
})

describe('Chatbot API', () => {
    it('builder mode should reply and return a session', async () => {
        const ctx = await createTestContext(app!)
        const res = await ctx.post(
            '/v1/chatbot/message',
            {
                mode: 'builder',
                message: 'Salesforce: create lead then create task',
            },
            { query: { projectId: ctx.project.id } },
        )

        expect(res.statusCode).toBe(StatusCodes.OK)
        const body = res.json()
        expect(body.mode).toBe('builder')
        expect(typeof body.sessionId).toBe('string')
        expect(body.sessionId.length).toBeGreaterThan(10)
        expect(body.flowId === null || (typeof body.flowId === 'string' && body.flowId.length > 10)).toBe(
            true,
        )
        expect(typeof body.reply).toBe('string')
        expect(Array.isArray(body.messages)).toBe(true)
        expect(body.messages).toHaveLength(2)
        expect(body.messages[0].role).toBe('user')
        expect(body.messages[1].role).toBe('assistant')
    })

    it('builder mode should append to the same session when sessionId is sent', async () => {
        const ctx = await createTestContext(app!)
        const first = await ctx.post(
            '/v1/chatbot/message',
            {
                mode: 'builder',
                message: 'First message for session',
            },
            { query: { projectId: ctx.project.id } },
        )
        expect(first.statusCode).toBe(StatusCodes.OK)
        const firstBody = first.json()
        const second = await ctx.post(
            '/v1/chatbot/message',
            {
                mode: 'builder',
                message: 'Second message for session',
                sessionId: firstBody.sessionId,
            },
            { query: { projectId: ctx.project.id } },
        )
        expect(second.statusCode).toBe(StatusCodes.OK)
        const secondBody = second.json()
        expect(secondBody.sessionId).toBe(firstBody.sessionId)
        expect(secondBody.messages).toHaveLength(4)
    })

    it('should return stored messages for GET /v1/chatbot/session', async () => {
        const ctx = await createTestContext(app!)
        const first = await ctx.post(
            '/v1/chatbot/message',
            {
                mode: 'builder',
                message: 'Hello session restore',
            },
            { query: { projectId: ctx.project.id } },
        )
        expect(first.statusCode).toBe(StatusCodes.OK)
        const firstBody = first.json() as { sessionId: string; messages: unknown[] }
        const getRes = await ctx.get('/v1/chatbot/session', undefined, {
            query: {
                projectId: ctx.project.id,
                sessionId: firstBody.sessionId,
                mode: 'builder',
            },
        })
        expect(getRes.statusCode).toBe(StatusCodes.OK)
        const getBody = getRes.json() as { sessionId: string; mode: string; messages: unknown[] }
        expect(getBody.sessionId).toBe(firstBody.sessionId)
        expect(getBody.mode).toBe('builder')
        expect(Array.isArray(getBody.messages)).toBe(true)
        expect(getBody.messages).toHaveLength(2)
    })

    it('should return 404 for unknown chatbot session id', async () => {
        const ctx = await createTestContext(app!)
        const getRes = await ctx.get('/v1/chatbot/session', undefined, {
            query: {
                projectId: ctx.project.id,
                sessionId: 'nonexistent_session_id_xxxxxxxx',
                mode: 'builder',
            },
        })
        expect(getRes.statusCode).toBe(StatusCodes.NOT_FOUND)
    })

    it('should get embed settings (creates defaults if missing)', async () => {
        const ctx = await createTestContext(app!)
        const res = await ctx.get('/v1/chatbot/embed', undefined, {
            query: { projectId: ctx.project.id },
        })

        expect(res.statusCode).toBe(StatusCodes.OK)
        const body = res.json()
        expect(body.projectId).toBe(ctx.project.id)
        expect(typeof body.publishableKey).toBe('string')
        expect(Array.isArray(body.allowedDomains)).toBe(true)
    })

    describe('public embed message', () => {
        it('should reject an invalid publishable key', async () => {
            const ctx = await createTestContext(app!)
            const res = await app!.inject({
                method: 'POST',
                url: '/api/v1/chatbot/public/message',
                headers: {
                    'content-type': 'application/json',
                    origin: 'http://localhost:3000',
                },
                payload: {
                    projectId: ctx.project.id,
                    publishableKey: 'invalid_key_not_in_database',
                    mode: 'builder',
                    message: 'Hello',
                },
            })
            expect(res.statusCode).toBe(StatusCodes.UNAUTHORIZED)
        })

        it('should accept a valid key when embed is enabled and origin matches allowedDomains', async () => {
            const ctx = await createTestContext(app!)
            const embedRes = await ctx.get('/v1/chatbot/embed', undefined, {
                query: { projectId: ctx.project.id },
            })
            expect(embedRes.statusCode).toBe(StatusCodes.OK)
            const publishableKey = readPublishableKeyFromEmbedResponse(embedRes.json())

            const updateRes = await ctx.post(
                '/v1/chatbot/embed',
                {
                    enabled: true,
                    allowedDomains: ['localhost'],
                    builderEnabled: true,
                    agentEnabled: true,
                },
                { query: { projectId: ctx.project.id } },
            )
            expect(updateRes.statusCode).toBe(StatusCodes.OK)

            const res = await app!.inject({
                method: 'POST',
                url: '/api/v1/chatbot/public/message',
                headers: {
                    'content-type': 'application/json',
                    origin: 'http://localhost:3000',
                },
                payload: {
                    projectId: ctx.project.id,
                    publishableKey,
                    mode: 'builder',
                    message: 'Embed public hello',
                },
            })
            expect(res.statusCode).toBe(StatusCodes.OK)
            const body = res.json()
            expect(body.mode).toBe('builder')
            expect(body.flowId === null || typeof body.flowId === 'string').toBe(true)
            expect(body.messages).toHaveLength(2)

            const sessionId = body.sessionId as string
            const sessionQs = new URLSearchParams({
                projectId: ctx.project.id,
                publishableKey,
                sessionId,
                mode: 'builder',
            })
            const getSession = await app!.inject({
                method: 'GET',
                url: `/api/v1/chatbot/public/session?${sessionQs.toString()}`,
                headers: {
                    origin: 'http://localhost:3000',
                },
            })
            expect(getSession.statusCode).toBe(StatusCodes.OK)
            const sessionBody = getSession.json() as { messages: unknown[]; sessionId: string }
            expect(sessionBody.sessionId).toBe(sessionId)
            expect(Array.isArray(sessionBody.messages)).toBe(true)
            expect(sessionBody.messages).toHaveLength(2)
        })
    })
})

function readPublishableKeyFromEmbedResponse(data: unknown): string {
    if (typeof data !== 'object' || data === null || !('publishableKey' in data)) {
        throw new Error('embed response missing publishableKey')
    }
    const value = Reflect.get(data, 'publishableKey')
    if (typeof value !== 'string') {
        throw new Error('embed response publishableKey is not a string')
    }
    return value
}

