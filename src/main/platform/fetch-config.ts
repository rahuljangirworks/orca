/**
 * Veer Platform Configuration Fetcher
 *
 * Fetches dynamic configuration from Veer Platform API.
 * This allows changing backend URLs without rebuilding Veer!
 */

const PLATFORM_API = 'https://veer-api.rahuljangir-works.workers.dev'

export type PlatformConfig = {
  version: string
  api: {
    baseUrl: string
    endpoints: {
      updates: string
      skills: string
      plugins: string
      analytics?: string
    }
  }
  releases: {
    baseUrl: string
    linux: string
    macos: string
    windows: string
  }
  storage: {
    type: 'github-releases' | 'r2' | 'direct-download'
    fallback?: string
  }
  features: {
    autoUpdate: boolean
    analytics: boolean
    skillMarketplace: boolean
    pluginMarketplace: boolean
    telemetry: boolean
  }
  updateFrequency: {
    checkInterval: number
    retryInterval: number
  }
}

let cachedConfig: PlatformConfig | null = null
let configFetchTime = 0
const CONFIG_CACHE_DURATION = 5 * 60 * 1000 // 5 minutes

/**
 * Fetch platform configuration from backend
 * Cached for 5 minutes to reduce API calls
 */
export async function fetchPlatformConfig(): Promise<PlatformConfig> {
  // Return cached config if still valid
  const now = Date.now()
  if (cachedConfig && now - configFetchTime < CONFIG_CACHE_DURATION) {
    return cachedConfig
  }

  try {
    const response = await fetch(`${PLATFORM_API}/config.json`, {
      headers: {
        'User-Agent': 'Veer/1.0'
      },
      signal: AbortSignal.timeout(10000) // 10 second timeout
    })

    if (!response.ok) {
      throw new Error(`Config fetch failed: ${response.status} ${response.statusText}`)
    }

    const config = (await response.json()) as PlatformConfig

    // Validate config structure
    if (!config.api?.baseUrl || !config.releases?.baseUrl) {
      throw new Error('Invalid config structure')
    }

    cachedConfig = config
    configFetchTime = now

    console.log('[Veer Platform] Config fetched successfully:', config.version)
    return config
  } catch (error) {
    console.error('[Veer Platform] Failed to fetch config:', error)

    // Return fallback config
    const fallbackConfig: PlatformConfig = {
      version: '1.0.0',
      api: {
        baseUrl: PLATFORM_API,
        endpoints: {
          updates: '/api/updates/check',
          skills: '/api/skills/list',
          plugins: '/api/plugins/list',
          analytics: '/api/analytics/track'
        }
      },
      releases: {
        baseUrl: 'https://github.com/rahuljangirworks/orca/releases/download',
        linux: 'Veer-{version}.AppImage',
        macos: 'Veer-{version}.dmg',
        windows: 'Veer-Setup-{version}.exe'
      },
      storage: {
        type: 'github-releases',
        fallback: 'direct-download'
      },
      features: {
        autoUpdate: true,
        analytics: false,
        skillMarketplace: true,
        pluginMarketplace: true,
        telemetry: false
      },
      updateFrequency: {
        checkInterval: 14400000, // 4 hours
        retryInterval: 3600000 // 1 hour
      }
    }

    // Cache fallback config too
    cachedConfig = fallbackConfig
    configFetchTime = now

    return fallbackConfig
  }
}

/**
 * Clear cached config (useful for testing)
 */
export function clearConfigCache(): void {
  cachedConfig = null
  configFetchTime = 0
}

/**
 * Get cached config without fetching
 */
export function getCachedConfig(): PlatformConfig | null {
  return cachedConfig
}
