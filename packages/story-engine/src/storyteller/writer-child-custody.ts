/**
 * WR04 T02: child registry authority and shared mission microusd suballocation fences.
 */
import { and, eq, sql } from 'drizzle-orm';
import type { Transaction } from '@offscreen/db/outbox';
import {
  storytellerAttempt,
  storytellerWriterChild,
  storytellerWriterMission,
} from '@offscreen/db/storyteller-schema';
import { StorytellerBudgetError } from './budget';
import { WriterMissionCustodyError } from './writer-mission-custody';

const WRITER_MISSION_ATTEMPT_PURPOSE = 'writer-mission.v1';

export type WriterStepContextRole = 'parent' | 'child';

export type ResolvedWriterStepContext = {
  role: WriterStepContextRole;
  contextId: string;
  mission: typeof storytellerWriterMission.$inferSelect;
  child: typeof storytellerWriterChild.$inferSelect | null;
};

export function defaultWriterContextId(
  missionId: string,
  contextId?: string,
): string {
  return contextId ?? missionId;
}

/** Derive parent vs child role from durable SQL only; never trust HTTP/model role hints. */
export async function resolveWriterStepContext(
  tx: Transaction,
  missionId: string,
  contextId?: string,
): Promise<ResolvedWriterStepContext> {
  const resolvedContextId = defaultWriterContextId(missionId, contextId);
  const [mission] = await tx
    .select()
    .from(storytellerWriterMission)
    .where(eq(storytellerWriterMission.id, missionId))
    .limit(1);
  if (!mission) {
    throw new WriterMissionCustodyError('mission_not_found');
  }
  if (resolvedContextId === missionId) {
    return {
      role: 'parent',
      contextId: missionId,
      mission,
      child: null,
    };
  }
  const [child] = await tx
    .select()
    .from(storytellerWriterChild)
    .where(eq(storytellerWriterChild.childId, resolvedContextId))
    .limit(1);
  if (!child || child.missionId !== missionId) {
    throw new WriterMissionCustodyError('step_not_found');
  }
  return {
    role: 'child',
    contextId: resolvedContextId,
    mission,
    child,
  };
}

async function sumOutstandingChildSuballocationMicrousd(
  tx: Transaction,
  missionId: string,
): Promise<bigint> {
  const [row] = await tx
    .select({
      total: sql<string>`coalesce(sum(${storytellerWriterChild.maxMicrousd}), 0)`,
    })
    .from(storytellerWriterChild)
    .where(
      and(
        eq(storytellerWriterChild.missionId, missionId),
        sql`${storytellerWriterChild.state} IN ('pending', 'running', 'uncertain')`,
      ),
    );
  return BigInt(row?.total ?? 0);
}

async function sumContextAttemptMicrousd(
  tx: Transaction,
  missionId: string,
  contextId: string,
): Promise<bigint> {
  const [row] = await tx
    .select({
      total: sql<string>`coalesce(sum(
        CASE
          WHEN ${storytellerAttempt.state} IN ('reserved', 'dispatched', 'uncertain')
            THEN ${storytellerAttempt.reservedMicrousd}
          WHEN ${storytellerAttempt.state} = 'settled'
            THEN coalesce(${storytellerAttempt.chargedMicrousd}, 0)
          ELSE 0
        END
      ), 0)`,
    })
    .from(storytellerAttempt)
    .where(
      and(
        eq(storytellerAttempt.purpose, WRITER_MISSION_ATTEMPT_PURPOSE),
        sql`${storytellerAttempt.attribution} ->> 'missionId' = ${missionId}`,
        sql`coalesce(${storytellerAttempt.attribution} ->> 'contextId', ${missionId}) = ${contextId}`,
      ),
    );
  return BigInt(row?.total ?? 0);
}

async function sumAllChildContextAttemptMicrousd(
  tx: Transaction,
  missionId: string,
): Promise<bigint> {
  const [row] = await tx
    .select({
      total: sql<string>`coalesce(sum(
        CASE
          WHEN ${storytellerAttempt.state} IN ('reserved', 'dispatched', 'uncertain')
            THEN ${storytellerAttempt.reservedMicrousd}
          WHEN ${storytellerAttempt.state} = 'settled'
            THEN coalesce(${storytellerAttempt.chargedMicrousd}, 0)
          ELSE 0
        END
      ), 0)`,
    })
    .from(storytellerAttempt)
    .where(
      and(
        eq(storytellerAttempt.purpose, WRITER_MISSION_ATTEMPT_PURPOSE),
        sql`${storytellerAttempt.attribution} ->> 'missionId' = ${missionId}`,
        sql`coalesce(${storytellerAttempt.attribution} ->> 'contextId', ${missionId}) <> ${missionId}`,
      ),
    );
  return BigInt(row?.total ?? 0);
}

/**
 * Enforce parent/child suballocation under the existing storyteller_operation lock.
 * Child caps are earmarks on the frozen mission budget, not a second funding wallet.
 */
export async function assertWriterSharedMicrousdBudget(
  tx: Transaction,
  context: ResolvedWriterStepContext,
  additionalMicrousd: bigint,
): Promise<void> {
  const missionMax = BigInt(
    (context.mission.budgetSnapshot as { maxMicrousd: string }).maxMicrousd,
  );
  const outstandingChild = await sumOutstandingChildSuballocationMicrousd(
    tx,
    context.mission.id,
  );
  const parentSpend = await sumContextAttemptMicrousd(
    tx,
    context.mission.id,
    context.mission.id,
  );
  const allChildSpend = await sumAllChildContextAttemptMicrousd(
    tx,
    context.mission.id,
  );

  if (context.role === 'parent') {
    if (parentSpend + additionalMicrousd + outstandingChild > missionMax) {
      throw new StorytellerBudgetError('budget_unavailable');
    }
    return;
  }

  const child = context.child;
  if (!child) {
    throw new WriterMissionCustodyError('step_not_found');
  }
  const childSpend = await sumContextAttemptMicrousd(
    tx,
    context.mission.id,
    context.contextId,
  );
  if (childSpend + additionalMicrousd > BigInt(child.maxMicrousd)) {
    throw new StorytellerBudgetError('budget_unavailable');
  }
  if (parentSpend + outstandingChild > missionMax) {
    throw new StorytellerBudgetError('budget_unavailable');
  }
  if (parentSpend + allChildSpend + additionalMicrousd > missionMax) {
    throw new StorytellerBudgetError('budget_unavailable');
  }
}

export async function markWriterChildState(
  tx: Transaction,
  childId: string,
  state: typeof storytellerWriterChild.$inferSelect.state,
) {
  await tx
    .update(storytellerWriterChild)
    .set({ state, updatedAt: sql`clock_timestamp()` })
    .where(eq(storytellerWriterChild.childId, childId));
}

export async function sumOutstandingChildSuballocationForMission(
  tx: Transaction,
  missionId: string,
): Promise<bigint> {
  return sumOutstandingChildSuballocationMicrousd(tx, missionId);
}