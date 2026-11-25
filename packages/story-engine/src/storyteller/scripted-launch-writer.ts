import { createHash } from 'node:crypto';
import { and, eq, sql } from 'drizzle-orm';
import type { Database } from '@offscreen/db';
import type { Transaction } from '@offscreen/db';
import { generation } from '@offscreen/story-persistence/generations';
import { storyLaunch } from '@offscreen/story-persistence/launch';
import {
  storytellerWriterMission,
  storytellerWriterStep,
} from '@offscreen/story-persistence/storyteller';

export type ScriptedLaunchWriterResult =
  | 'composing'
  | 'failed'
  | 'uncertain'
  | 'replayed';

const SCRIPTED_OPENING_SCENE_JSON = '{"kind":"scripted-opening-scene"}';
const SCRIPTED_OPENING_SCENE_CAS = createHash('sha256')
  .update(SCRIPTED_OPENING_SCENE_JSON, 'utf8')
  .digest('hex');

const LAUNCH_UNCERTAIN_EXPLANATION = 'launch writer dispatch uncertain';

type LaunchGenerationInput = {
  launchOperationId?: string;
  reservedStoryId?: string;
  libraryRootHash?: string;
  launchOutcome?: string;
};

type LaunchOutcome = 'scene' | 'fail' | 'uncertain' | 'unknown-dispatch';

function resolveLaunchOutcome(input: LaunchGenerationInput): LaunchOutcome {
  const raw = input.launchOutcome;
  if (raw === 'fail' || raw === 'uncertain' || raw === 'unknown-dispatch') {
    return raw;
  }
  return 'scene';
}

async function selectLaunchByReservedStoryIdForUpdate(
  tx: Transaction,
  reservedStoryId: string,
) {
  const rows = await tx
    .select()
    .from(storyLaunch)
    .where(eq(storyLaunch.reservedStoryId, reservedStoryId))
    .for('update');
  return rows[0];
}

async function loadWriterRound(
  database: Database,
  generationId: string,
  reservedStoryId: string,
) {
  const missionRows = await database.db
    .select()
    .from(storytellerWriterMission)
    .where(eq(storytellerWriterMission.generationId, generationId))
    .limit(1);
  const mission = missionRows[0];
  if (!mission) {
    throw new Error('launch_writer_mission_missing');
  }
  if (mission.storyId !== reservedStoryId) {
    throw new Error('launch_reserved_story_mismatch');
  }
  const stepRows = await database.db
    .select()
    .from(storytellerWriterStep)
    .where(
      and(
        eq(storytellerWriterStep.missionId, mission.id),
        eq(storytellerWriterStep.contextId, mission.id),
        eq(storytellerWriterStep.ordinal, 1),
      ),
    )
    .limit(1);
  const step = stepRows[0];
  if (!step) {
    throw new Error('launch_writer_step_missing');
  }
  return { mission, step };
}

async function settleSceneOutcome(
  tx: Transaction,
  missionId: string,
  stepRevision: number,
  ownerId: string,
  launchOperationId: string,
): Promise<'composing'> {
  await tx
    .update(storytellerWriterStep)
    .set({
      state: 'result-settled',
      resultCasHash: SCRIPTED_OPENING_SCENE_CAS,
      updatedAt: sql`clock_timestamp()`,
    })
    .where(
      and(
        eq(storytellerWriterStep.missionId, missionId),
        eq(storytellerWriterStep.contextId, missionId),
        eq(storytellerWriterStep.ordinal, 1),
        eq(storytellerWriterStep.revision, stepRevision),
        eq(storytellerWriterStep.state, 'captured'),
      ),
    );
  await tx
    .update(storytellerWriterMission)
    .set({ state: 'proposal-ready', updatedAt: sql`clock_timestamp()` })
    .where(eq(storytellerWriterMission.id, missionId));
  await tx
    .update(storyLaunch)
    .set({
      state: 'composing',
      updatedAt: sql`clock_timestamp()`,
    })
    .where(
      and(
        eq(storyLaunch.ownerId, ownerId),
        eq(storyLaunch.operationId, launchOperationId),
      ),
    );
  return 'composing';
}

async function settleFailOutcome(
  tx: Transaction,
  missionId: string,
  stepState: string,
  ownerId: string,
  launchOperationId: string,
): Promise<'failed'> {
  await tx
    .update(storytellerWriterMission)
    .set({ state: 'failed', updatedAt: sql`clock_timestamp()` })
    .where(eq(storytellerWriterMission.id, missionId));
  await tx
    .update(storyLaunch)
    .set({
      state: 'failed',
      publicReason: 'rejected',
      updatedAt: sql`clock_timestamp()`,
    })
    .where(
      and(
        eq(storyLaunch.ownerId, ownerId),
        eq(storyLaunch.operationId, launchOperationId),
      ),
    );
  if (stepState !== 'result-settled') {
    await tx
      .update(storytellerWriterStep)
      .set({ state: 'failed', updatedAt: sql`clock_timestamp()` })
      .where(
        and(
          eq(storytellerWriterStep.missionId, missionId),
          eq(storytellerWriterStep.contextId, missionId),
          eq(storytellerWriterStep.ordinal, 1),
        ),
      );
  }
  return 'failed';
}

