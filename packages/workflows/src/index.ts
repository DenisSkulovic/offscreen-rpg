import { proxyActivities } from '@temporalio/workflow';
import type { OpeningActivities } from './contracts';

const { completeScriptedOpening } = proxyActivities<OpeningActivities>({
  startToCloseTimeout: '30 seconds',
  retry: { initialInterval: '1 second', maximumInterval: '30 seconds' },
});

// Only references enter history. This Activity is an idempotent database fixture,
// not a policy for retrying paid or otherwise uncertain external effects.
export async function scriptedOpeningV1(id: string): Promise<void> {
  await completeScriptedOpening(id);
}
