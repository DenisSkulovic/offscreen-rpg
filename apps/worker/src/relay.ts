import { setTimeout as delay } from 'node:timers/promises';
import type { createOutbox, Notice } from '@offscreen/server/outbox';

// No database lock spans delivery. Failed/uncertain sends leave the lease to
// expire, and the next attempt must use the same external operation identity.
export async function relayOne(
  outbox: ReturnType<typeof createOutbox>,
  topics: readonly string[],
  send: (notice: Notice) => Promise<void>,
) {
  const notice = await outbox.claim(topics);
  if (!notice) return false;
  await send(notice);
  await outbox.acknowledge(notice);
  return true;
}

export async function runRelay(
  step: () => Promise<boolean>,
  signal: AbortSignal,
  report: () => void,
) {
  while (!signal.aborted) {
    let delivered = false;
    try {
      delivered = await step();
    } catch {
      report();
    }
    if (!delivered && !signal.aborted) {
      try {
        await delay(1000, undefined, { signal });
      } catch {
        if (!signal.aborted) throw new Error('Relay wait failed');
      }
    }
  }
}