async function settleUncertainOutcome(
  tx: Transaction,
  missionId: string,
  ownerId: string,
  launchOperationId: string,
): Promise<'uncertain'> {
  await tx
    .update(storytellerWriterMission)
    .set({ state: 'uncertain', updatedAt: sql`clock_timestamp()` })
    .where(eq(storytellerWriterMission.id, missionId));
  await tx
    .update(storyLaunch)
    .set({
      state: 'uncertain',
      uncertainExplanation: LAUNCH_UNCERTAIN_EXPLANATION,
      publicReason: null,
      updatedAt: sql`clock_timestamp()`,
    })
    .where(
      and(
        eq(storyLaunch.ownerId, ownerId),
        eq(storyLaunch.operationId, launchOperationId),
      ),
    );
  return 'uncertain';
}

/** Settles one scripted launch writer step from generation input.launchOutcome. */
export async function runScriptedLaunchWriter(
  database: Database,
  reservedStoryId: string,
): Promise<ScriptedLaunchWriterResult> {
  const launchRows = await database.db
    .select()
    .from(storyLaunch)
    .where(eq(storyLaunch.reservedStoryId, reservedStoryId))
    .limit(1);
  const launch = launchRows[0];
  if (!launch?.generationId) {
    throw new Error('launch_not_admitted');
  }

  const generationRows = await database.db
    .select()
    .from(generation)
    .where(eq(generation.id, launch.generationId))
    .limit(1);
  const generationRow = generationRows[0];
  if (!generationRow) {
    throw new Error('launch_generation_missing');
  }

  const launchInput = (generationRow.input ?? {}) as LaunchGenerationInput;
  const outcome = resolveLaunchOutcome(launchInput);
  const { mission, step } = await loadWriterRound(
    database,
    launch.generationId,
    reservedStoryId,
  );

  if (outcome === 'scene') {
    if (step.state === 'result-settled' || launch.state === 'composing') {
      return 'replayed';
    }
    return database.db.transaction(async (tx) => {
      const locked = await selectLaunchByReservedStoryIdForUpdate(
        tx,
        reservedStoryId,
      );
      if (!locked) {
        throw new Error('launch_not_found');
      }
      const stepRows = await tx
        .select()
        .from(storytellerWriterStep)
        .where(
          and(
            eq(storytellerWriterStep.missionId, mission.id),
            eq(storytellerWriterStep.contextId, mission.id),
            eq(storytellerWriterStep.ordinal, 1),
          ),
        )
        .for('update');
      const lockedStep = stepRows[0];
      if (!lockedStep) {
        throw new Error('launch_writer_step_missing');
      }
      if (
        lockedStep.state === 'result-settled' ||
        locked.state === 'composing'
      ) {
        return 'replayed';
      }
      return settleSceneOutcome(
        tx,
        mission.id,
        lockedStep.revision,
        locked.ownerId,
        locked.operationId,
      );
    });
  }

  if (outcome === 'fail') {
    if (launch.state === 'failed') {
      return 'replayed';
    }
    return database.db.transaction(async (tx) => {
      const locked = await selectLaunchByReservedStoryIdForUpdate(
        tx,
        reservedStoryId,
      );
      if (!locked) {
        throw new Error('launch_not_found');
      }
      if (locked.state === 'failed') {
        return 'replayed';
      }
      const stepRows = await tx
        .select()
        .from(storytellerWriterStep)
        .where(
          and(
            eq(storytellerWriterStep.missionId, mission.id),
            eq(storytellerWriterStep.contextId, mission.id),
            eq(storytellerWriterStep.ordinal, 1),
          ),
        )
        .for('update');
      const lockedStep = stepRows[0];
      if (!lockedStep) {
        throw new Error('launch_writer_step_missing');
      }
      return settleFailOutcome(
        tx,
        mission.id,
        lockedStep.state,
        locked.ownerId,
        locked.operationId,
      );
    });
  }

  if (launch.state === 'uncertain') {
    return 'replayed';
  }
  return database.db.transaction(async (tx) => {
    const locked = await selectLaunchByReservedStoryIdForUpdate(
      tx,
      reservedStoryId,
    );
    if (!locked) {
      throw new Error('launch_not_found');
    }
    if (locked.state === 'uncertain') {
      return 'replayed';
    }
    return settleUncertainOutcome(
      tx,
      mission.id,
      locked.ownerId,
      locked.operationId,
    );
  });
}