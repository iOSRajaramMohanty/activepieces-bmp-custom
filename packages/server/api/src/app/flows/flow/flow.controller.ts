import { ActivepiecesError,
    ApId,
    ApplicationEventName,
    CountFlowsRequest,
    CreateFlowRequest,
    ErrorCode,
    FlowOperationRequest,
    FlowOperationType,
    FlowStatus,
    flowStructureUtil,
    FlowTrigger,
    GetFlowQueryParamsRequest,
    GetFlowTemplateRequestQuery,
    GitPushOperationType,
    ListFlowsRequest,
    Permission,
    PlatformRole,
    PlatformUsageMetric,
    PopulatedFlow,
    PrincipalType,
    ProjectType,
    SeekPage,
    SERVICE_KEY_SECURITY_OPENAPI,
    SharedTemplate,
} from '@activepieces/shared'
import { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { StatusCodes } from 'http-status-codes'
import { z } from 'zod'
import { authenticationUtils } from '../../authentication/authentication-utils'
import { entitiesMustBeOwnedByCurrentProject } from '../../authentication/authorization'
import { ProjectResourceType } from '../../core/security/authorization/common'
import { securityAccess } from '../../core/security/authorization/fastify-security'
import { assertUserHasPermissionToFlow } from '../../ee/authentication/project-role/rbac-middleware'
import { platformPlanService } from '../../ee/platform/platform-plan/platform-plan.service'
import { gitRepoService } from '../../ee/projects/project-release/git-sync/git-sync.service'
import { applicationEvents } from '../../helper/application-events'
import { projectService } from '../../project/project-service'
import { userService } from '../../user/user-service'
import { migrateFlowVersionTemplate } from '../flow-version/migrations'
import { FlowEntity } from './flow.entity'
import { flowService } from './flow.service'

const DEFAULT_PAGE_SIZE = 10

export const flowController: FastifyPluginAsyncZod = async (app) => {
    app.addHook('preSerialization', entitiesMustBeOwnedByCurrentProject)
    app.post('/', CreateFlowRequestOptions, async (request, reply) => {
        if (request.principal.type === PrincipalType.USER) {
            const user = await userService(request.log).getOneOrFail({ id: request.principal.id })
            const project = await projectService(request.log).getOneOrThrow(request.projectId)
            
            // Check if user is SUPER_ADMIN (they cannot create flows)
            if (user.platformRole === PlatformRole.SUPER_ADMIN) {
                throw new ActivepiecesError({
                    code: ErrorCode.AUTHORIZATION,
                    params: {
                        message: 'Super Admin cannot create flows',
                    },
                })
            }
            
            // Check if user is platform owner (tenant) - they cannot create flows
            if (user.platformRole === PlatformRole.OWNER) {
                // Platform owner (tenant) can only VIEW their admins' (sub-owners') projects and flows
                // They cannot create flows themselves. Switch to an admin (sub-owner) account to create flows.
                throw new ActivepiecesError({
                    code: ErrorCode.AUTHORIZATION,
                    params: {
                        message: 'Platform owner (tenant) cannot create flows. Only admins (sub-owners) can create flows. Switch to an admin account to create flows.',
                    },
                })
            }
            
            // For operators/members: can create flows in admin's personal projects within the same platform
            if (user.platformRole === PlatformRole.OPERATOR || user.platformRole === PlatformRole.MEMBER) {
                if (project.type !== ProjectType.PERSONAL) {
                    throw new ActivepiecesError({
                        code: ErrorCode.AUTHORIZATION,
                        params: {
                            message: 'Operators and Members can only create flows in admin personal projects',
                        },
                    })
                }
                
                // Verify the project owner is an ADMIN in the same platform
                const projectOwner = await userService(request.log).getOneOrFail({ id: project.ownerId })
                if (projectOwner.platformRole !== PlatformRole.ADMIN || projectOwner.platformId !== user.platformId) {
                    throw new ActivepiecesError({
                        code: ErrorCode.AUTHORIZATION,
                        params: {
                            message: 'Operators and Members can only create flows in admin personal projects within the same platform',
                        },
                    })
                }
                // Allow flow creation - operators and members can create flows
            }
            
            // For admins: can create flows in their own projects
            if (user.platformRole === PlatformRole.ADMIN) {
                // Admins can create flows in their own personal projects
                // They can also see and edit flows created by operators/members in their projects
                if (project.type === ProjectType.PERSONAL && project.ownerId !== user.id) {
                    throw new ActivepiecesError({
                        code: ErrorCode.AUTHORIZATION,
                        params: {
                            message: 'Admins can only create flows in their own personal projects',
                        },
                    })
                }
            }
        }
        
        const creatorUser = request.principal.type === PrincipalType.USER
            ? await userService(request.log).getOneOrFail({ id: request.principal.id })
            : null
        const newFlow = await flowService(request.log).create({
            projectId: request.projectId,
            request: request.body,
            ownerId: request.principal.type === PrincipalType.SERVICE ? undefined : request.principal.id,
            templateId: request.body.templateId,
            creatorPlatformRole: creatorUser?.platformRole,
        })

        applicationEvents(request.log).sendUserEvent(request, {
            action: ApplicationEventName.FLOW_CREATED,
            data: {
                flow: newFlow,
            },
        })

        return reply.status(StatusCodes.CREATED).send(newFlow)
    })

    app.post('/:id', {
        config: {
            security: securityAccess.project(
                [PrincipalType.USER, PrincipalType.SERVICE], 
                Permission.UPDATE_FLOW_STATUS, {
                    type: ProjectResourceType.TABLE,
                    tableName: FlowEntity,
                }),
        },
        schema: {
            tags: ['flows'],
            description: 'Apply an operation to a flow',
            security: [SERVICE_KEY_SECURITY_OPENAPI],
            body: FlowOperationRequest,
            params: z.object({
                id: ApId,
            }),
        },
        preValidation: async (request) => {
            if (request.body?.type === FlowOperationType.IMPORT_FLOW) {
                const migratedFlowTemplate = await migrateFlowVersionTemplate({
                    displayName: request.body.request.displayName,
                    trigger: request.body.request.trigger,
                    //because the target for the first migraiton is undefined not null
                    schemaVersion: request.body.request.schemaVersion ?? undefined,
                    notes: request.body.request.notes ?? [],
                    valid: false,
                })
                request.body.request = {
                    ...request.body.request,
                    displayName: migratedFlowTemplate.displayName,
                    trigger: migratedFlowTemplate.trigger,
                    schemaVersion: migratedFlowTemplate.schemaVersion,
                    notes: migratedFlowTemplate.notes,
                }
            }
        },
    }, async (request) => {
        const userId = await authenticationUtils(request.log).extractUserIdFromRequest(request)
        if (request.principal.type === PrincipalType.USER) {
            const user = await userService(request.log).getOneOrFail({ id: request.principal.id })
            const project = await projectService(request.log).getOneOrThrow(request.projectId)
            const isProjectOwner = project.ownerId === user.id && project.type === ProjectType.PERSONAL
            if (!isProjectOwner && (user.platformRole === PlatformRole.OPERATOR || user.platformRole === PlatformRole.MEMBER)) {
                if (request.body.type === FlowOperationType.LOCK_AND_PUBLISH) {
                    throw new ActivepiecesError({
                        code: ErrorCode.AUTHORIZATION,
                        params: { message: 'Operators and Members cannot publish flows. Only admins can publish flows.' },
                    })
                }
                if (request.body.type === FlowOperationType.CHANGE_STATUS && request.body.request?.status === FlowStatus.ENABLED) {
                    throw new ActivepiecesError({
                        code: ErrorCode.AUTHORIZATION,
                        params: { message: 'Operators and Members cannot enable flows. Only admins can enable flows.' },
                    })
                }
            }
        }
        await assertUserHasPermissionToFlow(request.principal, request.projectId, request.body.type, request.log)

        const flow = await flowService(request.log).getOnePopulatedOrThrow({
            id: request.params.id,
            projectId: request.projectId,
        })

        const turnOnFlow = request.body.type === FlowOperationType.CHANGE_STATUS && request.body.request.status === FlowStatus.ENABLED
        const publishDisabledFlow = request.body.type === FlowOperationType.LOCK_AND_PUBLISH && flow.status === FlowStatus.DISABLED
        if (turnOnFlow || publishDisabledFlow) {
            await platformPlanService(request.log).checkActiveFlowsExceededLimit(
                request.principal.platform.id,
                PlatformUsageMetric.ACTIVE_FLOWS,
            )
        }
        const updatedFlow = await flowService(request.log).update({
            id: request.params.id,
            userId: request.principal.type === PrincipalType.SERVICE ? null : userId,
            platformId: request.principal.platform.id,
            projectId: request.projectId,
            operation: cleanOperation(request.body),
        })
        applicationEvents(request.log).sendUserEvent(request, {
            action: ApplicationEventName.FLOW_UPDATED,
            data: {
                request: request.body,
                flowVersion: flow.version,
            },
        })
        return updatedFlow
    })

    app.get('/', ListFlowsRequestOptions, async (request) => {
        const flowsPage = await flowService(request.log).list({
            projectIds: [request.projectId],
            folderId: request.query.folderId,
            cursorRequest: request.query.cursor ?? null,
            limit: request.query.limit ?? DEFAULT_PAGE_SIZE,
            status: request.query.status,
            name: request.query.name,
            versionState: request.query.versionState,
            externalIds: request.query.externalIds,
            connectionExternalIds: request.query.connectionExternalIds,
            agentExternalIds: request.query.agentExternalIds,
        })

        if (request.principal.type === PrincipalType.USER) {
            const user = await userService(request.log).getOneOrFail({ id: request.principal.id })
            if (user.platformRole === PlatformRole.MEMBER) {
                const filteredData = flowsPage.data.filter((flow) => {
                    const creatorRole = (flow.metadata as Record<string, string> | undefined)?.creatorPlatformRole
                    if (creatorRole === PlatformRole.OPERATOR) return false
                    return true
                })
                return { ...flowsPage, data: filteredData }
            }
        }
        return flowsPage
    })

    app.get('/count', CountFlowsRequestOptions, async (request) => {
        return flowService(request.log).count({
            folderId: request.query.folderId,
            projectId: request.projectId,
        })
    })

    app.get('/:id/template', GetFlowTemplateRequestOptions, async (request) => {
        const userMetadata = request.principal.type === PrincipalType.USER ? await userService(request.log).getMetaInformation({ id: request.principal.id }) : null
        return flowService(request.log).getTemplate({
            flowId: request.params.id,
            userMetadata,
            projectId: request.projectId,
            versionId: undefined,
        })
    })

    app.get('/:id', GetFlowRequestOptions, async (request) => {
        return flowService(request.log).getOnePopulatedOrThrow({
            id: request.params.id,
            projectId: request.projectId,
            versionId: request.query.versionId,
        })
    })

    app.delete('/:id', DeleteFlowRequestOptions, async (request, reply) => {
        const flow = await flowService(request.log).getOnePopulatedOrThrow({
            id: request.params.id,
            projectId: request.projectId,
        })
        await gitRepoService(request.log).onDeleted({
            type: GitPushOperationType.DELETE_FLOW,
            externalId: flow.externalId,
            userId: request.principal.id,
            projectId: request.projectId,
            platformId: request.principal.platform.id,
            log: request.log,
        })
        await flowService(request.log).delete({
            id: request.params.id,
            projectId: request.projectId,
        })
        applicationEvents(request.log).sendUserEvent(request, {
            action: ApplicationEventName.FLOW_DELETED,
            data: {
                flow,
                flowVersion: flow.version,
            },
        })
        return reply.status(StatusCodes.NO_CONTENT).send()
    })
}

function cleanOperation(operation: FlowOperationRequest): FlowOperationRequest {
    if (operation.type === FlowOperationType.IMPORT_FLOW) {
        const clearSampleData = {
            sampleDataFileId: undefined,
            sampleDataInputFileId: undefined,
            lastTestDate: undefined,
        }
        const trigger = flowStructureUtil.transferStep(operation.request.trigger, (step) => ({
            ...step,
            settings: {
                ...step.settings,
                sampleData: {
                    ...step.settings.sampleData,
                    ...clearSampleData,
                },
            },
        })) as FlowTrigger
        return {
            ...operation,
            request: {
                ...operation.request,
                trigger,
            },
        }
    }
    return operation
}

const CreateFlowRequestOptions = {
    config: {
        security: securityAccess.project(
            [PrincipalType.USER, PrincipalType.SERVICE], 
            Permission.WRITE_FLOW, {
                type: ProjectResourceType.BODY,
            }),
    },
    schema: {
        tags: ['flows'],
        description: 'Create a flow',
        security: [SERVICE_KEY_SECURITY_OPENAPI],
        body: CreateFlowRequest,
        response: {
            [StatusCodes.CREATED]: PopulatedFlow,
        },
    },
}


const ListFlowsRequestOptions = {
    config: {
        security: securityAccess.project(
            [PrincipalType.USER, PrincipalType.SERVICE], 
            Permission.READ_FLOW, {
                type: ProjectResourceType.QUERY,
            }),
    },
    schema: {
        tags: ['flows'],
        description: 'List flows',
        security: [SERVICE_KEY_SECURITY_OPENAPI],
        querystring: ListFlowsRequest,
        response: {
            [StatusCodes.OK]: SeekPage(PopulatedFlow),
        },
    },
}

const CountFlowsRequestOptions = {
    config: {
        security: securityAccess.project(
            [PrincipalType.USER, PrincipalType.SERVICE], 
            Permission.READ_FLOW, {
                type: ProjectResourceType.QUERY,
            }),
    },
    schema: {
        querystring: CountFlowsRequest,
    },
}

const GetFlowTemplateRequestOptions = {
    config: {
        security: securityAccess.project(
            [PrincipalType.USER, PrincipalType.SERVICE], 
            Permission.READ_FLOW, {
                type: ProjectResourceType.TABLE,
                tableName: FlowEntity,
            }),
    },
    schema: {
        tags: ['flows'],
        security: [SERVICE_KEY_SECURITY_OPENAPI],
        description: 'Export flow as template',
        params: z.object({
            id: ApId,
        }),
        querystring: GetFlowTemplateRequestQuery,
        response: {
            [StatusCodes.OK]: SharedTemplate,
        },
    },
}

const GetFlowRequestOptions = {
    config: {
        security: securityAccess.project(
            [PrincipalType.USER, PrincipalType.SERVICE], 
            Permission.READ_FLOW, {
                type: ProjectResourceType.TABLE,
                tableName: FlowEntity,
            }),
    },
    schema: {
        tags: ['flows'],
        security: [SERVICE_KEY_SECURITY_OPENAPI],
        description: 'Get a flow by id',
        params: z.object({
            id: ApId,
        }),
        querystring: GetFlowQueryParamsRequest,
        response: {
            [StatusCodes.OK]: PopulatedFlow,
        },
    },
}

const DeleteFlowRequestOptions = {
    config: {
        security: securityAccess.project(
            [PrincipalType.USER, PrincipalType.SERVICE], 
            Permission.WRITE_FLOW, {
                type: ProjectResourceType.TABLE,
                tableName: FlowEntity,
            }),
    },
    schema: {
        tags: ['flows'],
        security: [SERVICE_KEY_SECURITY_OPENAPI],
        description: 'Delete a flow',
        params: z.object({
            id: ApId,
        }),
        response: {
            [StatusCodes.NO_CONTENT]: z.never(),
        },
    },
}


