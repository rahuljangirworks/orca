/**
 * OAuth Device Authorization Flow (RFC 8628)
 *
 * Implements device flow for desktop authorization via web portal.
 * This is more secure and reliable than loopback PKCE for SSH/headless scenarios.
 *
 * Flow:
 * 1. Request device code from platform
 * 2. Display user code and open browser to verification URL
 * 3. Poll for authorization with exponential backoff
 * 4. Return tokens when authorized
 *
 * Security features:
 * - Respects server polling intervals
 * - Exponential backoff on slow_down errors
 * - Timeout handling
 * - Cancellation support
 */

import { shell } from 'electron'
import type { OrcaCloudAuthConfig } from './profile-cloud-auth-config'
import type {
  OrcaCloudCapabilities,
  OrcaCloudOrgSummary,
  OrcaProfileCloudSummary
} from '../../shared/orca-profiles'

export type DeviceCodeResponse = {
  device_code: string
  user_code: string
  verification_uri: string
  verification_uri_complete: string
  expires_in: number
  interval: number
}

export type DeviceTokenResponse = {
  access_token: string
  refresh_token: string
  token_type: string
  expires_in: number
  expiresAt: number
  cloud: OrcaProfileCloudSummary
  organizations?: OrcaCloudOrgSummary[]
  capabilities: OrcaCloudCapabilities
}

type DeviceAuthorizationErrorResponse = {
  error: string
  error_description?: string
}

export type DeviceFlowProgress = {
  stage: 'requesting' | 'waiting' | 'polling' | 'authorized' | 'error'
  message: string
  userCode?: string
  verificationUri?: string
  pollCount?: number
  timeRemaining?: number
}

export type DeviceFlowProgressCallback = (progress: DeviceFlowProgress) => void

export class DeviceAuthorizationError extends Error {
  constructor(
    public readonly code: string,
    message: string
  ) {
    super(message)
    this.name = 'DeviceAuthorizationError'
  }
}

/**
 * Begin OAuth device authorization flow
 *
 * @param config - OAuth configuration
 * @param localProfileId - Local profile identifier
 * @param onProgress - Optional progress callback for UI updates
 * @param abortSignal - Optional abort signal for cancellation
 * @returns Authorization tokens and user profile
 */
export async function beginOrcaCloudDeviceFlow(
  config: OrcaCloudAuthConfig,
  _localProfileId: string,
  onProgress?: DeviceFlowProgressCallback,
  abortSignal?: AbortSignal
): Promise<DeviceTokenResponse> {
  // Check if already aborted
  if (abortSignal?.aborted) {
    throw new DeviceAuthorizationError('cancelled', 'Authorization cancelled by user')
  }

  // Step 1: Request device code
  onProgress?.({
    stage: 'requesting',
    message: 'Requesting authorization code...'
  })

  const deviceCodeResponse = await requestDeviceCode(config, abortSignal)

  // Step 2: Display user code and open browser
  onProgress?.({
    stage: 'waiting',
    message: `Go to ${deviceCodeResponse.verification_uri} and enter code: ${deviceCodeResponse.user_code}`,
    userCode: deviceCodeResponse.user_code,
    verificationUri: deviceCodeResponse.verification_uri
  })

  // Open browser to verification page (with code pre-filled)
  try {
    await shell.openExternal(deviceCodeResponse.verification_uri_complete)
  } catch (error) {
    console.error('Failed to open browser:', error)
    // Non-fatal: user can manually navigate
  }

  // Step 3: Poll for authorization
  onProgress?.({
    stage: 'polling',
    message: 'Waiting for authorization...',
    userCode: deviceCodeResponse.user_code,
    verificationUri: deviceCodeResponse.verification_uri
  })

  const tokens = await pollForAuthorization(config, deviceCodeResponse, onProgress, abortSignal)

  onProgress?.({
    stage: 'authorized',
    message: 'Authorization successful!'
  })

  return tokens
}

/**
 * Request device code from platform
 */
async function requestDeviceCode(
  config: OrcaCloudAuthConfig,
  abortSignal?: AbortSignal
): Promise<DeviceCodeResponse> {
  const endpoint = `${config.apiBaseUrl}/v1/desktop/auth/device/code`

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        clientId: config.clientId,
        scope: config.scope
      }),
      signal: abortSignal
    })

    if (!response.ok) {
      const error: DeviceAuthorizationErrorResponse = await response.json()
      throw new DeviceAuthorizationError(
        error.error,
        error.error_description || 'Failed to request device code'
      )
    }

    return await response.json()
  } catch (error) {
    if (error instanceof DeviceAuthorizationError) {
      throw error
    }
    if (abortSignal?.aborted) {
      throw new DeviceAuthorizationError('cancelled', 'Request cancelled')
    }
    throw new DeviceAuthorizationError(
      'network_error',
      `Failed to connect to ${endpoint}: ${error instanceof Error ? error.message : String(error)}`
    )
  }
}

