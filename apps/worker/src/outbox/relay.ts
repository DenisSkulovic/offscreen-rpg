import { setTimeout as delay } from 'node:timers/promises';
import type { createOutbox, Notice } from '@offscreen/application/outbox';

export class OutboxRelayError extends Error {
  override readonly name = 'OutboxRelayError';

  constructor(
    readonly noticeId: string,
    readonly operationId: string,
    readonly topic: string,
  ) {
    super('Outbox notice delivery failed');
  }
}

// No database lock spans delivery. Failed/uncertain sends leave the lease to
// expire, and the next attempt must use the same external operation identity.
export async function relayOne(
  outbox: ReturnType<typeof createOutbox>,
  topics: readonly string[],
  send: (notice: Notice) => Promise<void>,
) {
  const notice = await outbox.claim(topics);
  if (!notice) return false;
  try {
    await send(notice);
    await outbox.acknowledge(notice);
  } catch {
    // Preserve only safe correlation. The underlying driver/Temporal error may
    // contain endpoints or payload details and remains outside process logs.
    throw new OutboxRelayError(notice.id, notice.operationId, notice.topic);
  }
  return true;
}

export async function runRelay(
  step: () => Promise<boolean>,
  signal: AbortSignal,
  report: (error: unknown) => void,
) {
  while (!signal.aborted) {
    let delivered = false;
    try {
      delivered = await step();
    } catch (error) {
      report(error);
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
