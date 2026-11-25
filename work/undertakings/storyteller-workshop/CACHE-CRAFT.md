# Cache craftsmanship wave | 2026-11-25

Baseline 9c2c29513a94e1ff6d1ad6a24f9baf939cfc33a6, main. Source-only owner commission. Keep typed byte store, versioned identity, origin bulkhead, local single-flight, Redis deadline/actual-settlement distinction, optional cache semantics. No wire format changes, no distributed locks, no changes to SQL authority or verification workloads.

- [CACHE09 Cache navigation and behavioral test names](../../changes/archive/2026-11/cache/2026-11-25--cache09-cache-navigation/CHANGE.md): Done (source). Mechanical source organization only; package tests 93/93; VER07/08 public imports unchanged; live NOT-RUN.
- [CACHE10 Memory and single-flight readability](../../changes/open/2026-11-25--cache10-cache-memory-concurrency/CHANGE.md): Ready. After CACHE09 source joined. Own memory and single-flight only; CACHE11 can run concurrently after CACHE09.
- [CACHE11 Redis envelope and bounded command executor](../../changes/archive/2026-11/cache/2026-11-25--cache11-cache-redis-execution/CHANGE.md): Done (source). Redis modules under `src/redis/`, envelope + shared command executor extracted, adapter composition thin; package tests 98/98; live NOT-RUN.
- [CQ06 Changed-code craftsmanship diagnostics](../../changes/archive/2026-11/other/2026-11-25--cq06-code-craft-diagnostics/CHANGE.md): Done (2026-11-25). Advisory AST/naming/boundary diagnostics and scoped `--base` report; independent of cache Changes.

## Held design: CACHE12 (not commissioned)
Retire cache-port only after exact caller migration is frozen. Current cache adapter exposes cache:ReadCache and store:CacheStore; story-engine/stories/read-cache-options.ts exports legacy port and newer StorySnapshotCache; reads.ts has fallback and authorization/revision-sensitive publication. API composition already passes newer store. Need full caller/test/manifest/lockfile/graph mapping and decision on no-cache direct-origin vs disabled-store bulkhead behavior. No Cursor discovery or removal yet. VER08 actual story snapshot fixtures must retain owner denial before lookup and built-identity race proof. Existing CACHE04/07 history is not current live evidence.

## Readiness review
G0 current main, existing instructions and source anchors checked; G1 no new architecture authority except additive quality diagnostics; G2 mechanical ownership map and behavior invariants selected; G3 bounded tasks use explicit anchors and tests; G4 CACHE09 and CQ06 source Done; G5 CACHE10/CACHE11 unblocked after CACHE09 join, shared README/catalog joins serialized; G6 focused negative cases and actual-settlement invariant explicit; G7 source only, no live permission. CACHE12 blocked on caller and semantics mapping, not a predecessor delay.

VER07/VER08 retain public APIs and own verification scenarios; coordinate any mechanical path conflict. No new completion credit, see [overview](OVERVIEW.md).
