# CACHE05 | bounded Composer tasks

One child at a time, DEPTH=PATCH, Composer Standard. Receipt: paths, command/cwd, positive and negative result, limitations. Stop on exact contradiction; no research swarm.

## T01 | Weighted LRU

- Initial anchors: packages/cache/src/core; packages/cache/src/adapters.
- Decided edit and proof: Memory store aggregate bytes/count, overhead, clock, expired removal, recency, copy buffers, reject oversize. Test mutation, eviction, expiry, exact admission and tiny entries.
- Verification (root): `pnpm --filter @offscreen/cache build`, `pnpm --filter @offscreen/cache test` (CACHE01 adds script); affected workspace build/typecheck; named focused domain test after planner pins fixture command. Parent owns shared manifests/lock. Stop on missing prerequisite, fixture, authority or source contradiction; report exact symbol.

## T02 | Tiered store

- Initial anchors: packages/cache/src/adapters/memory-store.ts; packages/cache/src/adapters/redis-store.ts; packages/cache/src/core.
- Decided edit and proof: L1 then L2 then origin; promotion retains absolute expiry; invalid hit misses, writes independent. Test L2 3s remaining, degraded Redis and independent failure.
- Verification (root): `pnpm --filter @offscreen/cache build`, `pnpm --filter @offscreen/cache test` (CACHE01 adds script); affected workspace build/typecheck; named focused domain test after planner pins fixture command. Parent owns shared manifests/lock. Stop on missing prerequisite, fixture, authority or source contradiction; report exact symbol.
