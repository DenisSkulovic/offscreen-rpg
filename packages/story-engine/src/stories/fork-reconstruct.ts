import { isDeepStrictEqual } from 'node:util';
import {
  hashCanonicalJson,
  sceneCheckpointSchema,
  type SceneCheckpointV2,
} from '@offscreen/documents';
import { offerSchema } from '@offscreen/game/offers';
import type { Transaction } from '@offscreen/db';
import { StoryError } from './errors';
import { readSceneAfterState } from './scene-after-state';
import {
  assertV2PostStateMatches,
  projectHistoricalSituationAuthorization,
  toV2FictionalState,
} from './scene-checkpoint-v2';
import { mapV2ForkState, type ForkStateIdentities } from './fork-state';
import {
  type SceneCheckpointWriterStore,
  type StagedSceneCheckpoint,
} from './scene-checkpoint';

type VersionedOpenPayload = { version: 1; body: unknown };

export class ForkReconstructError extends Error {
  readonly code: 'obligation_not_rehomable' | 'action_not_rehomable';

  constructor(code: 'obligation_not_rehomable' | 'action_not_rehomable') {
    super(code);
    this.name = 'ForkReconstructError';
    this.code = code;
  }
}

export type V2ForkMapped = {
  checkpoint: SceneCheckpointV2;
  identities: ForkStateIdentities;
};

type PresentFictionalState = Extract<
  SceneCheckpointV2['fictionalState'],
  { mechanicsAbsent: false }
>;

function isVersionedOpenPayload(value: unknown): value is VersionedOpenPayload {
  return (
    typeof value === 'object' &&
    value !== null &&
    (value as VersionedOpenPayload).version === 1 &&
    'body' in (value as object)
  );
}

function unwrapVersionedOpenPayload(value: unknown): unknown {
  if (isVersionedOpenPayload(value)) {
    return value.body;
  }
  return value;
}

function checkpointHoldsToCampaignHolds(
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
        return hold;
    }
  });
}

function campaignOfferFromSnapshot(
  offer: PresentFictionalState['offer'],
): unknown | null {
  if (offer === null) {
    return null;
  }
  const payloadBody = unwrapVersionedOpenPayload(offer.payload);
  if (
    typeof payloadBody === 'object' &&
    payloadBody !== null &&
    'offer' in payloadBody &&
    payloadBody.offer != null
  ) {
    const record = payloadBody.offer as Record<string, unknown>;
    if (Array.isArray(record.nodes)) {
      return offerSchema.parse({ id: record.id, nodes: record.nodes });
    }
    return offerSchema.parse(payloadBody.offer);
  }
  return offerSchema.parse({ id: offer.id, nodes: [] });
}

function offerRowPlans(offer: NonNullable<PresentFictionalState['offer']>) {
  const payloadBody = unwrapVersionedOpenPayload(offer.payload);
  if (typeof payloadBody !== 'object' || payloadBody === null) {
    return [];
  }
  if (!('plans' in payloadBody)) {
    return [];
  }
  const plans = (payloadBody as { plans: unknown }).plans;
  if (isVersionedOpenPayload(plans)) {
    return unwrapVersionedOpenPayload(plans);
  }
  return [];
}

async function stageV2ForkCheckpointObject(
  store: SceneCheckpointWriterStore,
  mapped: V2ForkMapped,
): Promise<StagedSceneCheckpoint> {
  const parsed = sceneCheckpointSchema.parse(mapped.checkpoint);
  const checkpointHash = hashCanonicalJson(parsed);
  const storedHash = await store.putSceneCheckpoint(parsed);
  if (storedHash !== checkpointHash) {
    throw new StoryError('invalid', 'checkpoint_hash_mismatch');
  }
  const stored = await store.readSceneCheckpoint(checkpointHash);
  if (
    hashCanonicalJson(stored) !== checkpointHash ||
    !isDeepStrictEqual(stored, parsed)
  ) {
    throw new StoryError('invalid', 'checkpoint_hash_mismatch');
  }
  // V2 forks reuse the parent's immutable library root; canon manifest campaign id stays on the source story.
  return { checkpoint: parsed, checkpointHash };
}

export async function stageV2ForkCheckpoint(
  store: SceneCheckpointWriterStore,
  checkpoint: SceneCheckpointV2,
  sourceStoryId: string,
  forkStoryId: string,
): Promise<{ mapped: V2ForkMapped; staged: StagedSceneCheckpoint }> {
  const mapped = mapV2ForkState({ checkpoint, sourceStoryId, forkStoryId });
  const staged = await stageV2ForkCheckpointObject(store, mapped);
  return { mapped, staged };
}

