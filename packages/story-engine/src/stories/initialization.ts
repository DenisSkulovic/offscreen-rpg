import { isDeepStrictEqual } from 'node:util';
import { interactionSchema } from '@offscreen/story-interface/interactions';
import type { Database } from '@offscreen/db';
import {
  story,
  storyDocumentCommit,
  storyItem,
  storyPassage,
} from '@offscreen/story-persistence/stories';
import { campaignSettings } from '@offscreen/story-persistence/campaign';
import { and, eq } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';
import {
  initializationMatches,
  initialStorySchema,
  type InitialStory,
} from './command-policy';
import { StoryError, parseStoryIdentifier } from './errors';
import type { Transaction } from '@offscreen/db/outbox';
import type { DocumentStore, RulePackageReference } from '@offscreen/documents';
import {
  checkpointPinsForRoot,
  stageStoryBootstrapDocuments,
  type StagedStoryBootstrap,
} from './passage-documents';
import {
  insertStagedSceneCheckpointSelector,
  stageSceneCheckpointObject,
  checkpointWriterStore,
  type StagedSceneCheckpoint,
} from './scene-checkpoint';
import {
  sceneCheckpointSchema,
  type SceneCheckpoint,
} from '@offscreen/documents';
import { wholeGameSeconds } from '@offscreen/game/time';
import type { Pace } from '@offscreen/game/time';
import type {
  SceneAfterState,
  SceneAfterStateGameOffer,
} from './scene-after-state';
import {
  toV2FictionalState,
  type SceneCheckpointV2FictionalState,
} from './scene-checkpoint-v2';

type InitializeStory = Readonly<{
  ownerId: string;
  storyId: string;
  initial: unknown;
}>;

type InitializeStoryInTransaction = Readonly<{
  ownerId: string;
  storyId: string;
  input: InitialStory;
  stagedPassage?: StagedStoryBootstrap;
  existingPassageContent?: unknown;
  interactionId?: string;
  stagedCheckpoint?: StagedSceneCheckpoint;
}>;

function openingPassage(args: {
  input: InitialStory;
  interactionId: string | null;
  contentDocumentHash: string | null;
}) {
  return {
    response: null,
    responseSource: null,
    initialItems: null,
    effects: [],
    decisionPlan: null,
    waitPlan: null,
    controlRevision: 0,
    content: args.contentDocumentHash ? null : args.input.content,
    contentDocumentHash: args.contentDocumentHash,
    interaction:
      args.input.interaction && args.interactionId
        ? { id: args.interactionId, specification: args.input.interaction }
        : null,
  };
}

/**
 * v2 document fictional state. Situation authorization is already the
 * checkpoint representation from `toV2FictionalState`; parsing it again as
 * live authorization would reject selected access and prepared plans.
 */
export function projectCheckpointV2FictionalState(
  afterState: SceneAfterState,
): SceneCheckpointV2FictionalState {
  return toV2FictionalState(afterState);
}

function openingCheckpointShell(
  args: {
    storyId: string;
    passageId: string;
    input: InitialStory;
    rootHash: string | null;
    rootRevision: number;
    pins: SceneCheckpoint['pins'];
    contentDocumentHash: string | null;
    interactionId: string | null;
  },
  afterState: SceneAfterState,
) {
  return sceneCheckpointSchema.parse({
    format: 'offscreen.scene-checkpoint.v2',
    stateSchemaVersion: 2,
    storyId: args.storyId,
    passageId: args.passageId,
    sceneSequence: 1,
    transitionId: null,
    source: args.input.source,
    premise: args.input.premise ?? null,
    storyteller: args.input.storyteller ?? null,
    execution: args.input.execution ?? null,
    usagePolicy: args.input.usagePolicy ?? null,
    canon: {
      rootHash: args.rootHash,
      rootRevision: args.rootRevision,
    },
    ancestor: { storyId: null, rootHash: null, rootRevision: null },
    pins: args.pins,
    passage: openingPassage(args),
    fictionalState: projectCheckpointV2FictionalState(afterState),
  });
}

export function absentOpeningCheckpoint(args: {
  storyId: string;
  passageId: string;
  input: InitialStory;
  interactionId: string | null;
  rootHash: string | null;
  rootRevision: number;
  contentDocumentHash: string | null;
  pins: SceneCheckpoint['pins'];
}): SceneCheckpoint {
  return openingCheckpointShell(args, {
    continuityNotes: args.input.storyteller ? [] : null,
    activeSceneScope: args.input.storyteller
      ? {
          version: 'active-scene-anchor.v1',
          fromSequence: 1,
          requiredPassageIds: [args.passageId],
          recallCues: [],
        }
      : null,
    storyItems: [],
    campaign: null,
    activities: [],
    worldObligations: [],
    gameOffers: [],
    actionExecutions: [],
  });
}

