# SA05 | Trace exact evidence from source through final model packet and publication

**State: Proposed / design-complete 2026-11-14. No code authorization.** Dependency SA01 strongly preferred; can be implemented before SA04 cache if both measure. Program [SA queue](../../storyteller-architecture/implementation-program.md).

## Cursor first-screen

> **Outcome:** for a known old promise or gift, tests can distinguish *stored*, *eligible*, *discovered*, *exact loaded*, *in final provider request*, *cited/used in candidate*, and *published faithfully*. There is no “the model knew it” claim from a source that was pruned before final.
>
> **Authority:** [six-stage evidence pipeline](../../storyteller-architecture/context-and-retrieval.md#the-six-stage-retrieval-pipeline), [end-to-end proof](../../storyteller-architecture/context-and-retrieval.md#end-to-end-retrieval-contract-and-proof), [historical missed descriptive materialization](../../engineering/connected-poc-proof.md).
>
> **Source:** `packages/application/src/storyteller/context.ts::loadStorytellerContext`, `packages/storyteller/src/context/index.ts::boundStorytellerContext/contextRequestSections`, `application/storyteller/memory-exploration-controller.ts::runMemoryExploration`, `storyteller/src/tasks/memory-exploration.ts::memoryEvidenceUseSchema`, `application/storyteller/publication.ts`.

## Intended code delta

1. Add an *observability-only, typed* private `CapturedContextManifest` to task/trace (or sidecar) with source IDs, root, source visibility/authority, **required vs optional reasons**, selected/omitted IDs, actual final-message source handle+hash, packet bytes and rejected/coverage cause. No new source-of-truth DB; keep existing task version backward readable.
2. Instrument provenance for memory-loop evidence `itemIds/sourceIds` and private creative directions; validate that cited evidence was **actually in final model packet** and that temporary m#/s# handles are not used as canonical descriptive-note sources. Preserve existing strict result/proposal validation and source version fences.
3. Create deterministic two-path fixtures: old gift+recipient later recalled after unrelated passages, and rumor corrected later; include fork/near-duplicate identities and a deliberately selected-then-pruned source. Trace differentiates “retrieval missed” vs “model ignored” vs “publication rejected.”
4. Make omission reasons real. Missing mandatory source fails before provider dispatch, no-match/partial optional context is reported, never turned into false definitive lore. Do not automatically read all history to satisfy the trace.
5. Record output in SA01 manifest and source-specific test assertions, not in global logs or user-visible client DTOs.

## Acceptance / negative

**Normal:** real source `p17` and relationship record visible in captured final JSON; final candidate legitimately refers to prior event and published result respects it. A source omitted due to budget is correctly reported unused.

**Negative:** fake s# citation, stale root, duplicate memory handle, unsupported claim from lead-only snippet, invisible private plan and mismatched viewer/fork all reject; a correct document merely *loaded* but not sent doesn't falsely pass. Existing no-memory cheap task remains valid.

**Proof:** `pnpm storyteller:packet-audit`, targeted `@offscreen/storyteller` validation tests, `long-story-memory-evaluation.test.mjs` provider-free. Disposable SQL publication integration only after owner approval. No actual LLM, no new models/tool calls, no user-facing source leak. **Out:** GM05 public event feed, new persistent transcript, rewritten game mechanics.
