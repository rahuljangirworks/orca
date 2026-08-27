import { describe, expect, it } from 'vitest'
import { packageJson } from './package-electron-runtime-contract-helpers.mjs'

describe('Electron runtime package contract — package scripts', () => {
  it('guards package scripts that launch Electron tooling', () => {
    const scripts = packageJson.scripts
    const guardedScripts = [
      'start',
      'dev',
      'dev-stable-name',
      'build:unpack',
      'build:win',
      'build:mac',
      'build:mac:release',
      'build:linux',
      'test:e2e',
      'test:e2e:terminal-rendering-golden',
      'test:e2e:posix-profile-index-golden',
      'test:e2e:terminal-rendering-release-evidence',
      'test:e2e:headful'
    ]

    for (const scriptName of guardedScripts) {
      expect(scripts[scriptName], scriptName).toContain('pnpm run ensure:electron-runtime &&')
    }
  })

  it('keeps Windows and Linux package builds off macOS native helper builds', () => {
    const scripts = packageJson.scripts

    expect(scripts['build:desktop']).not.toContain('build:computer-macos')
    expect(scripts['build:desktop']).not.toContain('build:keyboard-layout-macos')
    expect(scripts['build:win']).toContain('pnpm run build:desktop')
    expect(scripts['build:win']).not.toContain('pnpm run build ')
    expect(scripts['build:win']).not.toContain('build:computer-macos')
    expect(scripts['build:win']).not.toContain('build:keyboard-layout-macos')
    expect(scripts['build:linux']).toContain('pnpm run build:desktop')
    expect(scripts['build:linux']).not.toContain('pnpm run build ')
    expect(scripts['build:linux']).not.toContain('build:computer-macos')
    expect(scripts['build:linux']).not.toContain('build:keyboard-layout-macos')
    expect(scripts['build:mac']).toContain('pnpm run build:computer-macos')
    expect(scripts['build:mac']).toContain('pnpm run build:keyboard-layout-macos')
    expect(scripts['build:release']).toContain('pnpm run build:native')
    expect(scripts['build:release']).not.toContain('build:computer-macos')
  })

  it('runs the web build through the heap-sized Vite wrapper', () => {
    expect(packageJson.scripts['build:web']).toContain('node config/scripts/run-vite-web-build.mjs')
    expect(packageJson.scripts['build:web']).toContain('node config/scripts/verify-web-build.mjs')
  })
})
