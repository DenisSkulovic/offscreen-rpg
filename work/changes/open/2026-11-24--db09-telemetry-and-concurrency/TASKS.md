# DB09 | Bounded Composer tasks

Base SHA d08e36d809bb53c48fef3351224994bae92b6e7c; Ready / commissioned (dependency-gated). Target main. DB07 joined; DB06/07 deterministic tests green. [Program](../../../undertakings/storyteller-workshop/DB-PARALLEL.md). MODEL=Composer Standard | DEPTH=PATCH. One child at a time. Parent owns lockfile, manifest integration and receipts; separate linked Change worktree. No unselected successor. Run commands from repository root. Stop on actual semantic/safety contradiction; missing live permission records NOT RUN. Receipt exact paths, command/cwd, result, baseline failures and SHA. No provider, migration-history or protected DB changes.

## T01 | Safe instrumentation
Read EXECUTION.md, packages/db/src/telemetry/types.ts, database.ts, connection/admission.ts, transaction/execute.ts. Implement selected event construction, counters, gauges, observer isolation, phase hooks. Add db09-telemetry.test.ts; build and node --test packages/db/dist/test/db09-telemetry.test.js. Test real lease semantics via fake ports. No domain adoption.

## T02 | Concurrency primitives
Read EXECUTION.md, transaction/types.ts, index.ts, transaction/policy.ts. Implement concurrency.ts and db09-concurrency.test.ts, root exports, add both tests to test script. Run pnpm --filter @offscreen/db build && pnpm --filter @offscreen/db test.
