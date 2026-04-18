import {
    AIProviderAuthConfig,
    AIProviderConfig,
    AIProviderName,
    AzureProviderConfig,
    isNil,
    McpToolDefinition,
    tryCatch,
} from '@activepieces/shared'
import { createAnthropic } from '@ai-sdk/anthropic'
import { createAzure } from '@ai-sdk/azure'
import { createGoogleGenerativeAI } from '@ai-sdk/google'
import { createOpenAI } from '@ai-sdk/openai'
import { createOpenRouter } from '@openrouter/ai-sdk-provider'
import { generateText, type LanguageModel, stepCountIs, tool, type ToolSet } from 'ai'
import { FastifyBaseLogger } from 'fastify'
import { z } from 'zod'
import { AIProviderEntity, AIProviderSchema } from '../ai/ai-provider-entity'
import { aiProviderService } from '../ai/ai-provider-service'
import { repoFactory } from '../core/db/repo-factory'
import { mcpServerService, resolvePermissionChecker } from '../mcp/mcp-service'
import { activepiecesTools } from '../mcp/tools'

const aiProviderRepo = repoFactory<AIProviderSchema>(AIProviderEntity)

export async function runChatbotBuilderAgent(params: {
    log: FastifyBaseLogger
    projectId: string
    platformId: string
    userId: string
    userMessage: string
    priorMessages: ReadonlyArray<{ role: 'user' | 'assistant', content: string }>
    sessionFlowId: string | null
}): Promise<RunChatbotBuilderAgentResult> {
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
    const mcpTools = activepiecesTools(mcpRecord, params.log).filter((def) => CHATBOT_BUILDER_TOOL_TITLE_SET.has(def.title))
    const tools = buildAiToolsFromMcpDefinitions({ definitions: mcpTools, permissionChecker })

    const system = buildSystemPrompt({ sessionFlowId: params.sessionFlowId })
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
            stopWhen: stepCountIs(CHATBOT_BUILDER_MAX_STEPS),
            temperature: 0.2,
            maxOutputTokens: CHATBOT_BUILDER_MAX_OUTPUT_TOKENS,
        }),
    )

    if (isNil(generated.data)) {
        params.log.warn({ err: generated.error }, 'Chatbot builder agent: generateText failed')
        return { status: 'skipped' }
    }

    const flowIdFromTools = extractFlowIdFromSteps({ steps: generated.data.steps })
    const replyText = normalizeAssistantReply({ text: generated.data.text, steps: generated.data.steps })
    const flowId = flowIdFromTools ?? params.sessionFlowId

    return {
        status: 'ok',
        reply: replyText,
        flowId,
    }
}

