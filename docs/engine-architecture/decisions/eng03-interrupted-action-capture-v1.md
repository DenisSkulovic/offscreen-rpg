# ENG03-C2 | Interrupted finite-action context capture V1

**Status:** purpose-specific technical contract selected for proposed Change, 2026-11-15; **not implemented or code-authorized**. **Scope:** only the `action-interrupted` consequence caused by `required-item-holder-changed`, **not** a controlling world-obligation interruption. **Prerequisite:** retain ENG03-narrow/C1 one-generation capture mechanism and close/verify [C1 recovery policy](eng03-provisional-recovery-v1.md) independently.

## 1. Why this purpose is different

On current main (8b7157f, 2026-11-14), `campaign/action-executions.ts::settleActionExecution` records `gameActionExecution.state='interrupted'` and a specific `gameActionExecutionEvent(kind='interrupted')`. When a required item is no longer held, it creates a `campaignConsequence` with a strict `receipt.kind='action-interrupted'` and transfers the campaign into a Storyteller-intent hold. It does **not** create a successful `gameActionReceipt` and explicitly rejects speculative `preparationGenerationId`.

The later `campaign/narration.ts::admitActionInterruptedNarration` currently reads `loadStorytellerContext` and DocumentStore under story `FOR UPDATE`, then issues an ordinary `consequence` Storyteller task containing a **deterministic failure explanation**. The interrupt is a **committed negative event**, neither a speculative pending consequence nor a completed success receipt. Copying the C1 receipt DTO would falsely imply a settled success.

**Expected user truth:** "The accepted transfer could not complete because the required item was no longer available." The attempt remains an interruption. No outcome reroll, invented transfer, item duplication, backdated success, refund or generic penalty is permitted.

## 2. Strict private DTO and source table

Add `InterruptedActionContextCaptureV1` as a third strict application-private variant. Keep existing `ContextCaptureV1` and `CommittedActionContextCaptureV1` unchanged. Existing public `storytellerTaskSchema` and generation input compatibility remain unchanged.

~~~ts
type InterruptedActionContextCaptureV1 = {
  version: 1;
  captureId: UUID; // == G == generation.id
  storyId: UUID;
  ownerId: string; // server-owned
  purpose: 'consequence';
  sourceKind: 'action-interrupted';
  operationId: UUID; // == campaignConsequence.operationId == executionId
  passageId: UUID;
  narrativeRevision: PositiveInt;
  root: FrozenRootV1; // exact hash/revision pair
  sourcePassages: readonly FrozenPassageV1[]; // existing ordered CAS/inline envelope
  activeSceneScope: ActiveSceneAnchor | null;
  narrative: { premise: Premise; notes: ContinuityNotes };
  canonicalSelection: { ruleSections: LibrarySectionSelection; campaignDocumentIds: [] };
  actorAndWorld: {
    character: Character; // committed post-interruption state
    storyFacts: StoryFacts;
    gameSecond: NonnegativeInt; // must equal event's gameSecond
    itemHolders: StoryItems; // same bound as existing context
    worldConditions: WorldConditions;
    activitySituation: ActivitySituation; // exact context.ts projection, bounded
    postInterruptStateDigest: SHA256; // canonical {character, storyFacts, gameSecond}
  };
  settings: {
    revision: PositiveInt;
    capturedSettings: CampaignSettings;
    profile: StorytellerProfile;
    execution: ExecutionPolicy;
    effectiveUsagePolicy: EffectiveUsagePolicy | null;
  };
  selected: { id: UUID; label: string; intention: string };
  interruption: {
    kind: 'action-interrupted';
    cause: 'required-item-holder-changed';
    executionId: UUID;
    executionRevision: NonnegativeInt;
    eventId: UUID;
    eventGameSecond: NonnegativeInt;
    offerId: UUID;
    actionKey: string;
    itemKeys: readonly string[]; // 1..50 unique, exact positive transfers
    executionOffer: Offer; // validated frozen execution.offer
    executionPlan: ImmediateActionPlan; // validated frozen execution.plan
    factualText: 'The accepted transfer could not complete; the required item was no longer available';
    // No successReceipt, no roll, no effects, no declarations.
  };
  capturedAt: ISODateTime; // diagnostics only, not prompt authority
};
~~~

