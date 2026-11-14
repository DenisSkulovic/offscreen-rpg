# ENG03-C1 | Typed committed finite-action receipt capture V1

**State:** implementation-grade **conditional design**, 2026-11-14. **No code authorized yet.** First sequel to [pending-consequence ContextCaptureV1](eng03-narrow-capture-v1.md). Its actual implementation is owner/Cursor-reported Done but not currently visible on GitHub main (adb118f2dc); this contract uses verified main call sites and names, and explicitly requires latest-tree preflight. Source selection and recovery implementation must reuse the **actual shipped narrow capture machinery**, not this document's assumptions about new private helper names.

**Single purpose:** committed consequence from a **settled finite gameActionReceipt with no earlier speculative generation**. Entry is campaign/narration.ts::createConsequenceNarration -> admitActionNarration, triggered by existing campaignConsequenceTopic / operationId. Keep activity, world-obligation, interrupted, continuation, opening and reports untouched.

## 1. Exact semantic contract

New strict purpose-specific DTO: **CommittedActionContextCaptureV1**. Do not change the preexisting pending ContextCaptureV1 fields or the public Storyteller task union. The new variant may live alongside the pending variant in application/storyteller/context-capture.ts or a nearby narrow module. The existing private capture registry/schema must discriminate on purpose (and sourceKind when needed) without using an unbounded JSON passthrough.

The following Zod outline intentionally names only verified existing schemas; the two private application schema exports (activeSceneAnchorSchema and librarySectionSelectionSchema) are already selected in the previous ENG03-narrow **design** and must be located/reused from its actual Cursor implementation. The older main had those declarations private in storyteller/context.ts and storyteller/canonical-knowledge.ts.

~~~ts
import { z } from 'zod';
import { campaignSettingsSchema } from '@offscreen/contracts/campaign';
import { effectiveUsagePolicySchema } from '@offscreen/contracts/usage-policy';
import {
  passageContentSchema,
  storyItemsSchema,
} from '@offscreen/contracts/stories';
import { characterSchema, storyFactsSchema } from '@offscreen/game/state';
import { worldConditionsSchema } from '@offscreen/game/world-obligations';
import { offerSchema } from '@offscreen/game/offers';
import {
  immediateActionPlanSchema,
  storyFactDeclarationsSchema,
} from '@offscreen/game/immediate-actions';
import { outcomeEffectsSchema } from '@offscreen/game/effects';
import { rollSchema } from '@offscreen/game/checks';
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
import { actionProjectedStateDigest } from '../campaign/action-overlap';

const uuid = z.uuid();
const sha = z.string().regex(/^[a-f0-9]{64}$/);
const positiveRevision = z.number().int().positive();
const gameSecond = z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER);

// Same source representation/ordering as pending consequence. In an actual
// merged codebase, import the equivalent exported strict schema and do not
// fork its semantic checks.
const sourcePassageCaptureV1Schema = z.discriminatedUnion('storage', [
  z.strictObject({
    storage: z.literal('cas'),
    passageId: uuid,
    sequence: positiveRevision,
    contentHash: sha,
    inlineContent: z.null(),
    response: z.string().max(2000).nullable(),
  }),
  z.strictObject({
    storage: z.literal('inline'),
    passageId: uuid,
    sequence: positiveRevision,
    contentHash: z.null(),
    inlineContent: passageContentSchema,
    response: z.string().max(2000).nullable(),
  }),
]);

