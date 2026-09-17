---
id: DOC-TIME-AUTONOMY
layer: product
status: draft
domains: [experience, time-and-settings, characters-and-autonomy]
tags: [offline-play, autonomy, consequences, configurability, notifications]
updated: 2026-09-16
relations:
  - type: derives_from
    target: DOC-PRODUCT-VISION
---

# Time, presence, and autonomy

Product behavior only. Confirmed direction is distinguished below from unresolved settings and proposals.
Related: [vision](../PRODUCT_VISION.md), [decisions](../../decisions.md).

## Confirmed direction

D&D mechanics and a dungeon master are the foundation. Reuse established rules broadly rather than inventing a substitute system. The edition remains open. Extended time follows campaign settings: meaningful elapsed time is the defining style, while other configurations may allow accelerated or effectively instantaneous passage.

The character may be directly controlled or delegated autonomy, including ongoing routines across a real-life week. Micromanagement, pace and severity are configurable. The initial web-platform direction includes phone updates and decision invitations; exact delivery and preferences are defined in DOC-INTERVENTION. A notified choice may accept timely player intervention; after its response window expires, the character may decide and continue autonomously under the selected policy.

Robbery, loss of possessions and death are legitimate possibilities, including during player absence when the configured running mode allows them. More casual settings may use nonfatal defeat; hardcore/ironman styles are also intended. Exact presets, save rules and defaults are not selected.

This supersedes the earlier blanket requirement that absence always prevents losses, as well as the assumption that autonomy always ends after one short plan. The prior draft is retained in the project archive.

## Two independent questions

**Is the world progressing?** It is paused or running at the configured rate. Manual pause and configured automatic pauses freeze the entire world. No paused interval advances work, travel, hunger, threats, rewards or world events.

**Who controls the character while it runs?** The player may direct actions, delegate a task, or allow broader routine autonomy according to settings. Being offline is not the same as being paused. Control can return to the player during an evening session.

Manual pause remains available for an indefinite break. Optional unattended play is a deliberate alternative, not an obligation to keep the world running.

## Proposed event policies

These are possible policy behaviors, not approved preset names or default settings:

| Policy | Event behavior | No player response |
| --- | --- | --- |
| Pause and await input | Whole world freezes at the configured boundary | Remains paused |
| Offer intervention, then delegate | Notify and offer a response window | Character decides within authorized autonomy; consequences may include loss or death |
| Delegate directly | Character handles the event under its policy | Outcome can appear in a later summary |

D057 settles the baseline: ordinary delegated intervention windows leave the world running. Explicit hold policies remain alternatives, not the default. Numerical duration, option invalidation and recovery details remain design gates. Permanent manual pause must not silently become a timed pause.

The player should be able to understand the active policy and stakes before leaving. Notification delivery is not proof of player attention. Delivery failure behavior, late replies and overlapping events need product decisions.

## Decision timing and play styles

Direction from Denis: support multiple play styles over time. D057 selects continued delegated progression for the current baseline. Direct-control waiting semantics and optional alternative styles are separate design choices; the first release need not implement every combination.

Distinguish these dimensions:
- **World pace:** real-time cost, accelerated passage or instant-time handling.
- **Decision timing:** continuous progression, pause-until-input, or a timed opportunity followed by a fallback.
- **Control:** direct player choice or character autonomy.
- **Restrictions:** which options can change during a campaign and which a strict mode locks.

A timed decision does not itself determine whether fictional time continues during the countdown. A paused world can have a real-world response window, but that policy must explicitly define expiry and resume; it must not alter indefinite manual pause.

### Candidate styles, not final presets

| Style | Player experience | Still to specify |
| --- | --- | --- |
| Continuous real-time play | World progresses while the player considers actions | Treatment of typing, slow narration and unavailable services |
| Pause for decisions | World stops at designated choice points until input | Which decisions pause and how D&D action boundaries map to play |
| Timed decisions | Options are offered with a countdown; a configured fallback occurs on expiry | Countdown origin, fictional clock state, late input and fallback selection |
| Turn-based advancement | Progress occurs through defined turns/action resolution | Meaning of a turn in each context and relation to long-duration activities |