**Notation:** `UUID`, `FrozenRootV1`, `FrozenPassageV1`, `Character` etc. denote the **existing strict Zod schema types**, not new generic runtime interfaces. At implementation, reuse/export the exact pending/C1 nested validators and source capture collector rather than copy/paste shape implementations. Every stored object must have a `z.strictObject` validator and bounded strings/arrays; reject unknown keys, oversized capture (>256 KiB), missing required passages and invalid root/hash pairs. The upper-bound of source passages is the existing captured frontier (currently max 87), not a new whole-history scan.

**A discriminant pitfall:** current `parseContextCapture` switches only on `purpose`, and `contextCapturePointerSchema` discriminates on `purpose`. The new C2 and C1 both have `purpose='consequence'`. Refactor that **private** registry to parse a strict tuple (`purpose,sourceKind`), with an explicit exhaustive switch or narrow nested union. Do not add two same-`purpose` cases to a flat `z.discriminatedUnion('purpose', ...)`, and do not use passthrough objects. Old persisted C1 and pending pointers must decode unchanged. The same switch must route materialization and publication.

### Frozen facts and exact owners

| Field group | Existing authoritative source under Stage 1 lock | Recheck / non-authority |
| --- | --- | --- |
| G, owner/story/base | `story` locked by `lockStoryById`; `storyPassage` at exact current revision; `campaignConsequence` row | G reserved once; current base must match intent.passageId / baseRevision; one controlling storyResolution |
| Interrupt receipt | `campaignConsequence.receipt` validated with existing `consequenceReceiptSchema` | Must be `action-interrupted`, operationId = executionId = intent.operationId, immutable parsed copy |
| Execution | `gameActionExecution` for operationId | state interrupted, same story/base/offer/action key, exact revision, `preparationGenerationId=NULL`; saved offer/plan validated, finite action with positive item transfers |
| Interrupt event | `gameActionExecutionEvent` by receipt.eventId | same execution/story/revision, kind interrupted, gameSecond = receipt.gameSecond; unique event, not "some latest event" |
| No successful outcome | `gameActionReceipt` by operationId | **Must be absent**. Do not substitute a null roll into a fake success receipt |
| Item cause | saved plan's positive item transfers, `receipt.itemKeys`, captured item holder rows | Exactly those transfer keys; a required current holder mismatch must be supported by post-interrupt state/event. Do not re-evaluate the action or permit completion |
| Actor/world/time | `campaign.character/story_facts/game_second/world_conditions`; authorized activity projection, `story_item` registry | Freeze **post-interruption** values with digest; match interruption event's gameSecond |
| Narrative evidence | `story_passage` ordered ID, sequence, hash or inline body, `story.premise/continuity_notes/active_scene_scope` | Stage 2 reads only frozen immutable hashes; no fresh live prompt facts |
| Profile, rules, funding | `campaign_settings` at settings revision, `story.storyteller/execution/usage_policy`, exact canonical rule selection | Freeze current admitted policy; live dispatch authority can only tighten, never reauthorize |
| Hold | campaign Storyteller-intent hold owned by original operation | Transfer to same G atomically; do not release prematurely |

**Do not invent an extra interrupt type.** If the reason is `controlling-world-obligation`, that path is owned by `fireWorldObligations` and belongs to the later world-obligation migration. It is not a `campaignConsequence.action-interrupted` row in this source.

## 3. Stage-1 / Stage-2 / Stage-3 ownership

### Stage 1: reserve one G with SQL only

Entry remains `campaignConsequenceTopic` with operationId. In `createConsequenceNarration`, Stage-2 capture reentry is checked before creating anything. On an uncaptured C2 intent, use an **unlocked story-ID preflight** followed by **story lock → consequence row lock → execution/event/campaign inspection**. Confirm no conflicting `storyResolution` owns the base and the original storyteller-intent hold is present. The existing unique `campaign_consequence_base` is preserved.

Within **one transaction**: freeze/validate strict C2 DTO and SHA, insert provisional `generation(G,kind=storyteller.context-capture.v1,pending,pointer)`, `storytellerPublication(G)`, `storyteller_context_capture(captureId=G,operationId=intent.operationId)`, exactly one `storyResolution(G)` using existing committed-consequence submission, link `campaignConsequence.generationId=G`, transfer hold from operation to G, and write a **new notice ID** on existing `campaignConsequenceTopic`. The worker's original notice being ACKed is not proof Stage 2 will succeed. Preserve existing viewVersion increments. Any validation failure before reservation rolls back **preparation only**, never the already committed interruption event/time/state; provide an explicit same-operation re-enqueue recovery, no silent loss.

