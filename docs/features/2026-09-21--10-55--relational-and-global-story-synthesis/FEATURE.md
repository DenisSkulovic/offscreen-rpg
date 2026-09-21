# Relational and global story synthesis

Status: Agreed
Approval: Approved as the final measured layer of the owner's 2026-09-21 long-story memory program, not as an excuse to delay the local-memory core.

## Intended outcome

Very long campaigns can answer multi-hop and broad questions—how people, places and events connect; what changed across an era; which pressures remain unresolved—without pretending that top-k chunks or one campaign summary provide global understanding.

## Representative flow

After hundreds of scenes, the player asks why Greywake distrusts the road wardens. The system traverses admitted person/place/thread links to relevant episodes, groups source-backed findings across periods, and produces a cited query-focused overview. It distinguishes public history from one NPC's rumor and the current repaired road from earlier failures. A focused “who holds the key?” question bypasses this machinery and uses exact state.

## Scope and boundaries

Includes bounded one-hop/multi-step traversal over admitted links, query-focused map/reduce synthesis, optional hierarchical summaries, and an experimental derived graph/community route only when simpler retrieval fails benchmark cases. Derived edges and summaries remain lower-authority, versioned and source-linked. Global work is a separately configured cost class with cache/watermark/invalidation evidence. This feature does not create autonomous world simulation, make inferred relationships canonical, run on every turn or replace exact/local retrieval.

## Acceptance

- Multi-hop oracle questions recover source-backed chains without crossing visibility or branch boundaries.
- Broad catch-up/theme questions materially beat flat top-k retrieval under declared budgets.
- Current state and historical/attributed claims remain distinguishable in synthesis.
- Source changes invalidate affected derived artifacts and expose stale coverage.
- If graph/community or hierarchy adds insufficient value, the evaluated simpler map/reduce path is the accepted outcome.

## Decisions still needed

Whether any graph/community or RAPTOR-like hierarchy earns its maintenance cost. The benchmark—not architectural taste—decides.

## Owning specifications

[Long-story memory guide](../../engineering/long-story-memory-and-retrieval.md), [episodic memory](../2026-09-21--10-55--episodic-memory-and-source-navigation/FEATURE.md), [hybrid retrieval](../2026-09-21--10-55--hybrid-semantic-story-retrieval/FEATURE.md), and [context/cost](../../technical/context-and-cost.md).
