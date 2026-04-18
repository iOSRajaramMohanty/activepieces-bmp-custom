import { redisConnections } from './redis'
import { distributedLockFactory } from './redis/distributed-lock-factory'
import { distributedStoreFactory } from './redis/distributed-store-factory'

export { redisConnections }

async function createRedisConnectionForDistributedLock() {
    const base = await redisConnections.useExisting()
    return base.duplicate()
}

export const distributedLock = distributedLockFactory(createRedisConnectionForDistributedLock)
export const distributedStore = distributedStoreFactory(redisConnections.useExisting)
