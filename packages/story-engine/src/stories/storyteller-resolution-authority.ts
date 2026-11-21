import {
  campaign,
  campaignSettings,
  gameActivity,
} from '@offscreen/db/campaign-schema';
import { and, eq } from 'drizzle-orm';
import { isDeepStrictEqual } from 'node:util';
import { generation } from '@offscreen/db/generation-schema';
import type {
  story,
  storyPassage} from '@offscreen/db/story-schema';
import {
  storyItem,
  storyResolution,
} from '@offscreen/db/story-schema';
import { interactionSubmissionSchema } from '@offscreen/contracts/interactions';
import type { Database } from '@offscreen/db';
import type { Transaction } from '@offscreen/db/outbox';
import { enqueue } from '@offscreen/db/outbox';
import type {
  PreparedStorytellerResolution,
  StorytellerResolutionContextSqlCapture,
  StorytellerResolutionFence,
} from './storyteller-resolution-contract';
import {
  incrementStoryViewVersion,
  lockOwnedStory,
  requireCurrentPassage,
} from './persistence';
import { StoryError } from './errors';
import { storytellerActivityContextFilter } from '../campaign/storyteller-activity-filter';
import { storytellerNoticeTopicForWake } from '../campaign/storyteller-wake';
import { insertStorytellerTask } from './storyteller-task-record';
import { activeSceneAnchorSchema } from './active-scene-anchor';
import { storyItemsSchema } from '@offscreen/contracts/stories';
import { campaignSettingsSchema } from '@offscreen/contracts/campaign';

function normalizeActiveSceneScope(scope: unknown) {
  if (scope === null || scope === undefined) {return null;}
  return activeSceneAnchorSchema.parse(scope);
}

/** Fast idempotent replay without CAS reads or story FOR UPDATE. */
export async function replayStorytellerResolutionIfMatching(
  database: Database,
  input: {
    ownerId: string;
    storyId: string;
    operationId: string;
    expectedRevision: number;
    submission: unknown;
  },
) {
  const submission = interactionSubmissionSchema.parse(input.submission);
  const [prior] = await database.db
    .select()
    .from(storyResolution)
    .where(
      and(
        eq(storyResolution.storyId, input.storyId),
        eq(storyResolution.operationId, input.operationId),
      ),
    );
  if (!prior) {return false;}
  if (
    prior.baseRevision !== input.expectedRevision ||
    !isDeepStrictEqual(prior.submission, submission)
  ) {
    throw new StoryError('conflict');
  }
  await database.db.transaction(async (tx) => {
    await enqueue(tx, {
      id: input.operationId,
      operationId: input.operationId,
      topic: await storytellerNoticeTopicForWake(tx, input.operationId),
    });
  });
  return true;
}

function assertStorytellerResolutionFence(
  current: typeof story.$inferSelect,
  active: typeof storyPassage.$inferSelect,
  source: typeof generation.$inferSelect,
  mechanics: typeof campaign.$inferSelect | undefined,
  items: unknown,
  commitments: StorytellerResolutionContextSqlCapture['commitments'],
  capturedSettings: unknown | null,
  fence: StorytellerResolutionFence,
) {
  if (current.revision !== fence.expectedRevision) {
    throw new StoryError('conflict');
  }
  if (current.viewVersion !== fence.viewVersion) {
    throw new StoryError('conflict');
  }
  if (
    current.documentRootHash !== fence.documentRootHash ||
    current.documentRootRevision !== fence.documentRootRevision
  ) {
    throw new StoryError('conflict');
  }
  if (
    !isDeepStrictEqual(
      normalizeActiveSceneScope(current.activeSceneScope),
      normalizeActiveSceneScope(fence.activeSceneScope),
    )
  ) {
    throw new StoryError('conflict');
  }
  if (!isDeepStrictEqual(current.continuityNotes, fence.notes)) {
    throw new StoryError('conflict');
  }
  if (!isDeepStrictEqual(current.premise, fence.premise)) {
    throw new StoryError('conflict');
  }
  if (active.id !== fence.activePassageId) {
    throw new StoryError('conflict');
  }
  if (active.contentDocumentHash !== fence.activeContentDocumentHash) {
    throw new StoryError('conflict');
  }
  if (
    fence.activeContentDocumentHash === null &&
    !isDeepStrictEqual(active.content, fence.activeInlineContent)
  ) {
    throw new StoryError('conflict');
  }
  if (active.sourceGenerationId !== fence.sourceGenerationId) {
    throw new StoryError('conflict');
  }
  if (
    (active.sourceGenerationPart ?? 'current') !== fence.sourceGenerationPart
  ) {
    throw new StoryError('conflict');
  }
  if (!isDeepStrictEqual(active.interaction, fence.activeInteraction)) {
    throw new StoryError('conflict');
  }
  if (active.transitionId !== fence.transitionId) {
    throw new StoryError('conflict');
  }
  if (
    source.id !== fence.sourceGeneration.id ||
    source.ownerId !== fence.sourceGeneration.ownerId ||
    source.kind !== fence.sourceGeneration.kind ||
    source.state !== fence.sourceGeneration.state ||
    !isDeepStrictEqual(source.input, fence.sourceGeneration.input) ||
    !isDeepStrictEqual(source.output, fence.sourceGeneration.output)
  ) {
    throw new StoryError('conflict');
  }
  if (mechanics?.character) {
    throw new StoryError('conflict');
  }
  const parsedItems = storyItemsSchema.parse(items);
  if (!isDeepStrictEqual(parsedItems, fence.contextSql.items)) {
    throw new StoryError('conflict');
  }
  if (mechanics) {
    if (mechanics.settingsRevision !== fence.contextSql.settingsRevision) {
      throw new StoryError('conflict');
    }
    if (mechanics.gameSecond !== fence.contextSql.gameSecond) {
      throw new StoryError('conflict');
    }
    if (
      !isDeepStrictEqual(
        mechanics.worldConditions,
        fence.contextSql.worldConditions,
      )
    ) {
      throw new StoryError('conflict');
    }
    if (
      !isDeepStrictEqual(
        mechanics.situationAuthorization,
        fence.contextSql.situationAuthorization,
      )
    ) {
      throw new StoryError('conflict');
    }
    if (mechanics.activeActivityId !== fence.contextSql.activeActivityId) {
      throw new StoryError('conflict');
    }
    if (
      !isDeepStrictEqual(
        mechanics.acceptedActivityPlan,
        fence.contextSql.acceptedActivityPlan,
      )
    ) {
      throw new StoryError('conflict');
    }
    if (
      capturedSettings === null ||
      !isDeepStrictEqual(capturedSettings, fence.contextSql.capturedSettings)
    ) {
      throw new StoryError('conflict');
    }
    if (!isDeepStrictEqual(commitments, fence.contextSql.commitments)) {
      throw new StoryError('conflict');
    }
  }
}

