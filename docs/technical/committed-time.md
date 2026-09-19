# Deliberate execution, action time and Storyteller readiness

Status: the T1 execution gate is implemented. Runtime clock projection requires an explicit accepted activity identity; no-hold state alone cannot advance time, and new work starts from the settled frontier. A required turn owns its hold from durable preparation intent through exact generation and published decision. Accepted-plan horizons prevent successor admission, and a preparation failure preserves both committed mechanics and the intent-owned hold without advancing time. The player projection distinguishes that pending preparation from an uncommitted action. Immediate dialogue is still timeless pending T2. [Time and autonomy](../time-and-autonomy.md) owns the product intent; [tick arithmetic](ticks-and-tags.md) owns units; the [implementation feature](../features/2026-09-19--22-13--deliberate-action-time/PLAN.md) owns finite-duration delivery. This document owns execution permission and its relationship to narration.

## Units and responsibility

Use the existing simulation tick and rational pace contract. A campaign's fictional scale is fixed independently of speed. Defined fixed duration units have exact positive mappings; calendar dates/months require a captured definition and epoch, not necessarily a constant multiplier. The [calendar contract](calendars-and-world-time.md) owns optional ordinal/custom dates and world deadlines. Otherwise display elapsed simulation units. Never recover executable units from prose. For a human-scale fixture, one simulation tick can represent one fictional second; that is a fixture choice, not universal anatomy or calendar policy.

Pace answers how many simulation ticks advance per eligible real duration. With one fictional second per simulation tick and pace 360 ticks per real second, an action lasting 1,800 ticks consumes thirty fictional minutes and five active real seconds. Doubling pace makes the same action take 2.5 real seconds; it still advances 1,800 ticks and has the same rule boundaries. Thirty fictional minutes is appropriate for a careful search, not automatically a quick glance. A ten-second glance is a different admitted duration. Numerical examples are not universal defaults.

A one-real-second progress display or scheduler heartbeat is not the unit of mechanical truth. Otherwise changing speed could make one work attempt represent different amounts of fictional labor. Keep check cadence, duration, quantities and world deadlines in stable simulation units. No mandatory database write, RNG draw or provider request per tick. Use meaningful boundary wakes and bounded ordered settlement.

## Permission to advance

Progression requires both an active accepted execution and absence of a blocking hold. An offer is permission to select; only acceptance grants execution. One solo actor has one advancing execution, which may be a finite short action or an activity under its own rule. Reuse the campaign clock and advancing-slot authority. Do not add a conversation clock alongside an activity clock.

An execution captures its identity, source offer and gameplay revision, admitted plan/rule version, start tick, remaining effort or target, pace/control revision, continuation authority and status. These are ownership requirements, not a separate table for every noun. An activity needs a meaningful next boundary and termination/accepted horizon; a finite action has an exact completion boundary. Work contribution is still earned by checks, not by a promised completion timestamp.

| Situation | Permitted time progression |
| --- | --- |
| Open decision or untouched activity menu; nothing accepted | None |
| No options and no active execution | None; show ended/blocked/current situation honestly |
| Accepted short action, wait or productive activity | Through its next valid boundary while unheld |
| Browser closed during accepted work | Same execution permission; stop at its limit, interruption or exhausted plan |
| Action finished; required narration still running/failed | None beyond the completion boundary |
| Optional report being generated | No permission of its own; another accepted activity may continue |
| Accepted chain ends or next entry is blocked | None until a permitted selection/continuation |
| Manual pause or controlling event | Stop the affected execution at the settled boundary |

Reads project only the accepted interval. Worker delays, missing wakes and old anchors cannot extend it beyond its target. At a terminal boundary, discard projected overshoot; at a transaction batch cap, retain eligible backlog and continue bounded settlement. Those are different conditions. Clear/reanchor idle intervals so starting new work tomorrow cannot inherit today's idle wall time. Quiet successor admission can preserve continuous elapsed time through an already accepted chain under existing ordered settlement; a scene or exhausted horizon cuts that permission.

Holding is an independent reason to stop accepted work; lack of an execution is the default absence of permission. Do not maintain an endless series of artificial idle holds to compensate for an always-running clock. Required preparation must still acquire its own durable intent-owned hold in the same transaction that requests it, including before a generation ID exists. Transfer ownership at admission and publication; never create a gap by clearing a decision hold and waiting for a worker to acquire another one.

