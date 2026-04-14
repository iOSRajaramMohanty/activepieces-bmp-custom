import { apDayjs } from '@activepieces/server-utils'
import {
    ActivepiecesError,
    ApEdition,
    ApId,
    assertNotNullOrUndefined,
    AuthenticationResponse,
    ErrorCode,
    FileType,
    PlatformRole,
    PlatformWithoutSensitiveData,
    PrincipalType,
    SERVICE_KEY_SECURITY_OPENAPI,
    UpdatePlatformRequestBody,
    UserStatus,
} from '@activepieces/shared'
import { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { StatusCodes } from 'http-status-codes'
import { z } from 'zod'
import { authenticationUtils } from '../authentication/authentication-utils'
import { accountSwitchingActivityService } from '../account-switching/account-switching-activity.service'
import { userIdentityService } from '../authentication/user-identity/user-identity-service'
import { securityAccess } from '../core/security/authorization/fastify-security'
import { platformToEditMustBeOwnedByCurrentUser } from '../ee/authentication/ee-authorization'
import { platformPlanService } from '../ee/platform/platform-plan/platform-plan.service'
import { stripeHelper } from '../ee/platform/platform-plan/stripe-helper'
import { platformProjectService } from '../ee/projects/platform-project-service'
import { fileService } from '../file/file.service'
import { system } from '../helper/system/system'
import { SystemJobName } from '../helper/system-jobs/common'
import { systemJobsSchedule } from '../helper/system-jobs/system-job'
import { projectRepo, projectService } from '../project/project-service'
import { userRepo, userService } from '../user/user-service'
import { platformService } from './platform.service'

const edition = system.getEdition()
export const platformController: FastifyPluginAsyncZod = async (app) => {
    app.post('/:id', UpdatePlatformRequest, async (req, _res) => {
        const platformId = req.principal.platform.id

        const [logoIconUrl, fullLogoUrl, favIconUrl] = await Promise.all([
            fileService(app.log).uploadPublicAsset({
                file: req.body.logoIcon,
                type: FileType.PLATFORM_ASSET,
                platformId,
                metadata: { platformId },
            }),
            fileService(app.log).uploadPublicAsset({
                file: req.body.fullLogo,
                type: FileType.PLATFORM_ASSET,
                platformId,
                metadata: { platformId },
            }),
            fileService(app.log).uploadPublicAsset({
                file: req.body.favIcon,
                type: FileType.PLATFORM_ASSET,
                platformId,
                metadata: { platformId },
            }),
        ])

        await platformService(req.log).update({
            id: req.params.id,
            ...req.body,
            logoIconUrl,
            fullLogoUrl,
            favIconUrl,
        })
        return platformService(req.log).getOneWithPlanAndUsageOrThrow(req.params.id)
    })

    app.get('/:id', GetPlatformRequest, async (req) => {
        if (req.principal.platform.id !== req.params.id) {
            throw new ActivepiecesError({
                code: ErrorCode.AUTHORIZATION,
                params: {
                    message: 'You are not authorized to access this platform',
                },
            })
        }
        return platformService(req.log).getOneWithPlanAndUsageOrThrow(req.principal.platform.id)
    })

    app.get('/assets/:id', GetAssetRequest, async (req, reply) => {
        const [file, data] = await Promise.all([
            fileService(app.log).getFileOrThrow({ fileId: req.params.id }),
            fileService(app.log).getDataOrThrow({ fileId: req.params.id })])

        return reply
            .header(
                'Content-Disposition',
                `attachment; filename="${encodeURI(file.fileName ?? '')}"`,
            )
            .type(file.metadata?.mimetype ?? 'application/octet-stream')
            .status(StatusCodes.OK)
            .send(data.data)
    })


    if (edition === ApEdition.CLOUD) {
        app.delete('/:id', DeletePlatformRequest, async (req, res) => {
            await platformToEditMustBeOwnedByCurrentUser.call(app, req, res)
            assertNotNullOrUndefined(req.principal.platform.id, 'platformId')
            const isCloudNonEnterprisePlan = await platformPlanService(req.log).isCloudNonEnterprisePlan(req.params.id)
            if (!isCloudNonEnterprisePlan) {
                throw new ActivepiecesError({
                    code: ErrorCode.DOES_NOT_MEET_BUSINESS_REQUIREMENTS,
                    params: {
                        message: 'Platform is not eligible for deletion',
                    },
                })
            }
            const platformPlan = await platformPlanService(req.log).getOrCreateForPlatform(req.params.id)
            if (platformPlan.stripeSubscriptionId) {
                await stripeHelper(req.log).deleteCustomer(platformPlan.stripeSubscriptionId)
            }

            const platformId = req.params.id

            const user = await userService(req.log).getOneOrFail({
                id: req.principal.id,
            })

            await userRepo().update(
                { id: user.id, platformId },
                { status: UserStatus.INACTIVE },
            )

            const projectIds = await projectService(req.log).getProjectIdsByPlatform(platformId)
            await Promise.all(
                projectIds.map((projectId) =>
                    platformProjectService(req.log).markForDeletion({
                        id: projectId,
                        platformId,
                    }),
                ),
            )

            await systemJobsSchedule(req.log).upsertJob({
                job: {
                    name: SystemJobName.HARD_DELETE_PLATFORM,
                    data: {
                        platformId,
                        userId: user.id,
                        identityId: user.identityId,
                    },
                    jobId: `hard-delete-platform-${platformId}`,
                },
                schedule: {
                    type: 'one-time',
                    date: apDayjs(),
                },
                customConfig: {
                    attempts: 25,
                    backoff: {
                        type: 'fixed',
                        delay: 60000,
                    },
                },
            })

            return res.status(StatusCodes.NO_CONTENT).send()
        })
    }

    /**
     * List all admins in the platform
     * Owner can see all admins in their platform
     */
    app.get('/admins', {
        config: {
            security: securityAccess.platformAdminOnly([PrincipalType.USER]),
        },
        schema: {
            response: {
                [StatusCodes.OK]: z.array(z.any()),
            },
        },
    }, async (request) => {
        const platformId = request.principal.platform.id
        const owner = await userService(request.log).getOneOrFail({ id: request.principal.id })
        
        // Verify user is the platform owner
        if (owner.platformRole !== PlatformRole.OWNER) {
            throw new ActivepiecesError({
                code: ErrorCode.AUTHORIZATION,
                params: {
                    message: 'Only platform owner can list admins',
                },
            })
        }
        
        const admins = await userRepo().find({
            where: {
                platformId,
                platformRole: PlatformRole.ADMIN,
            },
            relations: ['identity'],
        })
        
        return admins.map(admin => ({
            id: admin.id,
            email: admin.identity?.email,
            firstName: admin.identity?.firstName,
            lastName: admin.identity?.lastName,
            status: admin.status,
            created: admin.created,
        }))
    })

    /**
     * Switch to admin account
     * Owner can switch into any admin account within their platform
     */
    app.post('/switch-to-admin/:adminId', {
        config: {
            security: securityAccess.platformAdminOnly([PrincipalType.USER]),
        },
        schema: {
            params: z.object({
                adminId: z.string(),
            }),
            response: {
                [StatusCodes.OK]: AuthenticationResponse,
            },
        },
    }, async (request, reply) => {
        const { adminId } = request.params
        const ownerId = request.principal.id
        const platformId = request.principal.platform.id
        
        request.log.info({ adminId, ownerId, platformId }, '[Platform] Owner switching to admin account')
        
        try {
            // Verify user is the platform owner
            const owner = await userService(request.log).getOneOrFail({ id: ownerId })
            
            if (owner.platformRole !== PlatformRole.OWNER) {
                throw new ActivepiecesError({
                    code: ErrorCode.AUTHORIZATION,
                    params: {
                        message: 'Only platform owner can switch to admin accounts',
                    },
                })
            }
            
            // Get admin user
            const admin = await userService(request.log).getOneOrFail({ id: adminId })
            
            // Verify admin belongs to owner's platform
            if (admin.platformId !== platformId) {
                throw new ActivepiecesError({
                    code: ErrorCode.AUTHORIZATION,
                    params: {
                        message: 'Admin does not belong to your platform',
                    },
                })
            }
            
            // Verify admin is actually an admin
            if (admin.platformRole !== PlatformRole.ADMIN) {
                throw new ActivepiecesError({
                    code: ErrorCode.AUTHORIZATION,
                    params: {
                        message: 'User is not an admin',
                    },
                })
            }
            
            const ownerIdentity = await userIdentityService(request.log).getOneOrFail({ id: owner.identityId })
            const adminIdentity = await userIdentityService(request.log).getOneOrFail({ id: admin.identityId })
            
            request.log.info({
                ownerId,
                adminId: admin.id,
                platformId,
            }, '[Platform] Switching to admin account')
            
            // Log the account switching activity (wrapped in try-catch in case migration hasn't run)
            try {
                await accountSwitchingActivityService(request.log).logActivity({
                    originalUserId: ownerId,
                    switchedToUserId: admin.id,
                    switchType: 'OWNER_TO_ADMIN',
                    originalUserEmail: ownerIdentity.email,
                    switchedToUserEmail: adminIdentity.email,
                    originalPlatformId: platformId,
                    switchedToPlatformId: platformId,
                })
                request.log.info({ ownerId, adminId: admin.id }, '[Platform] Successfully logged account switching activity')
            } catch (error: any) {
                // Log error but don't fail the switch if table doesn't exist yet
                const errorMessage = error?.message || String(error)
                if (errorMessage.includes('does not exist') || errorMessage.includes('relation')) {
                    request.log.warn({ error: errorMessage }, '[Platform] Account switching activity table does not exist yet. Migration needs to run. Switch will proceed without logging.')
                } else {
                    request.log.error({ error }, '[Platform] Failed to log account switching activity')
                }
            }
            
            // Get admin's accessible projects (includes org shared project for org admins)
            const adminProjects = await projectService(request.log).getAllForUser({
                platformId,
                userId: admin.id,
                platformRole: admin.platformRole,
                userOrganizationId: admin.organizationId ?? undefined,
            })
            const defaultProjectId = adminProjects.length > 0 ? adminProjects[0].id : null
            
            // Return admin's authentication token
            const authResponse = await authenticationUtils(request.log).getProjectAndToken({
                userId: admin.id,
                platformId: platformId,
                projectId: defaultProjectId,
            })
            
            return reply.status(StatusCodes.OK).send(authResponse)
        } catch (error) {
            request.log.error({ error, adminId, ownerId }, '[Platform] Failed to switch to admin account')
            throw error
        }
    })
}

const UpdatePlatformRequest = {
    config: {
        security: securityAccess.platformAdminOnly([PrincipalType.USER]),
    },
    schema: {
        body: UpdatePlatformRequestBody,
        params: z.object({
            id: ApId,
        }),
        response: {
            [StatusCodes.OK]: PlatformWithoutSensitiveData,
        },
    },
}


const GetPlatformRequest = {
    config: {
        security: securityAccess.publicPlatform([PrincipalType.USER, PrincipalType.SERVICE]),
    },
    schema: {
        tags: ['platforms'],
        security: [SERVICE_KEY_SECURITY_OPENAPI],
        description: 'Get a platform by id',
        params: z.object({
            id: ApId,
        }),
        response: {
            [StatusCodes.OK]: PlatformWithoutSensitiveData,
        },
    },
}

const DeletePlatformRequest = {
    config: {
        security: securityAccess.platformAdminOnly([PrincipalType.USER]),
    },
    schema: {
        params: z.object({
            id: ApId,
        }),
    },
}

const GetAssetRequest = {
    config: {
        security: securityAccess.public(),
    },
    schema: {
        params: z.object({
            id: z.string(),
        }),
    },
}

