import { Piece, PieceAuthProperty } from '@activepieces/pieces-framework'
import {
    ActivepiecesError,
    apId,
    assertNotNullOrUndefined,
    ErrorCode,
    FlowStatus,
    isNil,
    LATEST_JOB_DATA_SCHEMA_VERSION,
    RunEnvironment,
    WorkerJobType,
} from '@activepieces/shared'
import { FastifyRequest } from 'fastify'
import { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { StatusCodes } from 'http-status-codes'
import { securityAccess } from '../../core/security/authorization/fastify-security'
import { domainHelper } from '../../ee/custom-domains/domain-helper'
import { flowService } from '../../flows/flow/flow.service'
import { rejectedPromiseHandler } from '../../helper/promise-handler'
import { projectService } from '../../project/project-service'
import { WebhookFlowVersionToRun, webhookService } from '../../webhooks/webhook.service'
import { jobQueue, JobType } from '../../workers/job-queue/job-queue'
import { payloadOffloader } from '../../workers/payload-offloader'
import { triggerSourceService } from '../trigger-source/trigger-source-service'
import { appEventRoutingService } from './app-event-routing.service'
import { appEventRoutingHooks } from './app-event-routing.hooks'

// Lazy-initialized piece registry (populated from hooks on first access)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let appWebhooks: Record<string, Piece<any>> | null = null
let pieceNames: Record<string, string> | null = null

function getAppWebhooks() {
    if (appWebhooks === null) {
        appWebhooks = {}
        pieceNames = {}
        const registeredPieces = appEventRoutingHooks.getRegisteredPieces()
        for (const { urlName, packageName, piece } of registeredPieces) {
            appWebhooks[urlName] = piece
            pieceNames![urlName] = packageName
        }
    }
    return { appWebhooks, pieceNames: pieceNames! }
}

export const appEventRoutingModule: FastifyPluginAsyncZod = async (app) => {
    await app.register(appEventRoutingController, { prefix: '/v1/app-events' })
}

export const appEventRoutingController: FastifyPluginAsyncZod = async (
    fastify,
) => {
    fastify.all(
        '/:pieceUrl',
        {
            config: {
                rawBody: true,
                security: securityAccess.public(),
            },
        },
        async (
            request: FastifyRequest<{
                Body: unknown
                Params: {
                    pieceUrl: string
                }
            }>,
            requestReply,
        ) => {
            const pieceUrl = request.params.pieceUrl
            const payload = {
                headers: request.headers as Record<string, string>,
                body: request.body,
                rawBody: request.rawBody,
                method: request.method,
                queryParams: request.query as Record<string, string>,
            }
            
            // Log raw webhook payload for debugging
            request.log.info(
                {
                    pieceUrl,
                    method: request.method,
                    body: request.body,
                    headers: {
                        'content-type': request.headers['content-type'],
                        'x-slack-signature': request.headers['x-slack-signature'],
                        'x-slack-request-timestamp': request.headers['x-slack-request-timestamp'],
                    },
                },
                '[AppEventRoutingController#event] Raw webhook payload received',
            )
            
            const registry = getAppWebhooks()
            const piece = registry.appWebhooks[pieceUrl]
            if (isNil(piece)) {
                throw new ActivepiecesError({
                    code: ErrorCode.ENTITY_NOT_FOUND,
                    params: {
                        entityType: 'piece',
                        entityId: pieceUrl,
                        message: 'Piece is not found in app event routing',
                    },
                })
            }
            const appName = registry.pieceNames[pieceUrl]
            assertNotNullOrUndefined(piece.events, 'Event is possible in this piece')
            const { reply, event, identifierValue } = piece.events.parseAndReply({
                payload,
                server: {
                    publicUrl: await domainHelper.getPublicUrl({ path: '' }),
                },
            })
            if (!isNil(reply)) {
                request.log.info(
                    {
                        reply,
                        piece: pieceUrl,
                    },
                    '[AppEventRoutingController#event] reply',
                )
                return requestReply
                    .status(StatusCodes.OK)
                    .headers(reply?.headers ?? {})
                    .send(reply?.body ?? {})
            }
            request.log.info(
                {
                    event,
                    identifierValue,
                },
                '[AppEventRoutingController#event] event',
            )
            if (isNil(event) || isNil(identifierValue)) {
                return requestReply.status(StatusCodes.BAD_REQUEST).send({})
            }
            const listeners = await appEventRoutingService.listListeners({
                appName,
                event,
                identifierValue,
            })
            const eventsQueue = listeners.map(async (listener) => {
                const requestId = apId()
                const flow = await flowService(request.log).getOne({ id: listener.flowId, projectId: listener.projectId })
                if (isNil(flow)) {
                    return
                }
                const isSimulating = await triggerSourceService(request.log).existsByFlowId({
                    flowId: listener.flowId,
                    simulate: true,
                })
                const flowVersionIdToRun = await webhookService.getFlowVersionIdToRun(
                    isSimulating ? WebhookFlowVersionToRun.LATEST : WebhookFlowVersionToRun.LOCKED_FALL_BACK_TO_LATEST,
                    flow,
                )
                const platformId = await projectService(request.log).getPlatformId(listener.projectId)
                const jobPayload = await payloadOffloader.offloadPayload(request.log, payload, listener.projectId, platformId)
                return jobQueue(request.log).add({
                    id: requestId,
                    type: JobType.ONE_TIME,
                    data: {
                        platformId,
                        projectId: listener.projectId,
                        schemaVersion: LATEST_JOB_DATA_SCHEMA_VERSION,
                        requestId,
                        payload: jobPayload,
                        flowId: listener.flowId,
                        jobType: WorkerJobType.EXECUTE_WEBHOOK,
                        runEnvironment: isSimulating ? RunEnvironment.TESTING : RunEnvironment.PRODUCTION,
                        saveSampleData: isSimulating,
                        flowVersionIdToRun,
                        execute: flow.status === FlowStatus.ENABLED,
                    },
                })
            })
            rejectedPromiseHandler(Promise.all(eventsQueue), request.log)
            return requestReply.status(StatusCodes.OK).send({})
        },
    )
}
