import { PieceMetadataModel, PieceMetadataModelSummary } from '@activepieces/pieces-framework'
import { ProjectResourceType, securityAccess } from '@activepieces/server-common'
import {
    ActivepiecesError,
    ALL_PRINCIPAL_TYPES,
    ErrorCode,
    GetPieceRequestParams,
    GetPieceRequestQuery,
    GetPieceRequestWithScopeParams,
    isNil,
    ListPiecesRequestQuery,
    LocalesEnum,
    PieceCategory,
    PieceOptionRequest,
    Principal,
    PrincipalType,
    RegistryPiecesRequestQuery,
    SampleDataFileType,
    WorkerJobType,
} from '@activepieces/shared'
import { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { ArrayContains } from 'typeorm'
import { EngineHelperPropResult, OperationResponse } from 'worker'
import { appConnectionsRepo } from '../../app-connection/app-connection-service/app-connection-service'
import { flowService } from '../../flows/flow/flow.service'
import { sampleDataService } from '../../flows/step-run/sample-data.service'
import { userInteractionWatcher } from '../../workers/user-interaction-watcher'
import { pieceSyncService } from '../piece-sync-service'
import { getPiecePackageWithoutArchive, pieceMetadataService } from './piece-metadata-service'
import { organizationEnvironmentService } from '../../organization/organization-environment.service'
import { projectService } from '../../project/project-service'

const isBmpPiece = (pieceName: string): boolean =>
    pieceName === '@activepieces/piece-ada-bmp'

export const pieceModule: FastifyPluginAsyncZod = async (app) => {
    await app.register(basePiecesController, { prefix: '/v1/pieces' })
}

const basePiecesController: FastifyPluginAsyncZod = async (app) => {

    app.get(
        '/categories',
        ListCategoriesRequest,
        async (): Promise<PieceCategory[]> => {
            return Object.values(PieceCategory)
        },
    )

    app.get('/', ListPiecesRequest, async (req): Promise<PieceMetadataModelSummary[]> => {
        const query = req.query

        const oldSyncCall = !isNil(query.release)
        if (oldSyncCall) {
            throw new ActivepiecesError({
                code: ErrorCode.PIECE_SYNC_NOT_SUPPORTED,
                params: {
                    message: 'This endpoint is deprecated. Please use it without release parameter.',
                    release: query.release ?? '',
                },
            })
        }
        const includeTags = query.includeTags ?? false
        const platformId = getPlatformId(req.principal)
        const projectId = req.query.projectId
        const pieceMetadataSummary = await pieceMetadataService(req.log).list({
            includeHidden: query.includeHidden ?? false,
            projectId,
            platformId,
            includeTags,
            categories: query.categories,
            searchQuery: query.searchQuery,
            sortBy: query.sortBy,
            orderBy: query.orderBy,
            suggestionType: query.suggestionType,
            locale: query.locale as LocalesEnum | undefined,
        })
        return pieceMetadataSummary.map((piece) => {
            return {
                ...piece,
                i18n: undefined,
            }
        })
    })

    app.get(
        '/:scope/:name',
        GetPieceParamsWithScopeRequest,
        async (req) => {
            const { name, scope } = req.params
            const { version } = req.query

            const decodeScope = decodeURIComponent(scope)
            const decodedName = decodeURIComponent(name)
            const platformId = getPlatformId(req.principal)
            return pieceMetadataService(req.log).getOrThrow({
                platformId,
                name: `${decodeScope}/${decodedName}`,
                version,
                locale: req.query.locale as LocalesEnum | undefined,
            })
        },
    )

    app.get(
        '/:name',
        GetPieceParamsRequest,
        async (req): Promise<PieceMetadataModel> => {
            const { name } = req.params
            const { version } = req.query
            const decodedName = decodeURIComponent(name)
            const platformId = getPlatformId(req.principal)
            return pieceMetadataService(req.log).getOrThrow({
                platformId,
                name: decodedName,
                version,
                locale: req.query.locale as LocalesEnum | undefined,
            })
        },
    )

    app.get('/registry', RegistryPiecesRequest, async (req) => {
        const pieces = await pieceMetadataService(req.log).registry({
            release: req.query.release,
        })
        return pieces
    })

    app.post('/sync', SyncPiecesRequest, async (req) => pieceSyncService(req.log).sync({ publishCacheRefresh: true }))

    app.post(
        '/options',
        OptionsPieceRequest,
        async (req) => {
            const projectId = req.projectId
            const platform = req.principal.platform
            const flow = await flowService(req.log).getOnePopulatedOrThrow({
                projectId,
                id: req.body.flowId,
                versionId: req.body.flowVersionId,
            })
            const sampleData = await sampleDataService(req.log).getSampleDataForFlow(projectId, flow.version, SampleDataFileType.OUTPUT)
            
            // Fetch organization environment metadata to pass to the piece
            let organizationEnvironmentMetadata: Record<string, unknown> | undefined = undefined
            try {
                const project = await projectService(req.log).getOneOrThrow(projectId)
                if (project.organizationId) {
                    const orgEnvs = await organizationEnvironmentService.listByOrganization(project.organizationId)
                    let orgEnv: { metadata?: unknown; environment: string } | undefined

                    if (isBmpPiece(req.body.pieceName)) {
                        const authEnvironment = await extractEnvironmentFromConnection(
                            req.body.input,
                            projectId,
                            platform.id,
                        )
                        if (authEnvironment) {
                            orgEnv = orgEnvs.find(env => env.environment === authEnvironment)
                        }
                    }
                    if (!orgEnv) {
                        orgEnv = orgEnvs.find(env => env.projectId === projectId)
                    }
                    if (orgEnv?.metadata) {
                        organizationEnvironmentMetadata = orgEnv.metadata as Record<string, unknown>
                        req.log.info({
                            organizationId: project.organizationId,
                            environment: orgEnv.environment,
                            hasApiUrl: !!(orgEnv.metadata as Record<string, unknown>)?.ADA_BMP_API_URL,
                        }, '[Pieces Options] Fetched organization environment metadata')
                    } else {
                        req.log.info({
                            organizationId: project.organizationId,
                            projectId,
                        }, '[Pieces Options] No metadata found for project')
                    }
                }
            } catch (error) {
                req.log.warn({ error }, '[Pieces Options] Failed to fetch organization environment metadata')
                // Continue without metadata - pieces will fall back to environment variables
            }
            
            const { result } = await userInteractionWatcher(req.log).submitAndWaitForResponse<OperationResponse<EngineHelperPropResult>>({
                jobType: WorkerJobType.EXECUTE_PROPERTY,
                platformId: platform.id,
                projectId,
                flowVersion: flow.version,
                propertyName: req.body.propertyName,
                actionOrTriggerName: req.body.actionOrTriggerName,
                input: req.body.input,
                sampleData,
                searchValue: req.body.searchValue,
                piece: await getPiecePackageWithoutArchive(req.log, platform.id, req.body),
                organizationEnvironmentMetadata,
            })
            return result
        },
    )

}

function getPlatformId(principal: Principal): string | undefined {
    return principal.type === PrincipalType.WORKER || principal.type === PrincipalType.UNKNOWN ? undefined : principal.platform?.id
}

function parseConnectionExternalIdFromAuth(auth: unknown): string | null {
    if (typeof auth !== 'string') return null
    const match = auth.match(/\['([^']+)'\]/)
    return match ? match[1] : null
}

async function extractEnvironmentFromConnection(
    input: Record<string, unknown>,
    projectId: string,
    platformId: string,
): Promise<string | null> {
    const auth = input?.auth
    const externalId = parseConnectionExternalIdFromAuth(auth)
    if (!externalId) return null
    const conn = await appConnectionsRepo().findOne({
        where: {
            projectIds: ArrayContains([projectId]),
            externalId,
            platformId,
        },
        select: ['metadata'],
    })
    const meta = conn?.metadata as Record<string, string> | undefined
    return meta?.environment ?? null
}

const RegistryPiecesRequest = {
    config: {
        security: securityAccess.unscoped(ALL_PRINCIPAL_TYPES),
    },
    schema: {
        querystring: RegistryPiecesRequestQuery,
    },
}

const ListPiecesRequest = {
    config: {
        security: securityAccess.unscoped(ALL_PRINCIPAL_TYPES),
    },
    schema: {
        querystring: ListPiecesRequestQuery,

    },

}
const GetPieceParamsRequest = {
    config: {
        security: securityAccess.unscoped(ALL_PRINCIPAL_TYPES),
    },
    schema: {
        params: GetPieceRequestParams,
        querystring: GetPieceRequestQuery,
    },
}

const GetPieceParamsWithScopeRequest = {
    config: {
        security: securityAccess.unscoped(ALL_PRINCIPAL_TYPES),
    },
    schema: {
        params: GetPieceRequestWithScopeParams,
        querystring: GetPieceRequestQuery,
    },
}

const ListCategoriesRequest = {
    config: {
        security: securityAccess.public(),
    },
    schema: {
        querystring: ListPiecesRequestQuery,
    },
}

const OptionsPieceRequest = {
    schema: {
        body: PieceOptionRequest,
    },
    config: {
        security: securityAccess.project([PrincipalType.USER], undefined, {
            type: ProjectResourceType.BODY,
        }),
    },
}

const SyncPiecesRequest = {
    config: {
        security: securityAccess.publicPlatform([PrincipalType.USER]),
    },
}