import type { CommandSpec } from '../args'
import { GLOBAL_FLAGS } from '../args'

export const AGENT_HOOK_COMMAND_SPECS: CommandSpec[] = [
  {
    path: ['agent', 'hooks', 'prepare-codex'],
    summary: 'Repair Veer-managed Codex hook trust before a shell launch',
    usage: 'veer agent hooks prepare-codex',
    allowedFlags: [...GLOBAL_FLAGS]
  },
  {
    path: ['agent', 'hooks', 'status'],
    summary: 'Show whether Veer-managed agent status hooks are enabled',
    usage: 'veer agent hooks status [--json]',
    allowedFlags: [...GLOBAL_FLAGS],
    examples: ['veer agent hooks status', 'veer agent hooks status --json']
  },
  {
    path: ['agent', 'hooks', 'off'],
    summary: 'Disable Veer-managed agent status hooks and remove local hook entries',
    usage: 'veer agent hooks off [--json]',
    allowedFlags: [...GLOBAL_FLAGS],
    examples: ['veer agent hooks off']
  },
  {
    path: ['agent', 'hooks', 'on'],
    summary: 'Enable Veer-managed agent status hooks',
    usage: 'veer agent hooks on [--json]',
    allowedFlags: [...GLOBAL_FLAGS],
    examples: ['veer agent hooks on']
  }
]
