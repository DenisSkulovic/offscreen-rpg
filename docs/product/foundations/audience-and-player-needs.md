---
id: DOC-PLAYER-NEEDS
layer: product
status: draft
domains: [foundations]
tags: [direct-control, autonomy, time-cost, configurability, affordability]
updated: 2026-09-16
relations:
  - type: derives_from
    target: DOC-PRODUCT-VISION
  - type: depends_on
    target: DOC-GLOSSARY
---

# Audience and player needs

Owner: Denis. Scope: needs shaping the product; no market-size, demographic or demand claims.
Sources: [vision](../PRODUCT_VISION.md), [decisions](../../decisions.md), and [shared terms](glossary-and-domain-map.md).

## Primary reference player

Denis is the confirmed first reference player and creator. His expressed fantasy is inhabiting a character in a chosen world, earning a life over time, and alternating involvement with autonomous living. That gives us a concrete design anchor, not evidence that a wider market wants the same balance.

The motivating examples—arrival in Seyda Neen, a craftsperson in Gondor, a fallible character left to their routines—are reference experiences. They are not mandatory settings, professions or starting power levels.

## Needs grounded in the conversation

| ID | Need | Basis |
| --- | --- | --- |
| NEED-001 | Inhabit a chosen world without requiring its complete definition before play | D010 |
| NEED-002 | Gain possessions, abilities and standing that feel consequential, with lasting history | D013, D016, D022 |
| NEED-003 | Use a substantial established rules foundation rather than arbitrary narrator agreement | D015, D021 |
| NEED-004 | Move between direct involvement and autonomous character life | D018 |
| NEED-005 | Experience surprise and fallible judgment, including meaningful gains and losses | D019, D020 |
| NEED-006 | Adapt pace, difficulty and micromanagement to the desired experience | D019, D022 |
| NEED-007 | Stop campaign progression explicitly when an indefinite break is wanted | D014 |
| NEED-008 | Sustain play and development with controllable AI expense | D003, D006, D011 |

These IDs identify source-grounded need statements. Their wording is a draft synthesis; they are not new approved feature requirements or numerical acceptance targets.

## Proposed play situations

These are overlapping situations one player may move among, not separate market segments or fixed presets.

**An involved evening.** The player takes control, talks to people, pursues an ambition and faces consequences. Desired value: agency and immersion, with mechanics giving decisions weight.

**A busy week with the world running.** The player permits autonomy, receives occasional summaries, and sometimes intervenes. Desired value: continuity and curiosity about the character's life. Under the chosen settings, this can include loss and death; universal protection is not assumed.

**A deliberate long break.** The player pauses the campaign. Desired value: returning to the same situation without unwanted progression.

**A different appetite for commitment.** The player chooses slow investment, faster play or instant-time handling as permitted. Desired value: control over the experience. Strict campaign locks may preserve a chosen challenge.

## What satisfying these needs could look like

- The player remembers how an item was obtained and cares what happens to it.
- A noncombat livelihood generates worthwhile decisions and relationships.
- Returning from absence reveals a coherent account of what the character did.
- A foolish autonomous decision feels like that character's choice, not an unexplained rules failure.
- The player can distinguish leaving the campaign running from pausing it.
- Faster time changes pacing without turning the narrator into an unrestricted reward dispenser.
- Affordable generation can support the basic experience without requiring premium narration at every moment.

These are proposed observations for future playtests, not measured results or claims of guaranteed enjoyment.

## Tensions we must preserve rather than conceal

- More autonomy provides surprise but reduces direct control.
- More time investment can strengthen attachment but may conflict with the player's available evening.
- More severe loss creates stakes but can end a valued character's story.
- More configuration serves different styles but can make consequences hard to understand.
- Broad setting freedom must coexist with actual D&D mechanics and established campaign truth.

Detailed topics will resolve these through explicit choices and settings. No one preferred balance has been selected as the default.

## Audience boundaries

Confirmed: single-player; primarily text-based; player control and autonomous living; optional later illustrations.

Not established: commercial buyer, target age group, required D&D familiarity, platform priority, accessibility needs of a wider audience, launch market or business model. Do not invent enterprise buyers or multiplayer needs to fill documentation.

## Questions for later discovery

How much rule knowledge should a new player need? Which settings are understandable without a tutorial? What makes a return summary satisfying? What kinds of character mistakes feel believable? Which first experience would Denis voluntarily repeat?

The next layer should turn these needs into journeys and acceptance evidence. It should not treat untested audience assumptions as facts.


## Creator and portfolio reviewer needs

D040 adds an explicit primary purpose: help Denis demonstrate senior fullstack capability through a public engineering portfolio. He needs a manageable product whose abstractions, implementation and tradeoffs he can own and explain. A prospective technical reviewer needs a quick path to understand the product, reproduce or inspect a working demo, and examine evidence of reliable state, efficient AI and operational quality. These are proposed reviewer needs, not validated hiring-market claims. DOC-RELEASE-SCOPE owns the concrete portfolio release bar; exact target roles and technologies are not selected here.

## A character alongside the working day

D056 supplies a concrete reference situation: Denis checks occasional messages between work tasks, follows a character over successive days and sometimes makes a quick consequential choice directly in Slack. Continuity and tonal contrast make small updates worth reading. Desired value is brief voluntary involvement and anticipation, not a parallel job requiring constant vigilance. This is expressed personal appeal, not evidence of broader market demand.

The character must still be able to continue under permitted defaults when the player is in a meeting. Reports should identify the character, connect to relevant remembered events, distinguish current danger from committed consequences and make available action/time clear. Messages should not require rereading a long chat thread to understand each invitation. The supported surface and existing contact/autonomy policies determine delivery; no new mandatory office-specific mechanics are implied.