function buildSystemPrompt(params: { sessionFlowId: string | null }): string {
    const base = `You are an Activepieces flow builder assistant. You have tools that mirror the project MCP server.
Use the same workflow as MCP: discover pieces, inspect props, then build or edit flows. Never invent piece names — always take pieceName, pieceVersion, actionName, and triggerName from ap_list_pieces / ap_get_piece_props.
Prefer ap_list_pieces with a tight searchQuery (e.g. "salesforce", "slack") instead of broad listings — it is faster and returns fewer rows.
Step references use {{stepName.field}} (no ".output." segment). For OAuth steps, pass auth as the connection externalId from ap_list_connections.
After structural changes, call ap_validate_flow on the affected flow when possible.
Final user-facing reply: be brief. Use short bullets or numbered steps (max ~8 lines), no long essays or deep markdown nesting unless the user explicitly asks for detail.

Catch Webhook trigger defaults (@activepieces/piece-webhook, trigger name catch_webhook):
- Always set trigger \`input.authType\` to the string \`"none"\` (the UI label "None") whenever you add or update this trigger via ap_build_flow or ap_update_trigger, unless the user explicitly asks for Basic Auth, Header Auth, or HMAC.
- Omit extra auth fields when authType is none.

Webhook → next step mapping (critical when you add Catch Webhook + CRM/actions):
- JSON posted to the webhook appears under the trigger output as body fields. Reference them as {{trigger.body.<exactKey>}} — keys are case-sensitive (e.g. lastName vs LastName).
- Typical curl/API JSON uses camelCase: firstName, lastName, company, email. Salesforce "Create Lead" requires API field LastName: set the step input LastName to {{trigger.body.lastName}} (not empty). Also map Company to {{trigger.body.company}} or {{trigger.body.Company}}, Email to {{trigger.body.email}} or {{trigger.body.Email}}, FirstName to {{trigger.body.firstName}} when present.
- Never ship a Create Lead step with only Company/Email — always include LastName mapped from the webhook body or a clear literal.
- After building, if inputs might be wrong, use ap_update_step to fix expressions before finishing.

Test, fix, and publish (when you have a flow id — from this session or from ap_build_flow tool output):
- After you create or materially change a flow, run ap_validate_flow then ap_test_flow with that flowId. Use ap_test_step only to isolate a failing step. Pass triggerTestData to ap_test_flow or ap_test_step when the trigger needs mock output (e.g. Catch Webhook with no sample data yet).
- If a test fails: use the run output and errors, fix with ap_update_step or ap_update_trigger, run ap_validate_flow again, and re-run ap_test_flow. Prefer at most about three fix cycles before summarizing what still blocks a green test.
- If a test is still running or you need full step detail, use ap_get_run with the run id from tool output.
- When ap_test_flow succeeds: give a short summary. Ask whether the user wants you to publish (lock draft and enable the flow). Do **not** call ap_lock_and_publish until they clearly agree in a later message, unless they already said in the same instruction to build, test, and publish.
- Call ap_lock_and_publish only when the user clearly confirms publishing (e.g. yes, publish, go ahead, ship it) or already asked you to publish in their instructions. If they decline or want to keep a draft, acknowledge and do not publish.`

    if (isNil(params.sessionFlowId)) {
        return `${base}

The user does not have a flow in this chat session yet. Do not call ap_build_flow for greetings, small talk, or vague prompts — respond briefly and ask what they want to automate (trigger, apps, data flow, outcome). Only after they state a concrete automation goal, call ap_build_flow once with a clear flowName, a realistic trigger (schedule, webhook, or an app trigger when clearly implied), and sequential steps. Use ap_list_pieces (with searchQuery when helpful) and ap_get_piece_props before ap_build_flow so inputs are valid. After ap_build_flow returns a flow id in the same turn, continue with validate → test → fix as above using that flow id.`
    }

    return `${base}

The chat session is already tied to flow id "${params.sessionFlowId}". Prefer ap_flow_structure, ap_get_piece_props, ap_update_step, ap_update_trigger, and ap_validate_flow to implement changes. Only call ap_build_flow if the user clearly wants a separate new flow instead of editing the existing one. After edits, run validate → test → fix as in the shared instructions; ask before ap_lock_and_publish unless the user already instructed you to publish.`
}

function extractFlowIdFromSteps(params: { steps: ReadonlyArray<{ toolResults: ReadonlyArray<{ toolName: string, output: unknown }> }> }): string | null {
    for (const step of params.steps) {
        for (const tr of step.toolResults) {
            if (tr.toolName !== 'ap_build_flow') {
                continue
            }
            const text = toolOutputToPlainText(tr.output)
            const match = text.match(/\(id:\s*([a-zA-Z0-9_-]+)\)/)
            if (!isNil(match) && match[1]) {
                return match[1]
            }
        }
    }
    return null
}

