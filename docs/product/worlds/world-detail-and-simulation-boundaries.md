---
id: DOC-WORLD-DETAIL
layer: product
status: draft
domains: [worlds]
tags: [world-creation, continuity, affordability, consequences]
updated: 2026-09-16
relations:
  - type: depends_on
    target: DOC-WORLD-EVENTS
  - type: depends_on
    target: DOC-INVENTION-CANON
  - type: depends_on
    target: DOC-KNOWLEDGE-BELIEFS
---

# World detail and simulation boundaries

Owner: Denis. Release disposition: unassigned.
Scope: what needs to be represented in enough detail to support the experience.
Sources: [world events](world-events-and-causality.md), [invention/canon](invention-discovery-and-canon.md), [knowledge](../characters-and-autonomy/knowledge-beliefs-and-secrets.md).

The user wants a character embedded in an unfolding world history. This is not a commitment to equal detail everywhere, centuries of mandatory preparation or a continuously thinking LLM for every inhabitant. D059–D060 make the governing philosophy explicit: this is a story-first, selectively materialized world, not a bottom-up population simulation. This document records product tradeoffs, not storage, simulation algorithms or service architecture.

## Detail serves consequences

The player can interact with a local person, depend on a distant institution and be affected by a development they never witness. Relevance is therefore not determined solely by distance or whether the player is looking.

We need enough detail to support established facts, current choices and consequences that matter. What “enough” means remains a design question, to be evaluated using concrete play. A broad world described superficially may be less convincing than a smaller one with persistent relationships.

The fictional world may imply vast populations without representing them as individual entities. Materialize an entity when the story introduces it, a rule needs it, or an established dependency makes it consequential. Do not generate Farmer Bob on the far side of the world merely so a simulation can ignore him for ten years. The storyteller can author the one relevant visitor, rival or opportunity directly, subject to campaign constraints and admission checks.

## Proposed behavior

