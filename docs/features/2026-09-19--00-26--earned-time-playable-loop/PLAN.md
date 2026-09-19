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

- Current phase: contribution and interruption mechanics exist; connected experience acceptance remains incomplete. The owner's new [activity foundation design](../2026-09-18--16-48--activity-processes-and-progress/PLAN.md) takes priority for the next implementation direction.
- Reviewed source: `1ef5a81`. Starting another process retains interrupted/paused work. Immediate responses preserve the interrupted identity, and resume currently finds one row by action-definition identity. The older claim that B abandons A is obsolete.
- Earlier evidence: game/Storyteller tests, builds and focused integration passed. The A → B → A test directly marks B complete and restores an old offer, so it does not demonstrate real diversion settlement or chronological correctness. No new tests/builds ran for this design pass.
- Remaining work: exact instance resume, shared-clock correction, enforced participation/capacity and lifecycle semantics under the foundation plan, then actual elapsed-time/browser acceptance and a contrasting nonhuman flow. The source-traced campaign clock regression remains unfixed.
- Keep the distinction between implementation, scripted evidence and owner taste; neither this feature nor retained commitments is complete. Waiting/traversal are proposed foundation phases, not existing semantics.
- Next: review the expanded product/technical defaults and implement its first coherent phase when agreed. This checkpoint replaces the older instruction to finish browser evidence before doing the owner-requested design.
- Provider spend: no provider calls ($0); cumulative OpenRouter usage unverified.
