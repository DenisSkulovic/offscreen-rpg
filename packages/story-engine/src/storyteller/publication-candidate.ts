import { randomUUID } from 'node:crypto';
import { and, eq, inArray } from 'drizzle-orm';
import type { Database } from '@offscreen/db';
import { campaign, gameActivity } from '@offscreen/story-persistence/campaign';
import { story } from '@offscreen/story-persistence/stories';
import {
  DocumentStorageError,
  sceneCheckpointSchema,
  type SceneCheckpoint,
} from '@offscreen/documents';
import {
  authorizeSituation,
  immediateActionAvailable,
  validateImmediateActionProposal,
  type ImmediateActionPlan,
} from '@offscreen/game/immediate-actions';
import { offerSchema, type GameOffer } from '@offscreen/game/offers';
import {
  type StorytellerResult,
  type StorytellerTask,
} from '@offscreen/storyteller/tasks';

type ConsequenceTask = Extract<
  StorytellerTask,
  { task: 'consequence' } | { task: 'pending-consequence' }
>;
import { campaignHoldsSchema } from '../campaign/holds';
import { resolvedActivityPlanSchema } from '@offscreen/game/activities';
import { projectStorytellerNotes } from '../stories/continuity-notes';
import { StoryError } from '../stories/errors';
import {
  checkpointPinsForRoot,
  type StagedStoryPublication,
} from '../stories/passage-documents';
import {
  stageSceneCheckpointObject,
  type SceneCheckpointWriterStore,
  type StagedSceneCheckpoint,
} from '../stories/scene-checkpoint';
import {
  SceneAfterStateError,
  readSceneAfterStateFromDatabase,
  type SceneAfterState,
  type SceneAfterStateGameOffer,
} from '../stories/scene-after-state';
import { toV2FictionalState } from '../stories/scene-checkpoint-v2';
import type { Transaction } from '@offscreen/db';
import type { ActiveSceneRecallCue } from '../stories/persistence';

export const STORYTELLER_PUBLICATION_OFFER_SOURCE =
  'storyteller-publication.v1';
export const STORYTELLER_PUBLICATION_OFFER_MEANING = 'choose';

export function envelopPublicationOffer(offer: GameOffer) {
  return {
    id: offer.id,
    source: STORYTELLER_PUBLICATION_OFFER_SOURCE,
    meaning: STORYTELLER_PUBLICATION_OFFER_MEANING,
    nodes: offer.nodes,
  };
}

export type StagedConsequencePublication = StagedSceneCheckpoint &
  Readonly<{
    passageId: string;
    offerId: string;
    baseRootHash: string | null;
    baseRootRevision: number;
    plannedOffer: GameOffer;
    publicationOffer: ReturnType<typeof envelopPublicationOffer>;
    selectedPlans: readonly ImmediateActionPlan[];
    situationAuthorization: unknown;
    projectedNotes: unknown;
    activeSceneScope: unknown;
  }>;

function throwsStateNotRepresentable(): never {
  throw new StoryError('conflict', 'state_not_representable');
}

function projectStorytellerHoldToDecision(
  holds: unknown,
  generationId: string,
  offerId: string,
) {
  const parsed = campaignHoldsSchema.parse(holds ?? []);
  if (
    !parsed.some(
      (hold) =>
        hold.kind === 'storyteller' && hold.generationId === generationId,
    )
  ) {
    return parsed;
  }
  return campaignHoldsSchema.parse([
    ...parsed.filter(
      (hold) =>
        !(hold.kind === 'storyteller' && hold.generationId === generationId),
    ),
    { kind: 'decision' as const, offerId, reason: 'player-choice' as const },
  ]);
}

function projectConsequenceAfterState(
  base: SceneAfterState,
  args: Readonly<{
    continuityNotes: unknown;
    activeSceneScope: unknown;
    publicationOffer: ReturnType<typeof envelopPublicationOffer>;
    situationAuthorization: unknown;
    holds: unknown;
    gameOffer: SceneAfterStateGameOffer;
  }>,
): SceneAfterState {
  if (base.campaign == null) {
    throw new SceneAfterStateError('state_not_representable');
  }
  return {
    ...base,
    continuityNotes: args.continuityNotes,
    activeSceneScope: args.activeSceneScope,
    campaign: {
      ...base.campaign,
      offer: args.publicationOffer,
      situationAuthorization: args.situationAuthorization,
      holds: args.holds,
    },
    gameOffers: [...base.gameOffers, args.gameOffer],
  };
}

