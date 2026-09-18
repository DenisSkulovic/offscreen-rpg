# Earned-time playable loop plan

Feature: [Earned-time playable loop](FEATURE.md)
Execution scope: proposal only; no implementation or provider call is authorized.
Implementation owner: Cursor by default; reviewer: Codex.

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

- Current phase and exact next action: awaiting owner choice of the gold shift/interruption experience and minimal capacity semantics.
- Base/reviewed Git revision and relevant changes: based on `8ad4e30`; the reorientation portfolio changes documentation only.
- Actual checks/results for this revision; checks not run: vision, long-life benchmarks, current time contract and proposed activity-process design inspected; no code checks run.
- Unresolved findings/blockers: current duration-driven activities do not meet the proposed process architecture, and the immediate generated DM loop is not connected to earned progression.
- Provider spend and accounting certainty: $0; cumulative OpenRouter usage not verified.
