# ENG03 | Materialize Storyteller context without holding a story write lock across external I/O

**Design decision update (post-ENG wave, Nov 13):** Remains **Proposed, NOT Ready for a full context-admission refactor**. [Measurement-first plan](../../engine-architecture/decisions/eng03-instrument-before-refactor.md) selects exact 0/250/2000ms external-I/O fault traces, SQL lock timing, source-version capture categories and the required speculation/settlement race. It allows a separately approved, narrowly bounded disposable performance investigation, **not** automatic migration to a second async Storyteller coordinator. Revisit after ENG05 local S3 adapter and observed contention.

**State:** Proposed, **NOT Ready**. **Kind:** captured-source preparation and fenced publication lifecycle, with concurrency tests. **Authority:** [context/lock decision](../../engine-architecture/decisions/context-capture-and-locks.md) and [causal trace](../../engine-architecture/evidence/causal-transition-review.md). **No code authorized.**

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