function consequenceV2CheckpointCandidate(args: {
  storyId: string;
  passageId: string;
  transitionId: string;
  sceneSequence: number;
  content: unknown;
  contentDocumentHash: string | null;
  rootHash: string | null;
  rootRevision: number;
  pins: SceneCheckpoint['pins'];
  source: string;
  premise: unknown;
  storyteller: unknown;
  execution: unknown;
  usagePolicy: unknown;
  fictionalState: ReturnType<typeof toV2FictionalState>;
}) {
  return {
    format: 'offscreen.scene-checkpoint.v2' as const,
    stateSchemaVersion: 2 as const,
    storyId: args.storyId,
    passageId: args.passageId,
    sceneSequence: args.sceneSequence,
    transitionId: args.transitionId,
    source: args.source,
    premise: args.premise ?? null,
    storyteller: args.storyteller ?? null,
    execution: args.execution ?? null,
    usagePolicy: args.usagePolicy ?? null,
    canon: { rootHash: args.rootHash, rootRevision: args.rootRevision },
    ancestor: { storyId: null, rootHash: null, rootRevision: null },
    pins: args.pins,
    passage: {
      response: null,
      responseSource: null,
      initialItems: null,
      effects: [],
      decisionPlan: null,
      waitPlan: null,
      controlRevision: 0,
      content: args.contentDocumentHash ? null : args.content,
      contentDocumentHash: args.contentDocumentHash,
      interaction: null,
    },
    fictionalState: args.fictionalState,
  };
}

type DbLike = Pick<Database, 'db'> | Transaction;

function isTransaction(db: DbLike): db is Transaction {
  return !('db' in db);
}

async function queryActivities(
  db: DbLike,
  storyId: string,
  states: readonly string[],
) {
  const run = isTransaction(db)
    ? db
        .select()
        .from(gameActivity)
        .where(
          and(
            eq(gameActivity.storyId, storyId),
            inArray(gameActivity.state, states),
          ),
        )
    : db.db
        .select()
        .from(gameActivity)
        .where(
          and(
            eq(gameActivity.storyId, storyId),
            inArray(gameActivity.state, states),
          ),
        );
  return run;
}

/** Validate and admit consequence plans; resume bindings resolved against live rows. */
export async function admitConsequenceSelectedPlans(
  db: DbLike,
  args: Readonly<{
    storyId: string;
    generationId: string;
    task: ConsequenceTask;
    result: StorytellerResult;
  }>,
): Promise<ImmediateActionPlan[]> {
  if (
    args.result.scene.version !== 3 ||
    args.result.scene.next.kind !== 'action-plans'
  ) {
    throw new StoryError('invalid');
  }
  const sceneNext = args.result.scene.next;
  const resolutionContext = args.task.context.resolution;
  if (!resolutionContext) {
    throw new StoryError('invalid');
  }
  const evidenceHandles = new Set(
    args.task.context.evidence.map((passage) => `p${passage.sequence}`),
  );
  const selectedPlans: ImmediateActionPlan[] = [];
  for (const proposal of sceneNext.plans) {
    const validation = validateImmediateActionProposal({
      proposal,
      character: resolutionContext.character,
      storyFacts: resolutionContext.storyFacts,
      evidenceHandles,
      requireFactTransitionDeclarations: true,
      allowWorldEffects: false,
    });
    if (validation.kind === 'rejected') {
      throw new StoryError('invalid');
    }
    if (
      !immediateActionAvailable(
        resolutionContext.character,
        resolutionContext.storyFacts,
        validation.plan,
      )
    ) {
      throw new StoryError('invalid');
    }
    let admittedPlan = validation.plan;
    if (admittedPlan.resolution.kind === 'resume') {
      const resume = admittedPlan.resolution;
      const retained = (
        await queryActivities(db, args.storyId, ['encounter', 'suspended'])
      ).filter((candidate) => {
        if (
          resolvedActivityPlanSchema.parse(candidate.plan).action.id ===
          resume.activityActionId
        ) {
          return (
            resume.activityId === undefined ||
            (candidate.id === resume.activityId &&
              candidate.revision === resume.activityRevision)
          );
        }
        return false;
      });
      if (retained.length !== 1 || !retained[0]) {
        throw new StoryError('invalid');
      }
      admittedPlan = {
        ...admittedPlan,
        resolution: {
          ...admittedPlan.resolution,
          activityId: retained[0].id,
          activityRevision: retained[0].revision,
        },
      };
    }
    selectedPlans.push(admittedPlan);
  }
  return selectedPlans;
}

