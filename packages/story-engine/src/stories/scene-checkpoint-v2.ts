import { isDeepStrictEqual } from 'node:util';
import { z } from 'zod';
import type { SceneCheckpointV2 } from '@offscreen/documents';
import {
  campaignViewSchema,
  type CampaignSettings,
} from '@offscreen/contracts/campaign';
import {
  projectAcceptedActivityPlan,
  readAcceptedActivityPlan,
} from '../campaign/accepted-plans.js';
import { campaignHoldsSchema } from '../campaign/holds.js';
import { continuityNotesSchema } from '@offscreen/storyteller/context';
import {
  activityProgressSchema,
  resolvedActivityPlanSchema,
} from '@offscreen/game/activities';
import { projectWorldTime } from '@offscreen/game/calendar';
import { immediateActionPlanSchema } from '@offscreen/game/immediate-actions';
import { offerSchema } from '@offscreen/game/offers';
import { situationAuthorizationSchema } from '@offscreen/game/immediate-actions';
import {
  projectPublicWorldObligation,
  worldConditionsSchema,
} from '@offscreen/game/world-obligations';
import {
  assertSceneAfterStateRepresentable,
  SceneAfterStateError,
  type SceneAfterState,
  type SceneAfterStateActionExecution,
  type SceneAfterStateCampaign,
} from './scene-after-state';
import { decisionPlanSchema, waitPlanSchema } from './plans';

export type SceneCheckpointV2FictionalState =
  SceneCheckpointV2['fictionalState'];

type JsonValue =
  string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };

type VersionedPayload = { version: 1; body: JsonValue };

const uuidSchema = z.uuid();

type SceneCheckpointHoldKind =
  'storyteller-intent' | 'storyteller' | 'decision' | 'world-obligation';

const activeSceneAnchorSchema = z.strictObject({
  version: z.literal('active-scene-anchor.v1'),
  fromSequence: z.number().int().positive(),
  requiredPassageIds: z.array(z.uuid()).max(40),
  recallCues: z
    .array(
      z.strictObject({
        documentId: z.uuid(),
        reason: z.enum(['identity', 'place', 'thread']),
      }),
    )
    .max(8),
});

const activeActionTargetSchema = z
  .strictObject({
    kind: z.string().min(1).max(80),
    id: z.string().min(1).max(200),
  })
  .nullable();

function asJsonValue(body: unknown): JsonValue {
  return body as JsonValue;
}

export function wrapVersionedOpenPayload(body: unknown): VersionedPayload {
  if (
    typeof body === 'object' &&
    body !== null &&
    (body as VersionedPayload).version === 1 &&
    'body' in (body as object)
  ) {
    return {
      version: 1,
      body: asJsonValue((body as VersionedPayload).body),
    };
  }
  return { version: 1, body: asJsonValue(body) };
}

/** Live adoption boundary: validate decision plan shape before historical wrapping. */
export function wrapValidatedDecisionPlan(plan: unknown): VersionedPayload {
  return { version: 1, body: asJsonValue(decisionPlanSchema.parse(plan)) };
}

/** Live adoption boundary: validate wait plan shape before historical wrapping. */
export function wrapValidatedWaitPlan(plan: unknown): VersionedPayload {
  return { version: 1, body: asJsonValue(waitPlanSchema.parse(plan)) };
}

export function wrapAdmittedPassagePlan(
  kind: 'decision' | 'wait',
  plan: unknown,
): VersionedPayload | null {
  if (plan == null) {
    return null;
  }
  return kind === 'decision'
    ? wrapValidatedDecisionPlan(plan)
    : wrapValidatedWaitPlan(plan);
}

function throwNotRepresentable(): never {
  throw new SceneAfterStateError('state_not_representable');
}

function requireUuid(value: unknown): string {
  const parsed = uuidSchema.safeParse(value);
  if (!parsed.success) {
    throw new SceneAfterStateError('state_not_representable');
  }
  return parsed.data;
}

