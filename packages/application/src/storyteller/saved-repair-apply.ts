import { and, eq } from 'drizzle-orm';
import type { Database } from '@offscreen/db';
import { generation } from '@offscreen/db/generation-schema';
import {
  storytellerAttempt,
  storytellerDispatchReview,
  storytellerSavedRepairAudit,
} from '@offscreen/db/storyteller-schema';
import type { StorytellerTask } from '@offscreen/storyteller/tasks';
import { createStorytellerBudget } from './budget.js';
import { inspectSavedInvalidRepairResponse } from './saved-response-inspection.js';
import {
  previewSavedRepair,
  SavedRepairPlanRefusal,
} from './saved-repair-plan.js';

export class SavedRepairApplyError extends Error {
  readonly code: string;

  constructor(code: string) {
    super(code);
    this.name = 'SavedRepairApplyError';
    this.code = code;
  }
}

export type ApplySavedRepairInput = Readonly<{
  generationId: string;
  attemptId: string;
  evidenceBytes: Buffer | Uint8Array;
  planFingerprint: string;
  operatorId: string;
  reason: string;
}>;

export type ApplySavedRepairResult = Readonly<{
  disposition: 'applied' | 'already-applied';
  fingerprint: string;
}>;

async function alreadyAppliedFromAudit(
  database: Database,
  attemptId: string,
  planFingerprint: string,
): Promise<ApplySavedRepairResult | null> {
  const [attemptRow] = await database.db
    .select({ state: storytellerAttempt.state })
    .from(storytellerAttempt)
    .where(eq(storytellerAttempt.id, attemptId));
  if (!attemptRow || attemptRow.state !== 'settled') {
    return null;
  }
  const [auditRow] = await database.db
    .select({ planFingerprint: storytellerSavedRepairAudit.planFingerprint })
    .from(storytellerSavedRepairAudit)
    .where(eq(storytellerSavedRepairAudit.attemptId, attemptId));
  if (!auditRow) {
    throw new SavedRepairApplyError('audit_conflict');
  }
  if (auditRow.planFingerprint !== planFingerprint) {
    throw new SavedRepairApplyError('audit_conflict');
  }
  return Object.freeze({
    disposition: 'already-applied' as const,
    fingerprint: planFingerprint,
  });
}

export async function applySavedRepair(
  database: Database,
  input: ApplySavedRepairInput,
): Promise<ApplySavedRepairResult> {
  let plan;
  try {
    plan = await previewSavedRepair(database, {
      generationId: input.generationId,
      attemptId: input.attemptId,
      evidenceBytes: input.evidenceBytes,
    });
  } catch (error) {
    if (
      error instanceof SavedRepairPlanRefusal &&
      (error.code === 'generation_not_uncertain' ||
        error.code === 'attempt_not_uncertain')
    ) {
      const replay = await alreadyAppliedFromAudit(
        database,
        input.attemptId,
        input.planFingerprint,
      );
      if (replay) {
        return replay;
      }
    }
    throw error;
  }

  if (plan.fingerprint !== input.planFingerprint) {
    throw new SavedRepairApplyError('plan_conflict');
  }

  const [genRow] = await database.db
    .select({
      id: generation.id,
      attemptId: generation.attemptId,
      input: generation.input,
    })
    .from(generation)
    .where(eq(generation.id, input.generationId));
  if (!genRow || genRow.attemptId !== input.attemptId) {
    throw new SavedRepairPlanRefusal('attempt_mismatch');
  }

  const [reviewRow] = await database.db
    .select({
      state: storytellerDispatchReview.state,
      packetSha256: storytellerDispatchReview.packetSha256,
    })
    .from(storytellerDispatchReview)
    .where(
      and(
        eq(storytellerDispatchReview.attemptId, input.attemptId),
        eq(storytellerDispatchReview.generationId, input.generationId),
      ),
    );
  if (!reviewRow) {
    throw new SavedRepairPlanRefusal('review_missing');
  }

  const [attemptRow] = await database.db
    .select({ providerId: storytellerAttempt.providerId })
    .from(storytellerAttempt)
    .where(eq(storytellerAttempt.id, input.attemptId));
  if (!attemptRow) {
    throw new SavedRepairPlanRefusal('attempt_mismatch');
  }

  const task = genRow.input as StorytellerTask;
  if (task.execution.mode !== 'provider') {
    throw new SavedRepairPlanRefusal('attempt_mismatch');
  }
  const proposed = inspectSavedInvalidRepairResponse({
    generationId: genRow.id,
    attemptId: input.attemptId,
    generationAttemptId: genRow.attemptId ?? input.attemptId,
    task,
    reviewedPacketSha256: reviewRow.packetSha256,
    reviewState: reviewRow.state as
      | 'awaiting-review'
      | 'not-held'
      | 'released'
      | 'rejected'
      | 'superseded',
    evidenceBytes: input.evidenceBytes,
    recordedProviderId: attemptRow.providerId,
  });

  const budget = createStorytellerBudget(database);
  const settleResult = await budget.settle({
    id: input.attemptId,
    execution: task.execution,
    usage: proposed.usage,
    telemetry: proposed.telemetry,
    generationOutcome: proposed.generationOutcome,
    operationOutcome: proposed.operationOutcome,
    recoveryFence: {
      generationId: input.generationId,
      expectedStatusRevision: plan.statusRevision,
      reviewState: plan.reviewState,
      packetSha256: plan.requestSha256,
      evidenceSha256: plan.evidenceSha256,
      planFingerprint: input.planFingerprint,
      operatorId: input.operatorId,
      reason: input.reason,
    },
  });

  if (settleResult === 'already-applied') {
    return Object.freeze({
      disposition: 'already-applied',
      fingerprint: input.planFingerprint,
    });
  }

  return Object.freeze({
    disposition: 'applied',
    fingerprint: input.planFingerprint,
  });
}