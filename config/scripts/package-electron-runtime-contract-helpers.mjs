import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { join, resolve } from 'node:path'
import { relayArtifactFilenames } from '../../src/shared/relay-artifacts.ts'

const projectDir = resolve(import.meta.dirname, '../..')
const require = createRequire(import.meta.url)
const { createPackagedRuntimeNodeModuleResources } = require('../packaged-runtime-node-modules.cjs')
const packageJson = JSON.parse(readFileSync(join(projectDir, 'package.json'), 'utf8'))

export {
  projectDir,
  require,
  createPackagedRuntimeNodeModuleResources,
  packageJson,
  readFileSync,
  join,
  resolve,
  relayArtifactFilenames
}
