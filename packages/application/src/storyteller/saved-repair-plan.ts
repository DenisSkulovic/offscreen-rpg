import { createHash } from 'node:crypto';
import { and, eq, inArray, ne, sql } from 'drizzle-orm';
import type { Database } from '@offscreen/db';
import { generation } from '@offscreen/db/generation-schema';
import {
  storytellerAttempt,
  storytellerDispatchReview,
} from '@offscreen/db/storyteller-schema';
import type { StorytellerTask } from '@offscreen/storyteller/tasks';
import {
  inspectSavedInvalidRepairResponse,
  SavedRepairInspectionRefusal,
} from './saved-response-inspection.js';

export class SavedRepairPlanRefusal extends Error {
  readonly code: string;

  constructor(code: string) {
    super(code);
    this.name = 'SavedRepairPlanRefusal';
    this.code = code;
  }
}

type ReviewState =
  | 'awaiting-review'
  | 'not-held'
  | 'released'
  | 'rejected'
  | 'superseded';

export type PreviewSavedRepairInput = Readonly<{
  generationId: string;
  attemptId: string;
  expectedStatusRevision?: number;
  evidenceBytes: Buffer | Uint8Array;
}>;

export type SavedRepairPlan = Readonly<{
  disposition: 'plan';
  generationId: string;
  attemptId: string;
  accountId: string;
  runId: string;
  generationState: string;
  attemptState: string;
  statusRevision: number;
  reviewState: ReviewState;
  reviewRevision: number;
  requestSha256: string;
  evidenceSha256: string;
  providerId: string;
  reportedModel: string;
  reportedCostMicrousd: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  operationOutcome: string;
  generationFailureCode: string;
  fingerprint: string;
}>;

function planRefuse(code: string): never {
  throw new SavedRepairPlanRefusal(code);
}

function evidenceEnvelopeProviderId(bytes: Buffer | Uint8Array): string | null {
  try {
    const text =
      bytes instanceof Buffer
        ? bytes.toString('utf8')
        : Buffer.from(bytes).toString('utf8');
    const wrapper = JSON.parse(text) as { raw?: string };
    if (typeof wrapper.raw !== 'string') return null;
    const envelope = JSON.parse(wrapper.raw) as { id?: unknown };
    return typeof envelope.id === 'string' && envelope.id.length > 0
      ? envelope.id
      : null;
  } catch {
    return null;
  }
}

function evidenceIdentifiesOnlyThisAttempt(
  thisAttemptId: string,
  thisRecordedProviderId: string | null,
  evidenceProviderId: string | null,
  others: ReadonlyArray<{
    attemptId: string;
    providerId: string | null;
  }>,
): boolean {
  if (!evidenceProviderId) {
    return false;
  }
  const candidates = [
    { attemptId: thisAttemptId, providerId: thisRecordedProviderId },
    ...others.map((row) => ({
      attemptId: row.attemptId,
      providerId: row.providerId,
    })),
  ];
  const eligible = candidates.filter(
    (candidate) =>
      candidate.providerId === null ||
      candidate.providerId === evidenceProviderId,
  );
  return (
    eligible.length === 1 && eligible[0]!.attemptId === thisAttemptId
  );
}

function buildFingerprint(fields: {
  generationId: string;
  attemptId: string;
  accountId: string;
  runId: string;
  generationState: string;
  attemptState: string;
  statusRevision: number;
  reviewState: ReviewState;
  reviewRevision: number;
  requestSha256: string;
  evidenceSha256: string;
  providerId: string;
  reportedModel: string;
  reportedCostMicrousd: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  operationOutcome: string;
  generationFailureCode: string;
}): string {
  const stable = {
    generationId: fields.generationId,
    attemptId: fields.attemptId,
    accountId: fields.accountId,
    runId: fields.runId,
    generationState: fields.generationState,
    attemptState: fields.attemptState,
    statusRevision: fields.statusRevision,
    reviewState: fields.reviewState,
    reviewRevision: fields.reviewRevision,
    requestSha256: fields.requestSha256,
    evidenceSha256: fields.evidenceSha256,
    providerId: fields.providerId,
    reportedModel: fields.reportedModel,
    reportedCostMicrousd: fields.reportedCostMicrousd,
    promptTokens: fields.promptTokens,
    completionTokens: fields.completionTokens,
    totalTokens: fields.totalTokens,
    operationOutcome: fields.operationOutcome,
    generationFailureCode: fields.generationFailureCode,
  };
  return createHash('sha256').update(JSON.stringify(stable)).digest('hex');
}

