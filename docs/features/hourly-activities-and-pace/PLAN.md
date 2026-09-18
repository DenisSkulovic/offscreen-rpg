# Implementation plan

Feature: [Hourly activities, travel checks and adjustable pace](FEATURE.md).
Execution scope: documentation/handoff only so far; implementation awaits an instruction to proceed.
Implementation owner: Cursor by default; reviewer: Codex.

## Phases

### Phase 1: activity and segment execution (next ready after dependencies)

Dependencies: D&D feature connected receipts/effects; versioned settings authority. Owners: db activity/segment records, server rules/activity operations, workflows/outbox and contracts. Follow technical/rules-and-activities.md for keys, captures, bounded batches, partial-hour and interruption semantics. Start with five-hour authored work plus twenty-hour authored route definitions; each carries its supported check/encounter policy. Use a new activity executor, not the old prepared-arrival writer on the same activity. Commit due check/effect/progress/next wake atomically. Exit: quiet segments advance once and encounter boundaries hold without inferred future progress.

### Phase 2: clock controls and scheduling

Depends on phase 1. Owners: server clock/controls, db anchors, worker scheduling and API. Implement rational pace plus explicit instant using technical/story-settings.md. Settle elapsed old-rate boundaries before rescheduling; bounded catch-up can report pending control rather than claim the new rate already applied. Retain partial-hour time, control revisions, pause state and fixed response deadlines. Enforce locks and activity caps. Exit: stale wake-ups cannot bypass a pause or apply an old projection after speed change.

### Phase 3: visible routine and travel loop

Depends on phases 1–2 and contextual offers. Owners: UI, server safe reads/history, AI report/encounter context and offline fixtures. Display game duration, real estimate, completed checks and partial progress; expose explicit reschedule semantics. Summarize quiet batches deterministically, optionally narrate completion once. Hold encounters for bounded composition and then present contextual options; unavailable generation shows an honest held state. Exit: work/pause/speed/finish and travel/encounter/choice are connected saved-story flows.

Optional evidence: use injected rolls and a controlled clock for five-hour completion, quiet twenty-hour route and hour-seven interruption. Run only if requested/useful, after edits; do not spend real hours or invoke a provider.

## Current checkpoint

- Current phase: design ready; implementation has not started. Next action: when assigned implementation, read phase 1 dependencies and current working changes, then implement that slice.
- Base: existing uncommitted storyteller runtime implementation; no isolated clean revision is claimed. Preserve staged and unstaged work. Existing admission captures one profile; generated continuations have no mechanical effects.
- Checks: none run for this documentation work. Checks are optional under [verification policy](../../../.agents/rules/verification.md), never a phase completion gate. Acceptance describes behavior to deliver, not a mandatory test suite.
- Blockers: dependencies listed per phase; broader edition/combat decisions do not block the bounded subset.
- Provider spend: $0; cumulative account usage unverified. Live inference remains disabled.
