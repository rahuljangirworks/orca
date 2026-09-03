import { hasFlag } from './agent-cli-flag-detection'
import type { AgentSessionOptionCatalog, CatalogModel } from './agent-session-option-catalog-types'
import { removeAgentArgOption } from './agent-session-option-agent-args'

const hasModelFlag = (tokens: readonly string[]): boolean => hasFlag(tokens, ['-m', '--model'])

function parseKiloModelList(stdout: string): CatalogModel[] {
  const seen = new Set<string>()
  const models: CatalogModel[] = []
  for (const line of stdout.split(/\r?\n/)) {
    const id = line.trim()
    if (!id || seen.has(id)) {
      continue
    }
    seen.add(id)
    models.push({ id, label: id, options: [] })
  }
  return models
}

export const KILO_SESSION_OPTION_CATALOG: AgentSessionOptionCatalog = {
  supportsWorkerLaunchPreferences: true,
  models: [
    {
      id: 'kilo/stepfun/step-3.7-flash:free',
      label: 'StepFun: Step 3.7 Flash (free)',
      isDefault: true,
      options: []
    },
    { id: 'kilo/stepfun/step-3.7-flash', label: 'StepFun: Step 3.7 Flash', options: [] },
    { id: 'kilo/stepfun/step-3.5-flash', label: 'StepFun: Step 3.5 Flash', options: [] },
    {
      id: 'kilo/anthropic/claude-sonnet-latest',
      label: 'Claude Sonnet (via Kilo)',
      options: []
    },
    { id: 'kilo/~google/gemini-flash-latest', label: 'Gemini Flash (via Kilo)', options: [] },
    { id: 'kilo/~openai/gpt-latest', label: 'GPT (via Kilo)', options: [] }
  ],
  modelApply: {
    launchArgs: (value) => ['-m', String(value)],
    agentArgsOverride: hasModelFlag,
    removeAgentArgs: (tokens) => removeAgentArgOption(tokens, ['-m', '--model']),
    midSession: { kind: 'command', build: (value) => `/model ${String(value)}` }
  },
  discoveredModelsAreAuthoritative: true,
  listModels: { command: 'kilo models', parse: parseKiloModelList }
}
