# Red Mountain: the itinerary is not one giant timer

Companion to the [chained-journey benchmark](../../playthroughs.md). Entire chain/traversal/report flow is target behavior. The [autonomy plan](../../features/2026-09-19--00-26--bounded-autonomy-and-reentry/PLAN.md) owns the contract; these are worked fixture terms, not an API schema or a canonical map of Morrowind.

## RM-01: accept a small itinerary

The player chooses:

```text
Seyda Neen → travel to Balmora → sleep there → tavern downtime
           → travel to the Gate → sleep there → travel toward Red Mountain
```

The plan preview shows each intention, estimated duration, known start requirements, stop conditions and selected narration. It does not promise success for all six steps. The player can remove tavern downtime without needing the model to rewrite a giant adventure paragraph.

Fixture: one tick = one fictional minute; rate = one tick per real minute. These durations are demonstration terms, not setting lore or a requirement to use this slow rate in the visitor demo.

| Entry | Rule | Uninterrupted fixture duration | Completion treatment |
| --- | --- | ---: | --- |
| T1: to Balmora | Traversal, 120 route units at 1/tick | 120 ticks | Factual, attempt T2 |
| T2: sleep | Clock wait, with accepted recovery effect | 480 ticks | Factual, attempt T3 |
| T3: tavern downtime | Three 20-tick social cycles | 60 ticks | Factual, attempt T4 |
| T4: to the Gate | Traversal, 180 route units at 1/tick | 180 ticks | Selected generated report, attempt T5 |
| T5: sleep at Gate | Clock wait | 480 ticks | Factual, attempt T6 |
| T6: toward Red Mountain | Traversal, 120 route units at 1/tick | 120 ticks | Factual, idle |

Total without holds or route changes: 1,440 ticks, one real day at this fixture rate. That total is an explanatory sum, not a parent completion rule. Each child owns its own progress and effects. The plan itself does not grant “journey reward” a second time.

The plan's accepted horizon covers these entries. No future capacity/resources are reserved by default. A promised bed may require an explicit reservation in a later feature; placing sleep in a queue does not guarantee a room or permission to spend arbitrary money.

## RM-02: the first three entries are not three model calls

At tick 120, T1 commits arrival in Balmora. The character is no longer in Seyda Neen. Sleep requires being at the admitted location and a supported rest opportunity. It starts only after these checks, then completes at tick 600 if uninterrupted.

Tavern downtime is not three fresh conversations. In this fixture, each cycle makes a Charisma DC 10 check with +1, recording local familiarity on success. Draws 12, 3, 14 give success/failure/success at ticks 620, 640, 660. Those are two familiarity receipts, not invented named friends, free drinks or generated dialogue. If the player wants an actual conversation, a selected scene policy may request one at a boundary.

No LLM is asked whether something interesting happened every twenty ticks. A separate bounded occurrence rule could request an event, but this branch selects none. T4 starts at tick 660 after rechecking route/access/current capacity. Existing fatigue/resource effects must be included if the chosen ruleset has them; do not narrate costs the mechanics do not track.

## RM-03: cancellation in the middle is not rewind

At tick 750, the character has completed 90/180 units of T4 and is on that route, not at the Gate. The player presses “Stop after this activity”: cancel T5/T6 future starts, let T4 continue. Its eventual arrival still commits at tick 840.

Alternative command: “Stop travelling now.” This suspends/abandons participation under the chosen traversal policy and cancels successors only if the command says so. Location becomes the supported in-transit waypoint/progress representation; it does not jump to Balmora or the Gate. Earned route progress remains evidence. A return journey is new work from this position, not an undo button.

A third command, “Pause campaign,” freezes the permitted solo clock and leaves the plan intact. These three controls must not share an ambiguous “cancel” API or silently substitute for one another.

The normal branch below assumes none was chosen; the chain is still active.

## RM-04: the Gate, three different configurations

T4 arrives at tick 840. One arrival receipt commits location=Gate. At plan acceptance, the player/content chose one of these policies; they are mutually exclusive variants of this worked step:

| Variant | What happens at arrival | What the model can do | T5 |
| --- | --- | --- | --- |
| Quiet | Factual arrival only | Nothing; no task | Revalidate and start |
| Narrated continuation, main branch | Queue optional report from tick-840 snapshot | Describe the arrival; no new current choices/effects | Revalidate and start without waiting for prose |
| Interactive checkpoint | Hold for scene/decision | Propose admissible scene/options, then publish against current fence | Does not start before resolution/renewed admission |

Main-branch report might say:

> The Gate cuts a dark line across the evening sky. You reached its shelter before the next stage of the journey.

“Evening” must follow the captured fictional clock or remain an explicitly authored atmosphere fact, not be inferred from server time. The report must not add “a guard confiscates your sword” unless that already happened in a committed receipt.

If generation returns at world tick 900 while sleep is underway, attach this to the tick-840 arrival history. Do not replace the current sleep view with an arrival menu. If the optional report fails, the selected fallback is a factual arrival with a visible/reportable omission; T5 continues. No automatic unlimited retries to obtain prettier prose.

In the interactive variant, possible options are “Rest here,” “Continue tired” if supported, or “Turn back.” Only that scene's selected outcome can revise the remaining plan. A user-choice scene cannot run in the background while the same actor already commits to sleeping past the decision.

## RM-05: an encounter interrupts a leg instead

Alternate T4 boundary at tick 720: after 60/180 units, an occurrence receipt requests a supported road encounter. The chain holds before entering later work. A scene offers a detour, retreat, or a supported resolution. Draws belong to whichever plan is actually selected, not to all three imagined outcomes.

A detour may change remaining route terms only through an admitted revision with a visible effect on progress/estimate. It cannot retain the old arrival deadline and quietly teleport the character over a longer route. Successful resolution can resume the same remaining route if still valid; failure may block it. No parent timer at tick 840 may force arrival regardless.

If the encounter is still unresolved when the player returns tomorrow, the factual recap says where/when work stopped. It does not fast-forward the rest of the itinerary because a day passed on the wall clock. Other-world/multiplayer clocks need their own policy; the first solo hold does not solve them.

## RM-06: start admission and duplicate transitions

At tick 840, suppose the Gate has no admitted safe rest opportunity. T4 is still completed and location is still Gate; T5 blocks with that reason, T6 stays pending. The model cannot repair this by silently changing the destination to an inn. A new offer can propose supported alternatives when requested/permitted.

Only the chain coordinator starts the successor. A child completion hook may signal its boundary but cannot also independently start T5. Deduplicate boundary/hook and entry-start identities so a retried arrival cannot create two sleeps. If a required event and continuation coincide, the hold wins; completion is not erased.

Normal main branch completes T5 at tick 1320 and T6 at 1440. The character is at the admitted destination, chain finished, idle. No mandatory narration at the end: that is a separate configured choice.

Cost after plan admission: quiet variant Q; main narrated variant R = one proposed report call, nominal 2k–5k input and 200–700 output. One encounter plus resolved choice adds E + D to the branch where it occurs. It does not charge a model call for every tick or every queue transition.
