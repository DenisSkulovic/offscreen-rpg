import { and, eq, sql } from 'drizzle-orm';
import { storytellerFunding } from '@offscreen/db/storyteller-schema';
import { storytellerUsageAllocation as allocation } from '@offscreen/db/storyteller-schema';
import type {
  EffectiveUsagePolicy,
  UsageWindowDefinition,
} from '@offscreen/contracts/usage-policy';
import type { StorytellerTask } from '@offscreen/storyteller/tasks';
import type { ProviderUsage } from '@offscreen/storyteller/providers/openrouter';
import type { Transaction } from '../outbox/index';

export class UsageWindowError extends Error {
  constructor(public readonly windowId: string) {
    super('window_exhausted');
  }
}

function scopeKey(
  window: UsageWindowDefinition,
  accountId: string,
  task: StorytellerTask,
) {
  if (window.scope === 'platform') return 'platform';
  if (window.scope === 'account') return accountId;
  if ('storyId' in task.source) return task.source.storyId;
  throw new UsageWindowError(window.id);
}

function reservedValue(
  metric: UsageWindowDefinition['metric'],
  task: StorytellerTask,
  reservedMicrousd: bigint,
) {
  if (metric === 'requests') return 1n;
  if (metric === 'input_tokens')
    return BigInt(task.resources.envelope.maxInputTokens);
  if (metric === 'generated_tokens')
    return BigInt(task.resources.envelope.maxGeneratedTokens);
  if (metric === 'microusd') return reservedMicrousd;
  return task.task === 'report' ? 1n : 0n;
}

function fixedPeriod(window: UsageWindowDefinition, now: Date) {
  if (window.window.kind !== 'fixed') return { startsAt: null, endsAt: null };
  const durationMs = window.window.durationSeconds * 1000;
  const anchorMs = new Date(window.window.anchorUtc).getTime();
  const startsAtMs =
    anchorMs + Math.floor((now.getTime() - anchorMs) / durationMs) * durationMs;
  return {
    startsAt: new Date(startsAtMs),
    endsAt: new Date(startsAtMs + durationMs),
  };
}

/** Caller holds the global accounting lock; all windows reserve atomically. */
export async function reserveUsageWindows(
  tx: Transaction,
  args: {
    attemptId: string;
    accountId: string;
    task: StorytellerTask;
    policy: EffectiveUsagePolicy;
    reservedMicrousd: bigint;
  },
) {
  const [clock] = await tx
    .select({ now: sql<Date>`clock_timestamp()` })
    .from(storytellerFunding)
    .where(eq(storytellerFunding.id, args.accountId));
  if (!clock) throw new Error('Missing funding clock');
  for (const window of args.policy.windows) {
    const key = scopeKey(window, args.accountId, args.task);
    const period = fixedPeriod(window, clock.now);
    const rows = await tx
      .select()
      .from(allocation)
      .where(
        and(
          eq(allocation.scope, window.scope),
          eq(allocation.scopeKey, key),
          eq(allocation.windowId, window.id),
          eq(allocation.windowVersion, window.version),
        ),
      );
    const rollingCutoff =
      window.window.kind === 'rolling'
        ? clock.now.getTime() - window.window.durationSeconds * 1000
        : null;
    const used = rows.reduce((total, row) => {
      const unresolved = ['reserved', 'dispatched', 'uncertain'].includes(
        row.state,
      );
      const inPeriod =
        unresolved ||
        (window.window.kind === 'fixed'
          ? row.periodStartsAt?.getTime() === period.startsAt?.getTime()
          : row.attributedAt.getTime() > (rollingCutoff ?? 0));
      return inPeriod ? total + (row.consumed ?? row.reserved) : total;
    }, 0n);
    const reserved = reservedValue(
      window.metric,
      args.task,
      args.reservedMicrousd,
    );
    if (used + reserved > BigInt(window.limit))
      throw new UsageWindowError(window.id);
    await tx.insert(allocation).values({
      attemptId: args.attemptId,
      windowId: window.id,
      windowVersion: window.version,
      scope: window.scope,
      scopeKey: key,
      metric: window.metric,
      definition: window,
      state: 'reserved',
      reserved,
      periodStartsAt: period.startsAt,
      periodEndsAt: period.endsAt,
      attributedAt: clock.now,
    });
  }
}

export async function markUsageWindows(
  tx: Transaction,
  attemptId: string,
  state: 'dispatched' | 'uncertain' | 'released',
) {
  await tx
    .update(allocation)
    .set(
      state === 'released'
        ? { state, consumed: 0n, settledAt: sql`clock_timestamp()` }
        : { state },
    )
    .where(eq(allocation.attemptId, attemptId));
}

export async function settleUsageWindows(
  tx: Transaction,
  attemptId: string,
  usage: ProviderUsage,
) {
  const rows = await tx
    .select()
    .from(allocation)
    .where(eq(allocation.attemptId, attemptId));
  let exceededReservation = false;
  for (const row of rows) {
    const consumed =
      row.metric === 'requests'
        ? 1n
        : row.metric === 'input_tokens'
          ? BigInt(usage.promptTokens)
          : row.metric === 'generated_tokens'
            ? BigInt(usage.completionTokens)
            : row.metric === 'microusd'
              ? usage.reportedCostMicrousd
              : row.reserved;
    exceededReservation ||= consumed > row.reserved;
    await tx
      .update(allocation)
      .set({ state: 'settled', consumed, settledAt: sql`clock_timestamp()` })
      .where(
        and(
          eq(allocation.attemptId, attemptId),
          eq(allocation.scope, row.scope),
          eq(allocation.windowId, row.windowId),
          eq(allocation.windowVersion, row.windowVersion),
        ),
      );
  }
  return exceededReservation;
}
