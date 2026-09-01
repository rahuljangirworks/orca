import type { CommandSpec } from '../args'
import { GLOBAL_FLAGS } from '../args'

export const ENVIRONMENT_COMMAND_SPECS: CommandSpec[] = [
  {
    path: ['host', 'list'],
    summary: 'List every machine this Veer host can target, and how to name each one',
    usage: 'veer host list [--json]',
    allowedFlags: [...GLOBAL_FLAGS],
    notes: [
      'Answers "what can I target and what do I pass" in one place: this machine, the SSH targets registered on it, and the Veer servers paired with it.',
      'The three kinds are reached differently. A paired Veer server is a connection, selected with --environment <name>. An SSH target is a machine the connected Veer host reaches, selected with --host ssh:<id>. Passing one where the other belongs is the most common way to get an empty or missing-host answer.',
      "SSH targets are read from the Veer host you are currently connected to, so this lists that host's targets and not another server's."
    ],
    examples: ['veer host list', 'veer host list --json']
  },
  {
    path: ['environment', 'add'],
    summary: 'Save a remote Veer runtime environment from a pairing code',
    usage: 'veer environment add --name <name> --pairing-code <code> [--json]',
    allowedFlags: [...GLOBAL_FLAGS, 'name'],
    examples: ['veer environment add --name work-laptop --pairing-code orca://pair?code=...']
  },
  {
    path: ['environment', 'list'],
    summary: 'List saved Veer runtime environments',
    usage: 'veer environment list [--json]',
    allowedFlags: [...GLOBAL_FLAGS]
  },
  {
    path: ['environment', 'show'],
    summary: 'Show one saved Veer runtime environment',
    usage: 'veer environment show --environment <selector> [--json]',
    allowedFlags: [...GLOBAL_FLAGS]
  },
  {
    path: ['environment', 'rm'],
    destructive: true,
    summary: 'Remove one saved Veer runtime environment',
    usage: 'veer environment rm --environment <selector> [--json]',
    allowedFlags: [...GLOBAL_FLAGS]
  }
]
