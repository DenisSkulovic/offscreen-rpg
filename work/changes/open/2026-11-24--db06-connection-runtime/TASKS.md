# DB06 | bounded Composer tasks

Base SHA fa77f2d3614ee821b8e4ad849a46a66342000132; state Proposed / planner-gated. [Program and frozen contracts](../../../undertakings/storyteller-workshop/DB-PARALLEL.md). Shared path lock: integration custodian; own named paths only. MODEL=Composer Standard | DEPTH=PATCH. One child at a time, no research swarm. Receipt: exact paths, command/cwd, positive/negative, limitations, branch SHA.

## T01 | Config and FIFO admission | PLANNER-BLOCKED until promotion

Requires: DB01; independent of schema relocation and migration runner.
Read: packages/db/src/config.ts; packages/db/src/database.ts; packages/db/test/config.test.ts.
May write: exact source/test destinations in algorithm, no peer ownership. 
Algorithm: Preserve existing config shape/defaults; add optional managed fields via separate parsed object or optional properties preserving hand-built fixture config. Implement src/connection/admission.ts bounded FIFO, max20 waiters, monotonic deadline, abort before admission, saturation, close drains/refuses. Permit held until actual settled work, late acquire releases immediately. Fake-clock tests for overflow, abort, timeout, close, FIFO, late acquire.
Verification (root): `pnpm --filter @offscreen/db build && node --test packages/db/dist/test/db06-admission.test.js packages/db/dist/test/config.test.js`. If integration fixture is unavailable, record NOT RUN and keep proof open; do not invent a harness or start shared stack.
Stop: named semantic/ownership/fixture contradiction; report exact evidence to planner.

## T02 | Managed pool lifecycle | PLANNER-BLOCKED until promotion

Requires: previous task accepted.
Read: packages/db/src/database.ts; packages/db/src/connection/admission.ts; packages/db/test/database.integration.ts.
May write: exact source/test destinations in algorithm, no peer ownership. 
Algorithm: Preserve db/checkConnection/close signatures; add managed withClient seam (frozen program), pg Pool injectable factory; pool error handling safe, idempotent close, one checkout per operation. Probe bounded through admission; no direct raw DB calls silently marked managed. Fake tests late acquisition after close, callback throw, double close, tainted release and no premature permit release.
Verification (root): `pnpm --filter @offscreen/db build && node --test packages/db/dist/test/db06-pool.test.js`. If integration fixture is unavailable, record NOT RUN and keep proof open; do not invent a harness or start shared stack.
Stop: named semantic/ownership/fixture contradiction; report exact evidence to planner.