Ten seconds is Denis's illustrative countdown, not an accepted default. Options may assist quick input; offering options does not yet restrict the game to a closed menu. Fallback can mean a designated option or an autonomous character decision; do not silently assume the safest or wisest result.

### Current baseline and timing contract

The early pause-until-input MVP recommendation is superseded by D050 and D057; it is not a live recommendation. Its historical rationale remains in the decision history. D061 baselines the current direction for technical design.

TIME-F01: Define the first supported clock/control profile. Continuous delegated progression is settled; exact pace, direct-control idling, interruption boundaries and outage reconciliation require explicit values/policies before code.

| Situation | Current direction or bounded design task |
| --- | --- |
| Ordinary delegated activity | Advance at configured pace; resolve intermediate boundaries before granting completion. |
| Ordinary unanswered invitation | Continue authorized life. Apply a valid automatic response at its boundary; no routine whole-world wait for attention. |
| Direct player action | Check the current situation and resolve under the same time/resource rules. Choosing an action is not automatic pause or permission to undo elapsed consequences. |
| Reading, typing or pending interpretation | Do not imply a freeze. Keep clock state visible and manual pause available. Exact direct-control waiting semantics are a handoff gate, not inherited from the superseded paused MVP. |
| Optional model generation unavailable | Supported mechanics continue according to the admitted policy. Reject stale output; do not invent events or freeze solely for decorative prose. |
| No valid authorized continuation | Explicit exceptional blocked state under the chosen fallback; draft global-stop details belong to AI-COST-004 and INTERVENTION-004. |
| Accelerated/instant passage where supported | Respect the same prerequisites and intervening consequences. Acceleration does not create unlimited paid calls. |
| Manual pause | Freeze indefinitely. Pending real-time-window suspension is owned by INTERVENTION-003; neither expiry nor a model response resumes the world. |
| Policy/speed changes | Prospective, explicit effect on active work and choices; no retrospective rewriting. |

[DOC-INTERVENTION](../notifications/event-intervention-and-timeouts.md) owns countdown origin, expiry, late replies, invalidation, pause interaction and recovery. Its draft details must be selected coherently at technical handoff; no numerical timeout is selected here.

### Cross-mode constraints

A decision window must not silently expire before its options are available. How generation delays, delivery delays, disconnects and failure affect it is an open product policy. Changing pace or mode with an activity/window in progress also needs explicit behavior. These are reasons to choose a coherent initial configuration, not to promise every combination in the first release.

## Earned progression

In the time-investment style, valuable advancement requires actual elapsed time and attention. In an instant-time configuration, real waiting may be removed deliberately. In either case, requests such as “I work for a year” must resolve under the active rules, including prerequisites, events, resources and consequences. The narrator cannot grant arbitrary wages or equipment outside those rules.

Attention need not be continuous. Autonomous activity follows the configured passage of time and meets its game requirements; gains and risks depend on the configured play style. Do not assume every valuable reward must require manual clicks, or that unattended progress is automatically disallowed.

Pausing protects the situation but does not earn anything. Resuming returns to the same unresolved world. More expensive models must not grant better loot or waive costs merely because they generate richer narration.

## Living autonomously

User examples include work, food, travel, earnings and robbery across days of absence. Autonomy must have defined permissions and priorities; “decide for yourself” does not establish unlimited permissions for all permanent life choices.

Confirmed clarification: autonomous characters need not make sensible or player-optimal decisions. Intelligence, personality and flaws influence their judgment; uncertainty and the possibility of foolish decisions are part of the intended thrill. A foolish character can make foolish choices with real consequences.

