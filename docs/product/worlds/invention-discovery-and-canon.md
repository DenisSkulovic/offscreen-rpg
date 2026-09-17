---
id: DOC-INVENTION-CANON
layer: product
status: draft
domains: [worlds]
tags: [world-creation, continuity, consequences, dnd-rules]
updated: 2026-09-16
relations:
  - type: depends_on
    target: DOC-GLOSSARY
  - type: depends_on
    target: DOC-STARTING-WORLDS
  - type: derives_from
    target: DOC-PRODUCT-PRINCIPLES
---

# Invention, discovery and canon

Owner: Denis. Release disposition: unassigned.
Scope: introducing world facts, their authority, and conflicts between them.
Sources: [terms](../foundations/glossary-and-domain-map.md), [starting worlds](starting-worlds-and-content.md), [principles](../foundations/product-principles.md).

All behaviors below are draft proposals. Examples illustrate distinctions; they are not starting scenarios, required encounters or promised content.

## The problem

The game needs freedom to create places, people and events, including in an initially undefined world. It also needs the player to be able to rely on what has already happened.

The central distinction is between adding something that was unspecified, discovering something that already existed, changing the world through events, and correcting an earlier mistake. Those operations should not silently substitute for one another.

## Proposed behavior

| ID | Draft expectation |
| --- | --- |
| CANON-001 | Interpret a character's attempt separately from a player proposal to author a fact. Ambiguous input needs a policy rather than automatic acceptance as world truth. |
| CANON-002 | New content must account for established facts and resolved consequences relevant to it. |
| CANON-003 | Treat claims made by characters as claims, not automatically as objective truth. A lie or mistaken belief can coexist with a consistent world. |
| CANON-004 | A material correction must identify what is being corrected and the consequences affected; it must not silently rewrite resolved play. |
| CANON-005 | Distinguish adopted campaign material from unverified source recollection when that distinction matters to a decision or correction. |

These expectations do not require an approval prompt for every detail. The amount of automatic invention allowed remains an open authoring choice.

WORLD-START-002 and WORLD-START-003 in [starting worlds](starting-worlds-and-content.md#proposed-behavior) introduce continuity and source expectations for creation. This document elaborates their treatment during play.

## Illustrative distinctions

**Searching versus authoring.** “I search the desk for a key” is an attempted action. “There is a key in the desk” could be an authoring proposal, a reminder of an existing fact or in-character speech. It should not automatically award a key.

**Discovery versus late invention.** A secret passage may have been established earlier, or its existence may still be unspecified. Either approach can support play. If previous events already established a solid wall at that location, adding a passage needs to account for that evidence rather than ignore it.

**A claim versus a fact.** An NPC saying a bridge is safe does not guarantee that it is. Later failure can reflect deception or ignorance. It is different from the game contradicting its own established description without an event or correction.

**A changing world versus a rewrite.** A merchant can sell an item to someone else while the world is running. That is a development to account for in history. Claiming the player never bought an item they already acquired is a correction or defect, not ordinary world change.

**A consequential detail.** A ladder in a description may create a route the player can use. The game cannot assume every decorative detail is mechanically irrelevant.

## Authorship and fidelity forks

These forks own the ongoing policies previously introduced as WORLD-F02 and WORLD-F03. Both retain those IDs for traceability; the starting-world document links here.

| Fork | Alternatives and tradeoffs | Decision evidence |
| --- | --- | --- |
| WORLD-F02: who establishes new content | Game-led invention protects surprise; player-led authorship gives creative control; shared authorship permits both but needs boundaries | Try a player request that adds a useful object or personal connection |
| WORLD-F03: fidelity to reference material | Close adherence; declared departures; loose inspiration. Each changes what the player can reasonably expect | Identify source availability and the kind of deviations the player wants |
| CANON-F01: when hidden facts are established | Define them before discovery; generate when relevant; combine the two. Early definition constrains later invention; late definition avoids unnecessary preparation | Test consistency across clues and repeated exploration |
| CANON-F02: source conflict during play | Campaign facts take precedence; a designated source controls; ask the player where a conflict matters | Examine a source correction that would invalidate a past outcome |
| CANON-F03: correcting affected history | Preserve played history and correct future behavior; revise affected facts with an explicit correction; offer a rollback where allowed | Define the desired correction experience and its interaction with strict campaign rules |

All alternatives are candidates with release disposition unassigned. Not every fork must become a player-facing setting. WORLD-F04 remains about conflicts during creation; CANON-F02 concerns conflicts after consequences already exist.

## Dependencies and limits

D&D source mechanics and any adaptations belong to the rules library. A world-source preference must not silently choose a replacement rules system.

Character knowledge and belief details belong to [knowledge, beliefs and secrets](../characters-and-autonomy/knowledge-beliefs-and-secrets.md). Correction controls belong to the planned recovery topic. Exact storage, retrieval and consistency-checking mechanisms are technical work for later.

Still open: how much authoring can change an active character's circumstances, what merits asking the player, who can inspect hidden facts, and how corrections interact with Ironman. No default is selected here.

## Proposed admission of consequential content

Before a generated detail affects an outcome, identify whether it is description, a supported capability/combination, or a new mechanic. Description may enrich the scene, but if the player uses the described ladder, passage or device, its relevant existence, access, limits and interactions must be established consistently before resolving that action. Do not retroactively withdraw a relied-upon fact merely because it was initially intended as decoration.

A genuinely new effect needs defined prerequisites, target/reach, time, cost, consequences and interactions under DOC-DND-BASELINE and WORLD-F05. If those are absent, offer an explicit approximation or pause for clarification/extension; do not imply the full mechanic exists. A later generation cannot rewrite an already-resolved outcome to repair its own contradiction.

## Storyteller incident authorship

D045 explicitly permits introducing incidents and compatible participants without simulating their causal prehistory. The storyteller may establish previously unspecified content under the campaign profile; established negative facts and resolved history remain constraints. Record when an authored incident enters the world and distinguish its new content from a change to existing entities. Authored background can support coherence but must not manufacture prior player actions, contradict known history or become a prerequisite for simulating a whole civilization. Mechanical consequences follow admission; story intent cannot predetermine the player's outcome.