function parseActiveSceneScope(scope: unknown) {
  if (scope == null) {
    return null;
  }
  const parsed = activeSceneAnchorSchema.safeParse(scope);
  if (!parsed.success) {
    throwNotRepresentable();
  }
  return parsed.data;
}

function projectV2ContinuityNotes(notes: unknown) {
  if (notes == null) {
    return null;
  }
  if (Array.isArray(notes) && notes.length === 0) {
    return [] as [];
  }
  return continuityNotesSchema.parse(notes);
}

function mapCheckpointHoldId(
  hold: z.infer<typeof campaignHoldsSchema>[number],
): { kind: SceneCheckpointHoldKind; id: string } {
  switch (hold.kind) {
    case 'storyteller-intent':
      return { kind: hold.kind, id: hold.operationId };
    case 'storyteller':
      return { kind: hold.kind, id: hold.generationId };
    case 'decision':
      return { kind: hold.kind, id: hold.offerId };
    case 'world-obligation':
      return { kind: hold.kind, id: hold.obligationId };
    default:
      throwNotRepresentable();
  }
}

function mapHolds(holds: unknown) {
  const parsed = campaignHoldsSchema.safeParse(holds ?? []);
  if (!parsed.success) {
    throwNotRepresentable();
  }
  return parsed.data.map(mapCheckpointHoldId);
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === 'object' && value !== null
    ? (value as Record<string, unknown>)
    : null;
}

function campaignOfferEnvelope(
  offer: unknown,
): { id: string; source: string; meaning: string } | null {
  if (offer == null) {
    return null;
  }
  const record = asRecord(offer);
  if (!record) {
    throwNotRepresentable();
  }
  const id = requireUuid(record.id);
  const source = record.source;
  const meaning = record.meaning;
  if (typeof source !== 'string' || source.length === 0) {
    throwNotRepresentable();
  }
  if (typeof meaning !== 'string' || meaning.length === 0) {
    throwNotRepresentable();
  }
  return { id, source, meaning };
}

function resolveAssociatedGameOffer(
  state: SceneAfterState,
  campaign: SceneAfterStateCampaign,
) {
  const authorization = asRecord(campaign.situationAuthorization);
  const authorizationOfferId = authorization?.offerId;
  const candidateIds = new Set<string>();
  const envelope = campaignOfferEnvelope(campaign.offer);
  if (envelope) {
    candidateIds.add(envelope.id);
  }
  if (typeof authorizationOfferId === 'string') {
    candidateIds.add(authorizationOfferId);
  }
  for (const execution of state.actionExecutions) {
    candidateIds.add(execution.offerId);
  }
  return state.gameOffers.find((row) => candidateIds.has(row.id)) ?? null;
}

function offerTreeFromCampaignColumn(offer: unknown): unknown {
  const record = asRecord(offer);
  if (!record || !Array.isArray(record.nodes)) {
    return offer;
  }
  return { id: requireUuid(record.id), nodes: record.nodes };
}

function buildOfferSnapshot(
  state: SceneAfterState,
  campaign: SceneAfterStateCampaign,
) {
  const envelope = campaignOfferEnvelope(campaign.offer);
  if (!envelope) {
    return null;
  }
  const associated = resolveAssociatedGameOffer(state, campaign);
  return {
    id: envelope.id,
    source: envelope.source,
    meaning: envelope.meaning,
    payload: {
      version: 1 as const,
      body: {
        offer: offerTreeFromCampaignColumn(campaign.offer),
        plans: associated
          ? wrapVersionedOpenPayload(associated.plans)
          : (null as JsonValue),
      },
    },
  };
}

function mapActiveActivities(state: SceneAfterState) {
  return state.activities.map((activity) => ({
    id: requireUuid(activity.id),
    state: activity.state,
    revision: activity.revision,
    boundariesSettled: activity.boundariesSettled,
    plan: wrapVersionedOpenPayload(activity.plan),
    progress: wrapVersionedOpenPayload(activity.progress),
  }));
}

