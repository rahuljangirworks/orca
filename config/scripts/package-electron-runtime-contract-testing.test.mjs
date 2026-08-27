import { describe, expect, it } from 'vitest'
import { parse } from 'yaml'
import {
  projectDir,
  packageJson,
  readFileSync,
  join
} from './package-electron-runtime-contract-helpers.mjs'

describe('Electron runtime package contract — testing', () => {
  it('keeps terminal scale perf wired to the report budget gate', () => {
    const packageScripts = packageJson.scripts
    const terminalPerfWorkflow = parse(
      readFileSync(join(projectDir, '.github/workflows/terminal-perf.yml'), 'utf8')
    )
    const steps = terminalPerfWorkflow.jobs['terminal-perf'].steps
    const runStep = steps.find((step) => step.name === 'Run terminal scale perf report gate')
    const uploadStep = steps.find((step) => step.name === 'Upload terminal perf report')

    expect(packageScripts['test:e2e:terminal-perf:scale:report']).toContain(
      'run-terminal-scale-perf-report-gate.mjs'
    )
    expect(runStep.run).toContain('pnpm run test:e2e:terminal-perf:scale:report')
    expect(runStep.run).toContain('xvfb-run --auto-servernum')
    const manualProfileKnobs = [
      ['ORCA_TERMINAL_PERF_FRAME_COUNT', 'frame_count', 'ORCA_E2E_OPENCODE_FRAME_COUNT'],
      [
        'ORCA_TERMINAL_PERF_FRAME_INTERVAL_MS',
        'frame_interval_ms',
        'ORCA_E2E_OPENCODE_FRAME_INTERVAL_MS'
      ],
      [
        'ORCA_TERMINAL_PERF_PRESSURE_OUTPUT_CHARS',
        'pressure_output_chars',
        'ORCA_E2E_OPENCODE_PRESSURE_OUTPUT_CHARS'
      ],
      ['ORCA_TERMINAL_PERF_SCALE_PANES', 'scale_panes', 'ORCA_E2E_OPENCODE_SCALE_PANES'],
      [
        'ORCA_TERMINAL_PERF_SCALE_CROSS_WORKSPACE_PANES',
        'scale_cross_workspace_panes',
        'ORCA_E2E_OPENCODE_SCALE_CROSS_WORKSPACE_PANES'
      ],
      [
        'ORCA_TERMINAL_PERF_SCALE_PRESSURE_PANES',
        'scale_pressure_panes',
        'ORCA_E2E_OPENCODE_SCALE_PRESSURE_PANES'
      ],
      [
        'ORCA_TERMINAL_PERF_SCALE_HIDDEN_PRESSURE_PANES',
        'scale_hidden_pressure_panes',
        'ORCA_E2E_OPENCODE_SCALE_HIDDEN_PRESSURE_PANES'
      ]
    ]
    for (const [workflowEnv, inputName, runnerEnv] of manualProfileKnobs) {
      expect(runStep.env[workflowEnv]).toBe(`\${{ inputs.${inputName} }}`)
      expect(runStep.run).toContain(runnerEnv)
    }
    expect(uploadStep.uses).toBe('actions/upload-artifact@v7')
    expect(uploadStep.with.path).toBe('${{ env.ORCA_E2E_TERMINAL_PERF_REPORT_PATH }}')
  })

  it('keeps platform golden regressions in the manual and release workflows', () => {
    const packageScripts = packageJson.scripts
    const goldenWorkflow = parse(
      readFileSync(join(projectDir, '.github/workflows/golden-e2e-experiment.yml'), 'utf8')
    )
    const releaseWorkflow = parse(
      readFileSync(join(projectDir, '.github/workflows/release-cut.yml'), 'utf8')
    )
    const steps = goldenWorkflow.jobs['golden-e2e'].steps
    const goldenPlatformLabels = new Map([
      ['linux', 'Linux'],
      ['mac', 'macOS'],
      ['windows', 'Windows']
    ])
    const goldenMatrix = goldenWorkflow.jobs['golden-e2e'].strategy.matrix.include
    const goldenPlatforms = goldenMatrix.map(({ platform }) => platform).sort()
    const goldenRunSteps = new Map(
      goldenPlatforms.map((platform) => {
        const label = goldenPlatformLabels.get(platform)

        expect(label, platform).toBeDefined()

        return [platform, steps.find((step) => step.name === `Run golden E2E tests on ${label}`)]
      })
    )
    const releaseGoldenJob = releaseWorkflow.jobs['terminal-rendering-golden']
    const releaseGoldenMatrix = releaseGoldenJob.strategy.matrix.include
    const releaseEvidenceJob = releaseWorkflow.jobs['terminal-rendering-release-evidence']
    const releaseBuildNeeds = releaseWorkflow.jobs.build.needs
    const publishReleaseNeeds = releaseWorkflow.jobs['publish-release'].needs
    const releaseEvidencePlatforms = ['linux', 'mac']

    expect(packageScripts['test:e2e:terminal-rendering-golden']).toContain(
      '@terminal-rendering-golden'
    )
    expect(packageScripts['test:e2e:terminal-rendering-golden']).toContain(
      'terminal-raw-emoji-table-scroll-restore.spec.ts'
    )
    expect(packageScripts['test:e2e:terminal-rendering-golden']).toContain(
      'terminal-webgl-atlas-budget.spec.ts'
    )
    expect(packageScripts['test:e2e:terminal-rendering-golden']).not.toContain(
      'terminal-long-table-scroll-restore.spec.ts'
    )
    expect(packageScripts['test:e2e:windows-fresh-startup-golden']).toContain(
      'golden-windows-fresh-startup.spec.ts'
    )
    expect(packageScripts['test:e2e:windows-fresh-startup-golden']).toContain(
      '@windows-fresh-startup-golden'
    )
    expect(packageScripts['test:e2e:posix-profile-index-golden']).toContain(
      'golden-posix-profile-index-fsync.spec.ts'
    )
    expect(packageScripts['test:e2e:posix-profile-index-golden']).toContain(
      'golden-posix-fresh-startup.spec.ts'
    )
    expect(packageScripts['test:e2e:posix-profile-index-golden']).toContain(
      '@posix-profile-index-golden'
    )
    expect(packageScripts['test:e2e:terminal-rendering-release-evidence']).toContain(
      'terminal-opencode-emoji-table-rendering.spec.ts'
    )
    expect(packageScripts['test:e2e:terminal-rendering-release-evidence']).toContain(
      'terminal-long-table-scroll-restore.spec.ts'
    )
    expect(goldenMatrix).toEqual([
      { os: 'ubuntu-latest', platform: 'linux' },
      { os: 'macos-15', platform: 'mac' },
      { os: 'windows-2022', platform: 'windows' }
    ])
    expect(goldenRunSteps.get('linux')?.run).toContain(
      'pnpm run test:e2e:terminal-rendering-golden'
    )
    expect(goldenRunSteps.get('linux')?.run).toContain(
      'pnpm run --if-present test:e2e:posix-profile-index-golden'
    )
    expect(goldenRunSteps.get('mac')?.run).toContain('pnpm run test:e2e:terminal-rendering-golden')
    expect(goldenRunSteps.get('mac')?.run).toContain(
      'pnpm run --if-present test:e2e:posix-profile-index-golden'
    )
    expect(goldenRunSteps.get('windows')).toMatchObject({
      if: "runner.os == 'Windows'",
      shell: 'pwsh'
    })
    expect(goldenRunSteps.get('windows').run).toContain(
      'pnpm run --if-present test:e2e:windows-fresh-startup-golden'
    )
    expect(goldenWorkflow.on.pull_request).toBeUndefined()
    expect(goldenWorkflow.on.workflow_dispatch).toBeDefined()
    expect(releaseBuildNeeds).not.toContain('terminal-rendering-golden')
    expect(releaseBuildNeeds).not.toContain('terminal-rendering-release-evidence')
    expect(publishReleaseNeeds).toContain('terminal-rendering-golden')
    expect(publishReleaseNeeds).toContain('build')
    expect(publishReleaseNeeds).not.toContain('terminal-rendering-release-evidence')
    expect(releaseGoldenJob['continue-on-error']).toBe(true)
    expect(releaseGoldenMatrix).toEqual(goldenMatrix)
    const releaseLinuxRunStep = releaseGoldenJob.steps.find(
      (step) => step.name === 'Run terminal rendering golden on Linux'
    )
    expect(releaseLinuxRunStep.run).toContain('pnpm run test:e2e:terminal-rendering-golden')
    expect(releaseLinuxRunStep.run).toContain(
      'pnpm run --if-present test:e2e:posix-profile-index-golden'
    )
    const releaseMacRunStep = releaseGoldenJob.steps.find(
      (step) => step.name === 'Run terminal rendering golden on macOS'
    )
    expect(releaseMacRunStep.run).not.toContain('test:e2e:workspace-session-golden')
    expect(releaseMacRunStep.run).toContain('pnpm run test:e2e:terminal-rendering-golden')
    expect(releaseMacRunStep.run).toContain(
      'pnpm run --if-present test:e2e:posix-profile-index-golden'
    )
    const releaseWindowsRunStep = releaseGoldenJob.steps.find(
      (step) => step.name === 'Run fresh-startup golden on Windows'
    )
    expect(releaseWindowsRunStep).toMatchObject({
      if: "runner.os == 'Windows'",
      shell: 'pwsh'
    })
    expect(releaseWindowsRunStep.run).toContain(
      'pnpm run --if-present test:e2e:windows-fresh-startup-golden'
    )
    expect(releaseWindowsRunStep.run).not.toContain('test:e2e:workspace-session-golden')
    expect(releaseEvidenceJob['continue-on-error']).toBe(true)
    expect(
      releaseEvidenceJob.strategy.matrix.include.map(({ platform }) => platform).sort()
    ).toEqual(releaseEvidencePlatforms)
    expect(releaseEvidenceJob.steps.map((step) => step.run ?? '')).toContain(
      'xvfb-run --auto-servernum env SKIP_BUILD=1 ORCA_E2E_FORWARD_APP_LOGS=1 pnpm run test:e2e:terminal-rendering-release-evidence'
    )
  })
})