export async function previewSavedRepair(
  database: Database,
  input: PreviewSavedRepairInput,
): Promise<SavedRepairPlan> {
  return database.db.transaction(async (tx) => {
    await tx.execute(sql`SET TRANSACTION READ ONLY`);

    const [genRow] = await tx
      .select({
        id: generation.id,
        attemptId: generation.attemptId,
        state: generation.state,
        statusRevision: generation.statusRevision,
        input: generation.input,
      })
      .from(generation)
      .where(eq(generation.id, input.generationId));

    if (!genRow) {
      planRefuse('generation_missing');
    }

    if (genRow.attemptId === null || genRow.attemptId === undefined) {
      planRefuse('attempt_mismatch');
    }
    if (genRow.attemptId !== input.attemptId) {
      planRefuse('attempt_mismatch');
    }

    const [attemptRow] = await tx
      .select({
        id: storytellerAttempt.id,
        generationId: storytellerAttempt.generationId,
        state: storytellerAttempt.state,
        accountId: storytellerAttempt.accountId,
        runId: storytellerAttempt.runId,
        providerId: storytellerAttempt.providerId,
      })
      .from(storytellerAttempt)
      .where(eq(storytellerAttempt.id, input.attemptId));

    if (!attemptRow || attemptRow.generationId !== genRow.id) {
      planRefuse('attempt_mismatch');
    }

    if (genRow.state !== 'uncertain') {
      planRefuse('generation_not_uncertain');
    }
    if (attemptRow.state !== 'uncertain') {
      planRefuse('attempt_not_uncertain');
    }

    if (
      input.expectedStatusRevision !== undefined &&
      genRow.statusRevision !== input.expectedStatusRevision
    ) {
      planRefuse('revision_mismatch');
    }

    const [reviewRow] = await tx
      .select({
        attemptId: storytellerDispatchReview.attemptId,
        generationId: storytellerDispatchReview.generationId,
        revision: storytellerDispatchReview.revision,
        state: storytellerDispatchReview.state,
        packetSha256: storytellerDispatchReview.packetSha256,
      })
      .from(storytellerDispatchReview)
      .where(eq(storytellerDispatchReview.attemptId, input.attemptId));

    if (!reviewRow || reviewRow.generationId !== genRow.id) {
      planRefuse('review_missing');
    }

    const otherReviews = await tx
      .select({
        attemptId: storytellerDispatchReview.attemptId,
        providerId: storytellerAttempt.providerId,
      })
      .from(storytellerDispatchReview)
      .innerJoin(
        storytellerAttempt,
        eq(storytellerDispatchReview.attemptId, storytellerAttempt.id),
      )
      .where(
        and(
          eq(storytellerDispatchReview.packetSha256, reviewRow.packetSha256),
          ne(storytellerDispatchReview.attemptId, input.attemptId),
          inArray(storytellerAttempt.state, ['uncertain', 'dispatched']),
        ),
      );

    const evidenceProviderId = evidenceEnvelopeProviderId(input.evidenceBytes);
    const uniquelyIdentified = evidenceIdentifiesOnlyThisAttempt(
      input.attemptId,
      attemptRow.providerId,
      evidenceProviderId,
      otherReviews,
    );
    const ambiguousPeer = otherReviews.some(
      (peer) =>
        peer.providerId === null || peer.providerId === attemptRow.providerId,
    );
    if (otherReviews.length > 0 && (!uniquelyIdentified || ambiguousPeer)) {
      planRefuse('ambiguous_evidence');
    }

    let proposed;
    try {
      proposed = inspectSavedInvalidRepairResponse({
        generationId: genRow.id,
        attemptId: input.attemptId,
        generationAttemptId: genRow.attemptId,
        task: genRow.input as StorytellerTask,
        reviewedPacketSha256: reviewRow.packetSha256,
        reviewState: reviewRow.state as ReviewState,
        evidenceBytes: input.evidenceBytes,
        recordedProviderId: attemptRow.providerId,
      });
    } catch (error) {
      if (error instanceof SavedRepairInspectionRefusal) {
        throw error;
      }
      throw error;
    }

    const planBody = {
      generationId: genRow.id,
      attemptId: input.attemptId,
      accountId: attemptRow.accountId,
      runId: attemptRow.runId,
      generationState: genRow.state,
      attemptState: attemptRow.state,
      statusRevision: genRow.statusRevision,
      reviewState: reviewRow.state as ReviewState,
      reviewRevision: reviewRow.revision,
      requestSha256: proposed.requestSha256,
      evidenceSha256: proposed.evidenceSha256,
      providerId: proposed.providerId,
      reportedModel: proposed.reportedModel,
      reportedCostMicrousd: proposed.usage.reportedCostMicrousd.toString(),
      promptTokens: proposed.usage.promptTokens,
      completionTokens: proposed.usage.completionTokens,
      totalTokens: proposed.usage.totalTokens,
      operationOutcome: proposed.operationOutcome,
      generationFailureCode: proposed.generationOutcome.failureCode,
    };

    const fingerprint = buildFingerprint(planBody);

    return Object.freeze({
      disposition: 'plan' as const,
      ...planBody,
      fingerprint,
    });
  });
}