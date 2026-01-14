import { FastifyPluginAsyncTypebox } from '@fastify/type-provider-typebox'
import { superAdminController } from './super-admin.controller'

export const superAdminModule: FastifyPluginAsyncTypebox = async (app) => {
    await app.register(superAdminController, { prefix: '/v1/super-admin' })
}
