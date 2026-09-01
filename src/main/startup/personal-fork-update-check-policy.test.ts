import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const mainIndexSource = readFileSync(join(__dirname, '..', 'index.ts'), 'utf8')

describe('personal fork update-check startup policy', () => {
  it('does not start the Veer Platform update checker during app startup', () => {
    expect(mainIndexSource).not.toContain('startPeriodicUpdateChecker')
  })
})
