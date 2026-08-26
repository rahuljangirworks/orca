import { beforeEach, describe, expect, it, vi } from 'vitest'

const fetchMock = vi.hoisted(() => vi.fn())

vi.mock('electron', () => ({
  app: { getVersion: () => 'personal-test' },
  ipcMain: { handle: vi.fn(), removeHandler: vi.fn() },
  net: { fetch: fetchMock }
}))

import { submitFeedback } from './feedback'

describe('personal fork feedback boundary', () => {
  beforeEach(() => fetchMock.mockReset())

  it('refuses feedback without making an Orca network request', async () => {
    await expect(
      submitFeedback({
        feedback: 'must remain local',
        githubLogin: null,
        githubEmail: null
      })
    ).resolves.toMatchObject({ ok: false, error: expect.stringContaining('does not connect') })
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
