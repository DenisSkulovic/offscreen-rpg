# Implementation plan

Feature: [Episodic memory and source navigation](FEATURE.md).
Execution scope: approved source-grounded narrative memory records and navigation; no universal extraction job.
Implementation owner: Codex under the owner's continuing instruction.

## Phases

### M1 — Card and source-range contracts

- Outcome: schemas for episode, relationship and thread records with stable IDs, source handles/ranges, links, knowledge, effective time, status and coverage.
- Owners: canonical document schemas/storage, Storyteller proposal validation, application admission/publication.
- Reuse existing identity/lore/thread kinds where responsibilities fit; add kinds only when read/update cadence or authority genuinely differs.
- Exit: fixtures encode prior visit, favor, changed bridge, rumor and abstract-environment memory without duplicating mechanical truth. Status: can begin after E1 oracle vocabulary.

### M2 — Admission and deterministic selection

- Outcome: accepted turns create/update bounded cards from one semantic payload; current place/identity/thread cues select a small working set.
- Publication is revision-fenced and source-backed; maintenance failure records a gap rather than rolling back gameplay.
- Checks: same-name identities, supersession, private knowledge, branch isolation, missing source, low-drama old memory and no-card turn.
- Exit: a provider-free return receives useful cards without scanning/loading the lifetime transcript.

### M3 — Exact source navigation and condensation

- Outcome: card → exact coherent source-section reads and optional query-focused multi-source synthesis with downward citations.
- Broad condensation is separately budgeted and never replaces originals or current state.
- Exit: exact promise wording and broad relationship recap use different bounded recipes and retain source traceability.

## Current checkpoint

- Current phase and exact next action: M1 after E1 schema; map proposed records onto existing canonical kinds before adding any schema.
- Base/reviewed Git revision and relevant uncommitted changes: `a38076c`; planning files only.
- Actual checks/results for this revision; checks not run: source/design review only.
- Unresolved findings/blockers: promotion thresholds require corpus evidence, not a design guess.
- Provider spend and accounting certainty: $0; no maintenance inference authorized by this plan alone.
