import { securityAccess, WorkerSystemProp } from '@activepieces/server-shared'
import {
    ActivepiecesError,
    ApEdition,
    ApId,
    assertNotNullOrUndefined,
    AuthenticationResponse,
    ErrorCode,
    FileCompression,
    FileType,
    isMultipartFile,
    isNil,
    PlatformRole,
    PlatformWithoutSensitiveData,
    PrincipalType,
    SERVICE_KEY_SECURITY_OPENAPI,
    UpdatePlatformRequestBody,
} from '@activepieces/shared'
import {
    FastifyPluginAsyncTypebox,
    Type,
} from '@fastify/type-provider-typebox'
import { StatusCodes } from 'http-status-codes'
import { authenticationUtils } from '../authentication/authentication-utils'
import { accountSwitchingActivityService } from '../account-switching/account-switching-activity.service'
import { userIdentityService } from '../authentication/user-identity/user-identity-service'
import { userIdentityRepository } from '../authentication/user-identity/user-identity-service'
import { transaction } from '../core/db/transaction'
import { platformToEditMustBeOwnedByCurrentUser } from '../ee/authentication/ee-authorization'
import { platformPlanService } from '../ee/platform/platform-plan/platform-plan.service'
import { stripeHelper } from '../ee/platform/platform-plan/stripe-helper'
import { fileService } from '../file/file.service'
import { flowService } from '../flows/flow/flow.service'
import { system } from '../helper/system/system'
import { projectRepo } from '../project/project-service'
import { userRepo, userService } from '../user/user-service'
import { platformRepo, platformService } from './platform.service'

const edition = system.getEdition()
export const platformController: FastifyPluginAsyncTypebox = async (app) => {
    app.post('/:id', UpdatePlatformRequest, async (req, _res) => {
        const assets = [req.body.logoIcon, req.body.fullLogo, req.body.favIcon]
        const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml', 'image/tiff', 'image/bmp', 'image/ico', 'image/webp', 'image/avif', 'image/apng']

        const [logoIconUrl, fullLogoUrl, favIconUrl] = await Promise.all(
            assets.map(async (file) => {
                if (!isNil(file) && !req.isMultipart() && !isMultipartFile(file)) {
                    throw new ActivepiecesError({
                        code: ErrorCode.VALIDATION,
                        params: {
                            message: 'Request must be multipart/form-data',
                        },
                    })
                }

                if (isNil(file) || !isMultipartFile(file)) {
                    return undefined
                }

                if (!allowedMimeTypes.includes(file.mimetype ?? '')) {
                    throw new ActivepiecesError({
                        code: ErrorCode.VALIDATION,
                        params: {
                            message: 'Invalid file type',
                        },
                    })
                }

                const savedFile = await fileService(app.log).save({
                    data: file.data,
                    size: file.data.length,
                    type: FileType.PLATFORM_ASSET,
                    compression: FileCompression.NONE,
                    platformId: req.principal.platform.id,
                    fileName: file.filename,
                    metadata: {
                        platformId: req.principal.platform.id,
                        mimetype: file.mimetype ?? '',
                    },
                })
                return `${system.get(WorkerSystemProp.FRONTEND_URL)}/api/v1/platforms/assets/${savedFile.id}`
            }),
        )

        await platformService.update({
            id: req.params.id,
            ...req.body,
            logoIconUrl,
            fullLogoUrl,
            favIconUrl,
        })
        return platformService.getOneWithPlanAndUsageOrThrow(req.params.id)
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
        return platformService.getOneWithPlanAndUsageOrThrow(req.principal.platform.id)
    })

    app.get('/assets/:id', GetAssetRequest, async (req, reply) => {
        const file = await fileService(app.log).getFileOrThrow({ fileId: req.params.id, type: FileType.PLATFORM_ASSET })
        const data = await fileService(app.log).getDataOrThrow({ fileId: req.params.id, type: FileType.PLATFORM_ASSET })

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
            await flowService(req.log).deleteAllByPlatformId(req.params.id)
            await transaction(async (entityManager) => {
                await projectRepo(entityManager).delete({
                    platformId: req.params.id,
                })
                await platformRepo(entityManager).delete({
                    id: req.params.id,
                })
                const user = await userService.getOneOrFail({
                    id: req.principal.id,
                })
                await userRepo(entityManager).delete({
                    id: user.id,
                    platformId: req.params.id,
                })
                const usersUsingIdentity = await userRepo(entityManager).find({
                    where: {
                        identityId: user.identityId,
                    },
                })
                if (usersUsingIdentity.length === 0) {
                    await userIdentityRepository(entityManager).delete({
                        id: user.identityId,
                    })
                }
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
                [StatusCodes.OK]: Type.Array(Type.Any()),
            },
        },
    }, async (request) => {
        const platformId = request.principal.platform.id
        const owner = await userService.getOneOrFail({ id: request.principal.id })
        
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
            params: Type.Object({
                adminId: Type.String(),
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
            const owner = await userService.getOneOrFail({ id: ownerId })
            
            if (owner.platformRole !== PlatformRole.OWNER) {
                throw new ActivepiecesError({
                    code: ErrorCode.AUTHORIZATION,
                    params: {
                        message: 'Only platform owner can switch to admin accounts',
                    },
                })
            }
            
            // Get admin user
            const admin = await userService.getOneOrFail({ id: adminId })
            
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
            
            // Get admin's projects to set as default project
            const adminProjects = await projectRepo().find({
                where: {
                    ownerId: admin.id,
                    platformId: platformId,
                },
                order: {
                    created: 'ASC',
                },
                take: 1,
            })
            
            const defaultProjectId = adminProjects.length > 0 ? adminProjects[0].id : null
            
            // Return admin's authentication token
            const authResponse = await authenticationUtils.getProjectAndToken({
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
        params: Type.Object({
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
        params: Type.Object({
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
        params: Type.Object({
            id: ApId,
        }),
    },
}

const GetAssetRequest = {
    config: {
        security: securityAccess.public(),
    },
    schema: {
        params: Type.Object({
            id: Type.String(),
        }),
    },
}