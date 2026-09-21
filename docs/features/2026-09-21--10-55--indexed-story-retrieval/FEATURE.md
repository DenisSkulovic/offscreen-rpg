# Indexed story retrieval

Status: Agreed
Approval: Approved as part of the owner's 2026-09-21 long-story memory priority.

## Intended outcome

An enormous campaign no longer requires scanning every current document to find a name, phrase, old promise or source passage. Rebuildable field-aware lexical indexes provide bounded candidate discovery over canonical current records and immutable evidence while preserving authority, visibility, branch, revision and time filters.

## Representative flow

Forty or four thousand scenes after the player heard an unusual phrase at Greywake, a memory query finds the exact current thread and the original exchange. A superseded thread version, developer-private decoy, another branch and a similarly named Mira are excluded before their snippets reach the Storyteller. If indexing is incomplete, the result reports its watermark and coverage rather than asserting the event never happened.

## Scope and boundaries

Includes semantic retrieval units derived from heading subtrees, compact records and coherent passage ranges; deterministic contextual metadata; a field-aware inverted/BM25-style index; incremental publication updates; rebuild, deletion and coverage status; compact candidates with match reasons; and parity measurement against the existing bounded linear search. The canonical document store remains truth. This feature does not add embeddings, infer identity equality, answer questions itself or load candidates into prompts without the exploration/context owners.

## Acceptance

- Query work is bounded independently of total story text in the 2,000-scene profile.
- Currentness, story, branch, authority and visibility filters apply before any title, count or snippet is returned.
- Exact names, rare phrases, aliases and source text meet oracle thresholds without resurrecting superseded records.
- Index deletion/rebuild preserves canonical identity; stale and partial coverage are inspectable.
- Linear and indexed routes share one result contract and can be compared without raw-score equivalence.

## Decisions still needed

Choose the smallest local index implementation after measuring PostgreSQL full-text search versus an embedded alternative. No new service merely to obtain fashionable architecture.

## Owning specifications

[Long-story memory guide](../../engineering/long-story-memory-and-retrieval.md), [canonical search](../../technical/canonical-files.md#search-belongs-in-the-poc), and [evaluation corpus](../2026-09-21--10-55--long-story-memory-evaluation/FEATURE.md).
