import { randomUUID } from 'node:crypto';
import { isDeepStrictEqual } from 'node:util';
import { and, eq, lte } from 'drizzle-orm';
import type { Database } from '@offscreen/db';
import {
  campaign,
  campaignSettings,
  gameActionExecution,
  gameActivity,
  gameOffer,
  worldObligation,
} from '@offscreen/db/campaign-schema';
import {
  story,
  storyDocumentCommit,
  storyItem,
  storyPassage,
  storyResolution,
  storySceneCheckpoint,
} from '@offscreen/db/story-schema';
import {
  DocumentStorageError,
  documentManifestSchema,
  hashCanonicalJson,
  type DocumentManifest,
  type DocumentStore,
  type SceneCheckpoint,
  type SceneCheckpointV2,
} from '@offscreen/documents';
import {
  makeValidatedAppearanceForPublication,
  readOptionalSceneAppearance,
} from '@offscreen/contracts/stories';
import { enqueue, type Transaction } from '@offscreen/db/outbox';
import { knowledgeIndexTopic } from './documents';
import { StoryError, parseStoryIdentifier } from './errors';
import { readDatabaseClockMs } from './persistence';
import {
  checkpointWriterStore,
  insertStagedSceneCheckpointSelector,
  readSceneCheckpointForRow,
  sceneCheckpointIdentityMatches,
  stageSceneCheckpointObject,
  type SceneCheckpointWriterStore,
} from './scene-checkpoint';
import {
  buildV2ForkRows,
  gameOfferPlansColumnValue,
  SettingsIncompleteError,
} from './fork-v2-reconstruct.js';
import { ForkStateError } from './fork-state.js';
import {
  assertReconstructedV2Matches,
  stageV2ForkCheckpoint,
} from './fork-reconstruct.js';

type ForkInput = Readonly<{
  ownerId: string;
  sourceStoryId: string;
  forkStoryId: string;
  expectedRevision: number;
  sourcePassageId?: string;
  sourceCheckpointHash?: string;
}>;

type ForkStore = SceneCheckpointWriterStore &
  Pick<DocumentStore, 'putManifest' | 'readManifest' | 'readLibraryRoot'>;

function forkConflict(reason: string): never {
  throw new StoryError('conflict', `fork_${reason}`);
}

function remapInitialScene(
  scope: unknown,
  sourcePassageId: string,
  forkPassageId: string,
) {
  if (scope === null) return null;
  const expected = {
    version: 'active-scene-anchor.v1',
    fromSequence: 1,
    requiredPassageIds: [sourcePassageId],
  };
  if (!isDeepStrictEqual(scope, expected)) {
    forkConflict('active_scene_remap_required');
  }
  return { ...expected, requiredPassageIds: [forkPassageId] };
}

function forkDocumentStore(store: object | undefined): ForkStore | undefined {
  const checkpoint = store ? checkpointWriterStore(store) : undefined;
  if (!checkpoint) {
    return undefined;
  }
  if (typeof (store as ForkStore).putManifest !== 'function') {
    return undefined;
  }
  return store as ForkStore;
}

function remapCheckpointScene(
  scope: unknown,
  sourcePassageId: string,
  forkPassageId: string,
) {
  if (scope === null || scope === undefined) return null;
  if (
    typeof scope !== 'object' ||
    scope === null ||
    !('version' in scope) ||
    scope.version !== 'active-scene-anchor.v1' ||
    !('requiredPassageIds' in scope) ||
    !Array.isArray(scope.requiredPassageIds) ||
    scope.requiredPassageIds.length !== 1 ||
    scope.requiredPassageIds[0] !== sourcePassageId
  ) {
    forkConflict('active_scene_remap_required');
  }
  return {
    ...scope,
    fromSequence: 1,
    requiredPassageIds: [forkPassageId],
  };
}

function remapForkAppearance(
  value: unknown,
  storyId: string,
  passageId: string,
) {
  const stored = readOptionalSceneAppearance(value);
  if (!stored) return undefined;
  return makeValidatedAppearanceForPublication({
    storyId,
    passageId,
    candidate: stored.directive,
  });
}

