import { ProjectResourceType, securityAccess } from '@activepieces/server-common'
import { ApId, PrincipalType, Project, SeekPage, SERVICE_KEY_SECURITY_OPENAPI, UpdateProjectRequestInCommunity } from '@activepieces/shared'
import { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { StatusCodes } from 'http-status-codes'
import { z } from 'zod'
import { paginationHelper } from '../helper/pagination/pagination-utils'
import { userService } from '../user/user-service'
import { projectService } from './project-service'

export const projectController: FastifyPluginAsyncZod = async (fastify) => {
    fastify.post('/:id', UpdateProjectRequest, async (request) => {
        const project = await projectService(request.log).getOneOrThrow(request.params.id)
        return projectService(request.log).update(request.params.id, {
            type: project.type,
            ...request.body,
        })
    })

    fastify.get('/:id', GetProjectRequest, async (request) => {
        return projectService(request.log).getOneOrThrow(request.projectId)
    })

    fastify.get('/', {
        config: {
            security: securityAccess.publicPlatform([PrincipalType.USER]),
        },
    }, async (request) => {
        const user = await userService(request.log).getOneOrFail({ id: request.principal.id })
        const projects = await projectService(request.log).getAllForUser({
            platformId: request.principal.platform.id,
            userId: request.principal.id,
            platformRole: user.platformRole,
            userOrganizationId: user.organizationId ?? undefined,
            isPrivileged: userService(request.log).isUserPrivileged(user),
        })
        const projectsWithAnalytics = await projectService(request.log).enrichProjectsWithAnalytics(projects)
        return paginationHelper.createPage(projectsWithAnalytics, null)
    })
}

const UpdateProjectRequest = {
    config: {
        security: securityAccess.publicPlatform([PrincipalType.USER, PrincipalType.SERVICE]),
    },
    schema: {
        tags: ['projects'],
        params: z.object({
            id: z.string(),
        }),
        response: {
            [StatusCodes.OK]: Project,
        },
        body: UpdateProjectRequestInCommunity,
    },
}


const GetProjectRequest = {
    config: {
        security: securityAccess.project([PrincipalType.USER], undefined, {
            type: ProjectResourceType.PARAM,
            paramKey: 'id',
        }),
    },
    schema: {
        tags: ['projects'],
        params: z.object({
            id: ApId,
        }),
        response: {
            [StatusCodes.OK]: Project,
        },
    },
}   

const ListProjectsRequest = {
    config: {
        security: securityAccess.publicPlatform([PrincipalType.USER]),
    },
    schema: {
        tags: ['projects'],
        response: {
            [StatusCodes.OK]: SeekPage(Project),
        },
        security: [SERVICE_KEY_SECURITY_OPENAPI],
    },
}   