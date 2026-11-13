# Time, autonomy and holds | visible truth contract

**Status:** UX destination and a source of *requirements for future public projections*. Authority for clock and activity rules remains [time-and-autonomy](../../time-and-autonomy.md), [committed time](../../technical/committed-time.md) and [rules/activities](../../technical/rules-and-activities.md).

The game has a rare product promise: **effort takes time, even when nobody is looking**. The interface must not squander that trust by treating a clock animation as a simulated fact.

## Keep four clocks/conditions conceptually separate

| Concept | Meaning | Player display |
| --- | --- | --- |
| **Fictional time** | Committed in-world elapsed seconds under accepted execution | “Day 3, near dusk” if the campaign has such calendar; otherwise “Cycle 7” or omit |
| **Real remaining wait** | Conditional wall-clock estimate under the captured pace and current deadline | “About 18 minutes remaining here”; may change if interrupted/paused |
| **Response opportunity** | Time allowed to choose if a decision has an explicit real deadline | “Choose before 20:30; otherwise [known default]” only if policy actually exists |
| **Narration/generation processing** | Server/provider work preparing readable continuation | “Outcome committed; story text is being prepared” if true |

Do not render one countdown and call it “time.” Fictional time **does not** advance during pure reading, uncommitted menu navigation, idle-without-plan, supported manual pause or model latency beyond the admitted action's duration.

## Progress is not one universal percentage

**Contribution process:** “3 of 5 repair units earned” is valid; a 3-hour elapsed duration is not automatically 3/5 repair. Failed checks may consume time without progress.

**Waiting:** where an admitted literal waiting duration has elapsed 20 of 30 fictional minutes, a bounded elapsed fraction can be shown; its real completion expectation must still reflect pause/interruption.

**Travel:** movement progress must come from supported route/position semantics. Time elapsed may include delay, stationary events or a portal; do not derive map position from a naive elapsed percentage.

**Conversation/combat:** avoid persistent job progress UI; these are sequences of admitted finite actions and results.

**Unknown or unmodeled process:** prefer textual milestone and last confirmed fact to a false exact percentage.

The same screen can show *time elapsed*, *progress actually earned* and *forecast* separately. They answer different questions.

## Before an extended commitment

A compact review explains:

- What the character is attempting and why.
- Estimated fictional duration/goal **and** corresponding real wait where known.
- What accepted resources or progress might be affected.
- Which existing work is suspended or incompatible, if the rules provide that ability.
- Whether the activity may stop for an encounter or decision, without spoiling hidden events.
- What the player can do before completion: leave browser, pause if allowed, change course if supported, or simply await next boundary.
- If accepted plans/queues exist: horizon, stop condition and what occurs when an unexpected event demands input.

Example: “Repair the beacon. Each successful hour of work moves the repair forward; completion time is uncertain. The road patrol you began will be suspended if you take this work. You may leave; the repair continues while authorized.” Do not promise an arrival/pay/reward that has not occurred.

## While active

The status line should be factual: **Repairing the beacon · 3/5 units earned · Next check in about 12 minutes.** Small adjacent controls are rules-aware. “Pause” cannot mean “cancel, erase progress”; “Stop” cannot silently mean “pause”; “Change course” may have consequences and needs explanation.

Closing the tab should require no “keep alive” command; permitted server execution outlives browser presence. A browser-only timer is never accepted as proof of ongoing game progress.

When a boundary arrives, fetch the authoritative state. An estimate reaching zero means “checking the next state” until settlement is known, not “you have arrived” before the server says so.

## Holds and precedence

