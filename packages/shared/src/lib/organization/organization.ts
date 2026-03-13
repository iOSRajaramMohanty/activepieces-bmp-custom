import { Static, Type } from '@sinclair/typebox'

const BaseModelSchemaTypebox = {
    id: Type.String(),
    created: Type.String(),
    updated: Type.String(),
}

export const Organization = Type.Object({
    ...BaseModelSchemaTypebox,
    name: Type.String(),
    platformId: Type.String(),
    projectId: Type.Optional(Type.String()),
    metadata: Type.Optional(Type.Unknown()),
})

export type Organization = Static<typeof Organization>

export enum EnvironmentType {
    DEVELOPMENT = 'Dev',
    STAGING = 'Staging',
    PRODUCTION = 'Production',
}

export const OrganizationEnvironment = Type.Object({
    ...BaseModelSchemaTypebox,
    organizationId: Type.String(),
    environment: Type.Enum(EnvironmentType),
    adminUserId: Type.Optional(Type.String()),
    adminEmail: Type.Optional(Type.String()),
    projectId: Type.Optional(Type.String()),
    platformId: Type.String(),
    metadata: Type.Optional(Type.Unknown()),
})

export type OrganizationEnvironment = Static<typeof OrganizationEnvironment>
