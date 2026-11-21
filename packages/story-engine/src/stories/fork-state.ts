import {
  sceneCheckpointV2Schema,
  stableNamespacedDocumentId,
  type SceneCheckpointV2,
} from '@offscreen/documents';
import { acceptedActivityPlanSchema } from '../campaign/accepted-plans.js';
import { pendingImmediateActionResolutionSchema } from '../campaign/action-overlap.js';
import {
  activityProgressSchema,
  resolvedActivityPlanSchema,
} from '@offscreen/game/activities';
import { immediateActionPlanSchema } from '@offscreen/game/immediate-actions';
import {
  isImmediateActionPlan,
  isNarrativeIntentPlanValue,
  parseStoredActionPlan,
} from '../campaign/stored-action-plan';
import { offerSchema } from '@offscreen/game/offers';
import { worldObligationSchema } from '@offscreen/game/world-obligations';
import { z } from 'zod';

export class ForkStateError extends Error {
  readonly code:
    | 'checkpoint_version_unsupported'
    | 'mechanics_absent'
    | 'fork_identity_unmapped'
    | 'obligation_not_representable'
    | 'action_not_representable';

  constructor(
    code:
      | 'checkpoint_version_unsupported'
      | 'mechanics_absent'
      | 'fork_identity_unmapped'
      | 'obligation_not_representable'
      | 'action_not_representable',
    message?: string,
  ) {
    super(message ?? code);
    this.name = 'ForkStateError';
    this.code = code;
  }
}

export type ForkIdentityPair = { source: string; child: string };

export type ForkStateIdentities = {
  sourceStoryId: string;
  passage: ForkIdentityPair;
  interaction: ForkIdentityPair | null;
  offer: ForkIdentityPair | null;
  activities: ForkIdentityPair[];
  obligations: ForkIdentityPair[];
  action: ForkIdentityPair | null;
  heldGenerations: ForkIdentityPair[];
};

export type MapV2ForkStateInput = {
  checkpoint: SceneCheckpointV2;
  sourceStoryId: string;
  forkStoryId: string;
};

type PresentFictionalState = Extract<
  SceneCheckpointV2['fictionalState'],
  { mechanicsAbsent: false }
>;

type VersionedOpenPayload = { version: 1; body: unknown };

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function forkEntityId(
  forkStoryId: string,
  kind: string,
  originalId: string,
): string {
  return stableNamespacedDocumentId('fork', forkStoryId, `${kind}:${originalId}`);
}

function assertMappedId(actual: string, expected: string): void {
  if (actual !== expected) {
    throw new ForkStateError('fork_identity_unmapped');
  }
}

function isVersionedPayload(value: unknown): value is VersionedOpenPayload {
  return (
    typeof value === 'object' &&
    value !== null &&
    (value as VersionedOpenPayload).version === 1 &&
    'body' in (value as object)
  );
}

function unwrapVersionedPayload(value: unknown): unknown {
  if (isVersionedPayload(value)) {
    return value.body;
  }
  return value;
}

function wrapVersionedPayload(body: unknown): VersionedOpenPayload {
  return { version: 1, body: body as VersionedOpenPayload['body'] };
}

function collectSourceExecutionIds(identities: ForkStateIdentities): Set<string> {
  const ids = new Set<string>();
  ids.add(identities.passage.source);
  if (identities.interaction) {
    ids.add(identities.interaction.source);
  }
  if (identities.offer) {
    ids.add(identities.offer.source);
  }
  for (const activity of identities.activities) {
    ids.add(activity.source);
  }
  for (const obligation of identities.obligations) {
    ids.add(obligation.source);
  }
  if (identities.action) {
    ids.add(identities.action.source);
  }
  for (const held of identities.heldGenerations) {
    ids.add(held.source);
  }
  return ids;
}

