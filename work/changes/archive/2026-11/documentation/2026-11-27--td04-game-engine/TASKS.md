# TD04 | task queue

Base `a28693dcefe80a3242a870ed03a6c144b47f1ac7`; state READY; owner-authorized for named dispatch; selected task none. All T-IDs independent construction with disjoint exact paths; maximum two isolated workers at once or serial if isolation unavailable. Parent-only staging and final proof. Group target join lock. No sibling/shared files.

## T01 | Engine authority and proof boundaries | PROPOSED

DEPTH=PATCH; type DOCUMENT.

Requires: commission, verified branch/ownership, group transfer contract. No sibling task prerequisite.

May write: `docs/technical/engine/authority-and-transitions.md`; `docs/technical/engine/concurrency-and-recovery.md`. Must not write: any unlisted owner, source, config, protected contract or shared index.

Read: `docs/technical/engine/authority-and-transitions.md`; `docs/technical/engine/concurrency-and-recovery.md`; `packages/story-engine/src/stories/resolution.ts#createStoryResolution`; `packages/story-engine/src/stories/continuation.ts#commitStoryContinuation`; `docs/technical/platform/execution-and-delivery.md#responsibility-at-the-database-boundary`.

Algorithm: Rewrite opening status and first-proof framing as selected authority contract plus narrowly evidenced legacy realization. In A minimum state ledger and Existing state owners distinguish required state/receipt identities from current record families; retain revisions and actor/offer fences, authorized chains, refusal and no unbounded idle. Clock correction and equal-tick resolution: preserve deterministic ordering and goal-reaching interruption. Keep C1/C2 evidence exact in concurrency page, not generalized to all races, preserve before/during/after lock, durable retry, stale write and held recovery semantics. Keep gaps under What is still not done.

Keep existing heading anchors and correct links; rewrite the controlling prose, not just add a warning. Preserve unique conditions, counterexamples, compatibility and exact proof provenance. No new architecture or permission; no runtime edits, tests, live operations or paid calls.

Test: source/diff semantic gate only; parent runs PROOF once. Negative: Old C1/C2 proof means every concurrent transition is safe; reused situation implies permission; optional report failure rolls back settled outcome.

Stop: material contradiction, drift of authority, unique fact lacking successor, active writer, or need for new policy. Receipt: exact headings, source routes, preserved claims/limitations, negative answer, diff and unresolved finding destination.

## T02 | Clock and calendar contracts | PROPOSED

DEPTH=PATCH; type DOCUMENT.

Requires: commission, verified branch/ownership, group transfer contract. No sibling task prerequisite.

May write: `docs/technical/engine/calendars-and-world-time.md`; `docs/technical/engine/chronology-and-activities.md`; `docs/technical/engine/ticks-and-tags.md`. Must not write: any unlisted owner, source, config, protected contract or shared index.

Read: `docs/technical/engine/calendars-and-world-time.md`; `docs/technical/engine/chronology-and-activities.md`; `docs/technical/engine/ticks-and-tags.md`; `packages/game/src/time.ts#earnedGameSeconds`; `packages/game/src/activities.ts#nextBoundaryGameSecond`; `packages/story-engine/src/storyteller/runtime.ts`; `packages/story-engine/src/storyteller/saved-generation-publish.ts`.

Algorithm: Calendar pages retain accepted time label/ordinal, due boundary ordering, shared collision proposal and worked two-month example; no complex calendar delivery claim. In chronology keep separate permission, interval, hold, settlement/interruption, two independent completion requirements, bounded atomic overlap, published option deadline/default and pause/delivery failure. Mark Units and responsibility and Worked traces as exact legacy realization/fixture evidence. In ticks-and-tags preserve arithmetic not authority, tag meaning vs effects, exact source constraints, and receive PD02 time-and-autonomy Existing narrative rehearsal adapter: runtime.ts and saved-generation-publish.ts default 20000ms / injected realDurationMs, immediate conversation zero per product record, not added to mechanical clock. Retain product claim scope rather than infer runtime-wide correctness from default callback.

Keep existing heading anchors and correct links; rewrite the controlling prose, not just add a warning. Preserve unique conditions, counterexamples, compatibility and exact proof provenance. No new architecture or permission; no runtime edits, tests, live operations or paid calls.

Test: source/diff semantic gate only; parent runs PROOF once. Negative: Twenty seconds becomes canonical time; due deadline skipped; pace change awards progress; tag or timer settles world truth.

Stop: material contradiction, drift of authority, unique fact lacking successor, active writer, or need for new policy. Receipt: exact headings, source routes, preserved claims/limitations, negative answer, diff and unresolved finding destination.

## T03 | Mechanics and activity authority | PROPOSED

DEPTH=PATCH; type DOCUMENT.

Requires: commission, verified branch/ownership, group transfer contract. No sibling task prerequisite.

May write: `docs/technical/engine/mechanics-and-capabilities.md`. Must not write: any unlisted owner, source, config, protected contract or shared index.

Read: `docs/technical/engine/mechanics-and-capabilities.md`; `packages/game/src/checks.ts#resolveCheck`; `packages/game/src/activities.ts#settleProcessBoundary`; `packages/game/src/effects.ts#applyOutcomeEffects`; `packages/game/src/offers.ts#selectOfferAction`.

