# Product document index

Updated: 2026-09-17. Inventory and optional coverage; **not a writing backlog or implementation commitment**.

There are 30 existing product documents. D064 reopens the v0.01 mechanical boundary; vision/release scope and the new story-progression contract are proposals under revision. The library includes 29 uncreated topic possibilities, which remain optional reference ideas. Existing documents may mix horizons; [release scope](product/foundations/scope-and-release-plan.md) owns capability placement. Document counts do not measure readiness.

## Route by the current question

- Next decision and restart: [TASKS](TASKS.md).
- Proposed minimal progression: [DOC-STORY-PROGRESSION](product/experience/story-progression.md).
- What to build first, later or possibly never: [DOC-RELEASE-SCOPE](product/foundations/scope-and-release-plan.md).
- Logic versus models, budget and fallback: [DOC-AI-BUDGET](product/ai-experience/cost-budgets-and-degraded-play.md).
- Concrete week, journey, encounter and failure cases: [DOC-REFERENCE-SCENARIOS](product/validation/reference-campaigns-and-journeys.md).
- Where a precise mechanic belongs: [DOC-GAME-SYSTEMS](product/foundations/game-systems-map.md).
- Recorded direction: [decisions](decisions.md). Reviews apply changes directly to the owning documents; unresolved choices belong in TASKS and their topic owners.

## Existing product documents

The existing work/travel/combat topics now distinguish examples or optional detailed mechanics from the proposed minimal core.

| Existing document | Status |
| --- | --- |
| [experience/story-progression.md](product/experience/story-progression.md) | draft |
| [characters-and-autonomy/autonomous-risk-and-decisions.md](product/characters-and-autonomy/autonomous-risk-and-decisions.md) | draft |
| [characters-and-autonomy/goals-orders-and-permissions.md](product/characters-and-autonomy/goals-orders-and-permissions.md) | draft |
| [characters-and-autonomy/identity-personality-and-judgment.md](product/characters-and-autonomy/identity-personality-and-judgment.md) | draft |
| [characters-and-autonomy/knowledge-beliefs-and-secrets.md](product/characters-and-autonomy/knowledge-beliefs-and-secrets.md) | draft |
| [characters-and-autonomy/routines-work-and-needs.md](product/characters-and-autonomy/routines-work-and-needs.md) | draft |
| [experience/campaign-creation.md](product/experience/campaign-creation.md) | draft |
| [experience/control-and-handoffs.md](product/experience/control-and-handoffs.md) | draft |
| [experience/leaving-and-returning.md](product/experience/leaving-and-returning.md) | draft |
| [experience/moment-to-moment-play.md](product/experience/moment-to-moment-play.md) | draft |
| [experience/time-presence-and-autonomy.md](product/experience/time-presence-and-autonomy.md) | draft |
| [foundations/audience-and-player-needs.md](product/foundations/audience-and-player-needs.md) | draft |
| [foundations/game-systems-map.md](product/foundations/game-systems-map.md) | draft |
| [foundations/glossary-and-domain-map.md](product/foundations/glossary-and-domain-map.md) | draft |
| [foundations/product-principles.md](product/foundations/product-principles.md) | draft |
| [PRODUCT_VISION.md](product/PRODUCT_VISION.md) | draft |
| [worlds/invention-discovery-and-canon.md](product/worlds/invention-discovery-and-canon.md) | draft |
| [worlds/starting-worlds-and-content.md](product/worlds/starting-worlds-and-content.md) | draft |
| [worlds/world-detail-and-simulation-boundaries.md](product/worlds/world-detail-and-simulation-boundaries.md) | draft |
| [worlds/world-events-and-causality.md](product/worlds/world-events-and-causality.md) | draft |
| [foundations/scope-and-release-plan.md](product/foundations/scope-and-release-plan.md) | draft |
| [ai-experience/cost-budgets-and-degraded-play.md](product/ai-experience/cost-budgets-and-degraded-play.md) | draft |
| [validation/reference-campaigns-and-journeys.md](product/validation/reference-campaigns-and-journeys.md) | draft |
| [rules/dnd-baseline-and-coverage.md](product/rules/dnd-baseline-and-coverage.md) | draft |
| [rules/combat-and-initiative.md](product/rules/combat-and-initiative.md) | draft |
| [activities/employment-crafting-and-trade.md](product/activities/employment-crafting-and-trade.md) | draft |
| [worlds/places-travel-and-distance.md](product/worlds/places-travel-and-distance.md) | draft |
| [rules/equipment-and-resources.md](product/rules/equipment-and-resources.md) | draft |
| [worlds/society-factions-and-economy.md](product/worlds/society-factions-and-economy.md) | draft |
| [notifications/event-intervention-and-timeouts.md](product/notifications/event-intervention-and-timeouts.md) | draft |