function childExecutionId(
  sourceId: string,
  identities: ForkStateIdentities,
  activityIds: Map<string, string>,
  obligationIds: Map<string, string>,
): string | undefined {
  if (identities.passage.source === sourceId) {
    return identities.passage.child;
  }
  if (identities.interaction?.source === sourceId) {
    return identities.interaction.child;
  }
  if (identities.offer?.source === sourceId) {
    return identities.offer.child;
  }
  if (identities.action?.source === sourceId) {
    return identities.action.child;
  }
  const activityChild = activityIds.get(sourceId);
  if (activityChild) {
    return activityChild;
  }
  const obligationChild = obligationIds.get(sourceId);
  if (obligationChild) {
    return obligationChild;
  }
  const held = identities.heldGenerations.find(
    (entry) => entry.source === sourceId,
  );
  return held?.child;
}

function assertNoUnmappedExecutionIds(
  value: unknown,
  sourceIds: Set<string>,
): void {
  if (typeof value === 'string') {
    if (UUID_PATTERN.test(value) && sourceIds.has(value)) {
      throw new ForkStateError('fork_identity_unmapped');
    }
    return;
  }
  if (Array.isArray(value)) {
    for (const entry of value) {
      assertNoUnmappedExecutionIds(entry, sourceIds);
    }
    return;
  }
  if (typeof value === 'object' && value !== null) {
    for (const entry of Object.values(value)) {
      assertNoUnmappedExecutionIds(entry, sourceIds);
    }
  }
}

function remapImmediatePlans(
  plans: readonly z.infer<typeof immediateActionPlanSchema>[],
  remapChild: (sourceId: string) => string | undefined,
): z.infer<typeof immediateActionPlanSchema>[] {
  return plans.map((plan) => {
    if (plan.resolution.kind !== 'resume') {
      return plan;
    }
    const activityId = plan.resolution.activityId;
    if (activityId === undefined) {
      return plan;
    }
    const mapped = remapChild(activityId);
    if (mapped === undefined) {
      throw new ForkStateError('fork_identity_unmapped');
    }
    return {
      ...plan,
      resolution: { ...plan.resolution, activityId: mapped },
    };
  });
}

function remapOfferPayloadBody(
  body: unknown,
  sourceOfferId: string,
  mappedOfferId: string,
  remapChild: (sourceId: string) => string | undefined,
  sourceIds: Set<string>,
): unknown {
  if (typeof body !== 'object' || body === null) {
    assertNoUnmappedExecutionIds(body, sourceIds);
    return body;
  }
  const record = { ...(body as Record<string, unknown>) };
  const offerValue = record.offer;
  const parsedOffer = offerSchema.safeParse(offerValue);
  if (parsedOffer.success) {
    if (parsedOffer.data.id !== sourceOfferId) {
      throw new ForkStateError('fork_identity_unmapped');
    }
    record.offer = offerSchema.parse({ ...parsedOffer.data, id: mappedOfferId });
  } else if (
    typeof offerValue === 'object' &&
    offerValue !== null &&
    typeof (offerValue as { id?: unknown }).id === 'string'
  ) {
    const embeddedId = (offerValue as { id: string }).id;
    if (embeddedId !== sourceOfferId) {
      throw new ForkStateError('fork_identity_unmapped');
    }
    record.offer = { ...(offerValue as Record<string, unknown>), id: mappedOfferId };
  }
  const plansValue = record.plans;
  if (plansValue !== undefined && plansValue !== null) {
    const unwrapped = unwrapVersionedPayload(plansValue);
  if (Array.isArray(unwrapped)) {
    const parsedPlans = unwrapped.map((entry) => parseStoredActionPlan(entry));
    const mechanicalOnly = parsedPlans.every(isImmediateActionPlan);
    if (mechanicalOnly) {
      record.plans = remapImmediatePlans(
        parsedPlans.filter(isImmediateActionPlan),
        remapChild,
      );
    } else {
      assertNoUnmappedExecutionIds(unwrapped, sourceIds);
      record.plans = parsedPlans;
    }
  } else {
    assertNoUnmappedExecutionIds(unwrapped, sourceIds);
    record.plans = plansValue;
  }
  }
  assertNoUnmappedExecutionIds(record, sourceIds);
  return record;
}

