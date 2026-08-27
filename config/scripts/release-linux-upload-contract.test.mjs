import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { parse } from 'yaml'

const projectDir = join(import.meta.dirname, '../..')

describe('Linux release upload contract', () => {
  it('builds and uploads both Linux release matrix entries', () => {
    const workflow = parse(
      readFileSync(join(projectDir, '.github/workflows/release-cut.yml'), 'utf8')
    )
    const buildStep = workflow.jobs.build.steps.find(
      (step) => step.name === 'Build Linux release artifacts'
    )
    const uploadStep = workflow.jobs.build.steps.find(
      (step) => step.name === 'Upload Linux release artifacts'
    )
    const floorStep = workflow.jobs.build.steps.find(
      (step) => step.name === 'Load packaged node-pty on the Linux floor'
    )

    for (const step of [buildStep, uploadStep]) {
      expect(step.if).toContain("matrix.platform == 'linux-x64'")
      expect(step.if).toContain("matrix.platform == 'linux-arm64'")
    }
    expect(buildStep.with.command).toBe('${{ matrix.release_command }}')
    expect(uploadStep.with.command).toContain('gh release upload')
    expect(uploadStep.with.command).toContain('dist/*.AppImage')
    expect(uploadStep.with.command).toContain('dist/*.deb')
    expect(uploadStep.with.command).toContain('dist/*.rpm')
    expect(uploadStep.with.command).toContain('dist/latest-linux*.yml')
    const names = workflow.jobs.build.steps.map((step) => step.name)
    expect(names.indexOf(buildStep.name)).toBeLessThan(names.indexOf(floorStep.name))
    expect(names.indexOf(floorStep.name)).toBeLessThan(names.indexOf(uploadStep.name))
  })
})
