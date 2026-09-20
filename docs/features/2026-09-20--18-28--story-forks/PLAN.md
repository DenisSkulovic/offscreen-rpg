# Story forks implementation plan

Feature: [Story forks and alternate continuities](FEATURE.md).
Execution scope: the owner-approved minimal fork mechanic and testing utility. No provider calls or visualization implementation.
Implementation owner: Codex for the initial bounded slice.

## Phase 1 — Current committed checkpoint

Outcome: fork one supported current story position into an independent story with durable lineage.

Owners: story/contracts schema, single disposable baseline, application story operation, ordinary authenticated API, Chamber QA catalogue.

Bounded edits:

1. Add nullable source-story, source-passage and source-sequence lineage to `story`, with a complete-or-empty constraint and an index for child lookup.
2. Add an idempotent fork command keyed by destination story ID, source story and expected current passage.
3. Lock the source; reject pending resolution or work, timers and campaign state not yet covered by an exact clone contract. Clone only committed owned data, preserving prose and provenance while assigning a new story identity.
4. Return the ordinary destination snapshot and expose a developer-visible lineage summary. Add one structured QA case proving independent continuation.

Initial supported boundary: solo, narrative-only current decision checkpoints with no active wait or deadline, pending resolution, started mechanical state, obligations, or continuity-note references that require passage-ID remapping. An unstarted zero-tick campaign shell and its immutable settings are cloned exactly. This is an intentional honest vertical slice, not the final generic boundary.

Exit: a current opening or decision can be forked through the ordinary API and the two stories diverge independently at $0.

## Phase 2 — Revision snapshots and arbitrary historical nodes

Capture the complete authoritative state needed to resume at each eligible narrative revision: story configuration, current presentation and private offer, items, campaign clock, settings and facts, activities, executions, receipts, obligations and continuity provenance. Snapshot identity is source story plus revision plus schema version; pending external work is excluded or represented as a blocker, never replayed.

Exit: any snapshot-backed historical passage can be forked without borrowing later state.

## Phase 3 — Player branch navigation

Add branch labels, ancestry and descendant reads, retention controls and a clear player action from history. Explore a compact tree visualization where alternate realities materially aid navigation; do not require it for backend correctness or testing.

Exit: players can understand which continuity they are in and move among branches without confusing one as canonical.

## Current checkpoint

- Current phase and exact next action: Phase 1 core and its divergent-continuation case pass; next expose the supported action in the barebones story UI or use it in the next repeated gameplay experiment.
- Base/reviewed Git revision and relevant uncommitted changes: working tree contains the active POC and evaluation changes; preserve them. Fork lineage, transaction, ordinary API, Chamber forwarding and public snapshot projection are present.
- Actual checks/results for this revision; checks not run: contracts, database, application, API and integration harness compile. Drizzle regenerated the disposable baseline from schema. The focused database-backed case passes and proves independent `approach` versus `leave` continuations, retained lineage, retry identity and owner isolation. Docker/PostgreSQL/Temporal/Redis were healthy for the run.
- Unresolved findings/blockers: current continuity notes and started campaign tables contain identities and latest state that require a reviewed remap or snapshot contract before broader cloning. The focused helper currently builds and boots the web application even for application-heavy cases; optimize only before enough repeated runs justify the change.
- Provider spend and accounting certainty: $0; cumulative provider usage unverified.