// Only the exact immutable receipt inputs used by admitActionNarration.
// generationId is intentionally NOT frozen: it must change from null to G
// inside Stage 1. createdAt is trace metadata, not narration authority.
const committedActionReceiptCaptureSchema = z.strictObject({
  operationId: uuid,
  storyId: uuid,
  offerId: uuid,
  actionKey: immediateActionPlanSchema.shape.key,
  baseRevision: positiveRevision,
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

const rootCaptureSchema = z.union([
  z.strictObject({ hash: z.null(), revision: z.literal(0) }),
  z.strictObject({ hash: sha, revision: positiveRevision }),
]);

export const committedActionContextCaptureV1Schema = z.strictObject({
  version: z.literal(1),
  captureId: uuid,                        // SAME reserved generation G
  storyId: uuid,
  ownerId: z.string().min(1),            // story.ownerId, never client input
  purpose: z.literal('consequence'),
  sourceKind: z.literal('action-receipt'),
  operationId: uuid,                     // receipt.operationId; not G
  passageId: uuid,
  narrativeRevision: positiveRevision,
  root: rootCaptureSchema,
  sourcePassages: z.array(sourcePassageCaptureV1Schema).min(1).max(87),
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
    character: characterSchema,          // committed post-settlement
    storyFacts: storyFactsSchema,        // committed post-settlement
    itemHolders: storyItemsSchema,       // <= 50 key/label/holderKey
    worldConditions: worldConditionsSchema,
    activitySituation: contextInputSchema.shape.activitySituation.unwrap(),
    gameSecond,                          // committed post-settlement
    postSettlementStateDigest: sha,      // existing digest helper
  }),
  settings: z.strictObject({
    revision: positiveRevision,
    capturedSettings: campaignSettingsSchema,
    profile: storytellerProfileSchema,   // story.storyteller
    execution: executionPolicySchema,    // story.execution
    effectiveUsagePolicy: effectiveUsagePolicySchema.nullable(),
  }),
  selected: z.strictObject({
    id: uuid,
    label: immediateActionPlanSchema.shape.label,
    intention: immediateActionPlanSchema.shape.intention,
  }),
  acceptedReceipt: committedActionReceiptCaptureSchema,
  capturedAt: z.iso.datetime(),          // tracing only; never in provider input
}).superRefine((v, ctx) => {
  const issue = (path: (string | number)[], message: string) =>
    ctx.addIssue({ code: 'custom', path, message });
  const r = v.acceptedReceipt;
  if (v.operationId !== r.operationId ||
      v.storyId !== r.storyId ||
      v.narrativeRevision !== r.baseRevision) {
    issue(['acceptedReceipt'], 'Committed receipt and source identity mismatch');
  }
  if (r.offer.id !== r.offerId || r.plan.key !== r.actionKey) {
    issue(['acceptedReceipt'], 'Receipt offer/plan identity mismatch');
  }
  if (!r.offer.nodes.some(n => n.id === r.actionKey && n.action !== null)) {
    issue(['acceptedReceipt'], 'Receipt plan not a selected offer action');
  }
  if (v.selected.id !== v.operationId ||
      v.selected.label !== r.label ||
      v.selected.intention !== r.intention) {
    issue(['selected'], 'Selected receipt projection mismatch');
  }
  if (v.settings.capturedSettings.revision !== v.settings.revision) {
    issue(['settings'], 'Campaign settings revision mismatch');
  }
  if (v.settings.execution.mode === 'provider' &&
      (!v.settings.effectiveUsagePolicy ||
       v.settings.effectiveUsagePolicy.route !==
         v.settings.execution.policy.route)) {
    issue(['settings'], 'Missing/mismatched provider funding authority');
  }
  if (v.actorAndWorld.postSettlementStateDigest !==
      actionProjectedStateDigest({
        character: v.actorAndWorld.character,
        storyFacts: v.actorAndWorld.storyFacts,
        gameSecond: v.actorAndWorld.gameSecond,
      })) {
    issue(['actorAndWorld'], 'Committed state digest mismatch');
  }
  const orderedPassages = v.sourcePassages;
  const ids = orderedPassages.map(p => p.passageId);
  const sequences = orderedPassages.map(p => p.sequence);
  if (new Set(ids).size !== ids.length ||
      new Set(sequences).size !== sequences.length ||
      sequences.some(s => s > v.narrativeRevision)) {
    issue(['sourcePassages'], 'Duplicate passage or future source sequence');
  }
  const frontier = orderedPassages.find(
    p => p.sequence === v.narrativeRevision,
  );
  if (!frontier || frontier.passageId !== v.passageId) {
    issue(['passageId'], 'Current passage missing from captured frontier');
  }
  const required = [
    ...v.narrative.notes.flatMap(n => n.sources),
    ...(v.activeSceneScope?.requiredPassageIds ?? []),
  ];
  if (required.some(id => !ids.includes(id))) {
    issue(['sourcePassages'], 'Uncaptured required evidence passage');
  }
  if (v.activeSceneScope &&
      v.activeSceneScope.fromSequence > v.narrativeRevision) {
    issue(['activeSceneScope'], 'Active scene begins after source revision');
  }
  const topics = r.roll ? ['time', 'ability-check'] : ['time'];
  if (JSON.stringify(v.canonicalSelection.ruleSections) !==
      JSON.stringify(canonicalRuleEvidence(topics))) {
    issue(['canonicalSelection'], 'Invalid first-path rule evidence selection');
  }
  if (Buffer.byteLength(JSON.stringify(v), 'utf8') > 256 * 1024) {
    issue([], 'context_capture_too_large');
  }
});

