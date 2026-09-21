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

### L4 — Configurable retrieval recipes — implemented and focused-verified

- Outcome: named minimal, balanced and rich recipes resolve retrieval breadth, source-passage participation, query-term/ranking effort, assembly reads and retained bytes under stricter operation ceilings.
- Recipe identity and effective values remain inspectable in results/evaluation. Privacy, visibility, root freshness and canonical authority are invariant and cannot be weakened by a tier or player preference.
- Minimal is allowed to trade recall/texture for compute and context cost; rich is allowed broader evidence but remains bounded. Balanced preserves the current behavior.
- Exit: the same corpus can be evaluated under every recipe, effective limits never exceed the operation envelope, and measured quality/cost differences remain visible rather than described as universally better.

## Current checkpoint

- Current phase and exact next action: indexed lexical L1–L4 are complete; connect the resolved recipe and shared retrieval result to bounded Storyteller exploration.
- Base/reviewed Git revision and relevant uncommitted changes: `d94b474`; L4 recipe contract, resolver, evaluator/benchmark comparison, QA and documentation are uncommitted.
- Actual checks/results for this revision: contracts/application builds, focused corpus/evaluator test and reproducible benchmark pass. At 2,000 scenes minimal produced `7/12` retrieval passes, recall `0.7778` and precision `0.5417` in about `5 ms`; balanced produced `9/12`, `0.8889` and `0.2972` in about `29 ms`; rich matched balanced quality in about `26 ms`. Single-run timings are noisy observations, not ordering guarantees. The test proves a rich recipe resolves to zero assembly reads/bytes under a stricter zero-read operation envelope.
- Unresolved findings/blockers: rich currently earns no quality improvement over balanced on this small lexical oracle, which is useful evidence against spending its larger allowance by default. Recipe selection is not yet wired into Storyteller task admission or user-tier policy. Relationship-heavy and ambiguity cases remain visible failures.
- Provider spend and accounting certainty: $0; local deterministic work only.
