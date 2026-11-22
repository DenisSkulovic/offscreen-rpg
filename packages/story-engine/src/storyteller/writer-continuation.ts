import { createHash, randomUUID } from 'node:crypto';
import { and, eq, gt, gte, isNull, or, sql } from 'drizzle-orm';
import { generation } from '@offscreen/db/generation-schema';
import { enqueue } from '@offscreen/db/outbox';
import type { Transaction } from '@offscreen/db/outbox';
import { outbox } from '@offscreen/db/outbox-schema';
import { storyPassage, storySceneCheckpoint } from '@offscreen/db/story-schema';
import {
  storytellerCurrentOwnerGrant,
  storytellerFunding,
  storytellerOperation,
  storytellerRun,
  storytellerWriterMission,
} from '@offscreen/db/storyteller-schema';
import { hashCanonicalJson } from '@offscreen/documents';
import {
  WRITER_MANDATORY_TOOL_NAMES,
  writerMissionCaptureV3ContinuationSchema,
} from '@offscreen/storyteller/tasks';
import type { StoryRecord } from '../stories/persistence';
import type { CampaignRecord } from '../campaign/persistence';
import {
  insertWriterMissionParentStepInTransaction,
  type WriterMissionParentStepInsert,
  type WriterMissionRowInsert,
} from './writer-mission-store';

export const WRITER_SCENE_WAKE_TOPIC = 'writer.scene.v1';

const WRITER_SCENE_MIN_MICROUSD = 250_000n;

const WRITER_CONTINUATION_SCRIPTED_PROFILE_HASH = createHash('sha256')
  .update('writer-continuation-scripted-profile.v1', 'utf8')
  .digest('hex');

const writerContinuationMissionBudgets = {
  maxModelRounds: 4,
  maxInputTokens: 8000,
  maxGeneratedTokens: 2000,
  maxMicrousd: '250000',
  deadlineMs: 120_000,
} as const;

/** Explicit opt-in research delegation for newly admitted v3 continuation missions. */
export type WriterContinuationResearchGrant = Readonly<{
  maxConcurrentChildren: 1 | 2;
  maxMicrousdPerChild: number;
}>;

/** Server-owned continuation writer admission; never parsed from player request bodies. */
export type WriterContinuationAdmission =
  | Readonly<{ mode: 'scripted' }>
  | Readonly<{
      mode: 'provider';
      model: string;
      policyVersion: string;
    }>;

export const WRITER_CONTINUATION_ADMISSION_SCRIPTED: WriterContinuationAdmission =
  { mode: 'scripted' };

export function resolveWriterContinuationAdmission(
  admission?: WriterContinuationAdmission,
): WriterContinuationAdmission {
  return admission ?? WRITER_CONTINUATION_ADMISSION_SCRIPTED;
}

export type ScheduleWriterContinuationInput = Readonly<{
  storyId: string;
  operationId: string;
  ownerId: string;
  basePassageId: string;
  baseSceneSequence: number;
  baseCheckpointHash: string;
  baseRootHash: string;
  baseRootRevision: number;
  baseNarrativeRevision: number;
  baseCampaignStateRevision: number;
  controllingIntentOrReceiptId: string;
  researchGrant?: WriterContinuationResearchGrant;
  admission?: WriterContinuationAdmission;
}>;

export type ScheduleWriterContinuationResult = Readonly<{
  missionId: string;
  generationId: string;
  replayed: boolean;
}>;

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
        gte(storytellerFunding.limitMicrousd, WRITER_SCENE_MIN_MICROUSD),
        eq(storytellerRun.enabled, true),
        gte(storytellerRun.limitMicrousd, WRITER_SCENE_MIN_MICROUSD),
      ),
    );
  if (rows.length !== 1) {
    throw new Error('writer_scene_not_admitted');
  }
  const grant = rows[0];
  if (!grant) {
    throw new Error('writer_scene_not_admitted');
  }
  return { accountId: grant.accountId, runId: grant.runId };
}

