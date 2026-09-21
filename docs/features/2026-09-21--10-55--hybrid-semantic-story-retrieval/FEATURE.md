# Hybrid semantic story retrieval

Status: Agreed
Approval: Approved as part of the owner's 2026-09-21 long-story memory priority; implementation must follow measured lexical and corpus baselines.

## Intended outcome

The memory system can recover relevant experiences described with different words while retaining the precision of exact state, identity links and lexical search. Semantic retrieval is an optional candidate generator behind the same authorization and evidence contract, not a new truth store.

## Representative flow

The player encounters a spiral-shaped residue without repeating the old phrase “coiled ash.” Exact/lexical search is weak, but a local embedding route retrieves the old episode. Hybrid rank fusion also returns an exact thread match, rejects a semantically similar private ritual and resolves the selected candidates back to current canonical records and exact source sections. If semantic indexing is unavailable or stale, the turn continues through explicit lexical/source fallback.

## Scope and boundaries

Includes local embedding-model evaluation, contextualized semantic units, versioned embeddings, story/branch/visibility/currentness filtering, incremental indexing/rebuild, lexical+dense rank fusion, optional local reranking, multilingual/paraphrase cases, latency/resource measurement and per-tier enablement. Hosted embeddings require separate data-destination and spending authorization. Similarity cannot establish identity, possession, chronology or truth. This feature does not mandate a vector database, graph, paid judge or semantic work on the minimal tier.

## Acceptance

- Hybrid retrieval improves labelled paraphrase recall over indexed lexical under the same final context budget without unacceptable forbidden/noise regression.
- Exact state and explicit links retain priority; stale/private/foreign candidates never leak.
- Model/version/source hashes and indexed-through coverage are inspectable and rebuildable.
- Disabled, unavailable and stale semantic routes degrade visibly to lexical/exact search.
- Local hardware latency, memory/disk use and incremental cost are recorded before selecting a backend.

## Decisions still needed

Embedding model, reranker and storage backend are experimental deliverables, not preselected architecture. Reject the semantic route if it does not beat the baseline enough to justify complexity.

## Owning specifications

[Long-story memory guide](../../engineering/long-story-memory-and-retrieval.md), [indexed retrieval](../2026-09-21--10-55--indexed-story-retrieval/FEATURE.md), [evaluation corpus](../2026-09-21--10-55--long-story-memory-evaluation/FEATURE.md), and [spending](../../../.agents/rules/spending.md).
