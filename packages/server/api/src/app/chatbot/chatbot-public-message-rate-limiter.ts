import { createHash } from 'node:crypto'
import {
    ActivepiecesError,
    ApEnvironment,
    ErrorCode,
    tryCatch,
} from '@activepieces/shared'
import { FastifyBaseLogger, FastifyRequest } from 'fastify'
import { redisConnections } from '../database/redis-connections'
import { networkUtils } from '../helper/network-utils'
import { system } from '../helper/system/system'
import { AppSystemProp } from '../helper/system/system-props'

type EnforceOrThrowParams = {
    request: FastifyRequest
    projectId: string
    publishableKey: string
}

type ChatbotPublicMessageRateLimiter = {
    enforceOrThrow: (params: EnforceOrThrowParams) => Promise<void>
}

const WINDOW_SECONDS = 60
const MAX_REQUESTS_PER_WINDOW = 120

export const chatbotPublicMessageRateLimiter = (log: FastifyBaseLogger): ChatbotPublicMessageRateLimiter => {
    return {
        async enforceOrThrow(params: EnforceOrThrowParams): Promise<void> {
            if (isRateLimitDisabled()) {
                return
            }
            const clientIp = networkUtils.extractClientRealIp(
                params.request,
                system.get(AppSystemProp.CLIENT_REAL_IP_HEADER),
            )
            const redisKey = buildRedisKey({
                clientIp,
                projectId: params.projectId,
                publishableKey: params.publishableKey,
            })
            const { data: count, error } = await tryCatch(async () =>
                incrementWindowCount({ redisKey }),
            )
            if (error !== null) {
                log.warn({ err: error }, 'Chatbot public rate limit skipped after Redis error')
                return
            }
            if (count > MAX_REQUESTS_PER_WINDOW) {
                throw new ActivepiecesError({
                    code: ErrorCode.GENERIC_ERROR,
                    params: { message: 'Rate limit exceeded' },
                })
            }
        },
    }
}

function isRateLimitDisabled(): boolean {
    const env = system.getOrThrow<ApEnvironment>(AppSystemProp.ENVIRONMENT)
    return env === ApEnvironment.TESTING
}

function buildRedisKey(params: BuildRedisKeyParams): string {
    const fingerprint = createHash('sha256')
        .update(`${params.clientIp}\n${params.projectId}\n${params.publishableKey}`)
        .digest('hex')
        .slice(0, 40)
    return `chatbot:public:msg:${fingerprint}`
}

async function incrementWindowCount(params: IncrementWindowCountParams): Promise<number> {
    const redis = await redisConnections.useExisting()
    const count = await redis.incr(params.redisKey)
    if (count === 1) {
        await redis.expire(params.redisKey, WINDOW_SECONDS)
    }
    return count
}

type BuildRedisKeyParams = {
    clientIp: string
    projectId: string
    publishableKey: string
}

type IncrementWindowCountParams = {
    redisKey: string
}
