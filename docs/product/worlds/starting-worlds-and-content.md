---
id: DOC-STARTING-WORLDS
layer: product
status: draft
domains: [worlds]
tags: [world-creation, continuity, dnd-rules]
updated: 2026-09-16
relations:
  - type: derives_from
    target: DOC-PRODUCT-VISION
  - type: depends_on
    target: DOC-GLOSSARY
  - type: relates_to
    target: DOC-CAMPAIGN-CREATION
---

# Starting worlds and content

Owner: Denis. Release disposition: unassigned.
Scope: what a campaign starts with and what can remain undefined.
Related: [vision](../PRODUCT_VISION.md), [terms](../foundations/glossary-and-domain-map.md), [campaign creation](../experience/campaign-creation.md).

Confirmed direction: a campaign may begin with almost no defined world, a custom premise, or extensive established lore. The following examples and proposed behavior elaborate that direction; they do not choose an authoring policy, content catalogue or MVP mode.

## Three starting examples

### Almost nothing: “I wake in darkness”

The opening establishes very little. The immediate experience can take shape through the player's attempts and the game's responses. A name for the continent, its rulers and its distant history need not exist yet.

Sparse world detail does not necessarily mean the character has amnesia. Nor does it mean the system may keep changing already-established surroundings. If the character learns there is a locked wooden door, subsequent play must account for it until something changes it.

The exact boundary between what the player may declare and what the game establishes remains open. “I feel around for a door” and “There is a door here” express different kinds of input.

### Custom premise: “A fishing town where nobody sails after sunset”

The premise gives play something to build on without specifying every resident or explaining the taboo. Its cause may be established secretly at creation, generated when it becomes relevant, or developed jointly with the player. Those approaches are alternatives, not a decision made by this example.

Whichever approach is used, facts already revealed constrain later explanations. Unknown to the player and not yet defined are different conditions.

### Established setting: “A nobody arriving in Seyda Neen”

The player expects recognizable places and context. Naming the setting alone does not establish which period, sources or departures from canon the campaign should use.

The game should support that intent without claiming it has verified every detail. How much source material is required, supplied by the player or otherwise made available is a later content decision. This example does not promise a bundled Morrowind world or automatic import of an entire fictional universe.

## What initial material can mean

| Kind | Example | Why the distinction matters |
| --- | --- | --- |
| Desired premise | “I want a dangerous frontier town” | Expresses intent; does not specify all facts |
| Established campaign fact | “The character owes the innkeeper money” | Play needs to preserve and apply it once adopted |
| Source reference | A description of a fictional city | Its authority relative to the campaign must be chosen |
| Unknown fact | A hidden room already exists | Discovery reveals something rather than creates it |
| Unspecified area | What lies beyond the mountains has not been defined | Future creation has room to develop it |
| Character belief | Locals say the forest is cursed | May be false without making world history inconsistent |

This table uses [DOC-GLOSSARY](../foundations/glossary-and-domain-map.md); it does not prescribe a storage representation.

## Proposed behavior

| ID | Draft expectation |
| --- | --- |
| WORLD-START-001 | Allow materially different amounts of starting detail; missing distant geography alone should not block a local opening. |
| WORLD-START-002 | Preserve deliberately established starting facts as the world develops. Changes and corrections must be distinguishable from silently forgetting them. |
| WORLD-START-003 | Do not present a generated addition as verified source lore merely because it sounds plausible. |
| WORLD-START-004 | Treat a selected world and the adopted D&D mechanics as separate choices that must work together; surface substantive conflicts rather than silently replace the rules foundation. |

WORLD-START-004 leaves room for a real unresolved issue: a setting's expected treatment of magic or character types may differ from adopted D&D rules. This document does not select setting overrides, reskinning or restrictions as the answer.

## Options and forks

All remain candidates with release disposition unassigned.

