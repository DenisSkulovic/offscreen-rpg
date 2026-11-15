/**
 * ENG03-narrow: ContextCaptureV1 schema and Stage-1 pending-consequence capture.
 * DocumentStore / CAS bytes are never read under the story FOR UPDATE lock.
 */
import { createHash, randomUUID } from 'node:crypto';
import { and, desc, eq, gte, inArray, lte } from 'drizzle-orm';
import { z } from 'zod';
import { campaignSettingsSchema } from '@offscreen/contracts/campaign';
import { effectiveUsagePolicySchema } from '@offscreen/contracts/usage-policy';
import {
  passageContentSchema,
  storyItemsSchema,
} from '@offscreen/contracts/stories';
import { interactionSubmissionSchema } from '@offscreen/contracts/interactions';
import { characterSchema, storyFactsSchema } from '@offscreen/game/state';
import { worldConditionsSchema } from '@offscreen/game/world-obligations';
import { offerSchema } from '@offscreen/game/offers';
import {
  immediateActionPlanSchema,
  situationAuthorizationSchema,
  storyFactDeclarationsSchema,
} from '@offscreen/game/immediate-actions';
import {
  activityProgressSchema,
  resolvedActivityPlanSchema,
} from '@offscreen/game/activities';
import { outcomeEffectsSchema } from '@offscreen/game/effects';
import { rollSchema } from '@offscreen/game/checks';
import {
  contextInputSchema,
  continuityNotesSchema,
  premiseContentSchema,
} from '@offscreen/storyteller/context';
import { storytellerProfileSchema } from '@offscreen/storyteller/profiles';
import { executionPolicySchema } from '@offscreen/storyteller/tasks';
import {
  campaign,
  campaignSettings,
  gameActivity,
  gameActionExecution,
  gameActionExecutionEvent,
  gameActionReceipt,
} from '@offscreen/db/campaign-schema';
import { positiveItemTransfers } from '@offscreen/game/immediate-actions';
import { generation } from '@offscreen/db/generation-schema';
import { storyItem, storyPassage, storyResolution } from '@offscreen/db/story-schema';
import {
  storytellerContextCapture,
  storytellerPublication,
} from '@offscreen/db/storyteller-schema';
import type { Transaction } from '../outbox/index';
import { enqueue } from '../outbox/index';
import type { StoryRecord } from '../stories/persistence';
import { readDatabaseClockMs } from '../stories/persistence';
import { readAcceptedActivityPlan } from '../campaign/accepted-plans';
import {
  pendingImmediateActionResolutionSchema,
  actionResolutionSourceDigest,
  actionResolutionProjectedDigest,
  actionProjectedStateDigest,
  type PendingImmediateActionResolution,
} from '../campaign/action-overlap';
import { transitionStorytellerIntentToGeneration } from '../campaign/holds';
import { campaignConsequenceTopic } from '../campaign/topics';
import { activeSceneAnchorSchema } from './context';
import {
  canonicalRuleEvidence,
  librarySectionSelectionSchema,
} from './canonical-knowledge';
import {
  isStorytellerActivityState,
  storytellerActivityContextFilter,
} from './activity-context';

export const storytellerContextCaptureKind = 'storyteller.context-capture.v1';
export const CONTEXT_CAPTURE_MAX_MATERIALIZATION_ATTEMPTS = 3;
export const CONTEXT_CAPTURE_LEASE_MS = 25_000;

const uuid = z.uuid();
const sha256 = z.string().regex(/^[a-f0-9]{64}$/);
const narrativeRevision = z.number().int().positive();
const gameSecond = z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER);

const activitySituationInner = (
  contextInputSchema.shape.activitySituation as z.ZodOptional<
    z.ZodObject<z.ZodRawShape>
  >
).unwrap();

const sourcePassage = z.discriminatedUnion('storage', [
  z.strictObject({
    storage: z.literal('cas'),
    passageId: uuid,
    sequence: narrativeRevision,
    contentHash: sha256,
    inlineContent: z.null(),
    response: z.string().max(2000).nullable(),
  }),
  z.strictObject({
    storage: z.literal('inline'),
    passageId: uuid,
    sequence: narrativeRevision,
    contentHash: z.null(),
    inlineContent: passageContentSchema,
    response: z.string().max(2000).nullable(),
  }),
]);

