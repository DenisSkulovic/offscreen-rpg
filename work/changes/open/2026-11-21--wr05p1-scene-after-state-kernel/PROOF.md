# WR05P1 | Source and readiness evidence

**Baseline:** WR05S is archived at `work/changes/archive/2026-11/other/2026-11-21--wr05s-scene-v2-storage-contract`, v2 schema lives `packages/documents/src/schema.ts`; version-2 SQL selector migration is `0019_wr05s_scene_checkpoint_schema.sql`. The Engine is `packages/story-engine` after MA06A, not the forwarding `application` package. Direct source inspected on integration branch 2026-11-21. No code tests executed by planner.

- **G0:** WR05S prerequisite satisfied, WR08A Web-only disjoint, old WR05 monolithic T-IDs remain blocked.
- **G1:** real writer/reader paths `stories/persistence.ts:projectStoryItemEffects`, `stories/continuity-notes.ts:publishStorytellerNotes`, `stories/scene-checkpoint.ts`, DB campaign/story tables. One isolated new kernel.
- **G2:** normalized internal immutable snapshot of semantic state; no public DTO or changed SQL transaction; stable sorted compare.
- **G3:** pure note projector reuses existing task/result/evidence validation, never bypasses arrivals or stale-base checks.
- **G4:** v2 Documents currently only accepts null/[] continuityNotes: **do not claim full publication is ready**. This Change preserves data without truncation and surfaces representability.
- **G5:** negative probes cover foreign story data, over-bound collection, changed notes/action/offer, failed validation, no DB side effects. Tests need actual execution and receipts.
- **G6:** one branch/worktree and final serialized undertaking integration; no main.
- **G7:** explicit exclusions: publication control flow, checkpoint selector, data migrations, fork and API. No model calls or billing changes.

**Verdict:** READY for the bounded capture/projection substrate. This is a useful implementable precursor; it does not mislabel the full WR05 parent as ready.
