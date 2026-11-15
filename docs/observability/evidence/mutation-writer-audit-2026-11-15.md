# Mutation-writer audit | Which historical facts survive each commit?

**Evidence class:** source inspection against GitHub `main` at commit `7e15db38`, 2026-11-15. **Scope:** application-owned gameplay, story, document, Storyteller, visitor and administrative persistence writers, informed by the repository's full tree and the named source files below. **Not** executable verification, exhaustive dynamic call tracing, a production data audit or proof that every indirect call has been enumerated. No provider/SQL/runtime action executed. Parent: [program](../README.md), [initial source inventory](current-source-inventory-2026-11-15.md), [desired evidence model](../technical/evidence-model.md).

## 1. Audit classification

- **A, authoritative append:** persisted in the same transaction as a business mutation (e.g. a receipt or immutable passage). It proves a fact, not necessarily the whole prior state.
- **M, mutable authority:** current row overwritten on transition (e.g. `campaign.character`). A later read alone cannot prove the old value.
- **D, derived projection:** useful convenience or public event; may exclude private facts or state changes.
- **C, immutable CAS:** source-addressed body/manifest, but only historical if the specific hash/revision is retained and linked at the right time.
- **O, operational:** outbox, Temporal, runtime logs and worker status; explains delivery/execution but not game truth.
- **U, unverified:** a helper/schema exists, but regular runtime capture, active call path or retention is not established by inspected source.

**Key invariant:** a UI-visible `story.viewVersion` is a *view invalidation version*, not an exhaustive state-event number. `story.revision` counts published narrative passage revisions, not all mechanics. GM05 `story_public_event.event_sequence` counts **selected player-visible developments**, not all private/quiet transitions. The three cannot serve as one universal replay frontier.

## 2. Story creation, fork and canonical document writers

| Writer / inspected source | Existing commit / identity | Current data class | What a historical replay still needs |
| --- | --- | --- | --- |
| `stories/initialization.ts::initializeStoryInTransaction` | Inserts `story`, first `story_passage`, initial `story_item`, optional `story_document_commit`; story ID idempotent; sources include opening G | A + M + C | **Genesis checkpoint** of complete relevant story/campaign/actor/settings; `sourceGenerationId` vs actual source package; recorded source/privacy perspective; no fake transition if idempotent re-entry |
| `stories/start.ts::createStoryStart` + `storyteller/start.ts` | Pre-stages immutable opening/start-package, then calls initialization in transaction; validates draft revision and candidate generation | C + A | Link exact reviewed draft/input/profile/manifest, Start operation and initialization to a genesis evidence event; staging not a committed story until SQL success |
| `stories/forks.ts::createStoryForks` | Source story lock; **currently only revision 1** and unstarted-safe state; copies first passage, items, campaign settings, campaign row; records forkedFrom IDs | A + M + C | Fork checkpoint must identify source frontier and remapped IDs; never inherit source paid-attempt ownership. The current limited fork must not be marketed as arbitrary historical fork |
| `stories/persistence.ts::insertContinuationPassage` | New passage sequence, transition ID, source generation, response/content/interaction; GM05 public passage event | A + D | Precise narrative commit position, original player response, used decision; passage alone does not include all actor/item/hold changes |
| `stories/continuation.ts::commitStoryContinuation` | Story lock, prior-transition idempotency, validates response and applies ordered item effects; passage/root/viewVersion committed | A + M + C | Atomic old/new item holders, item creation, source authorization, old/new scene/offer/active-scene and document root; one transition envelope spanning all affected tables |
| `stories/persistence.ts::applyStoryItemEffects` | Simulates full ordered item effect list, inserts/updates `story_item` only after validation; preconditioned holder transfer | M + source effect in passage | Record exact before/after holder and effect order under the **same story transaction**. A transfer's final holder does not prove who held it earlier |
| `stories/persistence.ts::restartActiveSceneAtPassage` | Updates mutable `story.activeSceneScope` | M | Old/new active-scene anchors, why restart, source passage ID/revision and actor |
| `stories/continuation.ts::commitStagedStoryPublication` | `story_document_commit` + `story` root hash/revision, `knowledge.index.v1` outbox | A + C + O | Immutable before/after manifest/root and staged object's custody; index wake is derived, not authoritative document commit |
| `stories/documents.ts::createCampaignDocuments` | Stages document bytes and new manifest outside story lock; inside short lock writes `story_document_commit` / root/version + outbox | C + A + M | Exact source request/hash, source doc revision/path/visibility and prior/new root; orphaned stage not presented as committed history |
| `campaign/state-documents.ts::projectCampaignStateFile / stageCampaignStateDocument` | Strict `campaignStateFileSchema` containing character, facts, activities, clock, holds, offer, world conditions; can put immutable `campaign-state` doc and manifest | **U / potential C** | **Do not assume periodic historic checkpoints are active.** We found the helper and schema, but no call in inspected likely story/campaign/publisher owners; verify complete call graph before treating it as operational. At most it shows a useful typed checkpoint shape |
| `stories/persistence.ts::advanceStoryView / incrementStoryViewVersion` | Updates `story.revision/viewVersion` and `pg_notify` in transaction | M + transient hint | New evidence sequence cannot be `viewVersion`: settings edits, partial progress, publication and other status updates have different semantics |

