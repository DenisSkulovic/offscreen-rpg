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

### L3 — Rebuild and scale operations — implemented and focused-verified

- Outcome: idempotent rebuild/deletion and bounded query measurements at 200 and 2,000 scenes.
- No index becomes canonical and no failed rebuild blocks exact current-state reads.
- A versioned deterministic snapshot preserves the index across process restarts. The local disposable store atomically replaces one story snapshot and supports deletion; rebuilding a revised root supersedes the old projection without modifying canonical objects.
- `pnpm memory:index-benchmark` reconstructs the actual raw-passage corpus at 200 and 2,000 scenes, reports indexed-unit/build/query-suite measurements and makes zero provider calls.
- Exit: restart/rebuild preserves results and source links; query work is no longer proportional to total bodies.

## Current checkpoint

- Current phase and exact next action: indexed lexical L1–L3 are complete; connect the shared result contract to bounded Storyteller exploration rather than tuning this small oracle further.
- Base/reviewed Git revision and relevant uncommitted changes: `47bc230`; L3 raw-source indexing, honest noise accounting, snapshots/store, scale command and documentation are uncommitted.
- Actual checks/results for this revision: application build, focused corpus/evaluator test and reproducible benchmark pass. The corrected index covers 208 permitted units at 200 scenes and 2,008 at 2,000 scenes. The latest run took about `432 ms`/`3,447 ms` to build and `79 ms`/`411 ms` for all twelve queries. Both sizes produced `9/12` retrieval passes, `6/12` assembly passes, mean expected recall `0.8889` and mean context precision `0.2972`. Times are workstation observations, not stable thresholds.
- Unresolved findings/blockers: the snapshot store is a local POC adapter, not a multi-process publication consumer. Inverted postings avoid a full-unit query scan, but deliberately broad/common terms can still yield large posting lists. Relationship-heavy and ambiguity cases remain visible failures.
- Provider spend and accounting certainty: $0; local deterministic work only.