export const contextCaptureV1Schema = z
  .strictObject({
    version: z.literal(1),
    captureId: uuid,
    storyId: uuid,
    ownerId: z.string().min(1),
    purpose: z.literal('pending-consequence'),
    operationId: uuid,
    passageId: uuid,
    narrativeRevision,
    root: z.union([
      z.strictObject({ hash: z.null(), revision: z.literal(0) }),
      z.strictObject({ hash: sha256, revision: narrativeRevision }),
    ]),
    sourcePassages: z.array(sourcePassage).min(1).max(87),
    activeSceneScope: activeSceneAnchorSchema.nullable(),
    narrative: z.strictObject({
      premise: premiseContentSchema,
      notes: continuityNotesSchema,
    }),
    canonicalSelection: z.strictObject({
      ruleSections: librarySectionSelectionSchema,
      campaignDocumentIds: z.array(uuid).max(0),
    }),
    actorAndWorld: z.strictObject({
      character: characterSchema,
      storyFacts: storyFactsSchema,
      itemHolders: storyItemsSchema,
      worldConditions: worldConditionsSchema,
      commitments: activitySituationInner.shape.commitments,
      offerAndAuthorization: z.strictObject({
        offer: offerSchema,
        selectedPlan: immediateActionPlanSchema,
        authorization: z.strictObject({
          version: z.literal(2),
          offerId: z.uuid().nullable(),
          activityAccess: situationAuthorizationSchema.shape.activityAccess,
        }),
        activeActivityId: uuid.nullable(),
        acceptedPlan: activitySituationInner.shape.acceptedPlan,
      }),
      clock: z.strictObject({
        gameSecond,
        targetGameSecond: gameSecond,
      }),
    }),
    settings: z.strictObject({
      revision: narrativeRevision,
      capturedSettings: campaignSettingsSchema,
      profile: storytellerProfileSchema,
      execution: executionPolicySchema,
      effectiveUsagePolicy: effectiveUsagePolicySchema.nullable(),
    }),
    selected: z.strictObject({
      id: uuid,
      label: immediateActionPlanSchema.shape.label,
      intention: immediateActionPlanSchema.shape.intention,
    }),
    acceptedPendingResult: pendingImmediateActionResolutionSchema,
    capturedAt: z.iso.datetime(),
  })
  .superRefine((v, ctx) => {
    const issue = (path: (string | number)[], message: string) =>
      ctx.addIssue({ code: 'custom', path, message });
    const ids = v.sourcePassages.map((p) => p.passageId);
    const sequences = v.sourcePassages.map((p) => p.sequence);
    if (
      new Set(ids).size !== ids.length ||
      new Set(sequences).size !== sequences.length
    ) {
      issue(
        ['sourcePassages'],
        'Evidence passage ID and sequence must be unique',
      );
    }
    if (sequences.some((s) => s > v.narrativeRevision)) {
      issue(['sourcePassages'], 'Evidence cannot come from a future revision');
    }
    const current = v.sourcePassages.find(
      (p) => p.sequence === v.narrativeRevision,
    );
    if (!current || current.passageId !== v.passageId) {
      issue(
        ['passageId'],
        'Captured source frontier has no matching current passage',
      );
    }
    const required = [
      ...v.narrative.notes.flatMap((n) => n.sources),
      ...(v.activeSceneScope?.requiredPassageIds ?? []),
    ];
    if (required.some((id) => !ids.includes(id))) {
      issue(['sourcePassages'], 'A required passage was not captured');
    }
    if (
      v.activeSceneScope &&
      v.activeSceneScope.fromSequence > v.narrativeRevision
    ) {
      issue(['activeSceneScope'], 'Active scene begins after the source frontier');
    }
    if (
      v.selected.id !== v.operationId ||
      v.selected.label !==
        v.actorAndWorld.offerAndAuthorization.selectedPlan.label ||
      v.selected.intention !==
        v.actorAndWorld.offerAndAuthorization.selectedPlan.intention
    ) {
      issue(['selected'], 'Selected identity/terms do not match the frozen plan');
    }
    const auth = v.actorAndWorld.offerAndAuthorization;
    if (
      auth.authorization.offerId !== auth.offer.id ||
      !auth.offer.nodes.some(
        (n) => n.id === auth.selectedPlan.key && n.action !== null,
      )
    ) {
      issue(
        ['actorAndWorld', 'offerAndAuthorization'],
        'Accepted offer/plan mismatch',
      );
    }
    if (
      v.actorAndWorld.clock.targetGameSecond <=
      v.actorAndWorld.clock.gameSecond
    ) {
      issue(['actorAndWorld', 'clock'], 'Finite action target must follow start');
    }
    if (v.settings.capturedSettings.revision !== v.settings.revision) {
      issue(['settings'], 'Captured settings revision mismatch');
    }
    if (
      v.settings.execution.mode === 'provider' &&
      (v.settings.effectiveUsagePolicy === null ||
        v.settings.effectiveUsagePolicy.route !==
          v.settings.execution.policy.route)
    ) {
      issue(
        ['settings'],
        'Captured provider authority is absent or route-mismatched',
      );
    }
    const sourceDigest = actionResolutionSourceDigest({
      character: v.actorAndWorld.character,
      storyFacts: v.actorAndWorld.storyFacts,
      startGameSecond: v.actorAndWorld.clock.gameSecond,
    });
    const projectedDigest = actionResolutionProjectedDigest({
      resolution: v.acceptedPendingResult.resolution,
      targetGameSecond: v.actorAndWorld.clock.targetGameSecond,
    });
    if (
      sourceDigest !== v.acceptedPendingResult.sourceStateDigest ||
      projectedDigest !== v.acceptedPendingResult.projectedStateDigest
    ) {
      issue(
        ['acceptedPendingResult'],
        'Pending action source/projected digests disagree',
      );
    }
    const expectedTopics = v.acceptedPendingResult.resolution.roll
      ? (['time', 'ability-check'] as const)
      : (['time'] as const);
    if (
      JSON.stringify(v.canonicalSelection.ruleSections) !==
      JSON.stringify(canonicalRuleEvidence([...expectedTopics]))
    ) {
      issue(
        ['canonicalSelection'],
        'First path requires the exact frozen rule-evidence recipe',
      );
    }
    if (Buffer.byteLength(JSON.stringify(v), 'utf8') > 256 * 1024) {
      issue([], 'context_capture_too_large');
    }
  });

export type ContextCaptureV1 = z.infer<typeof contextCaptureV1Schema>;

const committedActionReceiptCaptureSchema = z.strictObject({
  operationId: uuid,
  storyId: uuid,
  offerId: uuid,
  actionKey: immediateActionPlanSchema.shape.key,
  baseRevision: narrativeRevision,
  offer: offerSchema,
  plan: immediateActionPlanSchema,
  label: immediateActionPlanSchema.shape.label,
  intention: immediateActionPlanSchema.shape.intention,
  outcome: z.enum(['automatic', 'success', 'failure']),
  outcomeText: z.string().min(1).max(1000),
  effects: outcomeEffectsSchema,
  declarations: storyFactDeclarationsSchema,
  roll: rollSchema.nullable(),
});

