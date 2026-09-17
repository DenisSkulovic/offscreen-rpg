import { proxyActivities, sleep } from '@temporalio/workflow';
import type { OpeningActivities, IntervalActivities } from './contracts';

const { completeScriptedOpening } = proxyActivities<OpeningActivities>({
  startToCloseTimeout: '30 seconds',
  retry: { initialInterval: '1 second', maximumInterval: '30 seconds' },
});

// Only references enter history. This Activity is an idempotent database fixture,
// not a policy for retrying paid or otherwise uncertain external effects.
export async function scriptedOpeningV1(id: string): Promise<void> {
  await completeScriptedOpening(id);
}

const { advanceStoryInterval } = proxyActivities<IntervalActivities>({
  startToCloseTimeout: '30 seconds',
  retry: { initialInterval: '1 second', maximumInterval: '30 seconds' },
});
// One bounded wait operation; no prose or per-second simulation enters history.
export async function storyIntervalV1(id: string): Promise<void> {
  while (true) {
    const remaining = await advanceStoryInterval(id);
    if (remaining === null) return;
    await sleep(remaining);
  }
}