export async function commitStorytellerResolution(
  tx: Transaction,
  prepared: PreparedStorytellerResolution,
) {
  const { fence } = prepared;
  const current = await lockOwnedStory(tx, {
    ownerId: fence.ownerId,
    storyId: fence.storyId,
  });
  const [prior] = await tx
    .select()
    .from(storyResolution)
    .where(
      and(
        eq(storyResolution.storyId, fence.storyId),
        eq(storyResolution.operationId, fence.operationId),
      ),
    );
  if (prior) {
    if (
      prior.baseRevision !== fence.expectedRevision ||
      !isDeepStrictEqual(prior.submission, fence.submission)
    ) {
      throw new StoryError('conflict');
    }
    await enqueue(tx, {
      id: fence.operationId,
      operationId: fence.operationId,
      topic: await storytellerNoticeTopicForWake(tx, fence.operationId),
    });
    return;
  }
  const active = await requireCurrentPassage(tx, {
    storyId: fence.storyId,
    sequence: fence.expectedRevision,
  });
  const [source] = await tx
    .select()
    .from(generation)
    .where(eq(generation.id, fence.sourceGenerationId));
  if (!source) {throw new StoryError('conflict');}
  const [mechanics] = await tx
    .select()
    .from(campaign)
    .where(eq(campaign.storyId, fence.storyId));
  const items = await tx
    .select({
      key: storyItem.key,
      label: storyItem.label,
      holderKey: storyItem.holderKey,
    })
    .from(storyItem)
    .where(eq(storyItem.storyId, fence.storyId));
  const commitments = mechanics
    ? (
        await tx
          .select()
          .from(gameActivity)
          .where(
            storytellerActivityContextFilter({
              storyId: fence.storyId,
              activeActivityId: mechanics.activeActivityId,
            }),
          )
      ).map((record) => ({
        id: record.id,
        revision: record.revision,
        state: record.state,
        plan: record.plan,
        progress: record.progress,
      }))
    : [];
  const [captured] =
    mechanics && mechanics.settingsRevision !== null
      ? await tx
          .select({ settings: campaignSettings.settings })
          .from(campaignSettings)
          .where(
            and(
              eq(campaignSettings.storyId, fence.storyId),
              eq(campaignSettings.revision, mechanics.settingsRevision),
            ),
          )
      : [];
  const parsedSettings = captured
    ? campaignSettingsSchema.parse(captured.settings)
    : null;
  assertStorytellerResolutionFence(
    current,
    active,
    source,
    mechanics,
    items,
    commitments,
    parsedSettings,
    fence,
  );
  const [existing] = await tx
    .select()
    .from(storyResolution)
    .where(
      and(
        eq(storyResolution.storyId, fence.storyId),
        eq(storyResolution.baseRevision, fence.expectedRevision),
      ),
    );
  if (existing) {throw new StoryError('conflict');}
  await insertStorytellerTask(tx, {
    id: fence.operationId,
    ownerId: fence.ownerId,
    task: prepared.task,
  });
  await tx.insert(storyResolution).values({
    generationId: fence.operationId,
    storyId: fence.storyId,
    basePassageId: fence.activePassageId,
    baseRevision: fence.expectedRevision,
    operationId: fence.operationId,
    submission: fence.submission,
  });
  await incrementStoryViewVersion(tx, {
    storyId: fence.storyId,
    viewVersion: current.viewVersion + 1,
  });
}