export type CommittedActionContextCaptureV1 =
  z.infer<typeof committedActionContextCaptureV1Schema>;
~~~

**No unknown, any, passthrough, or copy-whole-campaign fields.** SQL-generated JSONB is parsed into the named strict schemas. The new capture intentionally does **not** add source.executionId to the compiled Storyteller task: the existing consequence task source schema remains {storyId,narrativeRevision,passageId}; the private capture row and storyResolution bind operationId/G.

**Local schema composition note:** duplicated definitions of sourcePassageCaptureV1Schema and rootCaptureSchema above are to make the packet readable without assuming Cursor's unpushed helper names. On the actual implementation, reuse the identical verified ENG03-narrow existing schemas; no separate validation dialect or v1-to-v2 reinterpretation. If reuse requires extracting a common base, it is an internal no-behavior-change refactor limited to sourcePassage/root/notes/selection helpers. Do not reparse a whole old pending capture with consequence semantics.

## 2. Exact physical source ledger

| Captured group | Existing owner and physical symbol | Under short lock | Stage-2 source |
| --- | --- | --- | --- |
| G, story/owner, purpose | new UUID G; story.id/ownerId via lockStoryById; generation.id; storyResolution.generationId | Reserve once, check owner from receipt/story (server-controlled), persist private typed capture | Exactly G, never a second generation |
| operationId, acceptedReceipt | game_action_receipt.operation_id,story_id,offer_id,action_key,base_revision,offer,plan,label,intention,outcome,outcome_text,effects,declarations,roll | Lock/check receipt, require generation_id **null**, parse receipt subset and copy. Assert no competing storyResolution on base | No mutable receipt reread for building prompt; Stage-2/3 may compare receipt identity + state under lock only |
| passageId/narrativeRevision | story_passage.id/sequence and story.revision | Copy existing current passage, require story.revision == receipt.baseRevision | Fence by id/sequence; do not use latest to assemble context |
| root | story.document_root_hash / document_root_revision | Copy paired hash/revision null/0 or hash/positive | CAS readManifest by frozen hash, verify campaignId/revision, never current alias |
| sourcePassages[] | story_passage.id,sequence,content_document_hash/content,response; same SQL recent+active+note-source selection in storyteller/context.ts | Copy bounded rows (recent desc + older evidence unique order); inline content deep copied, external content hash only. Normalize response via interactionSubmissionSchema.parse(response).answer.optionId | Read immutable content by hash; verify source envelope.documentId and coverage/sequence and content shape; no SELECT for prompt evidence |
| activeSceneScope | story.active_scene_scope, activeSceneAnchorSchema | Copy parsed stored anchor including fromSequence/requiredPassageIds/recallCues, or null | Derive contextInput active-scene.v1 through captured revision |
| narrative | story.premise / story.continuity_notes | Copy premiseContentSchema / continuityNotesSchema | Frozen prompt source, no mutable story read |
| actor & world | campaign.character / story_facts / game_second / world_conditions | Copy post-settlement character/storyFacts/time/worldConditions and computed actionProjectedStateDigest | context.resolution and world/time from frozen facts, no live campaign read |
| items | story_item.key/label/holder_key (context.ts) | Copy <=50 parsed storyItemsSchema | context.items from capture |
| activitySituation | campaign.situation_authorization.activityAccess / active_activity_id / accepted_activity_plan; game_activity plan/progress/state/revision; readAcceptedActivityPlan + projectActivityProgress | Freeze exact projection current context.ts returns: allowed commitments (max20), optional blocked accepted handoff, activeActivityId and activityAccess. Never copy raw history or preparedPlans | context.activitySituation from frozen projection |
| settings | campaign.settings_revision → campaign_settings(story_id,revision).settings | Copy parsed complete campaignSettingsSchema at exact revision | Derive storytellerCampaignSettingsSchema without time + projectWorldTime(settings.time, captured gameSecond) |
| model/funding | story.storyteller, story.execution, story.usage_policy | Copy parsed storytellerProfileSchema / executionPolicySchema / effectiveUsagePolicySchema or null | prepareAdmittedStorytellerTask; live dispatch authority only tightens/denies |
| canonical selection | canonicalRuleEvidence(receipt.roll ? ['time','ability-check']:['time']); empty campaign docs; anchor.recallCues | Freeze deterministic choice, no CAS | loadCanonicalKnowledge(storage,{storyId,rootHash,rootRevision,librarySectionSelection:ruleSections,campaignDocumentIds:[],recallCues}) |
| selected | receipt.operation_id,label,intention | Copy, cross-check plan key/offer | context.selected, no new user action |
| result receipt | receipt.outcome,outcome_text,roll,effects,declarations,offer; campaign.character/storyFacts/gameSecond | Copy authoritative settled values; no pending speculation/reroll | context.resolution: {character,storyFacts,gameSecond,offer:receipt.offer,receipts:[{id:operationId,outcome,text:outcomeText,roll,effects,declarations}]} |
| capturedAt | captured DB/app timestamp | ISO trace timestamp | Exclude from model context, digest and canonical story time |