export function buildWriterContinuationCapture(input: {
  generationId: string;
  ownerId: string;
  schedule: ScheduleWriterContinuationInput;
}) {
  const researchGrant = input.schedule.researchGrant;
  if (
    researchGrant !== undefined &&
    (researchGrant.maxConcurrentChildren < 1 ||
      researchGrant.maxConcurrentChildren > 2 ||
      !Number.isFinite(researchGrant.maxMicrousdPerChild) ||
      researchGrant.maxMicrousdPerChild <= 0)
  ) {
    throw new Error('writer_research_grant_invalid');
  }
  const admission = resolveWriterContinuationAdmission(input.schedule.admission);
  let modelSelection: { provider: 'openrouter'; model: string };
  let providerPolicy: { version: string; model: string } | undefined;
  if (admission.mode === 'scripted') {
    modelSelection = { provider: 'openrouter', model: 'scripted-offline' };
  } else {
    const model = admission.model.trim();
    const policyVersion = admission.policyVersion.trim();
    if (model.length === 0) {
      throw new Error('writer_continuation_provider_model_required');
    }
    if (policyVersion.length === 0) {
      throw new Error('writer_continuation_provider_policy_version_required');
    }
    modelSelection = { provider: 'openrouter', model };
    providerPolicy = { version: policyVersion, model };
  }
  const toolsAllowlist =
    researchGrant === undefined
      ? ([...WRITER_MANDATORY_TOOL_NAMES] as const)
      : ([...WRITER_MANDATORY_TOOL_NAMES, 'research.delegate'] as const);
  const captureBody = {
    version: 'writer-mission.v3' as const,
    generationId: input.generationId,
    operationId: input.generationId,
    ownerId: input.ownerId,
    storyId: input.schedule.storyId,
    libraryRootHash: input.schedule.baseRootHash,
    libraryRootRevision: input.schedule.baseRootRevision,
    profileObjectHash: WRITER_CONTINUATION_SCRIPTED_PROFILE_HASH,
    skillObjectHashes: [] as string[],
    toolsAllowlist,
    sceneScope: {
      kind: 'continuation' as const,
      baseSceneSequence: input.schedule.baseSceneSequence,
      basePassageId: input.schedule.basePassageId,
      baseCheckpointHash: input.schedule.baseCheckpointHash,
      baseRootHash: input.schedule.baseRootHash,
      baseRootRevision: input.schedule.baseRootRevision,
      baseNarrativeRevision: input.schedule.baseNarrativeRevision,
      baseCampaignStateRevision: input.schedule.baseCampaignStateRevision,
      controllingIntentOrReceiptId:
        input.schedule.controllingIntentOrReceiptId,
      scenarioKind: 'narrative-only' as const,
    },
    modelSelection,
    ...(providerPolicy === undefined ? {} : { providerPolicy }),
    budgets: writerContinuationMissionBudgets,
  };
  const capturedRequestHash = hashCanonicalJson(captureBody);
  const capture = writerMissionCaptureV3ContinuationSchema.parse({
    ...captureBody,
    capturedRequestHash,
  });
  return { capture, captureSha256: capturedRequestHash };
}

async function findExistingWriterSceneMission(
  tx: Transaction,
  storyId: string,
  controllingIntentOrReceiptId: string,
): Promise<string | undefined> {
  const rows = await tx
    .select({ missionId: storytellerWriterMission.id })
    .from(storytellerWriterMission)
    .innerJoin(generation, eq(storytellerWriterMission.generationId, generation.id))
    .where(
      and(
        eq(storytellerWriterMission.storyId, storyId),
        eq(generation.kind, 'writer-scene'),
        sql`${generation.input} ->> 'controllingIntentOrReceiptId' = ${controllingIntentOrReceiptId}`,
      ),
    )
    .limit(1);
  return rows[0]?.missionId;
}

async function assertWriterSceneWakeOutbox(
  tx: Transaction,
  missionId: string,
): Promise<void> {
  const rows = await tx
    .select()
    .from(outbox)
    .where(eq(outbox.id, missionId));
  if (rows.length !== 1) {
    throw new Error('writer_scene_wake_missing');
  }
  const notice = rows[0];
  if (
    !notice ||
    notice.topic !== WRITER_SCENE_WAKE_TOPIC ||
    notice.operationId !== missionId
  ) {
    throw new Error('writer_scene_wake_missing');
  }
}

