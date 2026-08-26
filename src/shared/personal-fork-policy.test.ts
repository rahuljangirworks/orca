import { describe, expect, it } from 'vitest'
import { PERSONAL_FORK_POLICY, isLoopbackServiceUrl } from './personal-fork-policy'

describe('personal fork policy', () => {
  it('keeps Orca-operated network services disabled', () => {
    expect(PERSONAL_FORK_POLICY.firstPartyNetworkEnabled).toBe(false)
    expect(PERSONAL_FORK_POLICY.updateStrategy).toBe('git-upstream-rebase')
  })

  it.each(['http://localhost:4100', 'http://127.0.0.1:4100', 'http://[::1]:4100'])(
    'allows an explicit local service at %s',
    (url) => {
      expect(isLoopbackServiceUrl(url)).toBe(true)
    }
  )

  it.each(['https://login.onorca.dev', 'https://share.onorca.dev', 'https://example.com'])(
    'rejects a remote service at %s',
    (url) => {
      expect(isLoopbackServiceUrl(url)).toBe(false)
    }
  )
})