**Explicit omissions:** game_action_receipt.generation_id is live routing, not a frozen pre-capture field; receipt.created_at is trace, not narrative. No game_action_execution.pending_resolution or sourceStateDigest (those belong to the speculative path); no campaign.current_offer as resolution.offer (must use saved receipt.offer); no raw campaign clock, anchor, pace, holds, full historical activities, all roll ledgers, raw campaign_settings.profile or future-scene choice document selections. No new player, actor, world-ECS or gameplay schema. A null root suppresses canonical knowledge; it **does not** suppress required CAS source passages.

## 3. Three stages and existing routing

### Stage 1: claim committed receipt, freeze SQL, reserve one G

- Entry: existing campaignConsequenceTopic notice has operationId = **receipt.operationId**. In createConsequenceNarration, **before** the existing early return for actionReceipt.generationId, look up the matching private capture row. If the receipt already belongs to an ordinary legacy or pending-consequence generation and has **no** new C1 capture, return/retain legacy behavior. Never convert existing tasks.
- Acquire story lock for receipt.storyId and lock receipt row in a consistent global lock order (story → receipt), avoiding new lock inversions. Check owner against story.ownerId; receipt already committed, plan/action/offer binding valid, receipt.generationId null, current.revision == receipt.baseRevision and its passage. Also assert the existing storyteller-intent hold for receipt.operationId, and no storyResolution currently owns the base passage/revision.
- Reuse ENG03-narrow's short-lock SQL snapshot function, but read **committed post-settlement** actor, world, activity and receipt. No DocumentStore calls. Parse committedActionContextCaptureV1Schema and bound 256 KiB. If validation fails **before a valid capture exists**, roll back this short preparation attempt only: the already committed receipt and storyteller-intent hold remain, and the existing worker must return a typed error and NOT acknowledge successful preparation. Do **not** pretend that a capture row in blocked state exists when no valid DTO could be persisted. Existing workflow failure/operational recovery is required; any new durable pre-capture failure ledger would need separate owner approval.
- Allocate G once. In same transaction insert provisional generation (kind storyteller.context-capture.v1; state pending; non-dispatchable pointer input), storytellerPublication, one storyteller_context_capture companion row with sourceKind action-receipt + strict versioned payload, one existing storyResolution with submission {kind:'committed-consequence',operationId:receipt.operationId}, and set gameActionReceipt.generationId=G. Transfer the **existing** storyteller-intent hold for receipt.operationId to the storyteller hold for G, using current holds helpers. Increment story view once as existing admitActionNarration did.
- Atomically enqueue another **campaignConsequenceTopic** wake for receipt.operationId with new outbox notice ID, so a process crash after reservation cannot strand Stage 2. Preserve existing Temporal campaignConsequenceWorkflowType; duplicate notices are safely idempotent. Never create campaignConsequence row for an action-receipt path; receipt itself is the durable request. No extra storyResolution row or alternate G.
- Under duplicate command/delivery: receipt.generationId=G and matching capture row → re-enter Stage 2 with the **same G**. Receipt.generationId set but no matching capture row → existing already-admitted generation; do not reclaim. A mismatched existing capture, reservation or operation is a hard conflict, never a new ID.

### Stage 2: off-lock immutable materialization; promote G

