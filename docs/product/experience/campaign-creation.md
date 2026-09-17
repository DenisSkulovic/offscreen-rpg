---
id: DOC-CAMPAIGN-CREATION
layer: product
status: draft
domains: [experience]
tags: [world-creation, dnd-rules, configurability, autonomy, affordability]
updated: 2026-09-16
relations:
  - type: derives_from
    target: DOC-PLAYER-NEEDS
  - type: depends_on
    target: DOC-GLOSSARY
  - type: depends_on
    target: DOC-TIME-AUTONOMY
  - type: depends_on
    target: DOC-MOMENT-TO-MOMENT-PLAY
---

# Campaign creation

Owner: Denis. Release scope: unassigned.
Purpose: define the journey from a desired roleplaying experience to a playable campaign.
Sources: [needs](../foundations/audience-and-player-needs.md), [terms](../foundations/glossary-and-domain-map.md), [time/autonomy](time-presence-and-autonomy.md), [active play](moment-to-moment-play.md).

This document records proposed behavior and alternatives. It does not select an MVP flow, D&D edition, interface, default preset or mandatory setup sequence.

## Desired experience

The player should be able to express who they want to be, what kind of world they want to inhabit, and how they want to participate. They may provide extensive detail or begin with very little. Creation establishes the starting campaign contract without requiring a complete world encyclopedia.

Examples include a poor arrival in Seyda Neen, a Gondorian craftsperson, and a character waking in an undefined place. These are different content starting points, not separate engines or approved bundled settings.

## Information to establish

Creation must eventually resolve enough information to support play, though not all of it must come from a form or be decided before the opening scene:

- World premise and any source material, including what is fixed and what may emerge.
- Character identity and mechanically necessary choices under the adopted D&D baseline.
- Initial circumstances, possessions and relationships.
- Campaign pace, decision timing, autonomy and consequence policies.
- Any settings that become locked.
- Available AI configuration and spending controls.
- The first playable situation.

The minimum required information and when each choice occurs remain open. Unknown fictional background does not automatically mean mechanically required character data can also remain undefined.

D033–D034 require mechanical flexibility across worlds, bodies and scales, with simple setup from a natural-language premise. [Starting worlds](../worlds/starting-worlds-and-content.md#mechanical-variety-and-simple-setup) owns the proposed preparation journey: distinguish generated description, supported mechanical combinations and genuinely new rules needing definition. Creation should expose only consequential choices and limitations to the player. A powerful starting identity can be intentional; earned progression does not mandate a weak humanlike starting character. No particular LLM pipeline or setup-time guarantee has been selected.

## Proposed requirements

| ID | Draft behavior |
| --- | --- |
| CREATE-001 | Support starting from sparse, custom or established-world intent without implying perfect knowledge of every canon. |
| CREATE-002 | Distinguish material supplied by the player, generated suggestions and facts adopted into the campaign. |
| CREATE-003 | Make consequential starting policies understandable, especially running while absent, possible loss/death, timing and setting locks. |
| CREATE-004 | Resolve conflicting starting choices explicitly rather than silently inventing a different campaign. |
| CREATE-005 | When entering play, make the active character, immediate situation and any unresolved choice affecting the next action clear. |
| CREATE-006 | Choosing faster or instant time must not silently change other consequence or autonomy policies. |
| CREATE-007 | Optional expensive generation must not be implied merely by requesting an elaborate world. |

These requirements remain drafts; their presentation and acceptance criteria need discussion.

## Options and forks

All options below are candidates with release disposition **unassigned**. Rows are alternative design approaches, not necessarily future user-selectable settings.

| Fork | Alternatives and tradeoffs | Evidence or decision needed |
| --- | --- | --- |
| CREATE-F01: setup style | Guided conversation supports expression; structured setup makes policies explicit; a hybrid combines them but adds interaction work | Try a sparse and a detailed character premise; compare clarity and effort |
| CREATE-F02: presenting starting detail | Starting-detail alternatives are owned by WORLD-F01 in [starting worlds](../worlds/starting-worlds-and-content.md#options-and-forks). This fork concerns when/how setup offers that choice. | Try choosing detail up front versus developing it during the opening. |
| CREATE-F03: character preparation | Complete necessary mechanical choices before play; offer prepared characters; reveal choices progressively when valid | Selected D&D edition and minimum legal character definition |
| CREATE-F04: configuration | Named presets with overrides; individual settings; a recommended starting profile | Identify which consequences players misunderstand; choose lock semantics later |
| CREATE-F05: opening situation | Player specifies it; player chooses among proposals; game generates it within boundaries | Degree of authorship desired and treatment of unwanted generated openings |
| CREATE-F06: start of the clock | Begin paused for inspection; run after explicit start; start under the chosen mode on entering play | Clarify player expectations and relation to pause/control policy |

Selecting one approach for an MVP does not cancel the others. Conversely, listing alternatives does not commit us to implement all of them.

## Scenarios to develop

**Minimal premise.** “I wake in darkness.” Identify what can remain undefined and what the rules need now. Do not generate an entire continent merely to fill an empty description.

**Detailed familiar setting.** The player supplies a location and role. Identify accepted starting facts and gaps; do not pretend the model has verified all source lore.

**Dangerous unattended campaign.** The player wants autonomous life with possible death. Creation should make that policy understandable, not silently replace it with absence protection.

**A flexible campaign.** The player wants to adjust pace freely. No Ironman-style lock should be inferred from a difficult starting situation alone.

**Contradictory choices.** A locked-time preset and unrestricted speed changes cannot both silently apply. The setup must surface the conflict; resolution rules remain open.

## Dependencies and later choices

[Starting worlds](../worlds/starting-worlds-and-content.md) owns the starting-detail alternatives. World/canon topics own content authority. Rules baseline owns mechanics. Settings topics own values and locks. Time/autonomy owns clock and fallback semantics. This document owns their combined setup journey.

Before implementing a first flow, choose a coherent subset and resolve the relevant forks. Exact wizard screens, schemas, source ingestion and provider configuration mechanisms belong to later design.
