# ENG03-narrow | ContextCaptureV1 and single-identity promotion

**Design status:** selected first-path technical contract, 2026-11-14. **Implementation:** not executed. **Purpose:** pending-consequence only. **Source basis:** inspected GitHub main through adb118f2dc; Cursor must re-verify its newer local SA working tree before setting the Change to Ready. This document supersedes only the conditional unknown-field sketch in [ENG03 §B](eng03-measurement-and-capture-contract.md); the larger [ENG03](../../changes/2026-11-13--eng-short-lock-context/CHANGE.md) stays Proposed.

## Decision

Reserve **one generation ID G** inside the accepted-action story-lock transaction. G is also the capture ID and the controlling story_resolution.generation_id. At first G is a non-dispatchable, application-private capture placeholder. Off-lock materialization promotes **that same row/ID** to one ordinary validated Storyteller generation and emits the existing Storyteller outbox notice. Mechanical settlement links the receipt to **G**, regardless of whether promotion happened yet. A second speculative generation is never created. No new bus, Temporal workflow, generic saga coordinator, or provider authorization is introduced.

An **additive, narrowly owned** storyteller_context_capture row holds typed frozen input and bounded preparation state; this is a per-generation materialization record, not another game workflow. Existing generation, storyteller_publication, story_resolution, game_action_execution, game_action_receipt, campaign holds, and outbox retain authority. The provisional generation has kind storyteller.context-capture.v1 and a non-null tagged pointer input, not a value passed to storytellerTaskSchema. Only after valid task creation does its kind become storyteller.profiled.v1. This deliberately respects generation.input NOT NULL, generation.pending shape checks, story_resolution FK, and the existing Storyteller runtime's kind filter.

### TypeScript + Zod contract (new application-private context-capture.ts)

The following is the chosen outline with concrete Zod types. Imports use existing exports except the **two minimal export-only changes** noted below. No persisted unknown/any/loose passthrough objects are permitted.

~~~ts
import { z } from 'zod';
import {
  campaignSettingsSchema,
} from '@offscreen/contracts/campaign';
import { effectiveUsagePolicySchema } from '@offscreen/contracts/usage-policy';
import {
  passageContentSchema,
  storyItemsSchema,
} from '@offscreen/contracts/stories';
import {
  characterSchema,
  storyFactsSchema,
} from '@offscreen/game/state';
import { worldConditionsSchema } from '@offscreen/game/world-obligations';
import { offerSchema } from '@offscreen/game/offers';
import {
  immediateActionPlanSchema,
  situationAuthorizationSchema,
} from '@offscreen/game/immediate-actions';
import {
  contextInputSchema,
  continuityNotesSchema,
  premiseContentSchema,
} from '@offscreen/storyteller/context';
import { storytellerProfileSchema } from '@offscreen/storyteller/profiles';
import { executionPolicySchema } from '@offscreen/storyteller/tasks';
import { activeSceneAnchorSchema } from './context';
import {
  canonicalRuleEvidence,
  librarySectionSelectionSchema,
} from './canonical-knowledge';
import {
  pendingImmediateActionResolutionSchema,
  actionResolutionSourceDigest,
  actionResolutionProjectedDigest,
} from '../campaign/action-overlap';

const uuid = z.uuid();
const sha256 = z.string().regex(/^[a-f0-9]{64}$/);
const narrativeRevision = z.number().int().positive();
const gameSecond = z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER);
const activitySituation = contextInputSchema.shape.activitySituation.unwrap();
const offerAuthorization = situationAuthorizationSchema.pick({
  version: true,
  offerId: true,
  activityAccess: true,
});

// The order of this array is the exact evidence order of loadStorytellerContext.
// Inline bodies are copied under lock; CAS bytes are NEVER loaded under lock.
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

