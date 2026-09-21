# Implementation plan

Feature: [Indexed story retrieval](FEATURE.md).
Execution scope: approved local lexical indexing and source discovery; no semantic/provider work.
Implementation owner: Codex under the owner's continuing instruction.

## Phases

### L1 — Retrieval-unit and result contracts — implemented and focused-verified

- Outcome: versioned index-unit metadata and query/result/coverage contracts shared with `canonical-search.ts`.
- Owners: `@offscreen/documents` for canonical section/source derivation, application Storyteller search for authorization and query policy, database schema only for rebuildable index state.
- Units retain document/source hash, current revision, kind, visibility, authority, branch/time fields, heading path, links and byte size. Fixed-size chunks are fallback only.
- Exit: existing linear search projects the new result shape and still passes its current oracle. Status: blocked only on E1 schema alignment.

### L2 — Indexed lexical adapter — implemented and focused-verified

- Outcome: field-aware local lexical retrieval with deterministic ranking, compact snippets, bounded top-k selection and complete prefilters. Cursor pagination is deferred until a caller demonstrates a need beyond the bounded retrieval contract.
- The first adapter is deliberately in-process and rebuildable: it captures one exact canonical root, indexes eligible bodies once, ranks OR matches with title/path/context/body weights and returns compact snippets without rereading every body per query.
- It fails closed on root or manifest/document identity mismatch, excludes developer-private material before indexing, and reports unit, byte and oversized-unit omissions separately.
- Durable/incremental publication updates, restart behavior, richer heading units and the remaining duplicate/supersession/incomplete-index matrix move to L3 rather than being simulated here.
- Exit: parity/quality report beats or explains differences from linear scan under the same output budget.

### L3 — Rebuild and scale operations

- Outcome: idempotent rebuild/deletion and bounded query measurements at 200 and 2,000 scenes.
- No index becomes canonical and no failed rebuild blocks exact current-state reads.
- Exit: restart/rebuild preserves results and source links; query work is no longer proportional to total bodies.

## Current checkpoint

- Current phase and exact next action: L3; add disposable persistence/rebuild operations and compare bounded work at 200 and 2,000 scenes before choosing a durable backend.
- Base/reviewed Git revision and relevant uncommitted changes: `1b7a39a`; L2 in-process index, shared evaluator adapter and documentation are uncommitted.
- Actual checks/results for this revision: contracts and application builds pass; the focused corpus/evaluator test passes. Under the same 12-query budgets, linear versus indexed retrieval passes are `1/12` versus `9/12`, mean expected recall is `0.0833` versus `0.8889`, and mean context precision is `0.0833` versus `0.5208`. Indexed assembly passes `7/12`; generation is deliberately not run.
- Unresolved findings/blockers: the in-memory index is rebuilt explicitly and is not restart-safe or incrementally refreshed. It still uses document-root units and lexical evidence, so relationship-heavy and ambiguity cases remain visible failures.
- Provider spend and accounting certainty: $0; local deterministic work only.
