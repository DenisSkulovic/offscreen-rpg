# ENG03 | Materialize Storyteller context without holding a story write lock across external I/O

**Composer microtask entry (2026-11-20):** [TASKS.md](TASKS.md) has the source-backed, bounded `T01…` route, normal and negative tests and explicit stop gates; [full open-backlog audit](../../COMPOSER-QUEUE-AUDIT-2026-11-20.md) explains priority/ownership. **Default Cursor parent and child: Composer 2.5 Standard.** Current delegation: VERIFY first; no all-purpose capture refactor without measured lock contention. A planned `T-ID` is **not** selection, implementation, PASS or lifecycle promotion; this Change's existing state and authorization restrictions still govern. No Grok unless a newly identified, specifically owner-approved exception survives additional ChatGPT investigation.

**2026-11-18 executable decision:** [Backlog audit and acceptance](../../../designs/open/backlog-convergence-2026-11-18/README.md); [bounded contract choices](../../../designs/open/backlog-convergence-2026-11-18/CONTRACT-DECISIONS.md); [ordered Cursor handoff](../../../designs/open/backlog-convergence-2026-11-18/CURSOR-HANDOFF.md). The older Proposed/Blocked/No-code declarations retained below document the historical decision; they do not prohibit the **safe scoped implementation** now selected. External paid dispatch, nondisposable DB resets, production grants and irreversible accounting changes remain disallowed. A provider-free experiment that proves no new feature is needed must close with a source-backed positive alternative, not be parked again.

**Design decision update (post-ENG wave, Nov 13):** Remains **Proposed, NOT Ready for a full context-admission refactor**. [Concurrency and recovery](../../../../docs/technical/engine/concurrency-and-recovery.md) selects exact 0/250/2000ms external-I/O fault traces, SQL lock timing, source-version capture categories and the required speculation/settlement race. It allows a separately approved, narrowly bounded disposable performance investigation, **not** automatic migration to a second async Storyteller coordinator. Revisit after ENG05 local S3 adapter and observed contention.

**State:** **OPEN, source-backed T02–T07 implementation plan prepared (2026-11-20), NOT Done**. T01 already measured repaired pending path 7/7; remaining player resolution, scripted continuation, activity/world narration and historical report still have transaction-scoped DocumentStore reads (structural code finding, not new live timing proof). [Exact decision](DECISION-2026-11-20.md) and [bounded tasks](TASKS.md) replace the former indefinite `T02 planner-gated` next step. **Not selected**; TURN02 remains in QUEUE. No runtime code/tests changed by this audit.

**Selected measurement/capture companion (2026-11-13):** [ENG03-M measurement packet](../../../../work/changes/archive/2026-11/eng/2026-11-13--eng03-lock-measurement/CHANGE.md) and [source-capture contract](../../../../docs/technical/engine/concurrency-and-recovery.md). This full refactor remains NOT Ready until the measured go/no-go and exact physically typed capture fields are proven; no automatic authorization follows the measurement.

**Follow-on decision (2026-11-14, design only):** [ENG03 capture notes](../../../../docs/technical/engine/concurrency-and-recovery.md) and [C1 committed finite-action capture packet](../../../../work/changes/archive/2026-11/eng/2026-11-14--eng03-committed-action-capture/CHANGE.md). C1 is conditional design-complete, not Ready until owner selection and reinspection of Cursor's implemented pending capture. This parent full ENG03 stays **Proposed / NOT Ready**; no mega-rewrite authorized.

**ENG03 lifecycle reconciliation, Nov 20:** This Change opened Nov 13 and produced five archived focused ENG03 children by Nov 15; it did not sit idle. Its parent stayed open because T01 remeasured the already repaired pending path while the remaining under-lock I/O branches had no finite owner/task route. [Source audit and concrete contracts](DECISION-2026-11-20.md) enumerate each remaining production call site and a closure matrix; this parent is neither Cancelled nor a license for a generic saga/rewrite. Old Proposed/Blocked/Ready paragraphs below are dated history and do not supersede the current State and T02–T07. Do not mark Done from past C1/C2 proof. No new Change folders created.

## Cursor first-screen brief, after exact lifecycle design

> **Goal:** a model/task preparation reading remote immutable objects does not hold the story row `FOR UPDATE` during slow I/O, yet the prepared task is tied to the **exact admitted actor/rules/source/operation versions** and cannot publish stale results.
>
> **Start:** `packages/application/src/campaign/narration.ts::preparePendingActionNarration`, `packages/application/src/storyteller/context.ts::loadStorytellerContext`, `packages/application/src/storyteller/admission.ts`, `packages/application/src/storyteller/publication.ts`, and current outbox workflow wiring. Reinspect caller ownership before moving anything.
>
> **Known trap:** moving `loadStorytellerContext` after `COMMIT` without capturing source versions creates a race; keeping a long-running MVCC transaction open around S3 reads is not the fix.

## Desired three stages

1. **Short authoritative capture transaction:** immutable operation/offer/actor/rule/usage/clock/scene source references, exact canonical root and relevant SQL facts are validated/frozen; enqueue one bounded preparation intent. The accepted game action and receipt identity remain authoritative.
2. **Off-lock materialization:** load immutable source objects and current captured evidence by hash/version, build a finite provider task and final real-message evidence trace; fail/hold with a specific cause if required evidence unavailable or over budget.
3. **Short publication transaction:** recheck exact purpose-specific source/root/actor/receipt dependencies. Current controlling scenes fail stale; historical optional reports can publish against their own exact old event; no reroll or double spending.

The current code already **stages published objects outside final transaction**. Reuse that pattern. Do not install a generic saga bus or a second story engine.

## Why this is not yet Ready

The exact captured-input schema, existing generation and outbox compatibility, migration of pending tasks and staleness categories must be designed after a lock-duration baseline. A single-actor action may legitimately conflict at the business level even after removing unnecessary lock latency.

## Acceptance

**Normal:** injected 2-second remote source read occurs outside write lock; an unrelated permitted state write is not blocked *only by object I/O*, while one task's final response is sourced to the original exact snapshot. **Conflict:** a new scene/root changes during preparation; old current scene cannot publish. **History:** late report of a settled event remains eligible as an historical report. **Replay:** two preparation notices produce one captured task/charge identity. **Fault:** missing/corrupt object yields held/recoverable state and no fabricated prose.

**Do not:** alter game time, rewrite item ownership, perform paid provider calls, drop old generation tasks or add unlimited automatic retries. Verification begins as provider-free, fault-injected integration with explicit disposable DB authorization.

## Ready gate

Measure current lock I/O and select a bounded phase/capture DTO; review old in-flight generations. If task-version migration or new workflow semantics cannot fit one Change, split into an approved two-step contract migration and executor switch rather than silently broadening this packet.
