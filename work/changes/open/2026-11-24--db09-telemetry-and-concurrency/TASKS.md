# DB09 | bounded Composer tasks

Base SHA 7322b6f1a6df6f5ae612763b9786563dca2989eb; state Proposed / planner-gated. [Program and frozen contracts](../../../undertakings/storyteller-workshop/DB-PARALLEL.md). Shared path lock: integration custodian; own named paths only. MODEL=Composer Standard | DEPTH=PATCH. One child at a time, no research swarm. Receipt: exact paths, command/cwd, positive/negative, limitations, branch SHA.

## T01 | Telemetry implementation | PLANNER-BLOCKED until promotion

Requires: DB06 + DB07; no schema consumer edits.
Read: packages/db/src/telemetry/types.ts; packages/db/src/connection/admission.ts; packages/db/src/transaction/execute.ts.
May write: exact source/test destinations in algorithm, no peer ownership. 
Algorithm: Implement safe sink and snapshot counters, stable registered names, closed workload/outcome/error, monotonic elapsed time; wrap managed paths only, no SQL text/parameters/credentials. Observer exceptions isolated. No duplicate pg listeners. Tests sink throw, saturation, rollback/retry/unknown commit counters and no raw fields.
Verification (root): `pnpm --filter @offscreen/db build && node --test packages/db/dist/test/db09-telemetry.test.js`. If integration fixture is unavailable, record NOT RUN and keep proof open; do not invent a harness or start shared stack.
Stop: named semantic/ownership/fixture contradiction; report exact evidence to planner.

## T02 | Concurrency helpers | PLANNER-BLOCKED until promotion

Requires: previous task accepted.
Read: packages/db/src/transaction/types.ts; packages/db/src/transaction/execute.ts; packages/story-engine/SQL-OWNERSHIP.md.
May write: exact source/test destinations in algorithm, no peer ownership. 
Algorithm: Add explicit expectOneAffected(count) typed conflict and acquireTransactionAdvisoryLock(tx, integer key) parameterized xact lock; no global lock IDs invented; no business semantics or automatic retries. Test zero/multiple count, parameterized lock and same tx only; no domain adoption.
Verification (root): `pnpm --filter @offscreen/db build && node --test packages/db/dist/test/db09-concurrency.test.js`. If integration fixture is unavailable, record NOT RUN and keep proof open; do not invent a harness or start shared stack.
Stop: named semantic/ownership/fixture contradiction; report exact evidence to planner.
