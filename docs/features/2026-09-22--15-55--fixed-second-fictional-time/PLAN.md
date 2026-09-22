# Implementation plan

Feature: [Fixed-second ticks and fictional action time](FEATURE.md).
Execution scope: phases T1–T3 are authorized by the owner's 2026-09-22 instruction to proceed toward the agreed POC. Complete one coherent phase at a time; no provider calls are part of implementation.
Implementation owner: Codex in this thread; owner review remains the final play-quality gate.

## Phases

### T1 — Model/admission boundary and fixed scheduler rate

- Outcome: newly generated finite actions and clock-wait processes carry positive whole fictional seconds. Story speed contains only fictional seconds per fixed one-real-second tick. Application admission and estimates no longer freeze a model-authored scheduler tick count.
- Owners: game time/immediate-action/activity schemas, Storyteller task schemas/instructions/fixtures, campaign settings, finite-action and clock-wait admission/reads.
- Replace disposable versioned shapes together. Keep exact rational earned fictional progress and fixed 1,000 ms scheduling arithmetic. Convert public views and context to fictional seconds plus derived real wait. Do not add aliases that accept the obsolete fields.
- Checks: focused game time/action tests, Storyteller schema tests, and one provider-free campaign finite-action plus clock-wait integration. These cover the authority boundary and speed conversion without pretending to prove the entire clock migration.
- Exit: no generated action schema or current runtime field in this slice asks the model for ticks; builds and focused tests pass.

### T2 — Remaining mechanical time coordinate

- Outcome: contribution/check cadence, world obligations, accepted-plan horizons, calendars and lifecycle events use the same fictional-second coordinate, with legacy tick names removed from current contracts and disposable persistence.
- Owners: game activities/world obligations/calendar, campaign persistence/migrations, controls, worker scheduling, accepted plans and public history.
- Preserve ordering, replay fences, exact partial progress and bounded catch-up. Reset incompatible local prototype data rather than decoding both meanings.
- Checks: A→B→A, equal-boundary world obligation, pause/speed/restart, accepted horizon and calendar projection.
- Exit: repository search finds no current executable field whose `tick` name still means fictional time; historical prose may describe old evidence.

### T3 — Seyda timed-work proof

- Outcome: the maintained start supplies explicit local warehouse terms through content/authorized mechanics: substantial fictional duration, bounded work, six-septim completion and no inferred employment semantics.
- Owners: start/world content, generic start-package mechanical opportunity contract, Story mode evidence and connected POC ledger.
- Exercise provider-free first, then run a separately reconciled Sol diagnostic under one profile and one contrasting profile.
- Exit: deterministic play pays once after substantial time; a 10–15-turn owner play attempt can test story quality rather than known timing/reward defects.

## Current checkpoint

- Current phase and exact next action: T1 is complete. T2 next renames the remaining fictional-time coordinate through progress, obligations, accepted horizons, persistence and scheduling while preserving exact rational progress and boundary ordering.
- Base/reviewed Git revision and relevant uncommitted changes: base `133a20e`; T1 replaces model-visible duration/cadence ticks with whole fictional seconds, replaces configurable tick milliseconds with an exact fictional-seconds/real-seconds speed ratio, updates headless play and player labels, and rejects obsolete fields through strict schemas.
- Actual checks/results for this revision: game build plus 34 tests passed; Storyteller build plus 36 tests passed; application build plus 15 tests passed; contracts, web production and API-integration builds passed. The provider-free focused Storyteller integration passed the finite-action pause/speed and clock-wait completion worker path. The representative timing test proves 1,800 fictional seconds take five real seconds at 360x and, after two seconds of progress, six more seconds at 180x. No broad lint or repository-wide test run was needed.
- Unresolved findings/blockers: internal persistence and mechanical coordinate names still use `tick`, `elapsedTicks`, target/due ticks and related function names. They now carry fictional seconds consistently but remain misleading until T2. Disposable local prototype data will be reset rather than dual-decoded.
- Provider spend and accounting certainty: no provider call in this phase. Latest independent cumulative OpenRouter usage is USD 0.160344; local attempts are settled with zero reservation and no uncertainty.
