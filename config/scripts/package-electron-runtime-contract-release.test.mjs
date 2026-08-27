import { describe, expect, it } from 'vitest'
import { parse } from 'yaml'
import {
  projectDir,
  readFileSync,
  join,
  relayArtifactFilenames
} from './package-electron-runtime-contract-helpers.mjs'

describe('Electron runtime package contract — release workflows', () => {
  it('guards release publishing before electron-builder runs', () => {
    const releaseWorkflow = readFileSync(
      join(projectDir, '.github/workflows/release-cut.yml'),
      'utf8'
    )
    const parsedWorkflow = parse(releaseWorkflow)
    const macWorkflow = parse(
      readFileSync(join(projectDir, '.github/workflows/release-mac-build.yml'), 'utf8')
    )
    const releaseCommands = new Map(
      parsedWorkflow.jobs.build.strategy.matrix.include.map(({ platform, release_command }) => [
        platform,
        release_command
      ])
    )
    const macReleaseCommand = macWorkflow.jobs['build-mac'].steps.find(
      (step) => step.name === 'Build release artifacts (macOS)'
    ).with.command

    expect([...releaseCommands.keys()].sort()).toEqual(['linux-arm64', 'linux-x64', 'win'])
    for (const command of [...releaseCommands.values(), macReleaseCommand]) {
      expect(command).toContain('node config/scripts/ensure-native-runtime.mjs --runtime=electron')
      expect(command).toContain('electron-builder')
      expect(command.indexOf('ensure-native-runtime')).toBeLessThan(
        command.indexOf('electron-builder')
      )
    }
    expect(macReleaseCommand).toContain(' && ORCA_MAC_RELEASE=1 ')
    expect(releaseCommands.get('linux-x64')).toContain(' && pnpm exec electron-builder ')
    expect(releaseCommands.get('linux-x64')).toContain('--linux AppImage deb rpm --x64')
    expect(releaseCommands.get('linux-arm64')).toContain('ORCA_LINUX_ARM64_RELEASE=1')
    expect(releaseCommands.get('linux-arm64')).toContain('--linux AppImage deb rpm --arm64')
    expect(releaseCommands.get('win')).toContain(
      '; if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }; pnpm exec electron-builder '
    )
  })

  it('blocks Linux and macOS release packaging on watcher process fault recovery', () => {
    const releaseWorkflow = parse(
      readFileSync(join(projectDir, '.github/workflows/release-cut.yml'), 'utf8')
    )
    const macWorkflow = parse(
      readFileSync(join(projectDir, '.github/workflows/release-mac-build.yml'), 'utf8')
    )
    const assertFaultGate = (steps, publishStepName, expectedCondition) => {
      const names = steps.map((step) => step.name)
      const gate = steps.find((step) => step.name === 'Gate runtime file-watcher process isolation')

      expect(gate.if).toBe(expectedCondition)
      expect(gate['continue-on-error']).toBeUndefined()
      expect(gate.run).toContain('node config/scripts/runtime-file-watcher-fault-harness.mjs')
      expect(gate.run).toContain('ELECTRON_RUN_AS_NODE=1 pnpm exec electron')
      expect(names.indexOf('Build app')).toBeLessThan(names.indexOf(gate.name))
      expect(names.indexOf(gate.name)).toBeLessThan(names.indexOf(publishStepName))
    }

    assertFaultGate(
      releaseWorkflow.jobs.build.steps,
      'Build Linux release artifacts',
      "runner.os == 'Linux'"
    )
    assertFaultGate(
      macWorkflow.jobs['build-mac'].steps,
      'Build release artifacts (macOS)',
      undefined
    )
  })

  it('packages and release-gates the SSH relay watcher child', () => {
    const relayBuild = readFileSync(join(projectDir, 'config/scripts/build-relay.mjs'), 'utf8')
    const builderConfig = readFileSync(
      join(projectDir, 'config/electron-builder.config.cjs'),
      'utf8'
    )
    const remoteCommands = readFileSync(
      join(projectDir, 'src/main/ssh/ssh-remote-commands.ts'),
      'utf8'
    )
    const releaseWorkflow = parse(
      readFileSync(join(projectDir, '.github/workflows/release-cut.yml'), 'utf8')
    )
    const macWorkflow = parse(
      readFileSync(join(projectDir, '.github/workflows/release-mac-build.yml'), 'utf8')
    )

    expect(relayBuild).toContain("'parcel-watcher-process-entry.ts'")
    expect(relayBuild).toContain("outfile: join(outDir, 'relay-watcher.js')")
    expect(relayBuild).toContain("outfile: join(outDir, 'relay-ai-vault-service.js')")
    expect(builderConfig).toContain("from: 'out/relay'")

    expect(relayArtifactFilenames(true)).toContain('relay-watcher.js')
    expect(relayArtifactFilenames(true)).toContain('relay-ai-vault-service.js')
    expect(relayBuild).toContain('relayArtifactFilenames(')
    expect(remoteCommands).toContain('relayArtifactFilenames(')

    const assertRelayGate = (steps, publishStepName) => {
      const names = steps.map((step) => step.name)
      const gate = steps.find((step) => step.name === 'Gate SSH relay watcher process isolation')
      expect(gate['continue-on-error']).toBeUndefined()
      expect(gate.run).toContain('node config/scripts/relay-watcher-fault-harness.mjs')
      expect(names.indexOf('Build app')).toBeLessThan(names.indexOf(gate.name))
      expect(names.indexOf(gate.name)).toBeLessThan(names.indexOf(publishStepName))
    }

    assertRelayGate(releaseWorkflow.jobs.build.steps, 'Build Linux release artifacts')
    assertRelayGate(macWorkflow.jobs['build-mac'].steps, 'Build release artifacts (macOS)')
    const releaseNames = releaseWorkflow.jobs.build.steps.map((step) => step.name)
    expect(releaseNames.indexOf('Gate SSH relay watcher process isolation')).toBeLessThan(
      releaseNames.indexOf('Build Windows release artifacts')
    )
  })

  it('pins the Windows release builder to the VS 2022 runner image', () => {
    const releaseWorkflow = parse(
      readFileSync(join(projectDir, '.github/workflows/release-cut.yml'), 'utf8')
    )
    const windowsReleaseEntry = releaseWorkflow.jobs.build.strategy.matrix.include.find(
      ({ platform }) => platform === 'win'
    )

    expect(windowsReleaseEntry.os).toBe('windows-2022')
  })

  it('keeps release-cut signing provenance on GitHub-hosted runners', () => {
    const releaseWorkflow = parse(
      readFileSync(join(projectDir, '.github/workflows/release-cut.yml'), 'utf8')
    )
    const buildMatrixRunners = releaseWorkflow.jobs.build.strategy.matrix.include.map(
      ({ os }) => os
    )
    const releaseWorkflowText = readFileSync(
      join(projectDir, '.github/workflows/release-cut.yml'),
      'utf8'
    )
    const macDispatchStep = releaseWorkflow.jobs['build-mac'].steps.find(
      (step) => step.name === 'Run isolated macOS release build'
    )

    expect(releaseWorkflowText).not.toContain('blacksmith-')
    expect(releaseWorkflow.jobs['build-mac']['runs-on']).toBe('ubuntu-latest')
    expect(releaseWorkflow.jobs['build-mac'].permissions.actions).toBe('write')
    expect(macDispatchStep.run).toBe('node config/scripts/run-release-mac-build-workflow.mjs')
    expect(macDispatchStep.env.RELEASE_MAC_BUILD_WORKFLOW).toBe('release-mac-build.yml')
    expect(macDispatchStep.env.RELEASE_MAC_BUILD_TAG).toBe('${{ needs.cut.outputs.tag }}')
    expect(buildMatrixRunners).not.toContain('blacksmith-6vcpu-macos-15')
    expect(releaseWorkflow.jobs['publish-release'].needs).toContain('build')
    expect(releaseWorkflow.jobs['publish-release'].needs).toContain('build-mac')
  })

  it('builds and uploads macOS release artifacts in an isolated GitHub-hosted workflow', () => {
    const releaseMacWorkflowText = readFileSync(
      join(projectDir, '.github/workflows/release-mac-build.yml'),
      'utf8'
    )
    const releaseMacWorkflow = parse(releaseMacWorkflowText)
    const buildMacJob = releaseMacWorkflow.jobs['build-mac']
    const checkoutStep = buildMacJob.steps.find((step) => step.name === 'Checkout')
    const buildStep = buildMacJob.steps.find(
      (step) => step.name === 'Build release artifacts (macOS)'
    )
    const uploadStep = buildMacJob.steps.find(
      (step) => step.name === 'Upload macOS release artifacts'
    )

    expect(releaseMacWorkflow['run-name']).toBe(
      'Mac release build ${{ inputs.tag }} (${{ inputs.release_run_id }})'
    )
    expect(releaseMacWorkflow.on.workflow_dispatch.inputs.tag.required).toBe(true)
    expect(releaseMacWorkflow.on.workflow_dispatch.inputs.release_run_id.required).toBe(true)
    expect(buildMacJob['runs-on']).toBe('macos-15')
    expect(checkoutStep.with.ref).toBe('refs/tags/${{ inputs.tag }}')
    expect(buildStep.with.command).toContain('ORCA_MAC_RELEASE=1')
    expect(buildStep.with.command).toContain('electron-builder')
    expect(buildStep.with.command).toContain('--mac --publish never')
    expect(uploadStep.with.command).toContain('gh release upload')
    expect(uploadStep.with.command).toContain('dist/*.zip')
    expect(uploadStep.with.command).toContain('dist/latest-mac.yml')
    expect(buildMacJob.steps.map((step) => step.name).indexOf(buildStep.name)).toBeLessThan(
      buildMacJob.steps.map((step) => step.name).indexOf(uploadStep.name)
    )
    expect(releaseMacWorkflowText).not.toContain('signpath/')
    expect(releaseMacWorkflowText).not.toContain('SIGNPATH_')
  })

  it('advances only the skill release ledger in a taggable release-cut commit', () => {
    const releaseWorkflow = readFileSync(
      join(projectDir, '.github/workflows/release-cut.yml'),
      'utf8'
    )
    const parsedWorkflow = parse(releaseWorkflow)
    const checkoutStep = parsedWorkflow.jobs.cut.steps.find((step) => step.name === 'Checkout ref')
    const bumpStep = parsedWorkflow.jobs.cut.steps.find(
      (step) => step.name === 'Bump package.json and tag'
    )

    const bumpIndex = bumpStep.run.indexOf(
      'npm version "$VERSION" --no-git-tag-version --allow-same-version'
    )
    const generateIndex = bumpStep.run.indexOf(
      'node config/scripts/generate-skill-bundle-manifest.mjs --release "$VERSION"'
    )
    const commands = bumpStep.run.replace(/^\s*#.*$/gm, '')
    const stagedPaths = [...commands.matchAll(/\bgit add (.+)$/gm)].flatMap((match) =>
      match[1].trim().split(/\s+/)
    )
    const mentioned = new Set(commands.match(/resources[/\\]skills[^\s'"]*/g))
    expect(checkoutStep.with['fetch-depth']).toBe(0)
    expect(bumpIndex).toBeGreaterThanOrEqual(0)
    expect(generateIndex).toBeGreaterThan(bumpIndex)
    expect(bumpStep.run.indexOf('git add package.json')).toBeGreaterThan(generateIndex)
    expect(stagedPaths).toEqual(['package.json', 'resources/skills/release-mapping.json'])
    expect([...mentioned]).toEqual(stagedPaths.slice(1))
    expect(commands).not.toMatch(/\bcommit\b[^\n]*(?:\s-[a-z]*a[a-z]*\b|\s--all\b)/)
    expect(bumpStep.run).toContain('git diff --cached --quiet')
    expect(bumpStep.run).toContain('git commit --allow-empty -m "$commit_message"')
  })

  it('keeps release-cut RC retries monotonic across stale attempts', () => {
    const releaseWorkflow = readFileSync(
      join(projectDir, '.github/workflows/release-cut.yml'),
      'utf8'
    )
    const parsedWorkflow = parse(releaseWorkflow)
    const versionStep = parsedWorkflow.jobs.cut.steps.find(
      (step) => step.name === 'Compute next version'
    )

    expect(versionStep.run).toContain('node config/scripts/release-rc-history.mjs "$1"')
    expect(versionStep.run).toContain('tag_matches_current_ref')
    expect(versionStep.run).toContain('cutting the next version instead of reusing stale artifacts')
    expect(versionStep.run).toContain('git rev-parse "$existing_rc_tag"')
  })

  it('bumps separate Homebrew casks for stable and RC desktop tags', () => {
    const releaseWorkflow = parse(
      readFileSync(join(projectDir, '.github/workflows/release-cut.yml'), 'utf8')
    )
    const homebrewWorkflow = parse(
      readFileSync(join(projectDir, '.github/workflows/homebrew-bump.yml'), 'utf8')
    )

    expect(releaseWorkflow.jobs['homebrew-bump'].if).toContain(
      "startsWith(needs.cut.outputs.tag, 'v')"
    )
    expect(releaseWorkflow.jobs['homebrew-bump'].if).toContain(
      "github.repository == 'stablyai/orca'"
    )
    expect(releaseWorkflow.jobs['homebrew-bump'].if).not.toContain('-rc.')
    expect(releaseWorkflow.jobs['homebrew-bump-published-rc-draft'].with.tag).toBe(
      '${{ needs.cut.outputs.latest_published_rc_tag }}'
    )

    const resolveCaskStep = homebrewWorkflow.jobs['bump-cask'].steps.find(
      (step) => step.name === 'Resolve cask target'
    )
    expect(homebrewWorkflow.jobs['bump-cask'].if).toContain("github.repository == 'stablyai/orca'")
    const renderStep = homebrewWorkflow.jobs['bump-cask'].steps.find(
      (step) => step.name === 'Render updated cask file'
    )
    const copyStep = homebrewWorkflow.jobs['bump-cask'].steps.find(
      (step) => step.name === 'Copy cask into tap and open PR'
    )

    expect(resolveCaskStep.run).toContain('token="orca@rc"')
    expect(resolveCaskStep.run).toContain('token="orca"')
    expect(renderStep.env.CASK_PATH).toBe('${{ steps.cask.outputs.path }}')
    expect(copyStep.run).toContain('cp "$CASK_PATH" "tap/$CASK_PATH"')
    expect(copyStep.run).toContain('git add "$CASK_PATH"')
  })
})
