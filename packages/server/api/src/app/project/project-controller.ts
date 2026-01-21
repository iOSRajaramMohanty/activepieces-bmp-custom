import { ProjectResourceType, securityAccess } from '@activepieces/server-shared'
import { PrincipalType, Project, UpdateProjectRequestInCommunity } from '@activepieces/shared'
import { FastifyPluginAsyncTypebox, Type } from '@fastify/type-provider-typebox'
import { StatusCodes } from 'http-status-codes'
import { paginationHelper } from '../helper/pagination/pagination-utils'
import { userService } from '../user/user-service'
import { projectService } from './project-service'

export const projectController: FastifyPluginAsyncTypebox = async (fastify) => {
    fastify.post('/:id', UpdateProjectRequest, async (request) => {
        const project = await projectService.getOneOrThrow(request.params.id)
        return projectService.update(request.params.id, {
            type: project.type,
            ...request.body,
        })
    })

    fastify.get('/:id', {
        config: {
            security: securityAccess.project([PrincipalType.USER], undefined, {
                type: ProjectResourceType.PARAM,
                paramKey: 'id',
            }),
        },
    }, async (request) => {
        return projectService.getOneOrThrow(request.projectId)
    })

    fastify.get('/', {
        config: {
            security: securityAccess.publicPlatform([PrincipalType.USER]),
        },
    }, async (request) => {
        // Get all projects the user can access (filtered by role: OWNER sees all, ADMIN sees only their own, OPERATOR/MEMBER see only TEAM projects)
        const user = await userService.getOneOrFail({ id: request.principal.id })
        const projects = await projectService.getAllForUser({
            platformId: request.principal.platform.id,
            userId: request.principal.id,
            platformRole: user.platformRole,
        })
        
        // Add analytics (member counts) to each project for CE mode
        const projectsWithAnalytics = await projectService.enrichProjectsWithAnalytics(projects)
        
        return paginationHelper.createPage(projectsWithAnalytics, null)
    })
}

const UpdateProjectRequest = {
    config: {
        security: securityAccess.publicPlatform([PrincipalType.USER, PrincipalType.SERVICE]),
    },
    schema: {
        tags: ['projects'],
        params: Type.Object({
            id: Type.String(),
        }),
        response: {
            [StatusCodes.OK]: Project,
        },
        body: UpdateProjectRequestInCommunity,
    },
}
