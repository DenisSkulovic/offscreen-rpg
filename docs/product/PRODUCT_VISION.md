---
id: DOC-PRODUCT-VISION
layer: product
status: working-baseline
domains: [foundations]
tags: [dnd-rules, time-cost, autonomy, configurability, affordability]
updated: 2026-09-16
relations: []
---

# Product vision

Owner: Denis. Product baseline v0.01 (D061), ready for technical design; unresolved detailed proposals are not approved by this label.
Scope: enduring direction. D041 supersedes D031's mandatory first-release adventure; D045–D060 establish story-first autonomous life. The [release boundary](foundations/scope-and-release-plan.md) owns the bounded first delivery and development checkpoints.

## Inhabit a world, earn a life within it

A primarily text-based, single-player roleplaying game harness for persistent campaigns that can unfold over weeks of real life. The player inhabits a character, builds relationships, works, explores, and earns a place in a changing world. The defining experience makes time and attention meaningful investments; configurable alternatives can accelerate or remove real-time waiting.

Denis's motivating fantasy is arriving by ship in Seyda Neen as a poor nobody and making a life on unfamiliar Vvardenfell. Another player might become a craftsman in Gondor, earn a living, form attachments, travel, join the military, and eventually face a siege. These illustrate the experience; neither setting nor a poor starting character is mandatory.

The promise is: **inhabit a world of your choosing, earn your progress, and carry its consequences forward.**

## A complete game, supported by language models

The harness provides persistent state, supported rules, possessions, resources, capabilities, relationships, activities, time and consequences. The LLM storyteller deliberately originates incidents and compatible content, maintains relevant story threads and portrays the world. This is a persistent AI-DM experience with a mechanical core, not an exhaustive simulator with optional narrative decoration.

A few minutes of persuading the narrator must not produce legendary equipment or years of wages. Actions must meet their requirements. The world remembers what was earned, spent, learned, changed, and lost. Affordable LLM use must support worthwhile play; expensive generation is not a substitute for game depth.

D&D mechanics and the dungeon-master relationship are the actual foundation, not merely an inspiration for a custom rules system. Reuse established mechanics broadly, including attributes, checks and dice, classes, levels, combat, equipment and magic as applicable to the selected edition. The edition and exact source scope remain to be chosen. The core concept is D&D with LLMs, persistent autonomy and configurable passage of time. Rimworld, EVE Online, The Sims and Tamagotchi inform time, investment and character autonomy without prescribing exact mechanics. No existing code, architecture, or detailed design is carried forward from the old project.

## Time, attention, and pause

The single-player world is either paused or progressing at a configured rate. Manual pause freezes the whole world. In normal delegated play, ordinary unanswered choices continue through permitted autonomy (D057). Explicit alternative pause policies or exceptional permission/state failures can freeze the whole campaign; routine nonresponse is not such a failure. Paused time produces no activity progress, rewards, resource depletion, or advancing threats; returning resumes the same situation.

In the defining time-investment style, travel, work, and other extended activities consume real elapsed time at the chosen fictional pace. The player can switch between direct roleplay and configurable autonomy, including routines that continue for days between visits. Occasional summaries and event notifications offer opportunities to intervene. Unanswered invitations normally proceed through permitted autonomous character decisions; a waiting policy must be explicitly selected.

Manual pause protects real-life availability without granting unearned progress. Leaving the world running is different: configured autonomous play can involve robbery, loss of possessions, or death while the player is absent. Casual and hardcore/ironman styles should be supported through settings for consequences, control and pace. Campaign settings may permit changing speed during play or effectively instantaneous time passage. Ironman-style modes can lock selected settings to preserve the chosen challenge. Faster time does not itself waive other game requirements; the narrator must follow the active rules. Exact rates, locked settings, autonomy limits, and automatic-pause triggers remain to be defined in [Time, presence, and autonomy](experience/time-presence-and-autonomy.md).

## A life inside a changing world

The player can initiate events, pursue ambitions, and change direction. Events also arise beyond their immediate intentions and can reshape their life. A craftsperson's ordinary routines and relationships matter before, during, and after a larger conflict.

