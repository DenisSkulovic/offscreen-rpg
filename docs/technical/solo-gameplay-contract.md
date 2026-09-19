# Connected solo gameplay: implementation contract

Status: maintained implementation contract. Its clock correction, authored quiet reuse, historical-report boundary and first durable two-entry accepted chain are implemented; explicit chain horizons/editing/cancellation, broader world preparation and delegated decisions remain proposed. No live inference, deployment or multiplayer behavior is authorized here.

Read the [gold session](playthroughs/harbor-session.md) alongside this contract. [Rules and activities](rules-and-activities.md) owns action/choice authority; [ticks](ticks-and-tags.md) owns units/exact arithmetic; [bounded autonomy](../features/2026-09-19--00-26--bounded-autonomy-and-reentry/PLAN.md) owns follow-ups/queues. This document owns the **integration decisions between those responsibilities**. Do not create a second progression engine to implement it.

## What is decided for the first proof

| Decision | Selected implementation default | Deliberately not claimed |
| --- | --- | --- |
| Simulation scope | One solo campaign clock; one advancing actor commitment initially | Independent scene clocks or multiplayer authority |
| Choice authorship | Each interactive publication explicitly supplies scene choices and activity authorization, including none | Options inferred from inventory, skill catalogue or route access |
| Quiet reuse | Reproject only the current authored selection; no model task per menu/read/repeat | Reusing a consumed offer or copying a cached reward |
| Fast scenes | Immediate actions have no artificial duration; new scenes can keep routines unavailable | Skipping rule-defined work or hiding model latency |
| Event absence | Hold at required interaction; no automatic player decision or response deadline in the first cut | Personality fallbacks or unattended combat |
| Reports | Optional historical text can finish late and cannot change current choices/state | Treating ordinary consequence output as safe report-only output |
| Planning | Standalone choices first, then finite explicit accepted chains | A planner inventing replacement work when blocked |
| New world state | Only supported typed declarations/effects and existing captured targets | Arbitrary actors/items/relations created by descriptive prose |

These defaults avoid waiting for broad autonomy or world simulation before proving the rhythm. Fallbacks, transformation, traversal, cooperation and long-memory retrieval retain their existing owners and gates. Do not weaken those larger features' acceptance or call them complete after the solo proof.

## A minimum state ledger

These are semantic responsibilities, not literal DTOs or a table per row. Reuse existing storage where it has the right meaning and split it only where independent lifecycle demands it.

| State | Owner and purpose | Changes when |
| --- | --- | --- |
| Campaign clock | Exact real anchor/rate/remainder, projected whole tick and settled-through frontier | Time is projected/settled, pace changes or a domain hold changes |
| Campaign gameplay revision | Fence for mechanically or interactively relevant state, distinct from narrative passage sequence | Rules/choices/authorization change, not merely a report arrives |
| Current situation authorization | Explicit scene choices, local opportunity references, scope/validity and handoff permission | Storyteller/authored scene publication replaces it |
| Definition/package versions | Validated reusable rule content and target bindings | Explicit admitted preparation/revision, never reward settlement |
| Work instance | Accepted terms, exact identity/revision, earned effort/progress, lifecycle and boundary receipts | Participation or rules settle; definition reuse does not replace it |
| Holds | Independently owned manual, decision and system reasons | The owner of each reason sets/clears it |
| Follow-up intent | Boundary+hook identity, frozen snapshot, report/scene semantics and recovery status | Mechanical transaction creates it; separate task/publication consumes it |
| Accepted plan | Player permission, ordered entries, horizon, revision and cursor | Player accepts/edits or an admitted transition consumes an entry |
| View version | Monotonic browser snapshot ordering | Any visible change, including a historical report |

The current `campaignConsequence` uniqueness on narrative revision assumes one controlling consequence. It is not a safe identity scheme for multiple historical reports alongside a scene. Follow-up intents must deduplicate by source receipt and hook, with at most one controlling interaction in the initial solo scope. Do not simply remove the database constraint and hope workers coordinate.

Current `story.revision` selects a committed passage sequence; `game_offer.narrativeRevision` and publication depend on that relationship. Do not increment it as a generic world-state counter without appending a passage. Add an explicit campaign state fence where needed and capture both current passage and gameplay revision for interactive generation. Mechanical history can still append factual passages through its existing owner. Historical reports attach separately and cannot become the current passage by accident.

## Clock correction: the nearest implementation boundary

Current source owns pace/anchor/fraction on `game_activity`; receipts and campaign tick use `plan.startTick + boundaryTick`. That is wrong after another activity runs. Move real-time progression authority to the campaign, and stamp every receipt at its actual world boundary. Never repair this with `max(oldTick, calculatedTick)`: that hides the rewind while leaving cadence/history wrong.

Use discrete integer simulation ticks. The exact rational fraction measures progress **toward the campaign's next tick**, not fractional fictional work owned by an activity. An active instance accumulates whole eligible world ticks; it retains unfinished whole-tick effort toward its next attempt across suspension. Removing per-activity real anchors/fractions is an intentional prototype format change, not a migration/compatibility project.

