import {
    EventPayload,
    FlowStatus,
    FlowTriggerType,
    isNil,
    Permission,
    tryCatch,
} from '@activepieces/shared'
import { generateText, stepCountIs, tool, type ToolSet } from 'ai'
import { FastifyBaseLogger } from 'fastify'
import { StatusCodes } from 'http-status-codes'
import { z } from 'zod'
import { flowService } from '../flows/flow/flow.service'
import { mcpServerService, resolvePermissionChecker } from '../mcp/mcp-service'
import { activepiecesTools } from '../mcp/tools'
import { triggerSourceService } from '../trigger/trigger-source/trigger-source-service'
import { WebhookFlowVersionToRun, webhookService } from '../webhooks/webhook.service'
import {
    buildAiToolsFromMcpDefinitions,
    resolveChatbotBuilderLanguageModel,
    toolOutputToPlainText,
} from './chatbot-builder-agent'

export async function runChatbotAgentConversation(params: {
    log: FastifyBaseLogger
    projectId: string
    platformId: string
    userId: string
    userMessage: string
    priorMessages: ReadonlyArray<{ role: 'user' | 'assistant', content: string }>
    preferredFlowId: string | null
}): Promise<RunChatbotAgentConversationResult> {
    const model = await resolveChatbotBuilderLanguageModel({ log: params.log, platformId: params.platformId })
    if (isNil(model)) {
        return { status: 'skipped' }
    }

    const mcpRecord = await mcpServerService(params.log).getByProjectId(params.projectId)
    const permissionChecker = await resolvePermissionChecker({
        userId: params.userId,
        projectId: params.projectId,
        log: params.log,
    })
    const mcpDefinitions = activepiecesTools(mcpRecord, params.log).filter((def) =>
        CHATBOT_AGENT_MCP_TOOL_TITLES.has(def.title),
    )
    const mcpToolSet = buildAiToolsFromMcpDefinitions({ definitions: mcpDefinitions, permissionChecker })
    const triggerTools = buildTriggerFlowWebhookTools({
        log: params.log,
        projectId: params.projectId,
        userId: params.userId,
        permissionChecker,
    })
    const tools: ToolSet = {
        ...mcpToolSet,
        ...triggerTools,
    }

    const system = buildAgentSystemPrompt({ preferredFlowId: params.preferredFlowId })
    const history = params.priorMessages.map((m) => ({
        role: m.role,
        content: m.content,
    }))
    const messages = [
        ...history,
        { role: 'user' as const, content: params.userMessage },
    ]

    const generated = await tryCatch(() =>
        generateText({
            model,
            system,
            messages,
            tools,
            stopWhen: stepCountIs(CHATBOT_AGENT_MAX_STEPS),
            temperature: 0.2,
            maxOutputTokens: CHATBOT_AGENT_MAX_OUTPUT_TOKENS,
        }),
    )

    if (isNil(generated.data)) {
        params.log.warn({ err: generated.error }, 'Chatbot agent conversation: generateText failed')
        return { status: 'skipped' }
    }

    const toolNames = listToolNamesFromAgentSteps({ steps: generated.data.steps })
    const didTrigger = toolNames.includes('trigger_flow_webhook')
    params.log.info({
        projectId: params.projectId,
        toolNames,
        didTriggerWebhook: didTrigger,
    }, 'chatbot agent: LLM step finished')
    if (!didTrigger) {
        params.log.warn({
            projectId: params.projectId,
            messagePreview: params.userMessage.slice(0, 200),
        }, 'chatbot agent: no trigger_flow_webhook call — handleWebhook was not run (no webhook/engine log for this turn)')
    }

    const flowIdFromTrigger = extractFlowIdFromTriggerToolSteps({ steps: generated.data.steps })
    const replyText = normalizeAgentAssistantReply({ text: generated.data.text, steps: generated.data.steps })
    const flowId = flowIdFromTrigger ?? params.preferredFlowId

    return {
        status: 'ok',
        reply: replyText,
        flowId,
    }
}

