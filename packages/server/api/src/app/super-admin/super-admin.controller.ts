import { FastifyPluginAsyncTypebox } from '@fastify/type-provider-typebox'
import { Type } from '@sinclair/typebox'
import { StatusCodes } from 'http-status-codes'
import { ActivepiecesError, ErrorCode, PlatformRole, PrincipalType, apId, UserIdentityProvider, ProjectType } from '@activepieces/shared'
import { securityAccess } from '@activepieces/server-shared'
import { databaseConnection } from '../database/database-connection'
import { userService } from '../user/user-service'
import { platformService } from '../platform/platform.service'
import { userIdentityService } from '../authentication/user-identity/user-identity-service'
import { projectService } from '../project/project-service'

/**
 * Super Admin Controller
 * Provides APIs for super admins to view and manage all tenants
 */
export const superAdminController: FastifyPluginAsyncTypebox = async (app) => {
    
    // Middleware to check if user is super admin
    app.addHook('preHandler', async (request, reply) => {
        const user = await userService.getOneOrFail({ id: request.principal.id })
        
        if (user.platformRole !== PlatformRole.SUPER_ADMIN) {
            throw new ActivepiecesError({
                code: ErrorCode.AUTHORIZATION,
                params: {
                    message: 'Only super admins can access this endpoint',
                },
            })
        }
    })

    /**
     * Get all platforms (tenants) with stats
     */
    app.get('/platforms', {
        config: {
            security: securityAccess.publicPlatform([PrincipalType.USER]),
        },
        schema: {
            response: {
                [StatusCodes.OK]: Type.Array(Type.Any()),
            },
        },
    }, async (request) => {
        request.log.info('[SuperAdmin] Fetching all platforms')
        
        const platforms = await databaseConnection().query(`
            SELECT 
                p.*,
                ui.email as owner_email,
                (SELECT COUNT(*) FROM "user" WHERE "platformId" = p.id) as "userCount",
                (SELECT COUNT(*) FROM project WHERE "platformId" = p.id AND deleted IS NULL) as "projectCount"
            FROM platform p
            LEFT JOIN "user" owner ON p."ownerId" = owner.id
            LEFT JOIN user_identity ui ON owner."identityId" = ui.id
            ORDER BY p.created DESC
        `)
        
        return platforms
    })

    /**
     * Get all projects across all platforms
     */
    app.get('/projects', {
        config: {
            security: securityAccess.publicPlatform([PrincipalType.USER]),
        },
        schema: {
            response: {
                [StatusCodes.OK]: Type.Array(Type.Any()),
            },
        },
    }, async (request) => {
        request.log.info('[SuperAdmin] Fetching all projects')
        
        const projects = await databaseConnection().query(`
            SELECT 
                p.*,
                platform.name as "platformName",
                ui.email as "ownerEmail",
                ui."firstName" || ' ' || ui."lastName" as "ownerName",
                (SELECT COUNT(*) FROM flow WHERE "projectId" = p.id) as "flowCount"
            FROM project p
            LEFT JOIN platform ON p."platformId" = platform.id
            LEFT JOIN "user" owner ON p."ownerId" = owner.id
            LEFT JOIN user_identity ui ON owner."identityId" = ui.id
            WHERE p.deleted IS NULL
            ORDER BY p.created DESC
            LIMIT 100
        `)
        
        return projects
    })

    /**
     * Get all projects for a specific platform
     */
    app.get('/platforms/:platformId/projects', {
        config: {
            security: securityAccess.publicPlatform([PrincipalType.USER]),
        },
        schema: {
            params: Type.Object({
                platformId: Type.String(),
            }),
            response: {
                [StatusCodes.OK]: Type.Array(Type.Any()),
            },
        },
    }, async (request) => {
        const { platformId } = request.params
        request.log.info(`[SuperAdmin] Fetching projects for platform ${platformId}`)
        
        const projects = await databaseConnection().query(`
            SELECT 
                p.*,
                ui.email as "ownerEmail",
                ui."firstName" || ' ' || ui."lastName" as "ownerName",
                (SELECT COUNT(*) FROM flow WHERE "projectId" = p.id) as "flowCount"
            FROM project p
            LEFT JOIN "user" owner ON p."ownerId" = owner.id
            LEFT JOIN user_identity ui ON owner."identityId" = ui.id
            WHERE p."platformId" = $1 AND p.deleted IS NULL
            ORDER BY p.created DESC
        `, [platformId])
        
        return projects
    })

    /**
     * Get all users for a specific platform
     */
    app.get('/platforms/:platformId/users', {
        config: {
            security: securityAccess.publicPlatform([PrincipalType.USER]),
        },
        schema: {
            params: Type.Object({
                platformId: Type.String(),
            }),
            response: {
                [StatusCodes.OK]: Type.Array(Type.Any()),
            },
        },
    }, async (request) => {
        const { platformId } = request.params
        request.log.info(`[SuperAdmin] Fetching users for platform ${platformId}`)
        
        const users = await databaseConnection().query(`
            SELECT 
                u.id,
                u."platformRole",
                u.status,
                u.created,
                u."lastActiveDate",
                ui.email,
                ui."firstName",
                ui."lastName"
            FROM "user" u
            LEFT JOIN user_identity ui ON u."identityId" = ui.id
            WHERE u."platformId" = $1
            ORDER BY u.created DESC
        `, [platformId])
        
        return users
    })

    /**
     * Get all users across all platforms
     */
    app.get('/users', {
        config: {
            security: securityAccess.publicPlatform([PrincipalType.USER]),
        },
        schema: {
            response: {
                [StatusCodes.OK]: Type.Array(Type.Any()),
            },
        },
    }, async (request) => {
        request.log.info('[SuperAdmin] Fetching all users')
        
        const users = await databaseConnection().query(`
            SELECT 
                u.id,
                u."platformRole",
                u.status,
                u.created,
                u."lastActiveDate",
                u."platformId",
                platform.name as "platformName",
                ui.email,
                ui."firstName",
                ui."lastName"
            FROM "user" u
            LEFT JOIN user_identity ui ON u."identityId" = ui.id
            LEFT JOIN platform ON u."platformId" = platform.id
            ORDER BY u.created DESC
            LIMIT 100
        `)
        
        return users
    })

    /**
     * Get system statistics
     */
    app.get('/stats', {
        config: {
            security: securityAccess.publicPlatform([PrincipalType.USER]),
        },
        schema: {
            response: {
                [StatusCodes.OK]: Type.Object({
                    totalPlatforms: Type.Number(),
                    totalUsers: Type.Number(),
                    totalProjects: Type.Number(),
                    totalFlows: Type.Number(),
                    totalSuperAdmins: Type.Number(),
                    totalAdmins: Type.Number(),
                }),
            },
        },
    }, async (request) => {
        request.log.info('[SuperAdmin] Fetching system stats')
        
        const stats = await databaseConnection().query(`
            SELECT 
                (SELECT COUNT(*) FROM platform) as "totalPlatforms",
                (SELECT COUNT(*) FROM "user") as "totalUsers",
                (SELECT COUNT(*) FROM project WHERE deleted IS NULL) as "totalProjects",
                (SELECT COUNT(*) FROM flow) as "totalFlows",
                (SELECT COUNT(*) FROM "user" WHERE "platformRole" = 'SUPER_ADMIN') as "totalSuperAdmins",
                (SELECT COUNT(*) FROM "user" WHERE "platformRole" = 'ADMIN') as "totalAdmins"
        `)
        
        return stats[0]
    })

    /**
     * Create a new tenant/platform (Super Admin only)
     * Creates a new platform with an admin user
     */
    app.post('/tenants', {
        config: {
            security: securityAccess.publicPlatform([PrincipalType.USER]),
        },
        schema: {
            body: Type.Object({
                name: Type.String({ minLength: 1, maxLength: 100 }),
                ownerEmail: Type.String({ format: 'email' }),
                ownerPassword: Type.String({ minLength: 8 }),
                ownerFirstName: Type.String({ minLength: 1 }),
                ownerLastName: Type.String({ minLength: 1 }),
            }),
            response: {
                [StatusCodes.CREATED]: Type.Object({
                    id: Type.String(),
                    name: Type.String(),
                    ownerId: Type.String(),
                    ownerEmail: Type.String(),
                    message: Type.String(),
                }),
            },
        },
    }, async (request, reply) => {
        const { name, ownerEmail, ownerPassword, ownerFirstName, ownerLastName } = request.body
        
        request.log.info({ name, ownerEmail }, '[SuperAdmin] Creating new tenant')
        
        try {
            // Check if email already exists
            const identityService = userIdentityService(request.log)
            const existingIdentity = await identityService.getIdentityByEmail(ownerEmail)
            if (existingIdentity) {
                throw new ActivepiecesError({
                    code: ErrorCode.VALIDATION,
                    params: {
                        message: `User with email ${ownerEmail} already exists`,
                    },
                })
            }
            
            // Create identity for the owner
            const identity = await identityService.create({
                email: ownerEmail,
                password: ownerPassword,
                firstName: ownerFirstName,
                lastName: ownerLastName,
                trackEvents: true,
                newsLetter: false,
                provider: UserIdentityProvider.EMAIL,
                verified: true,
            })
            
            // Create user with ADMIN role (owner of the platform)
            const owner = await userService.create({
                identityId: identity.id,
                platformId: null, // Will be set when platform is created
                platformRole: PlatformRole.ADMIN, // Platform owner is ADMIN, not SUPER_ADMIN
            })
            
            // Create the platform
            const platform = await platformService.create({
                ownerId: owner.id,
                name,
            })
            
            // Verify the user was associated (platformService.create() should have done this)
            let userAfterPlatformCreation = await userService.getOneOrFail({ id: owner.id })
            if (!userAfterPlatformCreation.platformId || userAfterPlatformCreation.platformId !== platform.id) {
                request.log.warn({
                    userId: owner.id,
                    expectedPlatformId: platform.id,
                    actualPlatformId: userAfterPlatformCreation.platformId,
                }, '[SuperAdmin] User not associated with platform after creation, fixing...')
                
                // Explicitly associate the owner with the platform
                await userService.addOwnerToPlatform({
                    id: owner.id,
                    platformId: platform.id,
                })
                
                // Reload user
                userAfterPlatformCreation = await userService.getOneOrFail({ id: owner.id })
            }
            
            // CRITICAL: Create a default project for the owner
            // The authentication service requires users to have at least one project
            // to resolve their platformId during login
            await projectService.create({
                displayName: `${ownerFirstName}'s Project`,
                ownerId: owner.id,
                platformId: platform.id,
                type: ProjectType.PERSONAL,
            })
            
            request.log.info({
                platformId: platform.id,
                ownerId: owner.id,
                ownerEmail,
                userPlatformId: userAfterPlatformCreation.platformId,
            }, '[SuperAdmin] Tenant created successfully with default project')
            
            return reply.status(StatusCodes.CREATED).send({
                id: platform.id,
                name: platform.name,
                ownerId: owner.id,
                ownerEmail,
                message: 'Tenant created successfully',
            })
        } catch (error) {
            request.log.error({ error, name, ownerEmail }, '[SuperAdmin] Failed to create tenant')
            throw error
        }
    })

    /**
     * Delete a tenant (platform) and all associated data
     * WARNING: This is a destructive operation
     */
    app.delete('/tenants/:platformId', {
        config: {
            security: securityAccess.publicPlatform([PrincipalType.USER]),
        },
        schema: {
            params: Type.Object({
                platformId: Type.String(),
            }),
            response: {
                [StatusCodes.OK]: Type.Object({
                    success: Type.Boolean(),
                    message: Type.String(),
                }),
            },
        },
    }, async (request, reply) => {
        const { platformId } = request.params
        request.log.info({ platformId }, '[SuperAdmin] Deleting tenant')

        try {
            // Get platform details before deletion
            const platform = await platformService.getOneOrThrow(platformId)
            
            // Delete all projects associated with this platform
            await databaseConnection().query(
                'DELETE FROM project WHERE "platformId" = $1',
                [platformId]
            )
            
            // Get all users associated with this platform (including owner)
            const users = await databaseConnection().query(
                'SELECT id, "identityId" FROM "user" WHERE "platformId" = $1',
                [platformId]
            )
            
            const ownerId = platform.ownerId
            
            // Delete users EXCEPT the owner (platform.ownerId references the owner)
            await databaseConnection().query(
                'DELETE FROM "user" WHERE "platformId" = $1 AND id != $2',
                [platformId, ownerId]
            )
            
            // Delete the platform FIRST (this removes the foreign key reference to owner)
            await databaseConnection().query(
                'DELETE FROM platform WHERE id = $1',
                [platformId]
            )
            
            // Now delete the owner user (platform reference is gone)
            await databaseConnection().query(
                'DELETE FROM "user" WHERE id = $1',
                [ownerId]
            )
            
            // Collect all identity IDs (including owner)
            const allIdentityIds = users.map((u: any) => u.identityId)
            
            // Delete user identities (so emails can be reused)
            if (allIdentityIds.length > 0) {
                await databaseConnection().query(
                    'DELETE FROM user_identity WHERE id = ANY($1)',
                    [allIdentityIds]
                )
            }

            request.log.info({
                platformId,
                platformName: platform.name,
                deletedUsers: users.length,
            }, '[SuperAdmin] Tenant deleted successfully')

            return reply.status(StatusCodes.OK).send({
                success: true,
                message: `Tenant "${platform.name}" and ${users.length} user(s) deleted successfully`,
            })
        } catch (error) {
            request.log.error({ error, platformId }, '[SuperAdmin] Failed to delete tenant')
            throw error
        }
    })
}
