import { Static, Type } from '@sinclair/typebox'
import { BaseModelSchema, Nullable } from '../common/base-model'
import { ApId } from '../common/id-generator'
import { UserBadge } from './badges'

export type UserId = ApId

export enum PlatformRole {
    /**
     * Super administrator with system-wide access across all platforms/tenants.
     * Can view and manage all tenants, create new tenants, and access all data.
     * Should only be assigned to system administrators.
     */
    SUPER_ADMIN = 'SUPER_ADMIN',
    /**
     * Platform owner (tenant owner) with full control over their platform.
     * Can invite admins, view all projects and flows, switch between admin accounts.
     * Cannot create personal projects or flows directly.
     */
    OWNER = 'OWNER',
    /**
     * Platform administrator with full control over platform settings,
     * users, and all projects within their platform
     */
    ADMIN = 'ADMIN',
    /**
     * Regular platform member with access only to projects they are
     * explicitly invited to
     */
    MEMBER = 'MEMBER',
    /**
     * Platform operator with automatic access to all projects except (others' private projects) in the
     * platform but no platform administration capabilities
     */
    OPERATOR = 'OPERATOR',
}

export enum UserStatus {
    /* user is active */
    ACTIVE = 'ACTIVE',
    /* user account deactivated */
    INACTIVE = 'INACTIVE',
}

export const EmailType = Type.String({
    format: 'email',
})

export const PasswordType = Type.String({
    minLength: 8,
    maxLength: 64,
})

export const User = Type.Object({
    ...BaseModelSchema,
    platformRole: Type.Enum(PlatformRole),
    status: Type.Enum(UserStatus),
    identityId: Type.String(),
    externalId: Nullable(Type.String()),
    platformId: Nullable(Type.String()),
    lastActiveDate: Nullable(Type.String()),
})

export type User = Static<typeof User>

export const UserWithMetaInformation = Type.Object({
    id: Type.String(),
    email: Type.String(),
    firstName: Type.String(),
    status: Type.Enum(UserStatus),
    externalId: Nullable(Type.String()),
    platformId: Nullable(Type.String()),
    platformRole: Type.Enum(PlatformRole),
    lastName: Type.String(),
    created: Type.String(),
    updated: Type.String(),
    lastActiveDate: Nullable(Type.String()),
    imageUrl: Nullable(Type.String()),
})

export type UserWithMetaInformation = Static<typeof UserWithMetaInformation>


export const UserWithBadges = Type.Object({
    ...UserWithMetaInformation.properties,
    badges: Type.Array(Type.Pick(UserBadge, ['name', 'created'])),
})

export type UserWithBadges = Static<typeof UserWithBadges>

export const AP_MAXIMUM_PROFILE_PICTURE_SIZE = 5 * 1024 * 1024 // 5 MB

export const PROFILE_PICTURE_ALLOWED_TYPES = [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
]

export const UpdateMeRequestBody = Type.Object({
    profilePicture: Type.Optional(Type.Any()),
})

export type UpdateMeRequestBody = Static<typeof UpdateMeRequestBody>

export const UpdateMeResponse = Type.Object({
    email: Type.String(),
    firstName: Type.String(),
    lastName: Type.String(),
    trackEvents: Type.Boolean(),
    newsLetter: Type.Boolean(),
    imageUrl: Nullable(Type.String()),
})

export type UpdateMeResponse = Static<typeof UpdateMeResponse>