/**
 * Script to add organization names for users that don't have them
 * 
 * This script:
 * 1. Finds users with emails like "abc-dev@demo.com", "abc-staging@demo.com", "abc-production@demo.com"
 * 2. Extracts the organization name (e.g., "ABC" from "abc-dev")
 * 3. Creates an organization if it doesn't exist
 * 4. Updates the user's organizationId
 * 
 * Run this script using: npx ts-node packages/server/api/src/app/database/scripts/add-organization-names.ts
 */

import { databaseConnection } from '../database-connection'
import { organizationService } from '../../organization/organization.service'
import { repoFactory } from '../../core/db/repo-factory'
import { UserEntity } from '../../user/user-entity'
import type { UserSchema } from '../../user/user-entity'
import { userIdentityService } from '../../authentication/user-identity/user-identity-service'
import { system } from '../../helper/system/system'

async function addOrganizationNames() {
    console.log('🚀 Starting organization name assignment...')
    
    try {
        // Initialize database connection
        if (!databaseConnection().isInitialized) {
            await databaseConnection().initialize()
            console.log('✅ Database connection initialized')
        }

        // Get all users
        const userRepo = repoFactory(UserEntity)
        const users = await userRepo().find({
            relations: ['identity'],
        })

        console.log(`📊 Found ${users.length} users to process`)

        // Track organizations created
        const orgsCreated: string[] = []
        const usersUpdated: string[] = []

        for (const user of users) {
            // Skip if user already has an organizationId
            if (user.organizationId) {
                continue
            }

            // Get user identity to access email
            const identity = await userIdentityService(system.globalLogger()).getBasicInformation(user.identityId)
            if (!identity || !identity.email) {
                continue
            }

            const email = identity.email.toLowerCase()
            
            // Extract organization name from email patterns:
            // - abc-dev@demo.com -> ABC
            // - abc-staging@demo.com -> ABC
            // - abc-production@demo.com -> ABC
            // - test-admin@demo.com -> TEST
            const emailMatch = email.match(/^([a-z]+)[-_](dev|staging|production|admin|test)@/i)
            
            if (!emailMatch) {
                // Try to extract from user's first name if it follows the pattern
                const nameMatch = identity.firstName?.match(/^([A-Z]+)\s+(Dev|Staging|Production|Admin)/i)
                if (nameMatch) {
                    const orgName = nameMatch[1].toUpperCase()
                    await assignOrganization(user, orgName, user.platformId ?? null, orgsCreated, usersUpdated, userRepo)
                }
                continue
            }

            const orgName = emailMatch[1].toUpperCase()
            await assignOrganization(user, orgName, user.platformId ?? null, orgsCreated, usersUpdated, userRepo)
        }

        console.log('\n✅ Organization assignment complete!')
        console.log(`📝 Organizations created: ${orgsCreated.length}`)
        if (orgsCreated.length > 0) {
            console.log('   Created:', orgsCreated.join(', '))
        }
        console.log(`👥 Users updated: ${usersUpdated.length}`)
        if (usersUpdated.length > 0) {
            console.log('   Updated:', usersUpdated.slice(0, 10).join(', '))
            if (usersUpdated.length > 10) {
                console.log(`   ... and ${usersUpdated.length - 10} more`)
            }
        }

    } catch (error) {
        console.error('❌ Error:', error)
        throw error
    } finally {
        if (databaseConnection().isInitialized) {
            await databaseConnection().destroy()
            console.log('🔌 Database connection closed')
        }
    }
}

async function assignOrganization(
    user: UserSchema,
    orgName: string,
    platformId: string | null,
    orgsCreated: string[],
    usersUpdated: string[],
    userRepoInstance: any
) {
    if (!platformId) {
        console.log(`⚠️  Skipping user ${user.id}: no platformId`)
        return
    }

    try {
        // Get or create organization
        let organization = await organizationService.getByNameAndPlatform(orgName, platformId)
        
        if (!organization) {
            organization = await organizationService.create({
                name: orgName,
                platformId,
            })
            orgsCreated.push(orgName)
            console.log(`   ✨ Created organization: ${orgName}`)
        }

        // Update user with organizationId
        await userRepoInstance().update(user.id, {
            organizationId: organization.id,
        })
        usersUpdated.push(user.id)
        console.log(`   ✅ Updated user ${user.id} with organization: ${orgName}`)

    } catch (error) {
        console.error(`   ❌ Error assigning organization ${orgName} to user ${user.id}:`, error)
    }
}

// Run the script
if (require.main === module) {
    addOrganizationNames()
        .then(() => {
            console.log('\n🎉 Script completed successfully!')
            process.exit(0)
        })
        .catch((error) => {
            console.error('\n💥 Script failed:', error)
            process.exit(1)
        })
}

export { addOrganizationNames }
