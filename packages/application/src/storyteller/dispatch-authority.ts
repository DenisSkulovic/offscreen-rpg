import { isDeepStrictEqual } from 'node:util';
import {
  effectiveUsagePolicySchema,
  type EffectiveUsagePolicy,
} from '@offscreen/contracts/usage-policy';
import type { StorytellerTask } from '@offscreen/storyteller/tasks';

/** Current server authority must exactly retain the task's captured authority. */
export function retainsCapturedAuthority(
  task: StorytellerTask,
  current: EffectiveUsagePolicy | null,
) {
  if (task.resources.authority.kind !== 'effective-usage-policy' || !current) {
    return false;
  }
  return isDeepStrictEqual(
    task.resources.authority.policy,
    effectiveUsagePolicySchema.parse(current),
  );
}