function mapWorldObligations(state: SceneAfterState) {
  return state.worldObligations.map((obligation) => ({
    id: requireUuid(obligation.id),
    revision: obligation.revision,
    state: obligation.state,
    dueGameSecond: obligation.dueGameSecond,
    firedAtGameSecond: obligation.firedAtGameSecond,
    definition: wrapVersionedOpenPayload(obligation.definition),
  }));
}

function executionPlanWithoutTarget(plan: unknown): unknown {
  const record = asRecord(plan);
  if (!record) {
    return plan;
  }
  const { target: _target, __v2ForkTarget: _forkTarget, ...rest } = record;
  if ('target' in record || '__v2ForkTarget' in record) {
    return rest;
  }
  return plan;
}

function actionTargetFromExecution(execution: SceneAfterStateActionExecution) {
  const extra = execution as SceneAfterStateActionExecution & {
    target?: unknown;
  };
  if (extra.target !== undefined) {
    const parsed = activeActionTargetSchema.safeParse(extra.target);
    if (!parsed.success) {
      throwNotRepresentable();
    }
    return parsed.data;
  }
  const plan = asRecord(execution.plan);
  if (plan && plan.__v2ForkTarget !== undefined) {
    const parsed = activeActionTargetSchema.safeParse(plan.__v2ForkTarget);
    if (!parsed.success) {
      throwNotRepresentable();
    }
    return parsed.data;
  }
  if (plan && plan.target !== undefined) {
    const parsed = activeActionTargetSchema.safeParse(plan.target);
    if (!parsed.success) {
      throwNotRepresentable();
    }
    return parsed.data;
  }
  return null;
}

function mapActiveAction(
  campaign: SceneAfterStateCampaign,
  executions: readonly SceneAfterStateActionExecution[],
) {
  const operationId = campaign.activeActionOperationId;
  if (operationId == null) {
    return null;
  }
  const execution = executions.find((row) => row.operationId === operationId);
  if (!execution) {
    throwNotRepresentable();
  }
  return {
    id: requireUuid(execution.operationId),
    offerId: requireUuid(execution.offerId),
    actionKey: execution.actionKey,
    baseRevision: execution.baseRevision,
    offer: wrapVersionedOpenPayload(execution.offer),
    plan: wrapVersionedOpenPayload(executionPlanWithoutTarget(execution.plan)),
    pendingResolution:
      execution.pendingResolution == null
        ? null
        : wrapVersionedOpenPayload(execution.pendingResolution),
    status: execution.state,
    revision: execution.revision,
    startGameSecond: execution.startGameSecond,
    targetGameSecond: execution.targetGameSecond,
    target: actionTargetFromExecution(execution),
  };
}

function compareItemKey(left: string, right: string): number {
  if (left < right) {
    return -1;
  }
  if (left > right) {
    return 1;
  }
  return 0;
}

function sortedItems(state: SceneAfterState) {
  return [...state.storyItems]
    .sort((left, right) => compareItemKey(left.key, right.key))
    .map((item) => ({
      key: item.key,
      label: item.label,
      holderKey: item.holderKey,
    }));
}