The experience must support meaningful everyday life alongside adventure. Becoming a combat hero is not the only valuable trajectory. Characters have motives and limited knowledge; the world is not merely a sequence of rewards arranged around the player. When autonomous, the player’s character also acts through their own intelligence, personality and flaws. Poor judgment and unpredictable consequences are part of the experience; sound or player-optimal decisions are not guaranteed.

This does not promise exhaustive simulation of every distant person or event. The system is deliberately story-first rather than census-first: it preserves a bounded campaign situation and materializes people, places and developments when they become relevant. Interesting events are intentionally authored by the storyteller instead of requiring a huge bottom-up simulation to produce them by chance. Once admitted, consequential facts become durable and constrain later invention.

## Worlds are flexible

Campaigns may start almost undefined and develop through play, begin from a custom premise, or draw on extensive established lore. Unspecified facts, established truths, and undiscovered secrets are distinct. New content must respect what the campaign has already established.

World and character flexibility is mechanical as well as narrative (D033). The harness must not assume medieval technology, humanoid bodies, human needs, surface geography or a single physical scale. Intended possibilities include antiquity, modern transport and weapons, space travel, magic, mixed worlds, animals and microscopic organisms, including transitions between domains in one campaign. Configuration and extensions must give those differences actual consequences; renaming a sword as a laser is insufficient when their behavior differs.

D&D remains the actual foundation. Which adopted mechanics apply unchanged, which can be parameterized and which need explicit extensions is an open design boundary, not permission to silently replace the foundation or promise a universal physics simulator. Setup should turn a natural-language premise into a playable situation quickly, with LLM-assisted preparation as a candidate approach (D034). Generating a description is not proof of a functioning mechanic. [Starting worlds](worlds/starting-worlds-and-content.md) owns the proposed world/mechanics setup contract.

Setting flexibility does not promise automatic fidelity to every fictional canon. Powerful starting identities can be deliberately established during creation; earned progression governs subsequent actions under that starting contract. Player control over creation must remain distinct from changing established outcomes during play.

## Affordable, adaptable, and worth returning to

### First delivery: a web platform

D036–D038 clarify the initial delivery and development aim: a SaaS-style web app and a quickly achievable GitHub project demonstrating full-stack and AI engineering. The first loop generates a local square-map world with relevant NPCs/groups, then supports travel, work, inventory, phone updates and simple next-action decisions. It can use factual code narration without dialogue. See [release scope](foundations/scope-and-release-plan.md) for the narrowed first slice; richer adventures remain later candidates.

Single-player describes each campaign, not a promise that only one web account can exist. Account scope, hosting, stack and repository visibility are unselected. Billing and multiplayer are not implied by SaaS. Architectural ambition should make this loop reliable and explainable rather than require a conventional game engine or an exhaustive simulator.

### Ongoing direction

Support a range of AI providers and models, with understandable control over spending and continuity when changing models. Development and testing must be practical with inexpensive models. Optional generated illustrations are a later extension; text carries the core experience.

Success means wanting to return, valuing what the character has earned, seeing consequences persist, and finding both active involvement and autonomous activity satisfying. We will test these outcomes rather than equate long waits with fun.

Product baseline v0.01 closes this exploration pass. Technical design is next, followed by a playable implementation and empirical refinement. D&D source/profile, input/channel and bounded defaults remain explicit design gates in TASKS, not reasons to expand the product library. Multiplayer is outside the product direction.

## First release serves a professional goal

D040 makes this a senior fullstack engineering portfolio project as well as a game its creator wants to play. The first release must demonstrate product judgment, useful abstraction, polished web interaction, durable background behavior and efficient, observable AI integration. Engineering quality is part of MVP scope, with evidence owned by DOC-RELEASE-SCOPE.

D041 sharpens the initial experience to a Tamagotchi-like generated livelihood: configure a character’s routine, leave the world running, and return to an intelligible record of activities, resource changes and interruptions. Later complexity can make that life richer. This supersedes requiring a small adventure in the first delivery; the broader adventure direction remains. Exact technologies and detailed defaults are still open.