async function writeBranchManifest(
  store: ForkStore,
  args: {
    forkStoryId: string;
    operationId: string;
    sourceRootHash: string | null;
  },
): Promise<{ rootHash: string | null; rootRevision: number }> {
  if (args.sourceRootHash === null) {
    return { rootHash: null, rootRevision: 0 };
  }
  try {
    const libraryRoot = await store.readLibraryRoot(args.sourceRootHash);
    if (libraryRoot.format === 'offscreen.library-root.v2') {
      return { rootHash: args.sourceRootHash, rootRevision: 1 };
    }
  } catch (error) {
    if (error instanceof DocumentStorageError) {
      if (error.code === 'corrupt') {
        // v1 manifest root — copy entries below.
      } else {
        throw new StoryError(
          error.code === 'unavailable' ? 'unavailable' : 'invalid',
          error.code === 'unavailable'
            ? 'checkpoint_store_unavailable'
            : 'missing_canon_root',
        );
      }
    } else {
      throw error;
    }
  }
  let ancestor: DocumentManifest;
  try {
    ancestor = await store.readManifest(args.sourceRootHash);
  } catch (error) {
    if (error instanceof DocumentStorageError) {
      throw new StoryError(
        error.code === 'unavailable' ? 'unavailable' : 'invalid',
        error.code === 'unavailable'
          ? 'checkpoint_store_unavailable'
          : 'missing_canon_root',
      );
    }
    throw error;
  }
  const branch = documentManifestSchema.parse({
    format: 'offscreen.manifest.v1',
    campaignId: args.forkStoryId,
    revision: 1,
    previousRootHash: null,
    authorOperationId: args.operationId,
    entries: ancestor.entries,
  });
  try {
    return {
      rootHash: await store.putManifest(branch),
      rootRevision: 1,
    };
  } catch (error) {
    if (error instanceof DocumentStorageError) {
      throw new StoryError(
        error.code === 'unavailable' ? 'unavailable' : 'invalid',
        'checkpoint_store_unavailable',
      );
    }
    throw error;
  }
}

function isUnstartedCampaign(state: typeof campaign.$inferSelect) {
  return (
    state.character === null &&
    state.content === null &&
    state.location === null &&
    state.gameSecond === 0 &&
    state.acceptedActivityPlan === null &&
    state.offer === null &&
    state.activeActivityId === null &&
    state.activeActionOperationId === null &&
    isDeepStrictEqual(state.storyFacts, []) &&
    isDeepStrictEqual(state.activityOccurrences, []) &&
    isDeepStrictEqual(state.holds, []) &&
    isDeepStrictEqual(state.worldConditions, [])
  );
}

