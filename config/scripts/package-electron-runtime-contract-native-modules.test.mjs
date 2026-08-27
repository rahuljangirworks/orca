import { describe, expect, it } from 'vitest'
import {
  projectDir,
  createPackagedRuntimeNodeModuleResources,
  packageJson,
  readFileSync,
  join
} from './package-electron-runtime-contract-helpers.mjs'

describe('Electron runtime package contract — native modules', () => {
  it('keeps shared WebGL atlas invalidation reproducible from vendored source', () => {
    const patch = readFileSync(
      join(projectDir, 'config/patches/@xterm__addon-webgl@0.20.0-beta.286.patch'),
      'utf8'
    )

    expect(patch).toContain('diff --git a/src/Types.ts b/src/Types.ts')
    expect(patch).toContain('readonly clearModelGeneration: number')
    expect(patch).toContain('const generation = this._atlas.clearModelGeneration')
    expect(patch).toContain('this.clearModelGeneration++')
    expect(patch).toContain('this._atlas._clearModelGeneration||0')
  })

  it('keeps root postinstall as the single Electron binary install owner', () => {
    expect(packageJson.scripts.postinstall).toBe('node config/scripts/rebuild-native-deps.mjs')
    expect(packageJson.pnpm.onlyBuiltDependencies).not.toContain('electron')
  })

  it('keeps the native Windows registry addon optional and platform-gated', () => {
    const rebuildScript = readFileSync(
      join(projectDir, 'config/scripts/rebuild-native-deps.mjs'),
      'utf8'
    )
    const ensureScript = readFileSync(
      join(projectDir, 'config/scripts/ensure-native-runtime.mjs'),
      'utf8'
    )
    expect(packageJson.optionalDependencies['windows-native-registry']).toBe('3.2.2')
    expect(packageJson.pnpm.onlyBuiltDependencies).not.toContain('windows-native-registry')
    expect(rebuildScript).toContain("rebuildPlatform === 'win32'")
    expect(rebuildScript).toContain("'windows-native-registry'")
    expect(ensureScript).toContain("process.platform === 'win32'")
    expect(ensureScript).toContain("'windows-native-registry'")
    const packageTargets = {
      win32: createPackagedRuntimeNodeModuleResources('win32'),
      darwin: createPackagedRuntimeNodeModuleResources('darwin'),
      linux: createPackagedRuntimeNodeModuleResources('linux')
    }
    expect(packageTargets.win32).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ to: join('node_modules', 'windows-native-registry') }),
        expect.objectContaining({ to: join('node_modules', 'node-addon-api') })
      ])
    )
    for (const platform of ['darwin', 'linux']) {
      expect(packageTargets[platform]).not.toEqual(
        expect.arrayContaining([
          expect.objectContaining({ to: join('node_modules', 'windows-native-registry') })
        ])
      )
    }
  })

  it('keeps the native Windows process-table addon optional and platform-gated', () => {
    const rebuildScript = readFileSync(
      join(projectDir, 'config/scripts/rebuild-native-deps.mjs'),
      'utf8'
    )
    const ensureScript = readFileSync(
      join(projectDir, 'config/scripts/ensure-native-runtime.mjs'),
      'utf8'
    )
    expect(packageJson.optionalDependencies['@vscode/windows-process-tree']).toBe('0.8.0')
    expect(packageJson.pnpm.onlyBuiltDependencies).not.toContain('@vscode/windows-process-tree')
    expect(rebuildScript).toContain("'@vscode/windows-process-tree'")
    expect(ensureScript).toContain("'@vscode/windows-process-tree'")
    expect(packageJson.pnpm.patchedDependencies['@vscode/windows-process-tree@0.8.0']).toBe(
      'config/patches/@vscode__windows-process-tree@0.8.0.patch'
    )
    const packageTargets = {
      win32: createPackagedRuntimeNodeModuleResources('win32'),
      darwin: createPackagedRuntimeNodeModuleResources('darwin'),
      linux: createPackagedRuntimeNodeModuleResources('linux')
    }
    expect(packageTargets.win32).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ to: join('node_modules', '@vscode', 'windows-process-tree') })
      ])
    )
    for (const platform of ['darwin', 'linux']) {
      expect(packageTargets[platform]).not.toEqual(
        expect.arrayContaining([
          expect.objectContaining({ to: join('node_modules', '@vscode', 'windows-process-tree') })
        ])
      )
    }
  })
})