export type TrustedOpeningCampaignOffer = Readonly<{
  publicationOffer: unknown;
  situationAuthorization: unknown;
  gameOffers: readonly SceneAfterStateGameOffer[];
}>;

/** The campaign row `initializeCampaign` writes when it is given no character seed. */
export function quiescentCampaignOpeningCheckpoint(args: {
  storyId: string;
  passageId: string;
  input: InitialStory;
  interactionId: string | null;
  rootHash: string;
  rootRevision: number;
  contentDocumentHash: string;
  pins: SceneCheckpoint['pins'];
  pace: Pace;
  trustedOpeningOffer?: TrustedOpeningCampaignOffer;
}): SceneCheckpoint {
  const trustedOffer = args.trustedOpeningOffer;
  return openingCheckpointShell(args, {
    continuityNotes: args.input.storyteller ? [] : null,
    activeSceneScope: args.input.storyteller
      ? {
          version: 'active-scene-anchor.v1',
          fromSequence: 1,
          requiredPassageIds: [args.passageId],
          recallCues: [],
        }
      : null,
    storyItems: [],
    campaign: {
      settingsRevision: 1,
      character: null,
      storyFacts: [],
      activityOccurrences: [],
      acceptedActivityPlan: null,
      content: null,
      location: null,
      gameSecond: 0,
      clock: wholeGameSeconds(0),
      clockPace: args.pace,
      holds: [],
      offer: trustedOffer?.publicationOffer ?? null,
      situationAuthorization: trustedOffer?.situationAuthorization ?? {
        version: 2,
        offerId: null,
        activityAccess: { kind: 'none' },
        preparedPlans: [],
      },
      activeActivityId: null,
      activeActionOperationId: null,
      worldConditions: [],
    },
    activities: [],
    worldObligations: [],
    gameOffers: trustedOffer?.gameOffers ?? [],
    actionExecutions: [],
  });
}

export async function initializeStoryInTransaction(
  tx: Transaction,
  {
    ownerId,
    storyId,
    input,
    stagedPassage,
    existingPassageContent,
    interactionId,
    stagedCheckpoint,
  }: InitializeStoryInTransaction,
) {
  const firstPassageId = stagedPassage?.documentId ?? randomUUID();
  const inserted = await tx
    .insert(story)
    .values({
      id: storyId,
      ownerId,
      source: input.source,
      premise: input.premise ?? null,
      storyteller: input.storyteller ?? null,
      execution: input.execution ?? null,
      usagePolicy: input.usagePolicy ?? null,
      continuityNotes: input.storyteller ? [] : null,
      activeSceneScope: input.storyteller
        ? {
            version: 'active-scene-anchor.v1',
            fromSequence: 1,
            requiredPassageIds: [firstPassageId],
          }
        : null,
      documentRootHash: stagedPassage?.rootHash ?? null,
      documentRootRevision: stagedPassage?.rootRevision ?? 0,
    })
    .onConflictDoNothing()
    .returning({ id: story.id });

  if (!inserted.length) {
    const [priorStory] = await tx
      .select()
      .from(story)
      .where(eq(story.id, storyId));
    if (!priorStory || priorStory.ownerId !== ownerId) {
      throw new StoryError('not_found');
    }
    const [creationSettings] = await tx
      .select({ profile: campaignSettings.profile })
      .from(campaignSettings)
      .where(
        and(
          eq(campaignSettings.storyId, storyId),
          eq(campaignSettings.revision, 1),
        ),
      );
    if (
      priorStory.source !== input.source ||
      !isDeepStrictEqual(
        creationSettings?.profile ?? priorStory.storyteller ?? null,
        input.storyteller ?? null,
      ) ||
      !isDeepStrictEqual(
        priorStory.execution ?? null,
        input.execution ?? null,
      ) ||
      !isDeepStrictEqual(
        priorStory.usagePolicy ?? null,
        input.usagePolicy ?? null,
      )
    ) {
      throw new StoryError('conflict');
    }
    const [firstPassage] = await tx
      .select()
      .from(storyPassage)
      .where(
        and(eq(storyPassage.storyId, storyId), eq(storyPassage.sequence, 1)),
      );
    if (
      !firstPassage ||
      !initializationMatches(
        existingPassageContent === undefined
          ? firstPassage
          : { ...firstPassage, content: existingPassageContent },
        input,
        priorStory.premise,
      )
    ) {
      throw new StoryError('conflict');
    }
    return false;
  }

  if (input.items.length) {
    await tx
      .insert(storyItem)
      .values(input.items.map((item) => ({ storyId, ...item })));
  }
  await tx.insert(storyPassage).values({
    id: firstPassageId,
    storyId,
    sequence: 1,
    initialItems: input.items,
    content: stagedPassage ? null : input.content,
    contentDocumentHash: stagedPassage?.objectHash ?? null,
    interaction: input.interaction
      ? interactionSchema.parse({
          id: interactionId ?? randomUUID(),
          specification: input.interaction,
        })
      : null,
    sourceGenerationId: input.sourceGenerationId ?? null,
    sourceGenerationPart: input.sourceGenerationPart ?? null,
  });
  if (stagedPassage) {
    await tx.insert(storyDocumentCommit).values({
      storyId,
      operationId: storyId,
      requestHash: stagedPassage.objectHash,
      baseRootHash: stagedPassage.baseRootHash,
      rootHash: stagedPassage.rootHash,
      rootRevision: stagedPassage.rootRevision,
    });
  }
  let openingAbsentMechanics = false;
  if (stagedCheckpoint?.checkpoint.format === 'offscreen.scene-checkpoint.v2') {
    openingAbsentMechanics =
      stagedCheckpoint.checkpoint.fictionalState.mechanicsAbsent === true;
  } else if (
    stagedCheckpoint?.checkpoint.format === 'offscreen.scene-checkpoint.v1'
  ) {
    openingAbsentMechanics =
      stagedCheckpoint.checkpoint.mechanics.mechanicsAbsent === true;
  }
  if (stagedCheckpoint && openingAbsentMechanics) {
    if (
      stagedCheckpoint.checkpoint.passageId !== firstPassageId ||
      stagedCheckpoint.checkpoint.storyId !== storyId ||
      stagedCheckpoint.checkpoint.canon.rootHash !==
        (stagedPassage?.rootHash ?? null) ||
      stagedCheckpoint.checkpoint.canon.rootRevision !==
        (stagedPassage?.rootRevision ?? 0)
    ) {
      throw new StoryError('conflict', 'stale_canon_root');
    }
    await insertStagedSceneCheckpointSelector(tx, {
      ownerId,
      operationId: storyId,
      staged: stagedCheckpoint,
    });
  }
  return true;
}