async function forkLiveRevisionOne(
  tx: Transaction,
  input: ForkInput,
  source: typeof story.$inferSelect,
) {
  const sourceStoryId = source.id;
  const forkStoryId = parseStoryIdentifier(input.forkStoryId);
  if (source.revision !== input.expectedRevision || source.revision !== 1) {
    forkConflict('unsupported_revision');
  }
  const [sourcePassage] = await tx
    .select()
    .from(storyPassage)
    .where(
      and(
        eq(storyPassage.storyId, sourceStoryId),
        eq(storyPassage.sequence, source.revision),
      ),
    );
  if (!sourcePassage) forkConflict('missing_checkpoint');
  const [campaignState] = await tx
    .select()
    .from(campaign)
    .where(eq(campaign.storyId, sourceStoryId));
  const [resolution] = await tx
    .select({ id: storyResolution.generationId })
    .from(storyResolution)
    .where(eq(storyResolution.storyId, sourceStoryId))
    .limit(1);
  const [obligation] = await tx
    .select({ id: worldObligation.id })
    .from(worldObligation)
    .where(eq(worldObligation.storyId, sourceStoryId))
    .limit(1);
  if (resolution) forkConflict('pending_resolution');
  if (obligation) forkConflict('world_obligations');
  if (campaignState !== undefined && !isUnstartedCampaign(campaignState)) {
    forkConflict('mutable_campaign_state');
  }
  if (
    sourcePassage.waitPlan !== null ||
    sourcePassage.decisionPlan !== null ||
    sourcePassage.dueAt !== null ||
    sourcePassage.responseDueAt !== null
  ) {
    forkConflict('timed_checkpoint');
  }
  if (
    !isDeepStrictEqual(source.continuityNotes, source.storyteller ? [] : null)
  ) {
    forkConflict('continuity_remap_required');
  }

  const forkPassageId = randomUUID();
  const activeSceneScope = remapInitialScene(
    source.activeSceneScope,
    sourcePassage.id,
    forkPassageId,
  );
  const inserted = await tx
    .insert(story)
    .values({
      id: forkStoryId,
      ownerId: input.ownerId,
      source: source.source,
      premise: source.premise,
      storyteller: source.storyteller,
      execution: source.execution,
      usagePolicy: source.usagePolicy,
      continuityNotes: source.continuityNotes,
      activeSceneScope,
      forkedFromStoryId: sourceStoryId,
      forkedFromPassageId: sourcePassage.id,
      forkedFromSequence: source.revision,
    })
    .onConflictDoNothing()
    .returning({ id: story.id });
  if (!inserted.length) forkConflict('destination_in_use');

  const items = await tx
    .select()
    .from(storyItem)
    .where(eq(storyItem.storyId, sourceStoryId));
  if (items.length) {
    await tx.insert(storyItem).values(
      items.map((item) => ({
        storyId: forkStoryId,
        key: item.key,
        label: item.label,
        holderKey: item.holderKey,
      })),
    );
  }
  if (campaignState) {
    const settings = await tx
      .select()
      .from(campaignSettings)
      .where(eq(campaignSettings.storyId, sourceStoryId));
    if (
      !settings.length ||
      !settings.some(
        (entry) => entry.revision === campaignState.settingsRevision,
      )
    ) {
      forkConflict('settings_incomplete');
    }
    await tx.insert(campaignSettings).values(
      settings.map((entry) => ({
        storyId: forkStoryId,
        revision: entry.revision,
        settings: entry.settings,
        profile: entry.profile,
      })),
    );
    await tx.insert(campaign).values({
      ...campaignState,
      storyId: forkStoryId,
    });
  }
  await tx.insert(storyPassage).values({
    ...sourcePassage,
    id: forkPassageId,
    storyId: forkStoryId,
    transitionId: null,
    // Lineage retains the source passage. Reusing its generation would make
    // one paid attempt appear as spend on two independent stories.
    sourceGenerationId: null,
    sourceGenerationPart: null,
    createdAt: new Date(),
  });
}

type V2ForkPrepared = Readonly<{
  mappedCheckpoint: SceneCheckpointV2;
  staged: Awaited<ReturnType<typeof stageSceneCheckpointObject>>;
  sourcePassageId: string;
  sourceSceneSequence: number;
}>;

function settingsIncompleteConflict(error: unknown): never {
  if (error instanceof SettingsIncompleteError) {
    forkConflict('settings_incomplete');
  }
  throw error;
}

