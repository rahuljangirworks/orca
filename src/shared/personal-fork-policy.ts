/**
 * Rahul's personal Orca fork is local-first. Orca/Stably-operated services
 * must never become an implicit runtime dependency of this build.
 *
 * Keep this policy as a small, stable merge boundary. Upstream integrations
 * should be gated at their composition roots and network configuration
 * boundaries instead of scattering fork checks through feature code.
 */
export const PERSONAL_FORK_POLICY = Object.freeze({
  firstPartyNetworkEnabled: false,
  localServiceOverridesEnabled: true,
  updateStrategy: 'git-upstream-rebase'
} as const)

export const PERSONAL_FORK_NETWORK_DISABLED_MESSAGE =
  'This personal Orca build does not connect to Orca-operated services.'

export function isLoopbackServiceUrl(value: string): boolean {
  try {
    const url = new URL(value)
    return ['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname)
  } catch {
    return false
  }
}
