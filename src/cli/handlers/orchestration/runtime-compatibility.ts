import { RuntimeClientError } from '../../runtime-client'

export function resolveCompatibilityCliCommand():
  | 'veer'
  | 'veer-dev'
  | 'orca'
  | 'orca-ide'
  | 'orca-dev' {
  const configured = process.env.VEER_CLI_COMMAND ?? process.env.ORCA_CLI_COMMAND
  if (
    configured === 'veer' ||
    configured === 'veer-dev' ||
    configured === 'orca' ||
    configured === 'orca-ide' ||
    configured === 'orca-dev'
  ) {
    return configured
  }
  return 'veer'
}

export function resolvePackagedWindowsCompatibilityCommand():
  | 'veer'
  | 'orca'
  | 'orca-ide'
  | undefined {
  if (process.env.ORCA_WINDOWS_PACKAGED_CLI_LAUNCHER !== '1') {
    return undefined
  }
  const command = process.env.VEER_CLI_COMMAND ?? process.env.ORCA_CLI_COMMAND
  if (command === 'veer' || command === 'orca' || command === 'orca-ide') {
    return command
  }
  throw new RuntimeClientError(
    'invalid_argument',
    'The packaged Veer launcher did not provide a valid resume command. No question was created.'
  )
}

export async function flushOrchestrationStdout(): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    process.stdout.write('', (error) => {
      if (error) {
        reject(error)
      } else {
        resolve()
      }
    })
  })
}

export function isDevCliInvocation(): boolean {
  return (
    process.env.ORCA_DEV_CLI_INVOCATION === '1' ||
    (process.env.ORCA_USER_DATA_PATH?.includes('orca-dev') ?? false)
  )
}