export const committedActionContextCaptureV1Schema = z
  .strictObject({
    version: z.literal(1),
    captureId: uuid,
    storyId: uuid,
    ownerId: z.string().min(1),
    purpose: z.literal('consequence'),
    sourceKind: z.literal('action-receipt'),
    operationId: uuid,
    passageId: uuid,
    narrativeRevision,
    root: z.union([
      z.strictObject({ hash: z.null(), revision: z.literal(0) }),
      z.strictObject({ hash: sha256, revision: narrativeRevision }),
    ]),
    sourcePassages: z.array(sourcePassage).min(1).max(87),
    activeSceneScope: activeSceneAnchorSchema.nullable(),
    narrative: z.strictObject({
      premise: premiseContentSchema,
      notes: continuityNotesSchema,
    }),
    canonicalSelection: z.strictObject({
      ruleSections: librarySectionSelectionSchema,
      campaignDocumentIds: z.array(uuid).length(0),
    }),
    actorAndWorld: z.strictObject({
      character: characterSchema,
      storyFacts: storyFactsSchema,
      itemHolders: storyItemsSchema,
      worldConditions: worldConditionsSchema,
      activitySituation: activitySituationInner,
      gameSecond,
      postSettlementStateDigest: sha256,
    }),
    settings: z.strictObject({
      revision: narrativeRevision,
      capturedSettings: campaignSettingsSchema,
      profile: storytellerProfileSchema,
      execution: executionPolicySchema,
      effectiveUsagePolicy: effectiveUsagePolicySchema.nullable(),
    }),
    selected: z.strictObject({
      id: uuid,
      label: immediateActionPlanSchema.shape.label,
      intention: immediateActionPlanSchema.shape.intention,
    }),
    acceptedReceipt: committedActionReceiptCaptureSchema,
    capturedAt: z.iso.datetime(),
  })
  .superRefine((v, ctx) => {
    const issue = (path: (string | number)[], message: string) =>
      ctx.addIssue({ code: 'custom', path, message });
    const r = v.acceptedReceipt;
    if (
      v.operationId !== r.operationId ||
      v.storyId !== r.storyId ||
      v.narrativeRevision !== r.baseRevision
    ) {
      issue(['acceptedReceipt'], 'Committed receipt and source identity mismatch');
    }
    if (r.offer.id !== r.offerId || r.plan.key !== r.actionKey) {
      issue(['acceptedReceipt'], 'Receipt offer/plan identity mismatch');
    }
    if (!r.offer.nodes.some((n) => n.id === r.actionKey && n.action !== null)) {
      issue(['acceptedReceipt'], 'Receipt plan not a selected offer action');
    }
    if (
      v.selected.id !== v.operationId ||
      v.selected.label !== r.label ||
      v.selected.intention !== r.intention
    ) {
      issue(['selected'], 'Selected receipt projection mismatch');
    }
    if (v.settings.capturedSettings.revision !== v.settings.revision) {
      issue(['settings'], 'Campaign settings revision mismatch');
    }
    if (
      v.settings.execution.mode === 'provider' &&
      (!v.settings.effectiveUsagePolicy ||
        v.settings.effectiveUsagePolicy.route !==
          v.settings.execution.policy.route)
    ) {
      issue(['settings'], 'Missing/mismatched provider funding authority');
    }
    if (
      v.actorAndWorld.postSettlementStateDigest !==
      actionProjectedStateDigest({
        character: v.actorAndWorld.character,
        storyFacts: v.actorAndWorld.storyFacts,
        gameSecond: v.actorAndWorld.gameSecond,
      })
    ) {
      issue(['actorAndWorld'], 'Committed state digest mismatch');
    }
    const orderedPassages = v.sourcePassages;
    const ids = orderedPassages.map((p) => p.passageId);
    const sequences = orderedPassages.map((p) => p.sequence);
    if (
      new Set(ids).size !== ids.length ||
      new Set(sequences).size !== sequences.length ||
      sequences.some((s) => s > v.narrativeRevision)
    ) {
      issue(['sourcePassages'], 'Duplicate passage or future source sequence');
    }
    const frontier = orderedPassages.find(
      (p) => p.sequence === v.narrativeRevision,
    );
    if (!frontier || frontier.passageId !== v.passageId) {
      issue(['passageId'], 'Current passage missing from captured frontier');
    }
    const required = [
      ...v.narrative.notes.flatMap((n) => n.sources),
      ...(v.activeSceneScope?.requiredPassageIds ?? []),
    ];
    if (required.some((id) => !ids.includes(id))) {
      issue(['sourcePassages'], 'Uncaptured required evidence passage');
    }
    if (
      v.activeSceneScope &&
      v.activeSceneScope.fromSequence > v.narrativeRevision
    ) {
      issue(['activeSceneScope'], 'Active scene begins after source revision');
    }
    const topics = r.roll ? ['time', 'ability-check'] : ['time'];
    if (
      JSON.stringify(v.canonicalSelection.ruleSections) !==
      JSON.stringify(canonicalRuleEvidence(topics))
    ) {
      issue(['canonicalSelection'], 'Invalid first-path rule evidence selection');
    }
    if (Buffer.byteLength(JSON.stringify(v), 'utf8') > 256 * 1024) {
      issue([], 'context_capture_too_large');
    }
  });

export type CommittedActionContextCaptureV1 = z.infer<
  typeof committedActionContextCaptureV1Schema
>;

export const interruptedActionContextCaptureV1Schema = z
  .strictObject({
    version: z.literal(1),
    captureId: uuid,
    storyId: uuid,
    ownerId: z.string().min(1),
    purpose: z.literal('consequence'),
    sourceKind: z.literal('action-interrupted'),
    operationId: uuid,
    passageId: uuid,
    narrativeRevision,
    root: z.union([
      z.strictObject({ hash: z.null(), revision: z.literal(0) }),
      z.strictObject({ hash: sha256, revision: narrativeRevision }),
    ]),
    sourcePassages: z.array(sourcePassage).min(1).max(87),
    activeSceneScope: activeSceneAnchorSchema.nullable(),
    narrative: z.strictObject({
      premise: premiseContentSchema,
      notes: continuityNotesSchema,
    }),
    canonicalSelection: z.strictObject({
      ruleSections: librarySectionSelectionSchema,
      campaignDocumentIds: z.array(uuid).length(0),
    }),
    actorAndWorld: z.strictObject({
      character: characterSchema,
      storyFacts: storyFactsSchema,
      gameSecond,
      itemHolders: storyItemsSchema,
      worldConditions: worldConditionsSchema,
      activitySituation: activitySituationInner,
      postInterruptStateDigest: sha256,
    }),
    settings: z.strictObject({
      revision: narrativeRevision,
      capturedSettings: campaignSettingsSchema,
      profile: storytellerProfileSchema,
      execution: executionPolicySchema,
      effectiveUsagePolicy: effectiveUsagePolicySchema.nullable(),
    }),
    selected: z.strictObject({
      id: uuid,
      label: immediateActionPlanSchema.shape.label,
      intention: immediateActionPlanSchema.shape.intention,
    }),
    interruption: z.strictObject({
      kind: z.literal('action-interrupted'),
      cause: z.literal('required-item-holder-changed'),
      executionId: uuid,
      executionRevision: z.number().int().nonnegative(),
      eventId: uuid,
      eventGameSecond: gameSecond,
      offerId: uuid,
      actionKey: immediateActionPlanSchema.shape.key,
      itemKeys: z.array(z.string().min(1).max(80)).min(1).max(50),
      executionOffer: offerSchema,
      executionPlan: immediateActionPlanSchema,
      factualText: z.literal(
        'The accepted transfer could not complete; the required item was no longer available',
      ),
    }),
    capturedAt: z.iso.datetime(),
  })
  .superRefine((v, ctx) => {
    const issue = (path: (string | number)[], message: string) =>
      ctx.addIssue({ code: 'custom', path, message });
    const i = v.interruption;
    if (
      v.operationId !== i.executionId ||
      v.selected.id !== v.operationId ||
      v.selected.label !== i.executionPlan.label ||
      v.selected.intention !== i.executionPlan.intention
    ) {
      issue(['interruption'], 'Interrupted selected identity mismatch');
    }
    if (
      i.executionOffer.id !== i.offerId ||
      i.executionPlan.key !== i.actionKey ||
      !i.executionOffer.nodes.some(
        (n) => n.id === i.actionKey && n.action !== null,
      )
    ) {
      issue(['interruption'], 'Interrupted offer/plan identity mismatch');
    }
    if (v.actorAndWorld.gameSecond !== i.eventGameSecond) {
      issue(['actorAndWorld'], 'Interrupt gameSecond mismatch');
    }
    if (
      v.actorAndWorld.postInterruptStateDigest !==
      actionProjectedStateDigest({
        character: v.actorAndWorld.character,
        storyFacts: v.actorAndWorld.storyFacts,
        gameSecond: v.actorAndWorld.gameSecond,
      })
    ) {
      issue(['actorAndWorld'], 'Interrupted state digest mismatch');
    }
    if (v.settings.capturedSettings.revision !== v.settings.revision) {
      issue(['settings'], 'Campaign settings revision mismatch');
    }
    if (
      JSON.stringify(v.canonicalSelection.ruleSections) !==
      JSON.stringify(canonicalRuleEvidence(['time']))
    ) {
      issue(['canonicalSelection'], 'Invalid interrupt rule evidence selection');
    }
    if (Buffer.byteLength(JSON.stringify(v), 'utf8') > 256 * 1024) {
      issue([], 'context_capture_too_large');
    }
  });

