import { describe, expect, it } from 'vitest'
import { parse } from 'yaml'
import { projectDir, readFileSync, join } from './package-electron-runtime-contract-helpers.mjs'

describe('Electron runtime package contract — build & CI', () => {
  it('packages and verifies the Windows SSH node-pty console-list fallback', () => {
    const relayBuild = readFileSync(join(projectDir, 'config/scripts/build-relay.mjs'), 'utf8')
    const relayDeploy = readFileSync(join(projectDir, 'src/main/ssh/ssh-relay-deploy.ts'), 'utf8')
    const patchAsset = readFileSync(
      join(projectDir, 'config/relay-assets/node-pty-1.1.0-console-list-agent-patch.cjs'),
      'utf8'
    )

    expect(relayBuild).toContain('copyFileSync(')
    expect(relayBuild).toContain('hash.update(readFileSync')
    expect(relayBuild).toContain('node-pty-1.1.0-console-list-agent-patch.cjs')
    expect(relayDeploy).toContain('assertPatchedNodePtyConsoleListAgent')
    expect(relayDeploy.match(/\$\{windowsNodePtyPatchCommand\(nodePath\)\}/g)).toHaveLength(2)
    expect(patchAsset).toContain('consoleProcessList = [shellPid];')
    expect(patchAsset).toContain('packageJson.version !== EXPECTED_NODE_PTY_VERSION')
  })

  it('keeps Linux postinstall repairing Chromium sandbox permissions', () => {
    const afterInstallScript = readFileSync(
      join(projectDir, 'resources/linux/packaging/after-install.sh'),
      'utf8'
    )

    expect(afterInstallScript).toContain('chrome-sandbox')
    expect(afterInstallScript).toContain('chmod 4755 "$sandbox"')
    expect(afterInstallScript).not.toContain('chmod 0755 "$sandbox"')
  })

  it('installs the Electron package binary in PR checks without changing native module ABI', () => {
    const prWorkflow = readFileSync(join(projectDir, '.github/workflows/pr.yml'), 'utf8')
    const parsedWorkflow = parse(prWorkflow)
    const installStep = parsedWorkflow.jobs.test.steps.find(
      (step) => step.name === 'Install Electron package binary for tests'
    )

    expect(installStep.run).toBe('node config/scripts/install-electron-package-binary.mjs')
  })

  it('smokes the packaged CLI from outside the checkout in PR checks', () => {
    const prWorkflow = readFileSync(join(projectDir, '.github/workflows/pr.yml'), 'utf8')
    const parsedWorkflow = parse(prWorkflow)
    const smokeStep = parsedWorkflow.jobs.package.steps.find(
      (step) => step.name === 'Smoke packaged CLI'
    )

    expect(smokeStep.run).toBe(
      'node config/scripts/smoke-packaged-cli.mjs --app-dir=dist/linux-unpacked'
    )
  })
})
