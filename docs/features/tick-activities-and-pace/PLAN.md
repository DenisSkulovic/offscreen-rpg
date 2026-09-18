# Tick activity implementation plan

Feature: [Tick-based activities and adjustable pace](FEATURE.md).
Owner: Codex; continued implementation authorized on 2026-09-18.

## Current checkpoint

The tick slice is implemented on `a77fe13`; see the [shared checkpoint](../dnd-checks-and-visible-outcomes/PLAN.md) for working state and next action. Content version 2 and activity plan version 3 use ticks. One clean migration creates the current schema; discarded prototype data is reset. No migration was applied.

Six source-only clock tests passed. No integrated app/build/type checks ran. The tests cover fractions across different rates, repeated anchors, pause/instant, completion bounds, wake rounding and a backward clock observation. They do not establish database/worker/UI integration.

## Remaining phase: generated activity flow

Depends on consequence preparation isolation and bounded DM planning. Reuse the admitted tick plan and resolver; no work/travel handlers. Present committed tick progress, real wake estimates, dice and the next constrained intention. An interruption stops the original commitment; explicit resumption needs a validated continuation plan. Optional calendar labels are content presentation, never an implicit conversion.

Acceptance: human routine, microbe response and abstract process share the clock. Quiet intervals do not invoke a model per tick; generated interruption/choice tasks use saved outcomes. Exercise the connected offline flow when useful or requested. No provider call is authorized.
