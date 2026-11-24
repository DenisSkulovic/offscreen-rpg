# DB08 | bounded Composer tasks

Base SHA fa77f2d3614ee821b8e4ad849a46a66342000132; state Proposed / planner-gated. [Program and frozen contracts](../../../undertakings/storyteller-workshop/DB-PARALLEL.md). Shared path lock: integration custodian; own named paths only. MODEL=Composer Standard | DEPTH=PATCH. One child at a time, no research swarm. Receipt: exact paths, command/cwd, positive/negative, limitations, branch SHA.

## T01 | Verify applied journal prefix | PLANNER-BLOCKED until promotion

Requires: DB01; independent of DB06 (config backward compatible).
Read: packages/db/src/migrate.ts; packages/db/test/database.integration.ts; packages/db/migrations/meta/_journal.json.
May write: exact source/test destinations in algorithm, no peer ownership. 
Algorithm: Keep stable lock 683291351 and dedicated Client. Read migration entries with pinned Drizzle readMigrationFiles, compare ordered applied hashes and timestamps under lock before migrate. Empty ledger legal only when absent/empty; reject unknown, gap, tamper, duplicate/out-of-order or malformed metadata; do not repair. Preserve existing fixture where when=1 etc; planner confirms exact Drizzle metadata semantics before dispatch. Fake tests prefix match/changed hash/missing entry/newer unknown; actual SQL tests later disposable only.
Verification (root): `pnpm --filter @offscreen/db build && node --test packages/db/dist/test/db08-journal.test.js`. If integration fixture is unavailable, record NOT RUN and keep proof open; do not invent a harness or start shared stack.
Stop: named semantic/ownership/fixture contradiction; report exact evidence to planner.

## T02 | Bound runner and safe failure | PLANNER-BLOCKED until promotion

Requires: previous task accepted.
Read: packages/db/src/migrate.ts; packages/db/src/migrate-cli.ts; packages/db/test/database.integration.ts.
May write: exact source/test destinations in algorithm, no peer ownership. 
Algorithm: Add migration-specific lock/statement budget without changing deployment path; ensure session lock retained through validation/DDL and released by end; fail safe on connection error, no retry ambiguous outcome; sanitize CLI output. Preserve generic migrationsFolder signature. Existing test competing lock and rollback plus new tamper refusal under authorized fixture.
Verification (root): `pnpm --filter @offscreen/db build; pnpm --filter @offscreen/db test:integration (only authorized disposable offscreen_db_test)`. If integration fixture is unavailable, record NOT RUN and keep proof open; do not invent a harness or start shared stack.
Stop: named semantic/ownership/fixture contradiction; report exact evidence to planner.
