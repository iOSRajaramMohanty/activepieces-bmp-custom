import { setupTestEnvironment, teardownTestEnvironment } from '../../../helpers/test-setup'
import {
  OAuth2GrantType,
  PrincipalType,
  PlatformRole,
} from '@activepieces/shared'
import { OAuth2AuthorizationMethod } from '@activepieces/pieces-framework'
import { FastifyInstance } from 'fastify'
import { StatusCodes } from 'http-status-codes'
import { MockInstance, vi } from 'vitest'

import { apAxios } from '../../../../src/app/helper/ap-axios'
import { generateMockToken } from '../../../helpers/auth'
import { mockAndSaveBasicSetup } from '../../../helpers/mocks'
import { db } from '../../../helpers/db'
import { cloudOAuthHooks } from '../../../../src/app/app-connection/cloud-oauth-hooks'
import type {
  ClaimOAuth2Request,
  RefreshOAuth2Request,
} from '../../../../src/app/app-connection/app-connection-service/oauth2/oauth2-service'
import { CloudOAuth2ConnectionValue } from '@activepieces/shared'

describe('Cloud OAuth Internal Endpoints (BMP)', () => {
  let app: FastifyInstance
  let axiosRequestSpy: MockInstance

  const pieceName = '@activepieces/piece-slack'
  const clientId = 'test-client-id'
  const clientSecret = 'test-client-secret'
  const tokenUrl = 'https://token.example.com/token'

  beforeAll(async () => {
    process.env.AP_BMP_ENABLED = 'true'
    app = await setupTestEnvironment({ fresh: true })
  })

  afterAll(async () => {
    await teardownTestEnvironment()
  })

  beforeEach(() => {
    axiosRequestSpy = vi.spyOn(apAxios, 'post')
  })

  afterEach(() => {
    axiosRequestSpy.mockRestore()
  })

  it('lists configured apps via GET /v1/cloud-oauth/apps', async () => {
    const { mockOwner: superAdminOwner, mockPlatform } = await mockAndSaveBasicSetup()
    await db.update('user', superAdminOwner.id, { platformRole: PlatformRole.SUPER_ADMIN })
    const updatedOwner = await db.findOneBy('user', { id: superAdminOwner.id })
    expect(updatedOwner?.platformRole).toBe(PlatformRole.SUPER_ADMIN)
    const superAdminToken = await generateMockToken({
      type: PrincipalType.USER,
      id: superAdminOwner.id,
      platform: { id: mockPlatform.id },
    })

    // Create app via admin endpoint
    const createResponse = await app.inject({
      method: 'POST',
      url: '/api/v1/cloud-oauth/admin/apps',
      headers: { authorization: `Bearer ${superAdminToken}` },
      body: {
        pieceName,
        clientId,
        clientSecret,
      },
    })

    expect(createResponse.statusCode).toBe(StatusCodes.OK)

    const { mockOwner: adminOwner, mockPlatform: adminPlatform } = await mockAndSaveBasicSetup()
    const adminToken = await generateMockToken({
      type: PrincipalType.USER,
      id: adminOwner.id,
      platform: { id: adminPlatform.id },
    })

    const listResponse = await app.inject({
      method: 'GET',
      url: '/api/v1/cloud-oauth/apps',
      headers: { authorization: `Bearer ${adminToken}` },
    })

    expect(listResponse.statusCode).toBe(StatusCodes.OK)
    const body = listResponse.json() as Record<string, { clientId: string }>
    expect(body[pieceName]?.clientId).toBe(clientId)
  })

  it('forbids admin CRUD for non-super-admin', async () => {
    const { mockOwner: adminOwner, mockPlatform } = await mockAndSaveBasicSetup()
    const adminToken = await generateMockToken({
      type: PrincipalType.USER,
      id: adminOwner.id,
      platform: { id: mockPlatform.id },
    })

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/cloud-oauth/admin/apps',
      headers: { authorization: `Bearer ${adminToken}` },
      body: {
        pieceName,
        clientId,
        clientSecret,
      },
    })

    expect(response.statusCode).toBe(StatusCodes.FORBIDDEN)
  })

  it('claims and refreshes tokens via cloudOAuthHooks (mocked token exchange)', async () => {
    const { mockOwner: superAdminOwner, mockPlatform } = await mockAndSaveBasicSetup()
    await db.update('user', superAdminOwner.id, { platformRole: PlatformRole.SUPER_ADMIN })
    const updatedOwner = await db.findOneBy('user', { id: superAdminOwner.id })
    expect(updatedOwner?.platformRole).toBe(PlatformRole.SUPER_ADMIN)

    // Use a unique pieceName to avoid clashing with previous test setup.
    const pieceNameForClaim = '@activepieces/piece-slack-claim-refresh'

    const superAdminToken = await generateMockToken({
      type: PrincipalType.USER,
      id: superAdminOwner.id,
      platform: { id: mockPlatform.id },
    })

    // Create app via admin endpoint
    const createResponse = await app.inject({
      method: 'POST',
      url: '/api/v1/cloud-oauth/admin/apps',
      headers: { authorization: `Bearer ${superAdminToken}` },
      body: {
        pieceName: pieceNameForClaim,
        clientId,
        clientSecret,
      },
    })

    expect(createResponse.statusCode).toBe(StatusCodes.OK)

    const claimTokenResponse = {
      access_token: 'access-1',
      refresh_token: 'refresh-1',
      expires_in: 1,
      scope: 'scope',
      token_type: 'bearer',
    }

    const refreshTokenResponse = {
      access_token: 'access-2',
      refresh_token: 'refresh-2',
      expires_in: 3600,
      scope: 'scope',
      token_type: 'bearer',
    }

    axiosRequestSpy.mockResolvedValueOnce({ data: claimTokenResponse }).mockResolvedValueOnce({ data: refreshTokenResponse })

    const claimRequest: ClaimOAuth2Request = {
      projectId: undefined,
      platformId: mockPlatform.id,
      pieceName: pieceNameForClaim,
      request: {
        code: 'mock-code',
        clientId,
        tokenUrl,
        authorizationMethod: OAuth2AuthorizationMethod.BODY,
        grantType: OAuth2GrantType.AUTHORIZATION_CODE,
      },
    }

    const hooks = cloudOAuthHooks.get(app.log)
    const claimed = await hooks.claim(claimRequest)

    expect(claimed.access_token).toBe('access-1')
    expect(claimed.refresh_token).toBe('refresh-1')

    const refreshRequest: RefreshOAuth2Request<CloudOAuth2ConnectionValue> = {
      pieceName: pieceNameForClaim,
      projectId: undefined,
      platformId: mockPlatform.id,
      connectionValue: claimed,
    }

    const refreshed = await hooks.refresh(refreshRequest)
    expect(refreshed.access_token).toBe('access-2')
    expect(refreshed.refresh_token).toBe('refresh-2')
  })
})

