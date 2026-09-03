import { test, expect } from './helpers/orca-app'
import { waitForSessionReady, waitForActiveWorktree } from './helpers/store'
import { clickFileInExplorer } from './helpers/file-explorer'

test.describe('ArtifactPublishButton — share popover and tooltip', () => {
  const consoleErrors: string[] = []

  test.beforeEach(async ({ orcaPage }) => {
    consoleErrors.length = 0
    orcaPage.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text())
      }
    })
    await waitForSessionReady(orcaPage)
    await waitForActiveWorktree(orcaPage)
    await clickFileInExplorer(orcaPage, ['README.md'])
    // Wait for the editor to surface the Share button once markdown content loads
    await expect(orcaPage.getByRole('button', { name: 'Share as artifact' })).toBeVisible({
      timeout: 15_000
    })
  })

  test('clicking Share button opens the popover without React errors', async ({ orcaPage }) => {
    const shareBtn = orcaPage.getByRole('button', { name: 'Share as artifact' })
    await shareBtn.click()

    // Popover heading appears (button uses aria-label only, so the <h3> is the only text match)
    await expect(orcaPage.getByRole('heading', { name: 'Share as artifact' })).toBeVisible({
      timeout: 5_000
    })

    // No React errors in the console
    expect(consoleErrors.filter((e) => e.includes('react') || e.includes('React'))).toHaveLength(0)
  })

  test('hovering Share button when popover is closed shows tooltip', async ({ orcaPage }) => {
    const shareBtn = orcaPage.getByRole('button', { name: 'Share as artifact' })
    await shareBtn.hover()

    // Tooltip should appear
    await expect(orcaPage.getByRole('tooltip', { name: 'Share as artifact' })).toBeVisible({
      timeout: 5_000
    })
    expect(consoleErrors.filter((e) => e.includes('react') || e.includes('React'))).toHaveLength(0)
  })

  test('hovering Share button when popover is open does not show tooltip (no DismissableLayer conflict)', async ({
    orcaPage
  }) => {
    const shareBtn = orcaPage.getByRole('button', { name: 'Share as artifact' })

    // Open the popover first
    await shareBtn.click()
    await expect(orcaPage.getByRole('heading', { name: 'Share as artifact' })).toBeVisible({
      timeout: 5_000
    })

    // Hover the button while popover is open — tooltip must NOT appear
    await shareBtn.hover()

    // Give time for a tooltip to appear if it were going to
    await orcaPage.waitForTimeout(600)

    await expect(orcaPage.getByRole('tooltip', { name: 'Share as artifact' })).not.toBeVisible()
    expect(consoleErrors.filter((e) => e.includes('react') || e.includes('React'))).toHaveLength(0)
  })

  test('with artifactSharingEnabled=false, popover shows "Artifact sharing is off" without spinner', async ({
    orcaPage
  }) => {
    // Disable artifact sharing via the settings API (store setup only)
    await orcaPage.evaluate(async () => {
      const settings = await window.api.settings.set({ artifactSharingEnabled: false })
      window.__store?.setState({ settings })
    })

    const shareBtn = orcaPage.getByRole('button', { name: 'Share as artifact' })
    await shareBtn.click()

    // 'Artifact sharing is off' message must be visible
    await expect(orcaPage.getByText('Artifact sharing is off')).toBeVisible({ timeout: 5_000 })

    // No spinner (Loader2 animate-spin) should be present
    await expect(orcaPage.locator('.animate-spin')).not.toBeVisible()

    expect(consoleErrors.filter((e) => e.includes('react') || e.includes('React'))).toHaveLength(0)
  })
})
