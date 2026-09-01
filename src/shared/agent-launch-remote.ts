/**
 * Why: a repo reached over SSH runs the upstream-compatible CLI through the
 * relay shim, which is still deployed as plain `orca` (Unix) / `orca.cmd`
 * (Windows). The local `veer-ide` name must not leak to those remotes.
 * `connectionId` is the SSH signal; WSL and local stay false.
 */
export function repoIsRemote(repo: { connectionId?: string | null }): boolean {
  return Boolean(repo.connectionId)
}
