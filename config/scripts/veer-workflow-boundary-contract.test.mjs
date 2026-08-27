import { readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { parse } from 'yaml'

const projectDir = resolve(import.meta.dirname, '../..')

function workflow(name) {
  return parse(readFileSync(join(projectDir, '.github/workflows', name), 'utf8'))
}

function step(job, name) {
  const value = job.steps.find((candidate) => candidate.name === name)
  expect(value, name).toBeDefined()
  return value
}

const upstreamRepositoryGate = "github.repository == 'stablyai/orca'"
const issueOptIn = "vars.VEER_AUTOMATION_ISSUES_ENABLED == 'true'"

describe('Veer workflow boundaries', () => {
  it('does not call Stably-owned Homebrew or project automation from the fork', () => {
    const release = workflow('release-cut.yml')
    const homebrew = workflow('homebrew-bump.yml')
    const community = workflow('track-community-prs.yaml')

    expect(release.jobs['homebrew-bump'].if).toContain(upstreamRepositoryGate)
    expect(release.jobs['homebrew-bump-published-rc-draft'].if).toContain(upstreamRepositoryGate)
    expect(homebrew.jobs['bump-cask'].if).toContain(upstreamRepositoryGate)
    expect(community.jobs['track-community-pr'].if).toBe(upstreamRepositoryGate)
  })

  it('keeps noisy upstream schedules manual on Veer', () => {
    const e2e = workflow('e2e.yml')
    const terminalPerf = workflow('terminal-perf.yml')
    const computer = workflow('computer-e2e.yml')

    expect(e2e.jobs.build.if).toContain("github.event_name != 'schedule'")
    expect(e2e.jobs.build.if).toContain(upstreamRepositoryGate)
    expect(terminalPerf.jobs['terminal-perf'].if).toContain("github.event_name != 'schedule'")
    for (const platform of ['mac', 'linux', 'windows']) {
      expect(computer.jobs[platform].if).toContain("github.event_name == 'workflow_dispatch'")
      expect(computer.jobs[platform].if).toContain(upstreamRepositoryGate)
    }
  })

  it('uses Veer backend endpoints and makes issue automation opt-in', () => {
    const backend = workflow('agent-backend-monitor.yml')
    const analyzer = workflow('agent-test-analyzer.yml')
    const upstream = workflow('agent-upstream-monitor.yml')
    const notifier = workflow('agent-update-notifier.yml')
    const backendCheck = step(backend.jobs.monitor, 'Check API health').run

    expect(backendCheck).toContain('$API_URL/config.json')
    expect(backendCheck).toContain('$API_URL/api/updates/check?version=')
    expect(analyzer.on.workflow_run.workflows).toContain('E2E')
    expect(step(notifier.jobs.notify, 'Update backend API').run).toContain('/config.json')

    const issueSteps = [
      step(backend.jobs.monitor, 'Check for existing health issue'),
      step(analyzer.jobs.analyze, 'Check for existing failure tracking issue'),
      step(upstream.jobs.monitor, 'Check for existing sync tracking issue'),
      step(notifier.jobs.notify, 'Create announcement issue')
    ]
    for (const issueStep of issueSteps) {
      expect(issueStep.if).toContain(issueOptIn)
    }
  })

  it('continues a package RC line when the fork has no published stable release', () => {
    const releaseSource = readFileSync(
      join(projectDir, '.github/workflows/release-cut.yml'),
      'utf8'
    )

    expect(releaseSource).toContain('current_package_rc_base()')
    expect(releaseSource).toContain('base="$package_rc_base"')
    expect(releaseSource).toContain('new="$package_rc_base"')
  })
})
