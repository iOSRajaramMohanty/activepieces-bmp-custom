import { getProjectMaxConcurrentJobsKey } from '@activepieces/server-shared'
import {
    ActivepiecesError,
    ApId,
    apId,
    assertNotNullOrUndefined,
    ColorName,
    ErrorCode,
    isNil,
    Metadata,
    PlatformRole,
    Project,
    ProjectIcon,
    ProjectId,
    ProjectType,
    spreadIfDefined,
    UserId,
} from '@activepieces/shared'
import { Brackets, IsNull, Not, ObjectLiteral, SelectQueryBuilder, In } from 'typeorm'
import { repoFactory } from '../core/db/repo-factory'
import { distributedStore } from '../database/redis-connections'
import { databaseConnection } from '../database/database-connection'
import { OrganizationEntity } from '../organization/organization.entity'
import { system } from '../helper/system/system'
import { platformService } from '../platform/platform.service'
import { userService } from '../user/user-service'
import { ProjectEntity } from './project-entity'
import { projectHooks } from './project-hooks'

export const projectRepo = repoFactory(ProjectEntity)

export const projectService = {
    async create(params: CreateParams): Promise<Project> {
        // Validate: If creating a PERSONAL project, ensure the owner is an ADMIN (sub-owner)
        // Platform OWNER (tenant) should NOT have personal projects - they can only view their ADMINs' projects
        // Operators and Members also cannot have personal projects
        if (params.type === ProjectType.PERSONAL && !isNil(params.ownerId)) {
            const owner = await userService.getOneOrFail({ id: params.ownerId })
            if (owner.platformRole !== PlatformRole.ADMIN) {
                throw new ActivepiecesError({
                    code: ErrorCode.AUTHORIZATION,
                    params: {
                        message: 'Only Admins (sub-owners) can create personal projects. Platform Owner (tenant), Operators, and Members cannot create personal projects.',
                    },
                })
            }
        }
        
        const colors = Object.values(ColorName)
        const icon: ProjectIcon = {
            color: colors[Math.floor(Math.random() * colors.length)],
        }
        const newProject: NewProject = {
            id: apId(),
            ...params,
            icon,
            maxConcurrentJobs: params.maxConcurrentJobs,
            releasesEnabled: false,
        }
        const savedProject = await projectRepo().save(newProject)
        await projectHooks.get(system.globalLogger()).postCreate(savedProject)
        if (!isNil(params.maxConcurrentJobs)) {
            await distributedStore.put(getProjectMaxConcurrentJobsKey(savedProject.id), params.maxConcurrentJobs)
        }
        return savedProject
    },
    async getOneByOwnerAndPlatform(params: GetOneByOwnerAndPlatformParams): Promise<Project | null> {
        return projectRepo().findOneBy({
            ownerId: params.ownerId,
            platformId: params.platformId,
        })
    },

    async getOne(projectId: ProjectId | undefined): Promise<Project | null> {
        if (isNil(projectId)) {
            return null
        }

        return projectRepo().findOneBy({
            id: projectId,
        })
    },

    async getProjectIdsByPlatform(platformId: string): Promise<string[]> {
        const projects = await projectRepo()
            .createQueryBuilder('project')
            .select('project.id')
            .where({ platformId })
            .orderBy('project.type', 'ASC')
            .addOrderBy('project.displayName', 'ASC')
            .addOrderBy('project.id', 'ASC')
            .getMany()

        return projects.map((project) => project.id)
    },

    async countByPlatformIdAndType(platformId: string, type: ProjectType): Promise<number> {
        return projectRepo().countBy({
            platformId,
            type,
        })
    },

    async update(projectId: ProjectId, request: UpdateParams): Promise<Project> {
        const externalId = request.externalId?.trim() !== '' ? request.externalId : undefined
        await assertExternalIdIsUnique(externalId, projectId)

        const baseUpdate = {
            ...spreadIfDefined('externalId', externalId),
            ...spreadIfDefined('releasesEnabled', request.releasesEnabled),
            ...spreadIfDefined('metadata', request.metadata),
            ...spreadIfDefined('maxConcurrentJobs', request.maxConcurrentJobs),
            ...spreadIfDefined('organizationId', request.organizationId),
        }

        const teamUpdate = request.type === ProjectType.TEAM ? {
            ...spreadIfDefined('displayName', request.displayName),
            ...spreadIfDefined('icon', request.icon),
        } : {}

        await projectRepo().update({ id: projectId }, { ...baseUpdate, ...teamUpdate })
        return this.getOneOrThrow(projectId)
    },

    async getPlatformId(projectId: ProjectId): Promise<string> {
        const result = await projectRepo().createQueryBuilder('project').select('"platformId"').where({
            id: projectId,
        }).getRawOne()
        const platformId = result?.platformId
        if (isNil(platformId)) {
            throw new Error(`Platform ID for project ${projectId} is undefined in webhook.`)
        }
        return platformId
    },
    async getOneOrThrow(projectId: ProjectId): Promise<Project> {
        const project = await this.getOne(projectId)

        if (isNil(project)) {
            throw new ActivepiecesError({
                code: ErrorCode.ENTITY_NOT_FOUND,
                params: {
                    entityId: projectId,
                    entityType: 'project',
                },
            })
        }

        return project
    },
    async exists({ projectId, isSoftDeleted }: ExistsParams): Promise<boolean> {
        const project = await projectRepo().findOne({
            where: {
                id: projectId,
                deleted: isSoftDeleted ? Not(IsNull()) : IsNull(),
            },
            withDeleted: true,
        })
        return !isNil(project)
    },
    async getUserProjectOrThrow(userId: UserId): Promise<Project> {
        const user = await userService.getOneOrFail({ id: userId })
        assertNotNullOrUndefined(user.platformId, 'platformId is undefined')
        const projects = await this.getAllForUser({
            platformId: user.platformId,
            userId,
            platformRole: user.platformRole,
            userOrganizationId: user.organizationId ?? undefined,
        })
        if (isNil(projects) || projects.length === 0) {
            throw new ActivepiecesError({
                code: ErrorCode.ENTITY_NOT_FOUND,
                params: {
                    entityId: userId,
                    entityType: 'user',
                },
            })
        }
        return projects[0]
    },

    async getAllForUser(params: GetAllForUserParams): Promise<Project[]> {
        assertNotNullOrUndefined(params.platformId, 'platformId is undefined')
        
        const queryBuilder = projectRepo()
            .createQueryBuilder('project')
            .where('project."platformId" = :platformId', { platformId: params.platformId })
            .andWhere('project.deleted IS NULL')
            .orderBy('project.type', 'ASC')
            .addOrderBy('project.displayName', 'ASC')
            .addOrderBy('project.id', 'ASC')

        if (params.displayName) {
            queryBuilder.andWhere('project."displayName" ILIKE :displayName', { displayName: `%${params.displayName}%` })
        }

        await applyProjectsAccessFilters(queryBuilder, params)

        return queryBuilder.getMany()
    },
    
    async enrichProjectsWithAnalytics(projects: Project[]): Promise<any[]> {
        if (projects.length === 0) return []
        
        // Count project members for each project
        const projectIds = projects.map(p => p.id)
        const memberCounts = await projectRepo()
            .createQueryBuilder('project')
            .select('project.id', 'projectId')
            .addSelect('COUNT(DISTINCT pm."userId")', 'memberCount')
            .leftJoin('project_member', 'pm', 'pm."projectId" = project.id')
            .where('project.id IN (:...projectIds)', { projectIds })
            .groupBy('project.id')
            .getRawMany()
        
        const memberCountMap = new Map(memberCounts.map(r => [r.projectId, parseInt(r.memberCount) || 0]))
        
        // Get organization names for projects
        const organizationMap = await getOrganizationNamesForProjects(projectIds)
        
        // Return projects with analytics and organizationName
        return projects.map(project => ({
            ...project,
            analytics: {
                totalUsers: memberCountMap.get(project.id) || 0,
                activeUsers: 0, // Not calculated in CE mode
                totalFlows: 0, // Not calculated in CE mode
                activeFlows: 0, // Not calculated in CE mode
            },
            organizationName: organizationMap.get(project.id) || null,
        }))
    },
    async userHasProjects(params: GetAllForUserParams): Promise<boolean> {
        assertNotNullOrUndefined(params.platformId, 'platformId is undefined')
        
        const queryBuilder = projectRepo()
            .createQueryBuilder('project')
            .where('project."platformId" = :platformId', { platformId: params.platformId })

        await applyProjectsAccessFilters(queryBuilder, params)

        return queryBuilder.getExists()
    },
    async addProjectToPlatform({ projectId, platformId }: AddProjectToPlatformParams): Promise<void> {
        const query = {
            id: projectId,
        }

        const update = {
            platformId,
        }

        await projectRepo().update(query, update)
    },

    async getByPlatformIdAndExternalId({
        platformId,
        externalId,
    }: GetByPlatformIdAndExternalIdParams): Promise<Project | null> {
        return projectRepo().findOneBy({
            platformId,
            externalId,
        })
    },
}


