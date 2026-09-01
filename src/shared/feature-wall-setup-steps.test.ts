import { describe, expect, it } from 'vitest'
import {
  FEATURE_WALL_SETUP_STEPS,
  getFeatureWallSetupSteps,
  getFeatureWallSetupStepsForSection
} from './feature-wall-setup-steps'

describe('feature wall setup copy', () => {
  it('uses Veer branding in onboarding-visible setup steps', () => {
    const browser = FEATURE_WALL_SETUP_STEPS.find((step) => step.id === 'browser')
    const cli = FEATURE_WALL_SETUP_STEPS.find((step) => step.id === 'agent-capabilities')
    const repos = FEATURE_WALL_SETUP_STEPS.find((step) => step.id === 'add-two-repos')

    expect(browser).toMatchObject({
      name: "Use Veer's browser",
      subtitle: "Use Veer's browser"
    })
    expect(browser?.description).toContain('without leaving Veer')
    expect(cli).toMatchObject({
      name: 'Enable Veer CLI',
      subtitle: 'Enable Veer CLI'
    })
    expect(cli?.description).toContain('Register the Veer shell command')
    expect(repos?.description).toContain('into Veer')
  })

  it('uses one step set for the rail, active pane, and progress', () => {
    const activeSteps = getFeatureWallSetupSteps()
    const sectionSteps = [
      ...getFeatureWallSetupStepsForSection('parallel-work'),
      ...getFeatureWallSetupStepsForSection('setup')
    ]

    expect(sectionSteps.map((step) => step.id)).toEqual(activeSteps.map((step) => step.id))
    expect(activeSteps.map((step) => step.id)).toEqual(
      FEATURE_WALL_SETUP_STEPS.map((step) => step.id)
    )
  })
})