**Design conclusion:** starting with an existing `storyDocumentCommit` manifest chain is attractive for source reproducibility, but it is **not automatically a clock/character-state ledger**. A manifest has revisioned document versions; the game has a separate SQL authority frontier.

## 3. Campaign mechanical writers (highest priority)

| Writer | Actual transaction/authority | Existing persisted evidence | Capture gap and proposed boundary |
| --- | --- | --- | --- |
| `campaign/settings.ts::initializeCampaign` | Start initializes campaign and world obligations | Original campaign/settings revision and world obligation rows | Genesis mechanical snapshot and planned world obligations with source/visibility classification |
| `campaign/settings.ts::createCampaignSettings.update` | Owner story lock + idempotent `campaignCommand`; insert immutable `campaignSettings(revision)`; update mutable `campaign.settingsRevision` and `story.storyteller`; bump view | **Good** settings history (A) + current profile override (M) | Atomic field-level effective-config change (old revision/new revision, actor command, previous compiled storyteller profile); immutable prompt/source origin handled separately |
| `campaign/settings.ts::recordCampaignPaceChange` | Inserts new settings revision and updates mutable campaign pointer inside calling transaction | Settings snapshot and command (where caller saves it) | Pace authority/clock anchoring and real/fictional time as-of change; one transition across settings + clock |
| `campaign/actions.ts::createCampaignActions` | Story lock; validates offer/private plan, time/actor/current authority; branches finite action, process, resume; inserts execution/activity, records events, updates `campaign`, saves command | Command, `gameActionExecution` or `gameActivity`, some events, plan/offer | **Admission transition**: before and after active operation/hold/clock/offer/access; exact chosen plan, eligibility, source revision; no fake outcome at admission |
| `campaign/custom-intent.ts::createCustomIntentInterpretation` | Story lock; writes `custom_intent_candidate`/clarification; no canonical time/effects | Versioned candidate, normalized input, digest, public target handles, expiry | **Not a game transition.** Retain a privacy-governed candidate operation event with status/target/catalogue policy; never replay as committed action |
| `campaign/custom-intent.ts::createCustomIntentAcceptance` | Story lock; validates exact candidate, creates `gameActionExecution`, records start event, updates campaign, saves command, changes candidate status | Existing game and candidate evidence | Same finite-admission transition as authored actions, plus candidate source/hash; avoid double counting a command because it came from custom intent |
| `campaign/action-executions.ts::settleActionExecution` | Under calling story lock; waiting, settled or interrupted; inserts successful `gameActionReceipt` only on settled path; `gameActionExecutionEvent`; updates `gameActionExecution`/`campaign`; world effects/holds/followups | Strong A receipts/rolls/events, current M state | **Settlement transition**: before/after clock/character/storyFacts/activeAction/hold/world; actual RNG/receipt/source plan; for interruption assert **no success receipt** |
| `campaign/action-execution-controls.ts::createActionExecutionControls` | Owner story lock + control/command receipt; may settle due action before changing pause/pace; updates execution/campaign and events | Action revision/event, command, settings pace revision | One ordered transition for due settlement **then** control, with legal preconditions; avoid compressing them into an unexplainable status |
| `campaign/activities.ts::settleActivity` | Under calling story lock; can batch up to **24 process boundaries**; draws/records checks, updates `gameActivity.plan/progress/state/revision` and `campaign.character/clock/occurrences`; records selected lifecycle events | GameRoll + ActivityEvent + mutable activity/campaign | A **single SQL transaction may contain several logical boundaries**. Preserve an ordered per-boundary subledger/result, not only the final batch state, when each result materially changes story truth |
| `campaign/activities.ts::settleAcceptedPlanBoundary` | On completion, may update accepted plan and start next activity; revalidates permission/horizon; event added for successor | AcceptedPlan mutable, child activity/event | Record parent plan entry/cursor transition, next child ID, stop reason, exact held/no-autoplay fence |
| `campaign/controls.ts::createCampaignControls` | Owner lock; may settle activity first, then pause/resume/pace and update campaign/activity; saves command | Activity events + command + settings | Record control intent, old/new clock and holds, already earned progress and explicit no-progress interval |
| `campaign/accepted-plan-controls.ts::createAcceptedPlanControls` | Owner lock + idempotent command; updates future plan entries cancelled, view | Command + current accepted plan | Before/after entries, cancelled future steps; **current activity is not retroactively undone** |
| `campaign/holds.ts::holdCampaignForStorytellerIntent / transitionStorytellerIntentToGeneration / transitionWorldObligationHoldToGeneration / transitionStorytellerHoldToDecision / consumeCampaignDecisionHold` | Called under game/publication transaction; updates mutable `campaign.holds` | Hold state indirectly in current campaign and linked operation/G | **Capture every meaningful hold ownership transfer** with old/new holder, reason, source G/operation, game time, no separate extra gameplay commit |
| `campaign/world-obligations.ts::fireWorldObligations` | Under story transition; updates obligation `pending→fired`, writes world event(s), modifies conditions/holds, optionally creates controlling consequence, public event and outbox | A `worldObligationEvent`, current M world/holds, D public event | One atomic group with **ordered obligations**, old/new condition, current clock, exactly one controlling source; historical report is different time axis |
| `campaign/world-obligation-controls.ts::createWorldObligationControls` | Owner story lock and command; updates obligations and world-event row; bumps view | Command and world event | Created/changed/cancelled obligation lifecycle, actor, effective settings, source plan and deadline; no hidden future source leaked to player replay |
| `campaign/follow-up-intents.ts::applyCampaignFollowUpIntents` | Called *inside* mechanics transaction; transitions hold or enqueues consequence/Storyteller work | Outbox notice, G/hold refs | Preserve **cause edges** from committed receipt/interrupt/event to topic/operation; outbox delivery is not result |
| `campaign/narration.ts::requestConsequenceNarration / requestActionNarration / createConsequenceNarration` | Saves consequence intent/outbox and later claims under story lock; delegates pending/C1/C2 capture or activity/world path | `campaignConsequence`, `storyResolution`, G, existing outbox | Separate **intent/request** vs **capture reserved** vs **promoted/published**. Never merge these into one “model ran” event |
| `campaign/reports.ts::requestHistoricalReport / requestActivityReport / requestWorldObligationReport` | Builds source-frozen historical report task and inserts `campaignReport` | Report hook/source event/time, G, task | Report may publish **after** current scene advances; do not attach it to a new controlling scene or a stale current-state checkpoint |