export function createStoryInitialization(
  database: Database,
  storage?: DocumentStore,
  defaultRules?: RulePackageReference,
) {
  return async function initializeStory({
    ownerId,
    storyId,
    initial,
  }: InitializeStory) {
    parseStoryIdentifier(storyId);
    const input = initialStorySchema.parse(initial);
    const [existingPassage] = storage
      ? await database.db
          .select({
            content: storyPassage.content,
            contentDocumentHash: storyPassage.contentDocumentHash,
          })
          .from(storyPassage)
          .where(
            and(
              eq(storyPassage.storyId, storyId),
              eq(storyPassage.sequence, 1),
            ),
          )
      : [];
    const existingPassageContent =
      storage && existingPassage?.contentDocumentHash
        ? (await storage.readSourcePassage(existingPassage.contentDocumentHash))
            .content
        : existingPassage?.content;
    const firstPassageId = randomUUID();
    const interactionId = input.interaction ? randomUUID() : undefined;
    const stagedPassage =
      storage && !existingPassage
        ? await stageStoryBootstrapDocuments({
            storage,
            storyId,
            passageId: firstPassageId,
            sequence: 1,
            operationId: storyId,
            rootHash: null,
            rootRevision: 0,
            content: input.content,
            premise: input.premise,
            items: input.items,
            ...(defaultRules ? { ruleReference: defaultRules } : {}),
          })
        : undefined;
    const writer = storage ? checkpointWriterStore(storage) : undefined;
    const stagedCheckpoint =
      writer && stagedPassage && input.items.length === 0
        ? await stageSceneCheckpointObject(
            writer,
            absentOpeningCheckpoint({
              storyId,
              passageId: firstPassageId,
              input,
              interactionId: interactionId ?? null,
              rootHash: stagedPassage.rootHash,
              rootRevision: stagedPassage.rootRevision,
              contentDocumentHash: stagedPassage.objectHash,
              pins: await checkpointPinsForRoot({
                storage: writer,
                rootHash: stagedPassage.rootHash,
                storytellerProfile: input.storyteller ?? null,
              }),
            }),
          )
        : undefined;
    await database.db.transaction(async (tx) => {
      await initializeStoryInTransaction(tx, {
        ownerId,
        storyId,
        input,
        ...(stagedPassage ? { stagedPassage } : {}),
        ...(existingPassageContent === undefined
          ? {}
          : { existingPassageContent }),
        ...(interactionId ? { interactionId } : {}),
        ...(stagedCheckpoint ? { stagedCheckpoint } : {}),
      });
    });
  };
}