async function getOrganizationNamesForProjects(projectIds: string[]): Promise<Map<string, string>> {
    if (projectIds.length === 0) return new Map()
    
    const orgRepo = databaseConnection().getRepository(OrganizationEntity)
    const projects = await projectRepo().find({
        where: { id: In(projectIds) },
        select: ['id', 'organizationId'],
    })
    
    const organizationIds = [...new Set(projects.map(p => p.organizationId).filter((id): id is string => id !== null))]
    
    if (organizationIds.length === 0) return new Map()
    
    const organizations = await orgRepo.find({
        where: { id: In(organizationIds) },
        select: ['id', 'name'],
    })
    
    const orgNameMap = new Map(organizations.map(org => [org.id, org.name]))
    const projectOrgMap = new Map<string, string>()
    
    projects.forEach(project => {
        if (project.organizationId) {
            const orgName = orgNameMap.get(project.organizationId)
            if (orgName) {
                projectOrgMap.set(project.id, orgName)
            }
        }
    })
    
    return projectOrgMap
}

export async function applyProjectsAccessFilters<T extends ObjectLiteral>(
    queryBuilder: SelectQueryBuilder<T>,
    params: ApplyProjectsAccessFiltersParams,
): Promise<void> {
    const { platformId, userId, platformRole, userOrganizationId, isPrivileged } = params
    
    // If isPrivileged is true (from EE code), don't apply filters - user can see all projects
    if (isPrivileged === true) {
        return
    }
    
    // OWNER (tenant) can see all ADMINs' personal projects in their platform
    if (platformRole === PlatformRole.OWNER || platformRole === PlatformRole.SUPER_ADMIN) {
        return
    }

    queryBuilder.andWhere(new Brackets(qb => {
        if (platformRole === PlatformRole.ADMIN) {
            // ADMIN with org: only org shared project + TEAM projects (one project per org)
            // ADMIN without org: own personal projects + TEAM projects
            if (!isNil(userOrganizationId)) {
                qb.where('project."organizationId" = :userOrganizationId', { userOrganizationId })
            } else {
                qb.where(
                    'project."ownerId" = :userId AND project.type = :personalType',
                    { userId, personalType: ProjectType.PERSONAL },
                )
            }
            qb.orWhere(
                'project.id IN (SELECT "projectId" FROM project_member WHERE "userId" = :userId AND "platformId" = :platformId)',
                { userId, platformId },
            )
        } else {
            // OPERATOR/MEMBER: org shared project (visibility) + TEAM projects (if member)
            const projectMemberCondition = 'project.id IN (SELECT "projectId" FROM project_member WHERE "userId" = :userId AND "platformId" = :platformId)'
            if (!isNil(userOrganizationId)) {
                qb.where('project."organizationId" = :userOrganizationId', { userOrganizationId })
                    .orWhere(projectMemberCondition, { userId, platformId })
            } else {
                qb.where(projectMemberCondition, { userId, platformId })
            }
        }
    }))
}
async function assertExternalIdIsUnique(externalId: string | undefined | null, projectId: ProjectId): Promise<void> {
    if (!isNil(externalId)) {
        const externalIdAlreadyExists = await projectRepo().existsBy({
            id: Not(projectId),
            externalId,
        })

        if (externalIdAlreadyExists) {
            throw new ActivepiecesError({
                code: ErrorCode.PROJECT_EXTERNAL_ID_ALREADY_EXISTS,
                params: {
                    externalId,
                },
            })
        }
    }
}