async function forkFromSceneCheckpointV2(
  tx: Transaction,
  input: ForkInput,
  source: typeof story.$inferSelect,
  sourcePassage: typeof storyPassage.$inferSelect,
  referenced: Awaited<ReturnType<typeof readSceneCheckpointForRow>>,
  prepared: V2ForkPrepared,
) {
  const forkStoryId = parseStoryIdentifier(input.forkStoryId);
  const checkpoint = prepared.mappedCheckpoint;
  if (
    input.sourcePassageId &&
    input.sourcePassageId !== prepared.sourcePassageId
  ) {
    throw new StoryError('invalid', 'checkpoint_passage_mismatch');
  }
  if (
    input.sourceCheckpointHash &&
    input.sourceCheckpointHash !== referenced.checkpointHash
  ) {
    throw new StoryError('invalid', 'checkpoint_hash_mismatch');
  }
  const appearance = remapForkAppearance(
    sourcePassage.appearance,
    forkStoryId,
    checkpoint.passageId,
  );
  const settings = await tx
    .select()
    .from(campaignSettings)
    .where(
      and(
        eq(campaignSettings.storyId, source.id),
        lte(
          campaignSettings.revision,
          checkpoint.fictionalState.mechanicsAbsent
            ? 0
            : checkpoint.fictionalState.settingsRevision,
        ),
      ),
    );
  if (checkpoint.fictionalState.mechanicsAbsent) {
    forkConflict('checkpoint_version_unsupported');
  }
  const now = await readDatabaseClockMs(tx, source.id);
  let rows;
  try {
    rows = buildV2ForkRows({
      checkpoint,
      settingsRows: settings,
      forkStoryId,
      ownerId: input.ownerId,
      sourceStoryId: source.id,
      sourcePassageId: prepared.sourcePassageId,
      sourceSceneSequence: prepared.sourceSceneSequence,
      checkpointHash: referenced.checkpointHash,
      clockAnchorAt: new Date(now),
    });
  } catch (error) {
    if (error instanceof ForkStateError) {
      if (
        error.code === 'obligation_not_representable' ||
        error.code === 'action_not_representable'
      ) {
        forkConflict(error.code);
      }
      throw new StoryError('invalid', error.code);
    }
    settingsIncompleteConflict(error);
  }
  const inserted = await tx
    .insert(story)
    .values({
      ...rows.story,
      storyteller: source.storyteller,
      execution: source.execution,
      usagePolicy: source.usagePolicy,
      revision: 1,
    })
    .onConflictDoNothing()
    .returning({ id: story.id });
  if (!inserted.length) forkConflict('destination_in_use');
  if (rows.storyItems.length) {
    await tx.insert(storyItem).values(rows.storyItems);
  }
  if (rows.campaignSettings.length) {
    await tx.insert(campaignSettings).values(rows.campaignSettings);
  }
  await tx.insert(campaign).values(rows.campaign);
  for (const offer of rows.gameOffers) {
    await tx.insert(gameOffer).values({
      ...offer,
      plans: gameOfferPlansColumnValue(offer.plans),
    });
  }
  for (const activity of rows.gameActivities) {
    await tx.insert(gameActivity).values(activity);
  }
  for (const obligation of rows.worldObligations) {
    await tx.insert(worldObligation).values(obligation);
  }
  for (const execution of rows.gameActionExecutions) {
    await tx.insert(gameActionExecution).values(execution);
  }
  await tx.insert(storyPassage).values({
    ...rows.storyPassage,
    appearance: appearance ?? null,
  });
  if (rows.storyDocumentCommit) {
    await tx.insert(storyDocumentCommit).values(rows.storyDocumentCommit);
  }
  await insertStagedSceneCheckpointSelector(tx, {
    ownerId: input.ownerId,
    operationId: forkStoryId,
    staged: prepared.staged,
  });
  await assertReconstructedV2Matches(
    tx,
    forkStoryId,
    checkpoint.fictionalState,
  );
}

