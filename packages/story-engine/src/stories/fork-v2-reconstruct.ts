import type { SceneCheckpointV2 } from '@offscreen/documents';
import { hashCanonicalJson } from '@offscreen/documents';
import type {
  campaign,
  campaignSettings,
  gameActionExecution,
  gameActivity,
  gameOffer,
  worldObligation,
} from '@offscreen/db/campaign-schema';
import type {
  story,
  storyDocumentCommit,
  storyItem,
  storyPassage,
} from '@offscreen/db/story-schema';
import { immediateActionPlanSchema } from '@offscreen/game/immediate-actions';
import {
  isNarrativeIntentPlanValue,
  parseStoredActionPlan,
} from '../campaign/stored-action-plan';
import { offerSchema } from '@offscreen/game/offers';
import { ForkStateError } from './fork-state.js';
import { projectHistoricalSituationAuthorization } from './scene-checkpoint-v2.js';

type PresentFictionalState = Extract<
  SceneCheckpointV2['fictionalState'],
  { mechanicsAbsent: false }
>;

type VersionedOpenPayload = { version: 1; body: unknown };

export class SettingsIncompleteError extends Error {
  constructor() {
    super('settings_incomplete');
    this.name = 'SettingsIncompleteError';
  }
}

export type BuildV2ForkRowsInput = {
  checkpoint: SceneCheckpointV2;
  settingsRows: ReadonlyArray<typeof campaignSettings.$inferSelect>;
  forkStoryId: string;
  ownerId: string;
  sourceStoryId: string;
  sourcePassageId: string;
  sourceSceneSequence: number;
  checkpointHash: string;
  clockAnchorAt: Date;
};

export type V2ForkRows = {
  story: typeof story.$inferInsert;
  storyPassage: typeof storyPassage.$inferInsert;
  storyItems: Array<typeof storyItem.$inferInsert>;
  campaignSettings: Array<typeof campaignSettings.$inferInsert>;
  campaign: typeof campaign.$inferInsert;
  gameOffers: Array<typeof gameOffer.$inferInsert>;
  gameActivities: Array<typeof gameActivity.$inferInsert>;
  worldObligations: Array<typeof worldObligation.$inferInsert>;
  gameActionExecutions: Array<typeof gameActionExecution.$inferInsert>;
  storyDocumentCommit: typeof storyDocumentCommit.$inferInsert | null;
};

function unwrapVersioned(value: unknown): unknown {
  if (
    typeof value === 'object' &&
    value !== null &&
    (value as VersionedOpenPayload).version === 1 &&
    'body' in (value as object)
  ) {
    return (value as VersionedOpenPayload).body;
  }
  return value;
}

function projectCheckpointHolds(
  holds: PresentFictionalState['holds'],
): unknown[] {
  return holds.map((hold) => {
    switch (hold.kind) {
      case 'storyteller-intent':
        return {
          kind: 'storyteller-intent' as const,
          operationId: hold.id,
          reason: 'required-turn' as const,
        };
      case 'storyteller':
        return {
          kind: 'storyteller' as const,
          generationId: hold.id,
          reason: 'required-turn' as const,
        };
      case 'decision':
        return {
          kind: 'decision' as const,
          offerId: hold.id,
          reason: 'player-choice' as const,
        };
      case 'world-obligation':
        return {
          kind: 'world-obligation' as const,
          obligationId: hold.id,
          reason: 'controlling-event' as const,
        };
      default:
        throw new Error('invalid_checkpoint_hold');
    }
  });
}

function obligationDbState(state: string): string {
  if (state === 'pending' || state === 'fired' || state === 'cancelled') {
    return state;
  }
  if (state === 'active') {
    return 'pending';
  }
  return state;
}

function actionDbState(status: string): string {
  if (status === 'paused') {
    return 'paused';
  }
  if (
    status === 'running' ||
    status === 'interrupted' ||
    status === 'settled'
  ) {
    return status;
  }
  return 'running';
}

function narrativeRevisionFromCheckpoint(
  fictional: PresentFictionalState,
): number {
  if (fictional.activeAction !== null) {
    return fictional.activeAction.baseRevision;
  }
  return 1;
}

