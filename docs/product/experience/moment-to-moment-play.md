---
id: DOC-MOMENT-TO-MOMENT-PLAY
layer: product
status: draft
domains: [experience]
tags: [direct-control, autonomy, time-cost, continuity, dnd-rules]
updated: 2026-09-16
relations:
  - type: depends_on
    target: DOC-GLOSSARY
  - type: derives_from
    target: DOC-PLAYER-NEEDS
  - type: depends_on
    target: DOC-PRODUCT-PRINCIPLES
  - type: depends_on
    target: DOC-TIME-AUTONOMY
---

# Moment-to-moment play

Owner: Denis. Scope: the player-facing interaction loop, independent of a chosen UI or implementation.
Sources: [terms](../foundations/glossary-and-domain-map.md), [needs](../foundations/audience-and-player-needs.md), [principles](../foundations/product-principles.md), [time and autonomy](time-presence-and-autonomy.md).

This is an assistant proposal grounded in confirmed direction. Requirement wording below is draft, not yet accepted. The examples illustrate behavior rather than prescribing D&D mechanics before edition selection.

## The experience we are defining

During direct play, the player perceives a situation, forms an intention, attempts an action, receives its outcome and chooses what to do next. A familiar activity may continue over time; an event may change the situation before it completes.

“Moment-to-moment” does not imply an exchange of chat messages is one game tick, a combat turn, or a fixed amount of fictional time. The adopted rules and campaign pace determine progression. Reading speed, generation latency and gameplay time need an explicit relationship; it is not decided here.

## Proposed interaction contract