Example: at projected world 3 plus 1/2 tick, switching A to B records the switch at tick 3. A retains three eligible ticks; the campaign retains the half-tick clock remainder. B owns subsequent whole tick advances; the first can occur half a real tick later. This is explicit simulation quantization, not double credit: the fractional remainder is held once, not copied into both jobs. If finer physical timing is needed, choose a finer tick presentation/rate; do not quietly invent fractional authoritative event positions. A pause/resume without a switch retains that same fraction and A's effort.

The clock runs through authorized quiet periods, including idle time, unless a declared domain hold applies. An idle interval earns no activity progress. Immediate decision/preparation periods in this solo proof hold simulation; their wall-clock thinking/model time earns no labor. Do not advance a narrative-only prepared-arrival flow and the mechanical campaign clock simultaneously; the legacy narrative rehearsal remains a separate path, not another scheduler for the same campaign.

Phase-one algorithm under the story lock:

1. Read database time; project the campaign clock at its old pace/hold state. Keep this target distinct from the settled frontier.
2. Find the next due meaningful boundary from the active work's retained effort and current eligible interval. Translate it to a world tick, not its original start. Settle at most the existing 24-boundary batch limit.
3. Commit receipts/effects in order. If a controlling event occurs, stop exactly there and establish the hold. Time projected beyond that boundary is not banked for later; reanchor at the observed real time without awarding unseen post-event work.
4. If a batch limit leaves due work, preserve catch-up and reject/defer the requested control without pretending it applied. Do not throw away the committed batch. No later command may jump past that backlog.
5. Once caught up, evaluate command freshness/permission and apply the change. A rejected switch does not suspend A, although already-due history can legitimately have settled first. Record accepted command identity and changed work/clock/offer state atomically.
6. Schedule the next due obligation. Wakes carry identity/revision hints and recheck database authority; the browser never advances time. With no due obligation, no periodic timer is needed merely to make the idle clock project correctly.

Keep one advancing work pointer in the first phase. This corrects chronology without claiming cooperative allocation. Future obligations must join the same scheduler when introduced, not each rebuild time from their own start. Keep safe-integer tick bounds and existing exact rational arithmetic.

### Equal-tick resolution and goal-reaching interruption

Use one declared order: due condition changes/hard expiry, productive attempt, due occurrence schedules in authored order until first interrupt, then completion if not blocked/interrupted. Future exclusive expiry means work at the expiry tick is too late; expiry is not required in the first cut.

If a contribution reaches 9/9 and the same boundary's occurrence interrupts, store goal reached with completion pending. Do not award completion, roll another contribution, replay the occurrence, or label the work completed. After explicit authorized resumption, recheck target/eligibility at current world time and settle pending completion immediately if valid. If an intervening rule invalidated the target, follow that rule instead. This resolves the earlier ambiguity in BC-06 and matches existing contribution-before-occurrence ordering without preserving its missing pending-completion handling.

For BC-04, B's five ticks move world time 10→15 while A stays at local effort 10. A's next attempts occur at world 20 and 25, not 15 and 20. A local work cursor is never a substitute for a world receipt position.

## Situation authorization: reuse is not permission

A task sees the relevant supported definitions and returns an explicit next situation: its scene intentions, activity access (none or named references) and any permitted transition. Current authored selection is separate from reusable content. Omission never means inherit; an explicit carry-forward lists exact versioned references and is validated against current state.

The engine filters authored options for mechanical eligibility. It cannot expose eating because an apple exists, reveal a dormant opportunity after a scene merely because its conditions pass, or turn a temporary generation failure into a generic activity menu. A reusable definition may outlive several situations while being offered in none of them.

A quiet receipt or historical report preserves the current situation authorization unless an admitted rule explicitly invalidates it. A new interactive situation replaces it atomically with the passage/offer. Starting a retained instance, switching work and admitting a queued entry all require that current authority. Completing a scene alone does not clear these fences.

Initial bounded proposal defaults: at most eight new/revised definitions in a preparation result, six activity references in one authorization, four scene intentions, and six total player-facing options after admission. These are configurable implementation caps, not world laws. Reject oversized output; do not silently truncate choices. A missing required definition, scope or effect is a rejected proposal, not permission for the engine to improvise.

For the first proof, use authored inputs through the production task/admission path and existing supported fact targets. Later generated packages use the same validator. Proposed new objects/actors beyond that vocabulary remain unsupported until their owning feature supplies admission. A fresh scene containing a named stranger is not sufficient proof of a general entity system.

## Boundary follow-ups and task contracts

Capture reporting, interaction and continuation together as one validated policy. Mechanics emits a typed boundary; application code commits its receipts and follow-up intents. No network/model call occurs in that transaction. All branches must expose their literal generation-task count, not merely provider spend.