- Short DB claim of capture G via existing narrow bounded lease and attempt policy, then **end the transaction**. Reuse its retries and state categories, not a second executor. Stage 2 may be called in the same existing worker Activity after Stage 1 and/or by the durable duplicate wake. Its lease must prevent concurrent promotion; re-delivery after crash uses same immutable capture. No long DB transaction or provider call here.
- Read captured CAS passages by content hash. Verify object hash, schema, source-passage envelope, content, exact passage/sequence and visibility. Read captured manifest and canonical knowledge via frozen root and rule selection, not latest campaign pointers. Build exact contextInputSchema from copy; canonicalKnowledge optional iff root hash absent. Construct context.current, .evidence, .notes, .items, .worldConditions, .campaignSettings, .campaignTime, .activitySituation, .selected, .resolution from named frozen fields. **No mutable SQL SELECT used as prompt evidence**.
- Call existing prepareAdmittedStorytellerTask with task:'consequence', source:{storyId,narrativeRevision,passageId}, frozen profile, execution and policy; enforce context and provider-envelope budgets. Compute stable request+source/recipe SHA from actual compiled task and captured source (exclude capturedAt). Existing dispatch review/usage gates remain authoritative.
- Acquire brief story lock, confirm same receipt.operationId/generationId=G, same storyResolution reservation, owner, current passage/revision/root/activeScene and settings. Compare receipt fields against captured acceptedReceipt and verify current **model-affecting SQL** state against captured actor/world/item/activity projection (no CAS read). Changes during Stage 2 mean **stale/held**, not a fresh task for a different world. Do not flag the intentional Stage-1 storyteller hold transfer as staleness; holds are routing, not model context.
- Atomically change generation.kind from provisional to storyteller.profiled.v1 and input to validated storytellerTaskSchema with **same id G** and pending state; mark capture ready and request SHA, enqueue existing storytellerTopic(operationId=G). The Storyteller task is not visible/dispatchable before the kind+input promotion transaction commits. Do not change storytellerTaskSchema task union.

### Stage 3: publication of one committed consequence or stale refusal

- Reuse publication.ts::publishStorytellerResult's existing prelocked CAS staging plus short story-locked commit. For records with a C1 companion row enforce generation G, capture purpose/sourceKind, receipt.generationId, storyResolution.generationId, original receipt.operationId, source passage ID/revision, frozen root/hash/revision/scene, snapshot settings/actor/world state and authorization. Confirm receipt still matches captured outcome/roll/effects/declarations exactly; campaign.gameSecond/character/storyFacts hash matches captured post-settlement digest.
- The ordinary **consequence** result must remain scene v3 with next.kind=action-plans; use existing proposal validation, offer plans, notes, passage publication and storyteller hold-to-decision transition. **Never reapply the saved action's effects.**
- A changed root, narrative revision, active scene, receipt or model-affecting world/actor/commitment source must fail stale/blocked according to existing typed status policy. Keep any required storyteller hold from becoming a phantom decision/clock unlock; provide explicit recovery, not an automatic second paid job. Historical report semantics are unrelated.
- Existing generations with **no** capture row retain their old task parser/publication path, including older input/prompt versions; never backfill or rewrite their input.

## 4. Failure and cost taxonomy

| Case | Safe disposition | Forbidden behavior |
| --- | --- | --- |
| Receipt not settled/missing or generationId already belongs to other task | No C1 capture; return existing path or hard conflict | Fabricating a receipt; stealing legacy generation |
| Stage-1 malformed receipt, missing current SQL source, >256 KiB frozen capture | Roll back preparation TX only; receipt and existing storyteller-intent hold persist; typed worker failure (no successful ACK), manual/retryable recovery per existing workflow | Claim a blocked capture row was saved when DTO validation prevented creation; rollback settled game fact |
| Required CAS missing / object store transiently unavailable | Same G, bounded provider-free retry; then held:missing_source | Empty context fallback / reroll / new G |
| CAS hash, passage envelope or canonical root mismatch | blocked:source_mismatch (or corrupt_source) | Trust different bytes by path or latest hash |
| Stage-2 context/request too large or missing required evidence | held:context_too_large; no dispatch | Truncate required source and pretend success |
| Receipt, root, scene, settings, actor/items/commitments change during materialization | stale_source/held and no provider dispatch | Requery latest as model context, rebase silently |
| Duplicate worker / expired capture lease | Idempotent G claim; request SHA stable; at most one task promotion | Extra storyResolution or spending attempt |
| Provider attempt definitely unsent | Existing explicit same-operation recovery limits only | New paid task or fresh recipe without authority |
| Paid attempt confirmed or uncertain / lost ACK | Existing generation budget/attempt recovery; no automatic second paid request | Treat timeout as free retry |
| Publication stale after model response | Mark stale/blocked, preserve source/charge provenance and required hold | Publish wrong current scene, auto-regenerate paid output |

