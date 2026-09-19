# Inhabitable play and return plan

Feature: [Inhabitable play and return](FEATURE.md)
Execution scope: proposal only; no implementation or media generation is authorized.
Implementation owner: Cursor by default; reviewer: Codex.

## Phases

First coding tranche is bounded by the [gold session](../../technical/playthroughs/harbor-session.md) and [solo contract's recovery table](../../technical/solo-gameplay-contract.md#commands-recovery-and-what-the-player-sees). Reuse existing UI components; distinguish current choices, working, manually paused, decision-held, preparation-failed and historical report states. Show “completion pending” separately from a reward. Add only the projection/controls required to understand those states; no aesthetic redesign, generated art or large trace dashboard before this flow works. The broader phases below remain subsequent feature scope.

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

- Current phase and exact next action: the gold flow and state/recovery table now supply the first functional storyboard. Contribute minimal projection/reentry UI during the feature-index route and final connected session; visual polish remains deferred.
- Base/reviewed Git revision: readiness documents based on `875f979`; no UI code changed in this pass.
- Verification: documentation/source-boundary inspection; no current browser/runtime verification. Do not treat an old Docker failure as a current blocker; consult development instructions only if actually starting infrastructure.
- Unresolved findings/blockers: the current play screen mixes scene, facts, receipts, settings and activity diagnostics without an agreed player-first hierarchy.
- Provider spend and accounting certainty: $0; cumulative OpenRouter usage not verified.
