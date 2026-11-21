import { createHash, randomUUID } from 'node:crypto';
import { and, eq, gt, gte, isNull, or, sql } from 'drizzle-orm';
import type { Database } from '@offscreen/db';
import { generation } from '@offscreen/db/generation-schema';
import { storyLaunch } from '@offscreen/db/launch-schema';
import { enqueue } from '@offscreen/db/outbox';
import type { Transaction } from '@offscreen/db/outbox';
import { outbox } from '@offscreen/db/outbox-schema';
import {
  storytellerCurrentOwnerGrant,
  storytellerFunding,
  storytellerOperation,
  storytellerRun,
} from '@offscreen/db/storyteller-schema';
import { hashCanonicalJson } from '@offscreen/documents';
import {
  WRITER_MANDATORY_TOOL_NAMES,
  writerMissionCaptureV2OpeningSchema,
} from '@offscreen/storyteller/tasks';
import {
  insertWriterMissionParentStepInTransaction,
  type WriterMissionParentStepInsert,
  type WriterMissionRowInsert,
} from './writer-mission-store';

export const LAUNCH_WAKE_TOPIC = 'story.launch.v1';

const LAUNCH_SCRIPTED_PROFILE_HASH = createHash('sha256')
  .update('launch-scripted-profile.v1', 'utf8')
  .digest('hex');

const LAUNCH_MIN_MICROUSD = 250_000n;

const launchMissionBudgets = {
  maxModelRounds: 4,
  maxInputTokens: 8000,
  maxGeneratedTokens: 2000,
  maxMicrousd: '250000',
  deadlineMs: 120_000,
} as const;

export type AdmitLaunchWriterMissionInput = {
  ownerId: string;
  operationId: string;
  libraryRootHash: string;
  libraryRootRevision: number;
};

export type AdmitLaunchWriterMissionResult = {
  generationId: string;
  reservedStoryId: string;
  replayed: boolean;
};

type LockedLaunchRow = typeof storyLaunch.$inferSelect;

async function selectLaunchForUpdate(
  tx: Transaction,
  ownerId: string,
  operationId: string,
): Promise<LockedLaunchRow | undefined> {
  const rows = await tx
    .select()
    .from(storyLaunch)
    .where(
      and(
        eq(storyLaunch.ownerId, ownerId),
        eq(storyLaunch.operationId, operationId),
      ),
    )
    .for('update');
  return rows[0];
}

async function assertLaunchWakeOutbox(
  tx: Transaction,
  reservedStoryId: string,
): Promise<void> {
  const rows = await tx
    .select()
    .from(outbox)
    .where(eq(outbox.id, reservedStoryId));
  if (rows.length !== 1) {
    throw new Error('launch_wake_missing');
  }
  const notice = rows[0];
  if (
    !notice ||
    notice.topic !== LAUNCH_WAKE_TOPIC ||
    notice.operationId !== reservedStoryId
  ) {
    throw new Error('launch_wake_missing');
  }
}

async function loadAdmissibleGrant(
  tx: Transaction,
  ownerId: string,
  now: Date,
): Promise<{ accountId: string; runId: string }> {
  const rows = await tx
    .select({
      accountId: storytellerCurrentOwnerGrant.accountId,
      runId: storytellerCurrentOwnerGrant.runId,
    })
    .from(storytellerCurrentOwnerGrant)
    .innerJoin(
      storytellerFunding,
      eq(storytellerCurrentOwnerGrant.accountId, storytellerFunding.id),
    )
    .innerJoin(
      storytellerRun,
      and(
        eq(storytellerCurrentOwnerGrant.runId, storytellerRun.id),
        eq(storytellerRun.accountId, storytellerFunding.id),
      ),
    )
    .where(
      and(
        eq(storytellerCurrentOwnerGrant.userId, ownerId),
        eq(storytellerCurrentOwnerGrant.enabled, true),
        isNull(storytellerCurrentOwnerGrant.revokedAt),
        or(
          eq(storytellerCurrentOwnerGrant.noExpiry, true),
          gt(storytellerCurrentOwnerGrant.expiresAt, now),
        ),
        eq(storytellerFunding.stopped, false),
        gte(storytellerFunding.limitMicrousd, LAUNCH_MIN_MICROUSD),
        eq(storytellerRun.enabled, true),
        gte(storytellerRun.limitMicrousd, LAUNCH_MIN_MICROUSD),
      ),
    );
  if (rows.length !== 1) {
    throw new Error('launch_not_admitted');
  }
  const grant = rows[0];
  if (!grant) {
    throw new Error('launch_not_admitted');
  }
  return { accountId: grant.accountId, runId: grant.runId };
}

