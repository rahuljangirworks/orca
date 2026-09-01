/** Return the canonical Veer command for a local platform. */
export function getVeerCliCommandNameForPlatform(platform: NodeJS.Platform): string {
  if (platform === 'linux') {
    return 'veer-ide'
  }
  if (platform === 'win32') {
    // Windows still uses the signed native compatibility shim until the
    // native launcher is renamed in a separate migration.
    return 'orca.cmd'
  }
  // macOS keeps the signed Orca helper path for the same reason.
  return 'orca'
}