function presentMechanicsFictionalState(
  state: SceneAfterState,
  campaign: SceneAfterStateCampaign,
): Extract<SceneCheckpointV2FictionalState, { mechanicsAbsent: false }> {
  const pace = asRecord(campaign.clockPace);
  if (!pace || typeof pace.kind !== 'string') {
    throwNotRepresentable();
  }
  return {
    mechanicsAbsent: false,
    character: campaign.character ?? null,
    items: sortedItems(state),
    storyFacts: campaign.storyFacts,
    activityOccurrences: campaign.activityOccurrences,
    location: campaign.location,
    gameSecond: campaign.gameSecond,
    clock: campaign.clock,
    pace: campaign.clockPace,
    settingsRevision: campaign.settingsRevision,
    content: asJsonValue(campaign.content ?? null),
    continuityNotes: projectV2ContinuityNotes(state.continuityNotes),
    activeSceneScope: parseActiveSceneScope(state.activeSceneScope),
    holds: mapHolds(campaign.holds),
    offer: buildOfferSnapshot(state, campaign),
    acceptedActivityPlan:
      campaign.acceptedActivityPlan == null
        ? null
        : wrapVersionedOpenPayload(campaign.acceptedActivityPlan),
    activeActivityId:
      campaign.activeActivityId == null
        ? null
        : requireUuid(campaign.activeActivityId),
    activeActionOperationId:
      campaign.activeActionOperationId == null
        ? null
        : requireUuid(campaign.activeActionOperationId),
    situationAuthorization: campaign.situationAuthorization,
    worldConditions: campaign.worldConditions,
    activeActivities: mapActiveActivities(state),
    worldObligations: mapWorldObligations(state),
    activeAction: mapActiveAction(campaign, state.actionExecutions),
  } as Extract<SceneCheckpointV2FictionalState, { mechanicsAbsent: false }>;
}

/** Map a normalized SQL after-state to an exact v2 fictional snapshot. */
export function toV2FictionalState(
  afterState: SceneAfterState,
): SceneCheckpointV2FictionalState {
  assertSceneAfterStateRepresentable(afterState);
  if (afterState.campaign == null) {
    if (afterState.storyItems.length > 0) {
      throwNotRepresentable();
    }
    if (
      afterState.activities.length > 0 ||
      afterState.worldObligations.length > 0 ||
      afterState.gameOffers.length > 0 ||
      afterState.actionExecutions.length > 0
    ) {
      throwNotRepresentable();
    }
    return {
      mechanicsAbsent: true,
      continuityNotes: projectV2ContinuityNotes(afterState.continuityNotes),
      activeSceneScope: parseActiveSceneScope(afterState.activeSceneScope),
    };
  }
  return presentMechanicsFictionalState(afterState, afterState.campaign);
}

const COMPARE_FIELDS: ReadonlyArray<{
  code: string;
  select: (state: SceneCheckpointV2FictionalState) => unknown;
}> = [
  { code: 'mechanicsAbsent', select: (state) => state.mechanicsAbsent },
  {
    code: 'continuityNotes',
    select: (state) => state.continuityNotes,
  },
  {
    code: 'activeSceneScope',
    select: (state) => state.activeSceneScope,
  },
  {
    code: 'items',
    select: (state) =>
      state.mechanicsAbsent === true ? undefined : state.items,
  },
  {
    code: 'character',
    select: (state) =>
      state.mechanicsAbsent === true ? undefined : state.character,
  },
  {
    code: 'storyFacts',
    select: (state) =>
      state.mechanicsAbsent === true ? undefined : state.storyFacts,
  },
  {
    code: 'activityOccurrences',
    select: (state) =>
      state.mechanicsAbsent === true ? undefined : state.activityOccurrences,
  },
  {
    code: 'location',
    select: (state) =>
      state.mechanicsAbsent === true ? undefined : state.location,
  },
  {
    code: 'gameSecond',
    select: (state) =>
      state.mechanicsAbsent === true ? undefined : state.gameSecond,
  },
  {
    code: 'clock',
    select: (state) =>
      state.mechanicsAbsent === true ? undefined : state.clock,
  },
  {
    code: 'pace',
    select: (state) =>
      state.mechanicsAbsent === true ? undefined : state.pace,
  },
  {
    code: 'settingsRevision',
    select: (state) =>
      state.mechanicsAbsent === true ? undefined : state.settingsRevision,
  },
  {
    code: 'content',
    select: (state) =>
      state.mechanicsAbsent === true ? undefined : state.content,
  },
  {
    code: 'holds',
    select: (state) =>
      state.mechanicsAbsent === true ? undefined : state.holds,
  },
  {
    code: 'offer',
    select: (state) =>
      state.mechanicsAbsent === true ? undefined : state.offer,
  },
  {
    code: 'acceptedActivityPlan',
    select: (state) =>
      state.mechanicsAbsent === true ? undefined : state.acceptedActivityPlan,
  },
  {
    code: 'activeActivityId',
    select: (state) =>
      state.mechanicsAbsent === true ? undefined : state.activeActivityId,
  },
  {
    code: 'activeActionOperationId',
    select: (state) =>
      state.mechanicsAbsent === true
        ? undefined
        : state.activeActionOperationId,
  },
  {
    code: 'situationAuthorization',
    select: (state) =>
      state.mechanicsAbsent === true ? undefined : state.situationAuthorization,
  },
  {
    code: 'worldConditions',
    select: (state) =>
      state.mechanicsAbsent === true ? undefined : state.worldConditions,
  },
  {
    code: 'activeActivities',
    select: (state) =>
      state.mechanicsAbsent === true ? undefined : state.activeActivities,
  },
  {
    code: 'worldObligations',
    select: (state) =>
      state.mechanicsAbsent === true ? undefined : state.worldObligations,
  },
  {
    code: 'activeAction',
    select: (state) =>
      state.mechanicsAbsent === true ? undefined : state.activeAction,
  },
];

