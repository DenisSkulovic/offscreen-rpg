# Implementation plan

Feature: [Hourly activities, travel checks and adjustable pace](FEATURE.md).
Execution scope: all phases authorized by the owner on 2026-09-18.
Implementation owner: Codex, explicitly assigned by the owner.

## Phases

### Phase 1: activity and segment execution (next ready after dependencies)

Dependencies: D&D feature connected receipts/effects; versioned settings authority. Owners: db activity/segment records, server rules/activity operations, workflows/outbox and contracts. Follow technical/rules-and-activities.md for keys, captures, bounded batches, partial-hour and interruption semantics. Start with five-hour authored work plus twenty-hour authored route definitions; each carries its supported check/encounter policy. Use a new activity executor, not the old prepared-arrival writer on the same activity. Commit due check/effect/progress/next wake atomically. Exit: quiet segments advance once and encounter boundaries hold without inferred future progress.

### Phase 2: clock controls and scheduling

Depends on phase 1. Owners: server clock/controls, db anchors, worker scheduling and API. Implement rational pace plus explicit instant using technical/story-settings.md. Settle elapsed old-rate boundaries before rescheduling; bounded catch-up can report pending control rather than claim the new rate already applied. Retain partial-hour time, control revisions, pause state and fixed response deadlines. Enforce locks and activity caps. Exit: stale wake-ups cannot bypass a pause or apply an old projection after speed change.

### Phase 3: visible routine and travel loop

Depends on phases 1–2 and contextual offers. Owners: UI, server safe reads/history, AI report/encounter context and offline fixtures. Display game duration, real estimate, completed checks and partial progress; expose explicit reschedule semantics. Summarize quiet batches deterministically, optionally narrate completion once. Hold encounters for bounded composition and then present contextual options; unavailable generation shows an honest held state. Exit: work/pause/speed/finish and travel/encounter/choice are connected saved-story flows.

Optional evidence: use injected rolls and a controlled clock for five-hour completion, quiet twenty-hour route and hour-seven interruption. Run only if requested/useful, after edits; do not spend real hours or invoke a provider.

## Current checkpoint

- Status: connected authored mechanical slice implemented; full feature acceptance remains partial. The shared resolver and consequence narrator now use captured action content and the existing execution/publication/retry lifecycle.
- Follow the [current repair checkpoint](../dnd-checks-and-visible-outcomes/PLAN.md) for the delivered boundary, remaining generated opportunity/adjudication work and next action. Do not recreate the retired scenario-specific path.
- Base: `ae9d144`; implementation remains uncommitted. Migration 0017 adds captured content; it has not been applied. Earlier prototype records remain inspectable with explicit unsupported status.
- Verification: source review only. No builds/tests/lint/runtime checks or live calls. Provider spend $0; cumulative account usage unverified.
