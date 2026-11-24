# DB07 | bounded Composer tasks

Base SHA 2fb3f056; Ready / commissioned; DB01 and DB06 joined. [Program and frozen contracts](../../../undertakings/storyteller-workshop/DB-PARALLEL.md). Shared path lock: integration custodian; own named paths only. MODEL=Composer Standard | DEPTH=PATCH. One child at a time, no research swarm. Receipt: exact paths, command/cwd, positive/negative, limitations, branch SHA.

## T00 | Correct inherited DB06 admission deadline and actual drain

Implement the correction and tests in EXECUTION.md before T01. Run DB06 focused tests.

## T01 | Classify failures and retry policy | READY

Requires: DB06 plus DB01 policies; no domain adoption.
Read: packages/db/src/transaction/types.ts; packages/db/src/transaction/policy.ts; packages/db/src/database.ts.
May write: exact source/test destinations in algorithm, no peer ownership. 
Algorithm: Implement bounded cause walk SQLSTATE classification; preserve internal cause, closed category; default no retry; only 40001/40P01 known rollback with sql-only-conflicts policy; <=3 attempts, jitter25–200ms remaining budget. Explicit unknown commit class never retry; constraints/lock/timeouts/auth/application errors never retry. Deterministic fake tests for wrapped errors, callback attempt count, budget and no retry on connection loss.
Verification (root): `pnpm --filter @offscreen/db build && node --test packages/db/dist/test/db07-errors.test.js`. If integration fixture is unavailable, record NOT RUN and keep proof open; do not invent a harness or start shared stack.
Stop: named semantic/ownership/fixture contradiction; report exact evidence to planner.

## T02 | Managed transaction runner | READY

Requires: previous task accepted.
Read: packages/db/src/database.ts; packages/db/src/connection/admission.ts; packages/db/src/transaction/types.ts; packages/db/test/database.integration.ts.
May write: exact source/test destinations in algorithm, no peer ownership. 
Algorithm: Implement transaction/execute.ts against withClient: BEGIN/SET TRANSACTION chosen enum, set_config local statement/lock/idle, Drizzle transaction callback on same checked-out client; track commit phase; do not promise-race release; rollback on callback/deadline, destroy tainted client; retry only after known rollback. Use pinned implementation seam in EXECUTION.md; no nested transaction or fake Tx. Preserve existing caller transaction type. Fake test commit-unknown, timeout before commit, callback rejection, rollback failure, local timeout reset.
Verification (root): `pnpm --filter @offscreen/db build && node --test packages/db/dist/test/db07-transaction.test.js`. If integration fixture is unavailable, record NOT RUN and keep proof open; do not invent a harness or start shared stack.
Stop: named semantic/ownership/fixture contradiction; report exact evidence to planner.

Read [EXECUTION.md](EXECUTION.md) before dispatch. No further planner approval.
