# CACHE07 proof receipt

Tier: **source-only**. Two-process plus disposable local Redis proof is **NOT-RUN**. No cross-Pod, capacity, production-readiness, or lease claim.

## Source

- Worktree: `/home/dskul/projects/offscreen-rpg-cache07`
- Branch: `change/cache07-distributed-proof`
- Implementation base: `1a42b1416b7e0c76dca3dd88e9cad2395a4413d4`
- Files: `packages/cache/test/distributed/worker.mjs`, `harness.mjs`, `harness.test.mjs`

## Commands

| Command | Result |
| --- | --- |
| `pnpm --filter @offscreen/cache build` | PASS |
| `pnpm --filter @offscreen/cache test` | PASS (76/76) |
| `node --test packages/cache/test/distributed/harness.test.mjs` | PASS (19/19) |
| `CACHE07_ALLOW_DISPOSABLE_REDIS=1 node packages/cache/test/distributed/harness.mjs --live` | NOT-RUN. Owner has not authorized the disposable local Docker Redis fixture. |

## Cases covered in source assertions

T01: shared hit, disabled parity, distinct revision, malformed envelope, eviction counter. T02: startup outage, restart, pause, same-key burst, distinct-key burst, synthetic origin failure, shutdown. Metrics helpers report nearest-rank p95/p99 from supplied samples. SDK pending/queue depth is unavailable on the worker surface; `packages/cache/src/cache03-single-flight.test.ts` remains the deterministic unit proof. No measured live counters exist.

## Limitations

The harness refuses a supplied `REDIS_URL`, a remote Docker context, and a container whose label, id, or port does not match the run. Unit tests use an injected command executor and do not call Docker. Missing image or daemon is defined as NOT-RUN with no pull. CACHE04 SQL proof stays independent and NOT-RUN.

## Cleanup

No container was created by this receipt.