function buildAgentSystemPrompt(params: { preferredFlowId: string | null }): string {
    const preferred = isNil(params.preferredFlowId)
        ? ''
        : `The user has optionally pinned flow id "${params.preferredFlowId}" in the UI. Prefer this flow when it matches their goal; otherwise discover a better match with ap_list_flows.`

    return `You are a helpful project assistant for Activepieces. Users describe outcomes (e.g. "create a lead in Salesforce"). Your job is to find existing flows that can do that, talk like a concise human colleague, and only run a flow when you have the right inputs.

${preferred}

Hard rules (non-negotiable):
- Never invent, guess, or "example-fill" business data. Do not use placeholder names, emails, companies, or demo values. Every value in the webhook JSON body must come from what the user actually typed in this conversation for that purpose.
- Words like "ok", "yes", "go", "sure", or "trigger it" are confirmations only — they are not field values. If any required field is still unknown, ask for it; do not call trigger_flow_webhook.
- The webhook POST body is only the data the automation should receive (e.g. firstName, lastName, email, company). Do not put trigger configuration in the body: never include authType, HMAC secrets, or other piece trigger settings in the JSON body — those belong in Flow Builder, not in trigger.body.
- Do not announce "I'll send this now" with a fabricated JSON block. First collect real answers, then call trigger_flow_webhook once.
- When trigger_flow_webhook returns ❌ with HTTP 404 or 410, relay the tool message: it usually means the flow is disabled or missing — do not blame "input format" unless the tool text says so.

Workflow:
1. When the user wants something done in an app or via automation, call ap_list_flows first (unless the pinned flow clearly matches and you already know it fits).
2. Shortlist flows by display name, trigger type, and published state. If several could fit, briefly describe 2–4 options and ask which they want.
3. For the chosen flow, call ap_flow_structure to inspect the trigger and downstream steps (e.g. Salesforce Create Lead).
4. For Catch Webhook (@activepieces/piece-webhook, trigger catch_webhook), call ap_get_piece_props for the trigger if you need the exact input schema. Webhook JSON becomes trigger.body.<key> in the flow — keys are case-sensitive.
5. Infer which body keys downstream steps need (from step inputs referencing trigger.body) and ask the user conversationally for those values: one or two questions at a time, no long forms.
6. Only call trigger_flow_webhook after the user has given real values for every required field you intend to send (or clearly said to skip an optional field). Build the body only from those user-provided strings. Use the **exact JSON keys** the flow expects (same spelling and casing as a working curl or Flow Builder sample) — e.g. \`Company\` vs \`company\` are different.
7. If the trigger is not Catch Webhook, explain that this chat path runs webhook-shaped payloads; suggest using Flow Builder, test run, or the flow's native trigger instead of trigger_flow_webhook.
8. If no suitable flow exists, say so plainly and suggest switching to Builder mode to create one.

Tone: warm, brief, clear sentences — like a colleague, not a spec sheet.

After a successful trigger_flow_webhook, summarize the outcome in plain language (avoid dumping large JSON unless they ask).

When the user says to retry with the **same** data (e.g. "try again", "same data", "try now") and the thread already contains a JSON body from earlier messages, call trigger_flow_webhook immediately with that object — do not refuse for "format" reasons.`
}

export async function executeCatchWebhookInvocation(params: {
    log: FastifyBaseLogger
    projectId: string
    userId: string
    flowId: string
    body: Record<string, unknown>
}): Promise<string> {
    const permissionChecker = await resolvePermissionChecker({
        userId: params.userId,
        projectId: params.projectId,
        log: params.log,
    })
    const denied = permissionChecker.check(Permission.WRITE_FLOW, 'trigger_flow_webhook')
    if (!isNil(denied)) {
        return toolOutputToPlainText(denied)
    }

    params.log.info({ flowId: params.flowId, projectId: params.projectId }, 'chatbot: Catch Webhook invoke (handleWebhook) starting')

    const populated = await flowService(params.log).getOnePopulated({
        id: params.flowId,
        projectId: params.projectId,
    })
    if (isNil(populated)) {
        return 'Flow not found in this project.'
    }
    const trigger = populated.version.trigger
    if (trigger.type !== FlowTriggerType.PIECE) {
        return 'This flow does not use a piece trigger; use the flow editor or native trigger instead of trigger_flow_webhook.'
    }
    const pieceName = trigger.settings.pieceName
    const triggerName = trigger.settings.triggerName
    if (pieceName !== '@activepieces/piece-webhook' || triggerName !== 'catch_webhook') {
        return 'trigger_flow_webhook only supports Catch Webhook flows (@activepieces/piece-webhook / catch_webhook). Describe alternatives for this trigger type.'
    }

    if (populated.status !== FlowStatus.ENABLED) {
        return `❌ Flow "${populated.version.displayName}" is not enabled (status: ${populated.status}). Open Flow Builder, turn the flow on, publish if needed, then try again. Disabled flows reject webhooks with HTTP 404 — this is not a JSON body format problem.`
    }

    const saveSampleData = await triggerSourceService(params.log).existsByFlowId({
        flowId: params.flowId,
        simulate: true,
    })

    const payload: EventPayload = {
        method: 'POST',
        headers: {
            'content-type': 'application/json',
        },
        queryParams: {},
        body: params.body,
    }
    const response = await webhookService.handleWebhook({
        flowId: params.flowId,
        async: false,
        flowVersionToRun: WebhookFlowVersionToRun.LOCKED_FALL_BACK_TO_LATEST,
        saveSampleData,
        execute: true,
        logger: params.log,
        payload,
        failParentOnFailure: false,
        data: async () => ({
            method: 'POST',
            headers: {
                'content-type': 'application/json',
            },
            queryParams: {},
            body: {},
        }),
    })

    params.log.info({
        flowId: params.flowId,
        httpStatus: response.status,
    }, 'chatbot: Catch Webhook invoke finished')

    const displayName = populated.version.displayName
    const httpStatus = response.status ?? StatusCodes.OK
    const bodyPreview = formatWebhookResponsePreview({ response })
    if (httpStatus < 200 || httpStatus >= 300) {
        return formatWebhookFailureMessage({
            displayName,
            flowId: params.flowId,
            httpStatus,
            bodyPreview,
        })
    }
    return `✅ Triggered "${displayName}" (id: ${params.flowId}). HTTP ${String(httpStatus)}.\n${bodyPreview}`
}