/**
 * Poll for device authorization with intelligent backoff
 */
async function pollForAuthorization(
  config: OrcaCloudAuthConfig,
  deviceCode: DeviceCodeResponse,
  onProgress?: DeviceFlowProgressCallback,
  abortSignal?: AbortSignal
): Promise<DeviceTokenResponse> {
  const endpoint = `${config.apiBaseUrl}/v1/desktop/auth/device/token`
  const startTime = Date.now()
  const expiresAt = startTime + deviceCode.expires_in * 1000
  let interval = deviceCode.interval * 1000 // Convert to milliseconds
  let pollCount = 0

  // Polling loop
  while (Date.now() < expiresAt) {
    // Check for cancellation
    if (abortSignal?.aborted) {
      throw new DeviceAuthorizationError('cancelled', 'Authorization cancelled by user')
    }

    // Wait before polling (except first iteration)
    if (pollCount > 0) {
      await sleep(interval, abortSignal)
    }

    pollCount++

    // Update progress
    const timeRemaining = Math.ceil((expiresAt - Date.now()) / 1000)
    onProgress?.({
      stage: 'polling',
      message: `Waiting for authorization... (${timeRemaining}s remaining)`,
      userCode: deviceCode.user_code,
      verificationUri: deviceCode.verification_uri,
      pollCount,
      timeRemaining
    })

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          device_code: deviceCode.device_code,
          client_id: config.clientId
        }),
        signal: abortSignal
      })

      if (response.ok) {
        // Success! User authorized the device
        const tokens: DeviceTokenResponse = await response.json()
        return tokens
      }

      // Handle error responses
      const error: DeviceAuthorizationErrorResponse = await response.json()

      switch (error.error) {
        case 'authorization_pending':
          // User hasn't authorized yet, continue polling
          continue

        case 'slow_down':
          // Server requests slower polling - add 5 seconds to interval
          interval += 5000
          console.warn(`Polling too fast, increasing interval to ${interval / 1000}s`)
          continue

        case 'access_denied':
          throw new DeviceAuthorizationError('access_denied', 'User denied authorization request')

        case 'expired_token':
          throw new DeviceAuthorizationError(
            'expired_token',
            'Device code expired before authorization'
          )

        default:
          throw new DeviceAuthorizationError(
            error.error,
            error.error_description || 'Authorization failed'
          )
      }
    } catch (error) {
      if (error instanceof DeviceAuthorizationError) {
        throw error
      }
      if (abortSignal?.aborted) {
        throw new DeviceAuthorizationError('cancelled', 'Authorization cancelled')
      }

      // Network errors during polling are non-fatal - retry
      console.error('Polling error (will retry):', error)

      // Increase interval on network errors to avoid hammering server
      interval = Math.min(interval + 2000, 30000) // Cap at 30 seconds
      continue
    }
  }

  // Timeout reached
  throw new DeviceAuthorizationError('timeout', 'Authorization timeout - device code expired')
}

/**
 * Sleep with cancellation support
 */
function sleep(ms: number, abortSignal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (abortSignal?.aborted) {
      reject(new DeviceAuthorizationError('cancelled', 'Sleep cancelled'))
      return
    }

    const timeout = setTimeout(resolve, ms)

    const onAbort = (): void => {
      clearTimeout(timeout)
      reject(new DeviceAuthorizationError('cancelled', 'Sleep cancelled'))
    }

    abortSignal?.addEventListener('abort', onAbort, { once: true })

    // Clean up listener when timeout completes
    timeout.unref?.()
  })
}

/**
 * Validate device token response
 */
export function validateDeviceTokenResponse(response: unknown): response is DeviceTokenResponse {
  if (!response || typeof response !== 'object') {
    return false
  }

  const r = response as Record<string, unknown>

  return (
    typeof r.access_token === 'string' &&
    typeof r.refresh_token === 'string' &&
    typeof r.token_type === 'string' &&
    typeof r.expires_in === 'number' &&
    typeof r.expiresAt === 'number' &&
    typeof r.cloud === 'object' &&
    typeof r.capabilities === 'object'
  )
}
