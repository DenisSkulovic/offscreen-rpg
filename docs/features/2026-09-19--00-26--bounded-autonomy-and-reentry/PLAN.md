# Bounded autonomy and re-entry plan

Feature: [Bounded autonomy and re-entry](FEATURE.md)
Execution scope: proposal only; no implementation, notification integration or provider call is authorized.
Implementation owner: Cursor by default; reviewer: Codex.

## Dependencies and sequencing

The earned-time slice supplies the first meaningful interruption. Existing narrative deadline machinery is evidence and reusable infrastructure, not automatically the correct mechanical policy. Settle solo behavior before multiplayer or an external notification provider.

## Phases

### Phase 1 — Agree the autonomy promise

- Outcome: player-facing policy and three concrete decisions—safe delegation, disallowed high risk and no-longer-valid fallback.
- Owners: time/autonomy, player experience and story creation.
- Work: choose the initial vocabulary, deadline semantics, pause interaction and always-hold categories.
- Checks: owner walkthrough from campaign creation through absence and return.
- Exit: the policy is understandable without reading implementation terms.

### Phase 2 — Captured fallback contract

- Outcome: a response opportunity stores feasible options and one permitted fallback under current authority.
- Owners: game proposal/admission and application persistence.
- Work: define fallback provenance, mechanical plan reference, deadline and invalidation fence; never generate fresh unbounded mechanics at deadline.
- Checks: pure validation for authority, stale prerequisites and disallowed risk.
- Exit: fallback execution needs no hidden new judgment.

### Phase 3 — Exactly-once deadline arbitration

- Outcome: player response, pause and fallback race to one coherent committed result.
- Owners: database transactions, worker/workflow scheduling and command receipts.
- Work: arbitrate on database time, recheck state, preserve pause remainder and make retries idempotent.
- Checks: integration races at before/equal/after deadline, duplicate delivery and restart.
- Exit: no branch can commit both player and fallback outcomes.

### Phase 4 — Re-entry and notification event

- Outcome: return UI explains autonomous action and current authority; optional delivery reports only the saved opportunity/current link.
- Owners: snapshot/recap contracts, play UI and notification event boundary.
- Work: project attribution, deadline/fallback result and current actionability; keep transport late/failure tolerant.
- Checks: old tab/link, delivery delay, missing delivery and return after resolution.
- Exit: the browser alone proves the gameplay; a channel can be added without changing authority.

### Phase 5 — Gold-flow acceptance

- Outcome: the earned-time scenario works with player response, fallback, no-authority hold and pause variants.
- Owners: Chamber reusable scenario and QA evidence.
- Work: run offline variants through production paths and record the player's understanding of what happened.
- Checks: persisted browser/worker runs; $0 model spend.
- Exit: offscreen continuation feels bounded and trustworthy rather than arbitrary.

## Current checkpoint

- Current phase and exact next action: awaiting owner choice of autonomy vocabulary and solo response-window semantics.
- Base/reviewed Git revision and relevant changes: based on `8ad4e30`; the reorientation portfolio changes documentation only.
- Actual checks/results for this revision; checks not run: vision/playthrough absence behavior, time/autonomy specification and existing narrative deadline concepts inspected; no code checks run.
- Unresolved findings/blockers: mechanical interruptions do not yet have a player-approved fallback policy, and no notification channel is selected.
- Provider spend and accounting certainty: $0; cumulative OpenRouter usage not verified.
