# CACHE03 | bounded Composer tasks

Frozen interfaces, ownership and wave gates: [CACHE-PARALLEL](../../../undertakings/storyteller-workshop/CACHE-PARALLEL.md). Lane-specific source and tests only; no shared-file changes during parallel dispatch. One child at a time, DEPTH=PATCH, Composer Standard. Receipt: paths, command/cwd, positive and negative result, limitations. Stop on exact contradiction; no research swarm.

## T01 | Single-flight and bulkhead

- Initial anchors: packages/cache/src/core; packages/story-engine/src/storyteller/lexical-story-index-cache.ts.
- Decided edit and proof: Implement bounded key/waiter admission, register before loader, matching cleanup, generation fencing, detached waiter cancellation, FIFO origin budget holds permit until actual settlement. Test 100 same-key callers, rejected leader, clear, cancellation, hung capacity.
- Verification (root): `pnpm --filter @offscreen/cache build`, `pnpm --filter @offscreen/cache test` (CACHE01 adds script); affected workspace build/typecheck; named focused domain test after planner pins fixture command. Shared manifests/lock and exports belong exclusively to the integration custodian; no lane edits them. Stop on missing prerequisite, fixture, authority or source contradiction; report exact symbol.

## T02 | Strategies

- Initial anchors: packages/cache/src/core; packages/cache/src/resilience/single-flight.ts; packages/story-engine/src/stories/reads.ts.
- Decided edit and proof: Implement frozen bindCache in strategies/index.ts (defineCache stays core-owned), immutable/versioned/expiring; actual observed identity/time, downward jitter injected RNG, safe invalid hit, source error preserved, writes harmless. Expiring shared writes skipped without monotonic fence. Test revision race, null, malformed hit, stale observation and refresh ordering.
- Verification (root): `pnpm --filter @offscreen/cache build`, `pnpm --filter @offscreen/cache test` (CACHE01 adds script); affected workspace build/typecheck; named focused domain test after planner pins fixture command. Shared manifests/lock and exports belong exclusively to the integration custodian; no lane edits them. Stop on missing prerequisite, fixture, authority or source contradiction; report exact symbol.

## T03 | Telemetry

- Initial anchors: packages/cache/src/core; packages/cache/src/strategies; packages/cache/src/core/cache-telemetry.ts. No dependency on Redis or edits outside strategy/single-flight/bulkhead ownership.
- Decided edit and proof: Bounded namespace/tier/outcome metrics and loader duration; no keys/IDs; isolate callback throw. Test hit/miss/bypass/coalesced/overload.
- Verification (root): `pnpm --filter @offscreen/cache build`, `pnpm --filter @offscreen/cache test` (CACHE01 adds script); affected workspace build/typecheck; named focused domain test after planner pins fixture command. Shared manifests/lock and exports belong exclusively to the integration custodian; no lane edits them. Stop on missing prerequisite, fixture, authority or source contradiction; report exact symbol.