A draft is not accepted because it has requirement IDs. TASKS owns active review/decision priority. Do not load all topics for ordinary work.

## Optional long-term coverage

The tree preserves useful possible ownership boundaries. Uncreated paths are topics to consider only when a selected capability needs them; they are not broken deliverables or promised features. Do not create placeholder files to make the tree look complete.

```text
product/
  PRODUCT_VISION.md                    Working cornerstone baseline
  foundations/
    audience-and-player-needs.md — Who this serves; motivations and different desired play experiences
    product-principles.md — Earned progression, configurability, character fallibility and other guiding choices
    glossary-and-domain-map.md — Shared vocabulary and conceptual relationships, without database design
    game-systems-map.md — Proposed system inventory, candidate entities and mechanical definition checklist
    success-and-product-risks.md — Desired outcomes, assumptions, failure risks and evidence needed
    scope-and-release-plan.md — Long-term ambition, first playable scope, exclusions and later increments
  experience/
    campaign-creation.md — Choose world, character, rules and settings; reach the first playable situation
    moment-to-moment-play.md — Intent, response, available choices, feedback and active play rhythm
    time-presence-and-autonomy.md — Existing cross-domain overview of time, control and absence; detailed ownership below
    control-and-handoffs.md — Take direct control, delegate, interrupt and resume; resolve pending actions
    leaving-and-returning.md — Leave paused or running; catch up, inspect changes and re-enter play
    campaign-end-and-restart.md — Death, retirement, endings, continuation and new campaigns
  rules/
    dnd-baseline-and-coverage.md — Choose edition and authoritative sources; adopted mechanics and coverage by release
    character-creation-and-advancement.md — Attributes, ancestry/species, classes, levels and other selected-edition choices
    checks-and-action-resolution.md — Action eligibility, checks, uncertainty, difficulty and outcomes
    combat-and-initiative.md — Combat actions, ordering, tactical choices and timing interpretation
    magic-and-special-abilities.md — Spells, slots, abilities, prerequisites, costs and interactions
    equipment-and-resources.md — Items, possession, equipment effects, currencies and consumables
    health-rest-and-conditions.md — Damage, healing, rest, conditions, defeat and baseline death rules
    adaptations-and-rulings.md — Explicit departures or gap rulings needed for time/autonomy/settings; rationale and impact
  time-and-settings/
    world-clock-and-pace.md — Fictional time, elapsed time, speed changes and instant passage
    pause-and-resume.md — Manual/automatic global freeze, resume and interactions with pending events
    difficulty-and-consequences.md — Casual through severe outcomes; nonfatal alternatives and loss policies
    campaign-settings-and-locks.md — Settings catalogue, defaults, presets, dependencies, mutability and Ironman restrictions
  characters-and-autonomy/
    identity-personality-and-judgment.md — Identity, motives, intelligence, flaws and fallible autonomous choices
    knowledge-beliefs-and-secrets.md — What actors know, misunderstand, discover and conceal
    goals-orders-and-permissions.md — Player direction, independent goals, obedience and authority boundaries
    routines-work-and-needs.md — Ongoing work, food, rest and daily life across unattended periods
    autonomous-risk-and-decisions.md — Choice under danger and uncertainty; losses, opportunities and unattended death
    relationships-and-social-development.md — Trust, attachment, conflict, reputation and changing relationships
  worlds/
    starting-worlds-and-content.md — Undefined, partial, custom and established-setting starting material
    invention-discovery-and-canon.md — New facts, existing truths, source precedence and contradictions
    places-travel-and-distance.md — Locations, routes, navigation and fictional travel requirements
    society-factions-and-economy.md — Institutions, groups, markets and larger pressures on daily life
    world-events-and-causality.md — Events beyond player initiative, consequences and coherent developments
    world-detail-and-simulation-boundaries.md — What must stay meaningful at different scales; what is intentionally abstracted
  activities/
    conversation-and-social-actions.md — Dialogue, persuasion, deception and social encounters as player experiences
    exploration-and-adventure.md — Discovery, investigation, danger, clues and expeditions
    employment-crafting-and-trade.md — Jobs, production, selling, livelihood and ordinary advancement
    goals-quests-and-opportunities.md — Player ambitions, offered opportunities and changing commitments
  notifications/
    event-intervention-and-timeouts.md — Which events invite decisions; response windows and no-response policies
    summaries-and-history.md — Occasional updates, return summaries and inspectable campaign history
    delivery-preferences-and-failures.md — Phone preferences, frequency, quiet periods, missed/late/duplicate notifications
  ai-experience/
    dungeon-master-role-and-boundaries.md — What the narrator/DM may decide, invent, reveal and explain
    narrative-style-and-player-dialogue.md — Tone, detail, pacing, ambiguity and communicating with the game
    model-choice-and-continuity.md — Player-facing provider/model choices, capability differences and campaign continuity
    cost-budgets-and-degraded-play.md — Spending visibility, limits and experience when generation is unavailable
    illustrations-and-optional-media.md — Purpose, control, consistency and costs of optional generated visuals
  quality/
    continuity-correctness-and-recovery.md — Persistent truth, correction, interrupted actions and game errors versus fictional failure
    responsiveness-and-availability.md — Waiting and unavailable services, distinguished from intentional gameplay time
    usability-accessibility-and-content-preferences.md — Readable interaction, accessibility needs and configurable content boundaries
    campaign-data-and-portability.md — Save/load expectations, ownership, export/delete and device continuity
    content-sources-and-distribution.md — Provenance and permitted inclusion of rules/world material; evidence and unresolved release dependencies
  validation/
    reference-campaigns-and-journeys.md — Representative lives and complete active/autonomous play scenarios
    acceptance-and-edge-cases.md — Cross-domain examples and failure boundaries; links to topic requirements
    playtesting-and-evaluation.md — How to assess fun, attachment, coherence, autonomy, pacing and affordability
    release-readiness-and-traceability.md — Accepted scope → requirements → evidence → later technical/code references
```

## Ownership and growth

Precise behavior belongs to one topic. Journeys reference it; the vision summarizes it; decisions record acceptance and supersession. Use the ownership mapping in DOC-GAME-SYSTEMS, stable IDs and [documentation conventions](DOCUMENTATION_CONVENTIONS.md) when a topic moves or splits.

For v0.01, time-presence-and-autonomy owns world-clock direction; event-intervention-and-timeouts owns response windows; leaving-and-returning owns recap. Keep these existing owners during technical design. Split only when independent content warrants it; planned clock/pause/history paths do not block implementation.

## Supporting documents

README is the brief entry point; TASKS is the only current queue. WORKFLOW governs phases and conversational acceptance. DOCUMENTATION_CONVENTIONS governs identity, metadata and growth; DOCUMENTATION_TOOLING governs selective retrieval. Templates are drafting aids; the reusable review prompt guides applied corrections. Standalone review reports are not retained. Archive contains superseded product material excluded from routine reads.

Do not add a second open-question register while TASKS plus owning topic forks remain sufficient. Retain possibilities without forcing premature decisions; resolve the small connected slice needed next. The complete long-term library is not a prerequisite for technical design.
