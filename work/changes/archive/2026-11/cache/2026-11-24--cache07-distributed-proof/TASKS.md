> Historical record only. Superseded by VER06–08 and CACHE08; do not execute historical live commands. Current acceptance remains NOT-RUN unless measured in new programme.

# CACHE07 | bounded Composer tasks

[Exact fixture and commands](PLAN.md). Source Ready at c0d3c283e60e1c06d627f9a9b96603f7294d5202. One child at a time, Composer Standard, isolated Change worktree. No live permission required for T01/T02 source implementation. No other production code edits without planner decision.

## T01 | Harness implementation
Read PLAN.md, packages/cache/src/index.ts, core/index.ts, strategies/index.ts and package.json. Create test/distributed/worker.mjs, harness.mjs and harness.test.mjs exactly as PLAN. Implement owned local Docker fixture, refusal/cleanup, IPC and T01 scenarios. Run source commands in PLAN; no Docker launch without owner opt-in. Receipt files, exact commands, tests and SHA.

## T02 | Fault scenarios
Read PLAN.md, existing harness and runtime/redis-connection.ts. Add startup outage/restart/pause/burst/overload/failure/shutdown scenarios and metrics; extend fake executor and assertion tests. Run same source commands. If owner explicitly approves disposable local Docker fixture, run exact live command in PLAN (both T01/T02), record results. Otherwise source implementation proceeds and live proof NOT-RUN. Stop on actual invariant failure, not absence of pre-existing harness.

## T03 | Evidence and integration
Write PROOF.md, reconcile canonical realization, README and catalog with actual tier. Source-only partial join allowed; retain open until live evidence passes. CACHE04 SQL proof independent. No cross-Pod claim, no distributed lease implementation. Parent owns serialized join and closure.