### Stage 2: materialize off-lock

`materializePendingActionCapture` remains the shared capture-first handler (name can be adjusted only if warranted). Claim the existing bounded lease by operation ID. Validate C2 pointer + hash. Load the **frozen** CAS passage envelopes and canonical root by captured SHA outside the story transaction; no mutable `latest` SQL. Build the ordinary `task='consequence'` via existing `contextInputSchema`/`prepareAdmittedStorytellerTask`:

- `source` = captured story, passage and revision.
- `selected` = original operationId, label and intention.
- `resolution` = frozen post-interrupt character, storyFacts and gameSecond; `offer:null`; exactly one factual receipt `{id:executionId,text:factualText,roll:null,effects:[],declarations:[]}`.
- `profile` / `execution` and bounded canonical evidence come from capture. Never insert an invented successful game receipt or use a current campaign offer.

Then under a short lock validate all Stage-3 preconditions that are necessary before promotion; change **the same G** to ordinary `storyteller.profiled.v1` only after task schema validation; update capture state `ready` and request SHA; enqueue **existing `storytellerTopic`**. Stage 2 must not create G2, reroll, re-award or spend provider money. Missing CAS is held/blocked using C1 policy. A stale root or actor is not an invitation to reconstruct prompt from current state.

### Stage 3: exact interrupt publication

Extend the existing `publication.ts` capture companion fence for `task='consequence'` to branch on `sourceKind`. For C2 require capture state ready/SHA, task source, owner/root/scene/notes/profile/execution match, single G controlling `storyResolution` and `campaignConsequence`, original receipt equality, saved execution still interrupted with exact revision and no preparation generation, matching interrupt event, absent `gameActionReceipt`, and frozen post-interrupt actor/time digest. If a relevant current-source fence moved, **stale/hold without publishing**; do not silently narrate success or publish a choice on obsolete scene. Reuse existing publication/receipt/content-root CAS and uniqueness gates. Historical read-only reports follow a different contract, later.

**Do not require a currently blocked item forever.** The event and cause were committed at interruption; a subsequent correction of item possession is not an excuse to pretend the original action succeeded. Current actor/scene eligibility still controls whether a *new controlling scene* can safely publish.

## 4. Real evidence required before Ready/Done

- **Reproduction first:** instrument the current C2 `loadStorytellerContext`/DocumentStore under `FOR UPDATE` with injected 0/250/2000ms CAS delay and a genuine same-story writer; report measured hold/wait, not borrowed pending-consequence numbers. If latest source already avoids lock-held CAS, cancel the migration.
- **Schema/pointer replay:** C1 and pending old captures and legacy generations parse; corrupt/malformed C2 and misleading same-purpose pointer fail closed.
- **Normal interrupt:** item holder changes during admitted transfer; one interrupted event, zero success receipts, zero item transfer, one C2 capture/G, one factual consequence, no invented roll/effects, correct recorded fictional time.
- **Race and bad input:** duplicate notice/workflow, two workers, expired lease, changed root/scene/actor, mismatched event ID/revision/cause/item keys, stale intent, forged successful receipt, provisional G that is not yet promoted, malformed CAS and settings policy tightened. None may issue duplicate G or story advancement.
- **Lock proof:** CAS delay outside SQL lock after migration, preserve legitimate hold conflicts; provider-disabled deterministic integration and disposable DB only with separate authorization. No paid generation.

## 5. Non-goals and authorization

No C1 redesign, no speculative pending consequence, activity/world-obligation/report/continuation/opening migration, no new Temporal workflow, new scheduler/LLM tool, universal interrupt taxonomy, mechanics or time rule alteration, provider spend, production deployment or schema-breaking backfill.

**Next bounded execution packet:** [ENG03-C2](../../changes/2026-11-15--eng03-c2-interrupted-action-capture/CHANGE.md). **Gate:** owner chooses this packet, source is rechecked, C1 provisional recovery either closed or its interactions explicitly tested, and the C2 lock measurement confirms there is a real problem worth migrating.
