# Bounded Storyteller memory exploration

Status: Agreed
Approval: Approved as part of the owner's 2026-09-21 long-story memory priority.

## Intended outcome

When the preselected working set is insufficient, the Storyteller can investigate saved history before committing narration. It receives a compact orientation and a small, unambiguous read-only tool vocabulary, may request bounded searches and exact reads, and then produces one final result grounded in the captured evidence. Ordinary turns that already have enough context remain one call.

## Representative flow

On returning to Greywake, the first Storyteller response asks to search for the old favor and inspect the matching thread while querying Mira's exact identity. The application batches independent reads, persists their results, and permits one follow-up source read. The final response uses the original exchange and current repaired-bridge state. No-match leads to uncertainty rather than invention. A retry reuses the captured rounds; a stale campaign root rejects publication instead of mixing eras.

## Scope and boundaries

Includes `needs_context` result contracts, `query_registry`, `search_memory`, `inspect_memory` and `read_source` operations, orientation hints, batching, persisted round artifacts, task-wide read/byte/round/deadline/spend limits, exact retry, pruning/deduplication and inspectable traces. Retrieved story text is untrusted data, never instructions. This is one provider-neutral protocol, not separate implementations per model vendor. It does not add an autonomous NPC agent, unlimited tool loop, hidden paid routing call or automatic escalation to a richer tier.

## Acceptance

- Scripted first response requests evidence before any publishable prose/effects.
- A newly discovered handle can be inspected in a later bounded round and materially changes the supported final result.
- Duplicate reads reuse saved output but still consume operation allowance; loops terminate.
- No-match, partial coverage, stale snapshot, invalid handle and required-evidence overflow are explicit.
- Final publication uses one captured root/state fence and cannot cite dropped evidence as read.
- Cheapest recipe remains one round/no tools; richer recipes alter optional work, never canon.

## Decisions still needed

Tune default limits only after E1/L1 measurements. Initial ceiling remains three total model rounds, six reads and one repair sharing the same operation budget.

## Owning specifications

[Memory feature](../2026-09-18--20-09--storyteller-memory-and-recall/FEATURE.md), [context and cost](../../technical/context-and-cost.md), [Storyteller runtime](../../technical/storyteller-runtime.md), and [indexed retrieval](../2026-09-21--10-55--indexed-story-retrieval/FEATURE.md).