| ID | Draft expectation |
| --- | --- |
| DETAIL-001 | Retired duplicate; CANON-002 in [invention/canon](invention-discovery-and-canon.md#proposed-behavior) governs compatibility with established facts. |
| DETAIL-002 | Reducing presentation or modeled detail must not itself silently erase an established obligation, ownership or other relevant consequence. |
| DETAIL-003 | Do not imply that every place or inhabitant has fully defined history merely because the campaign supports a vast world. |
| DETAIL-004 | Retired duplicate; use the hidden/unspecified distinction in [DOC-GLOSSARY](../foundations/glossary-and-domain-map.md#campaign-and-world) and CANON-F01. |
| DETAIL-007 | See the single authoritative definition under Selected direction below: unintroduced residents remain abstract and lore size does not imply per-entity work. |
| DETAIL-008 | Story-authored entities and facts become durable when admitted into play; later narration must retrieve and respect their binding state. |
| DETAIL-009 | Unspecified gaps may be invented when relevant, but invention cannot retroactively alter resolved outcomes or bypass authoritative mechanics. |

These apply the canon and knowledge boundaries to changes in detail. They do not promise exhaustive persistence of every decorative description or require all remote events to be computed in advance.

## Illustrative tests

**Returning to a place.** The character previously left an item with someone. Its subsequent fate should fit established custody and intervening events; a new description of the place must not simply forget it.

**A remote connection.** A distant institution affects a local obligation. It may matter even though the player has never visited it. The product needs to determine the relevant effects, not necessarily describe every member.

**Entering an unspecified region.** New content can be introduced without claiming a complete prior simulated history. It must still account for already-established geography, travel or relationships relevant to entry.

**A distant rumor.** Hearing a rumor does not require every claim in it to become world truth. The belief/truth distinction remains intact across scales.

## Existing forks this document uses

EVENT-F02 owns how far the world develops; EVENT-F05 owns historical preparation. CANON-F01 owns when hidden facts become defined. Do not duplicate their alternatives here.

## Additional options

All candidates; release disposition unassigned.

| Fork | Alternatives and tradeoffs | Evidence needed |
| --- | --- | --- |
| DETAIL-F01: where to invest detail | Player vicinity; consequential connections; selected active regions; a combination | Identify what must remain coherent when a character travels or leaves the game running |
| DETAIL-F02: remote developments | Establish developments before contact; elaborate them when relevant under prior constraints; combine both | Test whether later elaboration changes outcomes that should already have mattered |
| DETAIL-F03: player expectations | Explicitly distinguish explored/established areas; keep detail boundaries mostly invisible; selective disclosure | Decide what helps players form accurate expectations without turning play into system administration |

Remote developments use the campaign’s fictional timeline; deferred elaboration must respect consequences already established. Nor is a living world necessarily a promise that every inhabitant progresses through every action explicitly.

## Boundaries and open work

How much history should remain inspectable? Which remote dependencies are essential? When would a cheaper abstraction alter gameplay unfairly? What delay in defining content is compatible with existing events?

These questions should inform scope and later technical choices. No vector store, event framework, economy simulator or background-agent topology is selected by this document.

## Proposed detail policy

For the proposed first slice, keep named local actors and consequential remote connections at enough detail to preserve choices, custody, obligations and time. A name in world lore does not itself require recurring simulation or an LLM call. Pure geographic distance is insufficient: a remote supplier can matter more than a nearby stranger.

[SCN-007](../validation/reference-campaigns-and-journeys.md#scn-007--small-world-larger-world-same-relevant-story) exercises scale and changes in detail; [DOC-AI-BUDGET](../ai-experience/cost-budgets-and-degraded-play.md) owns expenditure and model gating. These are recommendations to evaluate, not a selected algorithm or measured capacity.

A detail becomes mechanically explicit when a current choice, persistent possession, obligation, effect or causal connection depends on it. Preserve its relevant facts across a change of detail. An unspecified region may be elaborated later, but already-established dependencies constrain the result.

Reconsider detail when an actor enters a place, a relevant connection changes or a consequential event occurs; a remote name alone does not require recurring work. Keep the same custody and resource consequence when local and remote descriptions refer to one object. Reduced detail cannot let two parties independently receive the same unique item or erase a debt. Detail reduction preserves relevant outcomes rather than narrating every intermediate action. Test with SCN-007; precise representation is later technical work.

## Selected direction: rich content with selective simulation

D047–D048 and D059–D060 settle the broad detail policy: generate useful richness without exhaustively instantiating or running a world population. Separate three concerns. Lore describes the setting and constraints; persistent records preserve established entities and consequential facts; active simulation resolves currently relevant activities and effects. A lore-rich faction may have no enumerated membership, and a remembered person may have no running schedule. No automatic promotion from “named” to “simulated” is implied. Storytelling creates relevance; persistence preserves its consequences.

| Detail category | Required continuity | Work between appearances |
| --- | --- | --- |
| Unspecified individual | None beyond existing population/setting constraints; do not create a record just because they could exist | None |
| Established but dormant entity | Identity, established facts, relevant relationships, possessions, obligations and last-known observations | No recurring work unless a consequential dependency needs it |
| Currently consequential entity/activity | Above, plus the state needed for active interactions, deadlines and outcomes | Resolve relevant boundaries; no mandatory per-actor LLM loop |

These are product distinctions, not a selected database state machine. “Dormant” is a processing choice, not an in-world claim that someone stopped living. If Bob was last seen in town, that is an observation at a time, not proof he stayed there for twelve days. Preserve the distinction between authoritative facts, last observations and unspecified intervening details.

DETAIL-005: Storyteller context must recover relevant persistent connections even after long gaps. Encountered entities and consequential objects retain identity through summaries, changes of detail and reappearance. A narrative summary alone must not erase or replace an actual transfer, promise, death, injury or other binding fact. The eventual retention policy may compress incidental detail but must preserve facts needed by future valid play.

DETAIL-006: Returning an entity to active detail reconciles the proposed situation with established history and elapsed time. Unspecified gaps may receive compatible coarse developments without replaying daily life. Do not invent a past event that should have changed an already resolved player outcome, bypassed a pending decision or contradicted an observed fact. Known debts, deadlines and active threats still require their relevant consequences even if associated entities are otherwise dormant.

DETAIL-007: World size and lore volume must not automatically determine tick workload. Keep unintroduced inhabitants abstract and evaluate active/consequential dependencies. If a remote village has no relevant connection, its implied residents need no individual records. Lore can establish its existence or population character without fabricating every resident. Exact activation, indexing and retention mechanisms belong to technical design.

The remaining DETAIL-F01/F02 choices concern thresholds and treatment of consequential dependencies within this selected direction, not whether to simulate every inhabitant. Scale evaluation should distinguish stored lore/facts, persistent dormant entities and active simulation workload.
