# HR03 | Drizzle table map and current business-query locations

**Actual inspected baseline `d3ba2917`:** `packages/db/src/schema/storyteller.ts` 1,240 lines / 20 `export const name = pgTable(...)`, Drizzle `schema:'./src/schema/*.ts'` (nonrecursive), public manifest `./storyteller-schema` points at compiled `dist/src/schema/storyteller.js/.d.ts`. `packages/db/src/database.ts:createDatabase` creates pg Pool and drizzle client, exposes close/checkConnection. App business modules import those schema symbols directly from public `@offscreen/db/storyteller-schema`. No source type/export rename is allowed.

**Exact existing declaration segments, old→new:**
- lines 21–336: `storytellerPublication`, `storytellerContextCapture`, `storytellerContextCaptureRearm`, `storytellerMemoryExploration`, `storytellerDispatchReview`, `storytellerDispatchReviewDecision` → `storyteller/capture.ts`. `Rearm` references `ContextCapture`; `Decision` references `DispatchReview`. External `generation` and `user` imports adjust `../generations.js`, `../auth.js` under NodeNext.
- lines 337–656: `storytellerFunding`, `storytellerRun`, `storytellerOperation`, `storytellerAttempt`, `storytellerUsageAllocation` → `storyteller/funding.ts`; Run/Operation/Attempt reference Funding, Usage references Attempt.
- lines 657–829: `storytellerRetry`, `storytellerPromptProvenance`, `storytellerExecutionStage`, `storytellerSavedRepairAudit` → `storyteller/execution.ts`; SavedRepair references `storytellerAttempt` from `funding.ts`.
- lines 830–956: `storytellerCurrentPlatformPolicy`, `storytellerCurrentOwnerGrant` → `storyteller/policy.ts`; OwnerGrant references Funding/Run from `funding.ts`.
- lines 957–1240: `storytellerWriterMission`, `storytellerWriterStep`, `storytellerWriterChild` → `storyteller/writer.ts`; Mission references Operation, Step references Attempt + Mission, Child references Mission. Import only from `funding.ts` or local Writer table.

**Import topological order:** funding → capture/execution/policy/writer, execution imports Funding's Attempt; no module imports barrel `../storyteller.js` to avoid circular construction. Barrel exports exactly five new files and same 20 table bindings, without redeclaring tables. Existing public subpath not changed. Check all source-level foreign key references, including cases `(t) => [foreignKey(...)]`, before move.

**Where actual business SQL lives, observed query-builder calls (counts are textual estimates, not exhaustive AST or correctness evidence):**
- `packages/story-engine/src/stories/forks.ts` ~38, `persistence.ts` ~21, `documents.ts` ~15, `visit-checkpoint.ts` ~13, `resolution-core.ts` ~13; story ownership, checkpoints, passage/fork and idempotent operation tables.
- `campaign/settings.ts` ~19, `actions.ts` ~19, `custom-intent.ts` ~18, `activities.ts` ~13, `action-executions.ts` ~10; action/controls, settlement, policy/clock.
- `storyteller/context-capture.ts` ~57, `budget.ts` ~47, `capture-materialization.ts` ~31, `publication.ts` ~26, `writer-mission-custody.ts` ~25, `writer-loop.ts` ~17; capture, locks, budgeting, immutable result and Writer mission.
- `packages/db/src/outbox.ts` and `outbox-relay.ts` are lower-level generic outbox primitives. No query behavior/cycles refactored here.

**Source-of-truth ownership:** as presently implemented, `apps/game-authority` and SQL-capable Worker compose Story Engine use cases; the no-SQL execution Worker must not import DB. SQL `db.transaction` and advisory-first locks in Story Engine are domain use-case owners, not a missing DB package repository that must be invented. `MA09` Authority/Writer inversion and WR11 continuation are separate semantic code changes; HR03 only writes their **read-only navigation document**, after source rechecking actual post-WR11 code.

**Collision:** CL01 will add new `schema/terminal-auth.ts` and next migration, not these 20 Storyteller declarations; runtime migrations and shared DB build output still must be serialized. WR11 will edit Writer SQL source, so atlas must be refreshed against its integrated commit to avoid stale function claims. No concurrent mutable DB experiments during schema refactor proof.
