import { isNil } from '@activepieces/shared'
import { FastifyBaseLogger } from 'fastify'
import { StatusCodes } from 'http-status-codes'
import { projectService } from '../project/project-service'
import { WebhookFlowVersionToRun, webhookService } from '../webhooks/webhook.service'
import { executeCatchWebhookInvocation, runChatbotAgentConversation } from './chatbot-agent-conversation'
import { runChatbotBuilderAgent } from './chatbot-builder-agent'
import { chatbotSessionService } from './chatbot-session.service'

export const chatbotService = (log: FastifyBaseLogger) => {
    return {
        async handleMessage(params: HandleMessageParams): Promise<ChatbotMessageResponse> {
            switch (params.mode) {
                case 'builder':
                    return handleBuilderMessage({ ...params, log })
                case 'agent':
                    return handleAgentMessage({ ...params, log })
            }
        },
    }
}

async function handleBuilderMessage(params: HandleBuilderMessageParams): Promise<ChatbotMessageResponse> {
    const sessions = chatbotSessionService(params.log)
    const session = await sessions.getOrCreateSession({
        projectId: params.projectId,
        sessionId: params.sessionId,
        mode: 'builder',
        flowId: params.flowId ?? null,
    })
    const priorMessages = extractPriorChatTurns(session.messages)
    const project = await projectService(params.log).getOneOrThrow(params.projectId)
    const effectiveSessionFlowId = params.flowId ?? session.flowId

    const agentOutcome = await runChatbotBuilderAgent({
        log: params.log,
        projectId: params.projectId,
        platformId: project.platformId,
        userId: params.userId,
        userMessage: params.message,
        priorMessages,
        sessionFlowId: effectiveSessionFlowId,
    })

    let flowId: string | null = null
    let reply: string

    if (agentOutcome.status === 'ok') {
        flowId = agentOutcome.flowId ?? effectiveSessionFlowId
        reply = agentOutcome.reply
    }
    else {
        flowId = effectiveSessionFlowId
        reply =
            'The builder assistant is unavailable because no platform AI provider is configured. Add one in platform settings, then describe the automation you want. No draft flow was created.'
    }

    const updated = await sessions.appendTurn({
        projectId: params.projectId,
        sessionId: session.id,
        userMessage: params.message,
        assistantReply: reply,
        sessionFlowIdAfter: flowId,
    })
    return {
        mode: 'builder',
        sessionId: updated.sessionId,
        flowId: updated.flowId,
        reply,
        messages: updated.messages,
    }
}

async function handleAgentMessage(params: HandleAgentMessageParams): Promise<ChatbotMessageResponse> {
    const sessions = chatbotSessionService(params.log)
    const session = await sessions.getOrCreateSession({
        projectId: params.projectId,
        sessionId: params.sessionId,
        mode: 'agent',
        flowId: params.flowId ?? null,
    })
    const priorMessages = extractPriorChatTurns(session.messages)
    const project = await projectService(params.log).getOneOrThrow(params.projectId)
    const effectiveFlowId = params.flowId ?? session.flowId

    params.log.info({
        projectId: params.projectId,
        sessionId: session.id,
        flowId: effectiveFlowId ?? null,
        messagePreview: params.message.slice(0, 200),
    }, 'chatbot: agent message received')

    const priorPayload = extractLastJsonObjectFromConversation(priorMessages)
    if (!isNil(effectiveFlowId) && !isNil(priorPayload) && isRetryWithPriorPayloadIntent(params.message)) {
        params.log.info({ flowId: effectiveFlowId }, 'chatbot: retry fast path — invoking Catch Webhook with JSON from chat history')
        const reply = await executeCatchWebhookInvocation({
            log: params.log,
            projectId: params.projectId,
            userId: params.userId,
            flowId: effectiveFlowId,
            body: priorPayload,
        })
        const flowIdAfter = effectiveFlowId
        const updated = await sessions.appendTurn({
            projectId: params.projectId,
            sessionId: session.id,
            userMessage: params.message,
            assistantReply: reply,
            sessionFlowIdAfter: flowIdAfter,
        })
        return {
            mode: 'agent',
            sessionId: updated.sessionId,
            flowId: updated.flowId,
            reply,
            messages: updated.messages,
        }
    }

    const agentConversation = await runChatbotAgentConversation({
        log: params.log,
        projectId: params.projectId,
        platformId: project.platformId,
        userId: params.userId,
        userMessage: params.message,
        priorMessages,
        preferredFlowId: effectiveFlowId,
    })

    if (agentConversation.status === 'ok') {
        const flowIdAfter = agentConversation.flowId ?? effectiveFlowId ?? null
        const updated = await sessions.appendTurn({
            projectId: params.projectId,
            sessionId: session.id,
            userMessage: params.message,
            assistantReply: agentConversation.reply,
            sessionFlowIdAfter: flowIdAfter,
        })
        return {
            mode: 'agent',
            sessionId: updated.sessionId,
            flowId: updated.flowId,
            reply: agentConversation.reply,
            messages: updated.messages,
        }
    }

    if (isNil(effectiveFlowId)) {
        const reply =
            'No platform AI provider is configured, so conversational agent mode is unavailable. Add an AI provider in platform settings, or paste a flow id and try again for a simple webhook test with your message in the body.'
        const updated = await sessions.appendTurn({
            projectId: params.projectId,
            sessionId: session.id,
            userMessage: params.message,
            assistantReply: reply,
            sessionFlowIdAfter: null,
        })
        return {
            mode: 'agent',
            sessionId: updated.sessionId,
            flowId: updated.flowId,
            reply,
            messages: updated.messages,
        }
    }

    const response = await webhookService.handleWebhook({
        flowId: effectiveFlowId,
        async: false,
        flowVersionToRun: WebhookFlowVersionToRun.LOCKED_FALL_BACK_TO_LATEST,
        saveSampleData: false,
        execute: true,
        logger: params.log,
        failParentOnFailure: false,
        data: async () => ({
            method: 'POST',
            headers: {},
            queryParams: {},
            body: {
                message: params.message,
                metadata: params.metadata ?? {},
            },
        }),
    })

    const reply = typeof response.body === 'string'
        ? response.body
        : JSON.stringify({
            status: response.status ?? StatusCodes.OK,
            body: response.body,
        })

    const updated = await sessions.appendTurn({
        projectId: params.projectId,
        sessionId: session.id,
        userMessage: params.message,
        assistantReply: reply,
        sessionFlowIdAfter: effectiveFlowId,
    })

    return {
        mode: 'agent',
        sessionId: updated.sessionId,
        flowId: updated.flowId,
        reply,
        messages: updated.messages,
    }
}

