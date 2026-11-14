# SA01 evidence sample | redacted operation trace

**Date:** 2026-11-14. **Change:** [SA01](../../changes/2026-11-14--sa01-operation-trace/CHANGE.md). **Provider spend:** none.

## What landed

- Schema/builder: `packages/storyteller/src/providers/operation-trace.ts` (`storyteller-operation-trace.v1`).
- Fixtures: `operation-trace-fixtures.ts` (opening, ordinary consequence, memory exploration, historical report, failed/uncertain, stale publication, interrupted, loaded-then-omitted, duplicate delivery).
- `pnpm storyteller:packet-audit` now also writes `operation-traces.json`, `operation-traces.md` and per-scenario JSON under `operation-traces/`.

## Normal proof (provider-free)

| Scenario | Expectation | Observed |
| --- | --- | --- |
| memory-exploration | source `x1` linked through final packet; published | `reads.count=1`; `finalIncludedHandles` includes `x1`; publication `published` |
| ordinary-consequence | single-shot, 0 reads | `reads.count=0`; `paidProviderRounds=0` |
| interrupted-generation | no fake published scene | publication `interrupted`; `publishedPassageId=null` |

## Negative proof

| Case | Expectation | Observed |
| --- | --- | --- |
| loaded-then-omitted | loaded `p2` omitted from final | omitted reason `loaded-then-pruned-from-final-packet`; not in `finalIncludedHandles` |
| duplicate-delivery | no new paid round | `paidProviderRounds=0`; replay span `status=replayed` |
| story isolation | story B absent from story A receipt | `assertOperationTraceStoryIsolation` |
| usage/cache | stay unknown without external report | `inputTokens=null`; `cacheHit=null`; markdown says tokens/cache unknown |
| redaction | no prompt/source bodies or secrets in export | `promptBodies/sourceBodies=omitted`; serialize refuses `sk-` / Bearer |

## Actual unknowns (honest)

- Live `createStorytellerExecution` / `runMemoryExploration` / `publishStorytellerResult` do **not** yet emit this trace at runtime; SA01 is fixture/lab instrumentation reusable by later packets.
- `inputTokens`, `cacheHit`, real provider duration and settled microusd remain null unless a later Change supplies reported usage.
- Prefix-byte overlap from request audit is still not treated as a cache discount.

## Commands

- `pnpm --filter @offscreen/storyteller build`
- `pnpm --filter @offscreen/storyteller test`
- `pnpm storyteller:packet-audit`
