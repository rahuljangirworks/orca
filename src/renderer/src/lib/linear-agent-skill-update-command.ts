import type { DiscoveredSkill } from '../../../shared/skills'
import {
  GLOBAL_AGENT_SKILL_SOURCE_KINDS,
  hasInstalledAgentSkill
} from '@/hooks/useInstalledAgentSkills'
import {
  LINEAR_TICKETS_SKILL_NAME,
  LINEAR_TICKETS_SKILL_UPDATE_COMMAND,
  ORCA_LINEAR_SKILL_NAME,
  ORCA_LINEAR_SKILL_UPDATE_COMMAND,
  VEER_LINEAR_SKILL_NAME,
  VEER_LINEAR_SKILL_UPDATE_COMMAND
} from '@/lib/agent-feature-install-commands'

export type LinearAgentSkillUpdateTarget = {
  skillName:
    | typeof VEER_LINEAR_SKILL_NAME
    | typeof ORCA_LINEAR_SKILL_NAME
    | typeof LINEAR_TICKETS_SKILL_NAME
  command: string
}

// Why: legacy-only installs must update and report freshness for the installed
// legacy skill, while fresh/canonical/both-name states use the canonical name.
export function getLinearAgentSkillUpdateTarget(
  skills: readonly DiscoveredSkill[],
  installed: boolean
): LinearAgentSkillUpdateTarget {
  const canonicalSkillInstalled = hasInstalledAgentSkill(skills, VEER_LINEAR_SKILL_NAME, {
    sourceKinds: GLOBAL_AGENT_SKILL_SOURCE_KINDS
  })
  const deprecatedCanonicalInstalled = hasInstalledAgentSkill(skills, ORCA_LINEAR_SKILL_NAME, {
    sourceKinds: GLOBAL_AGENT_SKILL_SOURCE_KINDS
  })
  if (!installed || canonicalSkillInstalled) {
    return { skillName: VEER_LINEAR_SKILL_NAME, command: VEER_LINEAR_SKILL_UPDATE_COMMAND }
  }
  if (deprecatedCanonicalInstalled) {
    return { skillName: ORCA_LINEAR_SKILL_NAME, command: ORCA_LINEAR_SKILL_UPDATE_COMMAND }
  }
  return { skillName: LINEAR_TICKETS_SKILL_NAME, command: LINEAR_TICKETS_SKILL_UPDATE_COMMAND }
}

export function getLinearAgentSkillUpdateCommand(
  skills: readonly DiscoveredSkill[],
  installed: boolean
): string {
  return getLinearAgentSkillUpdateTarget(skills, installed).command
}