function normalizeAssistantReply(params: {
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
    return 'I updated the flow using the available tools. Open Flow Builder to review triggers and steps.'
}

export function toolOutputToPlainText(output: unknown): string {
    if (typeof output === 'string') {
        return output
    }
    if (output !== null && typeof output === 'object' && 'content' in output) {
        const content = Reflect.get(output, 'content')
        if (Array.isArray(content)) {
            return content
                .map((part) => {
                    if (typeof part === 'object' && part !== null && 'text' in part) {
                        const text = Reflect.get(part, 'text')
                        return typeof text === 'string' ? text : ''
                    }
                    return ''
                })
                .join('\n')
        }
    }
    return JSON.stringify(output)
}

export function buildAiToolsFromMcpDefinitions(params: {
    definitions: McpToolDefinition[]
    permissionChecker: Awaited<ReturnType<typeof resolvePermissionChecker>>
}): ToolSet {
    const result: ToolSet = {}
    for (const def of params.definitions) {
        const inputSchema = z.object(def.inputSchema)
        const wrapped = params.permissionChecker.wrapExecute({
            execute: def.execute,
            permission: def.permission,
            toolTitle: def.title,
        })
        result[def.title] = tool({
            description: def.description,
            inputSchema,
            execute: async (input: z.infer<typeof inputSchema>) => {
                const outcome = await wrapped(input)
                return toolOutputToPlainText(outcome)
            },
        })
    }
    return result
}

export async function resolveChatbotBuilderLanguageModel(params: {
    log: FastifyBaseLogger
    platformId: string
}): Promise<LanguageModel | null> {
    const rows = await aiProviderRepo().findBy({ platformId: params.platformId })
    if (rows.length === 0) {
        return null
    }
    const priority: AIProviderName[] = [
        AIProviderName.OPENAI,
        AIProviderName.ANTHROPIC,
        AIProviderName.GOOGLE,
        AIProviderName.AZURE,
        AIProviderName.OPENROUTER,
        AIProviderName.ACTIVEPIECES,
    ]
    for (const provider of priority) {
        const row = rows.find((r) => r.provider === provider)
        if (isNil(row)) {
            continue
        }
        const configResult = await tryCatch(() =>
            aiProviderService(params.log).getConfigOrThrow({ platformId: params.platformId, provider }),
        )
        if (isNil(configResult.data)) {
            continue
        }
        const { auth, config } = configResult.data
        if (!hasUsableAiApiKey({ auth })) {
            continue
        }
        const model = buildLanguageModelForProvider({ provider, auth, config })
        if (!isNil(model)) {
            return model
        }
    }
    return null
}

function hasUsableAiApiKey(params: { auth: AIProviderAuthConfig }): boolean {
    if (!('apiKey' in params.auth)) {
        return false
    }
    const key = params.auth.apiKey
    return typeof key === 'string' && key.trim().length > 0
}

function buildLanguageModelForProvider(params: {
    provider: AIProviderName
    auth: AIProviderAuthConfig
    config: AIProviderConfig
}): LanguageModel | null {
    const modelId = DEFAULT_CHAT_MODEL_IDS[params.provider]
    if (isNil(modelId)) {
        return null
    }
    switch (params.provider) {
        case AIProviderName.OPENAI: {
            if (!('apiKey' in params.auth)) {
                return null
            }
            return createOpenAI({ apiKey: params.auth.apiKey }).chat(modelId)
        }
        case AIProviderName.ANTHROPIC: {
            if (!('apiKey' in params.auth)) {
                return null
            }
            return createAnthropic({ apiKey: params.auth.apiKey })(modelId)
        }
        case AIProviderName.GOOGLE: {
            if (!('apiKey' in params.auth)) {
                return null
            }
            return createGoogleGenerativeAI({ apiKey: params.auth.apiKey })(modelId)
        }
        case AIProviderName.AZURE: {
            if (!isAzureConfig(params.config) || !('apiKey' in params.auth)) {
                return null
            }
            return createAzure({ resourceName: params.config.resourceName, apiKey: params.auth.apiKey }).chat(modelId)
        }
        case AIProviderName.OPENROUTER:
        case AIProviderName.ACTIVEPIECES: {
            if (!('apiKey' in params.auth)) {
                return null
            }
            return createOpenRouter({ apiKey: params.auth.apiKey }).chat(modelId)
        }
        default:
            return null
    }
}

function isAzureConfig(config: AIProviderConfig): config is AzureProviderConfig {
    return typeof config === 'object' && config !== null && 'resourceName' in config
        && typeof Reflect.get(config, 'resourceName') === 'string'
}

const CHATBOT_BUILDER_TOOL_TITLE_SET = new Set<string>([
    'ap_list_pieces',
    'ap_get_piece_props',
    'ap_list_connections',
    'ap_build_flow',
    'ap_validate_flow',
    'ap_flow_structure',
    'ap_update_step',
    'ap_update_trigger',
    'ap_test_flow',
    'ap_test_step',
    'ap_get_run',
    'ap_lock_and_publish',
])

const CHATBOT_BUILDER_MAX_STEPS = 32

const CHATBOT_BUILDER_MAX_OUTPUT_TOKENS = 1500

const DEFAULT_CHAT_MODEL_IDS: Partial<Record<AIProviderName, string>> = {
    [AIProviderName.OPENAI]: 'gpt-4o-mini',
    [AIProviderName.ANTHROPIC]: 'claude-3-5-haiku-20241022',
    [AIProviderName.GOOGLE]: 'gemini-2.0-flash',
    [AIProviderName.AZURE]: 'gpt-4o-mini',
    [AIProviderName.OPENROUTER]: 'openai/gpt-4o-mini',
    [AIProviderName.ACTIVEPIECES]: 'openai/gpt-4o-mini',
}

type RunChatbotBuilderAgentResult =
    | { status: 'skipped' }
    | { status: 'ok', reply: string, flowId: string | null }