async function forkFromSceneCheckpoint(
  tx: Transaction,
  input: ForkInput,
  source: typeof story.$inferSelect,
  sourcePassage: typeof storyPassage.$inferSelect,
  store: ForkStore,
  referenced: Awaited<ReturnType<typeof readSceneCheckpointForRow>>,
  preparedV2?: V2ForkPrepared,
) {
  const forkStoryId = parseStoryIdentifier(input.forkStoryId);
  const checkpoint = referenced.checkpoint;
  if (input.sourcePassageId && input.sourcePassageId !== checkpoint.passageId) {
    throw new StoryError('invalid', 'checkpoint_passage_mismatch');
  }
  if (
    input.sourceCheckpointHash &&
    input.sourceCheckpointHash !== referenced.checkpointHash
  ) {
    throw new StoryError('invalid', 'checkpoint_hash_mismatch');
  }
  if (checkpoint.format === 'offscreen.scene-checkpoint.v2') {
    if (!preparedV2) {
      forkConflict('checkpoint_version_unsupported');
    }
    await forkFromSceneCheckpointV2(
      tx,
      input,
      source,
      sourcePassage,
      referenced,
      preparedV2,
    );
    return;
  }
  if (checkpoint.format !== 'offscreen.scene-checkpoint.v1') {
    forkConflict('checkpoint_version_unsupported');
  }
  const mechanics = checkpoint.mechanics;
  if (!mechanics.mechanicsAbsent) {
    if (
      mechanics.holds.length > 0 ||
      mechanics.offer !== null ||
      mechanics.acceptedActivityPlan !== null ||
      mechanics.activeActivityId !== null ||
      mechanics.activeActionOperationId !== null
    ) {
      forkConflict('unsupported_active_work');
    }
    if (
      !isDeepStrictEqual(mechanics.continuityNotes, null) &&
      !isDeepStrictEqual(mechanics.continuityNotes, [])
    ) {
      forkConflict('continuity_remap_required');
    }
  }

  const forkPassageId = randomUUID();
  const forkInteractionId = checkpoint.passage.interaction
    ? randomUUID()
    : null;
  const activeSceneScope = mechanics.mechanicsAbsent
    ? remapInitialScene(
        source.activeSceneScope,
        checkpoint.passageId,
        forkPassageId,
      )
    : remapCheckpointScene(
        mechanics.activeSceneScope,
        checkpoint.passageId,
        forkPassageId,
      );
  const branch = await writeBranchManifest(store, {
    forkStoryId,
    operationId: forkStoryId,
    sourceRootHash: checkpoint.canon.rootHash,
  });
  const forkInteraction = checkpoint.passage.interaction
    ? {
        id: forkInteractionId,
        specification: checkpoint.passage.interaction.specification,
      }
    : null;
  const forkCheckpoint = {
    ...checkpoint,
    storyId: forkStoryId,
    passageId: forkPassageId,
    sceneSequence: 1,
    transitionId: null,
    canon: {
      rootHash: branch.rootHash,
      rootRevision: branch.rootRevision,
    },
    ancestor:
      checkpoint.canon.rootHash === null
        ? { storyId: null, rootHash: null, rootRevision: null }
        : {
            storyId: source.id,
            rootHash: checkpoint.canon.rootHash,
            rootRevision: checkpoint.canon.rootRevision,
          },
    passage: {
      ...checkpoint.passage,
      interaction: forkInteraction,
    },
    mechanics: mechanics.mechanicsAbsent
      ? mechanics
      : {
          ...mechanics,
          activeSceneScope,
        },
  };
  const staged = await stageSceneCheckpointObject(store, forkCheckpoint);
  const appearance = remapForkAppearance(
    sourcePassage.appearance,
    forkStoryId,
    forkPassageId,
  );
  const inserted = await tx
    .insert(story)
    .values({
      id: forkStoryId,
      ownerId: input.ownerId,
      source: checkpoint.source,
      premise: checkpoint.premise,
      storyteller: source.storyteller,
      execution: source.execution,
      usagePolicy: source.usagePolicy,
      continuityNotes: mechanics.mechanicsAbsent
        ? null
        : mechanics.continuityNotes,
      activeSceneScope,
      documentRootHash: branch.rootHash,
      documentRootRevision: branch.rootRevision,
      forkedFromStoryId: source.id,
      forkedFromPassageId: checkpoint.passageId,
      forkedFromSequence: checkpoint.sceneSequence,
    })
    .onConflictDoNothing()
    .returning({ id: story.id });
  if (!inserted.length) forkConflict('destination_in_use');

  if (!mechanics.mechanicsAbsent && mechanics.items.length) {
    await tx.insert(storyItem).values(
      mechanics.items.map((item) => ({
        storyId: forkStoryId,
        key: item.key,
        label: item.label,
        holderKey: item.holderKey,
      })),
    );
  }
  if (!mechanics.mechanicsAbsent) {
    const settings = await tx
      .select()
      .from(campaignSettings)
      .where(
        and(
          eq(campaignSettings.storyId, source.id),
          lte(campaignSettings.revision, mechanics.settingsRevision),
        ),
      );
    if (
      !settings.length ||
      !settings.some((entry) => entry.revision === mechanics.settingsRevision)
    ) {
      forkConflict('settings_incomplete');
    }
    await tx.insert(campaignSettings).values(
      settings.map((entry) => ({
        storyId: forkStoryId,
        revision: entry.revision,
        settings: entry.settings,
        profile: entry.profile,
      })),
    );
    const now = await readDatabaseClockMs(tx, source.id);
    const locked = settings.find(
      (entry) => entry.revision === mechanics.settingsRevision,
    );
    const lockedFlag =
      locked &&
      typeof locked.settings === 'object' &&
      locked.settings !== null &&
      'locked' in locked.settings &&
      locked.settings.locked === true
        ? 1
        : 0;
    await tx.insert(campaign).values({
      storyId: forkStoryId,
      settingsRevision: mechanics.settingsRevision,
      locked: lockedFlag,
      character: mechanics.character,
      storyFacts: mechanics.storyFacts,
      activityOccurrences: mechanics.activityOccurrences,
      acceptedActivityPlan: null,
      content: mechanics.content,
      location: mechanics.location,
      gameSecond: mechanics.gameSecond,
      clock: mechanics.clock,
      clockAnchorAt: new Date(now),
      clockPace: mechanics.pace,
      holds: [],
      offer: null,
      situationAuthorization: mechanics.situationAuthorization,
      activeActivityId: null,
      activeActionOperationId: null,
      worldConditions: mechanics.worldConditions,
    });
  }
  await tx.insert(storyPassage).values({
    id: forkPassageId,
    storyId: forkStoryId,
    sequence: 1,
    transitionId: null,
    response: checkpoint.passage.response,
    initialItems: checkpoint.passage.initialItems,
    effects: checkpoint.passage.effects,
    responseSource: checkpoint.passage.responseSource,
    decisionPlan: null,
    waitPlan: null,
    controlRevision: checkpoint.passage.controlRevision,
    content: checkpoint.passage.content,
    contentDocumentHash: checkpoint.passage.contentDocumentHash,
    interaction: forkInteraction,
    appearance: appearance ?? null,
    sourceGenerationId: null,
    sourceGenerationPart: null,
  });
  if (branch.rootHash !== null) {
    await tx.insert(storyDocumentCommit).values({
      storyId: forkStoryId,
      operationId: forkStoryId,
      requestHash: hashCanonicalJson({
        sourceStoryId: source.id,
        sceneSequence: checkpoint.sceneSequence,
        checkpointHash: referenced.checkpointHash,
        forkStoryId,
      }),
      baseRootHash: null,
      rootHash: branch.rootHash,
      rootRevision: branch.rootRevision,
    });
    await enqueue(tx, {
      id: randomUUID(),
      operationId: forkStoryId,
      topic: knowledgeIndexTopic,
    });
  }
  await insertStagedSceneCheckpointSelector(tx, {
    ownerId: input.ownerId,
    operationId: forkStoryId,
    staged,
  });
}

