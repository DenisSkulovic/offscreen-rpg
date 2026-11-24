import { randomUUID } from 'node:crypto';
import {
  projectStorytellerNotes,
  type ProjectStorytellerNotesInput,
} from './continuity-notes';
import type { Database } from '@offscreen/db';
import {
  campaign,
  campaignReport,
  gameActivity,
  gameOffer,
  worldObligation,
} from '@offscreen/db/campaign-schema';
import {
  DocumentStorageError,
  sceneCheckpointSchema,
  type SceneCheckpoint,
} from '@offscreen/documents';
import {
  continuationResponseProvenance,
  type StoryContinuation,
} from './command-policy';
import { StoryError } from './errors';
import {
  projectStoryItemEffects,
  type ActiveSceneRecallCue,
  type StoryItemSnapshot,
} from './persistence';
import { checkpointPinsForRoot } from './passage-documents';
import {
  stageSceneCheckpointObject,
  type SceneCheckpointWriterStore,
  type StagedSceneCheckpoint,
} from './scene-checkpoint';
import {
  SceneAfterStateError,
  toV2FictionalState,
  wrapAdmittedPassagePlan,
} from './scene-checkpoint-v2';
import {
  projectSceneItemAfterState,
  readSceneAfterStateFromDatabase,
  type SceneAfterState,
} from './scene-after-state';
import { generation } from '@offscreen/db/generation-schema';
import { storytellerKind } from '../generations/storyteller-kinds';
import {
  storytellerTaskSchema,
  validateStorytellerResult,
} from '@offscreen/storyteller/tasks';
import {
  story,
  storyPassage,
  storyResolution,
} from '@offscreen/db/story-schema';
import { and, eq } from 'drizzle-orm';

export type StagedContinuationCheckpoint = StagedSceneCheckpoint &
  Readonly<{
    passageId: string;
    interactionId: string | null;
    baseRootHash: string | null;
    baseRootRevision: number;
  }>;

export function checkpointNotes(notes: unknown): [] | null | undefined {
  if (notes == null) {return null;}
  if (Array.isArray(notes) && notes.length === 0) {return [];}
  return undefined;
}

export function checkpointAnchor(scope: unknown) {
  if (scope == null) {return null;}
  if (typeof scope !== 'object') {return undefined;}
  const record = scope as Record<string, unknown>;
  if (record.version !== 'active-scene-anchor.v1') {return undefined;}
  return {
    version: 'active-scene-anchor.v1' as const,
    fromSequence: record.fromSequence,
    requiredPassageIds: record.requiredPassageIds,
    recallCues: Array.isArray(record.recallCues) ? record.recallCues : [],
  };
}

async function continuationPublicationBlocked(
  database: Database,
  storyId: string,
  transitionId: string,
) {
  const resolutions = await database.db
    .select({ operationId: storyResolution.operationId })
    .from(storyResolution)
    .where(eq(storyResolution.storyId, storyId));
  if (resolutions.some((row) => row.operationId !== transitionId)) {return true;}
  const [report] = await database.db
    .select({ id: campaignReport.id })
    .from(campaignReport)
    .where(
      and(
        eq(campaignReport.storyId, storyId),
        eq(campaignReport.state, 'pending'),
      ),
    )
    .limit(1);
  return Boolean(report);
}

/** V1-only: refuses when mechanical rows exist that v1 cannot encode. */
async function checkpointIsV1Blocked(
  database: Database,
  storyId: string,
  transitionId: string,
) {
  if (await continuationPublicationBlocked(database, storyId, transitionId)) {
    return true;
  }
  const [obligation] = await database.db
    .select({ id: worldObligation.id })
    .from(worldObligation)
    .where(eq(worldObligation.storyId, storyId))
    .limit(1);
  if (obligation) {return true;}
  const [offer] = await database.db
    .select({ id: gameOffer.id })
    .from(gameOffer)
    .where(eq(gameOffer.storyId, storyId))
    .limit(1);
  if (offer) {return true;}
  const [activity] = await database.db
    .select({ id: gameActivity.id })
    .from(gameActivity)
    .where(eq(gameActivity.storyId, storyId))
    .limit(1);
  if (activity) {return true;}
  return false;
}

function campaignHasActiveWork(
  campaignRow: typeof campaign.$inferSelect | undefined,
): boolean {
  if (!campaignRow) {return false;}
  return (
    campaignRow.offer != null ||
    campaignRow.acceptedActivityPlan != null ||
    campaignRow.activeActivityId != null ||
    campaignRow.activeActionOperationId != null ||
    !Array.isArray(campaignRow.holds) ||
    campaignRow.holds.length > 0
  );
}