**Specific uncovered risk:** `settleActivity` can process several boundaries in one SQL transaction; a naive “snapshot once after each transaction” preserves final truth but cannot show intermediate rolls, income/condition changes or stop decisions in causal order. The proposed capture needs **ordered subevents** in one atomic transition group.

## 4. Storyteller, spending and control-plane writers

| Writer | Existing durable state | Additional forensic event / rule |
| --- | --- | --- |
| `storyteller/context-capture.ts::capturePending/Committed/InterruptedActionNarration` | Provisional G, strict frozen payload, SHA, `storyResolution`, hold/outbox | Source/actor/root/decision IDs and capture purpose; **no new separate G** |
| `storyteller/capture-materialization.ts::claimCaptureLease / releaseCaptureFailure / promoteCapture` | bounded attempts, failure, lease, same-G promotion, outbox | Provider-free CAS source inclusion/rejection, exact packet source/build derivation, lease retry and old/new capture status; no external I/O inside story lock |
| `storyteller/capture-rearm.ts::rearmContextCapture` | operator rearm record with identity/epoch/failure + outbox; current status | Security/purpose provenance of rearm and comparison to previous failure, but not another action outcome |
| `storyteller/admission.ts::admitStorytellerResolution` | validates selected interaction and frozen source, inserts `storyResolution` + view | Exact chosen published option, source G/passage/interaction, schema/offer version and provenance; not a new mechanical receipt |
| `storyteller/openings.ts / start.ts` | draft locked, opening G/retry and reviewed Start | Draft revision, pinned start package/prompt and final reviewed candidate; **not** a story-level action until Start commits |
| `storyteller/dispatch-review.ts::prepareDispatchReview` | exact `packet` and SHA persisted for attempt, review state, decisions | **Reuse** packet body as source, add protected lifecycle/access and prompt-component derivation; a review-held attempt is not a provider dispatch |
| `storyteller/execution.ts` + `storyteller/budget.ts / window-accounting.ts` | generation state/result/repair, model attempts/usage/reserved/settled/uncertain, allocation windows | Durable per-round status and actual send identity; record what was *sent* vs merely prepared, reported usage vs estimates, never assume zero cost from timeout |
| `storyteller/memory-exploration-controller.ts` | pending model request/output hashes, snapshot rounds/tool reads; one operation G | Persist reasoned source candidate/read/omission decisions per round, exact packet mapping and final answer; never claim invisible model thoughts |
| `storyteller/publication.ts::publishStorytellerResult` | publication status, story passage/root/offer/hold changes; report hook state | Captured source-fence decisions, candidate schema, original task/receipt, publication-or-stale result; **same transaction** for new committed scene and story transition |
| `storyteller/recovery.ts::retryStoryteller` | `storyteller_retry` plus G, attempt and outbox state | Idempotent recovery decision proof, previous attempt spend state and request identity; no second earned mechanic |
| `stories/visit-checkpoint.ts::readStoryVisitOpening / acknowledgeStoryVisit` | **GET/open creates a short-lived visit-token row**; ACK writes viewer's monotonic read baseline | Distinguish **visit challenge issuance** from **acknowledged viewing**. These are private UI attention events, **not** canonical game transitions |
| `application/admin/case-writes.ts` and `admin/audit-reads.ts` | staff cases, case links, admin audit; grant/session elsewhere | Purpose-bound evidence access and case disclosure custody, not the campaign game ledger |
| `outbox/index.ts` / worker relay / Temporal Activities | durable notice ID/topic/operation, lease/retry and workflow ID | Causal edges and span links, **not** one giant wall-time story transaction |

