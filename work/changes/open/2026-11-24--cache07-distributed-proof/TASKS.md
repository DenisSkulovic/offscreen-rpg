# CACHE07 | bounded Composer tasks

One child at a time, DEPTH=PATCH, Composer Standard. Receipt: paths, command/cwd, positive and negative result, limitations. Stop on exact contradiction; no research swarm.

## T01 | Two-consumer harness

- Initial anchors: packages/cache/src/adapters/redis-store.ts; infra/kubernetes/lab/redis/redis.yaml; existing K8S10 harness.
- Decided edit and proof: Two independent processes, isolated Redis and counting fake origin; warm shared hit, disabled parity, eviction and malformed bytes. No shared flush.
- Verification (root): `pnpm --filter @offscreen/cache build`, `pnpm --filter @offscreen/cache test` (CACHE01 adds script); affected workspace build/typecheck; named focused domain test after planner pins fixture command. Parent owns shared manifests/lock. Stop on missing prerequisite, fixture, authority or source contradiction; report exact symbol.

## T02 | Fault proof

- Initial anchors: packages/cache/src/runtime/redis-connection.ts; packages/cache/src/resilience; existing owned fault harness.
- Decided edit and proof: Startup outage, restart, slow commands, burst cold reads, origin overload/failure, shutdown. Record p95/p99, max pending/queue, origin amplification/recovery; reconnect without restart. No lease claim.
- Verification (root): `pnpm --filter @offscreen/cache build`, `pnpm --filter @offscreen/cache test` (CACHE01 adds script); affected workspace build/typecheck; named focused domain test after planner pins fixture command. Parent owns shared manifests/lock. Stop on missing prerequisite, fixture, authority or source contradiction; report exact symbol.

## T03 | Evidence

- Initial anchors: packages/cache/README.md; docs/technical/platform/persistence-and-caching.md; K8S10 evidence route.
- Decided edit and proof: Record measured tier and failures; planner decides if measured cross-process duplication merits future lease Change. No synthetic cross-Pod claims.
- Verification (root): `pnpm --filter @offscreen/cache build`, `pnpm --filter @offscreen/cache test` (CACHE01 adds script); affected workspace build/typecheck; named focused domain test after planner pins fixture command. Parent owns shared manifests/lock. Stop on missing prerequisite, fixture, authority or source contradiction; report exact symbol.
