// Compatibility module for upstream imports. New code belongs in the Veer
// named module; retain this path until the upstream delta can be retired.
export { getVeerCliCommandNameForPlatform } from './veer-cli-command-name'
import { getVeerCliCommandNameForPlatform } from './veer-cli-command-name'

/** @deprecated Use getVeerCliCommandNameForPlatform. */
export const getOrcaCliCommandNameForPlatform = getVeerCliCommandNameForPlatform