type GetAllForUserParams = {
    platformId: string
    userId: string
    platformRole: PlatformRole
    userOrganizationId?: string | null
    displayName?: string
}

type GetOneByOwnerAndPlatformParams = {
    ownerId: UserId
    platformId: string
}

type ExistsParams = {
    projectId: ProjectId
    isSoftDeleted?: boolean
}

type UpdateTeamProjectParams = {
    type: ProjectType.TEAM
    displayName?: string
    externalId?: string
    releasesEnabled?: boolean
    metadata?: Metadata
    maxConcurrentJobs?: number
    icon?: ProjectIcon
    organizationId?: string
}

type UpdatePersonalProjectParams = {
    type: ProjectType.PERSONAL
    externalId?: string
    releasesEnabled?: boolean
    metadata?: Metadata
    maxConcurrentJobs?: number
    organizationId?: string
}

type UpdateParams = UpdateTeamProjectParams | UpdatePersonalProjectParams

type CreateParams = {
    ownerId: UserId
    displayName: string
    type: ProjectType
    platformId: string
    externalId?: string
    metadata?: Metadata
    maxConcurrentJobs?: number
}

type GetByPlatformIdAndExternalIdParams = {
    platformId: string
    externalId: string
}

type AddProjectToPlatformParams = {
    projectId: ProjectId
    platformId: ApId
}

type NewProject = Omit<Project, 'created' | 'updated' | 'deleted'>

type ApplyProjectsAccessFiltersParams = {
    platformId: string
    userId: string
    platformRole?: PlatformRole
    userOrganizationId?: string | null
    isPrivileged?: boolean
}
