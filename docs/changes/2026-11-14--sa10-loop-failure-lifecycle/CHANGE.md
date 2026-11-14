# SA10 | Bounded Storyteller loop never loses gameplay or spends twice on failure

**State: Proposed / design-complete 2026-11-14. No code authorization.** Implement only if the negative proof reveals gaps or adds a valuable regression. Depends SA01 trace. [SA program](../../storyteller-architecture/implementation-program.md).

## Cursor first-screen brief

> **Outcome:** one Storyteller operation facing delayed provider, repair, round exhaustion, uncertain charge, stale source or worker restart ends with exactly one truthful terminal/held/final state and never grants fictional time or extra charged attempts.
>
> **Authority:** [time/cost failure matrix](../../storyteller-architecture/effort-cost-and-lifecycle.md#failure-and-budget-exhaustion-matrix), [outer loop](../../storyteller-architecture/target-operating-model.md#the-two-interacting-loops-not-one-infinite-chat), [usage policy](../../technical/usage-policy.md).
>
> **Source:** `packages/application/src/storyteller/execution.ts::createStorytellerExecution`, `storyteller/memory-exploration-controller.ts::runMemoryExploration`, `storyteller/memory-provider-runtime.ts`, `storyteller/budget.ts::createStorytellerBudget`, `storyteller/recovery.ts::retryStoryteller`.

## Selected code-bearing result

1. Build provider-free deterministic state-transition tests spanning single, repairable, memory-exploration and final publication. Stages: pending reserved unsent; dispatched uncertain; valid; invalid; final-ready; blocked/stale/published. The persisted controller/database is authority, not a new duplicate FSM.
2. Fault inject source retrieval, request composition, reservation, transport, response persistence, tool read, final publication, worker crash/restart and exact retry ID.
3. Verify that model-round/read limits include final and repair, final-answer reserve survives, budget cannot reset on resume, and no unsent vs uncertain error is conflated.
4. Verify model processing latency is distinct from fictional accepted work; a slow controlling narration holds valid last passage and earned progress; an old historical report never replaces Now.
5. Change existing source only for a demonstrated discrepancy; otherwise a test-only implementation is valid. Do not build another retry coordinator or reopen finished engine mechanics.

## Positive and negative acceptance

**Positive:** valid multi-round source-read path produces one final and one accepted publication under one funded identity; restoring a saved final candidate sends zero new provider requests.

**Negative:** duplicate outbox, disconnected stream after dispatch, confirmed-unsent provider unavailable, invalid JSON/length requiring repair, model-round exhaustion, lost ACK, stale root, wrong viewer, late report, funding revoke and corrupt source keep source/holds/charges correct. No new generation appears simply because client refreshes.

**Proof:** targeted provider-free `memory-provider-runtime.test.mjs`, `storyteller-control.test.mjs`, `resolution-receipt.test.mjs`; `pnpm --filter @offscreen/application build`. SQL if required only on **explicitly approved disposable database**, no provider money or destructive real reset. Return state/attempt count matrix and any unproven scenarios.

**Exclusions:** ENG03/CAS pipeline rewrite, Temporal release versioning, account/billing UI, GM mechanics and multiagent platform. Stop rather than broad refactor if the existing implementation already passes all discriminating cases.
