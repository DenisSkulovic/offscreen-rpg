# Hourly activities, travel checks and adjustable pace

Status: Designed; not implemented.
Approval: The owner requested these product capabilities and documentation/handoffs on 2026-09-18. Detailed POC policies below are proposed design decisions; bulk implementation is not authorized by this documentation request.

## Intended outcome

Make time produce real rule outcomes. Five game hours of work yield five hourly results; twenty hours of travel can have twenty quiet encounter checks. Provide real-day/hour/minute mappings and instant progression to the next meaningful boundary, without multiplying model calls.

## Representative flow

Start five hours of work. See hourly progress, roll history and cumulative wages. Pause partway through an hour: no extra time or wages accrue. Resume at a faster rate; completed rolls stay unchanged. Choose instant for remaining work and receive the same rules-based results without waiting. On a twenty-hour journey, an encounter at hour seven holds progression there rather than awarding thirteen further hours or showing a prepared final arrival.

## Scope and boundaries

Bounded work/travel activity definitions, durable hourly segments, quiet summaries, encounter holds, rational clock rates, instant mode and explicit current-activity reschedule. Depends on real rules and settings authority. Initial activities are whole-hour durations up to 24 game hours. No infinite routine loop, full economy, character advancement, spatial engine, combat rounds or multiplayer clock.

## Acceptance

- N completed hourly work segments have N stable outcomes; currency derives only from committed segments.
- Quiet encounter rolls allow uneventful travel; occurrence and action success remain distinct.
- Pause, offline catch-up, restart, speed change and stale timers cannot duplicate/skip payable segments.
- Instant processing stops at the first decision/encounter/system blocker and retains all required rolls.
- A five-hour routine uses code for checks and deterministic intermediate reports; no mandatory hourly LLM calls.
- Existing fixed prepared waits retain their declared semantics and are not silently reinterpreted.

## Decisions still needed

No blocker to the documented bounded offline subset. Exact D&D edition/content reuse must be selected before claiming full compatibility or importing published content. Broader combat, autonomy and shared-world policies are outside these features.

## Owning specifications

- [D&D rules and agency](../../game-rules.md)
- [Storyteller customization](../../storyteller-settings.md)
- [Rules and activities](../../technical/rules-and-activities.md)
- [Settings and clock](../../technical/story-settings.md)