function extractPriorChatTurns(messages: unknown[]): { role: 'user' | 'assistant', content: string }[] {
    const result: { role: 'user' | 'assistant', content: string }[] = []
    for (const item of messages) {
        if (typeof item !== 'object' || item === null) {
            continue
        }
        if (!('role' in item) || !('content' in item)) {
            continue
        }
        const role = Reflect.get(item, 'role')
        const content = Reflect.get(item, 'content')
        if (role !== 'user' && role !== 'assistant') {
            continue
        }
        if (typeof content !== 'string') {
            continue
        }
        if (role === 'user') {
            result.push({ role: 'user', content })
            continue
        }
        result.push({ role: 'assistant', content })
    }
    return result
}

function isRetryWithPriorPayloadIntent(message: string): boolean {
    const t = message.trim().toLowerCase()
    if (t.length > 200) {
        return false
    }
    return /\b(same\s+data|try\s+again|try\s+now|retry|once\s+more|send\s+it|run\s+it|go\s+ahead|run\s+again|one\s+more(\s+time)?)\b/.test(t)
}

function extractLastJsonObjectFromConversation(messages: ReadonlyArray<{ role: 'user' | 'assistant', content: string }>): Record<string, unknown> | null {
    for (let i = messages.length - 1; i >= 0; i--) {
        const content = messages[i].content
        const fenced = extractJsonFromMarkdownFence(content)
        if (!isNil(fenced)) {
            const parsed = tryParseJsonObjectRecord(fenced)
            if (!isNil(parsed) && Object.keys(parsed).length > 0) {
                return parsed
            }
        }
        const braced = extractLastBalancedJsonObject(content)
        if (!isNil(braced)) {
            const parsed = tryParseJsonObjectRecord(braced)
            if (!isNil(parsed) && Object.keys(parsed).length > 0) {
                return parsed
            }
        }
    }
    return null
}

function extractJsonFromMarkdownFence(text: string): string | null {
    const match = text.match(/```(?:json)?\s*([\s\S]*?)```/i)
    if (isNil(match) || isNil(match[1])) {
        return null
    }
    const inner = match[1].trim()
    return inner.length > 0 ? inner : null
}

function extractLastBalancedJsonObject(text: string): string | null {
    const lastOpen = text.lastIndexOf('{')
    if (lastOpen < 0) {
        return null
    }
    let depth = 0
    for (let i = lastOpen; i < text.length; i += 1) {
        const c = text[i]
        if (c === '{') {
            depth += 1
        }
        else if (c === '}') {
            depth -= 1
            if (depth === 0) {
                return text.slice(lastOpen, i + 1)
            }
        }
    }
    return null
}

function tryParseJsonObjectRecord(raw: string): Record<string, unknown> | null {
    try {
        const value: unknown = JSON.parse(raw)
        if (typeof value !== 'object' || value === null || Array.isArray(value)) {
            return null
        }
        return value as Record<string, unknown>
    }
    catch {
        return null
    }
}

type HandleMessageParams = {
    projectId: string
    userId: string
    mode: ChatbotMode
    message: string
    sessionId?: string
    flowId?: string
    metadata?: Record<string, unknown>
}

type HandleBuilderMessageParams = HandleMessageParams & {
    log: FastifyBaseLogger
}

type HandleAgentMessageParams = HandleMessageParams & {
    log: FastifyBaseLogger
}

type ChatbotMessageResponse = {
    mode: ChatbotMode
    sessionId: string
    flowId: string | null
    reply: string
    messages: ChatbotMessage[]
}

type ChatbotMode = 'builder' | 'agent'

type ChatbotMessage = {
    role: 'user' | 'assistant'
    content: string
    created: string
}
