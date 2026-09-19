# Storyteller request purposes and active-scene continuity

Status: prepared for implementation.
Approval: owner requested this implementation handoff on 2026-09-19; coding follows their model switch. No provider spend is authorized.

## Intended outcome

The player experiences one coherent Storyteller across quiet work, rapid confrontations and unfamiliar forms of life. Internally, each task receives a purpose-specific request reconstructed from durable state and evidence. A fifteen-turn interaction must not forget its beginning merely because the generic recent-passage window is six turns long.

## Representative flow

A beacon confrontation begins with an opponent concealing a blade and making an attributed claim. Across fifteen brief decisions the character changes position, drops an object, tests the claim and tries to disengage. At the final turn, the original clue, exact current possessions, unresolved threat and recent choreography remain available. Restarting the worker produces the same admitted request. A quiet work report afterward needs its historical result and relevant context, not the entire confrontation prompt.

The same context policy supports two microbes reacting to environmental signals: chronological actions, observations and unresolved interactions need no human dialogue fields. A return to a harbor days later selects relevant archived evidence through the existing memory feature, rather than preserving the entire lifetime as an agent conversation.

If required continuity exceeds the captured allowance, preparation reports a specific hold. It cannot silently drop required history, raise the budget, invent a summary or execute an extra paid task. A late result cannot publish against a newer situation.

## Scope and boundaries

- Versioned request-purpose contracts for existing opening, narrative continuation, mechanical consequence and historical report tasks. Mechanical opening is a variant of opening. Future setup, retrieval and memory maintenance remain separately owned capabilities, not new calls on every turn.
- Detailed active-scene evidence selected by declared continuity needs, with a bounded raw chronology and explicit omissions. Scene scope is context metadata, not a mandatory literary lifecycle or clock.
- Reconstruct requests each task. Persist accepted results, exact evidence and useful admitted annotations; do not replay abandoned reasoning or every tool result as story memory.
- Deterministic stable prefix composition with measured reuse, without reliance on a provider cache hit.
- API-only, zero-provider replay and comparison across request purposes and a fifteen-turn encounter.

No generic multi-agent platform, agent per NPC, automatic summarizer, commercial model selection or live evaluation. Canonical document storage, archived recall, tools, gameplay timing and premise-to-mechanical-setup keep their existing owners.

## Acceptance

- Every request names purpose, template version, context policy and output contract in its private artifact; the provider gets only useful content.
- A held fifteen-turn trace identifies exactly which required earlier observations, selected actions and receipts survive at each turn. No scenario-name branches in selection logic.
- The model receives current prose once, chronology in stable order, and exact current state distinctly from attributed historical claims. Any ownership overlap with memory Phase 1 is implemented once.
- A cold restart retains context fidelity. Re-delivery reuses an immutable task; a deliberate rebuild creates new evidence and a new hash.
- Limits include instructions, schema, history and current task. Required overflow is explicit; optional omission reasons are inspectable.
- Comparison reports bytes, actual or unknown tokens, longest reusable prefix, source coverage and unchanged-content hashes. It never labels byte reduction as proven token savings or cache reuse as a measured hit.
- QA covers confrontation, nonhuman interaction, quiet report, setting change, missing evidence and overflow. Live narrative quality remains unverified until a separately authorized evaluation.

## Decisions still needed

Numerical scene budgets and eventual provider cache controls require measurement. They are configurable tuning, not permission to increase the current spending envelope. Automatic scene-boundary detection and paid condensation are deferred; initial scene context uses explicit admitted scope and deterministic fixtures.

## Owning specifications

- [Context and cost](../../technical/context-and-cost.md)
- [Concepts](../../concepts.md)
- [Vision](../../vision.md)
- [Request inspection](../../technical/provider-dispatch-review.md)
- [Memory implementation](../2026-09-18--20-09--storyteller-memory-and-recall/PLAN.md)
