# Storyteller agency and taste plan

Feature: [Storyteller agency and taste](FEATURE.md)
Execution scope: offline implementation authorized on 2026-09-19; no provider call is authorized.
Implementation owner: Codex for the current bounded slice; owner review remains the taste gate.

## Phases

### Phase 1 — Agree the taste contract

- Outcome: the owner can recognize good, mediocre and unacceptable turns from concrete examples.
- Owners: product storytelling/player-experience docs and QA rubric data.
- Work: write one canonical three-round pineapple transcript, one microbe contrast and anti-examples for generic repetition, forced escalation, fake agency and receipt contradiction. Separate subjective review prompts from deterministic validity.
- Checks: owner walkthrough, not automated scoring.
- Exit: examples and rejection reasons are agreed before prompt/schema work.

### Phase 2 — Make dynamic agency observable offline

- Outcome: controlled fixture outputs change with committed facts through normal task inputs, never scenario branches in application policy.
- Owners: Storyteller fixtures/tasks, game proposal admission, Chamber QA case.
- Work: replace the generic assess loop with state-responsive fixture turns; record public intentions, private plans, receipt evidence and why options changed.
- Checks: focused task tests plus one persisted three-round integration run.
- Exit: the feature's dynamic-option acceptance is demonstrated offline.

### Phase 3 — Presentation-quality pass

- Outcome: public options communicate distinct intention and useful commitment/risk without leaking hidden outcomes.
- Owners: contracts and play UI.
- Work: settle the public risk/commitment projection, render it, and remove diagnostic wording from the primary scene.
- Checks: browser walkthrough at narrow/wide sizes and accessibility labels.
- Exit: the player can distinguish options without reading private mechanics.

### Phase 4 — Human evaluation gate

- Outcome: one repeatable offline review determines whether the short loop is worth exposing to a model.
- Owners: QA journey and Chamber evidence.
- Work: record specificity, agency, restraint, consequence fidelity and genre fit; preserve concrete failures.
- Checks: owner review of all three benchmarks.
- Exit: targeted prompt/contract changes are identified, or the owner authorizes preparation for conservative live Gate 1. This phase never authorizes a provider call itself.

## Current checkpoint

- Current phase and exact next action: phase 2 is implemented at the task/fixture boundary. Next implement phase 3 by reviewing the public plan projection and play UI so commitment/risk is readable without debug-first presentation.
- Base/reviewed Git revision and relevant changes: implementation starts from `06da12a`; the working slice replaces generic mechanical fixture turns, adds pineapple/microbe/held evidence and updates the three-round integration expectation.
- Actual checks/results for this revision; checks not run: Storyteller build passes; 27 Storyteller tests pass; API integration TypeScript build passes. The PostgreSQL/Temporal/browser integration was updated but not executed in this slice.
- Unresolved findings/blockers: state-responsive offline proposals are structurally demonstrated, but no human taste review or persisted browser run yet establishes enjoyable play. Consequence prose still mirrors the committed receipt in one paragraph; presentation quality remains phase 3.
- Provider spend and accounting certainty: $0; cumulative OpenRouter usage not verified.
