import { app } from 'electron'
import {
  isLoopbackServiceUrl,
  isVeerPlatformServiceUrl,
  PERSONAL_FORK_POLICY
} from '../../shared/personal-fork-policy'

function isPackaged(): boolean {
  try {
    return app?.isPackaged === true
  } catch {
    return false
  }
}

export function resolveArtifactCloudApiUrl(
  override?: string,
  env: NodeJS.ProcessEnv = process.env,
  _packaged = isPackaged()
): string {
  const candidate =
    override?.trim() ||
    env.ORCA_ARTIFACTS_API_URL?.trim() ||
    env.VEER_PLATFORM_API_URL?.trim() ||
    PERSONAL_FORK_POLICY.veerPlatformOrigins[0]
  const url = new URL(candidate)
  const loopback = ['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname)
  const veerPlatform = isVeerPlatformServiceUrl(url.toString())
  if (!isLoopbackServiceUrl(url.toString()) && !veerPlatform) {
    throw new Error(
      'Personal-fork artifact API URLs must use a loopback host or a configured Veer Platform origin.'
    )
  }
  if (url.protocol !== 'https:' && !(url.protocol === 'http:' && loopback)) {
    throw new Error('Artifact API URLs must use HTTPS or loopback HTTP.')
  }
  if (url.username || url.password || url.search || url.hash || url.pathname !== '/') {
    throw new Error('Artifact API URL must be an origin without credentials, paths, or parameters.')
  }
  return url.origin
}

export function allowsArtifactCloudAuthOverride(
  env: NodeJS.ProcessEnv = process.env,
  packaged = isPackaged()
): boolean {
  return env.NODE_ENV !== 'production' && !packaged
}