function remapVersionedPayload(
  payload: unknown,
  rewriter: (body: unknown) => unknown,
  sourceIds: Set<string>,
): unknown {
  if (!isVersionedPayload(payload)) {
    assertNoUnmappedExecutionIds(payload, sourceIds);
    return payload;
  }
  const body = rewriter(payload.body);
  assertNoUnmappedExecutionIds(body, sourceIds);
  return wrapVersionedPayload(body);
}

function remapAcceptedActivityPlanPayload(
  payload: unknown,
  mappedOfferId: string | null,
  remapChild: (sourceId: string) => string | undefined,
  sourceIds: Set<string>,
): unknown {
  return remapVersionedPayload(
    payload,
    (body) => {
      const parsed = acceptedActivityPlanSchema.safeParse(body);
      if (!parsed.success) {
        assertNoUnmappedExecutionIds(body, sourceIds);
        return body;
      }
      const plan = parsed.data;
      return acceptedActivityPlanSchema.parse({
        ...plan,
        sourceOfferId:
          mappedOfferId ?? remapChild(plan.sourceOfferId) ?? plan.sourceOfferId,
        entries: plan.entries.map((entry) => ({
          ...entry,
          plan:
            entry.plan.resolution.kind === 'resume' &&
            entry.plan.resolution.activityId
              ? {
                  ...entry.plan,
                  resolution: {
                    ...entry.plan.resolution,
                    activityId:
                      remapChild(entry.plan.resolution.activityId) ??
                      entry.plan.resolution.activityId,
                  },
                }
              : entry.plan,
          activityId:
            entry.activityId === null
              ? null
              : (remapChild(entry.activityId) ?? entry.activityId),
        })),
      });
    },
    sourceIds,
  );
}

function remapActivityVersionedPayload(
  payload: unknown,
  kind: 'plan' | 'progress',
  sourceIds: Set<string>,
): unknown {
  return remapVersionedPayload(
    payload,
    (body) => {
      if (kind === 'plan') {
        const parsed = resolvedActivityPlanSchema.safeParse(body);
        if (parsed.success) {
          return parsed.data;
        }
      } else {
        const parsed = activityProgressSchema.safeParse(body);
        if (parsed.success) {
          return parsed.data;
        }
      }
      assertNoUnmappedExecutionIds(body, sourceIds);
      return body;
    },
    sourceIds,
  );
}

function remapObligationDefinitionPayload(
  payload: unknown,
  childObligationId: string,
  sourceIds: Set<string>,
): unknown {
  return remapVersionedPayload(
    payload,
    (body) => {
      const parsed = worldObligationSchema.safeParse(body);
      if (parsed.success) {
        return worldObligationSchema.parse({
          ...parsed.data,
          id: childObligationId,
        });
      }
      assertNoUnmappedExecutionIds(body, sourceIds);
      return body;
    },
    sourceIds,
  );
}

function remapActiveActionVersionedField(
  payload: unknown,
  kind: 'offer' | 'plan' | 'pendingResolution',
  mappedOfferId: string,
  remapChild: (sourceId: string) => string | undefined,
  sourceIds: Set<string>,
): unknown {
  return remapVersionedPayload(
    payload,
    (body) => {
      if (kind === 'offer') {
        const parsedOffer = offerSchema.safeParse(body);
        if (parsedOffer.success) {
          return offerSchema.parse({ ...parsedOffer.data, id: mappedOfferId });
        }
        if (
          typeof body === 'object' &&
          body !== null &&
          typeof (body as { id?: unknown }).id === 'string'
        ) {
          const sourceId = (body as { id: string }).id;
          const mapped = remapChild(sourceId) ?? mappedOfferId;
          return { ...(body as Record<string, unknown>), id: mapped };
        }
      }
      if (kind === 'plan') {
        if (isNarrativeIntentPlanValue(body)) {
          return parseStoredActionPlan(body);
        }
        const parsed = immediateActionPlanSchema.safeParse(body);
        if (parsed.success) {
          return remapImmediatePlans([parsed.data], remapChild)[0];
        }
      }
      if (kind === 'pendingResolution') {
        const parsed = pendingImmediateActionResolutionSchema.safeParse(body);
        if (parsed.success) {
          return parsed.data;
        }
      }
      assertNoUnmappedExecutionIds(body, sourceIds);
      return body;
    },
    sourceIds,
  );
}

