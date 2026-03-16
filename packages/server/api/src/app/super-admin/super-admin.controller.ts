import { FastifyPluginAsyncTypebox } from '@fastify/type-provider-typebox'
import { Type } from '@sinclair/typebox'
import { StatusCodes } from 'http-status-codes'
import { ActivepiecesError, AuthenticationResponse, ErrorCode, FilteredPieceBehavior, PlatformRole, PrincipalType, apId, UserIdentityProvider, ProjectType } from '@activepieces/shared'
import { securityAccess } from '../core/security/authorization/fastify-security'
import { databaseConnection } from '../database/database-connection'
import { userService } from '../user/user-service'
import { platformRepo, platformService } from '../platform/platform.service'
import { userIdentityService } from '../authentication/user-identity/user-identity-service'
import { projectService } from '../project/project-service'
import { authenticationUtils } from '../authentication/authentication-utils'
import { accountSwitchingActivityService } from '../account-switching/account-switching-activity.service'
import { defaultTheme } from '../flags/theme'

/**
 * Super Admin Controller
 * Provides APIs for super admins to view and manage all tenants
 * POST /super-admins (create) - No auth required (internal bootstrap)
 * All other routes - Require logged-in super admin token
 */
export const superAdminController: FastifyPluginAsyncTypebox = async (app) => {
    
    // Middleware: skip auth for POST /super-admins (no token required). Other routes require super admin token.
    app.addHook('preHandler', async (request, reply) => {
        const path = (request.url || '').split('?')[0]
        const isCreateSuperAdmin = request.method === 'POST' && path.endsWith('/super-admins') && !path.includes('/promote/')
        if (isCreateSuperAdmin) {
            return // No auth required for creating super admin (internal use only)
        }
        if (!request.principal?.id) {
            throw new ActivepiecesError({
                code: ErrorCode.AUTHORIZATION,
                params: { message: 'Authentication required. Please sign in as a super admin.' },
            })
        }
        const user = await userService(request.log).getOneOrFail({ id: request.principal.id })
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
        
        // Get current super admin's platform ID to exclude it
        const currentUser = await userService(request.log).getOneOrFail({ id: request.principal.id })
        const currentPlatformId = currentUser.platformId
        
        const platforms = await databaseConnection().query(`
            SELECT 
                p.*,
                ui.email as owner_email,
                (SELECT COUNT(*) FROM "user" WHERE "platformId" = p.id) as "userCount",
                (SELECT COUNT(*) FROM project pr
                 WHERE pr."platformId" = p.id 
                 AND pr.deleted IS NULL
                 AND NOT (
                     pr.type = 'PERSONAL' AND pr."ownerId" IN (
                         SELECT id FROM "user" WHERE "platformId" = p.id AND "platformRole" IN ('SUPER_ADMIN', 'OWNER')
                     )
                 )
                ) as "projectCount"
            FROM platform p
            LEFT JOIN "user" owner ON p."ownerId" = owner.id
            LEFT JOIN user_identity ui ON owner."identityId" = ui.id
            WHERE p.id != $1
            ORDER BY p.created DESC
        `, [currentPlatformId])
        
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
        
        // Exclude projects owned by super admins (they don't have personal projects)
        const projects = await databaseConnection().query(`
            SELECT 
                p.*,
                platform.name as "platformName",
                org.name as "organizationName",
                owner."organizationId",
                ui.email as "ownerEmail",
                ui."firstName" || ' ' || ui."lastName" as "ownerName",
                (SELECT COUNT(*) FROM flow WHERE "projectId" = p.id) as "flowCount"
            FROM project p
            LEFT JOIN platform ON p."platformId" = platform.id
            LEFT JOIN "user" owner ON p."ownerId" = owner.id
            LEFT JOIN user_identity ui ON owner."identityId" = ui.id
            LEFT JOIN organization org ON owner."organizationId" = org.id
            WHERE p.deleted IS NULL
            AND owner."platformRole" != 'SUPER_ADMIN'
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
            WHERE p."platformId" = $1 
            AND p.deleted IS NULL
            AND NOT (
                p.type = 'PERSONAL' AND p."ownerId" IN (
                    SELECT id FROM "user" WHERE "platformId" = $1 AND "platformRole" IN ('SUPER_ADMIN', 'OWNER')
                )
            )
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
     * Get all tenant accounts (owners) with their platform information
     */
    app.get('/tenants', {
        config: {
            security: securityAccess.publicPlatform([PrincipalType.USER]),
        },
        schema: {
            response: {
                [StatusCodes.OK]: Type.Object({
                    total: Type.Number(),
                    tenants: Type.Array(Type.Any()),
                }),
            },
        },
    }, async (request) => {
        request.log.info('[SuperAdmin] Fetching all tenant accounts')
        
        const tenants = await databaseConnection().query(`
            SELECT 
                u.id as "userId",
                u."platformId",
                u."platformRole",
                u.status,
                u.created,
                u."lastActiveDate",
                ui.email,
                ui."firstName",
                ui."lastName",
                p.id as "platformId",
                p.name as "platformName",
                p.created as "platformCreated",
                (SELECT COUNT(*) FROM "user" WHERE "platformId" = p.id) as "userCount",
                (SELECT COUNT(*) FROM project pr
                 WHERE pr."platformId" = p.id 
                 AND pr.deleted IS NULL
                 AND NOT (
                     pr.type = 'PERSONAL' AND pr."ownerId" IN (
                         SELECT id FROM "user" WHERE "platformId" = p.id AND "platformRole" IN ('SUPER_ADMIN', 'OWNER')
                     )
                 )
                ) as "projectCount"
            FROM "user" u
            LEFT JOIN user_identity ui ON u."identityId" = ui.id
            LEFT JOIN platform p ON u."platformId" = p.id
            WHERE u."platformRole" = 'OWNER'
            ORDER BY u.created DESC
        `)
        
        return {
            total: tenants.length,
            tenants,
        }
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
        
        // Exclude current super admin from the list
        const currentUserId = request.principal.id
        
        const users = await databaseConnection().query(`
            SELECT 
                u.id,
                u."platformRole",
                u.status,
                u.created,
                u."lastActiveDate",
                u."platformId",
                u."organizationId",
                platform.name as "platformName",
                org.name as "organizationName",
                COALESCE(
                    oe.environment,
                    (
                        SELECT oe2.environment 
                        FROM project_member pm
                        JOIN project p ON pm."projectId" = p.id
                        JOIN organization_environment oe2 ON oe2."adminUserId" = p."ownerId"
                        WHERE pm."userId" = u.id
                        LIMIT 1
                    )
                ) as "environment",
                ui.email,
                ui."firstName",
                ui."lastName"
            FROM "user" u
            LEFT JOIN user_identity ui ON u."identityId" = ui.id
            LEFT JOIN platform ON u."platformId" = platform.id
            LEFT JOIN organization org ON u."organizationId" = org.id
            LEFT JOIN organization_environment oe ON oe."adminUserId" = u.id
            WHERE u.id != $1
            ORDER BY u.created DESC
            LIMIT 100
        `, [currentUserId])
        
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
                    totalOwners: Type.Number(),
                    totalAdmins: Type.Number(),
                    totalOperators: Type.Number(),
                    totalMembers: Type.Number(),
                }),
            },
        },
    }, async (request) => {
        request.log.info('[SuperAdmin] Fetching system stats')
        
        // Get current super admin's platform ID to exclude it from counts
        const currentUser = await userService(request.log).getOneOrFail({ id: request.principal.id })
        const currentPlatformId = currentUser.platformId
        
        const stats = await databaseConnection().query(`
            SELECT 
                (SELECT COUNT(*) FROM platform WHERE id != $1) as "totalPlatforms",
                (SELECT COUNT(*) FROM "user" WHERE id != $2) as "totalUsers",
                (SELECT COUNT(*) FROM project pr
                 WHERE pr.deleted IS NULL
                 AND NOT (
                     pr.type = 'PERSONAL' AND pr."ownerId" IN (
                         SELECT id FROM "user" WHERE "platformRole" IN ('SUPER_ADMIN', 'OWNER')
                     )
                 )
                 AND pr."ownerId" NOT IN (
                     SELECT id FROM "user" WHERE "platformRole" = 'SUPER_ADMIN'
                 )
                ) as "totalProjects",
                (SELECT COUNT(*) FROM flow) as "totalFlows",
                (SELECT COUNT(*) FROM "user" WHERE "platformRole" = 'SUPER_ADMIN' AND id != $2) as "totalSuperAdmins",
                (SELECT COUNT(*) FROM "user" WHERE "platformRole" = 'OWNER') as "totalOwners",
                (SELECT COUNT(*) FROM "user" WHERE "platformRole" = 'ADMIN') as "totalAdmins",
                (SELECT COUNT(*) FROM "user" WHERE "platformRole" = 'OPERATOR') as "totalOperators",
                (SELECT COUNT(*) FROM "user" WHERE "platformRole" = 'MEMBER') as "totalMembers"
        `, [currentPlatformId, request.principal.id])
        
        return stats[0]
    })

    /**
     * List all super admins
     */
    app.get('/super-admins', {
        config: {
            security: securityAccess.publicPlatform([PrincipalType.USER]),
        },
        schema: {
            response: {
                [StatusCodes.OK]: Type.Array(Type.Any()),
            },
        },
    }, async (request) => {
        request.log.info('[SuperAdmin] Fetching all super admins')

        const superAdmins = await databaseConnection().query(`
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
            WHERE u."platformRole" = 'SUPER_ADMIN'
            ORDER BY u.created DESC
        `)

        return superAdmins
    })

    /**
     * Create a new super admin (internal use - no auth required)
     * Creates identity, user with SUPER_ADMIN role, and a platform for the super admin
     */
    app.post('/super-admins', {
        config: {
            security: securityAccess.public(),
        },
        schema: {
            body: Type.Object({
                email: Type.String({ format: 'email' }),
                password: Type.String({ minLength: 8, maxLength: 64 }),
                firstName: Type.String({ minLength: 1 }),
                lastName: Type.String({ minLength: 1 }),
            }),
            response: {
                [StatusCodes.CREATED]: Type.Object({
                    id: Type.String(),
                    email: Type.String(),
                    platformRole: Type.String(),
                    message: Type.String(),
                }),
            },
        },
    }, async (request, reply) => {
        const { email, password, firstName, lastName } = request.body

        request.log.info({ email }, '[SuperAdmin] Creating new super admin')

        try {
            const identityService = userIdentityService(request.log)
            const existingIdentity = await identityService.getIdentityByEmail(email)
            if (existingIdentity) {
                throw new ActivepiecesError({
                    code: ErrorCode.VALIDATION,
                    params: {
                        message: `User with email ${email} already exists`,
                    },
                })
            }

            const identity = await identityService.create({
                email,
                password,
                firstName,
                lastName,
                trackEvents: false,
                newsLetter: false,
                provider: UserIdentityProvider.EMAIL,
                verified: true,
            })

            const user = await userService(request.log).create({
                identityId: identity.id,
                platformId: null,
                platformRole: PlatformRole.SUPER_ADMIN,
            })

            const platform = await platformRepo().save({
                id: apId(),
                ownerId: user.id,
                name: `${firstName}'s Platform`,
                primaryColor: defaultTheme.colors.primary.default,
                logoIconUrl: defaultTheme.logos.logoIconUrl,
                fullLogoUrl: defaultTheme.logos.fullLogoUrl,
                favIconUrl: defaultTheme.logos.favIconUrl,
                emailAuthEnabled: true,
                filteredPieceNames: [],
                enforceAllowedAuthDomains: false,
                allowedAuthDomains: [],
                filteredPieceBehavior: FilteredPieceBehavior.BLOCKED,
                federatedAuthProviders: {},
                cloudAuthEnabled: true,
                pinnedPieces: [],
            })

            await databaseConnection().query(
                'UPDATE "user" SET "platformId" = $1, "updated" = NOW() WHERE id = $2',
                [platform.id, user.id],
            )

            request.log.info({ userId: user.id, email }, '[SuperAdmin] Super admin created successfully')

            return reply.status(StatusCodes.CREATED).send({
                id: user.id,
                email,
                platformRole: PlatformRole.SUPER_ADMIN,
                message: 'Super admin created successfully',
            })
        } catch (error) {
            request.log.error({ error, email }, '[SuperAdmin] Failed to create super admin')
            throw error
        }
    })

    /**
     * Update a super admin (e.g. demote to ADMIN)
     */
    app.patch('/super-admins/:userId', {
        config: {
            security: securityAccess.publicPlatform([PrincipalType.USER]),
        },
        schema: {
            params: Type.Object({
                userId: Type.String(),
            }),
            body: Type.Object({
                platformRole: Type.Enum(PlatformRole, {
                    description: 'New role (e.g. ADMIN to demote)',
                }),
            }),
            response: {
                [StatusCodes.OK]: Type.Object({
                    success: Type.Boolean(),
                    message: Type.String(),
                    platformRole: Type.String(),
                }),
            },
        },
    }, async (request, reply) => {
        const { userId } = request.params
        const { platformRole } = request.body
        const currentSuperAdminId = request.principal.id

        if (userId === currentSuperAdminId) {
            throw new ActivepiecesError({
                code: ErrorCode.VALIDATION,
                params: {
                    message: 'You cannot update your own super admin role',
                },
            })
        }

        if (platformRole === PlatformRole.SUPER_ADMIN) {
            throw new ActivepiecesError({
                code: ErrorCode.VALIDATION,
                params: {
                    message: 'Use the promote flow to assign SUPER_ADMIN role',
                },
            })
        }

        request.log.info({ userId, platformRole }, '[SuperAdmin] Updating super admin role')

        try {
            const userToUpdate = await userService(request.log).getOneOrFail({ id: userId })

            if (userToUpdate.platformRole !== PlatformRole.SUPER_ADMIN) {
                throw new ActivepiecesError({
                    code: ErrorCode.VALIDATION,
                    params: {
                        message: 'User is not a super admin',
                    },
                })
            }

            await databaseConnection().query(
                'UPDATE "user" SET "platformRole" = $1, "updated" = NOW() WHERE id = $2',
                [platformRole, userId],
            )

            request.log.info({ userId, platformRole }, '[SuperAdmin] Super admin updated successfully')

            return reply.status(StatusCodes.OK).send({
                success: true,
                message: 'Super admin role updated successfully',
                platformRole,
            })
        } catch (error) {
            request.log.error({ error, userId }, '[SuperAdmin] Failed to update super admin')
            throw error
        }
    })

    /**
     * Promote an existing user to super admin
     */
    app.post('/super-admins/promote/:userId', {
        config: {
            security: securityAccess.publicPlatform([PrincipalType.USER]),
        },
        schema: {
            params: Type.Object({
                userId: Type.String(),
            }),
            response: {
                [StatusCodes.OK]: Type.Object({
                    success: Type.Boolean(),
                    message: Type.String(),
                    platformRole: Type.String(),
                }),
            },
        },
    }, async (request, reply) => {
        const { userId } = request.params

        request.log.info({ userId }, '[SuperAdmin] Promoting user to super admin')

        try {
            const userToPromote = await userService(request.log).getOneOrFail({ id: userId })

            if (userToPromote.platformRole === PlatformRole.SUPER_ADMIN) {
                throw new ActivepiecesError({
                    code: ErrorCode.VALIDATION,
                    params: {
                        message: 'User is already a super admin',
                    },
                })
            }

            await databaseConnection().query(
                'UPDATE "user" SET "platformRole" = $1, "updated" = NOW() WHERE id = $2',
                [PlatformRole.SUPER_ADMIN, userId],
            )

            request.log.info({ userId }, '[SuperAdmin] User promoted to super admin successfully')

            return reply.status(StatusCodes.OK).send({
                success: true,
                message: 'User promoted to super admin successfully',
                platformRole: PlatformRole.SUPER_ADMIN,
            })
        } catch (error) {
            request.log.error({ error, userId }, '[SuperAdmin] Failed to promote user to super admin')
            throw error
        }
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
            const owner = await userService(request.log).create({
                identityId: identity.id,
                platformId: null, // Will be set when platform is created
                platformRole: PlatformRole.OWNER, // Platform owner gets OWNER role
            })
            
            // Create the platform
            const platform = await platformService(request.log).create({
                ownerId: owner.id,
                name,
            })
            
            // Verify the user was associated (platformService.create() should have done this)
            let userAfterPlatformCreation = await userService(request.log).getOneOrFail({ id: owner.id })
            if (!userAfterPlatformCreation.platformId || userAfterPlatformCreation.platformId !== platform.id) {
                request.log.warn({
                    userId: owner.id,
                    expectedPlatformId: platform.id,
                    actualPlatformId: userAfterPlatformCreation.platformId,
                }, '[SuperAdmin] User not associated with platform after creation, fixing...')
                
                // Explicitly associate the owner with the platform
                await userService(request.log).addOwnerToPlatform({
                    id: owner.id,
                    platformId: platform.id,
                })
                
                // Reload user
                userAfterPlatformCreation = await userService(request.log).getOneOrFail({ id: owner.id })
            }
            
            // NOTE: Owners should NOT have personal projects
            // The authentication service now handles Super Admins and Owners without projects
            
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
            const platform = await platformService(request.log).getOneOrThrow(platformId)
            
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

    /**
     * Switch to tenant (owner) account
     * Super Admin can switch into any owner account to view their data
     * Note: Using schema: false to skip validation which has Zod v4 compatibility issues
     */
    app.route({
        method: 'POST',
        url: '/tenants/:platformId/switch',
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        schema: false as any,
        config: {
            security: securityAccess.publicPlatform([PrincipalType.USER]),
        },
        handler: async (request, reply) => {
            const { platformId } = request.params as { platformId: string }
        const superAdminId = request.principal.id
        
        request.log.info({ platformId, superAdminId }, '[SuperAdmin] Switching to tenant account')
        
        try {
            // Get tenant platform
            const platform = await platformService(request.log).getOneOrThrow(platformId)
            const owner = await userService(request.log).getOneOrFail({ id: platform.ownerId })
            
            // Verify owner belongs to this platform
            if (owner.platformId !== platformId) {
                throw new ActivepiecesError({
                    code: ErrorCode.ENTITY_NOT_FOUND,
                    params: {
                        message: 'Owner not found for this platform',
                    },
                })
            }
            
            const superAdminIdentity = await userIdentityService(request.log).getOneOrFail({ id: (await userService(request.log).getOneOrFail({ id: superAdminId })).identityId })
            const ownerIdentity = await userIdentityService(request.log).getOneOrFail({ id: owner.identityId })
            
            request.log.info({
                platformId,
                ownerId: owner.id,
                ownerEmail: ownerIdentity.email,
            }, '[SuperAdmin] Switching to owner account')
            
            // Log the account switching activity (wrapped in try-catch in case migration hasn't run)
            try {
                await accountSwitchingActivityService(request.log).logActivity({
                    originalUserId: superAdminId,
                    switchedToUserId: owner.id,
                    switchType: 'SUPER_ADMIN_TO_OWNER',
                    originalUserEmail: superAdminIdentity.email,
                    switchedToUserEmail: ownerIdentity.email,
                    originalPlatformId: null, // Super Admin has no platform
                    switchedToPlatformId: platform.id,
                })
                request.log.info({ superAdminId, ownerId: owner.id }, '[SuperAdmin] Successfully logged account switching activity')
            } catch (error: any) {
                // Log error but don't fail the switch if table doesn't exist yet
                const errorMessage = error?.message || String(error)
                if (errorMessage.includes('does not exist') || errorMessage.includes('relation')) {
                    request.log.warn({ error: errorMessage }, '[SuperAdmin] Account switching activity table does not exist yet. Migration needs to run. Switch will proceed without logging.')
                } else {
                    request.log.error({ error }, '[SuperAdmin] Failed to log account switching activity')
                }
            }
            
            // Return owner's authentication token
            // Owner has no personal projects, so projectId will be null
            const authResponse = await authenticationUtils(request.log).getProjectAndToken({
                userId: owner.id,
                platformId: platform.id,
                projectId: null,
            })
            
            return reply.status(StatusCodes.OK).send(authResponse)
        } catch (error) {
            request.log.error({ error, platformId }, '[SuperAdmin] Failed to switch to tenant account')
            throw error
        }
        },
    })

    /**
     * Get account switching activity logs
     * Note: Using schema: false to skip validation which has Zod v4 compatibility issues
     */
    app.route({
        method: 'GET',
        url: '/account-switching-activities',
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        schema: false as any,
        config: {
            security: securityAccess.publicPlatform([PrincipalType.USER]),
        },
        handler: async (request) => {
            request.log.info('[SuperAdmin] Fetching account switching activities')
            const query = request.query as { limit?: string }
            const limit = query.limit ? parseInt(query.limit, 10) : 100
            try {
                const activities = await accountSwitchingActivityService(request.log).getAllActivities(limit)
                return activities
            } catch (error: any) {
                // If table doesn't exist yet (migration not run), return empty array
                if (error?.message?.includes('does not exist') || error?.message?.includes('relation')) {
                    request.log.warn({ error }, '[SuperAdmin] Account switching activity table does not exist yet (migration may not have run)')
                    return []
                }
                throw error
            }
        },
    })

    /**
     * Clean up Super Admin account - remove personal project
     * This fixes existing Super Admin accounts that were created with projects
     */
    app.post('/cleanup-super-admin', {
        config: {
            security: securityAccess.publicPlatform([PrincipalType.USER]),
        },
        schema: {
            response: {
                [StatusCodes.OK]: Type.Object({
                    success: Type.Boolean(),
                    message: Type.String(),
                    deletedProjects: Type.Number(),
                }),
            },
        },
    }, async (request, reply) => {
        const superAdminId = request.principal.id
        const superAdmin = await userService(request.log).getOneOrFail({ id: superAdminId })
        
        if (superAdmin.platformRole !== PlatformRole.SUPER_ADMIN) {
            throw new ActivepiecesError({
                code: ErrorCode.AUTHORIZATION,
                params: {
                    message: 'Only super admins can use this endpoint',
                },
            })
        }
        
        request.log.info({ superAdminId }, '[SuperAdmin] Cleaning up Super Admin account')
        
        try {
            // Delete all projects owned by the Super Admin
            const deletedProjects = await databaseConnection().query(
                'DELETE FROM project WHERE "ownerId" = $1 RETURNING id',
                [superAdminId]
            )
            
            request.log.info({
                superAdminId,
                deletedProjectsCount: deletedProjects.length,
            }, '[SuperAdmin] Cleaned up Super Admin projects')
            
            return reply.status(StatusCodes.OK).send({
                success: true,
                message: `Cleaned up ${deletedProjects.length} project(s) for Super Admin`,
                deletedProjects: deletedProjects.length,
            })
        } catch (error) {
            request.log.error({ error, superAdminId }, '[SuperAdmin] Failed to clean up Super Admin account')
            throw error
        }
    })

    /**
     * Delete a super admin user
     * WARNING: This does NOT delete the owners (tenants) created by this super admin
     * Only the super admin user account is deleted
     */
    app.delete('/users/:userId', {
        config: {
            security: securityAccess.publicPlatform([PrincipalType.USER]),
        },
        schema: {
            params: Type.Object({
                userId: Type.String(),
            }),
            response: {
                [StatusCodes.OK]: Type.Object({
                    success: Type.Boolean(),
                    message: Type.String(),
                }),
            },
        },
    }, async (request, reply) => {
        const { userId } = request.params
        const currentSuperAdminId = request.principal.id
        
        // Prevent self-deletion
        if (userId === currentSuperAdminId) {
            throw new ActivepiecesError({
                code: ErrorCode.VALIDATION,
                params: {
                    message: 'You cannot delete your own account',
                },
            })
        }
        
        request.log.info({ userId, currentSuperAdminId }, '[SuperAdmin] Deleting super admin user')
        
        try {
            // Get the user to verify they are a super admin
            const userToDelete = await userService(request.log).getOneOrFail({ id: userId })
            
            if (userToDelete.platformRole !== PlatformRole.SUPER_ADMIN) {
                throw new ActivepiecesError({
                    code: ErrorCode.VALIDATION,
                    params: {
                        message: 'Only super admin users can be deleted through this endpoint',
                    },
                })
            }
            
            // Delete all projects owned by this super admin (if any)
            await databaseConnection().query(
                'DELETE FROM project WHERE "ownerId" = $1',
                [userId]
            )
            
            // Super admin may own a platform (created via POST /super-admins). Delete it first.
            const ownedPlatforms = await databaseConnection().query(
                'SELECT id, name FROM platform WHERE "ownerId" = $1',
                [userId]
            )
            for (const platform of ownedPlatforms) {
                const platformId = platform.id
                await databaseConnection().query('DELETE FROM project WHERE "platformId" = $1', [platformId])
                await databaseConnection().query('DELETE FROM "user" WHERE "platformId" = $1 AND id != $2', [platformId, userId])
                await databaseConnection().query('DELETE FROM platform WHERE id = $1', [platformId])
            }
            
            // Now delete the super admin user
            await databaseConnection().query(
                'DELETE FROM "user" WHERE id = $1',
                [userId]
            )
            
            // Delete user identity
            if (userToDelete.identityId) {
                await databaseConnection().query(
                    'DELETE FROM user_identity WHERE id = $1',
                    [userToDelete.identityId]
                )
            }
            
            request.log.info({
                userId,
            }, '[SuperAdmin] Super admin user deleted successfully (owners/tenants preserved)')
            
            return reply.status(StatusCodes.OK).send({
                success: true,
                message: 'Super admin user deleted successfully. Owners (tenants) created by this super admin were preserved.',
            })
        } catch (error) {
            request.log.error({ error, userId }, '[SuperAdmin] Failed to delete super admin user')
            throw error
        }
    })
}
