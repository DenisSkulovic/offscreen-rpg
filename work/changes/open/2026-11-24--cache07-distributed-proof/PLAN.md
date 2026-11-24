# CACHE07 | exact proof fixture and execution authorization boundary

Source baseline c0d3c283e60e1c06d627f9a9b96603f7294d5202. Wave 2 source joined; CACHE04 SQL proof remains NOT-RUN, not a prerequisite to this isolated cache mechanism proof. Source implementation of the following new harness is commissioned and Ready. Actual Docker run requires explicit owner permission; it does not require any additional planner decision or pre-existing fixture. No K8S10 harness dependency. No Kubernetes, SQL, provider, S3, real story data, shared Redis or cluster operations.

## Fixture (new files, not claimed to exist)

- packages/cache/test/distributed/worker.mjs: child process using public @offscreen/cache root createCacheAdapter, /core defineCache and makeCacheKey, /codecs jsonCodec, /strategies bindCache, /memory as needed. Node child_process.fork with IPC. Parent sends init/read/burst/close; child returns request id, outcome/value, duration, origin loads, active/peak origin work, telemetry outcome counters. Never send raw connection credentials or source content in receipt. One persistent adapter and binding per child across commands and restarts. Synthetic value {id, revision} validated by explicit parser, no real data. Origin increments count before delay, optionally throws named synthetic error. Same identity and environment in both workers. Use only actual public entrypoints; no fake transport in live cases.
- packages/cache/test/distributed/harness.mjs: parent exports pure configuration/ownership validation, percentile computation and scenario assertions; CLI runs only with exact --live flag and env CACHE07_ALLOW_DISPOSABLE_REDIS=1. Reject any supplied REDIS_URL; build env from only generated endpoint. Use Docker CLI via execFile/spawn, no shell. Check local Docker context endpoint is unix socket or Windows named pipe, reject remote TCP/SSH context. Inspect local image redis:8.2.1-alpine (same pinned tag as lab manifest); --pull=never; missing image/daemon => NOT-RUN, no automatic pull. Generate UUID container name cache07-<uuid>, ownership label offscreen.cache07.run=<uuid>, --network bridge, -p 127.0.0.1::6379, --memory 128m --cpus 0.5 --read-only --tmpfs /data:rw,size=32m --cap-drop ALL --security-opt no-new-privileges, no volumes or host mounts. redis-server --save "" --appendonly no --maxmemory 8mb --maxmemory-policy allkeys-lru --protected-mode no. Discover assigned loopback port via docker inspect, verify container ID, image, label and port before any command; no arbitrary URL. Own container only, never flush. Start/stop/restart only by verified ID; use docker rm -f on verified owned ID in finally; verify absence; bound commands <=10s, entire suite <=180s, kill owned children on timeout. No docker prune, no global cleanup. If resource unavailable report NOT-RUN with reason. Parent never touches shared container, service or port. Startup outage case stop owned container before worker init, restart same ID afterward. Slow command case docker exec owned ID redis-cli CLIENT PAUSE 350 ALL (bounded), no DEBUG commands. Redis direct admin client only to generated loopback for malformed test key and INFO counters; disconnect finally. Fixed small test load (<=64 requests per burst, <=128 unique writes of <=256KiB), no resource escalation.
- packages/cache/test/distributed/harness.test.mjs: no Docker or network required; test refusal without explicit live opt-in, external endpoint/remote context refusal, wrong label/id/port refusal, bounded cleanup and mock CLI failure, percentile and scenario verdict tests. Use injected fake command executor; never call real Docker from unit tests.

## Exact commands (root)

Source proof (immediately executable after files implemented):
```sh
pnpm --filter @offscreen/cache build
pnpm --filter @offscreen/cache test
node --test packages/cache/test/distributed/harness.test.mjs
```

Live proof (only after owner explicitly authorizes disposable local Docker Redis; one command runs both T01/T02, no separate approval after permission):
```sh
CACHE07_ALLOW_DISPOSABLE_REDIS=1 node packages/cache/test/distributed/harness.mjs --live
```
No automatic live invocation in pnpm test. CLI emits a bounded redacted JSON result to stdout; optional receipt path in worktree ignored out/cache07/receipt.json, no secrets. Per-case PASS/FAIL/NOT-RUN, source SHA, elapsed, counts and cleanup. Nonzero exit on failure or missing fixture. A skipped live run never earns distributed PASS.

## T01 assertions

Policy namespace cache07-proof, version 1, environment cache07-<short uuid>, immutable, jsonCodec parser, ttlMs 30000, jitterRatio 0, maxEntryBytes 262144, maxActiveKeys 16, maxWaitersPerKey 32, originConcurrency 4, originQueueLimit 16, originQueueTimeoutMs 200. Redis connect 500ms/op100ms. Sequential A read then B same identity: exact value and total origin loads 1; disabled adapter same value with no Redis hit; different revision distinct key. Inject malformed envelope at makeCacheKey-generated test key only, read must recover exact origin value and increment load once. Bounded unique-key pressure until INFO evicted_keys increases, detect at least one actual previously populated key absent then read exact origin value. Do not infer eviction from a miss without eviction counter. No global flush.

## T02 assertions

Startup outage: initialize worker against stopped owned container, successful origin fallback, restart same container, poll fresh identity with bounded <=25s recovery until cross-process hit without restarting worker. Restart: previously warmed key lost, read exact origin value, then shared hit. Pause: bounded client response or exact origin fallback, recovery after pause. Burst same key within one process <=32 concurrent callers => one origin load while cold; two processes may produce <=2 loads, no distributed lease claim. Distinct-key burst <=64: bounded origin concurrency <=4 per worker, typed CacheOverloadError allowed, no arbitrary origin fallback; synthetic origin failure propagates, subsequent retry succeeds. Worker close completes within bounded 5s and exits; no orphan process/container. Report measured nearest-rank p95/p99 per case, sample count, origin loads per distinct key, peak actual origin concurrency, telemetry overload/coalesced counts and recovery time. Do not fabricate SDK pending/queue metrics if not exposed: report unavailable and cite existing deterministic unit proof instead; no p95 SLA inferred. Any violated invariant FAIL, do not weaken to pass. Production bug discovered => report exact reproducer and planner-owned correction; no unsolicited runtime rewrite.

## Evidence

T03 writes PROOF.md with exact source SHA, commands, cases, redacted counters, tier (source-only or two OS processes + disposable local Redis), limitations and cleanup. Update canonical realization and package README only as observed; CACHE04 SQL proof stays open separately. No cross-Pod, load capacity, production readiness or lease decision inferred. If live permission absent, integrate harness source as partial progress under normal Change procedure, keep CACHE07 open with T02 live NOT-RUN, no archive. No fresh authorization necessary to implement source.
