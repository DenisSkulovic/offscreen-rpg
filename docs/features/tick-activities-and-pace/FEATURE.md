# Tick-based activities and adjustable pace

Status: tick contract implemented; integrated runtime not exercised. See the [shared repair checkpoint](../dnd-checks-and-visible-outcomes/PLAN.md).
Approval: the owner authorized this correction and continued implementation on 2026-09-18.

## Intended outcome

Make elapsed simulation ticks produce durable rules-based outcomes. The character and setting define the meaning of an activity; the engine imposes no human calendar, occupation or currency. The player's real wait is controlled independently of fictional scale.

## Representative flow

A microbe attempts an eight-tick environmental response. A distinct environmental check is due every four ticks; the ability check is due at tick eight. Pause partway through a tick, change speed and resume: the fraction remains earned. An interruption at tick four holds there and prevents the later ability check and completion effects. Instant mode resolves the same ordered checks without a real wait. A quiet human routine or an abstract process uses the same contracts.

## Scope and acceptance

- Action durations, cadence, committed positions and dice receipts use integer ticks.
- Real timestamp anchors, rational ticks-per-real-duration rates and fractional progress are separate from the mechanical cursor.
- Zero-duration actions are explicit. Quiet ticks need no per-tick write or inference.
- Pause, restart, speed changes, catch-up and duplicate wakes cannot duplicate or skip due consequences.
- Bounded batches preserve earned progress. Controls wait for due catch-up instead of changing already earned time.
- An interruption stops later checks and completion effects. Automatic resumption of an interrupted plan remains unimplemented.
- Old hourly and millisecond records remain inspectable and are never silently reinterpreted as ticks. The earlier narrative fixed-wait path retains its own protocol.

## Owning specifications

[Time and autonomy](../../time-and-autonomy.md), [tick and tag contracts](../../technical/ticks-and-tags.md), [rules and activities](../../technical/rules-and-activities.md), and [settings and clock](../../technical/story-settings.md).