**Key source relationship:** `generation.input` includes a frozen task/context/request, `storyteller_dispatch_review.packet` includes actual protected provider payload, and some `storyteller_memory_exploration` columns hold pending packet/output. The forensic design must not duplicate these blindly and must **not** declare raw evidence expired while these original rows still contain it.

## 5. Ordered capture sites and minimal delta

**Domain transition group** emitted **once per authoritative story transaction that changes meaningful truth**, with zero or more logical subevents:

~~~text
transition {
  storyId, storyTransitionSeq, atomicGroupId, operationId,
  kind, sourceEntityRefs[], beforeDigest, afterDigest, build/schema/ruleVersion,
  realCommittedAt, fictionalGameSecondBefore/After,
  narrativeRevisionBefore/After, compactStateDelta,
  subevents: [ { ordinalWithinCommit, typedSourceEventRef, effectsAndRngRef } ],
  coverage: COMPLETE|PARTIAL
}
~~~

Do **not** enqueue a second business workflow to “apply” this transition. Source tables still own truth. The new record is forensic projection over the commit. Implement the **minimum owner-specific delta codecs**, not a universal JSON patch interpreted as executable code. For some transitions (e.g. settings), existing immutable revision rows can be referenced instead of copying their entire body into another artifact.

**Candidate first capture boundaries:** genesis; finite action admission + settlement/interruption; one activity boundary batch; item holder transfer; settings/pace changes; hold transfer; world obligation fire; publication/root/active-scene change. Later: custom-intent candidate proposals, viewer visit and case actions need *non-game* evidence identities but not story state sequence.

