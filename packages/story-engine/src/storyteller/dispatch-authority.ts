import { isDeepStrictEqual } from 'node:util';
import {
  effectiveUsagePolicySchema,
  type EffectiveUsagePolicy,
} from '@offscreen/contracts/usage-policy';
import type { StorytellerTask } from '@offscreen/storyteller/tasks';
import type { UsagePolicyResolution } from './usage-policy-resolution';

function sameEffectivePolicy(
  captured: EffectiveUsagePolicy,
  current: EffectiveUsagePolicy,
) {
  return isDeepStrictEqual(
    effectiveUsagePolicySchema.parse(captured),
    effectiveUsagePolicySchema.parse(current),
  );
}

/**
 * Fail-closed recheck against an independently supplied resolution.
 * A captured task snapshot is not a current argument and is not read here.
 * Missing, denied (revoked or disabled entitlement, route, or funding), and
 * any unequal policy are denied. Deep equality is the only allow.
 * This function does not load a grant and does not send a provider request.
 */
export function retainsIndependentCurrentAuthority(
  captured: EffectiveUsagePolicy,
  current: UsagePolicyResolution | null,
) {
  if (!current || current.kind !== 'allowed') return false;
  return sameEffectivePolicy(captured, current.policy);
}

/** Current server authority must exactly retain the task's captured authority. */
export function retainsCapturedAuthority(
  task: StorytellerTask,
  current: EffectiveUsagePolicy | null,
) {
  if (task.resources.authority.kind !== 'effective-usage-policy' || !current) {
    return false;
  }
  return sameEffectivePolicy(task.resources.authority.policy, current);
}