| Fork | Options and tradeoffs | What would help choose |
| --- | --- | --- |
| WORLD-F01: how much to establish | Only the opening scene; a local region; substantial world material. More preparation can constrain contradictions but adds setup effort and content. | Try each against a concrete first session. |
| WORLD-F02: who fills gaps | Ongoing authorship alternatives now owned by [invention and canon](invention-discovery-and-canon.md#authorship-and-fidelity-forks). | Apply the chosen policy to the starting content. |
| WORLD-F03: source fidelity | Fidelity alternatives now owned by [invention and canon](invention-discovery-and-canon.md#authorship-and-fidelity-forks). | Apply the chosen policy to source material at creation. |
| WORLD-F04: contradictions at creation | Ask the player; apply declared source precedence; offer an alternative. None should silently masquerade as the player's original intent. | Test a conflicting pair of supplied facts. |

These are design forks. The product need not expose every fork as a settings switch.

## Mechanical variety and simple setup

D033 confirms a platform spanning eras, technological and magical systems, different bodies and enormous differences in scale. D034 calls for fast, simple creation and proposes LLM-assisted world/entity/mechanics generation. This goes beyond different lore around the same human adventurer. The behavioral model below is an assistant proposal, not selected software architecture.

### A shared game contract with specific world rules

Shared concepts should describe actors, capabilities, places and connections, resources, activities, effects, information and consequences without prescribing a human body or medieval economy. Particular worlds give these concepts concrete behavior. A bird can have flight, perching, vision and foraging without hands, currency or spoken dialogue. A spaceship can contain actors and equipment, move between places, require fuel and expose its occupants to conditions. An organism can sense and interact according to an explicit game abstraction without inheriting human social or survival needs.

Generality does not mean one formula for everything. Train routes, aircraft flight, interstellar travel and molecular movement may share prerequisites, costs, time and interruption concepts while requiring different permitted actions and resolution rules. Range, containment, scale, environmental compatibility and relevant units must have defined meanings. Numerical distance alone does not determine reachability: a wall, vacuum, membrane or unavailable route can block a short journey.

The D&D baseline remains explicit. For each proposed capability identify whether it uses an adopted rule, a parameterized/content variant, a combination of supported effects, or a genuinely new mechanic requiring an extension. Do not force all phenomena into attack rolls, classes or humanoid equipment slots merely to preserve familiar labels. Do not silently substitute a new universal ruleset either. The adaptation boundary requires product decisions.

### Draft preparation journey

1. Interpret the premise: playable identity, desired capabilities, world assumptions, tone, starting situation and relevant scales. Infer low-risk defaults; ask only about contradictions that materially change the experience.
2. Assemble a compatible mechanical profile from supported rules/content and explicit adaptations. Distinguish cosmetic invention, combinations of supported behavior and genuinely unsupported mechanics.
3. Generate the local entities, resources, relationships and situation required for the opening. Establish enough distant constraints to support the stated journey; avoid generating every planet or cell.
4. Check prerequisites, units/scales, capability interactions, time/resource accounting and compatibility with established facts. Walk a representative action and one failure/interruption before calling the profile playable. These checks are necessary, not proof of balance or completeness.
5. Give the player a short playable premise and consequential limitations, with optional deeper detail. Enter play without exposing a developer configuration form. Reuse the accepted mechanical profile during routine play instead of regenerating rules each turn.

For an unsupported capability, the proposed product response is an explicit supported approximation, a narrower opening, or a proposed extension awaiting definition. Never advertise an effect as fully simulated when only its narration exists. The long-term aim is increasing expressive coverage; the current generated profile has an honest boundary. No automatic execution of arbitrary model-written code is selected by this flow.

### Composition and transitions need rules

A shrinking effect raises real questions: what happens to carried equipment, mass, strength, reach, sensing, breathing, energy and current activities? Is the actor still inside the ship? Does the external world continue at the same fictional rate? Can a macro-scale ally intervene? Which spells cross the new boundary? A second scale does not get a separate permission to advance during global pause.

Mixing magic with machinery similarly requires explicit interactions: can teleportation move cargo through a sealed hull, can healing repair a vehicle, and can magical transmutation bypass a mining cost? Answers depend on the campaign contract. “Both exist” is not enough to make their interaction coherent. A profile change during play must preserve identity, history, possessions and unresolved commitments, while explicitly resolving effects that no longer apply.

The proposed first flexibility check uses the same action/time/consequence vocabulary in an ordinary livelihood, a non-humanoid life, and one mixed-domain transition. [SCN-008](../validation/reference-campaigns-and-journeys.md#scn-008--a-wizard-asteroid-miner-and-microscopic-traveler) is the demanding illustration. This is a product-model exercise now, not a promise to ship every setting or scientific simulation in the MVP.

WORLD-F05: How much genuinely new mechanical behavior may creation introduce? Candidates: only supported combinations; explicit extensions prepared before play; or bounded runtime adjudication for selected gaps. Compare responsiveness, reproducibility, maintenance, cost and fidelity. An LLM can help author a rule, but neither plausible prose nor self-review alone proves it works. Exact generation time/cost targets and extension approval behavior remain open.

## Remaining boundaries

Creation UI and input formats; source acquisition; reusable world packages; import/export; licensing or distribution; the chosen D&D edition; rules adaptations; how far off-screen simulation extends.

[Invention, discovery and canon](invention-discovery-and-canon.md) now owns ongoing authorship and fidelity forks. These remain unresolved alternatives, not selected policies.

## Concrete first world-builder output

D038 makes a generated playable local life the initial target. For the miner premise, prepare a bounded map with home, mine, settlement/city destination and tavern; playable entrances/routes; one work agreement; clothing, tools where needed and starting currency; a few relevant persistent NPCs and organizations; incidental residents remain abstract until needed. Names are the user's requested setting references, not verified canon. Broad import and exhaustive lore fidelity remain deferred.

Recommend a supported mechanical profile plus reusable content patterns. Use model effort for interpreting the premise, naming/characterizing key entities and selecting coherent arrangements; ordinary procedural variation may supply a resident when interaction or consequence makes an individual necessary, not populate a census in advance. Do not spend a separate call on every tile, item or NPC biography. Keep a generated world's accepted identities and content rather than regenerate it each visit.

Before start, check that required destinations are reachable, actor/item/group references resolve, the actor can perform the job, the agreement has duration/payment rules, and the initial choices are legal. Check a journey → work → pay → next-choice walkthrough. Repair bounded failed portions or return a clear setup limitation; do not retry the entire world indefinitely. The exact division of model and procedural work, setup budget and target waiting time remain design choices.

The user should see a usable starting situation and a few consequential settings, not raw generated structures. Local detail grows when play needs it. Rich dialogue, exhaustive histories, per-cell AI reasoning and arbitrary new rule synthesis are unnecessary for the first setup. Reusing generated content is different from assuming provider prompt-cache hits.

## Generated livelihood viability

For D041–D042/SCN-010, a generated profile must supply a starter routine whose activities have compatible requirements, durations, outcomes, resource constraints and explicit permissions. Production, trade, food and lodging apply only if selected by that supported profile; no fishing mechanic is required. Validate that the routine is possible under ordinary starting conditions; explain known deficits instead of promising survival or a fixed profit. Generate economic parameters within supported bounds and check them together, not as unrelated prose. For example, production followed by exchange differs from employment that pays wages; the generator must preserve the chosen activity semantics regardless of its narrative label. Content variation remains available within this supported mechanical envelope.

## Interconnected generation as a first-release showcase

D043 highlights generation as a substantive engineering opportunity. Proposed product stages are: interpret the premise and supported profile; establish a bounded region and connections; populate relevant actors, groups, resources and activities; add lore, relationships and possible tensions; validate the whole playable starting state; present the result and limitations. These are responsibilities, not a mandated number of agents, calls or services. A model can add creative connections, but plausible prose does not establish compatible mechanics or consistent facts.

WORLD-START-005: Every generated consequential relationship must resolve to compatible entities or explicitly deferred content. An employer needs a usable activity and payment terms where relevant; a route needs valid endpoints and access; a local conflict needs participants and a credible point of contact. Facts established in one generation step constrain dependent steps. Names alone must not be used to merge unrelated entities or create duplicate identities.

WORLD-START-006: Show progress and allow cancellation with visible usage. Keep unfinished generation separate from a playable world. A partial retry must preserve accepted facts outside its affected scope; after changes, recheck affected dependencies before admitting the result. Bound total attempts and spending, and offer a smaller supported result or an explained failure rather than endless repair. Exact stage granularity and mechanisms belong to technical design.

WORLD-START-007: Start with enough connected content for playable routines and a few possible developments, not exhaustive planet/history generation. Expand when relevant, preserving prior facts and the selected authorship rules. Define which facts are required for the next step and which are still intentionally unknown. Later invention must not retroactively supply a resource or history merely to justify a resolved outcome.

Measure useful playable output: valid references, reachable activity paths, contradiction/repair rates, setup latency, all-in model cost and the player's ability to understand what was created. More generated lore or more agent calls are not quality measures. The initial showcase should include at least one dependency failure and bounded recovery, alongside successful creation. Exact benchmarks remain to be implemented.

## Generate a setting for storytellers, not every incident's prehistory

D045 allows a sparse playable world to receive storyteller-originated incidents. Initial generation supplies setting constraints, relevant locations/actors, supported activities and optional story hooks; it need not pre-create every possible adversary, organization or chain of decisions. Introduce further compatible content when an incident needs it and retain consequential facts afterward. This reduces required simulation breadth, but consistency, relevance and supported outcomes still need validation. D046's storyteller style can guide hooks and tone without replacing the chosen setting or mechanical profile.

## Lore richness and playable state have different bounds

D047 changes the preparation emphasis from whole-world completeness to a coherent, selectively instantiated setting. Generate useful lore, cultural constraints, places, factions, hooks and selected characters without enumerating every implied resident. Give the player a viable local activity/routine space; leave unrelated populations and histories abstract. Broader lore may be authored or expanded within its own budget, but it must not automatically allocate NPC schedules, inventories or per-tick work. Unintroduced miner Steve is unnecessary data, while an established Bob and his acquired spear need durable continuity. Preserve deliberate user-specified details even if they never become active simulation.