export type InterruptedActionContextCaptureV1 = z.infer<
  typeof interruptedActionContextCaptureV1Schema
>;

export type AnyContextCaptureV1 =
  | ContextCaptureV1
  | CommittedActionContextCaptureV1
  | InterruptedActionContextCaptureV1;

export const contextCapturePointerSchema = z.union([
  z.strictObject({
    version: z.literal(1),
    captureId: uuid,
    purpose: z.literal('pending-consequence'),
  }),
  z.strictObject({
    version: z.literal(1),
    captureId: uuid,
    purpose: z.literal('consequence'),
    sourceKind: z.literal('action-receipt'),
  }),
  z.strictObject({
    version: z.literal(1),
    captureId: uuid,
    purpose: z.literal('consequence'),
    sourceKind: z.literal('action-interrupted'),
  }),
]);

export function hashContextCapture(capture: AnyContextCaptureV1) {
  return createHash('sha256')
    .update(JSON.stringify(capture))
    .digest('hex');
}

export function parseContextCapture(raw: unknown): AnyContextCaptureV1 {
  const purpose =
    raw && typeof raw === 'object' && 'purpose' in raw
      ? (raw as { purpose?: unknown }).purpose
      : undefined;
  if (purpose === 'consequence') {
    const sourceKind =
      raw && typeof raw === 'object' && 'sourceKind' in raw
        ? (raw as { sourceKind?: unknown }).sourceKind
        : undefined;
    if (sourceKind === 'action-interrupted') {
      return interruptedActionContextCaptureV1Schema.parse(raw);
    }
    return committedActionContextCaptureV1Schema.parse(raw);
  }
  return contextCaptureV1Schema.parse(raw);
}

function projectActivityProgress(plan: unknown, progress: unknown) {
  const resolved = resolvedActivityPlanSchema.parse(plan);
  const stored = activityProgressSchema.parse(progress).process;
  if (resolved.action.process.kind === 'contribution.v1') {
    if (stored.kind !== 'contribution.v1') {
      throw new Error('Stored activity progress does not match its rule');
    }
    return {
      action: resolved.action,
      progress: {
        kind: 'contribution' as const,
        label: resolved.action.process.progressLabel,
        earned: stored.earned,
        required: resolved.action.process.requiredContribution,
      },
    };
  }
  if (stored.kind !== 'clock-wait.v1') {
    throw new Error('Stored activity progress does not match its rule');
  }
  return {
    action: resolved.action,
    progress: {
      kind: 'wait' as const,
      label: resolved.action.process.progressLabel,
      elapsedFictionalSeconds: stored.elapsedFictionalSeconds,
      requiredFictionalSeconds:
        resolved.action.process.requiredFictionalSeconds,
    },
  };
}

function decodePassageResponse(response: unknown) {
  if (response === null) return null;
  return interactionSubmissionSchema.parse(response).answer.optionId;
}

/**
 * Stage 1: freeze ContextCaptureV1 + reserve generation G under the existing
 * story lock. Never reads DocumentStore.
 */