## Every authored option declares time semantics

Time and resolution are separate dimensions. An automatic outcome can take time; a skill check does not specify a duration; a contribution process has an estimated duration rather than a fixed completion guarantee. Admission validates time along with effects, prerequisites and current situation authority.

The next schema should distinguish a fixed positive action duration, an activity-owned progress rule, and an explicit supported zero-time operation. Missing duration cannot default to zero. Zero time is appropriate for application controls and specifically supported instantaneous rules; ordinary dialogue, looking around, eating and combat attempts cannot become free merely because their result is atomic. The Storyteller proposes duration within supported content/rule bounds. The application rejects missing or unsupported timing rather than silently inventing a default five seconds for every option. UI grouping/navigation is not an in-world action.

The public offer shows the admitted fictional duration or work estimate and a real-wait estimate at the selected pace, without exposing hidden outcomes. Admission captures accepted terms and recomputes estimates under current settings; a stale client cannot supply its own time price. Pace changes preserve earned rational progress, affect only remaining waiting and never rewrite fictional duration, historical receipts or check cadence. Fine fictional granularity permits fast conversations without rounding every short action to a fictional hour or requiring a full second of real waiting. Instant mode removes the real wait but still advances declared fiction and applies due rules.

Start/resume is an execution control whose target rule owns future time. It must not spend a second copy of the activity duration. Supported end/cancel behavior preserves earned time and any already committed costs; it cannot refund the clock. For the first finite atomic action, use a non-cancellable execution with manual pause support. General interruptible actions use activity boundary semantics; do not add a partial-refund/cancellation system to the first slice.

## A selected action has two independent completion requirements

1. **Execution:** its eligible duration is consumed, required rules are settled, and its receipt/effects are committed exactly once.
2. **Presentation:** required narration has passed validation against that execution and is ready to publish.

The next interactive passage publishes only when both are satisfied and its source is still valid. Early generation cannot expose results, choices, inventory, facts, canonical history or retrieval evidence before execution completes. Slow generation cannot add fictional time. Show remaining action time separately from preparation state; never extend a completed countdown to disguise a slow provider.

For overlapping work starting together with no pause or interruption, visible readiness is approximately `max(action wait, preparation latency)`, plus dispatch/publication overhead. Sequential work is approximately their sum. An action with unknown intervening results must use the sequential path; do not present overlap as universal or promise provider latency.

### Safe overlap for a bounded atomic action

Overlap is allowed only when the application can establish a closed finite resolution: supported fixed duration; stable source/targets; a deterministic or once-drawn result; no unresolved intervening mechanical boundary, occurrence, competing commitment, cancellation or world change that could alter that result. Long productive work, travel hazards and general combat do not qualify automatically. A supported isolated combat attempt might later qualify under its rules; this feature does not implement full D&D combat scheduling.

Under the story lock, admit the selected action, reserve its source/resources, draw any supported check once and persist a **pending resolution**: frozen result, start/end tick, proposed effects and exact projected end-state digest. This is not a settled receipt and does not change current possessions or facts. Start the accepted execution and separately enqueue a single bounded preparation task. No model work occurs in the transaction, no alternative branches are generated, and reopening/retry never redraws the action.

The task contract explicitly identifies pending evidence and the frozen projected state. Reusing the current consequence schema unchanged would be wrong: it promises already committed results. Generated output remains private and source-bound. At completion, the engine validates the reservation/fences, applies the pending result once and creates its authoritative receipt. Publication requires that receipt plus the exact preparation identity and matching resulting state. Expected clock advancement does not stale its own preparation; unrelated mechanical/authorization changes do. A numeric story passage revision alone cannot express this distinction.

No caller may count the pending resolution as inventory, historical fact, earned work or canonical source. Capture it in durable execution/task storage for crash recovery, and promote references to the settled receipt only after commit. Logs may include identities/status but never disclose pending outcomes. A stale result is blocked and available for explicit bounded recovery, never silently rewritten into the new situation.

The first implementation may deliver sequential finite actions first, then add this explicitly gated overlap phase. Do not claim the feature's latency behavior complete at the sequential milestone. If the short action shares due world rules, route through ordered settlement and start generation after the actual receipt; do not disable those rules merely to permit overlap. [Scheduled-world K2](../features/2026-09-19--22-29--calendars-and-world-deadlines/PLAN.md#k2--world-obligations-in-ordered-execution) supplies campaign-level boundaries for timed plots. A player's inability to cancel an atomic action does not prevent a due world event from interrupting it.