| Kind | Input and allowed output | Publication fence / continuation |
| --- | --- | --- |
| Quiet factual | Committed receipt; no task | Preserve current authorization if still valid; idle, offer authored work or continue an accepted eligible entry |
| Historical report | Frozen receipt/snapshot, source evidence and profile; prose only, no plans, note patches or effects | Deduplicate source+hook; attach to its historical receipt even if time moved. Increment visible-history version, not current gameplay/offer revision |
| Controlling scene | Trigger/receipt, current state, relevant work/authorization and supported content; scene, validated plans and explicit next authorization | Match controlling intent/current source state; preserve unrelated holds. Does not replay resolved mechanics |
| Optional event candidate | Same scoped evidence, but no hazard invented yet; admitted scene proposal or explicit no-development outcome | No-development allowed only under captured candidate policy; release that candidate hold and preserve prior authorization only if still valid and explicitly permitted by that policy |

A report is stored as a historical annotation, not the new current passage/offer. If a task must introduce a new actionable fact or choice, it is a scene, not a report with relaxed stale checks. Required facts already committed in a receipt are never omitted because report generation failed.

The first interactive proof can use the existing authored stranger hazard and consequence machinery extended with explicit authorization; generic candidate/world proposal generation is later work. Do not pretend that a scene-only schema already creates arbitrary villains. Production code must not branch on beacon/Seyda Neen names.

Task context must include relevant activity identity/progress/pending completion, current authorization refs, holds and accepted continuation terms when those constrain the response. Today's raw receipt packet does not provide every such field. Capture them at one source revision, validate supported output independently at publication, and reject mandatory-context overflow before inference. Keep the current 48-KiB envelope unless a separately justified change is made. Token sketches in the atlas are not permission to inflate it.

## Commands, recovery and what the player sees

| Situation | Required application behavior | Player explanation |
| --- | --- | --- |
| Duplicate accepted selection | Return original receipt/current projection; no draw/debit again | Same result, not another animation suggesting a new attempt |
| A new command uses stale offer/authorization | Reject before new effects; retain due history already settled | Refresh current choices; no generic replacement action |
| Two optional reports/one scene at a boundary | Distinct hook identities; one controlling interaction; scene hold wins over successor | Committed result remains, further work waits |
| Optional report fails | Apply captured omit/defer policy; default fixture uses factual-only fallback | Outcome readable, optional prose unavailable |
| Required scene fails validation/preparation | Keep its system/decision hold; explicit bounded recovery | Result committed; next scene unavailable/retryable |
| Successful generation, failed publication | Retry publication of saved result when fence allows; no new provider call | Preparing/recovery, not a rerolled outcome |
| Stale scene after relevant world change | Do not publish; explicit re-preparation only within budget/recovery policy | Explain stale preparation; do not silently resume |
| Manual pause during generation | Publication may finish if otherwise valid, but preserves manual hold | Ready scene; campaign still paused |
| Cancel future plan | Cancel pending entries only; separate explicit command stops current work | Past rewards and position remain; current work status is clear |
| UI closes | No permission/hold change merely from disconnect | Accepted work continues or existing interaction holds |

The first proof has no unattended decision deadline. Its held scene can wait indefinitely, clearly visible on return. Later fallback phases must establish finite real response windows, legal actions and arbitration before enabling autonomous responses; do not inherit a narrative-rehearsal default into mechanical gameplay.

Report and scene generation failures must not disable unrelated quiet play when no controlling hold exists. Conversely, budget unavailability is not permission to bypass a committed hazard. Paid-attempt ambiguity retains reservations and stops further paid attempts under the repository spending rule.

## Chain and idle edges

Initial plan: at most six finite linear entries, each a new-work definition or exact resume reference, with explicit accepted horizon and stop behavior. Entries must be stoppable at that horizon under supported rules; reject a plan whose promise cannot be honored. Horizons use campaign ticks, not mandatory human hours. No automatic skip/replan or speculative resource reservation.

The chain alone owns successor admission. A completion hook emits a continuation request; it cannot create a second child. Each start checks the current authored handoff/scope, mechanical eligibility, player permission and the accepted absolute tick horizon, atomically consumes its entry and starts once. The horizon prevents a successor from starting at or beyond its tick; it does not truncate already-running work between its admitted boundaries. Quiet automatic transitions occur at their boundary during catch-up. A fresh player click after idling starts at the current settled tick, never retroactively at the prior completion.

Scope validity may explicitly cover an authored itinerary, but a new controlling situation invalidates implicit continuation; resumption requires an authored handoff. Stop on missing preconditions and expose the blocked entry. Do not wake the model merely to invent a replacement. Queue cancellation preserves current/past work unless separately stopped.

## Evidence and implementation discipline

Use the gold session's identities and ordered expected state as the primary acceptance oracle, with BC-04, LO-04 and NH-03 as targeted contrasts. Avoid implementing unsupported travel, combat or anatomy merely to mirror their nouns. Tests are optional under repository policy; when useful, use injected deterministic draws and real application transactions, never production scenario switches or direct database completion/offer restoration.

The first coding handoff is [activity phase 1](../features/2026-09-18--16-48--activity-processes-and-progress/PLAN.md). The [feature index](../features/README.md) supplies subsequent ownership/order. Finishing a documentation phase proves neither running behavior nor enjoyable generated writing.