export async function capturePendingActionNarration(
  tx: Transaction,
  current: StoryRecord,
  input: {
    executionId: string;
    startGameSecond: number;
    targetGameSecond: number;
    offer: unknown;
    plan: unknown;
    label: string;
    intention: string;
    pending: PendingImmediateActionResolution;
    capturedAt?: string;
  },
) {
  const [passage] = await tx
    .select({ id: storyPassage.id })
    .from(storyPassage)
    .where(
      and(
        eq(storyPassage.storyId, current.id),
        eq(storyPassage.sequence, current.revision),
      ),
    );
  if (!passage) throw new Error('Missing pending action passage');

  const notes = continuityNotesSchema.parse(current.continuityNotes ?? []);
  const activeScene =
    current.activeSceneScope === null
      ? null
      : activeSceneAnchorSchema.parse(current.activeSceneScope);

  const recentQuery = tx
    .select()
    .from(storyPassage)
    .where(
      and(
        eq(storyPassage.storyId, current.id),
        lte(storyPassage.sequence, current.revision),
        ...(activeScene
          ? [gte(storyPassage.sequence, activeScene.fromSequence)]
          : []),
      ),
    )
    .orderBy(desc(storyPassage.sequence));
  const recent = activeScene ? await recentQuery : await recentQuery.limit(7);
  const evidenceIds = [
    ...new Set([
      ...notes.flatMap((note) => note.sources),
      ...(activeScene?.requiredPassageIds ?? []),
    ]),
  ];
  const older = evidenceIds.length
    ? await tx
        .select()
        .from(storyPassage)
        .where(
          and(
            eq(storyPassage.storyId, current.id),
            lte(storyPassage.sequence, current.revision),
            inArray(storyPassage.id, evidenceIds),
          ),
        )
    : [];
  const sourcePassages = [
    ...new Map(
      [...recent, ...older].map((row) => [row.id, row]),
    ).values(),
  ].map((row) => {
    const response = decodePassageResponse(row.response);
    if (row.contentDocumentHash !== null) {
      return {
        storage: 'cas' as const,
        passageId: row.id,
        sequence: row.sequence,
        contentHash: row.contentDocumentHash,
        inlineContent: null,
        response,
      };
    }
    return {
      storage: 'inline' as const,
      passageId: row.id,
      sequence: row.sequence,
      contentHash: null,
      inlineContent: passageContentSchema.parse(row.content),
      response,
    };
  });

  const items = storyItemsSchema.parse(
    await tx
      .select({
        key: storyItem.key,
        label: storyItem.label,
        holderKey: storyItem.holderKey,
      })
      .from(storyItem)
      .where(eq(storyItem.storyId, current.id)),
  );

  const [settingsRow] = await tx
    .select()
    .from(campaign)
    .where(eq(campaign.storyId, current.id));
  if (!settingsRow) throw new Error('Missing campaign for pending capture');

  const [captured] = await tx
    .select({ settings: campaignSettings.settings })
    .from(campaignSettings)
    .where(
      and(
        eq(campaignSettings.storyId, current.id),
        eq(campaignSettings.revision, settingsRow.settingsRevision),
      ),
    );
  if (!captured) throw new Error('Missing captured campaign settings');

  const acceptedSettings = campaignSettingsSchema.parse(captured.settings);
  const commitmentsRows = await tx
    .select()
    .from(gameActivity)
    .where(
      storytellerActivityContextFilter({
        storyId: current.id,
        activeActivityId: settingsRow.activeActivityId,
      }),
    );
  const commitments = commitmentsRows.flatMap((record) => {
    if (!isStorytellerActivityState(record.state)) return [];
    const projected = projectActivityProgress(record.plan, record.progress);
    return [
      {
        activityId: record.id,
        actionId: projected.action.id,
        revision: record.revision,
        state: record.state,
        label: projected.action.label,
        progress: projected.progress,
      },
    ];
  });

  const acceptedPlan = readAcceptedActivityPlan(
    settingsRow.acceptedActivityPlan,
  );
  const blockedEntry = acceptedPlan?.entries[acceptedPlan.cursor];
  const acceptedHandoff =
    acceptedPlan?.state === 'blocked' &&
    blockedEntry?.state === 'blocked' &&
    blockedEntry.activityId === null
      ? {
          id: acceptedPlan.id,
          revision: acceptedPlan.revision,
          horizonGameSecond: acceptedPlan.horizonGameSecond,
          nextEntry: { id: blockedEntry.id, plan: blockedEntry.plan },
        }
      : undefined;

  const offer = offerSchema.parse(input.offer);
  const selectedPlan = immediateActionPlanSchema.parse(input.plan);
  const fullAuthorization = situationAuthorizationSchema.parse(
    settingsRow.situationAuthorization,
  );
  const authorization = {
    version: fullAuthorization.version,
    offerId: fullAuthorization.offerId,
    activityAccess: fullAuthorization.activityAccess,
  };

  const ruleSections = canonicalRuleEvidence(
    input.pending.resolution.roll ? ['time', 'ability-check'] : ['time'],
  );

  const captureId = randomUUID();
  let capture: ContextCaptureV1;
  try {
    capture = contextCaptureV1Schema.parse({
      version: 1,
      captureId,
      storyId: current.id,
      ownerId: current.ownerId,
      purpose: 'pending-consequence',
      operationId: input.executionId,
      passageId: passage.id,
      narrativeRevision: current.revision,
      root:
        current.documentRootHash === null
          ? { hash: null, revision: 0 as const }
          : {
              hash: current.documentRootHash,
              revision: current.documentRootRevision,
            },
      sourcePassages,
      activeSceneScope: activeScene,
      narrative: {
        premise: premiseContentSchema.parse(current.premise),
        notes,
      },
      canonicalSelection: {
        ruleSections,
        campaignDocumentIds: [],
      },
      actorAndWorld: {
        character: characterSchema.parse(settingsRow.character),
        storyFacts: storyFactsSchema.parse(settingsRow.storyFacts),
        itemHolders: items,
        worldConditions: worldConditionsSchema.parse(
          settingsRow.worldConditions,
        ),
        commitments,
        offerAndAuthorization: {
          offer,
          selectedPlan,
          authorization,
          activeActivityId: settingsRow.activeActivityId,
          ...(acceptedHandoff ? { acceptedPlan: acceptedHandoff } : {}),
        },
        clock: {
          gameSecond: input.startGameSecond,
          targetGameSecond: input.targetGameSecond,
        },
      },
      settings: {
        revision: settingsRow.settingsRevision,
        capturedSettings: acceptedSettings,
        profile: storytellerProfileSchema.parse(current.storyteller),
        execution: executionPolicySchema.parse(current.execution),
        effectiveUsagePolicy:
          current.usagePolicy === null
            ? null
            : effectiveUsagePolicySchema.parse(current.usagePolicy),
      },
      selected: {
        id: input.executionId,
        label: input.label,
        intention: input.intention,
      },
      acceptedPendingResult: input.pending,
      capturedAt: input.capturedAt ?? new Date().toISOString(),
    });
  } catch (error) {
    if (
      error instanceof z.ZodError &&
      error.issues.some((issue) => issue.message === 'context_capture_too_large')
    ) {
      throw new Error('context_capture_too_large');
    }
    throw error;
  }

  const captureSha256 = hashContextCapture(capture);
  const pointer = contextCapturePointerSchema.parse({
    version: 1,
    captureId,
    purpose: 'pending-consequence',
  });

  await tx.insert(generation).values({
    id: captureId,
    ownerId: current.ownerId,
    kind: storytellerContextCaptureKind,
    input: pointer,
  });
  await tx.insert(storytellerPublication).values({ generationId: captureId });
  await tx.insert(storytellerContextCapture).values({
    captureId,
    storyId: current.id,
    operationId: input.executionId,
    capture,
    captureSha256,
    state: 'captured',
    materializationAttempts: 0,
  });
  await tx.insert(storyResolution).values({
    generationId: captureId,
    storyId: current.id,
    basePassageId: passage.id,
    baseRevision: current.revision,
    operationId: captureId,
    submission: {
      kind: 'pending-action-consequence',
      executionId: input.executionId,
      projectedStateDigest: input.pending.projectedStateDigest,
    },
  });
  await enqueue(tx, {
    id: randomUUID(),
    operationId: input.executionId,
    topic: campaignConsequenceTopic,
  });
  return captureId;
}

/**
 * ENG03-C1 Stage 1: freeze committed-action capture + reserve G under story lock.
 * Never reads DocumentStore. Sets receipt.generationId outside this helper.
 */