| Why progression stopped | Example clear copy | What can resume it | What must remain true |
| --- | --- | --- | --- |
| Player decision | “The stranger is waiting for your answer.” | An accepted response; declared default only if permitted | No secret game-time spending during held solo deliberation |
| Manual pause | “Paused by you.” | Explicit Resume after permitted confirmation | No automatic resume after reconnect or quota renewal |
| No committed action | “Nothing is currently underway.” | Choosing an available next intention | Calendar does not drift during browser absence |
| Generation in progress | “The result is being written.” | Successful publication or supported recovery | Receipt/time semantics unchanged by model latency |
| Generation failed after settlement | “Your action was resolved, but its account is unavailable.” | Explicit bounded Retry if eligible; operator/refresh if not | Never reroll/reapply effects |
| Spending allowance | “Storyteller allowance reached; story is held.” | Eligible future window or explicit supported action | No silent paid upgrade; quiet authorized work only if permitted |
| Interrupted activity | “Beacon repair paused when the stranger arrived.” | Resolving event and rules-authorized resumption | Earned units retained unless committed rules explicitly changed them |
| A scheduled world obligation | “A world event needs resolution.” | Admitted rule/event handling | No skipped deadline during a large fictional-time batch |
| Unknown command receipt | “We are checking whether that intention was accepted.” | Fetch durable operation state | No automatic repeat on a generic retry button |

Where multiple conditions coexist, choose the one that actually blocks **the next player action** as primary; expose relevant secondary reasons in an expandable status. Do not infer resume authority from the absence of a visual pause badge.

## An interruption is not a cosmetic popup

If work stops at 3/5 completed:
1. Freeze active progress in the view at the last committed boundary, not a browser-simulated continuation.
2. Present the new factual development as a scene.
3. Offer only the responses the Storyteller/rules admitted.
4. Keep the old commitment available as context with its achieved progress.
5. After resolving, revalidate and resume only if allowed; otherwise show explicitly why the prior intention remains suspended.

The player should feel the consequence of being interrupted, not a magic reset of their earlier work.

## An accepted plan is not an autonomous “life algorithm”

Present a finite itinerary in plain language: “Rest, then patrol until dawn; stop if injured or a decision is required.” Show the chosen horizon, currently executing step, progress and known stop conditions. Pending steps are **intentions requiring future revalidation**, not committed outcomes.

No indefinite offline permission is inferred from a checked checkbox. A plan whose 2nd step is blocked shows “Stopped before patrol: road closed,” rather than automatically skipping it. For multiple players, authority requires a separate shared policy.

## Pace control is a serious settings decision

Pace changes may reschedule real waits and increase generation cost per real hour, but must never create extra fictional progress, checks or rewards. Show exact consequences for current commitments where supported; changes in shared stories require an explicit authority model. If rules lock pace, label it clearly. The public short demonstration must not invisibly switch the game to “fake instant time.”

## Visual feedback and animation

- Gentle countdown/milestone motion is fine **only** for an acknowledged, admitted, running commitment.
- When paused or blocked, the progress indicator stops, including its animation.
- An interruption makes a visible transition to the new scene, not an achievement burst.
- A completed work unit earns a concise committed marker; no sparkles until a saved result exists.
- Reduced motion still shows all critical changes through labels and static status.
- Do not let client-side animation drift into a distinct version of world truth.

## Data/projection gaps to settle with engineering

The UI will need a trustworthy **public** projection of active commitment, elapsed/progress semantics, hold reason, permitted controls, estimated next boundary, decision deadline/default and recent committed events. Existing `StorySnapshot`/`CampaignView` carry portions; they are not automatically sufficient for every proposed surface. The implementation Change must map each visible field to an actual versioned response; missing data yields a narrower honest UI, not invented values.

## Scenario checks

1. Browser closed for 8 hours with **no accepted plan**: the user returns to the same fictional position.
2. Work check failed: world time moved, contribution did not; bar cannot lie.
3. Countdown ends while narration is still pending: “resolving/writing,” not earned reward.
4. Accepted work interrupted at 3/5: 3/5 persists; no double-pay, double-roll or double-time.
5. Pause then reopen next day: still paused; no catch-up.
6. Changing pace recalculates expectation but not already committed work.
7. Quota exhausted: exact hold reason, no phantom continued storytelling and no hidden bill.
8. A response default fires at real deadline only where explicitly authorized.
