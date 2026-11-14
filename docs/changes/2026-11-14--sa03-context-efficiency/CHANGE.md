# SA03 | Bound context I/O to relevant live state and selected canonical evidence

**State: Proposed / design-complete 2026-11-14; execution depends on current ENG03 source ownership.** No code authorization. [SA program](../../storyteller-architecture/implementation-program.md).

## Cursor first-screen brief

> **Outcome:** assembling a Storyteller task for a story with 2,000 archived activities does **not** scan/materialize all terminal activities or every eligible descriptive document; all required active/accepted truth and source handles remain in the final valid packet.
>
> **Authority:** [context authority](../../storyteller-architecture/context-and-retrieval.md), [current I/O observation](../../storyteller-architecture/evidence/current-flow-audit-2026-11-14.md#source-dependent-risks-found), [ENG03 owner](../../engine-architecture/decisions/eng03-instrument-before-refactor.md).
>
> **Source:** `packages/application/src/storyteller/context.ts::loadStorytellerContext`, `storyteller/canonical-knowledge.ts::loadCanonicalKnowledge`, `packages/storyteller/src/context/index.ts::boundStorytellerContext`, `packages/db/src/schema/campaign.ts::gameActivity`, existing long-story memory fixture/tests.

## Scope and decision

1. Replace `SELECT all gameActivity rows by story` + JS state filter with an indexed or bounded projection of **current active/nonterminal commitments**, preserving retained interrupted work and accepted-plan handoff. Confirm against ENG04 public Now filter without blindly reusing a wrong DTO.
2. Introduce *metadata-first* canonical candidate selection within existing root/manifest contract. Only eagerly read **required** exact documents and a small selected optional set. Catalogue exposes name/kind/ID/source/visibility/bytes and omission; do not load up to 64 bodies merely to make the final context drop most.
3. Preserve mandatory current passage, note sources and complete active-scene window. If one required object is unavailable or cannot fit output reserve, **hold**, not silently remove. Current canonical hashes, source permission, rule section and evidence handle remain exact.
4. Instrument source counts, exact bytes and final request handles through SA01 trace. Test no authorized source disappears when reordering operations; avoid adding another SQL lock while optimizing.
5. **Coordinate with ENG03**: do not move slow DocumentStore I/O outside the write lock in this packet or create speculative capture DTO. SA03 minimizes read work only. If ENG03 is simultaneously changing `context.ts`, stop and rebase/sequence rather than overwriting.

## Acceptance / negative

**Normal:** provider-free 2k archived activities, one running/one suspended activity, 64 doc catalogue entries, 1 required relationship and 1 optional reference: output includes live and exact mandatory facts with dramatically lower unrelated row/body reads. Compare 20/200/2k scales, actual counts/timings, before/after current packet hash and omission trace.

**Negative:** an interrupted retained activity is not pruned; old source chosen wrongly doesn't override current item; missing required source fails; private/unrelated story docs remain excluded; root changes cannot reuse old content; source context does not leak during SQL rollback.

**Proof:** `pnpm --filter @offscreen/application build`; focused context/retrieval unit fixtures; `pnpm memory:index-benchmark` for related no-provider metrics. **Disposable SQL execution requires explicit owner approval**. No production DB, cloud I/O, provider paid calls or destructive migrations. **Out:** full ENG03 task capture, new vector store, user-tier grants, novel mechanic. Return row/body read numbers and required-source equivalence.