Algorithm: Rewrite Supported mechanisms and future kernel into selected optional packages and a separate legacy offline slice. Preserve private immediate plans, deterministic admission, distinction between availability/start/ongoing validity, offer reuse not authorization, curation, dormancy/wake, no fabricated unsupported effect and exact activity history. Receive PD02 rules realization: retain named fixture worlds, scoped D&D formula/advantages/natural rolls, literal clock-wait.v1 vs traversal, immediate receipt path, item.create.v1/item.transfer.v1, fact.set.v1 declaration and admitted private offer/path metadata, exclusions and provenance to source product heading; do not infer these from effects.ts alone. Existing technical data owner retains atomic publication. Receive continuity scene-frame.v1 candidate in Opportunity boundary as an unratified representation, not chosen map schema.

Keep existing heading anchors and correct links; rewrite the controlling prose, not just add a warning. Preserve unique conditions, counterexamples, compatibility and exact proof provenance. No new architecture or permission; no runtime edits, tests, live operations or paid calls.

Test: source/diff semantic gate only; parent runs PROOF once. Negative: Prose changes property; a lucky roll admits impossible action; a previously available opportunity is always startable.

Stop: material contradiction, drift of authority, unique fact lacking successor, active writer, or need for new policy. Receipt: exact headings, source routes, preserved claims/limitations, negative answer, diff and unresolved finding destination.

## T04 | Historical branches and lifecycle | PROPOSED

DEPTH=PATCH; type DOCUMENT.

Requires: commission, verified branch/ownership, group transfer contract. No sibling task prerequisite.

May write: `docs/technical/engine/lifecycle-and-compatibility.md`. Must not write: any unlisted owner, source, config, protected contract or shared index.

Read: `docs/technical/engine/lifecycle-and-compatibility.md`; `packages/story-engine/src/stories/forks.ts#createStoryForks`; `packages/story-engine/src/stories/scene-checkpoint-v2.ts#projectV2HistoricalCampaign`; `packages/story-engine/src/stories/continuation.ts#lockedCheckpointMatches`.

Algorithm: Keep Five owners, Forked continuities and Fork identity remap first-class selected constraints: exact committed pair, inherited identity remap, no parent future, original untouched, authorization and no provider/spend on read/fork where required. Separate Current legacy draft/preview and Start realization, scripted Chamber initiation and replay compatibility from selected product entry. Preserve optional preview (reviewed starts must use exact reviewed payload, not require preview for every start), revision and source compatibility, finish/delete/membership/interruption distinction. Keep missing distributed proof explicit.

Keep existing heading anchors and correct links; rewrite the controlling prose, not just add a warning. Preserve unique conditions, counterexamples, compatibility and exact proof provenance. No new architecture or permission; no runtime edits, tests, live operations or paid calls.

Test: source/diff semantic gate only; parent runs PROOF once. Negative: Fork reads latest parent root; start silently regenerates reviewed plan; deleting old POC data is authorized.

Stop: material contradiction, drift of authority, unique fact lacking successor, active writer, or need for new policy. Receipt: exact headings, source routes, preserved claims/limitations, negative answer, diff and unresolved finding destination.

## T05 | Selected architecture and source routing | PROPOSED

DEPTH=PATCH; type DOCUMENT.

Requires: commission, verified branch/ownership, group transfer contract. No sibling task prerequisite.

May write: `docs/technical/engine/selected-architecture.md`; `docs/decisions/D-0001--modular-engine.md`; `packages/story-engine/README.md`. Must not write: any unlisted owner, source, config, protected contract or shared index.

Read: `docs/technical/engine/selected-architecture.md`; `docs/decisions/D-0001--modular-engine.md`; `packages/story-engine/README.md`; `apps/game-authority/src/launch-put.ts#createLaunchPutService`; `apps/worker/src/activities/index.ts#createWorkerActivities`; `packages/story-engine/src/stories/index.ts`.

Algorithm: M01: preserve D-0001 modular monolith as dated selected working target and its revisit criteria, not permanent correctness invariant and not declared superseded; correct Continuity on 2026-11-19 claim of present implementation into historical observation. Preserve prohibition of LLM mechanical truth, pure capability/admission, durable receipt, publication and dependency laws. In selected architecture lead with Five contracts, Six logical subsystems, Non-negotiables and Ownership lines; recast MA05/06A/08/12 schedules and old module counts as historical/conditional; retain actual source restrictions and explicit reverse-edge debt. Keep old checkpoint SHA/evidence and proposed extraction criterion, no new package choice. Replace story-engine README Application re-export statement with actual stories/campaign/storyteller/generations owners, direct resolution/continuation route and existing typed boundary; no changes to active Agent Core maps. TURN03 cancelled/NOT-RUN stays exact.

Keep existing heading anchors and correct links; rewrite the controlling prose, not just add a warning. Preserve unique conditions, counterexamples, compatibility and exact proof provenance. No new architecture or permission; no runtime edits, tests, live operations or paid calls.

Test: source/diff semantic gate only; parent runs PROOF once. Negative: Historical extraction is mandatory future architecture; D-0001 silently revoked; removed Application package is current; native deployment proves game.

Stop: material contradiction, drift of authority, unique fact lacking successor, active writer, or need for new policy. Receipt: exact headings, source routes, preserved claims/limitations, negative answer, diff and unresolved finding destination.
