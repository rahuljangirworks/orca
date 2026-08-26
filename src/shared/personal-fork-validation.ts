import {
  PERSONAL_FORK_NETWORK_DISABLED_MESSAGE,
  PERSONAL_FORK_POLICY
} from './personal-fork-policy'

export type ValidationResult<T = never> = ({ ok: true } & T) | { ok: false; error: string }

type FeedbackSubmitResult = { ok: boolean; status: number | null; error?: string }

// Check if first-party network requests are allowed in this personal fork.
// Returns null if allowed, or an error result if disabled.
export function checkFirstPartyNetworkAllowed<T>(): ValidationResult<T> | null {
  if (!PERSONAL_FORK_POLICY.firstPartyNetworkEnabled) {
    return { ok: false, error: PERSONAL_FORK_NETWORK_DISABLED_MESSAGE }
  }
  return null
}

// Validate pre-submission requirements for feedback submission.
// Returns an error result if validation fails, null if all checks pass.
export function validateFeedbackSubmission(
  imageValidator?: (images: unknown[]) => string | null,
  images?: unknown[]
): FeedbackSubmitResult | null {
  const networkCheck = checkFirstPartyNetworkAllowed<{ status: null }>()
  if (networkCheck) {
    return networkCheck
  }
  if (imageValidator && images !== undefined) {
    const imageError = imageValidator(images)
    if (imageError) {
      return { ok: false, status: null, error: imageError }
    }
  }
  return null
}
