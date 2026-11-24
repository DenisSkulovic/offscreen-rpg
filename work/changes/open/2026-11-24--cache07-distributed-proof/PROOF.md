# CACHE07 proof receipt

Tier: **live run executed, not accepted**. Disposable local Redis ran. Restart did not show a cross-process hit, so this is not distributed PASS. No cross-Pod, capacity, production-readiness, or lease claim.

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
| `CACHE07_ALLOW_DISPOSABLE_REDIS=1 node packages/cache/test/distributed/harness.mjs --live` | FAIL. Disposable local Redis `redis:8.2.1-alpine` on Docker Desktop. T01 all PASS. T02 startup-outage, pause, burst-same-key, burst-distinct-keys, synthetic-failure, and shutdown PASS. Restart FAIL: after stop/start, the warmed key reloaded from origin and the second process did not observe an L2 hit. Process exit was 0 despite status FAIL, and the owned container was still present after the process ended. |

## Cases covered in source assertions

T01: shared hit, disabled parity, distinct revision, malformed envelope, eviction counter. T02: startup outage, restart, pause, same-key burst, distinct-key burst, synthetic origin failure, shutdown. Metrics helpers report nearest-rank p95/p99 from supplied samples. SDK pending/queue depth is unavailable on the worker surface; `packages/cache/src/cache03-single-flight.test.ts` remains the deterministic unit proof. No measured live counters exist.

## Limitations

The harness refuses a supplied `REDIS_URL`, a remote Docker context, and a container whose label, id, or port does not match the run. Unit tests use an injected command executor and do not call Docker. Missing image or daemon is defined as NOT-RUN with no pull. CACHE04 SQL proof stays independent and NOT-RUN.

## Cleanup

No container was created by this receipt.
