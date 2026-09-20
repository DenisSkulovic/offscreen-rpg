# Implementation plan

Feature: [Calendars and consequential world deadlines](FEATURE.md).
Scope: prepared design/handoff; no runtime changes in this pass. Cursor is the default implementation owner; Codex reviews or implements when asked. Do not launch agents or provider calls. This consumes deliberate-time progression, not a new scheduler project.

## K1 — Bounded time definitions and calendar conversion

Status: implemented and checked; K2 is the next feature phase.
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

Status: active after K1 and deliberate-time T1/T2. Complete before claiming deliberate-time T3 handles timed plots; T3 must consult these boundaries when deciding whether preparation can safely overlap.
Outcome: a deadline or winter transition becomes a consequential, replay-safe boundary even during another accepted action.

Owners: game boundary ordering and supported event proposals; application campaign settlement/scheduling, action admission, holds, consequence preparation/publication and reads; DB schedule/receipt persistence; existing outbox/workflow wake; bounded Storyteller/setup schedule admission; Chamber controls and QA catalogue. Keep Temporal payloads as identity/revision hints; authoritative locks/checks remain in application operations.

Add one bounded set of exact finite schedule records with source/version, due tick, visibility, supported effects/follow-up and state. Admit authored and future generated schedules through the same validator. Compile relative calendar terms against their recorded origin once. Require explicit typed revisions to postpone/cancel; reject stale requests/new past deadlines. Do not parse prose into authority or bulk-precompute centuries of events.

Merge the nearest schedule boundary into the existing next-boundary calculation. Accepted execution alone advances toward it. Settle world conditions/hard cutoffs before productive effects at equal ticks; the initial hard deadline is exclusive. Preserve partial earned work and stop incompatible execution for a controlling event. Record effects/receipt/hold/outbox intent atomically; duplicate delivery cannot refire. Harmless transitions may revalidate and continue under the same accepted plan. Multiple due obligations retain independent receipts with a coalesced controlling turn when appropriate.

Required narration failure retains the trigger and hold; optional reports keep their existing semantics. No alternate event scheduler, generic annual job fleet or second generation budget. Include the nearest relevant deadline and active conditions in bounded context without leaking hidden schedules. An action crossing a relevant due boundary is not eligible for blind result precomputation.

Acceptance: 55-day deadline interrupted journey; winter changes one supported route condition; same-tick cutoff; paused/idle campaign; long accepted offline plan; stale wake after a schedule revision; retry after generation failure; no exact public countdown for uncertain knowledge. Keep normal tick/receipt provenance and actionable safe logs. Add deterministic Chamber controls before making cases manually runnable.

Exit: connected offline timed story plus ordinal/custom date variants, truthful UI and QA coverage. Fold remaining useful guidance into permanent docs and remove the feature folder when both phases are delivered. Advanced calendars/seasons remain outside this feature, not unfinished hidden requirements.

### K2a — Exact finite obligations and controlling interruption

Status: implemented; focused domain/build evidence exists, while the connected disposable-database interruption rehearsal belongs to K2b.

Persist one bounded obligation family with immutable source/revision, exact compiled due tick, visibility, supported condition change, follow-up classification and lifecycle. Admit authored start proposals through a validator that compiles dates once. Merge the nearest pending due tick into action and activity wake calculations, settle the obligation first at equality, preserve unfinished work, append a replay-safe receipt and place an independently owned controlling hold. Project public conditions, visible schedules and history without leaking hidden due ticks. No Storyteller arithmetic or provider work.

Exit: a due condition can interrupt either accepted execution exactly once, including after worker redelivery, while idle/paused campaigns do not advance. The controlling hold remains until K2b supplies its presentation/re-entry operation.

### K2b — Presentation, revisions and connected rehearsal

Prepare and publish the obligation's controlling scene under the retained hold, then explicitly revalidate/resume or replace interrupted work. Add typed postpone/cancel revisions, stale-wake rejection, coalescing for equal-tick obligations, optional non-controlling reports, Chamber controls and the connected 55-day deadline/winter rehearsal. Storyteller context receives only relevant visible obligations and active conditions.

Exit: the full K2 acceptance and failure/retry matrix is connected; K2 planned QA variants become available only where their driver can reproduce them.

## Benchmark reasoning

- Preparing for an arrival: exact admitted deadline consumes world time through short and long actions, even if the visible date is only Day N.
- Vvardenfell-style seasons: authored date labels plus explicit known route/condition changes; no assumption that every winter needs temperature/hunger systems.
- Space travel: one campaign clock can label a non-Earth day/year; simultaneous independent planet clocks are unnecessary for this proof.
- Microbe/abstract entity: cycles or elapsed ticks with an exact condition boundary; no calendar schema mandatory for all content.
- Era names provide chronology context at setup without turning labels into world events. Later transitions can add effective-tick mappings without resetting time.

## Current checkpoint

- Phase: K2a implemented on base `400a143`; K1 remains complete. K2b presentation, schedule revisions and connected rehearsal are next before deliberate-time T3 overlap.
- Base: implementation followed deliberate-time T2 at `2bb8d10`; this checkpoint is awaiting its K1 commit.
- Implemented: K1 calendar definitions/projection plus K2a finite authored obligations, compile-once tick/date admission, exact/described/hidden visibility, typed world-condition effects, durable firing receipts, nearest-boundary action/activity wake clamping, hard-cutoff equality ordering, progress-preserving interruption, independent controlling holds, public condition/schedule/history projection and compact Storyteller conditions.
- Boundary: the monotonic campaign tick remains authority. Obligations advance only with accepted execution; idle and paused campaigns donate no time. K2a intentionally leaves the fired controlling hold unresolved because scene presentation, re-entry, postponement/cancellation and equal-tick coalescing belong to K2b.
- Benchmark reasoning: the Ember/Rain/Frost fixture proves unequal-month arithmetic and exact 55-day month addition. Ordinal Bloom days and elapsed cell cycles exercise non-Earth and abstract worlds without requiring human calendar concepts.
- Verification: 32/32 game tests passed, including calendar and obligation admission/visibility/condition policy; the focused application transition test proves hard-cutoff equality prevents finite-action resolution. Game, database, contracts, Storyteller and application builds passed; application and web affected-package typechecks passed. The action/activity database interruption journey has not yet been run. No provider calls were made.
- Open scope: K2b controlling-scene publication/re-entry, typed postponement/cancellation, equal-tick coalescing, stale-wake recovery and connected Chamber evidence; optional leap rules, reforms, multiple calendars and dynamic eras remain deferred.
- Spend: $0 application-provider spend; cumulative account usage unverified.
