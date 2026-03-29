import { rolesSeed } from './role-seed'
import { superAdminSeed } from './super-admin-seed'

export const databaseSeeds = {
    async run() {
        const seeds = [
            rolesSeed,
            superAdminSeed,
        ]
        for (const seed of seeds) {
            await seed.run()
        }
    },
}
