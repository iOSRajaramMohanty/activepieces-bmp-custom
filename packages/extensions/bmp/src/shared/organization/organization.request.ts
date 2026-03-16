import { Static, Type } from '@sinclair/typebox'
import { EnvironmentType } from './organization'

export const CreateOrganizationRequest = Type.Object({
    name: Type.String({
        minLength: 1,
        maxLength: 50,
        pattern: '^[A-Z]+$',
        description: 'Organization name (uppercase letters only, e.g., ABC, XYZ)',
    }),
    platformId: Type.String(),
})

export type CreateOrganizationRequest = Static<typeof CreateOrganizationRequest>

export const ListOrganizationsRequest = Type.Object({
    platformId: Type.String(),
    cursor: Type.Optional(Type.String()),
    limit: Type.Optional(Type.Number({ minimum: 1, maximum: 100 })),
})

export type ListOrganizationsRequest = Static<typeof ListOrganizationsRequest>

export const CheckAdminAvailabilityRequest = Type.Object({
    organizationId: Type.String(),
    environment: Type.Enum(EnvironmentType),
})

export type CheckAdminAvailabilityRequest = Static<typeof CheckAdminAvailabilityRequest>

export const CheckAdminAvailabilityResponse = Type.Object({
    available: Type.Boolean(),
    adminUserId: Type.Optional(Type.String()),
    adminEmail: Type.Optional(Type.String()),
})

export type CheckAdminAvailabilityResponse = Static<typeof CheckAdminAvailabilityResponse>
