# CACHE05 | bounded Composer tasks

Frozen interfaces, ownership and wave gates: [CACHE-PARALLEL](../../../undertakings/storyteller-workshop/CACHE-PARALLEL.md). Lane-specific source and tests only; no shared-file changes during parallel dispatch. One child at a time, DEPTH=PATCH, Composer Standard. Receipt: paths, command/cwd, positive and negative result, limitations. Stop on exact contradiction; no research swarm.

## T01 | Weighted LRU

- Initial anchors: packages/cache/src/core; packages/cache/src/adapters.
- Decided edit and proof: Implement frozen createWeightedLru and createMemoryStore; charge fixed 128 bytes overhead plus value weight. Memory store aggregate bytes/count, overhead, clock, expired removal, recency, copy buffers, reject oversize. Test mutation, eviction, expiry, exact admission and tiny entries.
- Verification (root): `pnpm --filter @offscreen/cache build`, `pnpm --filter @offscreen/cache test` (CACHE01 adds script); affected workspace build/typecheck; named focused domain test after planner pins fixture command. Shared manifests/lock and exports belong exclusively to the integration custodian; no lane edits them. Stop on missing prerequisite, fixture, authority or source contradiction; report exact symbol.

## T02 | Tiered store

- Initial anchors: packages/cache/src/adapters/memory-store.ts; packages/cache/src/core/cache-store.ts and core fake store; packages/cache/src/core.
- Decided edit and proof: Implement createTieredStore over two injected CacheStore instances; no concrete Redis or strategy imports. L1 then L2; strategy owns origin; promotion retains absolute expiry; invalid hit misses, writes independent. Test L2 3s remaining, degraded Redis and independent failure.
- Verification (root): `pnpm --filter @offscreen/cache build`, `pnpm --filter @offscreen/cache test` (CACHE01 adds script); affected workspace build/typecheck; named focused domain test after planner pins fixture command. Shared manifests/lock and exports belong exclusively to the integration custodian; no lane edits them. Stop on missing prerequisite, fixture, authority or source contradiction; report exact symbol.
