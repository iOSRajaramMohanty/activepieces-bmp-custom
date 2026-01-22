import { FastifyPluginAsyncTypebox } from '@fastify/type-provider-typebox'
import { organizationController } from './organization.controller'

export const organizationModule: FastifyPluginAsyncTypebox = async (app) => {
    await app.register(organizationController, { prefix: '/v1/organizations' })
}