## 6. Two different replay completeness levels

- **Published-scene playback** can use `storyPassage`, actual response/receipt and GM05 source events where retained and authorized. It is already partially feasible from existing source.
- **Exact historic mechanical reconstruction** requires a new committed internal sequence and complete relevant state deltas/checkpoint. Neither `storyPassage.sequence`, `story.viewVersion` nor GM05's public event index gives that today.

A new transition ledger starting from 2026-11-15 (or any future enable date) **cannot** recover unrecorded earlier mechanical states merely by running an index backfill. State reconstruction must expose an **instrumentation start frontier** and typed gaps.

## 7. Critical invariants and open source checks

1. Every game writer that changes `campaign.character, storyFacts, holds, gameSecond, clock, activeActivityId, activeActionOperationId, worldConditions` or `storyItem.holderKey` must be accounted for in the inventory and the eventual capture adapter map.
2. All under-lock data required for a compact delta is read/computed **before** the mutation or taken from the already validated transition; no extra remote CAS, index or provider I/O inside the hot story lock.
3. Multi-boundary `settleActivity` carries distinct subevent order and source outcome, and rollback removes all child evidence.
4. Existing idempotency of commands, `gameActionReceipt`, `storyResolution`, G and outbox must remain the same.
5. Provider attempt status and publication success are **different evidence events**, linked to one G.
6. No new instrumented replay can rewrite old authoritative effects or fabricate pre-instrumentation history.
7. **Unverified dependency:** actual normal runtime callers of `stageCampaignStateDocument` must be enumerated, along with its schema fidelity against the full source state; the helper alone is not evidence that old snapshots exist.
8. **Source-wide completeness:** before a code Change is marked Ready, run a repository-wide write-site inventory (e.g. ripgrep in Cursor's checkout) across `packages/application`, API/worker, SQL and migrations; compare against this reviewed list. This connector pass names high-value owners but does not prove exhaustiveness of indirect writes or raw SQL.
9. Current shared-world/participant support is not proven by these single-owner paths. Future scopes require viewer/actor-specific versions and access, not just `story.ownerId`.

## 8. Next artifact

This inventory is the concrete source basis for [physical SQL/CAS model](../technical/physical-evidence-storage-v1.md), [transaction and crash protocol](../technical/capture-transaction-protocol.md) and [replay consistency](../technical/reconstruction-algorithm-v1.md). No code-bearing Change packets are authorized by this audit.
