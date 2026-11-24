# DB07 | bounded Composer tasks

Base SHA fa77f2d3614ee821b8e4ad849a46a66342000132; state Proposed / planner-gated. [Program and frozen contracts](../../../undertakings/storyteller-workshop/DB-PARALLEL.md). Shared path lock: integration custodian; own named paths only. MODEL=Composer Standard | DEPTH=PATCH. One child at a time, no research swarm. Receipt: exact paths, command/cwd, positive/negative, limitations, branch SHA.

## T01 | Classify failures and retry policy | PLANNER-BLOCKED until promotion

Requires: DB06 plus DB01 policies; no domain adoption.
Read: packages/db/src/transaction/types.ts; packages/db/src/transaction/policy.ts; packages/db/src/database.ts.
May write: exact source/test destinations in algorithm, no peer ownership. 
Algorithm: Implement bounded cause walk SQLSTATE classification; preserve internal cause, closed category; default no retry; only 40001/40P01 known rollback with sql-only-conflicts policy; <=3 attempts, jitter25–200ms remaining budget. Explicit unknown commit class never retry; constraints/lock/timeouts/auth/application errors never retry. Deterministic fake tests for wrapped errors, callback attempt count, budget and no retry on connection loss.
Verification (root): `pnpm --filter @offscreen/db build && node --test packages/db/dist/test/db07-errors.test.js`. If integration fixture is unavailable, record NOT RUN and keep proof open; do not invent a harness or start shared stack.
Stop: named semantic/ownership/fixture contradiction; report exact evidence to planner.

## T02 | Managed transaction runner | PLANNER-BLOCKED until promotion

Requires: previous task accepted.
Read: packages/db/src/database.ts; packages/db/src/connection/admission.ts; packages/db/src/transaction/types.ts; packages/db/test/database.integration.ts.
May write: exact source/test destinations in algorithm, no peer ownership. 
Algorithm: Implement transaction/execute.ts against withClient: BEGIN/SET TRANSACTION chosen enum, set_config local statement/lock/idle, Drizzle transaction callback on same checked-out client; track commit phase; do not promise-race release; rollback on callback/deadline, destroy tainted client; retry only after known rollback. Exact Drizzle transaction API/commit phase proof must be pinned by planner (do not use nested transaction or invent fake Tx); if pinned API cannot expose commit phase safely, stop. Preserve existing caller transaction type. Fake test commit-unknown, timeout before commit, callback rejection, rollback failure, local timeout reset.
Verification (root): `pnpm --filter @offscreen/db build && node --test packages/db/dist/test/db07-transaction.test.js`. If integration fixture is unavailable, record NOT RUN and keep proof open; do not invent a harness or start shared stack.
Stop: named semantic/ownership/fixture contradiction; report exact evidence to planner.