function notesNonempty(notes: unknown): boolean {
  return Array.isArray(notes) && notes.length > 0;
}

function throwsStateNotRepresentable(): never {
  throw new StoryError('invalid', 'state_not_representable');
}

function sourceGenerationPart(input: StoryContinuation): 'current' | 'arrival' {
  return input.sourceGenerationPart === 'arrival' ? 'arrival' : 'current';
}

async function projectedContinuityNotesForStaging(
  database: Database,
  args: Readonly<{
    storyId: string;
    input: StoryContinuation;
    passageId: string;
    nextRevision: number;
    currentNotes: unknown;
    storyteller: unknown;
  }>,
): Promise<unknown> {
  if (args.storyteller == null || !args.input.sourceGenerationId) {
    return args.currentNotes;
  }
  const [record] = await database.db
    .select()
    .from(generation)
    .where(eq(generation.id, args.input.sourceGenerationId));
  if (
    !record ||
    record.kind !== storytellerKind ||
    record.state !== 'succeeded'
  ) {
    throw new Error('Missing storyteller result');
  }
  const task = storytellerTaskSchema.parse(record.input);
  const result = validateStorytellerResult(task, record.output);
  const sourcePart = sourceGenerationPart(args.input);
  let departurePassageId: string | undefined;
  if (sourcePart === 'arrival') {
    const [departure] = await database.db
      .select({ id: storyPassage.id })
      .from(storyPassage)
      .where(
        and(
          eq(storyPassage.storyId, args.storyId),
          eq(storyPassage.sequence, args.nextRevision - 1),
          eq(storyPassage.sourceGenerationId, args.input.sourceGenerationId),
        ),
      );
    if (!departure) {
      throw new Error('Missing continuity departure');
    }
    departurePassageId = departure.id;
  }
  const projection = {
    task,
    result,
    notes: args.currentNotes,
    revision: args.nextRevision,
    sourcePart,
    passageId: args.passageId,
    ...(departurePassageId !== undefined ? { departurePassageId } : {}),
  } as ProjectStorytellerNotesInput;
  return projectStorytellerNotes(projection);
}

function projectedSceneAfterState(
  base: SceneAfterState,
  args: Readonly<{
    effects: StoryContinuation['effects'];
    continuityNotes: unknown;
    activeSceneScope: unknown;
  }>,
): SceneAfterState {
  return {
    ...base,
    continuityNotes: args.continuityNotes,
    activeSceneScope: args.activeSceneScope,
    storyItems: projectSceneItemAfterState(base.storyItems, args.effects),
  };
}

function requiresV2ContinuationCheckpoint(
  args: Readonly<{
    input: StoryContinuation;
    projectedNotes: unknown;
    campaign: typeof campaign.$inferSelect | undefined;
    publishesNotes: boolean;
  }>,
): boolean {
  return (
    Boolean(args.input.decision) ||
    Boolean(args.input.wait) ||
    args.publishesNotes ||
    notesNonempty(args.projectedNotes) ||
    campaignHasActiveWork(args.campaign)
  );
}

