/**
 * Rahul's personal Veer fork is local-first. Orca/Stably-operated services
 * must never become an implicit runtime dependency of this build.
 * `firstPartyNetworkEnabled` applies only to Orca/Stably services; it does not
 * authorize Veer Platform requests.
 *
 * Keep this policy as a small, stable merge boundary. Upstream integrations
 * should be gated at their composition roots and network configuration
 * boundaries instead of scattering fork checks through feature code.
 */
export const PERSONAL_FORK_POLICY = Object.freeze({
  firstPartyNetworkEnabled: false,
  localServiceOverridesEnabled: true,
  updateStrategy: 'git-upstream-rebase',
  // The frontend root is owned by Pages. Desktop auth must use the canonical
  // API origin and must not fall back to workers.dev or the Pages origin.
  veerPlatformOrigins: ['https://api.veer.rahuljangir.work']
} as const)

export const PERSONAL_FORK_NETWORK_DISABLED_MESSAGE =
  'This personal Veer build does not connect to Orca-operated services.'

export function isLoopbackServiceUrl(value: string): boolean {
  try {
    const url = new URL(value)
    return ['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname)
  } catch {
    return false
  }
}

export function isVeerPlatformServiceUrl(value: string): boolean {
  try {
    const url = new URL(value)
    return PERSONAL_FORK_POLICY.veerPlatformOrigins.some((origin) => {
      const platformUrl = new URL(origin)
      return platformUrl.origin === url.origin
    })
  } catch {
    return false
  }
}