export function v2ForkRowPlan(
  mapped: V2ForkMapped,
  sourceSceneSequence: number,
) {
  const { checkpoint, identities } = mapped;
  const fictional = checkpoint.fictionalState;
  if (fictional.mechanicsAbsent) {
    throw new Error('mechanics_absent');
  }

  const passage = checkpoint.passage;
  const forkStoryId = checkpoint.storyId;

  const obligations = fictional.worldObligations.map((obligation) => {
    if (obligation.dueGameSecond === null) {
      throw new ForkReconstructError('obligation_not_rehomable');
    }
    return {
      id: obligation.id,
      storyId: forkStoryId,
      revision: obligation.revision,
      definition: unwrapVersionedOpenPayload(obligation.definition),
      dueGameSecond: obligation.dueGameSecond,
      state: obligation.state,
      firedAtGameSecond: obligation.firedAtGameSecond,
    };
  });

  let action: {
    operationId: string;
    storyId: string;
    offerId: string;
    actionKey: string;
    baseRevision: number;
    offer: unknown;
    plan: unknown;
    pendingResolution: unknown;
    preparationGenerationId: null;
    startGameSecond: number;
    targetGameSecond: number;
    state: string;
    revision: number;
  } | null = null;

  if (fictional.activeAction !== null) {
    const active = fictional.activeAction;
    if (active.targetGameSecond <= active.startGameSecond) {
      throw new ForkReconstructError('action_not_rehomable');
    }
    action = {
      operationId: active.id,
      storyId: forkStoryId,
      offerId: active.offerId,
      actionKey: active.actionKey,
      baseRevision: active.baseRevision,
      offer: unwrapVersionedOpenPayload(active.offer),
      plan: unwrapVersionedOpenPayload(active.plan),
      pendingResolution:
        active.pendingResolution === null
          ? null
          : unwrapVersionedOpenPayload(active.pendingResolution),
      preparationGenerationId: null,
      startGameSecond: active.startGameSecond,
      targetGameSecond: active.targetGameSecond,
      state: active.status,
      revision: active.revision,
    };
  }

  const offerRow =
    fictional.offer === null
      ? null
      : {
          id: fictional.offer.id,
          storyId: forkStoryId,
          narrativeRevision: 1,
          plans: offerRowPlans(fictional.offer),
        };

  return {
    story: {
      id: forkStoryId,
      source: checkpoint.source,
      premise: checkpoint.premise,
      continuityNotes: fictional.continuityNotes,
      activeSceneScope: fictional.activeSceneScope,
      documentRootHash: checkpoint.canon.rootHash,
      documentRootRevision: checkpoint.canon.rootRevision,
      forkedFromStoryId: identities.sourceStoryId,
      forkedFromPassageId: identities.passage.source,
      forkedFromSequence: sourceSceneSequence,
    },
    items: fictional.items.map((item) => ({
      storyId: forkStoryId,
      key: item.key,
      label: item.label,
      holderKey: item.holderKey,
    })),
    settingsRevision: fictional.settingsRevision,
    campaign: {
      storyId: forkStoryId,
      settingsRevision: fictional.settingsRevision,
      character: fictional.character,
      storyFacts: fictional.storyFacts,
      activityOccurrences: fictional.activityOccurrences,
      acceptedActivityPlan:
        fictional.acceptedActivityPlan === null
          ? null
          : unwrapVersionedOpenPayload(fictional.acceptedActivityPlan),
      content: fictional.content,
      location: fictional.location,
      gameSecond: fictional.gameSecond,
      clock: fictional.clock,
      clockPace: fictional.pace,
      holds: checkpointHoldsToCampaignHolds(fictional.holds),
      offer: campaignOfferFromSnapshot(fictional.offer),
      situationAuthorization: projectHistoricalSituationAuthorization(
        fictional.situationAuthorization,
      ),
      activeActivityId: fictional.activeActivityId,
      activeActionOperationId: fictional.activeActionOperationId,
      worldConditions: fictional.worldConditions,
    },
    activities: fictional.activeActivities.map((activity) => ({
      id: activity.id,
      storyId: forkStoryId,
      plan: unwrapVersionedOpenPayload(activity.plan),
      state: activity.state,
      boundariesSettled: activity.boundariesSettled,
      revision: activity.revision,
      progress: unwrapVersionedOpenPayload(activity.progress),
    })),
    obligations,
    offer: offerRow,
    action,
    passage: {
      id: identities.passage.child,
      storyId: forkStoryId,
      sequence: 1,
      transitionId: null,
      response: passage.response,
      initialItems: passage.initialItems,
      effects: passage.effects,
      responseSource: passage.responseSource,
      decisionPlan:
        passage.decisionPlan === null
          ? null
          : unwrapVersionedOpenPayload(passage.decisionPlan),
      waitPlan:
        passage.waitPlan === null
          ? null
          : unwrapVersionedOpenPayload(passage.waitPlan),
      controlRevision: passage.controlRevision,
      content: passage.content,
      contentDocumentHash: passage.contentDocumentHash,
      interaction: passage.interaction,
      sourceGenerationId: null,
      sourceGenerationPart: null,
    },
    fictionalState: fictional,
  };
}

export async function assertReconstructedV2Matches(
  tx: Transaction,
  forkStoryId: string,
  expectedFictionalState: SceneCheckpointV2['fictionalState'],
): Promise<void> {
  const afterState = await readSceneAfterState(tx, forkStoryId);
  const actual = toV2FictionalState(afterState);
  assertV2PostStateMatches(expectedFictionalState, actual);
}