export async function stageConsequencePublicationCheckpoint(
  database: Database,
  documentStore: SceneCheckpointWriterStore,
  args: Readonly<{
    ownerId: string;
    storyId: string;
    generationId: string;
    transitionId: string;
    task: ConsequenceTask;
    result: StorytellerResult;
    passageId: string;
    contentDocumentHash: string | null;
    nextRootHash: string | null;
    nextRootRevision: number;
    baseRootHash: string | null;
    baseRootRevision: number;
    restartActiveScene: boolean;
    activeSceneRecallCues?: readonly ActiveSceneRecallCue[];
    stagedDocuments?: StagedStoryPublication;
  }>,
): Promise<StagedConsequencePublication> {
  const [current] = await database.db
    .select()
    .from(story)
    .where(eq(story.id, args.storyId));
  if (
    !current ||
    current.revision !== args.task.source.narrativeRevision ||
    current.documentRootHash !== args.baseRootHash ||
    current.documentRootRevision !== args.baseRootRevision
  ) {
    throw new StoryError('conflict', 'stale_story_revision');
  }
  const [campaignRow] = await database.db
    .select()
    .from(campaign)
    .where(eq(campaign.storyId, args.storyId));
  if (!campaignRow) {
    throw new StoryError('invalid');
  }
  const selectedPlans = await admitConsequenceSelectedPlans(database, {
    storyId: args.storyId,
    generationId: args.generationId,
    task: args.task,
    result: args.result,
  });
  const offerId = randomUUID();
  const plannedOffer = offerSchema.parse({
    id: offerId,
    nodes: selectedPlans.map((plan) => ({
      id: plan.key,
      parent: null,
      label: plan.label,
      description: plan.intention,
      risk: plan.risk,
      action: {
        kind: 'attempt' as const,
        timing:
          plan.resolution.kind === 'process' ||
          plan.resolution.kind === 'resume'
            ? { kind: 'process' as const }
            : {
                kind: 'finite' as const,
                fictionalSeconds: plan.resolution.fictionalDurationSeconds,
              },
      },
    })),
  });
  const publicationOffer = envelopPublicationOffer(plannedOffer);
  const sceneNext = args.result.scene.next;
  if (sceneNext.kind !== 'action-plans') {
    throw new StoryError('invalid');
  }
  const situationAuthorization = authorizeSituation(
    selectedPlans,
    plannedOffer.id,
    sceneNext.activityAccess,
  );
  const nextRevision = current.revision + 1;
  const activeSceneScope = args.restartActiveScene
    ? {
        version: 'active-scene-anchor.v1' as const,
        fromSequence: nextRevision,
        requiredPassageIds: [args.passageId],
        recallCues: args.activeSceneRecallCues ?? [],
      }
    : current.activeSceneScope;
  let projectedNotes: unknown = current.continuityNotes;
  if (current.storyteller != null) {
    projectedNotes = projectStorytellerNotes({
      task: args.task,
      result: args.result,
      notes: current.continuityNotes,
      revision: nextRevision,
      sourcePart: 'current',
      passageId: args.passageId,
    });
  }
  const projectedHolds = projectStorytellerHoldToDecision(
    campaignRow.holds,
    args.generationId,
    offerId,
  );
  let capturedBase: SceneAfterState;
  try {
    capturedBase = await readSceneAfterStateFromDatabase(
      database,
      args.storyId,
    );
  } catch (error) {
    if (error instanceof SceneAfterStateError) {
      throwsStateNotRepresentable();
    }
    throw error;
  }
  const predictedAfterState = projectConsequenceAfterState(capturedBase, {
    continuityNotes: projectedNotes,
    activeSceneScope,
    publicationOffer,
    situationAuthorization,
    holds: projectedHolds,
    gameOffer: {
      id: offerId,
      narrativeRevision: nextRevision,
      plans: selectedPlans,
    },
  });
  let pins: SceneCheckpoint['pins'];
  try {
    pins = await checkpointPinsForRoot({
      storage: documentStore,
      rootHash: args.nextRootHash,
      storytellerProfile: current.storyteller ?? null,
    });
  } catch (error) {
    if (error instanceof DocumentStorageError) {
      throw new StoryError(
        error.code === 'unavailable' ? 'unavailable' : 'invalid',
        error.code === 'unavailable'
          ? 'checkpoint_store_unavailable'
          : 'canon_root_mismatch',
      );
    }
    throw error;
  }
  let fictionalState: ReturnType<typeof toV2FictionalState>;
  try {
    fictionalState = toV2FictionalState(predictedAfterState);
  } catch (error) {
    if (error instanceof SceneAfterStateError) {
      throwsStateNotRepresentable();
    }
    throw error;
  }
  const candidate = consequenceV2CheckpointCandidate({
    storyId: args.storyId,
    passageId: args.passageId,
    transitionId: args.transitionId,
    sceneSequence: nextRevision,
    content: args.result.scene.content,
    contentDocumentHash: args.contentDocumentHash,
    rootHash: args.nextRootHash,
    rootRevision: args.nextRootRevision,
    pins,
    source: current.source,
    premise: current.premise,
    storyteller: current.storyteller,
    execution: current.execution,
    usagePolicy: current.usagePolicy,
    fictionalState,
  });
  const parsed = sceneCheckpointSchema.safeParse(candidate);
  if (!parsed.success) {
    throwsStateNotRepresentable();
  }
  const staged = await stageSceneCheckpointObject(documentStore, parsed.data);
  return {
    ...staged,
    passageId: args.passageId,
    offerId,
    baseRootHash: args.baseRootHash,
    baseRootRevision: args.baseRootRevision,
    plannedOffer,
    publicationOffer,
    selectedPlans,
    situationAuthorization,
    projectedNotes,
    activeSceneScope,
  };
}
