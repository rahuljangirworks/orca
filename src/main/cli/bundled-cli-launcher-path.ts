import { join } from 'node:path'

// `veer` is product-owned and avoids the `/usr/bin/orca` screen-reader collision.
// Linux's packaged Electron binary uses a Veer-owned name as well; the old
// `orca-ide` resource remains a compatibility wrapper for existing installs.
export const LINUX_CLI_COMMAND_NAME = 'veer'
export const LINUX_BUNDLED_LAUNCHER_NAME = 'veer-ide'

/** Absolute path of the CLI launcher this app ships in its own resources bundle.
 *  Lives apart from cli-installer so callers that only need the path (PTY env
 *  assembly) don't pull in the installer's `electron` dependency. */
export function getBundledLauncherPath(
  platform: NodeJS.Platform,
  resourcesPath: string
): string | null {
  if (platform === 'darwin') {
    return join(resourcesPath, 'bin', 'orca')
  }
  if (platform === 'linux') {
    return join(resourcesPath, 'bin', LINUX_BUNDLED_LAUNCHER_NAME)
  }
  if (platform === 'win32') {
    return join(resourcesPath, 'bin', 'orca.exe')
  }
  return null
}
