# SA04 | Reuse a versioned lexical story index instead of rebuilding every exploration

**State: Proposed / design-complete 2026-11-14. No code authorization.** Program [SA queue](../../storyteller-architecture/implementation-program.md).

## Cursor first-screen brief

> **Goal:** a second memory-investigation task on the same immutable canonical root uses an existing validated index (or rebuilds only when needed) instead of rereading all source passages/Markdown. A new root, fork or privacy scope cannot accidentally use the old index.
>
> **Authority:** [retrieval/index design](../../storyteller-architecture/context-and-retrieval.md#sql-and-cas-efficiency), [long-memory evaluation](../../engineering/long-story-memory-and-retrieval.md), [source facts](../../storyteller-architecture/evidence/current-flow-audit-2026-11-14.md#trace-e-what-the-engine-calls-an-agentic-loop).
>
> **Source:** `packages/application/src/storyteller/lexical-story-index.ts::buildLexicalStoryIndex/restoreLexicalStoryIndex`, `application/storyteller/execution.ts::createStorytellerExecution`, current `memory-index-benchmark` script, `docs/technical/canonical-files.md` and existing memory oracle tests.

## Desired delta

1. Introduce a **root-hash + rootRevision + indexed-unit schema/tuning version** keyed, read-only cached derivative index. The index is never game canon; source manifest hash and story/visibility scope remain mandatory at query/read.
2. Reuse existing `LexicalStoryIndex.snapshot/restore` and rebuild from approved CAS only on cache miss/schema mismatch/new root. Choose the **smallest cache/storage interface that current app needs**: local worker/LRU or existing local index store; do not create Redis/Elastic/Kafka service or unbounded process Map by default. Concurrency across requests for the same root must coalesce or safely dedupe index build.
3. Preserve exact source/body hashes and permission before returning any read. Forked story with superficially same title must not inherit another branch's private index. Reindexed old root may remain for historical authorized tasks; do not treat it as current.
4. Benchmark first cold build vs subsequent warm query and new-root rebuild at 200 and 2000 scenes. Measure storage size, CAS reads, wall time, bytes, query accuracy/coverage and disposal. Existing retrieval test oracle expected/forbidden labels must not change to make cache pass.

## Acceptance / negative

**Normal:** same captured root two investigations: second avoids full-body reconstruction and returns byte-identical candidate IDs/ordering/coverage under same tuning. Rebuild after a real root revision only when necessary, no model calls.

**Negative:** stale root, fork, private-vs-public, corrupt cache snapshot, failed storage/restart and changed schema never return mismatched sources; fallback to validated rebuild, not fake empty matches. Cached index cannot assert mechanical fact or shift story clock.

**Proof:** `pnpm memory:index-benchmark`, existing `long-story-memory-evaluation.test.mjs`, focused snapshot/permission tests. Any persisted index database or broad SQL benchmark needs explicit disposable store approval. No provider spend/cloud deployment. Return measured cold/warm/rebuild counts and cache scope proof. **Out:** paid embeddings, semantic graph, frontend asset cache, changing canonical root format.
