import {
  proxyActivities,
  sleep,
  condition,
  defineSignal,
  setHandler,
} from '@temporalio/workflow';
import { intervalChangedSignal } from './contracts';
import type {
  OpeningActivities,
  IntervalActivities,
  DecisionActivities,
  ContinuationActivities,
  StorytellerActivities,
} from './contracts';

const { completeScriptedOpening } = proxyActivities<OpeningActivities>({
  startToCloseTimeout: '30 seconds',
  retry: { initialInterval: '1 second', maximumInterval: '30 seconds' },
});

// Only references enter history. This Activity is an idempotent database fixture,
// not a policy for retrying paid or otherwise uncertain external effects.
export async function scriptedOpeningV1(id: string): Promise<void> {
  await completeScriptedOpening(id);
}

const { completeScriptedContinuation } =
  proxyActivities<ContinuationActivities>({
    startToCloseTimeout: '30 seconds',
    retry: { initialInterval: '1 second', maximumInterval: '30 seconds' },
  });

export async function scriptedContinuationV1(id: string): Promise<void> {
  await completeScriptedContinuation(id);
}

const { advanceControlledInterval } = proxyActivities<IntervalActivities>({
  startToCloseTimeout: '30 seconds',
  retry: { initialInterval: '1 second', maximumInterval: '30 seconds' },
});
export async function storyIntervalV2(id: string): Promise<void> {
  let wakeVersion = 0;
  setHandler(defineSignal(intervalChangedSignal), () => {
    wakeVersion++;
  });
  while (true) {
    const observed = wakeVersion;
    const remaining = await advanceControlledInterval(id);
    if (remaining === null) {
      return;
    }
    if (observed !== wakeVersion) {
      continue;
    }
    if (remaining < 0) {
      await condition(() => observed !== wakeVersion);
    } else {
      await condition(() => observed !== wakeVersion, remaining);
    }
  }
}

const { advanceStoryInterval } = proxyActivities<IntervalActivities>({
  startToCloseTimeout: '30 seconds',
  retry: { initialInterval: '1 second', maximumInterval: '30 seconds' },
});
// One bounded wait operation; no prose or per-second simulation enters history.
export async function storyIntervalV1(id: string): Promise<void> {
  while (true) {
    const remaining = await advanceStoryInterval(id);
    if (remaining === null) {
      return;
    }
    await sleep(remaining);
  }
}

const { resolveStoryDecision } = proxyActivities<DecisionActivities>({
  startToCloseTimeout: '30 seconds',
  retry: { initialInterval: '1 second', maximumInterval: '30 seconds' },
});
export async function storyDecisionV1(id: string): Promise<void> {
  while (true) {
    const remaining = await resolveStoryDecision(id);
    if (remaining === null) {
      return;
    }
    await sleep(remaining);
  }
}

const { completeStoryteller } = proxyActivities<
  import('./contracts').StorytellerActivities
>({
  startToCloseTimeout: '3 minutes',
  retry: {
    initialInterval: '2 seconds',
    maximumInterval: '30 seconds',
    maximumAttempts: 5,
  },
});
// Redelivery retries execution bookkeeping/publication, never an uncertain paid dispatch.
export async function storytellerV1(id: string): Promise<void> {
  await completeStoryteller(id);
}
