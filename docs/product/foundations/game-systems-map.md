---
id: DOC-GAME-SYSTEMS
layer: product
status: draft
domains: [foundations]
tags: [dnd-rules, autonomy, time-cost, affordability, continuity]
updated: 2026-09-16
relations:
  - type: depends_on
    target: DOC-PRODUCT-PRINCIPLES
  - type: depends_on
    target: DOC-GLOSSARY
  - type: relates_to
    target: DOC-ROUTINES
---

# Game systems and mechanical definition map

This is a product decomposition and an agenda for defining mechanics, not a software architecture or a promise to build every system. D028 establishes explicit mechanics and selective model use; D029 permits drawing design inspiration broadly while preserving D&D as the foundation. The grouping below is an assistant proposal. [Release scope](scope-and-release-plan.md) now owns candidate MVP, later and parked placement; product v0.01 consolidates the current boundary there while detailed draft defaults remain unaccepted.

The existing documents describe much of the desired experience. They do not yet constitute complete game rules. This map locates the missing definitions and their intended owners. Topic paths below refer to the [documentation library](../../DOCUMENTATION_TREE.md); many are planned, not existing files. Do not create a separate document for every row automatically.

## Systems to elaborate

“Define” identifies unanswered product questions, not accepted features. D&D coverage must be checked against the edition and sources we eventually adopt; no coverage claim here substitutes for that work.

| Area | Define the mechanical behavior | Intended owning topic(s) under product/ |
| --- | --- | --- |
| Action eligibility and resolution | Available attempts, prerequisites, costs, uncertainty, valid results and exceptional adjudication | rules/checks-and-action-resolution.md |
| Time and ongoing activities | Fictional durations, progress, interruption, concurrent activity, speed changes and their consequences | time-and-settings/world-clock-and-pace.md; activity-specific topics own their progress rules |
| Pause, control and intervention | Global freeze, direct/autonomous handoffs, pending choices, response deadlines and fallback | time-and-settings/pause-and-resume.md; experience/control-and-handoffs.md; notifications/event-intervention-and-timeouts.md |
| Travel and navigation | Places/routes, distance, movement capability, transport, supplies, arrival, getting lost, rerouting and interruption | worlds/places-travel-and-distance.md |
| Combat | Adopted actions and ordering, positioning, targeting, resource use, retreat and encounter resolution; reconcile with configured time | rules/combat-and-initiative.md |
| Health, rest and bodily pressures | Injury, recovery, rest, conditions, incapacitation and death; identify any additional needs mechanics worth introducing | rules/health-rest-and-conditions.md; routines topic owns recurring responses to needs |
| Magic and special abilities | Eligibility, costs, effects, duration, limits and interactions, wherever applicable to campaign content | rules/magic-and-special-abilities.md |
| Possession and equipment | Ownership, access, carrying limits, use, transfer, consumption and equipment effects; whether wear or repair adds value | rules/equipment-and-resources.md |
| Work and employment | Eligibility, effort/progress, attendance versus output, compensation terms, partial work and loss of opportunity | activities/employment-crafting-and-trade.md |
| Crafting, gathering and maintenance | Inputs, tools, capability, production progress, quality, output, waste and recoverability after interruption | activities/employment-crafting-and-trade.md; split only if content warrants it |
| Exchange and economic pressures | Prices, availability, payment and obligations; how local livelihood connects to broader changes | worlds/society-factions-and-economy.md owns economic behavior; activity topic owns transaction journeys |
| Character creation and development | Adopted capabilities and advancement; any non-level development requires an explicit basis | rules/character-creation-and-advancement.md |
| Personality, motivation and autonomy | How context, traits and priorities affect choice, adherence, temptation and risk; distinguish choice from outcome | characters-and-autonomy/identity-personality-and-judgment.md; goals-orders-and-permissions.md; autonomous-risk-and-decisions.md |
| Routines and competing activities | Recurrence, changed eligibility, resumption, abandonment and conflicts over character time | characters-and-autonomy/routines-work-and-needs.md |
| Knowledge and perception | What can be noticed or learned, uncertainty, mistaken beliefs and secrets; distinguish truth from available information | characters-and-autonomy/knowledge-beliefs-and-secrets.md; rules topic owns adopted checks |
| Social actions and relationships | Attempts to influence others, commitments, trust, conflict and reputation; dialogue does not automatically grant an effect | activities/conversation-and-social-actions.md; characters-and-autonomy/relationships-and-social-development.md |
| Exploration and opportunities | Discovery, access, investigation, hazards, objectives and changing opportunities; completion and rewards need defined conditions | activities/exploration-and-adventure.md; goals-quests-and-opportunities.md |
| Factions, institutions and world events | Group interests, changes in circumstances, event causes and lasting consequences; decide what needs simulation versus abstraction | worlds/society-factions-and-economy.md; world-events-and-causality.md; world-detail-and-simulation-boundaries.md |
| World/content generation | Establish playable content, distinguish hidden facts from undefined content, and define the behavior of generated properties that affect gameplay | worlds/starting-worlds-and-content.md; invention-discovery-and-canon.md; individual rule owners |
| History, narration and recovery | Record consequential results, present summaries, distinguish facts from character reports, and correct product errors | notifications/summaries-and-history.md; ai-experience/dungeon-master-role-and-boundaries.md; quality/continuity-correctness-and-recovery.md |