export async function captureCommittedActionNarration(
  tx: Transaction,
  current: StoryRecord,
  receipt: typeof gameActionReceipt.$inferSelect,
) {
  if (receipt.generationId !== null) {
    throw new Error('Committed capture requires a null receipt generation');
  }
  if (current.revision !== receipt.baseRevision) {
    throw new Error('Action narration lost its story revision fence');
  }
  if (receipt.storyId !== current.id) {
    throw new Error('Receipt story mismatch');
  }

  const [passage] = await tx
    .select({ id: storyPassage.id })
    .from(storyPassage)
    .where(
      and(
        eq(storyPassage.storyId, current.id),
        eq(storyPassage.sequence, current.revision),
      ),
    );
  if (!passage) throw new Error('Missing committed action passage');

  const [existingResolution] = await tx
    .select({ generationId: storyResolution.generationId })
    .from(storyResolution)
    .where(
      and(
        eq(storyResolution.storyId, current.id),
        eq(storyResolution.basePassageId, passage.id),
        eq(storyResolution.baseRevision, current.revision),
      ),
    );
  if (existingResolution) {
    throw new Error('Story resolution already owns this committed base');
  }

  const notes = continuityNotesSchema.parse(current.continuityNotes ?? []);
  const activeScene =
    current.activeSceneScope === null
      ? null
      : activeSceneAnchorSchema.parse(current.activeSceneScope);

  const recentQuery = tx
    .select()
    .from(storyPassage)
    .where(
      and(
        eq(storyPassage.storyId, current.id),
        lte(storyPassage.sequence, current.revision),
        ...(activeScene
          ? [gte(storyPassage.sequence, activeScene.fromSequence)]
          : []),
      ),
    )
    .orderBy(desc(storyPassage.sequence));
  const recent = activeScene ? await recentQuery : await recentQuery.limit(7);
  const evidenceIds = [
    ...new Set([
      ...notes.flatMap((note) => note.sources),
      ...(activeScene?.requiredPassageIds ?? []),
    ]),
  ];
  const older = evidenceIds.length
    ? await tx
        .select()
        .from(storyPassage)
        .where(
          and(
            eq(storyPassage.storyId, current.id),
            lte(storyPassage.sequence, current.revision),
            inArray(storyPassage.id, evidenceIds),
          ),
        )
    : [];
  const sourcePassages = [
    ...new Map([...recent, ...older].map((row) => [row.id, row])).values(),
  ].map((row) => {
    const response = decodePassageResponse(row.response);
    if (row.contentDocumentHash !== null) {
      return {
        storage: 'cas' as const,
        passageId: row.id,
        sequence: row.sequence,
        contentHash: row.contentDocumentHash,
        inlineContent: null,
        response,
      };
    }
    return {
      storage: 'inline' as const,
      passageId: row.id,
      sequence: row.sequence,
      contentHash: null,
      inlineContent: passageContentSchema.parse(row.content),
      response,
    };
  });

  const items = storyItemsSchema.parse(
    await tx
      .select({
        key: storyItem.key,
        label: storyItem.label,
        holderKey: storyItem.holderKey,
      })
      .from(storyItem)
      .where(eq(storyItem.storyId, current.id)),
  );

  const [settingsRow] = await tx
    .select()
    .from(campaign)
    .where(eq(campaign.storyId, current.id));
  if (!settingsRow) throw new Error('Missing campaign for committed capture');

  const [captured] = await tx
    .select({ settings: campaignSettings.settings })
    .from(campaignSettings)
    .where(
      and(
        eq(campaignSettings.storyId, current.id),
        eq(campaignSettings.revision, settingsRow.settingsRevision),
      ),
    );
  if (!captured) throw new Error('Missing captured campaign settings');

  const acceptedSettings = campaignSettingsSchema.parse(captured.settings);
  const commitmentsRows = await tx
    .select()
    .from(gameActivity)
    .where(
      storytellerActivityContextFilter({
        storyId: current.id,
        activeActivityId: settingsRow.activeActivityId,
      }),
    );
  const commitments = commitmentsRows.flatMap((record) => {
    if (!isStorytellerActivityState(record.state)) return [];
    const projected = projectActivityProgress(record.plan, record.progress);
    return [
      {
        activityId: record.id,
        actionId: projected.action.id,
        revision: record.revision,
        state: record.state,
        label: projected.action.label,
        progress: projected.progress,
      },
    ];
  });

  const acceptedPlan = readAcceptedActivityPlan(
    settingsRow.acceptedActivityPlan,
  );
  const blockedEntry = acceptedPlan?.entries[acceptedPlan.cursor];
  const acceptedHandoff =
    acceptedPlan?.state === 'blocked' &&
    blockedEntry?.state === 'blocked' &&
    blockedEntry.activityId === null
      ? {
          id: acceptedPlan.id,
          revision: acceptedPlan.revision,
          horizonGameSecond: acceptedPlan.horizonGameSecond,
          nextEntry: { id: blockedEntry.id, plan: blockedEntry.plan },
        }
      : undefined;

  const fullAuthorization = situationAuthorizationSchema.parse(
    settingsRow.situationAuthorization,
  );
  const activitySituation = activitySituationInner.parse({
    activityAccess: fullAuthorization.activityAccess,
    activeActivityId: settingsRow.activeActivityId,
    ...(acceptedHandoff ? { acceptedPlan: acceptedHandoff } : {}),
    commitments,
  });

  const character = characterSchema.parse(settingsRow.character);
  const storyFacts = storyFactsSchema.parse(settingsRow.storyFacts);
  const postSettlementStateDigest = actionProjectedStateDigest({
    character,
    storyFacts,
    gameSecond: settingsRow.gameSecond,
  });

  const acceptedReceipt = committedActionReceiptCaptureSchema.parse({
    operationId: receipt.operationId,
    storyId: receipt.storyId,
    offerId: receipt.offerId,
    actionKey: receipt.actionKey,
    baseRevision: receipt.baseRevision,
    offer: receipt.offer,
    plan: receipt.plan,
    label: receipt.label,
    intention: receipt.intention,
    outcome: receipt.outcome,
    outcomeText: receipt.outcomeText,
    effects: receipt.effects,
    declarations: receipt.declarations,
    roll: receipt.roll,
  });

  const ruleSections = canonicalRuleEvidence(
    acceptedReceipt.roll ? ['time', 'ability-check'] : ['time'],
  );

  const captureId = randomUUID();
  let capture: CommittedActionContextCaptureV1;
  try {
    capture = committedActionContextCaptureV1Schema.parse({
      version: 1,
      captureId,
      storyId: current.id,
      ownerId: current.ownerId,
      purpose: 'consequence',
      sourceKind: 'action-receipt',
      operationId: receipt.operationId,
      passageId: passage.id,
      narrativeRevision: current.revision,
      root:
        current.documentRootHash === null
          ? { hash: null, revision: 0 as const }
          : {
              hash: current.documentRootHash,
              revision: current.documentRootRevision,
            },
      sourcePassages,
      activeSceneScope: activeScene,
      narrative: {
        premise: premiseContentSchema.parse(current.premise),
        notes,
      },
      canonicalSelection: {
        ruleSections,
        campaignDocumentIds: [],
      },
      actorAndWorld: {
        character,
        storyFacts,
        itemHolders: items,
        worldConditions: worldConditionsSchema.parse(
          settingsRow.worldConditions,
        ),
        activitySituation,
        gameSecond: settingsRow.gameSecond,
        postSettlementStateDigest,
      },
      settings: {
        revision: settingsRow.settingsRevision,
        capturedSettings: acceptedSettings,
        profile: storytellerProfileSchema.parse(current.storyteller),
        execution: executionPolicySchema.parse(current.execution),
        effectiveUsagePolicy:
          current.usagePolicy === null
            ? null
            : effectiveUsagePolicySchema.parse(current.usagePolicy),
      },
      selected: {
        id: receipt.operationId,
        label: receipt.label,
        intention: receipt.intention,
      },
      acceptedReceipt,
      capturedAt: new Date().toISOString(),
    });
  } catch (error) {
    if (
      error instanceof z.ZodError &&
      error.issues.some((issue) => issue.message === 'context_capture_too_large')
    ) {
      throw new Error('context_capture_too_large');
    }
    throw error;
  }

  const captureSha256 = hashContextCapture(capture);
  const pointer = contextCapturePointerSchema.parse({
    version: 1,
    captureId,
    purpose: 'consequence',
    sourceKind: 'action-receipt',
  });

  await tx.insert(generation).values({
    id: captureId,
    ownerId: current.ownerId,
    kind: storytellerContextCaptureKind,
    input: pointer,
  });
  await tx.insert(storytellerPublication).values({ generationId: captureId });
  await tx.insert(storytellerContextCapture).values({
    captureId,
    storyId: current.id,
    operationId: receipt.operationId,
    capture,
    captureSha256,
    state: 'captured',
    materializationAttempts: 0,
  });
  await tx.insert(storyResolution).values({
    generationId: captureId,
    storyId: current.id,
    basePassageId: passage.id,
    baseRevision: current.revision,
    operationId: captureId,
    submission: {
      kind: 'committed-consequence',
      operationId: receipt.operationId,
    },
  });
  await transitionStorytellerIntentToGeneration(
    tx,
    settingsRow,
    receipt.operationId,
    captureId,
    await readDatabaseClockMs(tx, current.id),
  );
  await enqueue(tx, {
    id: randomUUID(),
    operationId: receipt.operationId,
    topic: campaignConsequenceTopic,
  });
  return captureId;
}

