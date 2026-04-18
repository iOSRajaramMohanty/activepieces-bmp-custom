import { ActivepiecesError, apId, ErrorCode, isNil } from '@activepieces/shared'
import { FastifyBaseLogger } from 'fastify'
import { repoFactory } from '../core/db/repo-factory'
import { ProjectEntity } from '../project/project-entity'
import { ChatbotEmbed, ChatbotEmbedEntity } from './chatbot-embed.entity'

const chatbotEmbedRepo = repoFactory(ChatbotEmbedEntity)
const projectRepo = repoFactory(ProjectEntity)

export const chatbotEmbedService = (log: FastifyBaseLogger) => {
    async function getOrCreate(params: GetOrCreateParams): Promise<ChatbotEmbed> {
        const existing = await chatbotEmbedRepo().findOneBy({ projectId: params.projectId })
        if (!isNil(existing)) {
            return existing
        }
        const created: ChatbotEmbed = {
            id: apId(),
            projectId: params.projectId,
            enabled: false,
            publishableKey: apId(48),
            allowedDomains: [],
            builderEnabled: true,
            agentEnabled: true,
        }
        await chatbotEmbedRepo().save(created)
        log.info({ projectId: params.projectId }, 'Chatbot embed settings created')
        return created
    }

    return {
        getOrCreate,
        async update({ projectId, update }: UpdateParams): Promise<ChatbotEmbed> {
            await getOrCreate({ projectId })
            await chatbotEmbedRepo().update({ projectId }, update)
            return chatbotEmbedRepo().findOneByOrFail({ projectId })
        },
        async rotateKey({ projectId }: RotateKeyParams): Promise<ChatbotEmbed> {
            await getOrCreate({ projectId })
            await chatbotEmbedRepo().update({ projectId }, { publishableKey: apId(48) })
            return chatbotEmbedRepo().findOneByOrFail({ projectId })
        },
        async validatePublicEmbedMessageAccess(
            params: ValidatePublicEmbedMessageAccessParams,
        ): Promise<ValidatePublicEmbedMessageAccessResult> {
            const embed = await chatbotEmbedRepo().findOneBy({
                projectId: params.projectId,
                publishableKey: params.publishableKey,
            })
            if (isNil(embed)) {
                throw new ActivepiecesError({
                    code: ErrorCode.INVALID_API_KEY,
                    params: {},
                })
            }
            if (!embed.enabled) {
                throw new ActivepiecesError({
                    code: ErrorCode.AUTHORIZATION,
                    params: {
                        message: 'Chatbot embed is disabled',
                    },
                })
            }
            if (params.mode === 'builder' && !embed.builderEnabled) {
                throw new ActivepiecesError({
                    code: ErrorCode.AUTHORIZATION,
                    params: {
                        message: 'Builder mode is disabled for this embed',
                    },
                })
            }
            if (params.mode === 'agent' && !embed.agentEnabled) {
                throw new ActivepiecesError({
                    code: ErrorCode.AUTHORIZATION,
                    params: {
                        message: 'Agent mode is disabled for this embed',
                    },
                })
            }
            assertOriginAllowedForEmbed({
                allowedDomains: embed.allowedDomains,
                originHeader: params.originHeader,
                refererHeader: params.refererHeader,
            })
            const project = await projectRepo().findOneBy({ id: params.projectId })
            if (isNil(project)) {
                throw new ActivepiecesError({
                    code: ErrorCode.INVALID_API_KEY,
                    params: {},
                })
            }
            return {
                ownerUserId: project.ownerId,
            }
        },
    }
}

function assertOriginAllowedForEmbed(params: AssertOriginAllowedParams): void {
    const rules = params.allowedDomains.map((d) => d.trim()).filter((d) => d.length > 0)
    if (rules.includes('*')) {
        return
    }
    if (rules.length === 0) {
        throw new ActivepiecesError({
            code: ErrorCode.AUTHORIZATION,
            params: {
                message: 'allowedDomains must be configured (or use *) before the embed can be used from a browser',
            },
        })
    }
    const requestHost = resolveRequestHostname({
        originHeader: params.originHeader,
        refererHeader: params.refererHeader,
    })
    if (isNil(requestHost)) {
        throw new ActivepiecesError({
            code: ErrorCode.DOMAIN_NOT_ALLOWED,
            params: { domain: '(no origin)' },
        })
    }
    const normalizedHost = requestHost.toLowerCase()
    for (const rule of rules) {
        if (hostnameMatchesAllowedRule({ hostname: normalizedHost, rule: rule.toLowerCase() })) {
            return
        }
    }
    throw new ActivepiecesError({
        code: ErrorCode.DOMAIN_NOT_ALLOWED,
        params: { domain: normalizedHost },
    })
}

function resolveRequestHostname(params: ResolveRequestHostnameParams): string | undefined {
    const fromOrigin = parseHostnameFromUrlString(params.originHeader)
    if (!isNil(fromOrigin)) {
        return fromOrigin
    }
    return parseHostnameFromUrlString(params.refererHeader)
}

function parseHostnameFromUrlString(value: string | undefined): string | undefined {
    if (isNil(value) || value.trim() === '') {
        return undefined
    }
    try {
        return new URL(value).hostname
    }
    catch {
        return undefined
    }
}

function hostnameMatchesAllowedRule(params: HostnameMatchesAllowedRuleParams): boolean {
    if (params.rule.startsWith('*.')) {
        const base = params.rule.slice(2)
        return params.hostname === base || params.hostname.endsWith(`.${base}`)
    }
    return params.hostname === params.rule || params.hostname.endsWith(`.${params.rule}`)
}

type GetOrCreateParams = {
    projectId: string
}

type UpdateParams = {
    projectId: string
    update: Partial<Pick<ChatbotEmbed, 'enabled' | 'allowedDomains' | 'builderEnabled' | 'agentEnabled'>>
}

type RotateKeyParams = {
    projectId: string
}

type ValidatePublicEmbedMessageAccessParams = {
    projectId: string
    publishableKey: string
    mode: ChatbotEmbedMode
    originHeader: string | undefined
    refererHeader: string | undefined
}

type ValidatePublicEmbedMessageAccessResult = {
    ownerUserId: string
}

type ChatbotEmbedMode = 'builder' | 'agent'

type AssertOriginAllowedParams = {
    allowedDomains: string[]
    originHeader: string | undefined
    refererHeader: string | undefined
}

type ResolveRequestHostnameParams = {
    originHeader: string | undefined
    refererHeader: string | undefined
}

type HostnameMatchesAllowedRuleParams = {
    hostname: string
    rule: string
}