export const contextCaptureV1Schema = z.strictObject({
  version: z.literal(1),
  captureId: uuid,          // equals reserved generation.id
  storyId: uuid,
  ownerId: z.string().min(1), // server-owned; from story.owner_id
  purpose: z.literal('pending-consequence'),
  operationId: uuid,        // accepted finite action / execution operation
  passageId: uuid,          // current base passage
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
    character: characterSchema,                // pre-action state
    storyFacts: storyFactsSchema,              // pre-action state
    itemHolders: storyItemsSchema,             // key / label / holderKey
    worldConditions: worldConditionsSchema,
    commitments: activitySituation.shape.commitments,
    offerAndAuthorization: z.strictObject({
      offer: offerSchema,
      selectedPlan: immediateActionPlanSchema,
      authorization: offerAuthorization,
      activeActivityId: uuid.nullable(),
      acceptedPlan: activitySituation.shape.acceptedPlan,
    }),
    clock: z.strictObject({
      gameSecond,                             // start boundary
      targetGameSecond: gameSecond,           // frozen future boundary
    }),
  }),
  settings: z.strictObject({
    revision: narrativeRevision,              // campaign.settings_revision
    capturedSettings: campaignSettingsSchema, // campaign_settings.settings
    profile: storytellerProfileSchema,        // story.storyteller
    execution: executionPolicySchema,         // story.execution
    effectiveUsagePolicy: effectiveUsagePolicySchema.nullable(),
  }),
  selected: z.strictObject({
    id: uuid,                                  // equals operationId
    label: immediateActionPlanSchema.shape.label,
    intention: immediateActionPlanSchema.shape.intention,
  }),
  acceptedPendingResult: pendingImmediateActionResolutionSchema,
  capturedAt: z.iso.datetime(),               // diagnostic only
}).superRefine((v, ctx) => {
  const issue = (path: (string | number)[], message: string) =>
    ctx.addIssue({ code: 'custom', path, message });
  const ids = v.sourcePassages.map((p) => p.passageId);
  const sequences = v.sourcePassages.map((p) => p.sequence);
  if (new Set(ids).size !== ids.length ||
      new Set(sequences).size !== sequences.length) {
    issue(['sourcePassages'], 'Evidence passage ID and sequence must be unique');
  }
  if (sequences.some((s) => s > v.narrativeRevision)) {
    issue(['sourcePassages'], 'Evidence cannot come from a future revision');
  }
  const current = v.sourcePassages.find(
    (p) => p.sequence === v.narrativeRevision,
  );
  if (!current || current.passageId !== v.passageId) {
    issue(['passageId'], 'Captured source frontier has no matching current passage');
  }
  const required = [
    ...v.narrative.notes.flatMap((n) => n.sources),
    ...(v.activeSceneScope?.requiredPassageIds ?? []),
  ];
  if (required.some((id) => !ids.includes(id))) {
    issue(['sourcePassages'], 'A required passage was not captured');
  }
  if (v.activeSceneScope &&
      v.activeSceneScope.fromSequence > v.narrativeRevision) {
    issue(['activeSceneScope'], 'Active scene begins after the source frontier');
  }
  if (v.selected.id !== v.operationId ||
      v.selected.label !== v.actorAndWorld.offerAndAuthorization.selectedPlan.label ||
      v.selected.intention !== v.actorAndWorld.offerAndAuthorization.selectedPlan.intention) {
    issue(['selected'], 'Selected identity/terms do not match the frozen plan');
  }
  const auth = v.actorAndWorld.offerAndAuthorization;
  if (auth.authorization.offerId !== auth.offer.id ||
      !auth.offer.nodes.some((n) =>
        n.id === auth.selectedPlan.key && n.action !== null)) {
    issue(['actorAndWorld', 'offerAndAuthorization'], 'Accepted offer/plan mismatch');
  }
  if (v.actorAndWorld.clock.targetGameSecond <=
      v.actorAndWorld.clock.gameSecond) {
    issue(['actorAndWorld', 'clock'], 'Finite action target must follow start');
  }
  if (v.settings.capturedSettings.revision !== v.settings.revision) {
    issue(['settings'], 'Captured settings revision mismatch');
  }
  if (v.settings.execution.mode === 'provider' &&
      (v.settings.effectiveUsagePolicy === null ||
       v.settings.effectiveUsagePolicy.route !==
         v.settings.execution.policy.route)) {
    issue(['settings'], 'Captured provider authority is absent or route-mismatched');
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
  if (sourceDigest !== v.acceptedPendingResult.sourceStateDigest ||
      projectedDigest !== v.acceptedPendingResult.projectedStateDigest) {
    issue(['acceptedPendingResult'], 'Pending action source/projected digests disagree');
  }
  const expectedTopics = v.acceptedPendingResult.resolution.roll
    ? ['time', 'ability-check'] : ['time'];
  if (JSON.stringify(v.canonicalSelection.ruleSections) !==
      JSON.stringify(canonicalRuleEvidence(expectedTopics))) {
    issue(['canonicalSelection'], 'First path requires the exact frozen rule-evidence recipe');
  }
  // Deliberate first-path SQL capture ceiling. No opaque/unbounded history dump.
  if (Buffer.byteLength(JSON.stringify(v), 'utf8') > 256 * 1024) {
    issue([], 'context_capture_too_large');
  }
});

export type ContextCaptureV1 = z.infer<typeof contextCaptureV1Schema>;
~~~

**Exact pre-existing schemas:** characterSchema and storyFactsSchema (game/state); storyItemsSchema and passageContentSchema (contracts/stories); worldConditionsSchema (game/world-obligations); offerSchema and immediateActionPlanSchema/situationAuthorizationSchema (game); campaignSettingsSchema and effectiveUsagePolicySchema (contracts); continuityNotesSchema, premiseContentSchema and contextInputSchema (storyteller/context); storytellerProfileSchema; executionPolicySchema; pendingImmediateActionResolutionSchema (campaign/action-overlap). Export activeSceneAnchorSchema from application/storyteller/context.ts **without changing its definition** and librarySectionSelectionSchema from application/storyteller/canonical-knowledge.ts **without changing its definition**.

Zod validates structural shape. The Stage-1 collector additionally enforces exact passage query/order; the existing accepted action's offer/authorization/plan eligibility; generated ID cross-links; and source passage current identity. Stage-2 validates every CAS envelope and contextInputSchema plus prepareAdmittedStorytellerTask output. Those checks cannot be replaced by broad z.unknown() fields.

### Physical source and freezing authority

| DTO group | Existing source symbol | Stage-1 treatment | Stage-2 authority |
| --- | --- | --- | --- |
| captureId | New UUID G; generation.id, storyteller_publication.generation_id and story_resolution.generation_id | Insert once under lock, identical in all links | Reuse G, never new generation |
| storyId / ownerId | story.id / story.owner_id via lockOwnedStory | Copy/verify owner on server | May check identity only, no client authority |
| operationId | action args.operationId; game_action_execution.operation_id | Copy admitted operation, not new UUID | Existing execution / receipt linkage only |
| passageId / narrativeRevision | current passage story_passage.id and story.revision | Copy exact base | Recheck controlling base at promotion/publication |
| root | story.document_root_hash / document_root_revision | Copy paired hash/revision, including null/0 | Read manifest by hash; never latest root alias |
| sourcePassages | story_passage.id, sequence, content_document_hash, content, response | SQL selects identical recent/active/notes evidence set and order; copy inline content and decoded response; CAS records only hash | Read source passage by hash, assert envelope.documentId, kind, revision/coverage match passage ID/sequence, parse passageContentSchema; never fetch latest SQL body |
| activeSceneScope | story.active_scene_scope; activeSceneAnchorSchema | Copy parsed anchor and recallCues, or null | Derive contextInput active-scene.v1 through captured revision; no latest anchor |
| narrative.premise / notes | story.premise / story.continuity_notes | Copy premiseContentSchema / continuityNotesSchema | Build context solely from captured values |
| character / storyFacts | campaign.character / campaign.story_facts | Copy and parse pre-action actor facts | Projected resolution character/story facts come from acceptedPendingResult, NOT mutable current campaign |
| itemHolders | story_item.key,label,holder_key selected in context.ts | Copy <=50 storyItemsSchema rows | No post-lock story_item re-read for prompt |
| worldConditions | campaign.world_conditions | Copy worldConditionsSchema | No post-lock campaign re-read for prompt |
| commitments | game_activity.plan,progress,state,revision + projectActivityProgress | Under lock, project only existing six active/nonterminal states into contextInputSchema.activitySituation.commitments, max20; no history dump | Use captured projection, not mutable game_activity |
| offerAndAuthorization | game_action_execution.offer/plan; campaign.situation_authorization, active_activity_id, accepted_activity_plan; readAcceptedActivityPlan | Copy offer and accepted plan; freeze only authorization.version/offerId/activityAccess; capture active activity and exactly the blocked accepted-plan handoff currently exposed | Reconstruct contextInput.activitySituation only from captured fields; selected plan validates identity but is not sent as a new game rule |
| clock | game_action_execution.start_game_second / target_game_second, tied to accepted state | Copy start and target; validate pending digests | Compute campaignTime via projectWorldTime(frozen capturedSettings.time, targetGameSecond), no wall clock projection |
| settings.revision/capturedSettings | campaign.settings_revision + campaign_settings(story_id, revision).settings | Read exact revision and copy parsed complete campaignSettingsSchema | Derive storytellerCampaignSettingsSchema (omit time), campaignTime without SQL |
| settings.profile | story.storyteller | Copy storytellerProfileSchema | Exact profile for task; campaign_settings.profile is **not** used on this path |
| settings.execution / effectiveUsagePolicy | story.execution / story.usage_policy | Copy executionPolicySchema / effectiveUsagePolicySchema or null | Run prepareAdmittedStorytellerTask with frozen policy; existing dispatchAuthority may tighten/deny before paid transport, never broaden |
| selected | execution operation ID + admitted immediateActionPlan label/intention | Copy/validate | Build selected context without current offer lookup |
| acceptedPendingResult | game_action_execution.pending_resolution; freezePendingActionResolution | Copy full pendingImmediateActionResolutionSchema including source/projected SHA, frozen outcome, effects, declarations, roll and projected actor | Build one context.resolution receipt with operationId; no dice, mechanics, reroll |
| canonicalSelection | canonicalRuleEvidence(['time'] or ['time','ability-check']) derived from frozen roll | Freeze bounded library selection, empty campaign document IDs | loadCanonicalKnowledge on the frozen root; anchor recall cues reused; no new selection inferred from mutable SQL |
| capturedAt | DB/app timestamp in capture admission | Copy ISO time | For trace only; exclude from context/request hash/game time |

**Explicit omissions:** campaign_settings.profile is not read by current pending context; raw campaign.clock/clock_anchor_at/clock_pace/holds are execution mechanics, not model context; raw game_activity history/roll ledgers are outside first path; campaign.situation_authorization.preparedPlans are not in current pending model input; campaign_offer/game_offer catalogue beyond the admitted immediate plan is not needed; selected worldSections/campaignDocuments are **continuation** choice retrieval, not this pending path; historical/report/opening tasks, arbitrary ECS state, player demographics, developer-private CAS documents and new story rules are excluded. These omissions are based on the current context.ts / narration.ts path, not permission to drop future verified dependencies.

## Three-stage lifecycle and invariants

### Stage 1: bounded story-lock capture + durable reservation

1. In createCampaignActions, retain commandReceipt/idempotency, owner/offer/actor/plan validation, finite-action eligibility and freezePendingActionResolution; insert game_action_execution as today. Keep all game facts/rules and roll decisions identical.
2. Replace only preparePendingActionNarration's external-I/O portion with capturePendingActionNarration. Under the **same existing story FOR UPDATE lock**: select the exact SQL passage frontier and mutable values named above; parse ContextCaptureV1; reject any unresolved required source row or >256 KiB capture **before committing the action**. Do not call DocumentStore or a model. A referenced CAS hash is enough at this stage; its object may be unavailable off-lock.
3. Generate G once, insert generation(id=G, kind=storyteller.context-capture.v1, state=pending, input={version:1,captureId:G,purpose:'pending-consequence'}); insert storyteller_publication(generationId=G); insert additive storyteller_context_capture(captureId=G, storyId, operationId unique, capture, captureSha256, state=captured, attempts=0); insert existing story_resolution(generationId=G, basePassageId/baseRevision, operationId=G, pending-action-consequence submission); set game_action_execution.preparationGenerationId=G.
4. Use existing outbox.enqueue with campaignConsequenceTopic and operationId=accepted action's operationId (not G) in this transaction. Finish existing action event/campaign updates/command receipt/scheduleActionExecution and COMMIT.
5. **One controlling slot:** never insert campaign_consequence for this same base while G owns story_resolution. No new game clock hold while the finite action legitimately runs. If it settles before context preparation, the normal exact G storyteller hold is transferred within the settlement transaction.
6. A duplicate action command returns its original command receipt. A duplicate materialization wake uses capture.operationId unique and the same G. A Stage-1 error aborts the new action transaction just as admission failure did before refactor.

**Additive row, not a new saga:** storyteller_context_capture has PK capture_id FK generation.id; unique(operation_id), story_id, capture JSONB **typed as ContextCaptureV1 in Drizzle and parsed with contextCaptureV1Schema on every read/write**, capture_sha256 SHA256, state checked to captured/materializing/ready/held/stale/blocked, materialization_attempts nonnegative bounded integer, lease_id UUID and lease_expires_at timestamp nullable, materialized_request_sha256 SHA256 nullable, failure_code bounded text nullable, created_at/updated_at timestamps. A single operation has at most one such row. A bounded lease controls concurrent **storage reads only**, not a provider claim. No destructive backfill, and existing generations have no companion row.

### Stage 2: off-lock immutable materialization and task promotion

1. Extend existing createConsequenceNarration / prepareCampaignConsequence handler to recognize **only** a capture row for the incoming action operationId, **before** its existing game_action_receipt.generation_id early-return. Other existing receipts/campaignConsequence branches are unchanged.
2. Claim the capture with a short SQL lease, compare state+attempt counter, then release the transaction. An expired lease is reclaimable; at most 3 finite materialization attempts; retries and duplicate Temporal/outbox notices never create another G. CAS I/O occurs after all SQL transactions are closed. The existing campaignConsequenceWorkflow (30s Activity today) remains the worker route; timeouts must be bounded or explicitly adjusted and tested without a new Temporal workflow.
3. Read each passage CAS object by frozen contentHash and verify actual bytes/hash, envelope documentId, kind, revision and coverage. Reconstruct inline passages from their captured content. Call loadCanonicalKnowledge with captured root.hash/revision, captured ruleSections, empty campaign document IDs and captured anchor recall cues; root null means no canonical knowledge. Hash/verifier failure must not synthesize prose or silently downgrade to an empty knowledge set.
4. Assemble exactly contextInputSchema from copied narrative, ordered evidence, derived active-scene scope, copied items/world/commitments/access, campaign settings/time, selected and projected resolution; use existing prepareAdmittedStorytellerTask with frozen profile/execution/usagePolicy. Run existing context/request/recipe envelope limits. Capture request SHA-256 from the final prepared request plus source/recipe identity, **excluding capturedAt**, and pin this identity once before any possible transport.
5. In a short story-lock transaction, recheck one G, one story_resolution reservation, ownership, live source passage/revision/root/scene, game-action state and exact receipt if settled. This is a **staleness/eligibility check, not a new mutable prompt-context read**. Atomically promote generation.kind to storyteller.profiled.v1 and generation.input to the complete storytellerTaskSchema, leaving its id/state pending; mark capture ready/request hash; enqueue existing storytellerTopic keyed by G. The existing generic Storyteller runtime and its budget/dispatch gates now take over. The prepared task's source remains the existing pending-consequence source shape.
6. If settlement races a still-provisional G, its existing publish-prepared follow-up must **not** enqueue storytellerTopic prematurely. Inside settlement's story lock, route that wake to campaignConsequenceTopic for G's same operationId; if G is already promoted, route to storytellerTopic for G. The materializer always emits storytellerTopic after successful promotion. No second outbox topic or Temporal coordinator.
7. Retry only **confirmed unsent** immutable materialization failures, using the same G and the existing finite worker retry controls. A CAS missing/unavailable failure holds if the bounded attempts are exhausted. A provider attempt that may have left the process is NEVER considered a materialization retry.

### Stage 3: short story-lock publication or stale/blocked refusal

Preserve publication.ts and the existing staged immutable output CAS commit. For captures with a companion row, require:

- generation.kind=storyteller.profiled.v1, task.task=pending-consequence and source.executionId/capture.operationId/source.passageId/source.revision/targetGameSecond/projectedStateDigest match exactly; generation.id=story_resolution.generationId=execution.preparationGenerationId=receipt.generationId=G;
- current owner, base passage id/sequence, narrative revision, root hash+revision and frozen active-scene anchor match; under the short lock reselect the bounded passage rows and compare their SQL id/sequence/contentDocumentHash or inline content/decoded response to frozen sourcePassages, without reading CAS; also reject unexplained changes to story.premise, continuityNotes, storyteller profile or execution selection. Invalid source yields **stale**, no forced merge or automatic second paid job;
- current campaign settings revision and relevant scene/world/item/commitment dependencies remain valid, **except for explicitly expected action-settlement mutations**. The character/storyFacts/gameSecond comparison after settlement uses actionProjectedStateDigest and the captured projected digest, **not** the pre-action character/world snapshot; the pre-action offer clearing and activeActionOperationId release are expected transitions, not false staleness;
- game_action_receipt is settled, exact operation/offer/base revision/outcome/roll/effects/declarations match acceptedPendingResult and game_action_execution; no result while receipt absent;
- staged root remains based on the frozen root and passes commitStagedStoryPublication's CAS. Never run external DocumentStore reads inside publication lock.

If receipt does not yet exist, leave publication pending/private, not published or stale merely for lateness. Settlement's existing hold ownership must transfer to a single G storyteller hold, then publication transfers it to the new decision hold. On stale/held/blocked after settlement, keep a visible/actionable hold, not a phantom playable scene. Avoid converting any pre-existing old storytellerTaskSchema task to a capture.

### Failure/disposition table

| Fault | Pre-dispatch outcome | After confirmed/possible paid transport |
| --- | --- | --- |
| Missing/transient CAS / object-store timeout | Retry same immutable capture with existing bounded worker policy; after max attempts, held:missing_source; no fallback prose | No source re-read to mutate paid request; cannot auto-redo paid attempt |
| Hash/envelope corruption or selected source mismatch | blocked:corrupt_source or blocked:source_mismatch; no provider call | Block publication, investigation only |
| Capture or final message over budget | Stage 1 capture_too_large rejects new admission before commit; Stage 2 context_too_large holds accepted action; no paid call | Never silently trim required evidence and retry new paid task |
| Changed root, active scene, base passage or settings | stale_source; no provider if pre-dispatch | stale publication, do not overwrite current story |
| Valid receipt absent while preparation ready | Keep private pending, one generation G | Same G can publish after settlement if still valid |
| Mismatched settlement receipt/projected digest | blocked:receipt_mismatch; no controlling publication | Existing spend recorded; no second automatic generation |
| Confirmed unsent provider attempt | Existing explicit recovery policy may retry same identity if allowed; no automatic new G | N/A |
| Uncertain send, lost ACK, running transport | Existing generation/budget uncertain; inspect/reconcile, never assume unsent | Stop automatic paid retries; hold/manual recovery |
| Expired materialization worker lease | Reclaim G, bounded attempts, no CAS under DB lock | Provider dispatch belongs only to promoted generation, never capture lease |
| Interrupted finite action | Mark G ineligible under story lock; only if proven no paid/uncertain attempt may atomically retire the old controlling reservation and install the **existing** post-interruption consequence intent under its unique base owner | If spend confirmed/uncertain: quarantine G and hold for explicit owner recovery; never two controlling story_resolution rows or auto-second charge |

A stale/blocked generation cannot be revived merely by redelivering an old outbox item. A later user-authorized recovery decision is a separate, explicit operation.

## Provider-free speculative settlement race matrix

Use deterministic scripted Storyteller, local CAS with injected delay, disposable Postgres, two concurrent workers, controllable settlement clock and fake provider that **fails if invoked**. Inspect the database identity rows, not only returned HTTP status.

| Schedule / negative case | Winning controlling identity | Allowed follow-up / required assertion |
| --- | --- | --- |
| Stage 1 -> Stage 2 promotes -> scripted result ready -> settlement | G always | No pre-receipt publication; settlement links receipt.generationId=G, emits existing storytellerTopic wake, publishes at most once |
| Stage 1 -> settlement before any CAS load -> Stage 2 | G always | Settlement keeps G and routes to campaignConsequenceTopic if provisional; Stage 2 promotes G and emits storytellerTopic; **no** campaignConsequence or H |
| Stage 2 lease active -> settlement -> Stage 2 completion | G always | CAS reads off-lock; settlement waits only for short lock, not injected read delay; one promoted generation, one receipt, one resolution |
| Two materialization workers + duplicate outbox deliveries | G always | At most one lease/promotion/task/request hash and one dispatch identity, no duplicate charge |
| Missing CAS before settlement, then settlement, CAS restored | G always | Remains held or same G retries according to bounded attempts; settlement receipt unchanged; no fabricated narrative |
| Root/scene altered during CAS load or before publication | G is retained but ineligible/stale | No controlling publish, no rebased task and no automatic second paid G/H |
| Receipt outcome or projected digest differs | No speculative publication | Block and retain forensic G; never invent equivalence or reroll |
| True interruption before provider send | Atomically release ineligible G's controlling reservation **only with proven unsent status**; existing interruption/consequence identity H may take control | Install existing campaignConsequence intent + hold in same lock; never simultaneous G and H controlling resolutions |
| Interruption or stale scene after confirmed/uncertain provider send | G tombstoned/ineligible, no automatic H | Hold/manual recovery, no hidden second spend |
| Old inputVersion 10–16 full pending-consequence generation with no capture row | Legacy generation's own identity | Current task parser/worker/publication semantics still work; zero migration/backfill |

**Invariants to assert transactionally:** unique story_resolution for (storyId,basePassageId,baseRevision) at every committed boundary; no campaignConsequence on that base while G owns it; no second game_action_receipt or reroll; generation.attemptId absent before promotion; capture request hash remains stable across replay; no paid transport or cloud integration in tests. Capture and task authority must be independent of capturedAt and any mutable current-source reads after Stage 1.

## Readiness, proof and permitted scope

**ENG03-narrow is Ready when:** (1) Cursor's latest working tree is re-inspected against these exact symbols, including SA03 and any v17 shift; (2) capture shape/field provenance above is kept strict, with no unknown; (3) provisional generation + additive capture row/unique IDs and outbox routing are implemented only for pending-consequence; (4) the three stages and unsent/uncertain/hold gates are tested; (5) provider-free races above pass on an explicitly disposable database; (6) a 0/250/2000ms regression repeats and proves CAS time moved **outside** the story lock; (7) existing old generations still parse/publish; (8) the owner explicitly selects and authorizes the narrow Change. No benchmark number, test pass or v17 compatibility is claimed merely by this design.

Likely code owners: application/campaign/{actions,narration,action-executions,follow-up-intents}.ts; application/storyteller/{context,canonical-knowledge,publication}.ts; new application/storyteller/{context-capture,capture-materialization}.ts; application/stories facade for existing prepareCampaignConsequence wiring; db/schema/storyteller.ts plus **additive** migration; focused application tests and optional worker contract test for existing outbox routing. Only touch worker Temporal activity timeout if the 30-second existing consequence activity demonstrably cannot bound this capture and a same-workflow adjustment is tested. Do not edit general Storyteller task union, original generation protocol, provider pricing, new UI, cloud settings, action rules or full ENG03 unless a demonstrable contradiction is escalated for owner decision.

**Version note:** GitHub main at inspection still builds storyteller.v16 while owner's SA handoff reports v17 and Done SA modules. The contract is fully specified against verified main, but Ready on a newer worktree requires a schema/owner diff check, not a blind assumption of identical runtime.
