# Implementation plan

Feature: [Calendars and consequential world deadlines](FEATURE.md).
Scope: prepared design/handoff; no runtime changes in this pass. Cursor is the default implementation owner; Codex reviews or implements when asked. Do not launch agents or provider calls. This consumes deliberate-time progression, not a new scheduler project.

## K1 — Bounded time definitions and calendar conversion

Status: ready as a pure-domain slice; connected start/settings/offer display follows deliberate-time T2's duration contract.
Outcome: stable world-time definitions and deterministic date conversions without special-casing settings in shared handlers.

Owners: game time and a cohesive calendar-policy module/export; contracts for campaign setup/snapshot; application campaign settings/start/reads; captured campaign time definition in the single DB baseline; content fixtures; bounded Storyteller temporal projection. Read current package exports and persistence ownership before choosing module splits.

Bounded changes:

1. Add strict variants for elapsed units, ordinal day count and a named fixed repeating year with unequal month lengths. Capture stable IDs/revision, positive integer day length in ticks, epoch and optional initial era/year label. Validate representable boundaries and integer bounds. No host Gregorian/UTC conversion for fictional dates.
2. Implement pure projection and exact-date compilation plus day-preserving month addition with invalid-date rejection. Stable month IDs carry meaning; labels are display. Use captured epoch/revision, never the current real date or mutable catalogue.
3. Persist the admitted definition atomically at campaign start and expose only the selected mode's public fields. Speed updates cannot change its physical units/epoch. If storage C1/C2 exists, reference immutable admitted content through that owner; otherwise keep a captured data snapshot, without a separate storage framework.
4. Connect duration/date labels to current ticks and offers without inventing an event or tick advance. Provide compact normalized temporal context under existing task caps. The Storyteller does not perform date arithmetic.
5. Add planned calendar/deadline QA catalogue coverage and make only reachable calendar cases available. Retain original tick/provenance in history; no retroactive reinterpretation of receipts.

Relevant evidence: unequal-month arithmetic, day/year boundary, nonzero epoch, custom day length, invalid target date, range errors and identical output across pace changes. No per-date model work. Checks remain optional; narrow pure-policy checks are the useful probe if requested.

Exit: current time and exact date/duration translations work through captured definitions, including ordinal-only worlds. Calendar labels still have no automatic seasonal effects. Commit/push before K2.

## K2 — World obligations in ordered execution

Status: follows K1 and deliberate-time T1/T2. Complete before claiming deliberate-time T3 handles timed plots; T3 must consult these boundaries when deciding whether preparation can safely overlap.
Outcome: a deadline or winter transition becomes a consequential, replay-safe boundary even during another accepted action.

Owners: game boundary ordering and supported event proposals; application campaign settlement/scheduling, action admission, holds, consequence preparation/publication and reads; DB schedule/receipt persistence; existing outbox/workflow wake; bounded Storyteller/setup schedule admission; Chamber controls and QA catalogue. Keep Temporal payloads as identity/revision hints; authoritative locks/checks remain in application operations.

Add one bounded set of exact finite schedule records with source/version, due tick, visibility, supported effects/follow-up and state. Admit authored and future generated schedules through the same validator. Compile relative calendar terms against their recorded origin once. Require explicit typed revisions to postpone/cancel; reject stale requests/new past deadlines. Do not parse prose into authority or bulk-precompute centuries of events.

Merge the nearest schedule boundary into the existing next-boundary calculation. Accepted execution alone advances toward it. Settle world conditions/hard cutoffs before productive effects at equal ticks; the initial hard deadline is exclusive. Preserve partial earned work and stop incompatible execution for a controlling event. Record effects/receipt/hold/outbox intent atomically; duplicate delivery cannot refire. Harmless transitions may revalidate and continue under the same accepted plan. Multiple due obligations retain independent receipts with a coalesced controlling turn when appropriate.

Required narration failure retains the trigger and hold; optional reports keep their existing semantics. No alternate event scheduler, generic annual job fleet or second generation budget. Include the nearest relevant deadline and active conditions in bounded context without leaking hidden schedules. An action crossing a relevant due boundary is not eligible for blind result precomputation.

Acceptance: 55-day deadline interrupted journey; winter changes one supported route condition; same-tick cutoff; paused/idle campaign; long accepted offline plan; stale wake after a schedule revision; retry after generation failure; no exact public countdown for uncertain knowledge. Keep normal tick/receipt provenance and actionable safe logs. Add deterministic Chamber controls before making cases manually runnable.

Exit: connected offline timed story plus ordinal/custom date variants, truthful UI and QA coverage. Fold remaining useful guidance into permanent docs and remove the feature folder when both phases are delivered. Advanced calendars/seasons remain outside this feature, not unfinished hidden requirements.

## Benchmark reasoning

- Preparing for an arrival: exact admitted deadline consumes world time through short and long actions, even if the visible date is only Day N.
- Vvardenfell-style seasons: authored date labels plus explicit known route/condition changes; no assumption that every winter needs temperature/hunger systems.
- Space travel: one campaign clock can label a non-Earth day/year; simultaneous independent planet clocks are unnecessary for this proof.
- Microbe/abstract entity: cycles or elapsed ticks with an exact condition boundary; no calendar schema mandatory for all content.
- Era names provide chronology context at setup without turning labels into world events. Later transitions can add effective-tick mappings without resetting time.

## Current checkpoint

- Phase: prepared; nearest project work remains deliberate-time T1/T2. K1 can then supply concrete calendar projection, followed by K2 before time-sensitive overlap acceptance.
- Reviewed base: `7fe626a`, clean tree before this pass. Documentation changes only; no runtime/schema edits.
- Investigation: existing game time supports rational tick rates; campaign activities settle their own due boundaries. No custom calendar definition or campaign-level calendar/deadline model was found in the inspected time/campaign owners. Existing tick/hold structure is reusable, but scheduled-world obligations require implementation.
- Verification: source/design reasoning only; no tests/builds/provider calls. Planned QA traces are not executed evidence.
- Open scope: optional advanced calendar and era/season behavior remains deferred as specified. Numerical calendar data belongs to fixtures/content.
- Spend: $0 application-provider spend; cumulative account usage unverified.
