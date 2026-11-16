# SA04 evidence | root-keyed lexical index reuse

**Date:** 2026-11-14. **Change:** [SA04](../../../../../../work/changes/archive/2026-11/storyteller/2026-11-14--sa04-root-index-reuse/CHANGE.md). **Provider spend:** none. **SA03:** deferred (ENG03 coordination).

## What landed

- `createLexicalStoryIndexCache` — LRU + optional durable store, coalesce in-flight builds, key = `storyId:rootHash:rootRevision:schemaVersion`
- `execution.ts` memory exploration resolves via cache (default process-local LRU)
- `pnpm memory:index-benchmark` reports cold/warm hits (`offscreen.memory-index-benchmark.v2`)
- Focused test: `packages/application/test/lexical-story-index-cache.test.mjs`

## Measured (this workstation)

| Scenes | Cold build | Warm hit | Builds |
| --- | --- | --- | --- |
| 200 | ~114 ms | `memory`, `buildMs=null` | 1 |
| 2000 | ~1147 ms | `memory`, `buildMs=null` | 1 |

Oracle retrieval/assembly counts unchanged vs prior indexed baseline shape (generation still not-run in this harness).

## Negatives proved

- Fork storyId cannot search under another story's identity
- Stale durable root/revision is not reused; rebuilds
- Corrupt durable snapshot falls back to rebuild
- Concurrent same-root resolves coalesce (one build)

## Commands

- `pnpm --filter @offscreen/application build`
- `node --test packages/application/test/lexical-story-index-cache.test.mjs`
- `pnpm memory:index-benchmark -- 200`
- `pnpm memory:index-benchmark -- 2000`
