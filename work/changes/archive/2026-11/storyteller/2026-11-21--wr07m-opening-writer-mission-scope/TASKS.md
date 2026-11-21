# WR07M | Three Composer T-IDs

**Baseline:** `undertaking/storyteller-workshop`, inspected 2026-11-21, after MA06A/WR05S/WR07C; verify fresh HEAD and clean status before work. Dedicated `change/wr07m-opening-mission-scope` linked worktree. Parent completes the whole Change without seeking approval between T-IDs.

### T01 | Versioned capture union (PATCH)
**Read/write:** `packages/storyteller/src/tasks/writer-mission.ts:writerMissionCaptureSchema,writerMissionSceneFrontierSchema`; `packages/storyteller/test/writer-mission.test.ts:finiteWriterMissionCapture`. Preserve v1 object and `superRefine` exactly. Extract shared bounded fields, keep v1 with its `sceneFrontier`, add v2-opening `sceneScope` with two UUIDs and same-story refinement. Export v1, v2Opening and union. `validateWriterRoundDecisionForCapture` must still check exact allowlist regardless of version. Prove v1 existing fixtures and v2 valid/invalid scopes and spend/tool negatives. No new package or schema migrations.

### T02 | Immutable opening-scoped round request (PATCH)
**Read/write:** `packages/storyteller/src/tasks/writer-round-request.ts:compileWriterRoundCapturedRequest`, `packages/storyteller/test/writer-mission.test.ts`. Select `pins` shape solely from capture version; for v1 retain exact key order and serialized value, for v2 emit `sceneScope` and omit `sceneFrontier`. Keep `writer-round.v1` task and output schema. Test exact v1 JSON and hash from the pre-edit fixture (record it before changing), v2 scope present, replay deterministic, no invented prior passage, exact root and allowlist still pinned. Do not edit Writer loop, provider wire or budgets.

### T03 | Focused quality and close (VERIFY/PATCH)
Run `pnpm --filter @offscreen/storyteller build`, `pnpm --filter @offscreen/storyteller test` and changed-file Prettier/ESLint. Record proof and negative cases, note unrun provider/SQL (none authorized), archive/ledger reconcile, squash-integrate to `undertaking/storyteller-workshop` one at a time with other Change integrations; remove clean worktree/branch. No merge to main and no automatic successor dispatch.