function parseV2Checkpoint(checkpoint: SceneCheckpointV2): SceneCheckpointV2 {
  if (
    (checkpoint as { format?: string }).format !== 'offscreen.scene-checkpoint.v2'
  ) {
    throw new ForkStateError('checkpoint_version_unsupported');
  }
  const parsed = sceneCheckpointV2Schema.safeParse(checkpoint);
  if (!parsed.success) {
    throw new ForkStateError('checkpoint_version_unsupported');
  }
  return parsed.data;
}

function remapPresentFictionalState(
  forkStoryId: string,
  childPassageId: string,
  fictionalState: PresentFictionalState,
  identities: ForkStateIdentities,
): PresentFictionalState {
  const activityIds = new Map<string, string>();
  for (const activity of fictionalState.activeActivities) {
    const childId = forkEntityId(forkStoryId, 'activity', activity.id);
    activityIds.set(activity.id, childId);
    identities.activities.push({ source: activity.id, child: childId });
  }

  const obligationIds = new Map<string, string>();
  for (const obligation of fictionalState.worldObligations) {
    const childId = forkEntityId(forkStoryId, 'obligation', obligation.id);
    obligationIds.set(obligation.id, childId);
    identities.obligations.push({ source: obligation.id, child: childId });
  }

  const sourceIds = new Set<string>();
  sourceIds.add(identities.passage.source);
  if (identities.interaction) {
    sourceIds.add(identities.interaction.source);
  }
  if (fictionalState.offer !== null) {
    sourceIds.add(fictionalState.offer.id);
  }
  for (const activity of fictionalState.activeActivities) {
    sourceIds.add(activity.id);
  }
  for (const obligation of fictionalState.worldObligations) {
    sourceIds.add(obligation.id);
  }
  if (fictionalState.activeAction !== null) {
    sourceIds.add(fictionalState.activeAction.id);
  }
  for (const hold of fictionalState.holds) {
    if (hold.kind === 'storyteller' || hold.kind === 'storyteller-intent') {
      sourceIds.add(hold.id);
    }
    if (hold.kind === 'decision' && fictionalState.offer !== null) {
      sourceIds.add(fictionalState.offer.id);
    }
    if (hold.kind === 'world-obligation') {
      sourceIds.add(hold.id);
    }
  }

  const remapChild = (sourceId: string) =>
    childExecutionId(sourceId, identities, activityIds, obligationIds);

  let mappedOfferId: string | null = null;
  let mappedOffer = fictionalState.offer;
  if (fictionalState.offer !== null) {
    const sourceOfferId = fictionalState.offer.id;
    mappedOfferId = forkEntityId(forkStoryId, 'offer', sourceOfferId);
    identities.offer = { source: sourceOfferId, child: mappedOfferId };
    const payload = isVersionedPayload(fictionalState.offer.payload)
      ? wrapVersionedPayload(
          remapOfferPayloadBody(
            fictionalState.offer.payload.body,
            sourceOfferId,
            mappedOfferId,
            remapChild,
            sourceIds,
          ),
        )
      : fictionalState.offer.payload;
    mappedOffer = {
      ...fictionalState.offer,
      id: mappedOfferId,
      payload: payload as typeof fictionalState.offer.payload,
    };
  }

  let mappedActiveAction = fictionalState.activeAction;
  let mappedActiveActionOperationId = fictionalState.activeActionOperationId;
  if (mappedActiveAction === null) {
    if (mappedActiveActionOperationId !== null) {
      throw new ForkStateError('fork_identity_unmapped');
    }
  } else {
    const sourceActionId = mappedActiveAction.id;
    if (
      mappedActiveActionOperationId !== null &&
      mappedActiveActionOperationId !== sourceActionId
    ) {
      throw new ForkStateError('fork_identity_unmapped');
    }
    const mappedActionId = forkEntityId(forkStoryId, 'action', sourceActionId);
    identities.action = { source: sourceActionId, child: mappedActionId };
    if (mappedOfferId === null || fictionalState.offer === null) {
      throw new ForkStateError('fork_identity_unmapped');
    }
    assertMappedId(mappedActiveAction.offerId, fictionalState.offer.id);
    const mappedActionOfferId = forkEntityId(
      forkStoryId,
      'offer',
      mappedActiveAction.offerId,
    );
    assertMappedId(mappedActionOfferId, mappedOfferId);
    mappedActiveAction = {
      ...mappedActiveAction,
      id: mappedActionId,
      offerId: mappedActionOfferId,
      offer: remapActiveActionVersionedField(
        mappedActiveAction.offer,
        'offer',
        mappedActionOfferId,
        remapChild,
        sourceIds,
      ) as typeof mappedActiveAction.offer,
      plan: remapActiveActionVersionedField(
        mappedActiveAction.plan,
        'plan',
        mappedActionOfferId,
        remapChild,
        sourceIds,
      ) as typeof mappedActiveAction.plan,
      pendingResolution:
        mappedActiveAction.pendingResolution === null
          ? null
          : (remapActiveActionVersionedField(
              mappedActiveAction.pendingResolution,
              'pendingResolution',
              mappedActionOfferId,
              remapChild,
              sourceIds,
            ) as typeof mappedActiveAction.pendingResolution),
    };
    mappedActiveActionOperationId = mappedActionId;
  }

  let mappedActiveActivityId: string | null = null;
  if (fictionalState.activeActivityId !== null) {
    const mapped = activityIds.get(fictionalState.activeActivityId);
    if (mapped === undefined) {
      throw new ForkStateError('fork_identity_unmapped');
    }
    mappedActiveActivityId = mapped;
  }

  const worldConditions = fictionalState.worldConditions.map((condition) => {
    const mapped = obligationIds.get(condition.provenance.obligationId);
    if (mapped === undefined) {
      throw new ForkStateError('fork_identity_unmapped');
    }
    return {
      ...condition,
      provenance: {
        ...condition.provenance,
        obligationId: mapped,
      },
    };
  });

  let situationAuthorization = fictionalState.situationAuthorization;
  if (situationAuthorization.offerId !== null) {
    if (fictionalState.offer === null || mappedOfferId === null) {
      throw new ForkStateError('fork_identity_unmapped');
    }
    assertMappedId(situationAuthorization.offerId, fictionalState.offer.id);
    situationAuthorization = {
      ...situationAuthorization,
      offerId: mappedOfferId,
    };
  }

  const holds = fictionalState.holds.map((hold) => {
    switch (hold.kind) {
      case 'decision': {
        if (fictionalState.offer === null || mappedOfferId === null) {
          throw new ForkStateError('fork_identity_unmapped');
        }
        assertMappedId(hold.id, fictionalState.offer.id);
        return { ...hold, id: mappedOfferId };
      }
      case 'world-obligation': {
        const mapped = obligationIds.get(hold.id);
        if (mapped === undefined) {
          throw new ForkStateError('fork_identity_unmapped');
        }
        return { ...hold, id: mapped };
      }
      case 'storyteller':
      case 'storyteller-intent': {
        const childId = forkEntityId(
          forkStoryId,
          'held-generation',
          hold.id,
        );
        identities.heldGenerations.push({ source: hold.id, child: childId });
        return { ...hold, id: childId };
      }
      default:
        return hold;
    }
  });

  const activeSceneScope =
    fictionalState.activeSceneScope === null
      ? null
      : {
          ...fictionalState.activeSceneScope,
          fromSequence: 1,
          requiredPassageIds: [childPassageId],
        };

  const mappedAcceptedActivityPlan =
    fictionalState.acceptedActivityPlan === null
      ? null
      : remapAcceptedActivityPlanPayload(
          fictionalState.acceptedActivityPlan,
          mappedOfferId,
          remapChild,
          sourceIds,
        );

  return {
    ...fictionalState,
    offer: mappedOffer,
    acceptedActivityPlan:
      mappedAcceptedActivityPlan as typeof fictionalState.acceptedActivityPlan,
    activeActivities: fictionalState.activeActivities.map((activity) => ({
      ...activity,
      id: activityIds.get(activity.id)!,
      plan: remapActivityVersionedPayload(
        activity.plan,
        'plan',
        sourceIds,
      ) as typeof activity.plan,
      progress: remapActivityVersionedPayload(
        activity.progress,
        'progress',
        sourceIds,
      ) as typeof activity.progress,
    })),
    worldObligations: fictionalState.worldObligations.map((obligation) => ({
      ...obligation,
      id: obligationIds.get(obligation.id)!,
      definition: remapObligationDefinitionPayload(
        obligation.definition,
        obligationIds.get(obligation.id)!,
        sourceIds,
      ) as typeof obligation.definition,
    })),
    activeActivityId: mappedActiveActivityId,
    worldConditions,
    situationAuthorization,
    holds,
    activeSceneScope,
    activeAction: mappedActiveAction,
    activeActionOperationId: mappedActiveActionOperationId,
  };
}