function campaignOfferColumnFromFictional(
  offer: PresentFictionalState['offer'],
): unknown | null {
  if (offer === null) {
    return null;
  }
  const payloadBody = unwrapVersioned(offer.payload);
  let offerTree: Record<string, unknown> = { id: offer.id, nodes: [] };
  if (
    typeof payloadBody === 'object' &&
    payloadBody !== null &&
    'offer' in payloadBody &&
    payloadBody.offer != null
  ) {
    const parsed = offerSchema.safeParse(payloadBody.offer);
    offerTree = parsed.success
      ? (parsed.data as Record<string, unknown>)
      : (payloadBody.offer as Record<string, unknown>);
  }
  return {
    ...offerTree,
    id: offer.id,
    source: offer.source,
    meaning: offer.meaning,
  };
}

function extractOfferPlans(offer: PresentFictionalState['offer']): unknown {
  if (offer === null) {
    return [];
  }
  const body = unwrapVersioned(offer.payload);
  if (typeof body !== 'object' || body === null) {
    return [];
  }
  const plans = (body as { plans?: unknown }).plans;
  if (plans == null) {
    return [];
  }
  const unwrapped = unwrapVersioned(plans);
  if (Array.isArray(unwrapped)) {
    return unwrapped.map((plan) => {
      const parsed = parseStoredActionPlan(plan);
      if (isNarrativeIntentPlanValue(parsed)) {
        return parsed;
      }
      return immediateActionPlanSchema.parse(plan);
    });
  }
  return unwrapped;
}

