import { describe, expect, it } from 'vitest'
import {
  allowsArtifactCloudAuthOverride,
  resolveArtifactCloudApiUrl
} from './artifact-cloud-config'

describe('resolveArtifactCloudApiUrl', () => {
  it('has no first-party production fallback', () => {
    expect(() => resolveArtifactCloudApiUrl(undefined, {}, true)).toThrow(/explicitly configured/)
  })

  it('allows loopback HTTP in development and packaged personal builds', () => {
    expect(
      resolveArtifactCloudApiUrl(
        undefined,
        { ORCA_ARTIFACTS_API_URL: 'http://127.0.0.1:45961' },
        false
      )
    ).toBe('http://127.0.0.1:45961')
    expect(resolveArtifactCloudApiUrl('http://127.0.0.1:45961', {}, true)).toBe(
      'http://127.0.0.1:45961'
    )
  })

  it('rejects origins that could receive an Orca access token', () => {
    expect(() => resolveArtifactCloudApiUrl('https://example.com', {}, false)).toThrow(/loopback/)
    expect(() => resolveArtifactCloudApiUrl('https://share.onorca.dev/path', {}, false)).toThrow(
      /loopback/
    )
  })

  it('allows auth token overrides only in non-production development builds', () => {
    expect(allowsArtifactCloudAuthOverride({}, false)).toBe(true)
    expect(allowsArtifactCloudAuthOverride({ NODE_ENV: 'production' }, false)).toBe(false)
    expect(allowsArtifactCloudAuthOverride({}, true)).toBe(false)
  })
})