function matchingPriorFork(
  prior: typeof story.$inferSelect,
  input: ForkInput,
  sourceStoryId: string,
) {
  return (
    prior.ownerId === input.ownerId &&
    prior.forkedFromStoryId === sourceStoryId &&
    prior.forkedFromSequence === input.expectedRevision &&
    (input.sourcePassageId === undefined ||
      prior.forkedFromPassageId === input.sourcePassageId)
  );
}

async function assertIdempotentCheckpointHash(
  tx: Transaction,
  input: ForkInput,
  sourceStoryId: string,
) {
  if (input.sourceCheckpointHash === undefined) return;
  const [row] = await tx
    .select({ checkpointHash: storySceneCheckpoint.checkpointHash })
    .from(storySceneCheckpoint)
    .where(
      and(
        eq(storySceneCheckpoint.storyId, sourceStoryId),
        eq(storySceneCheckpoint.sceneSequence, input.expectedRevision),
      ),
    );
  if (!row || row.checkpointHash !== input.sourceCheckpointHash) {
    throw new StoryError('invalid', 'checkpoint_hash_mismatch');
  }
}

/** Fork the one snapshot-complete checkpoint currently supported by Phase 1. */
export function createStoryForks(
  database: Database,
  documentStore?: DocumentStore | object,
) {
  async function forkCurrent(input: ForkInput) {
    const sourceStoryId = parseStoryIdentifier(input.sourceStoryId);
    const forkStoryId = parseStoryIdentifier(input.forkStoryId);
    if (sourceStoryId === forkStoryId) throw new StoryError('invalid');

    await database.db.transaction(async (tx) => {
      const [source] = await tx
        .select()
        .from(story)
        .where(
          and(eq(story.id, sourceStoryId), eq(story.ownerId, input.ownerId)),
        )
        .for('update');
      if (!source) throw new StoryError('not_found');

      const [prior] = await tx
        .select()
        .from(story)
        .where(eq(story.id, forkStoryId));
      if (prior) {
        if (!matchingPriorFork(prior, input, sourceStoryId)) {
          forkConflict('destination_in_use');
        }
        await assertIdempotentCheckpointHash(tx, input, sourceStoryId);
        return;
      }
      await forkLiveRevisionOne(tx, input, source);
    });
  }

  async function fork(input: ForkInput) {
    const sourceStoryId = parseStoryIdentifier(input.sourceStoryId);
    const forkStoryId = parseStoryIdentifier(input.forkStoryId);
    if (sourceStoryId === forkStoryId) throw new StoryError('invalid');
    const store = forkDocumentStore(documentStore);
    const [preview] = await database.db
      .select()
      .from(storySceneCheckpoint)
      .where(
        and(
          eq(storySceneCheckpoint.storyId, sourceStoryId),
          eq(storySceneCheckpoint.sceneSequence, input.expectedRevision),
        ),
      );
    if (preview && !store) {
      throw new StoryError('unavailable', 'document_store');
    }
    const referenced =
      preview && store ? await readSceneCheckpointForRow(store, preview) : null;
    let preparedV2: V2ForkPrepared | undefined;
    if (
      referenced?.checkpoint.format === 'offscreen.scene-checkpoint.v2' &&
      store
    ) {
      try {
        const { mapped, staged } = await stageV2ForkCheckpoint(
          store,
          referenced.checkpoint as SceneCheckpointV2,
          sourceStoryId,
          forkStoryId,
        );
        preparedV2 = {
          mappedCheckpoint: mapped.checkpoint,
          staged,
          sourcePassageId: referenced.checkpoint.passageId,
          sourceSceneSequence: referenced.checkpoint.sceneSequence,
        };
      } catch (error) {
        if (error instanceof ForkStateError) {
          if (error.code === 'mechanics_absent') {
            forkConflict('mechanics_absent');
          }
          throw new StoryError('invalid', error.code);
        }
        throw error;
      }
    }
    const checkpointPassage = referenced
      ? (
          await database.db
            .select()
            .from(storyPassage)
            .where(eq(storyPassage.id, referenced.checkpoint.passageId))
        )[0]
      : null;
    if (referenced && !checkpointPassage) forkConflict('missing_checkpoint');

    await database.db.transaction(async (tx) => {
      const [source] = await tx
        .select()
        .from(story)
        .where(
          and(eq(story.id, sourceStoryId), eq(story.ownerId, input.ownerId)),
        )
        .for('update');
      if (!source) throw new StoryError('not_found');

      const [prior] = await tx
        .select()
        .from(story)
        .where(eq(story.id, forkStoryId));
      if (prior) {
        if (!matchingPriorFork(prior, input, sourceStoryId)) {
          forkConflict('destination_in_use');
        }
        await assertIdempotentCheckpointHash(tx, input, sourceStoryId);
        return;
      }

      const [selector] = await tx
        .select()
        .from(storySceneCheckpoint)
        .where(
          and(
            eq(storySceneCheckpoint.storyId, sourceStoryId),
            eq(storySceneCheckpoint.sceneSequence, input.expectedRevision),
          ),
        );
      if (referenced && preview && checkpointPassage) {
        if (!selector || !sceneCheckpointIdentityMatches(selector, preview)) {
          forkConflict('checkpoint_changed');
        }
        const [passageNow] = await tx
          .select()
          .from(storyPassage)
          .where(eq(storyPassage.id, checkpointPassage.id));
        if (
          !passageNow ||
          !isDeepStrictEqual(
            passageNow.appearance,
            checkpointPassage.appearance,
          )
        ) {
          forkConflict('checkpoint_changed');
        }
        if (!store) throw new StoryError('unavailable', 'document_store');
        await forkFromSceneCheckpoint(
          tx,
          input,
          source,
          passageNow,
          store,
          referenced,
          preparedV2,
        );
        return;
      }
      if (selector) forkConflict('checkpoint_changed');
      await forkLiveRevisionOne(tx, input, source);
    });
  }

  return { forkCurrent, fork };
}
