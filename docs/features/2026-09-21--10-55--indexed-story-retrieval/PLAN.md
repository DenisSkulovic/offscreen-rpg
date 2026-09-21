# Implementation plan

Feature: [Indexed story retrieval](FEATURE.md).
Execution scope: approved local lexical indexing and source discovery; no semantic/provider work.
Implementation owner: Codex under the owner's continuing instruction.

## Phases

### L1 — Retrieval-unit and result contracts

- Outcome: versioned index-unit metadata and query/result/coverage contracts shared with `canonical-search.ts`.
- Owners: `@offscreen/documents` for canonical section/source derivation, application Storyteller search for authorization and query policy, database schema only for rebuildable index state.
- Units retain document/source hash, current revision, kind, visibility, authority, branch/time fields, heading path, links and byte size. Fixed-size chunks are fallback only.
- Exit: existing linear search projects the new result shape and still passes its current oracle. Status: blocked only on E1 schema alignment.

### L2 — Indexed lexical adapter

- Outcome: field-aware local lexical retrieval with deterministic ranking, compact snippets, pagination and complete prefilters.
- Apply publication changes incrementally outside story locks where possible; expose `indexedThrough`, partial/stale status and rebuild identity.
- Checks: duplicate names, exact phrase, supersession, private decoy, fork isolation, incomplete index and no-match.
- Exit: parity/quality report beats or explains differences from linear scan under the same output budget.

### L3 — Rebuild and scale operations

- Outcome: idempotent rebuild/deletion and bounded query measurements at 200 and 2,000 scenes.
- No index becomes canonical and no failed rebuild blocks exact current-state reads.
- Exit: restart/rebuild preserves results and source links; query work is no longer proportional to total bodies.

## Current checkpoint

- Current phase and exact next action: L1 after E1; extract the current `canonical-search.ts` contract and document-unit derivation into backend-neutral types.
- Base/reviewed Git revision and relevant uncommitted changes: `a38076c`; planning files only.
- Actual checks/results for this revision; checks not run: source/design review only.
- Unresolved findings/blockers: local index backend selection is deliberately deferred to L2 measurement.
- Provider spend and accounting certainty: $0; local deterministic work only.