function continuationV2CheckpointCandidate(args: {
  storyId: string;
  passageId: string;
  transitionId: string;
  input: StoryContinuation;
  completingDecisionPassageId: string | undefined;
  interactionId: string | null;
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
  const passage = {
    response: args.input.response,
    responseSource: continuationResponseProvenance({
      response: args.input.response,
      completingDecisionPassageId: args.completingDecisionPassageId,
    }),
    initialItems: null,
    effects: args.input.effects,
    decisionPlan: wrapAdmittedPassagePlan('decision', args.input.decision),
    waitPlan: wrapAdmittedPassagePlan('wait', args.input.wait),
    controlRevision: 0,
    content: args.contentDocumentHash ? null : args.input.content,
    contentDocumentHash: args.contentDocumentHash,
    interaction:
      args.input.interaction && args.interactionId
        ? { id: args.interactionId, specification: args.input.interaction }
        : null,
  };
  return {
    format: 'offscreen.scene-checkpoint.v2' as const,
    stateSchemaVersion: 2 as const,
    storyId: args.storyId,
    passageId: args.passageId,
    sceneSequence: args.input.expectedRevision + 1,
    transitionId: args.transitionId,
    source: args.source,
    premise: args.premise ?? null,
    storyteller: args.storyteller ?? null,
    execution: args.execution ?? null,
    usagePolicy: args.usagePolicy ?? null,
    canon: { rootHash: args.rootHash, rootRevision: args.rootRevision },
    ancestor: { storyId: null, rootHash: null, rootRevision: null },
    pins: args.pins,
    passage,
    fictionalState: args.fictionalState,
  };
}

function continuationCheckpointCandidate(args: {
  storyId: string;
  passageId: string;
  transitionId: string;
  input: StoryContinuation;
  completingDecisionPassageId: string | undefined;
  interactionId: string | null;
  contentDocumentHash: string | null;
  rootHash: string | null;
  rootRevision: number;
  pins: SceneCheckpoint['pins'];
  source: string;
  premise: unknown;
  storyteller: unknown;
  execution: unknown;
  usagePolicy: unknown;
  items: readonly StoryItemSnapshot[];
  campaign: typeof campaign.$inferSelect | undefined;
  activeSceneScope: unknown;
  continuityNotes: unknown;
}) {
  if (args.input.decision || args.input.wait) {return undefined;}
  const notes = checkpointNotes(args.continuityNotes);
  if (notes === undefined) {return undefined;}
  const anchor = checkpointAnchor(args.activeSceneScope);
  if (anchor === undefined) {return undefined;}
  const passage = {
    response: args.input.response,
    responseSource: continuationResponseProvenance({
      response: args.input.response,
      completingDecisionPassageId: args.completingDecisionPassageId,
    }),
    initialItems: null,
    effects: args.input.effects,
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
  const shared = {
    format: 'offscreen.scene-checkpoint.v1' as const,
    stateSchemaVersion: 1 as const,
    storyId: args.storyId,
    passageId: args.passageId,
    sceneSequence: args.input.expectedRevision + 1,
    transitionId: args.transitionId,
    source: args.source,
    premise: args.premise ?? null,
    storyteller: args.storyteller ?? null,
    execution: args.execution ?? null,
    usagePolicy: args.usagePolicy ?? null,
    canon: { rootHash: args.rootHash, rootRevision: args.rootRevision },
    ancestor: { storyId: null, rootHash: null, rootRevision: null },
    pins: args.pins,
    passage,
  };
  if (!args.campaign) {
    if (args.items.length > 0) {return undefined;}
    return {
      ...shared,
      mechanics: { mechanicsAbsent: true as const, items: [] },
    };
  }
  const row = args.campaign;
  if (
    row.offer != null ||
    row.acceptedActivityPlan != null ||
    row.activeActivityId != null ||
    row.activeActionOperationId != null ||
    !Array.isArray(row.holds) ||
    row.holds.length > 0
  ) {
    return undefined;
  }
  return {
    ...shared,
    mechanics: {
      mechanicsAbsent: false as const,
      character: row.character ?? null,
      items: args.items,
      storyFacts: row.storyFacts,
      activityOccurrences: row.activityOccurrences,
      location: row.location,
      gameSecond: row.gameSecond,
      clock: row.clock,
      pace: row.clockPace,
      holds: [] as [],
      offer: null,
      acceptedActivityPlan: null,
      activeActivityId: null,
      activeActionOperationId: null,
      situationAuthorization: row.situationAuthorization,
      worldConditions: row.worldConditions,
      settingsRevision: row.settingsRevision,
      content: row.content ?? null,
      continuityNotes: notes,
      activeSceneScope: anchor,
    },
  };
}

export async function stageSupportedContinuationCheckpoint(
  database: Database,
  documentStore: SceneCheckpointWriterStore,
  args: Readonly<{
    ownerId: string;
    storyId: string;
    transitionId: string;
    input: StoryContinuation;
    passageId?: string;
    contentDocumentHash?: string | null;
    nextRootHash?: string | null;
    nextRootRevision?: number;
    baseRootHash?: string | null;
    baseRootRevision?: number;
    restartActiveScene?: boolean;
    activeSceneRecallCues?: readonly ActiveSceneRecallCue[];
    completingDecisionPassageId?: string;
  }>,
): Promise<StagedContinuationCheckpoint | undefined> {
  const [current] = await database.db
    .select()
    .from(story)
    .where(eq(story.id, args.storyId));
  if (!current || current.ownerId !== args.ownerId) {return undefined;}
  if (current.revision !== args.input.expectedRevision) {return undefined;}
  const [prior] = await database.db
    .select({ id: storyPassage.id })
    .from(storyPassage)
    .where(
      and(
        eq(storyPassage.storyId, args.storyId),
        eq(storyPassage.transitionId, args.transitionId),
      ),
    );
  if (prior) {return undefined;}
  if (
    await continuationPublicationBlocked(
      database,
      args.storyId,
      args.transitionId,
    )
  ) {
    return undefined;
  }
  const baseRootHash = args.baseRootHash ?? current.documentRootHash;
  const baseRootRevision =
    args.baseRootRevision ?? current.documentRootRevision;
  if (
    current.documentRootHash !== baseRootHash ||
    current.documentRootRevision !== baseRootRevision
  ) {
    return undefined;
  }
  const rootHash = args.nextRootHash ?? current.documentRootHash;
  const rootRevision = args.nextRootRevision ?? current.documentRootRevision;
  const [campaignRow] = await database.db
    .select()
    .from(campaign)
    .where(eq(campaign.storyId, args.storyId));
  const passageId = args.passageId ?? randomUUID();
  const interactionId = args.input.interaction ? randomUUID() : null;
  const nextRevision = args.input.expectedRevision + 1;
  const scope = args.restartActiveScene
    ? {
        version: 'active-scene-anchor.v1' as const,
        fromSequence: nextRevision,
        requiredPassageIds: [passageId],
        recallCues: args.activeSceneRecallCues ?? [],
      }
    : current.activeSceneScope;
  const publishesNotes = Boolean(
    current.storyteller != null && args.input.sourceGenerationId,
  );
  let projectedNotes: unknown;
  try {
    projectedNotes = await projectedContinuityNotesForStaging(database, {
      storyId: args.storyId,
      input: args.input,
      passageId,
      nextRevision,
      currentNotes: current.continuityNotes,
      storyteller: current.storyteller,
    });
  } catch {
    if (publishesNotes) {throwsStateNotRepresentable();}
    return undefined;
  }
  const mustBeV2 = requiresV2ContinuationCheckpoint({
    input: args.input,
    projectedNotes,
    campaign: campaignRow,
    publishesNotes,
  });
  let pins: SceneCheckpoint['pins'];
  try {
    pins = await checkpointPinsForRoot({
      storage: documentStore,
      rootHash,
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
  let capturedBase: SceneAfterState;
  try {
    capturedBase = await readSceneAfterStateFromDatabase(
      database,
      args.storyId,
    );
  } catch (error) {
    if (error instanceof SceneAfterStateError) {throwsStateNotRepresentable();}
    throw error;
  }
  const predictedAfterState = projectedSceneAfterState(capturedBase, {
    effects: args.input.effects,
    continuityNotes: projectedNotes,
    activeSceneScope: scope,
  });
  try {
    const fictionalState = toV2FictionalState(predictedAfterState);
    const candidate = continuationV2CheckpointCandidate({
      storyId: args.storyId,
      passageId,
      transitionId: args.transitionId,
      input: args.input,
      completingDecisionPassageId: args.completingDecisionPassageId,
      interactionId,
      contentDocumentHash: args.contentDocumentHash ?? null,
      rootHash,
      rootRevision,
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
      if (mustBeV2) {throwsStateNotRepresentable();}
    } else {
      const staged = await stageSceneCheckpointObject(
        documentStore,
        parsed.data,
      );
      return {
        ...staged,
        passageId,
        interactionId,
        baseRootHash,
        baseRootRevision,
      };
    }
  } catch (error) {
    if (error instanceof SceneAfterStateError) {
      if (mustBeV2) {throwsStateNotRepresentable();}
    } else if (error instanceof StoryError) {
      throw error;
    } else {
      throw error;
    }
  }
  if (mustBeV2) {throwsStateNotRepresentable();}
  if (await checkpointIsV1Blocked(database, args.storyId, args.transitionId)) {
    return undefined;
  }
  const items = projectStoryItemEffects(
    capturedBase.storyItems,
    args.input.effects,
  );
  const legacy = continuationCheckpointCandidate({
    storyId: args.storyId,
    passageId,
    transitionId: args.transitionId,
    input: args.input,
    completingDecisionPassageId: args.completingDecisionPassageId,
    interactionId,
    contentDocumentHash: args.contentDocumentHash ?? null,
    rootHash,
    rootRevision,
    pins,
    source: current.source,
    premise: current.premise,
    storyteller: current.storyteller,
    execution: current.execution,
    usagePolicy: current.usagePolicy,
    items,
    campaign: campaignRow,
    activeSceneScope: scope,
    continuityNotes: projectedNotes,
  });
  if (!legacy) {return undefined;}
  const parsed = sceneCheckpointSchema.safeParse(legacy);
  if (!parsed.success) {return undefined;}
  const staged = await stageSceneCheckpointObject(documentStore, parsed.data);
  return {
    ...staged,
    passageId,
    interactionId,
    baseRootHash,
    baseRootRevision,
  };
}