/**
 * ENG03-C2 Stage 1: freeze interrupted-action capture + reserve G under story lock.
 * Never reads DocumentStore. Caller links campaignConsequence.generationId.
 */
export async function captureInterruptedActionNarration(
  tx: Transaction,
  current: StoryRecord,
  receipt: {
    kind: 'action-interrupted';
    passageId: string;
    operationId: string;
    executionId: string;
    executionRevision: number;
    gameSecond: number;
    cause: 'required-item-holder-changed';
    offerId: string;
    actionKey: string;
    itemKeys: string[];
    eventId: string;
    label: string;
    intention: string;
  },
) {
  if (receipt.executionId !== receipt.operationId) {
    throw new Error('Interrupted capture requires executionId === operationId');
  }
  if (receipt.cause !== 'required-item-holder-changed') {
    throw new Error('Interrupted capture only supports required-item-holder-changed');
  }

  const [passage] = await tx
    .select({ id: storyPassage.id })
    .from(storyPassage)
    .where(
      and(
        eq(storyPassage.storyId, current.id),
        eq(storyPassage.sequence, current.revision),
      ),
    );
  if (!passage || passage.id !== receipt.passageId) {
    throw new Error('Interrupted capture lost its story passage fence');
  }

  const [existingResolution] = await tx
    .select({ generationId: storyResolution.generationId })
    .from(storyResolution)
    .where(
      and(
        eq(storyResolution.storyId, current.id),
        eq(storyResolution.basePassageId, passage.id),
        eq(storyResolution.baseRevision, current.revision),
      ),
    );
  if (existingResolution) {
    throw new Error('Story resolution already owns this interrupted base');
  }

  const [execution] = await tx
    .select()
    .from(gameActionExecution)
    .where(eq(gameActionExecution.operationId, receipt.operationId))
    .for('update');
  if (
    !execution ||
    execution.state !== 'interrupted' ||
    execution.revision !== receipt.executionRevision ||
    execution.storyId !== current.id ||
    execution.offerId !== receipt.offerId ||
    execution.actionKey !== receipt.actionKey
  ) {
    throw new Error('Interrupted capture lost its execution fence');
  }
  if (execution.preparationGenerationId) {
    throw new Error(
      'Interrupted item transfer must not reuse a speculative preparation',
    );
  }

  const [successReceipt] = await tx
    .select({ operationId: gameActionReceipt.operationId })
    .from(gameActionReceipt)
    .where(eq(gameActionReceipt.operationId, receipt.operationId));
  if (successReceipt) {
    throw new Error('Interrupted action cannot narrate a success receipt');
  }

  const [event] = await tx
    .select({
      id: gameActionExecutionEvent.id,
      gameSecond: gameActionExecutionEvent.gameSecond,
    })
    .from(gameActionExecutionEvent)
    .where(
      and(
        eq(gameActionExecutionEvent.id, receipt.eventId),
        eq(gameActionExecutionEvent.executionId, receipt.executionId),
        eq(
          gameActionExecutionEvent.executionRevision,
          receipt.executionRevision,
        ),
        eq(gameActionExecutionEvent.kind, 'interrupted'),
        eq(gameActionExecutionEvent.storyId, current.id),
      ),
    );
  if (!event || event.gameSecond !== receipt.gameSecond) {
    throw new Error('Interrupted capture lost its event fence');
  }

  const executionOffer = offerSchema.parse(execution.offer);
  const executionPlan = immediateActionPlanSchema.parse(execution.plan);
  const transferKeys = positiveItemTransfers(executionPlan).map(
    (transfer) => transfer.itemKey,
  );
  if (
    transferKeys.length === 0 ||
    transferKeys.length !== receipt.itemKeys.length ||
    transferKeys.some((key, index) => key !== receipt.itemKeys[index])
  ) {
    throw new Error('Interrupted capture itemKeys mismatch');
  }

  const notes = continuityNotesSchema.parse(current.continuityNotes ?? []);
  const activeScene =
    current.activeSceneScope === null
      ? null
      : activeSceneAnchorSchema.parse(current.activeSceneScope);

  const recentQuery = tx
    .select()
    .from(storyPassage)
    .where(
      and(
        eq(storyPassage.storyId, current.id),
        lte(storyPassage.sequence, current.revision),
        ...(activeScene
          ? [gte(storyPassage.sequence, activeScene.fromSequence)]
          : []),
      ),
    )
    .orderBy(desc(storyPassage.sequence));
  const recent = activeScene ? await recentQuery : await recentQuery.limit(7);
  const evidenceIds = [
    ...new Set([
      ...notes.flatMap((note) => note.sources),
      ...(activeScene?.requiredPassageIds ?? []),
    ]),
  ];
  const older = evidenceIds.length
    ? await tx
        .select()
        .from(storyPassage)
        .where(
          and(
            eq(storyPassage.storyId, current.id),
            lte(storyPassage.sequence, current.revision),
            inArray(storyPassage.id, evidenceIds),
          ),
        )
    : [];
  const sourcePassages = [
    ...new Map([...recent, ...older].map((row) => [row.id, row])).values(),
  ].map((row) => {
    const response = decodePassageResponse(row.response);
    if (row.contentDocumentHash !== null) {
      return {
        storage: 'cas' as const,
        passageId: row.id,
        sequence: row.sequence,
        contentHash: row.contentDocumentHash,
        inlineContent: null,
        response,
      };
    }
    return {
      storage: 'inline' as const,
      passageId: row.id,
      sequence: row.sequence,
      contentHash: null,
      inlineContent: passageContentSchema.parse(row.content),
      response,
    };
  });

  const items = storyItemsSchema.parse(
    await tx
      .select({
        key: storyItem.key,
        label: storyItem.label,
        holderKey: storyItem.holderKey,
      })
      .from(storyItem)
      .where(eq(storyItem.storyId, current.id)),
  );

  const [settingsRow] = await tx
    .select()
    .from(campaign)
    .where(eq(campaign.storyId, current.id));
  if (!settingsRow) throw new Error('Missing campaign for interrupted capture');
  if (settingsRow.gameSecond !== receipt.gameSecond) {
    throw new Error('Interrupted capture gameSecond mismatch');
  }

  const [captured] = await tx
    .select({ settings: campaignSettings.settings })
    .from(campaignSettings)
    .where(
      and(
        eq(campaignSettings.storyId, current.id),
        eq(campaignSettings.revision, settingsRow.settingsRevision),
      ),
    );
  if (!captured) throw new Error('Missing captured campaign settings');

  const acceptedSettings = campaignSettingsSchema.parse(captured.settings);
  const commitmentsRows = await tx
    .select()
    .from(gameActivity)
    .where(
      storytellerActivityContextFilter({
        storyId: current.id,
        activeActivityId: settingsRow.activeActivityId,
      }),
    );
  const commitments = commitmentsRows.flatMap((record) => {
    if (!isStorytellerActivityState(record.state)) return [];
    const projected = projectActivityProgress(record.plan, record.progress);
    return [
      {
        activityId: record.id,
        actionId: projected.action.id,
        revision: record.revision,
        state: record.state,
        label: projected.action.label,
        progress: projected.progress,
      },
    ];
  });

  const acceptedPlan = readAcceptedActivityPlan(
    settingsRow.acceptedActivityPlan,
  );
  const blockedEntry = acceptedPlan?.entries[acceptedPlan.cursor];
  const acceptedHandoff =
    acceptedPlan?.state === 'blocked' &&
    blockedEntry?.state === 'blocked' &&
    blockedEntry.activityId === null
      ? {
          id: acceptedPlan.id,
          revision: acceptedPlan.revision,
          horizonGameSecond: acceptedPlan.horizonGameSecond,
          nextEntry: { id: blockedEntry.id, plan: blockedEntry.plan },
        }
      : undefined;

  const fullAuthorization = situationAuthorizationSchema.parse(
    settingsRow.situationAuthorization,
  );
  const activitySituation = activitySituationInner.parse({
    activityAccess: fullAuthorization.activityAccess,
    activeActivityId: settingsRow.activeActivityId,
    ...(acceptedHandoff ? { acceptedPlan: acceptedHandoff } : {}),
    commitments,
  });

  const character = characterSchema.parse(settingsRow.character);
  const storyFacts = storyFactsSchema.parse(settingsRow.storyFacts);
  const postInterruptStateDigest = actionProjectedStateDigest({
    character,
    storyFacts,
    gameSecond: settingsRow.gameSecond,
  });

  const factualText =
    'The accepted transfer could not complete; the required item was no longer available' as const;

  const captureId = randomUUID();
  let capture: InterruptedActionContextCaptureV1;
  try {
    capture = interruptedActionContextCaptureV1Schema.parse({
      version: 1,
      captureId,
      storyId: current.id,
      ownerId: current.ownerId,
      purpose: 'consequence',
      sourceKind: 'action-interrupted',
      operationId: receipt.operationId,
      passageId: passage.id,
      narrativeRevision: current.revision,
      root:
        current.documentRootHash === null
          ? { hash: null, revision: 0 as const }
          : {
              hash: current.documentRootHash,
              revision: current.documentRootRevision,
            },
      sourcePassages,
      activeSceneScope: activeScene,
      narrative: {
        premise: premiseContentSchema.parse(current.premise),
        notes,
      },
      canonicalSelection: {
        ruleSections: canonicalRuleEvidence(['time']),
        campaignDocumentIds: [],
      },
      actorAndWorld: {
        character,
        storyFacts,
        itemHolders: items,
        worldConditions: worldConditionsSchema.parse(
          settingsRow.worldConditions,
        ),
        activitySituation,
        gameSecond: settingsRow.gameSecond,
        postInterruptStateDigest,
      },
      settings: {
        revision: settingsRow.settingsRevision,
        capturedSettings: acceptedSettings,
        profile: storytellerProfileSchema.parse(current.storyteller),
        execution: executionPolicySchema.parse(current.execution),
        effectiveUsagePolicy:
          current.usagePolicy === null
            ? null
            : effectiveUsagePolicySchema.parse(current.usagePolicy),
      },
      selected: {
        id: receipt.operationId,
        label: executionPlan.label,
        intention: executionPlan.intention,
      },
      interruption: {
        kind: 'action-interrupted',
        cause: 'required-item-holder-changed',
        executionId: receipt.executionId,
        executionRevision: receipt.executionRevision,
        eventId: receipt.eventId,
        eventGameSecond: receipt.gameSecond,
        offerId: receipt.offerId,
        actionKey: receipt.actionKey,
        itemKeys: receipt.itemKeys,
        executionOffer,
        executionPlan,
        factualText,
      },
      capturedAt: new Date().toISOString(),
    });
  } catch (error) {
    if (
      error instanceof z.ZodError &&
      error.issues.some((issue) => issue.message === 'context_capture_too_large')
    ) {
      throw new Error('context_capture_too_large');
    }
    throw error;
  }

  const captureSha256 = hashContextCapture(capture);
  const pointer = contextCapturePointerSchema.parse({
    version: 1,
    captureId,
    purpose: 'consequence',
    sourceKind: 'action-interrupted',
  });

  await tx.insert(generation).values({
    id: captureId,
    ownerId: current.ownerId,
    kind: storytellerContextCaptureKind,
    input: pointer,
  });
  await tx.insert(storytellerPublication).values({ generationId: captureId });
  await tx.insert(storytellerContextCapture).values({
    captureId,
    storyId: current.id,
    operationId: receipt.operationId,
    capture,
    captureSha256,
    state: 'captured',
    materializationAttempts: 0,
  });
  await tx.insert(storyResolution).values({
    generationId: captureId,
    storyId: current.id,
    basePassageId: passage.id,
    baseRevision: current.revision,
    operationId: captureId,
    submission: {
      kind: 'committed-consequence',
      operationId: receipt.operationId,
    },
  });
  await transitionStorytellerIntentToGeneration(
    tx,
    settingsRow,
    receipt.operationId,
    captureId,
    await readDatabaseClockMs(tx, current.id),
  );
  await enqueue(tx, {
    id: randomUUID(),
    operationId: receipt.operationId,
    topic: campaignConsequenceTopic,
  });
  return captureId;
}
