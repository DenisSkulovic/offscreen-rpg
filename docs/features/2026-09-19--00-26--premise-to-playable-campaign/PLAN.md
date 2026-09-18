# Premise to playable campaign plan

Feature: [Premise to playable campaign](FEATURE.md)
Execution scope: proposal only; no implementation or provider call is authorized.
Implementation owner: Cursor by default; reviewer: Codex.

## Phases

### Phase 1 — Agree the reviewed setup experience

- Outcome: one screen-by-screen creation/review contract for humanoid, microbe and abstract premises.
- Owners: story creation, player experience and game-rules specifications.
- Work: decide player-owned versus Storyteller-proposed character decisions, correction scope and unsupported-premise presentation.
- Checks: owner walkthrough of all three setup examples.
- Exit: the review exposes enough meaning for a player to reject a bad interpretation before Start.

### Phase 2 — Supported setup proposal contract

- Outcome: strict proposal schemas cover character form/capabilities, initial facts/quantities, scene and immediate plans without a universal world model.
- Owners: game rules, Storyteller tasks and transport projections.
- Work: define versioned supported capability/skill references, limits, diagnostics and public/private fields. Reuse normal immediate-plan admission.
- Checks: pure validation for fabricated skill/effect, incompatible form and excessive state.
- Exit: deterministic code can accept or explain every part of a proposed setup.

### Phase 3 — Durable review and exact Start

- Outcome: one immutable reviewed candidate owns its complete accepted mechanical seed.
- Owners: application generation/start flows and database baseline.
- Work: capture proposal provenance, expose the public review, invalidate on draft revision and copy the accepted seed exactly at Start.
- Checks: database integration for stale review, retry, ownership and exact-copy behavior.
- Exit: no Start path performs a fresh catalogue lookup or reinterpretation.

### Phase 4 — Correction and unsupported states

- Outcome: a player can correct one material misunderstanding without editing hidden mechanics.
- Owners: creation UI and setup task admission.
- Work: implement the agreed structured or bounded-regeneration path; show unsupported rule requirements honestly.
- Checks: browser flows for accept, correct, stale and unsupported cases.
- Exit: the player controls identity while application rules retain mechanical authority.

### Phase 5 — Genre contrast acceptance

- Outcome: the same production path starts three radically different premises.
- Owners: Chamber/QA fixtures and product flow.
- Work: run humanoid, microbe and abstract cases; inspect capabilities, initial plans and absence of world-specific shared branches.
- Checks: offline persisted browser runs. Live generation remains a separate gate.
- Exit: structural flexibility is demonstrated rather than inferred from types.

## Current checkpoint

- Current phase and exact next action: awaiting owner decisions about player-owned character choices and correction style.
- Base/reviewed Git revision and relevant changes: based on `8ad4e30`; the reorientation portfolio changes documentation only.
- Actual checks/results for this revision; checks not run: current draft/opening/Start path and mechanical fixture seed ownership inspected; no code checks run.
- Unresolved findings/blockers: arbitrary premises cannot currently produce their own mechanical character seed; the catalogue still supplies starting character state.
- Provider spend and accounting certainty: $0; cumulative OpenRouter usage not verified.
