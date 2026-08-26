/**
 * Veer Update Checker
 *
 * Checks for new versions using Veer Platform API
 */

import { app } from 'electron'
import { fetchPlatformConfig } from '../platform/fetch-config'

export type UpdateCheckResult = {
  updateAvailable: boolean
  currentVersion: string
  latestVersion?: string
  releaseNotes?: string
  downloadUrl?: string
  publishedAt?: string
  error?: string
}

/**
 * Check for available updates
 */
export async function checkForUpdates(): Promise<UpdateCheckResult> {
  try {
    console.log('[Veer Updates] Checking for updates...')

    // Get dynamic config
    const config = await fetchPlatformConfig()

    // Current version
    const currentVersion = app.getVersion()

    // Determine platform
    const platform =
      process.platform === 'darwin' ? 'darwin' : process.platform === 'win32' ? 'win32' : 'linux'

    // Build API URL
    const apiUrl = `${config.api.baseUrl}${config.api.endpoints.updates}`
    const url = `${apiUrl}?version=${currentVersion}&platform=${platform}`

    console.log('[Veer Updates] Checking:', url)

    // Check for updates
    const response = await fetch(url, {
      headers: {
        'User-Agent': `Veer/${currentVersion}`
      },
      signal: AbortSignal.timeout(15000) // 15 second timeout
    })

    if (!response.ok) {
      throw new Error(`Update check failed: ${response.status} ${response.statusText}`)
    }

    const result = await response.json()

    console.log('[Veer Updates] Result:', result)

    return {
      updateAvailable: result.updateAvailable || false,
      currentVersion: result.currentVersion || currentVersion,
      latestVersion: result.latestVersion,
      releaseNotes: result.releaseNotes,
      downloadUrl: result.downloadUrl,
      publishedAt: result.publishedAt
    }
  } catch (error) {
    console.error('[Veer Updates] Failed to check for updates:', error)

    return {
      updateAvailable: false,
      currentVersion: app.getVersion(),
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

/**
 * Start periodic update checker
 */
let updateCheckInterval: NodeJS.Timeout | null = null

export async function startPeriodicUpdateChecker(): Promise<void> {
  // Clear any existing interval
  if (updateCheckInterval) {
    clearInterval(updateCheckInterval)
  }

  // Get update frequency from config
  const config = await fetchPlatformConfig()

  if (!config.features.autoUpdate) {
    console.log('[Veer Updates] Auto-update disabled in config')
    return
  }

  const interval = config.updateFrequency.checkInterval

  console.log(`[Veer Updates] Starting periodic checker (every ${interval / 1000 / 60} minutes)`)

  // Check immediately on first run (after 10 seconds)
  setTimeout(async () => {
    const result = await checkForUpdates()
    if (result.updateAvailable) {
      console.log(`[Veer Updates] Update available: ${result.latestVersion}`)
      // TODO: Show notification to user
    }
  }, 10000)

  // Then check periodically
  updateCheckInterval = setInterval(async () => {
    const result = await checkForUpdates()
    if (result.updateAvailable) {
      console.log(`[Veer Updates] Update available: ${result.latestVersion}`)
      // TODO: Show notification to user
    }
  }, interval)
}

/**
 * Stop periodic update checker
 */
export function stopPeriodicUpdateChecker(): void {
  if (updateCheckInterval) {
    clearInterval(updateCheckInterval)
    updateCheckInterval = null
    console.log('[Veer Updates] Periodic checker stopped')
  }
}