This supersedes the assistant assumption that trustworthy autonomy means reliably protecting the player’s interests. Distinguish character fallibility within the fiction from broken game rules or corrupted state. Exact trait mechanics, randomness, obedience to player instructions, spending limits and major commitments remain open. Ongoing routine permissions and one-off orders may coexist.

Occasional summaries should explain meaningful outcomes and decisions without generating an expensive continuous commentary. Notification frequency, detail and interruption preferences remain open.

## Product examples to validate

- **Active roleplay:** direct a conversation and a risky action; the dungeon-master experience applies rules and consequences.
- **Running for a week:** authorized routines produce earnings, expenses and events over elapsed time. The player receives occasional summaries and can regain direct control.
- **Robbery, autonomous risk enabled:** notify with an intervention opportunity. If the player does not respond, resolve the character's choice under the agreed policy. Possessions or life may be lost.
- **Robbery, pause policy enabled:** freeze the whole world until the player returns; the robbery is unresolved, not automatically defeated.
- **Explicit long pause:** six months away produces no simulated catch-up or neglect loss.
- **Progression request:** requesting a month's crafting output follows the campaign’s time policy and activity requirements. Instant-time mode removes real waiting, not every other constraint.
- **Flexible pace:** change the running speed where campaign settings permit; the narrator follows the new setting.
- **Locked challenge:** an Ironman-style campaign refuses changes to its locked settings. The lock set and transition rules remain open.

## Open product work

Choose defaults and settings boundaries; define autonomy permissions, death/nonfatal defeat, ironman implications, intervention timing and automatic-pause triggers. Specify notifications and failure behavior. Define the relationship between active attention, autonomous rewards and risk.

Configurable pace includes mid-campaign changes and optional instant passage where allowed. Ironman-style modes can restrict setting changes; exact lock sets, numerical rates, defaults, economy values and first-release scope are not chosen. No technical mechanisms are specified here.

## Concrete follow-through

The [release-scope proposal](../foundations/scope-and-release-plan.md) now prioritizes autonomous everyday life and storyteller developments, refined by D041–D050; adventure mechanics are not a first-release prerequisite. The [reference scenarios](../validation/reference-campaigns-and-journeys.md) expose clock boundaries, unavailable runtime and interrupted progression. [AI budget](../ai-experience/cost-budgets-and-degraded-play.md) owns the proposed behavior on spending exhaustion; it does not select a new global-pause rule here.

This is the v0.01 clock owner. Intervention deadlines belong to DOC-INTERVENTION. Do not create extra planned clock/pause documents merely to enter technical design; split only when useful.

## Tick cadence, game speed and the initial notification loop

Separate the simulation update cadence (ticks), fictional time advanced, and real elapsed time. A tick is not automatically an LLM call, a notification or a full update of every actor. Changing cadence must not create extra wages, repeated choices or more encounter risk for the same fictional exposure.

At constant speed s, one real hour permits s fictional hours while the campaign runs. At 10×, an illustrative ten-fictional-hour shift lasts one real hour; a one-fictional-hour journey lasts six real minutes. A real-hour commute followed by that shift is consistent if the commute itself takes ten fictional hours or an explicit speed change occurred. Do not silently use different rates for travel and work. Durations and payment in D038 are examples, not balance.

Resolve activity/event boundaries within each interval before granting its end state. Manual/global pause contributes no fictional time. The initial service must support this progress while the browser is closed; restart reconciliation must not repeat already-applied intervals. Exact scheduler design is later technical work.

[DOC-INTERVENTION](../notifications/event-intervention-and-timeouts.md) now owns notifications and offered choices. A mine-arrival update can be informational if beginning work is already authorized; an end-of-shift choice can pause under the selected policy. A different autonomy setting may continue into another permitted activity. D050 brings timed intervention into the proposed initial experience; DOC-INTERVENTION owns its real-time window, running-window baseline, optional hold alternatives, manual-pause priority and fallback contract.