/** Pure insert bundle for a v2 scene checkpoint fork. */
export function buildV2ForkRows(input: BuildV2ForkRowsInput): V2ForkRows {
  const checkpoint = input.checkpoint;
  if (checkpoint.fictionalState.mechanicsAbsent) {
    throw new ForkStateError('mechanics_absent');
  }
  const fictional = checkpoint.fictionalState;

  const exactSettings = input.settingsRows.find(
    (row) => row.revision === fictional.settingsRevision,
  );
  if (!exactSettings) {
    throw new SettingsIncompleteError();
  }
  const lockedFlag =
    typeof exactSettings.settings === 'object' &&
    exactSettings.settings !== null &&
    'locked' in exactSettings.settings &&
    (exactSettings.settings as { locked?: boolean }).locked === true
      ? 1
      : 0;

  const branchRootHash = checkpoint.canon.rootHash;
  const branchRootRevision = checkpoint.canon.rootRevision;

  const storyRow: typeof story.$inferInsert = {
    id: input.forkStoryId,
    ownerId: input.ownerId,
    source: checkpoint.source,
    premise: checkpoint.premise,
    storyteller: checkpoint.storyteller,
    execution: checkpoint.execution,
    usagePolicy: checkpoint.usagePolicy,
    continuityNotes: fictional.continuityNotes,
    activeSceneScope: fictional.activeSceneScope,
    documentRootHash: branchRootHash,
    documentRootRevision: branchRootRevision,
    forkedFromStoryId: input.sourceStoryId,
    forkedFromPassageId: input.sourcePassageId,
    forkedFromSequence: input.sourceSceneSequence,
    revision: 1,
  };

  const decisionPlan =
    checkpoint.passage.decisionPlan == null
      ? null
      : unwrapVersioned(checkpoint.passage.decisionPlan);
  const waitPlan =
    checkpoint.passage.waitPlan == null
      ? null
      : unwrapVersioned(checkpoint.passage.waitPlan);

  const storyPassageRow: typeof storyPassage.$inferInsert = {
    id: checkpoint.passageId,
    storyId: input.forkStoryId,
    sequence: 1,
    transitionId: null,
    response: checkpoint.passage.response,
    initialItems: checkpoint.passage.initialItems,
    effects: checkpoint.passage.effects,
    responseSource: checkpoint.passage.responseSource,
    decisionPlan,
    waitPlan,
    controlRevision: checkpoint.passage.controlRevision,
    content: checkpoint.passage.content,
    contentDocumentHash: checkpoint.passage.contentDocumentHash,
    interaction: checkpoint.passage.interaction,
    appearance: null,
    sourceGenerationId: null,
    sourceGenerationPart: null,
  };

  const storyItems = fictional.items.map((item) => ({
    storyId: input.forkStoryId,
    key: item.key,
    label: item.label,
    holderKey: item.holderKey,
  }));

  const campaignSettingsRows = input.settingsRows.map((row) => ({
    storyId: input.forkStoryId,
    revision: row.revision,
    settings: row.settings,
    profile: row.profile,
  }));

  const campaignRow: typeof campaign.$inferInsert = {
    storyId: input.forkStoryId,
    settingsRevision: fictional.settingsRevision,
    locked: lockedFlag,
    character: fictional.character,
    storyFacts: fictional.storyFacts,
    activityOccurrences: fictional.activityOccurrences,
    acceptedActivityPlan:
      fictional.acceptedActivityPlan == null
        ? null
        : unwrapVersioned(fictional.acceptedActivityPlan),
    content: fictional.content,
    location: fictional.location,
    gameSecond: fictional.gameSecond,
    clock: fictional.clock,
    clockAnchorAt: input.clockAnchorAt,
    clockPace: fictional.pace,
    holds: projectCheckpointHolds(fictional.holds),
    offer: campaignOfferColumnFromFictional(fictional.offer),
    situationAuthorization: projectHistoricalSituationAuthorization(
      fictional.situationAuthorization,
    ),
    activeActivityId: fictional.activeActivityId,
    activeActionOperationId: fictional.activeActionOperationId,
    worldConditions: fictional.worldConditions,
  };

  const gameOffers: Array<typeof gameOffer.$inferInsert> = [];
  if (fictional.offer !== null) {
    gameOffers.push({
      id: fictional.offer.id,
      storyId: input.forkStoryId,
      narrativeRevision: narrativeRevisionFromCheckpoint(fictional),
      plans: extractOfferPlans(fictional.offer),
    });
  }

  const gameActivities: Array<typeof gameActivity.$inferInsert> =
    fictional.activeActivities.map((activity) => ({
      id: activity.id,
      storyId: input.forkStoryId,
      plan: unwrapVersioned(activity.plan),
      state: activity.state,
      boundariesSettled: activity.boundariesSettled,
      revision: activity.revision,
      progress: unwrapVersioned(activity.progress),
    }));

  const worldObligations: Array<typeof worldObligation.$inferInsert> =
    fictional.worldObligations.map((obligation) => {
      const due = obligation.dueGameSecond;
      if (due === null || due <= 0) {
        throw new ForkStateError('obligation_not_representable');
      }
      return {
        id: obligation.id,
        storyId: input.forkStoryId,
        revision: obligation.revision,
        definition: unwrapVersioned(obligation.definition),
        dueGameSecond: due,
        state: obligationDbState(obligation.state),
        firedAtGameSecond: obligation.firedAtGameSecond,
      };
    });

  const gameActionExecutions: Array<typeof gameActionExecution.$inferInsert> =
    [];
  if (fictional.activeAction !== null) {
    const action = fictional.activeAction;
    if (action.targetGameSecond <= action.startGameSecond) {
      throw new ForkStateError('action_not_representable');
    }
    const planBody = unwrapVersioned(action.plan);
    const planWithTarget =
      action.target == null
        ? planBody
        : typeof planBody === 'object' && planBody !== null
          ? {
              ...(planBody as Record<string, unknown>),
              __v2ForkTarget: action.target,
            }
          : { body: planBody, __v2ForkTarget: action.target };
    gameActionExecutions.push({
      operationId: action.id,
      storyId: input.forkStoryId,
      offerId: action.offerId,
      actionKey: action.actionKey,
      baseRevision: action.baseRevision,
      offer: unwrapVersioned(action.offer),
      plan: planWithTarget,
      pendingResolution:
        action.pendingResolution == null
          ? null
          : unwrapVersioned(action.pendingResolution),
      preparationGenerationId: null,
      startGameSecond: action.startGameSecond,
      targetGameSecond: action.targetGameSecond,
      state: actionDbState(action.status),
      revision: action.revision,
    });
  }

  const storyDocumentCommit =
    branchRootHash === null
      ? null
      : {
          storyId: input.forkStoryId,
          operationId: input.forkStoryId,
          requestHash: createRequestHash({
            sourceStoryId: input.sourceStoryId,
            sceneSequence: input.sourceSceneSequence,
            checkpointHash: input.checkpointHash,
            forkStoryId: input.forkStoryId,
          }),
          baseRootHash: null,
          rootHash: branchRootHash,
          rootRevision: branchRootRevision,
        };

  return {
    story: storyRow,
    storyPassage: storyPassageRow,
    storyItems,
    campaignSettings: campaignSettingsRows,
    campaign: campaignRow,
    gameOffers,
    gameActivities,
    worldObligations,
    gameActionExecutions,
    storyDocumentCommit,
  };
}

function createRequestHash(args: {
  sourceStoryId: string;
  sceneSequence: number;
  checkpointHash: string;
  forkStoryId: string;
}): string {
  return hashCanonicalJson({
    sourceStoryId: args.sourceStoryId,
    sceneSequence: args.sceneSequence,
    checkpointHash: args.checkpointHash,
    forkStoryId: args.forkStoryId,
  });
}
