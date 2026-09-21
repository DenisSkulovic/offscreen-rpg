# Retrieval evidence packing

Status: Agreed
Approval: Approved by the owner's 2026-09-21 direction to support dense multi-entity, multi-location and multi-event recall under configurable context and spend constraints.

## Intended outcome

A Storyteller can receive useful evidence about many relevant people, places and prior events without receiving one verbose document per match or losing exact authority. The system packs a bounded working set from several source-linked representation levels, spending detail where the current decision needs it and preserving breadth elsewhere.

## Representative flow

A conservative return turn needs twenty people, five places and fifteen prior plot nodes. Current identity/place/thread facts are grouped into compact source-linked cards; repeated names, location labels and provenance metadata are emitted once. High-impact unresolved threads receive bounded episode summaries. Only the promise whose wording affects the current choice expands to its exact passage. The trace shows which facts were required, represented compactly, expanded, deduplicated or omitted and why.

## Scope and boundaries

Includes a provider-free evidence-packing contract, required-versus-optional evidence, entity/thread/source grouping, duplicate accounting, representation levels, diversity caps, deterministic budget allocation and density/coverage measurements. Optional model-authored cards or query-focused condensation remain derived source-linked artifacts created under separate configured budgets.

Packing does not rewrite canonical files, treat snippets as complete truth, compress mechanical state lossily, merge identities, remove chronology/authority labels, or use token-level prompt compression as the first correctness layer. Exact current state and mandatory evidence fail closed if they cannot fit. Cost postures vary optional breadth and fidelity, never canon.

## Acceptance

- A synthetic 20-person/5-place/15-node return fits a declared small packet while retaining every required current fact and source identity.
- The report distinguishes unique useful bytes, repeated bytes removed, representation level, group coverage, omitted optional evidence and mandatory overflow.
- The same inputs produce deterministic minimal, balanced and rich packs; larger packs are not automatically scored better.
- Exact wording expands only its cited source while other items remain compact.
- Same-name, changed-fact, private, forked and abstract-world cases preserve their existing authority filters.
- A pack that is shorter but drops a required fact or provenance fails evaluation.

## Decisions still needed

Tune group fairness and upgrade utility against the memory oracle. Do not select a model compressor until deterministic cards, episodes and source expansion expose the remaining measured gap.

## Owning specifications

[Long-story memory guide](../../engineering/long-story-memory-and-retrieval.md), [episodic memory](../2026-09-21--10-55--episodic-memory-and-source-navigation/FEATURE.md), [memory evaluation](../2026-09-21--10-55--long-story-memory-evaluation/FEATURE.md), and [context/cost](../../technical/context-and-cost.md).
