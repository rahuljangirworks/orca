import { describe, expect, it, vi } from 'vitest'
import {
  allowsPlaintextOrcaCloudSession,
  getOrcaCloudAuthConfig,
  isOrcaCloudDevAuthEnabled
} from './profile-cloud-auth-config'

vi.mock('electron', () => ({
  app: {
    isPackaged: false
  }
}))

describe('Orca cloud auth config', () => {
  it('reports unconfigured without both API URL and client ID', () => {
    expect(getOrcaCloudAuthConfig({})).toEqual({
      configured: false,
      setupMessage:
        'This personal Veer build does not connect to Orca-operated services. Configure a loopback cloud service to enable this feature.'
    })
  })

  it('builds default desktop auth endpoints from the API URL', () => {
    const state = getOrcaCloudAuthConfig({
      ORCA_CLOUD_API_URL: 'http://localhost:4100/',
      ORCA_CLOUD_CLIENT_ID: 'desktop-client'
    })

    expect(state).toEqual({
      configured: true,
      config: {
        apiBaseUrl: 'http://localhost:4100',
        authorizeEndpoint: 'http://localhost:4100/v1/desktop/auth/authorize',
        sessionEndpoint: 'http://localhost:4100/v1/desktop/auth/session',
        refreshEndpoint: 'http://localhost:4100/v1/desktop/auth/refresh',
        capabilitiesEndpoint: 'http://localhost:4100/v1/desktop/auth/capabilities',
        profileEndpoint: 'http://localhost:4100/v1/desktop/auth/profile',
        orgEndpoint: 'http://localhost:4100/v1/desktop/auth/org',
        logoutEndpoint: 'http://localhost:4100/v1/desktop/auth/logout',
        relayTokenEndpoint: 'http://localhost:4100/v1/desktop/auth/relay-token',
        relayDirectorUrl: 'http://localhost:4100',
        clientId: 'desktop-client',
        scope: 'openid profile email offline_access'
      }
    })
  })

  it('does not use first-party production endpoints in packaged builds', () => {
    expect(getOrcaCloudAuthConfig({}, true)).toMatchObject({ configured: false })
  })

  it('allows loopback HTTP endpoints for local desktop auth development', () => {
    const state = getOrcaCloudAuthConfig({
      ORCA_CLOUD_API_URL: 'http://localhost:4100',
      ORCA_CLOUD_CLIENT_ID: 'desktop-client'
    })

    expect(state.configured).toBe(true)
  })

  it('allows explicit loopback HTTP endpoints in packaged personal builds', () => {
    expect(
      getOrcaCloudAuthConfig(
        {
          ORCA_CLOUD_API_URL: 'http://localhost:4100',
          ORCA_CLOUD_CLIENT_ID: 'desktop-client'
        },
        true
      )
    ).toMatchObject({ configured: true })
  })

  it('rejects non-loopback, non-Veer-Platform API URLs even when they use HTTPS', () => {
    expect(
      getOrcaCloudAuthConfig({
        ORCA_CLOUD_API_URL: 'https://orca-cloud.example',
        ORCA_CLOUD_CLIENT_ID: 'desktop-client'
      })
    ).toMatchObject({ configured: false })
  })

  it('allows Veer Platform development API origin', () => {
    const state = getOrcaCloudAuthConfig({
      ORCA_CLOUD_API_URL: 'https://veer-api.rahuljangir-works.workers.dev',
      ORCA_CLOUD_CLIENT_ID: 'desktop-client'
    })

    expect(state).toEqual({
      configured: true,
      config: {
        apiBaseUrl: 'https://veer-api.rahuljangir-works.workers.dev',
        authorizeEndpoint:
          'https://veer-api.rahuljangir-works.workers.dev/v1/desktop/auth/authorize',
        sessionEndpoint: 'https://veer-api.rahuljangir-works.workers.dev/v1/desktop/auth/session',
        refreshEndpoint: 'https://veer-api.rahuljangir-works.workers.dev/v1/desktop/auth/refresh',
        capabilitiesEndpoint:
          'https://veer-api.rahuljangir-works.workers.dev/v1/desktop/auth/capabilities',
        profileEndpoint: 'https://veer-api.rahuljangir-works.workers.dev/v1/desktop/auth/profile',
        orgEndpoint: 'https://veer-api.rahuljangir-works.workers.dev/v1/desktop/auth/org',
        logoutEndpoint: 'https://veer-api.rahuljangir-works.workers.dev/v1/desktop/auth/logout',
        relayTokenEndpoint:
          'https://veer-api.rahuljangir-works.workers.dev/v1/desktop/auth/relay-token',
        relayDirectorUrl: 'https://veer-api.rahuljangir-works.workers.dev',
        clientId: 'desktop-client',
        scope: 'openid profile email offline_access'
      }
    })
  })

  it('allows Veer Platform production API origin', () => {
    const state = getOrcaCloudAuthConfig({
      ORCA_CLOUD_API_URL: 'https://veer.rahuljangir.work',
      ORCA_CLOUD_CLIENT_ID: 'desktop-client'
    })

    expect(state).toMatchObject({
      configured: true,
      config: {
        apiBaseUrl: 'https://veer.rahuljangir.work',
        authorizeEndpoint: 'https://veer.rahuljangir.work/v1/desktop/auth/authorize'
      }
    })
  })

  it('allows dev plaintext sessions only outside production', () => {
    expect(
      allowsPlaintextOrcaCloudSession({
        ORCA_CLOUD_ALLOW_PLAINTEXT_SESSION: '1',
        NODE_ENV: 'development'
      })
    ).toBe(true)
    expect(
      allowsPlaintextOrcaCloudSession({
        ORCA_CLOUD_ALLOW_PLAINTEXT_SESSION: '1',
        NODE_ENV: 'production'
      })
    ).toBe(false)
  })

  it('ignores dev flags in packaged builds even without NODE_ENV', () => {
    // Why: packaged main bundles never define NODE_ENV, so packaged-ness must
    // gate the escape hatches on its own.
    expect(allowsPlaintextOrcaCloudSession({ ORCA_CLOUD_ALLOW_PLAINTEXT_SESSION: '1' }, true)).toBe(
      false
    )
    expect(isOrcaCloudDevAuthEnabled({ ORCA_CLOUD_DEV_AUTH: '1' }, true)).toBe(false)
  })

  it('allows local dev auth only outside production', () => {
    expect(
      isOrcaCloudDevAuthEnabled({
        ORCA_CLOUD_DEV_AUTH: '1',
        NODE_ENV: 'development'
      })
    ).toBe(true)
    expect(
      isOrcaCloudDevAuthEnabled({
        ORCA_CLOUD_DEV_AUTH: '1',
        NODE_ENV: 'production'
      })
    ).toBe(false)
  })
})