### Failure, pause and delivery

Known mechanical execution and narration remain separately recoverable. If optional early preparation fails or cannot obtain budget, the accepted mechanical action may finish its already authorized duration and result; it stops at that boundary awaiting required narration. It cannot start another action or spend beyond the operation envelope. If mechanical safety itself becomes uncertain, stop the execution immediately with its own blocker. Uncertain provider billing stops further dispatch, not an automatic second attempt.

Before accepting a short action requiring a new turn, check available execution/spend authority using the existing bounded admission owner; do not knowingly consume an irreversible command when a known missing mandatory dependency can be reported before acceptance. Admission is not a guarantee against later provider failure. After acceptance, narration failure does not reroll mechanics or refund earned time. Preparation delay before dispatch does not create permission beyond the admitted action.

Manual pause settles earned time and retains the remainder. An in-flight provider result may be saved privately; it cannot complete the remaining action or clear manual pause. Pause after mechanics already completed can still allow the factual result to become readable, without starting anything else. Retry repeats only missing preparation/publication for the same execution; paid retry stays subject to operation limits. Duplicate timer/provider/outbox deliveries are idempotent. The event that observes both readiness conditions invokes the same publication owner, so neither completion ordering loses a wake.

## Decisions with deadlines

The initial solo POC keeps indefinite decisions. The architecture also permits a separately configured real response window with an exact authored default reference. Start the deadline at atomic publication of valid options; it is not shortened by their generation latency. Hold fictional time throughout the window. A player response and timeout compete under the same lock using database time and one sealed decision identity. A valid timeout selects the default once, then runs its normal duration/rules. Invalid/stale default or missing permission leaves an explained hold. A thirty-second decision timeout plus a five-second action spends five seconds of accepted action time, not thirty-five seconds of fiction.

This remains owned by the bounded-autonomy feature. Do not enable defaults in the current mechanical campaign by importing the legacy narrative rehearsal deadline behavior.

## Worked traces and acceptance checklist

All numbers below are fixture values. These are planned QA cases, not executed evidence or live-spend authorization.

| Trace | Accepted terms and timing | Required evidence |
| --- | --- | --- |
| Tavern conversation | Tick = fictional second; pace 60 ticks/real second. Three exchanges take 60, 120 and 30 ticks | World advances by 210 ticks; reading and generation latency add zero; each action has one receipt |
| Careful search, early prose | 1,800 ticks at 360 ticks/real second; preparation ready at real second 2 | At second 2 no result/effect is current; execution ends and next choices publish at second 5 |
| Same search, late prose | Same action; preparation ready at second 30 | Action ends at second 5; world remains at +1,800 while awaiting prose through second 30 |
| Generation failure/restart | Same accepted action and pending outcome; retry or worker redelivery | One random result and mechanical receipt; time neither repeats nor grows while blocked |
| Interrupted repair + conversation | Repair suspends at world 10 with 3 points; dialogue spends 2 + 3 ticks | World 15, repair still 3 points; explicit resume continues work from world 15 |
| Empty plan / untouched menu | Leave for a day before choosing; finish a finite wait with no successor | No idle advancement before/after the accepted interval and no extra event exposure |
| Quiet accepted plan | Wait then work, with an explicit horizon | Eligible accepted successor continues offline; terminal horizon/scene stops overshoot |
| Pause and speed change | Pause during an action, wait, resume at twice the rate | Same fictional duration/result; preserved earned fraction; early prose cannot unpause |
| Due interruption | A world rule becomes due before action completion | Ordered boundary stops incompatible execution; no premature reserved result or hidden lost event |
| Default-response extension | Published 30-second response window, authorized five-second default | Held deliberation; single selected command on expiry; ordinary five-second execution follows |
| Microbe / abstract entity | Explicit finite sensing/connection interval in content-defined units | Same clock/authority contract without a tavern, wallet or human calendar |

Trace artifacts need offer/execution/receipt/generation IDs, accepted terms, tick interval, pace revision, time eligibility/hold transitions, pending versus committed result, publication state, and provider allocations. The structured QA catalogue should gain these cases as **planned** during implementation, then become available only when Chamber controls can reproduce them. Never relabel existing zero-time fixtures as evidence for timed decisions.
