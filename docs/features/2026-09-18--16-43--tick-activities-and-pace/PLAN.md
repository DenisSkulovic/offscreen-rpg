# Tick activity implementation plan

Feature: [Tick-based activities and adjustable pace](FEATURE.md).
Owner: Codex; continued implementation authorized on 2026-09-18.

## Current checkpoint

The tick slice is implemented on `a77fe13`; see the [shared checkpoint](../2026-09-18--14-49--dnd-checks-and-visible-outcomes/PLAN.md) for working state and next action. Content version 2 and activity plan version 3 use ticks. One clean migration creates the current schema; discarded prototype data is reset. No migration was applied.

Six source-only clock tests passed. No integrated app/build/type checks ran. The tests cover fractions across different rates, repeated anchors, pause/instant, completion bounds, wake rounding and a backward clock observation. They do not establish database/worker/UI integration.

## Remaining phase: generated activity flow

Blocked by the architecture review in [activity processes and world-defined progress](../2026-09-18--16-48--activity-processes-and-progress/FEATURE.md). Do not connect the current `durationTicks` plan to generated play or rename it into generic points. Preserve the clock arithmetic as potential scheduling infrastructure, then reshape admission, progress and completion only after the replacement design is approved.

Acceptance after redesign: human routine, microbe response and abstract process share the clock and lifecycle while retaining rule-specific progress semantics. Quiet intervals do not invoke a model per tick; generated interruption/choice tasks use saved outcomes. No provider call is authorized.