/**
 * Symmetric semantic comparison of v2 fictional snapshots. Throws on the first
 * field that does not deep-compare equal.
 */
export function assertV2PostStateMatches(
  expected: SceneCheckpointV2FictionalState,
  actual: SceneCheckpointV2FictionalState,
): void {
  if (expected.mechanicsAbsent !== actual.mechanicsAbsent) {
    throw new Error('v2_post_state_mismatch:mechanicsAbsent');
  }
  for (const field of COMPARE_FIELDS) {
    const left = field.select(expected);
    const right = field.select(actual);
    if (left === undefined && right === undefined) {
      continue;
    }
    if (!isDeepStrictEqual(left, right)) {
      throw new Error(`v2_post_state_mismatch:${field.code}`);
    }
  }
}

const checkpointActivityStateSchema = z.enum([
  'running',
  'paused',
  'encounter',
  'suspended',
  'blocked',
  'complete',
  'abandoned',
]);

const HISTORICAL_ACTIVITY_STATES = new Set([
  'running',
  'paused',
  'encounter',
  'suspended',
  'blocked',
]);

type VersionedOpenPayload = { version: 1; body: JsonValue };

function unwrapVersionedOpenPayload(value: unknown): unknown {
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

function projectHistoricalCheckpointHolds(
  holds: Extract<
    SceneCheckpointV2FictionalState,
    { mechanicsAbsent: false }
  >['holds'],
) {
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

function projectHistoricalOffer(
  offer: Extract<
    SceneCheckpointV2FictionalState,
    { mechanicsAbsent: false }
  >['offer'],
) {
  if (offer == null) {
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

function projectedActivityProgress(
  plan: ReturnType<typeof resolvedActivityPlanSchema.parse>,
  progress: ReturnType<typeof activityProgressSchema.parse>,
) {
  if (
    plan.action.process.kind === 'contribution.v1' &&
    progress.process.kind === 'contribution.v1'
  ) {
    return {
      kind: 'contribution' as const,
      label: plan.action.process.progressLabel,
      earned: progress.process.earned,
      required: plan.action.process.requiredContribution,
    };
  }
  if (
    plan.action.process.kind === 'clock-wait.v1' &&
    progress.process.kind === 'clock-wait.v1'
  ) {
    return {
      kind: 'wait' as const,
      label: plan.action.process.progressLabel,
      elapsedFictionalSeconds: progress.process.elapsedFictionalSeconds,
      requiredFictionalSeconds: plan.action.process.requiredFictionalSeconds,
    };
  }
  throw new Error('Activity progress does not match its process rule');
}

function projectHistoricalActivity(
  activity: Extract<
    SceneCheckpointV2FictionalState,
    { mechanicsAbsent: false }
  >['activeActivities'][number],
) {
  const plan = resolvedActivityPlanSchema.parse(
    unwrapVersionedOpenPayload(activity.plan),
  );
  const progress = activityProgressSchema.parse(
    unwrapVersionedOpenPayload(activity.progress),
  );
  return {
    id: activity.id,
    label: plan.action.label,
    state: checkpointActivityStateSchema.parse(activity.state),
    boundariesSettled: activity.boundariesSettled,
    completionPending: progress.completionPending,
    progress: projectedActivityProgress(plan, progress),
    revision: activity.revision,
    resolvedGameSeconds: plan.resolvedThroughGameSecond,
    settingsRevision: plan.settingsRevision,
    dueAt: null,
    estimatedCompletionAt: null,
  };
}

/** Exact as-of campaign view from a captured v2 fictional snapshot and settings row. */
export function projectV2HistoricalCampaign(
  fictionalState: Extract<
    SceneCheckpointV2FictionalState,
    { mechanicsAbsent: false }
  >,
  settings: CampaignSettings,
) {
  const authorization = situationAuthorizationSchema.parse(
    fictionalState.situationAuthorization,
  );
  const commitments = fictionalState.activeActivities
    .filter((activity) => HISTORICAL_ACTIVITY_STATES.has(activity.state))
    .map(projectHistoricalActivity);
  const activeActivity = fictionalState.activeActivityId
    ? fictionalState.activeActivities.find(
        (activity) => activity.id === fictionalState.activeActivityId,
      )
    : undefined;
  const actionExecution = fictionalState.activeAction
    ? (() => {
        const plan = immediateActionPlanSchema.parse(
          unwrapVersionedOpenPayload(fictionalState.activeAction.plan),
        );
        return {
          operationId: fictionalState.activeAction.id,
          label: plan.label,
          startGameSecond: fictionalState.activeAction.startGameSecond,
          targetGameSecond: fictionalState.activeAction.targetGameSecond,
          state:
            fictionalState.activeAction.status === 'paused'
              ? ('paused' as const)
              : ('running' as const),
          revision: fictionalState.activeAction.revision,
          dueAt: null,
        };
      })()
    : null;
  const worldObligations = fictionalState.worldObligations
    .map((obligation) =>
      projectPublicWorldObligation({
        obligation: unwrapVersionedOpenPayload(obligation.definition),
        state: obligation.state,
      }),
    )
    .filter((obligation) => obligation !== null);
  return campaignViewSchema.parse({
    settings,
    character: fictionalState.character,
    storyFacts: fictionalState.storyFacts,
    location: fictionalState.location,
    gameSecond: fictionalState.gameSecond,
    worldTime: projectWorldTime(settings.time, fictionalState.gameSecond),
    holds: projectHistoricalCheckpointHolds(fictionalState.holds),
    offer: projectHistoricalOffer(fictionalState.offer),
    activityAccess: authorization.activityAccess,
    activity: activeActivity ? projectHistoricalActivity(activeActivity) : null,
    actionExecution,
    actionExecutionEvents: [],
    commitments,
    activityEvents: [],
    activityReports: [],
    worldObligationReports: [],
    worldConditions: worldConditionsSchema.parse(
      fictionalState.worldConditions,
    ),
    worldObligations,
    worldObligationEvents: [],
    acceptedActivityPlan: projectAcceptedActivityPlan(
      readAcceptedActivityPlan(
        fictionalState.acceptedActivityPlan == null
          ? null
          : unwrapVersionedOpenPayload(fictionalState.acceptedActivityPlan),
      ),
    ),
    rolls: [],
    actionReceipts: [],
  });
}

export { SceneAfterStateError };