The only "settlement race" for C1 is between **receipt already committed**, Stage-1 reservation, Stage-2 lease, provider readiness and duplicate notices. Never add speculative pre-settlement handling to C1; the existing pending-consequence G owns that behavior. This reduces the number of state combinations substantially.

## 5. Provider-free race / negative matrix

Use disposable PostgreSQL + delayed LocalDocumentStore or mock S3; scripted task/fake provider that fails if called. Assert database rows and lock waits, not only successful API responses.

| Order | Required identity, receipt and publication result |
| --- | --- |
| One settled receipt -> Stage 1 -> Stage 2 -> scripted publish | receipt.generationId=G, captureId=G, generation.id=G, storyResolution.generationId=G, one story passage/offer; no receipt reapply |
| Two consequence outbox notices race before Stage 1 | Serialized story→receipt claim; one G, one capture, one storyResolution, one hold transfer |
| Stage-1 commits, worker crashes before CAS | Existing campaignConsequenceTopic recovery wake resumes **same** G; no new G; no lost intent |
| Two workers materialize same G with 2000ms injected CAS | CAS outside story lock; exactly one task promotion/sha/enqueue, legal same-story writer not blocked by document I/O |
| Receipt has prior pending-consequence G | C1 must not capture, mutate or reassign it; original G retains controlling row and post-settlement wake |
| Receipt references an ordinary legacy generation | C1 leaves existing old task/attempt and publication unchanged |
| Missing passage CAS -> retry before/after another valid story write | No invented prose; finite retries only; if source changed, stale refusal |
| Root/active-scene/settings/actor/item/commitment changes before promotion | No provider dispatch; held or stale with exact source evidence |
| Root/scene changes after paid success before publish | No controlling stale publish, no automatic second paid call; existing charge remains attributable |
| Valid source but compiled task > envelope | Held with context_too_large; no provider attempt |
| Duplicate publication wake after successful story publish | Idempotent single publication and offer; one decision hold; no second game receipt |
| Action receipt's generationId becomes nonnull between reads | No second generation or competing storyResolution; correct row/fence winner only |
| Recovery under uncertain/confirmed spend | Stopped/held until explicit recovery; same task/attempt identity and spend ledger |
| 0/250/2000ms latency baseline vs old path | DocumentStore delay no longer extends **same-story FOR UPDATE hold**; record real traces for C1 instead of assuming pending-path timing |
| Legacy report/opening/continuation and pending-consequence tasks | Decodable/publishable by original task schema; no migration or code path hijack |

## 6. Ready gate and source ownership

**ENG03-C1 may be marked Ready only after** the owner explicitly selects the Change and Cursor checks its **actual newest** ENG03-narrow implementation, validates that the private capture registry can add a strict consequence variant, confirms the exact table/worker/helper symbols, and shows no unmodeled source in admitActionNarration. Source reinspection must compare SA03 bounded activity / selective canonical loading, prompt v17 changes, new capture table and test behavior. Do not pretend main adb118f2dc includes them.

**Likely narrowly allowed source:** packages/application/src/campaign/narration.ts (receipt branch and Stage-1 hook); packages/application/src/storyteller/context-capture.ts and capture-materialization.ts (or actual shipped equivalents); storyteller/context.ts,canonical-knowledge.ts,publication.ts (only reusable readers/purpose gate); packages/application/src/campaign/holds.ts (only existing transfer); packages/db/src/schema/storyteller.ts (only additive capture-purpose check if actual physical row requires it); one additive migration **only if** required by actual shipped row; tests. Existing campaignConsequenceTopic/Storyteller Topic, existing worker and workflow remain. No code changes to game rules, action-executions, report, opening, continuation, providers, task union, Storyteller routing, cloud or UI.

**Completion requires:** focused provider-free action/receipt/duplicate/race suite, old-task decoder check, real 0/250/2000ms lock-versus-CAS timing, exact commands, source diff, and zero new provider spend. If Stage-2 execution cannot be bounded by the existing 30s consequence Activity, adjust its **existing** timeout only with explicit evidence and a focused test; don't introduce a workflow. Keep full ENG03 Proposed.
