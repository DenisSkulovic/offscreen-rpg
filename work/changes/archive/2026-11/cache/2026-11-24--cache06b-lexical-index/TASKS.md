# CACHE06B | bounded Composer tasks

Frozen interfaces, ownership and wave gates: [CACHE-PARALLEL](../../../../undertakings/storyteller-workshop/CACHE-PARALLEL.md). Lane-specific source and tests only; no shared-file changes during parallel dispatch. One child at a time, DEPTH=PATCH, Composer Standard. Receipt: paths, command/cwd, positive and negative result, limitations. Stop on exact contradiction; no research swarm.

## T01 | Local reuse

- Initial anchors: packages/story-engine/src/storyteller/lexical-story-index-cache.ts; packages/story-engine/src/storyteller/lexical-story-index.ts; packages/cache/src/resilience/single-flight.ts.
- Decided edit and proof: Replace private map/inflight with createWeightedLru and createSingleFlight; restoreLexicalStoryIndex(snapshot) for copy isolation, 32 MiB cap and default maxEntries 8; guard local remember via canPublish; preserve storyId/rootHash/rootRevision/schema, result/stats/maxEntries; weight validated serialized snapshot plus overhead, isolate index mutation. Durable artifact stays domain-owned.
- Verification (root): `pnpm --filter @offscreen/cache build`, `pnpm --filter @offscreen/cache test` (CACHE01 adds script); affected workspace build/typecheck; node --test tools/api-integration/legacy-engine-tests/lexical-story-index-cache.test.mjs after planner confirms actual imports and dependency builds. Shared manifests/lock and exports belong exclusively to the integration custodian; no lane edits them. Stop on missing prerequisite, fixture, authority or source contradiction; report exact symbol.

## T02 | Failure proof

- Initial anchors: packages/story-engine/src/storyteller/lexical-story-index-cache.ts; packages/story-engine/src/storyteller/local-lexical-story-index-store.ts; packages/story-engine/src/storyteller/lexical-story-index.ts; tools/api-integration/legacy-engine-tests/lexical-story-index-cache.test.mjs.
- Decided edit and proof: Artifact read failure falls back, write failure preserves build, clear/invalidate fences late local population, wrong root/schema rejected, build failure clears matching entry. Test coalescing, fork isolation, byte eviction and failures.
- Verification (root): `pnpm --filter @offscreen/cache build`, `pnpm --filter @offscreen/cache test` (CACHE01 adds script); affected workspace build/typecheck; named focused domain test after planner pins fixture command. Shared manifests/lock and exports belong exclusively to the integration custodian; no lane edits them. Stop on missing prerequisite, fixture, authority or source contradiction; report exact symbol.
