import { apId, isNil } from '@activepieces/shared'
import { FastifyBaseLogger } from 'fastify'
import { repoFactory } from '../core/db/repo-factory'
import { ChatbotSessionEntity } from './chatbot-session.entity'

const chatbotSessionRepo = repoFactory(ChatbotSessionEntity)

const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000
const MAX_STORED_MESSAGES = 100

export const chatbotSessionService = (log: FastifyBaseLogger) => {
    return {
        getOrCreateSession: (params: GetOrCreateSessionParams) => getOrCreateSession({ ...params, log }),
        appendTurn: (params: AppendTurnParams) => appendTurn({ ...params, log }),
        getSessionForProject: (params: GetSessionForProjectParams) => getSessionForProject({ ...params, log }),
    }
}

async function getOrCreateSession(params: GetOrCreateSessionParams & { log: FastifyBaseLogger }): Promise<SessionRow> {
    if (params.sessionId) {
        const existing = await chatbotSessionRepo().findOneBy({
            id: params.sessionId,
            projectId: params.projectId,
        })
        if (!isNil(existing) && !isSessionExpired(existing) && isPersistedMode(existing.mode) && existing.mode === params.mode) {
            return toSessionRowWithValidatedMode(existing)
        }
    }
    const id = apId()
    const flowId = params.flowId ?? null
    const expiresAt = new Date(Date.now() + SESSION_TTL_MS)
    const created: SessionRow = {
        id,
        projectId: params.projectId,
        mode: params.mode,
        flowId,
        messages: [],
        expiresAt: expiresAt.toISOString(),
    }
    await chatbotSessionRepo().save(created)
    params.log.info({ projectId: params.projectId, sessionId: id }, 'Chatbot session created')
    return created
}

async function getSessionForProject(params: GetSessionForProjectParams & { log: FastifyBaseLogger }): Promise<ChatbotSessionPayload | null> {
    const existing = await chatbotSessionRepo().findOneBy({
        id: params.sessionId,
        projectId: params.projectId,
    })
    if (isNil(existing)) {
        return null
    }
    if (isSessionExpired(existing)) {
        return null
    }
    if (!isPersistedMode(existing.mode) || existing.mode !== params.mode) {
        return null
    }
    const rawMessages = Array.isArray(existing.messages) ? existing.messages : []
    return {
        sessionId: existing.id,
        mode: existing.mode,
        flowId: existing.flowId ?? null,
        messages: extractChatMessages(rawMessages),
    }
}

async function appendTurn(params: AppendTurnParams & { log: FastifyBaseLogger }): Promise<AppendTurnResult> {
    const existing = await chatbotSessionRepo().findOneBy({
        id: params.sessionId,
        projectId: params.projectId,
    })
    if (isNil(existing)) {
        params.log.warn({ sessionId: params.sessionId, projectId: params.projectId }, 'Chatbot session missing on append')
        return {
            sessionId: params.sessionId,
            messages: [],
            flowId: params.sessionFlowIdAfter,
        }
    }
    const previousMessages = extractChatMessages(existing.messages)
    const now = new Date().toISOString()
    const userEntry: ChatMessage = {
        role: 'user',
        content: params.userMessage,
        created: now,
    }
    const assistantEntry: ChatMessage = {
        role: 'assistant',
        content: params.assistantReply,
        created: now,
    }
    const messages = [...previousMessages, userEntry, assistantEntry].slice(-MAX_STORED_MESSAGES)
    const expiresAt = new Date(Date.now() + SESSION_TTL_MS)
    await chatbotSessionRepo().update(
        { id: params.sessionId, projectId: params.projectId },
        {
            messages,
            flowId: params.sessionFlowIdAfter,
            expiresAt: expiresAt.toISOString(),
        },
    )
    return {
        sessionId: params.sessionId,
        messages,
        flowId: params.sessionFlowIdAfter,
    }
}

function isSessionExpired(session: { expiresAt: string | Date | null }): boolean {
    if (isNil(session.expiresAt)) {
        return false
    }
    const ms = session.expiresAt instanceof Date
        ? session.expiresAt.getTime()
        : new Date(session.expiresAt).getTime()
    return ms < Date.now()
}

function toSessionRowWithValidatedMode(session: {
    id: string
    projectId: string
    mode: string
    flowId: string | null
    messages: unknown[]
    expiresAt: string | null
}): SessionRow {
    if (!isPersistedMode(session.mode)) {
        throw new Error('Invalid chatbot session mode in database')
    }
    return {
        id: session.id,
        projectId: session.projectId,
        mode: session.mode,
        flowId: session.flowId,
        messages: session.messages,
        expiresAt: session.expiresAt,
    }
}

function isPersistedMode(value: string): value is ChatbotMode {
    return value === 'builder' || value === 'agent'
}

function extractChatMessages(raw: unknown[]): ChatMessage[] {
    const result: ChatMessage[] = []
    for (const item of raw) {
        if (isChatMessage(item)) {
            result.push(item)
        }
    }
    return result
}

function isChatMessage(value: unknown): value is ChatMessage {
    if (typeof value !== 'object' || value === null) {
        return false
    }
    if (!('role' in value) || !('content' in value) || !('created' in value)) {
        return false
    }
    const role = Reflect.get(value, 'role')
    const content = Reflect.get(value, 'content')
    const created = Reflect.get(value, 'created')
    if (role !== 'user' && role !== 'assistant') {
        return false
    }
    if (typeof content !== 'string') {
        return false
    }
    if (typeof created !== 'string') {
        return false
    }
    return true
}

type GetSessionForProjectParams = {
    projectId: string
    sessionId: string
    mode: ChatbotMode
}

type ChatbotSessionPayload = {
    sessionId: string
    mode: ChatbotMode
    flowId: string | null
    messages: ChatMessage[]
}

type GetOrCreateSessionParams = {
    projectId: string
    sessionId?: string
    mode: ChatbotMode
    flowId?: string | null
}

type AppendTurnParams = {
    projectId: string
    sessionId: string
    userMessage: string
    assistantReply: string
    sessionFlowIdAfter: string | null
}

type AppendTurnResult = {
    sessionId: string
    messages: ChatMessage[]
    flowId: string | null
}

type SessionRow = {
    id: string
    projectId: string
    mode: ChatbotMode
    flowId: string | null
    messages: unknown[]
    expiresAt: string | null
}

type ChatbotMode = 'builder' | 'agent'

type ChatMessage = {
    role: 'user' | 'assistant'
    content: string
    created: string
}

export type { ChatMessage }