export function mapV2ForkState(
  input: MapV2ForkStateInput,
): { checkpoint: SceneCheckpointV2; identities: ForkStateIdentities } {
  const source = parseV2Checkpoint(input.checkpoint);
  if (source.storyId === input.forkStoryId) {
    throw new ForkStateError('fork_identity_unmapped');
  }
  if (source.fictionalState.mechanicsAbsent) {
    throw new ForkStateError('mechanics_absent');
  }

  const childPassageId = forkEntityId(
    input.forkStoryId,
    'passage',
    source.passageId,
  );

  const identities: ForkStateIdentities = {
    sourceStoryId: input.sourceStoryId,
    passage: { source: source.passageId, child: childPassageId },
    interaction: null,
    offer: null,
    activities: [],
    obligations: [],
    action: null,
    heldGenerations: [],
  };

  let passage = source.passage;
  if (source.passage.interaction !== null) {
    const sourceInteractionId = source.passage.interaction.id;
    const childInteractionId = forkEntityId(
      input.forkStoryId,
      'interaction',
      sourceInteractionId,
    );
    identities.interaction = {
      source: sourceInteractionId,
      child: childInteractionId,
    };
    passage = {
      ...source.passage,
      interaction: {
        ...source.passage.interaction,
        id: childInteractionId,
      },
    };
  }

  const ancestor =
    source.canon.rootHash === null
      ? { storyId: null, rootHash: null, rootRevision: null }
      : {
          storyId: input.sourceStoryId,
          rootHash: source.canon.rootHash,
          rootRevision: source.canon.rootRevision,
        };

  const fictionalState = remapPresentFictionalState(
    input.forkStoryId,
    childPassageId,
    source.fictionalState,
    identities,
  );

  const draft: SceneCheckpointV2 = {
    ...source,
    storyId: input.forkStoryId,
    passageId: childPassageId,
    sceneSequence: 1,
    transitionId: null,
    ancestor,
    passage,
    fictionalState,
  };

  const checkpoint = sceneCheckpointV2Schema.parse(draft);
  return { checkpoint, identities };
}