/** Enqueue one writer-scene mission when a narrative intent settles; idempotent per controlling execution. */
export async function scheduleWriterContinuation(
  tx: Transaction,
  input: ScheduleWriterContinuationInput,
): Promise<ScheduleWriterContinuationResult> {
  const existingMissionId = await findExistingWriterSceneMission(
    tx,
    input.storyId,
    input.controllingIntentOrReceiptId,
  );
  if (existingMissionId) {
    await assertWriterSceneWakeOutbox(tx, existingMissionId);
    const [mission] = await tx
      .select({ generationId: storytellerWriterMission.generationId })
      .from(storytellerWriterMission)
      .where(eq(storytellerWriterMission.id, existingMissionId))
      .limit(1);
    if (!mission) {
      throw new Error('writer_scene_mission_missing');
    }
    return {
      missionId: existingMissionId,
      generationId: mission.generationId,
      replayed: true,
    };
  }

  const now = new Date();
  const grant = await loadAdmissibleGrant(tx, input.ownerId, now);
  const generationId = randomUUID();
  const missionId = randomUUID();
  const { capture, captureSha256 } = buildWriterContinuationCapture({
    generationId,
    ownerId: input.ownerId,
    schedule: input,
  });

  await tx.insert(generation).values({
    id: generationId,
    ownerId: input.ownerId,
    kind: 'writer-scene',
    state: 'pending',
    input: {
      scheduleOperationId: input.operationId,
      storyId: input.storyId,
      controllingIntentOrReceiptId: input.controllingIntentOrReceiptId,
      writerMissionCapture: capture,
    },
    statusRevision: 0,
  });

  await tx.insert(storytellerOperation).values({
    generationId,
    accountId: grant.accountId,
    runId: grant.runId,
    ownerId: input.ownerId,
    purpose: 'writer-scene',
    resources: {},
    state: 'open',
    maxModelRounds: 4,
    maxInputTokens: 8000,
    maxGeneratedTokens: 2000,
    maxReasoningTokens: 0,
    maxMicrousd: WRITER_SCENE_MIN_MICROUSD,
  });

  const mission: WriterMissionRowInsert = {
    missionId,
    generationId,
    operationId: generationId,
    ownerId: input.ownerId,
    storyId: input.storyId,
    captureSha256,
    libraryRootHash: input.baseRootHash,
    libraryRootRevision: input.baseRootRevision,
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

  await enqueue(tx, {
    id: missionId,
    topic: WRITER_SCENE_WAKE_TOPIC,
    operationId: missionId,
  });

  return { missionId, generationId, replayed: false };
}

export async function resolveWriterContinuationBases(
  tx: Transaction,
  current: StoryRecord,
  state: CampaignRecord,
): Promise<Omit<ScheduleWriterContinuationInput, 'operationId' | 'ownerId' | 'controllingIntentOrReceiptId'>> {
  const [checkpoint] = await tx
    .select({
      checkpointHash: storySceneCheckpoint.checkpointHash,
      passageId: storySceneCheckpoint.passageId,
      sceneSequence: storySceneCheckpoint.sceneSequence,
    })
    .from(storySceneCheckpoint)
    .where(
      and(
        eq(storySceneCheckpoint.storyId, current.id),
        eq(storySceneCheckpoint.sceneSequence, current.revision),
      ),
    )
    .limit(1);
  if (!checkpoint) {
    throw new Error('writer_scene_checkpoint_missing');
  }
  const [passage] = await tx
    .select({ id: storyPassage.id })
    .from(storyPassage)
    .where(
      and(
        eq(storyPassage.storyId, current.id),
        eq(storyPassage.sequence, current.revision),
      ),
    )
    .limit(1);
  if (!passage) {
    throw new Error('writer_scene_passage_missing');
  }
  if (current.documentRootHash === null || current.documentRootRevision <= 0) {
    throw new Error('writer_scene_root_missing');
  }
  return {
    storyId: current.id,
    basePassageId: passage.id,
    baseSceneSequence: checkpoint.sceneSequence,
    baseCheckpointHash: checkpoint.checkpointHash,
    baseRootHash: current.documentRootHash,
    baseRootRevision: current.documentRootRevision,
    baseNarrativeRevision: current.revision,
    baseCampaignStateRevision: state.settingsRevision,
  };
}