function buildTriggerFlowWebhookTools(params: {
    log: FastifyBaseLogger
    projectId: string
    userId: string
    permissionChecker: Awaited<ReturnType<typeof resolvePermissionChecker>>
}): ToolSet {
    const inputSchema = z.object({
        flowId: z.string().describe('Flow id from ap_list_flows'),
        body: z.record(z.string(), z.unknown()).describe('Object sent as the webhook POST JSON body'),
    })
    return {
        trigger_flow_webhook: tool({
            description:
                'Execute a published Catch Webhook flow: POST body becomes trigger.body. Call only when every value in `body` was explicitly provided by the user in chat (no invented or demo data). Never put authType or other trigger settings here.',
            inputSchema,
            execute: async (input: z.infer<typeof inputSchema>) => {
                const denied = params.permissionChecker.check(Permission.WRITE_FLOW, 'trigger_flow_webhook')
                if (!isNil(denied)) {
                    return toolOutputToPlainText(denied)
                }
                return executeCatchWebhookInvocation({
                    log: params.log,
                    projectId: params.projectId,
                    userId: params.userId,
                    flowId: input.flowId,
                    body: input.body,
                })
            },
        }),
    }
}

function formatWebhookFailureMessage(params: {
    displayName: string
    flowId: string
    httpStatus: number
    bodyPreview: string
}): string {
    const base = `❌ Webhook run failed for "${params.displayName}" (id: ${params.flowId}). HTTP ${String(params.httpStatus)}.`
    let hint = ''
    if (params.httpStatus === StatusCodes.NOT_FOUND) {
        hint = '\nLikely cause: flow is disabled, missing, or the trigger is not available — enable the flow in Flow Builder and ensure it is published. HTTP 404 here is not a JSON body "format" issue.'
    }
    else if (params.httpStatus === StatusCodes.GONE) {
        hint = '\nLikely cause: this flow id no longer exists.'
    }
    else {
        hint = '\nSee response details below (engine error, validation, or timeout).'
    }
    return `${base}${hint}\n${params.bodyPreview}`
}

function formatWebhookResponsePreview(params: {
    response: { status?: number, body: unknown }
}): string {
    if (typeof params.response.body === 'string') {
        return truncateText({ text: params.response.body, maxChars: 2000 })
    }
    const serialized = JSON.stringify({
        status: params.response.status ?? StatusCodes.OK,
        body: params.response.body,
    })
    return truncateText({ text: serialized, maxChars: 2000 })
}

function truncateText(params: { text: string, maxChars: number }): string {
    if (params.text.length <= params.maxChars) {
        return params.text
    }
    return `${params.text.slice(0, params.maxChars)}…`
}

function listToolNamesFromAgentSteps(params: {
    steps: ReadonlyArray<{ toolResults?: ReadonlyArray<{ toolName?: string, output?: unknown }> }>
}): string[] {
    const names: string[] = []
    for (const step of params.steps) {
        const results = step.toolResults
        if (!Array.isArray(results)) {
            continue
        }
        for (const tr of results) {
            if (typeof tr.toolName === 'string') {
                names.push(tr.toolName)
            }
        }
    }
    return names
}

function extractFlowIdFromTriggerToolSteps(params: {
    steps: ReadonlyArray<{ toolResults: ReadonlyArray<{ toolName: string, output: unknown }> }>
}): string | null {
    for (const step of params.steps) {
        for (const tr of step.toolResults) {
            if (tr.toolName !== 'trigger_flow_webhook') {
                continue
            }
            const text = typeof tr.output === 'string' ? tr.output : toolOutputToPlainText(tr.output)
            const match = text.match(/\(id:\s*([a-zA-Z0-9_-]+)\)/)
            if (!isNil(match) && match[1]) {
                return match[1]
            }
        }
    }
    return null
}

function normalizeAgentAssistantReply(params: {
    text: string
    steps: ReadonlyArray<{ text: string }>
}): string {
    const trimmed = params.text.trim()
    if (trimmed.length > 0) {
        return params.text
    }
    for (let i = params.steps.length - 1; i >= 0; i -= 1) {
        const stepText = params.steps[i]?.text?.trim()
        if (stepText && stepText.length > 0) {
            return params.steps[i].text
        }
    }
    return 'I checked your project flows using the available tools. Tell me more about what you want to automate, or pick a flow from the list.'
}

const CHATBOT_AGENT_MCP_TOOL_TITLES = new Set<string>([
    'ap_list_flows',
    'ap_flow_structure',
    'ap_get_piece_props',
    'ap_list_pieces',
])

const CHATBOT_AGENT_MAX_STEPS = 14

const CHATBOT_AGENT_MAX_OUTPUT_TOKENS = 1200

type RunChatbotAgentConversationResult =
    | { status: 'skipped' }
    | { status: 'ok', reply: string, flowId: string | null }
