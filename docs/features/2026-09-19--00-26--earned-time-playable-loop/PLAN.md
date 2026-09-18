# Earned-time playable loop plan

Feature: [Earned-time playable loop](FEATURE.md)
Execution scope: offline implementation authorized on 2026-09-19; no provider call is authorized.
Implementation owner: Codex for the current bounded slices.

## Dependencies and sequencing

Approve the player flow first, then approve only the contribution/runtime subset needed from [activity processes](../2026-09-18--16-48--activity-processes-and-progress/PLAN.md). Do not wait for traversal, every process family or long-story memory. The existing immediate receipt/DM-turn boundary is reused rather than replaced. Prove the interruption with a present player first; absence-time choice is owned by [bounded autonomy and re-entry](../2026-09-19--00-26--bounded-autonomy-and-reentry/PLAN.md) and must not be implied by the process runtime.

## Phases

### Phase 1 — Agree the lived shift

- Outcome: an exact player-visible timeline from admission through absence, interruption, resumption, completion and return.
- Owners: vision, gameplay, time/autonomy and player-experience docs.
- Work: select fixture, real/development pace, reward semantics, interruption branch and failure/held presentation.
- Checks: owner reads the flow as a player and identifies anything that feels like a job dashboard, arbitrary timer or scripted trick.
- Exit: observable experience is agreed before process schemas change.

### Phase 2 — Minimal process correction

- Outcome: clock position, process progress, next boundary, estimate and completion are separate for one contribution rule.
- Owners: game process policy and database baseline.
- Work: implement the narrow runtime/rule protocol and capacity claim required by the fixture; remove dependence on `durationTicks` as progress for this path.
- Checks: pure settlement equivalence, no-reward-before-completion, duplicate boundary and pause semantics.
- Exit: quiet progress is authoritative without narration.

### Phase 3 — Interruption handoff

- Outcome: a due development suspends or revises the process and enters the normal immediate DM loop.
- Owners: application transactions, worker/workflows and Storyteller context.
- Work: commit progress through the boundary, create the interruption scene, capture process provenance in the DM task and re-evaluate resumption after the receipt.
- Checks: integration races for boundary versus pause/action, stale completion and duplicate delivery.
- Exit: the old completion cannot fire blindly after circumstances change.

### Phase 4 — Completion, reward and recap

- Outcome: valid completion commits its result once and presents a concise meaningful return state.
- Owners: process effects, chronology/recap projection and play UI.
- Work: commit completion effects, aggregate quiet history, show conditional estimate changes and explain interruption/completion without debug-first presentation.
- Checks: reload, restart, completion retry and unauthorized/stale command cases.
- Exit: the player recognizes earned progress and current choices after absence.

### Phase 5 — Contrast and real-time acceptance

- Outcome: one nonhuman process and one actual elapsed-time run challenge the abstraction.
- Owners: Chamber reusable scenarios and integration/browser acceptance.
- Work: add microbe contrast, accelerated deterministic run and a bounded wall-clock/restart run.
- Checks: evidence records include model-call count ($0 offline), state transitions and observed player experience.
- Exit: earned-time behavior is demonstrated, not merely unit-tested.

## Current checkpoint

- Current phase and exact next action: the bounded phase-3 mechanics exist: a beacon event interrupts, immediate plans address it, and a fenced resume plan preserves the original activity/progress. Before completing the beacon, implement [multiple suspended commitments](../2026-09-19--02-24--multiple-suspended-commitments/PLAN.md) so starting other work suspends rather than destroys this progress.
- Base/reviewed Git revision and relevant changes: contribution/time separation was pushed as `8576f62` and roll-driven productivity as `9895c85`; the current slice adds the private process-plan branch, beacon content and atomic activity creation.
- Actual checks/results for this revision; checks not run: game build and 19 tests, Storyteller build and 29 tests, application/worker/API-integration builds, and the focused PostgreSQL/Temporal/browser integration (10/10 subtests) pass. Integration proves a nonzero-progress encounter resumes the same activity row. Verification also exposed and fixed an ambiguous worker import that let a stale emitted file shadow consequence activity registration. The suite does not yet drive a random event through the full outbox/publication chain or perform a dedicated beacon browser run.
- Unresolved findings/blockers: the newly approved commitment-collection evolution owns explicit suspension, abandonment and named-capacity reacquisition. Until it lands, starting a different process still abandons the old activity. The authored tool modifier is not structurally grounded to its prerequisite fact. Waiting and traversal semantics remain outside the approved implementation subset.
- Provider spend and accounting certainty: $0; cumulative OpenRouter usage not verified.