Settings and model budgets cross these areas. Settings remain in the planned campaign-settings-and-locks topic; [AI contribution and budget](../ai-experience/cost-budgets-and-degraded-play.md) now owns draft model roles, spending and degraded play. A system being listed does not imply its own subsystem, continuous simulation, dedicated model call or mandatory detail level.

## Candidate entity families

Extend the [glossary/domain map](glossary-and-domain-map.md) as these acquire precise meanings. These are conceptual families to examine, not database tables or mandatory classes.

- Actors: characters, creatures, groups and institutions, with relevant capabilities and circumstances.
- Places and connections: locations, routes, obstacles and areas of influence.
- Things and resources: items, equipment, materials, currency and access to facilities.
- Activity and commitments: an attempted action, ongoing activity, plan, recurring routine, agreement or obligation.
- Effects and conditions: changes that affect what can happen, possibly with duration or termination rules.
- Information and relationships: established facts, actor beliefs, social ties and commitments.
- Events and history: what changed, why where known, and what consequences persist.

Not every story noun needs a simulated entity. Promote a detail into explicit mechanics when play depends on its identity, properties, interaction or persistence. Generated variants can use existing mechanical capabilities; a genuinely new capability requires defined behavior before it can reliably affect outcomes. This does not require every possible world detail to be known upfront.

## A reusable definition checklist

D033 adds a cross-cutting requirement: entity families and action contracts must not presume humanlike bodies, currency, ground travel, medieval technology or a fixed scale. [Starting worlds](../worlds/starting-worlds-and-content.md#mechanical-variety-and-simple-setup) owns the proposed mechanical profile and generation journey. The system map must accommodate different capabilities and explicit extensions while retaining adopted D&D authority where applicable.

When defining a mechanic, ask which assumptions are universal, which belong to a world/body profile, and which are just the current example. Shared vocabulary does not require identical resolution: movement through air, along rail, across space and inside an organism may need distinct rules. Test interactions between profiles and transformations as well as each mechanic in isolation.

For each selected mechanic, answer the relevant questions in its owning topic:

1. **Purpose and authority:** what player decision does it support? Which adopted D&D rule applies, or what gap/adaptation are we proposing?
2. **Participants and prerequisites:** who or what acts, on what, using which capabilities, access and resources?
3. **Choice and resolution:** what may be attempted, what resolves automatically, where is intentional chance used, and where is bounded adjudication needed?
4. **Time and progress:** is it immediate, duration-based or progress-based? What changes its pace? Do ongoing effects consume resources?
5. **Interruption and interaction:** cancellation, changed eligibility, retained/lost progress, concurrency and relevant incoming events.
6. **Consequences:** completion, partial results, failure and resource transfer; distinguish produced value from payment owed or received.
7. **Visibility and configuration:** what the player/character can know, relevant settings and locks, and what decisions remain open.
8. **Examples and boundaries:** ordinary use, one consequential interruption, and a case the rule intentionally does not model.
9. **Model contribution:** what requires generation or judgment, what the harness can resolve alone, and behavior when a needed model is unavailable.

This is a drafting aid, not nine mandatory headings for every file. Do not require every action to share one progress formula. Combat ordering, a conversation and a long production activity may need different semantics while sharing resources and the world clock.

## Inspiration without accidental commitments

D&D is the adopted foundation direction; edition and source scope remain open. Other games are sources of questions and patterns to evaluate, not evidence that a mechanic will work unchanged here.

Denis has named Rimworld, EVE Online, The Sims, Dwarf Fortress, Crusader Kings and Heroes of Might and Magic during brainstorming. Potential investigation lenses include ongoing work, time investment, autonomous lives, unfolding history, identity-constrained choices and decision pacing. These are research prompts reflecting our discussion, not verified descriptions of those games' exact implementations.

Before adopting a borrowed pattern: identify the problem it solves, examine its actual behavior when necessary, compare it with the D&D baseline and our campaign policies, record the tradeoff, and decide. Inspiration does not select the source game's content, defaults, interface or architecture. Do not copy a rulebook into the library.

## Recommended next elaboration

Start with one ordinary activity and its interruption to expose the shared action/time/resource questions. Work is a useful illustration, not the mandatory starting scenario. Compare a journey and a supported storyteller incident next. Combat can remain a later conceptual stress check; it is not a prerequisite for the first build.

Edition/source selection precedes precise adoption claims. Until that choice, use explicit placeholders for edition-dependent rules and explore product questions without inventing their answers. The [task queue](../../TASKS.md) owns current priority; this map does not freeze the order or select an MVP.

Open: concrete progress models, action granularity, entity properties, simulation depth, rule coverage, autonomy decision policies and generation budgets. The next step is to resolve a small connected set, not generate an encyclopaedia of arbitrary numbers.
