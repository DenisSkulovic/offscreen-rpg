# Inhabitable play and return plan

Feature: [Inhabitable play and return](FEATURE.md)
Execution scope: proposal only; no implementation or media generation is authorized.
Implementation owner: Cursor by default; reviewer: Codex.

## Phases

### Phase 1 — Experience storyboard

- Outcome: agreed screen-by-screen states for rapid play, active process, return after interruption and generation failure.
- Owners: player-experience and time/autonomy product docs.
- Work: draft low-fidelity layouts using actual POC fields and copy; identify primary, secondary and inspector-only information.
- Checks: owner walkthrough at desktop and mobile widths.
- Exit: the hierarchy feels like a game before React work begins.

### Phase 2 — Snapshot presentation contract

- Outcome: the browser receives one coherent projection for current scene, current influence, ongoing commitment and optional return recap.
- Owners: contracts and application reads.
- Work: derive only from committed state; separate public display state from receipts/diagnostics; define stale/current recap fences.
- Checks: contract tests for pending, interrupted, completed, held and unauthorized views.
- Exit: the client does not reconstruct domain truth from unrelated fields.

### Phase 3 — Primary play surface

- Outcome: current scene and meaningful action dominate the page across immediate and timed play.
- Owners: web play features.
- Work: componentize scene, process status, choices, recovery and expandable mechanics; remove debug-first wording and contradictory booleans.
- Checks: focused component/type checks and keyboard/screen-reader walkthrough.
- Exit: all agreed states render coherently without developer inspection.

### Phase 4 — Return recap and chronology

- Outcome: absence is understandable without dumping every quiet boundary into history.
- Owners: application recap projection and web chronology.
- Work: aggregate committed quiet progress, show interruptions/completions and link to detailed chronology/receipts.
- Checks: reload after absence, old notification, restart and long quiet span.
- Exit: a player can resume within thirty seconds and tell what remains actionable.

### Phase 5 — Chamber comparison and owner review

- Outcome: player view and authoritative inspector can be compared during the gold vertical slice.
- Owners: Chamber composition and QA journey.
- Work: reuse production components, record screenshots/observations and correct misleading presentation.
- Checks: owner taste review; no image/model spend.
- Exit: presentation supports rather than obscures the experience contract.

## Current checkpoint

- Current phase and exact next action: produce the low-fidelity storyboard after the gold earned-time flow is selected.
- Base/reviewed Git revision and relevant changes: based on `8ad4e30`; the reorientation portfolio changes documentation only.
- Actual checks/results for this revision; checks not run: current opening and play components, snapshot fields and product presentation docs inspected; no UI runtime check run because local Docker infrastructure is unavailable.
- Unresolved findings/blockers: the current play screen mixes scene, facts, receipts, settings and activity diagnostics without an agreed player-first hierarchy.
- Provider spend and accounting certainty: $0; cumulative OpenRouter usage not verified.