function buildLaunchWriterMissionCapture(input: {
  generationId: string;
  ownerId: string;
  reservedStoryId: string;
  reservedFirstPassageId: string;
  libraryRootHash: string;
  libraryRootRevision: number;
}) {
  const captureBody = {
    version: 'writer-mission.v2' as const,
    generationId: input.generationId,
    operationId: input.generationId,
    ownerId: input.ownerId,
    storyId: input.reservedStoryId,
    libraryRootHash: input.libraryRootHash,
    libraryRootRevision: input.libraryRootRevision,
    profileObjectHash: LAUNCH_SCRIPTED_PROFILE_HASH,
    skillObjectHashes: [] as string[],
    toolsAllowlist: [...WRITER_MANDATORY_TOOL_NAMES],
    sceneScope: {
      kind: 'opening' as const,
      reservedStoryId: input.reservedStoryId,
      reservedFirstPassageId: input.reservedFirstPassageId,
    },
    modelSelection: {
      provider: 'openrouter' as const,
      model: 'scripted-offline',
    },
    budgets: launchMissionBudgets,
  };
  const capturedRequestHash = hashCanonicalJson(captureBody);
  const capture = writerMissionCaptureV2OpeningSchema.parse({
    ...captureBody,
    capturedRequestHash,
  });
  return { capture, captureSha256: capturedRequestHash };
}

/** Admits one launch into a finite-budget writer mission under the launch row lock. */
export async function admitLaunchWriterMission(
  database: Database,
  input: AdmitLaunchWriterMissionInput,
): Promise<AdmitLaunchWriterMissionResult> {
  const now = new Date();

  return database.db.transaction(async (tx) => {
    const launch = await selectLaunchForUpdate(
      tx,
      input.ownerId,
      input.operationId,
    );
    if (!launch) {
      throw new Error('launch_not_found');
    }

    if (launch.generationId) {
      await assertLaunchWakeOutbox(tx, launch.reservedStoryId);
      return {
        generationId: launch.generationId,
        reservedStoryId: launch.reservedStoryId,
        replayed: true,
      };
    }

    if (launch.state !== 'pending') {
      throw new Error('launch_not_pending');
    }

    const grant = await loadAdmissibleGrant(tx, input.ownerId, now);
    const generationId = randomUUID();
    const missionId = randomUUID();
    const { capture, captureSha256 } = buildLaunchWriterMissionCapture({
      generationId,
      ownerId: input.ownerId,
      reservedStoryId: launch.reservedStoryId,
      reservedFirstPassageId: launch.reservedFirstPassageId,
      libraryRootHash: input.libraryRootHash,
      libraryRootRevision: input.libraryRootRevision,
    });

    await tx.insert(generation).values({
      id: generationId,
      ownerId: input.ownerId,
      kind: 'story-launch',
      state: 'pending',
      input: {
        launchOperationId: input.operationId,
        reservedStoryId: launch.reservedStoryId,
        libraryRootHash: input.libraryRootHash,
      },
      statusRevision: 0,
    });

    await tx.insert(storytellerOperation).values({
      generationId,
      accountId: grant.accountId,
      runId: grant.runId,
      ownerId: input.ownerId,
      purpose: 'story-launch',
      resources: {},
      state: 'open',
      maxModelRounds: 4,
      maxInputTokens: 8000,
      maxGeneratedTokens: 2000,
      maxReasoningTokens: 0,
      maxMicrousd: LAUNCH_MIN_MICROUSD,
    });

    const mission: WriterMissionRowInsert = {
      missionId,
      generationId,
      operationId: generationId,
      ownerId: input.ownerId,
      storyId: launch.reservedStoryId,
      captureSha256,
      libraryRootHash: input.libraryRootHash,
      libraryRootRevision: input.libraryRootRevision,
      state: 'captured',
      nextRevision: 1,
      budgetSnapshot: capture.budgets,
    };
    const step: WriterMissionParentStepInsert = {
      ordinal: 1,
      revision: 1,
      state: 'captured',
      requestCasHash: captureSha256,
    };
    await insertWriterMissionParentStepInTransaction(tx, mission, step);

    const updated = await tx
      .update(storyLaunch)
      .set({
        generationId,
        state: 'preparing',
        updatedAt: sql`clock_timestamp()`,
      })
      .where(
        and(
          eq(storyLaunch.ownerId, input.ownerId),
          eq(storyLaunch.operationId, input.operationId),
          eq(storyLaunch.state, 'pending'),
          isNull(storyLaunch.generationId),
        ),
      )
      .returning({ operationId: storyLaunch.operationId });
    if (updated.length !== 1) {
      throw new Error('launch_not_pending');
    }

    await enqueue(tx, {
      id: launch.reservedStoryId,
      topic: LAUNCH_WAKE_TOPIC,
      operationId: launch.reservedStoryId,
    });

    return {
      generationId,
      reservedStoryId: launch.reservedStoryId,
      replayed: false,
    };
  });
}