| ID | Proposed requirement |
| --- | --- |
| PLAY-001 | Present enough character-permitted information to orient the player: current situation, relevant observed changes and any pending choice. Presentation must not silently reveal all world secrets. |
| PLAY-002 | Broader draft option: support player-described intentions beyond suggested choices. Initial input style remains PLAY-F01 (D058), not a committed free-text requirement. Every attempted action follows supported rules and the current situation. |
| PLAY-003 | Distinguish a declared attempt from an accomplished result. Asking to persuade, steal, craft or travel does not itself establish success. |
| PLAY-004 | When ambiguity could materially change the intended action, clarify before committing to that interpretation. Rules for time advancing during clarification remain open. |
| PLAY-005 | Communicate the resolved outcome and observable consequences clearly enough for the next decision, without disclosing information the character should not know. Visibility of rolls and hidden checks remains undecided; configurable visibility is an option, not an accepted requirement. |
| PLAY-006 | For extended activity, distinguish starting, ongoing progress, interruption and completion; receiving a narrative description must not falsely imply completion. |
| PLAY-007 | Make world progression and control state understandable: paused/running and direct/delegated. A player must not need to infer these solely from narrative tone. |
| PLAY-008 | When a decision is offered through an intervention window, make its available response and applicable fallback understandable. Exact timing and pause rules are owned by the time/notification topics. |
| PLAY-009 | Retired as a duplicate; transfer orientation is owned by CTRL-005 in [control/handoffs](control-and-handoffs.md#proposed-requirements), and absence recap by RETURN-003 in [leaving/returning](leaving-and-returning.md#proposed-requirements). Preserve this ID for historical references. |

## What an input means

The interface must eventually distinguish at least these intentions:
- Character action or speech within the fiction.
- A question about the scene or what the character knows.
- A rules or status question from the player.
- A control instruction such as pause or delegation.
- A proposed change to campaign content.

Exact syntax and controls remain open. Asking a rules question is not automatically an in-character utterance; suggesting new content is not automatically an established fact. The player-authoring policy must determine what may be changed and when.

Suggested actions must expose the supported action space honestly. A contextual-choice build can offer additional supported actions through inspection without promising arbitrary free-text execution. Unsupported or impossible attempts need an understandable response rather than invented success.

## Example: an evening in town

The player returns to a character who has been working. They receive relevant changes and the current situation, then take direct control according to the handoff policy.

They decide to visit a merchant. If movement takes time in this campaign, the game communicates that travel is underway. The player might interact during the activity where the fiction permits; interruptibility and action compatibility need definition.

At the shop, “I ask for a cheaper price” is an attempt. Applicable rules and circumstances determine the result. The narration expresses that result; it cannot award a discount solely because the sentence asked for one.

The player then starts a craft or work activity and delegates. The subsequent character behavior follows its traits and autonomy policy. Completion, an interruption, or a consequential choice may produce a notification. Whether the world pauses or the character proceeds is governed by settings.

## Counterexamples and edge cases

- A description of walking does not instantly move the character across a city in a time-investment campaign.
- Instant-time settings remove waiting where allowed, not every intermediate decision or rule.
- A character may make an unwise autonomous choice; returning control must not quietly undo its consequences.
- A pause request stops world progression under the pause contract; precise handling of already-resolved versus pending actions belongs in handoff/pause specifications.
- A late intervention must not silently overwrite an outcome already resolved. The exact late-response experience remains open.
- If AI generation is unavailable, the player must not be told an unconfirmed action succeeded. Whether play pauses, uses another presentation or otherwise degrades is a later product decision.

## Decisions needed before acceptance

For the first web slice in D038, a small set of supported action choices and factual outcomes is sufficient. PLAY-002's free-form intent and rich conversation remain broader draft direction, not a requirement to implement open dialogue before map/travel/work/inventory/phone decisions. Release placement is owned by DOC-RELEASE-SCOPE.

1. Which out-of-character mechanical information may the player inspect, distinct from fictional secrets their character has not learned? How much detail, including rolls, is normally shown?
2. Which initial play style governs reading, typing, questions and narration? Multiple configurable styles are now the direction; see [decision timing](time-presence-and-autonomy.md#decision-timing-and-play-styles). D057 settles delegated continuation; precise direct-control/reading semantics remain a technical-handoff gate.
3. How do direct control and delegation handle actions already underway?
4. Which activity combinations and interruptions should be supported initially?
5. How does the player propose world content without confusing it with a character action?
6. What minimum interaction makes a first session worth continuing?

Campaign creation, control-and-handoffs, time-presence-and-autonomy and event-intervention-and-timeouts already own the corresponding contracts. Use these existing owners; planned splits are not prerequisites.

## Story-centered interface across surfaces

D053–D055 make the current lived situation the main view. Proposed browser composition: a scene or short passage showing what the character is doing and perceiving; salient condition/progress; a few useful actions; clear pause/delegation controls; and access to relevant possessions, people, places and history. A quiet journey is a legitimate scene. Do not manufacture drama to fill an empty dashboard, and do not expose every world system as a permanent panel.

PLAY-010: Context determines prominence, not whether the player retains agency. While traveling, offer supported interruption, route/activity changes and usable items without waiting for a storyteller decision. Lists of suggested actions help access; they must not hide other supported actions. Initial input can be buttons/menus; broad free-form interpretation remains separately scoped. Confirm consequential ambiguity rather than silently interpreting a request as a different action.

PLAY-011: Stopping movement leaves the world running unless pause was requested. Exposure, consumption and other supported consequences may therefore continue. Show the distinction clearly. Using an item checks actual possession, capability, charges, destination and effect; teleportation is possible only in a profile that supports it. A storyteller may add a rescue or encounter but is not required to approve ordinary rules-based progression or save the character.

PLAY-012: Present knowledge appropriate to the character and distinguish known facts, reports and uncertainty. Relevance filtering must not destroy access to remembered information: a distant faction can stay out of the immediate scene while remaining available in history or inspection. Do not leak secrets through action labels, recaps or illustrations. Clock, controls and clear action costs may be out-of-character interface information without exposing fictional secrets.

Messaging can present a short scene and actions in the channel itself; the browser can support deeper inspection and richer composition. Both operate on the same current situation and action authority. Recommend one initial channel plus a compact browser surface rather than simultaneous integration with many providers; exact channel and first-release browser breadth remain open.

Optional imagery can establish atmosphere or illustrate a significant scene; reuse it where suitable rather than generating per tick. Text/actions remain sufficient if imagery is unavailable. Images must not establish hidden exits, items or characters as playable facts; reconcile material visual contradictions with authoritative state. Price, latency, continuity and accessibility require evaluation before a cheap-image claim or release commitment.

## Agency on demand, not mandatory turns

D057 makes delegated progression the normal unattended experience. The player can observe, briefly intervene, take direct control, delegate again or pause. Choosing not to act is legitimate participation; ordinary story progress does not depend on clicking through every stage. Storytellers shape intensity and opportunities, while player actions, established rules and permitted character choices still determine consequences. “Storyteller governs pacing” does not grant permission to invalidate player actions or rewrite results.

PLAY-013: Provide distinct supported intentions, not cosmetic paraphrases of one prescribed response. Options may pursue a goal, avoid it, interact socially, experiment, wait or do something deliberately foolish. Ineffective actions can express personality, but their duration, costs and foreseeable effects must be consistent; do not fake freedom with identical hidden outcomes. Context and actor capabilities determine availability. No fixed count of options is selected.

PLAY-F01: Input surface remains open. Contextual choices make support and timing predictable but limit expressiveness; free text supports unexpected intentions but needs interpretation, ambiguity handling, validation and bounded inference; a hybrid combines suggested actions with an optional custom intention. Recommend a small visible set with expandable alternatives rather than displaying 15 buttons on every message. This presentation recommendation does not settle the free-text decision. Any custom input remains an attempted action, not an instruction allowed to change game rules, grant items or override canon.

For free text, distinguish clarification from commitment and expose whether time continues while an interpretation is pending. Revalidate before acting if the situation changes; do not silently convert an obsolete request into a materially different action. For choices, allow supported off-menu activity discovery through contextual inspection or additional options. Evaluate actual intent diversity and consequences, not button count or text fluency.
