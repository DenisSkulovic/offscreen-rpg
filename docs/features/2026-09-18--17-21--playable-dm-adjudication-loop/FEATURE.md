# Playable DM adjudication loop

Status: Implementation paused at the owner-requested experience review. The offline authority work authorized on 2026-09-18 remains valid history, but no further expansion or live inference is authorized until the agency/taste review.

## Why this is the next slice

The application can start a profiled story, display authored mechanical options, roll and persist a supported D&D check, narrate its receipts, and publish a storyteller-selected subset of authored actions. That is useful infrastructure, but it is not yet a dungeon master. The storyteller cannot create a new mechanically valid opportunity from the present situation.

The next playable milestone is therefore one repeatable immediate-action loop:

**committed scene → DM proposes feasible actions → player selects → application rolls and commits → DM narrates the result and proposes the next actions**

This is the smallest slice that makes the storyteller, D&D foundation and player agency work together. More settings, more authored fixtures or a general agent framework would not substitute for it.

## Representative POC

The player selects **Absurd Action Comedy** and starts the pineapple mechanical scenario. SpongeBob wakes to find Gary carrying a machine gun and guarding a delivery. The DM may offer:

- ask Gary what he is protecting and why;
- distract him with breakfast while inspecting the delivery;
- take cover and watch for the threat Gary expects.

Each option is a distinct intention backed by a private admitted action plan. If the player asks Gary, the server performs the captured Charisma check once. It saves the die, modifiers, DC and typed effects. The DM then receives the committed receipt and changed facts. On success, Gary may explain his promise and the new options concern the owner, the package or refusing involvement. On failure, Gary may remain distrustful and the available approaches change accordingly. The DM cannot reroll, rewrite the receipt or award an effect that was not in the admitted plan.

The same path must support a microbe reacting to an environmental change. It has no wallet, employment, human anatomy or assumed location. Its options and facts use the same action/adjudication contracts.

## Scope

This slice supports immediate actions whose meaningful mechanical result can be resolved at selection time. It includes:

- zero, one or several contextual options;
- one optional SRD 5.2.1 ability check per action;
- an automatic action when uncertainty has no meaningful consequence;
- success/failure outcome proposals with bounded typed effects;
- durable private plans and public option projections;
- one bounded structured DM-turn task;
- narration and fresh options after committed resolution;
- offline scripted outputs that exercise the same task/validation/publication path;
- explicit held state when no supported action is appropriate.

It excludes long-running contribution, traversal, clock-condition waiting, combat exchanges, inventory creation, arbitrary resource systems, autonomous absence choices, multiplayer and full world/entity modelling. Those exclusions prevent the rejected `durationTicks` model from leaking into the new loop.

## Authority model

The player submits only the published offer ID and selected option path. Public options contain identity, label, intention and an optional derived risk description. They never contain DCs, hidden outcomes, effects or executable rule names.

The DM proposes mechanics; application code admits and executes them. A proposal has no effect until deterministic validation succeeds and publication stores it for the current story revision. On selection, the server loads that stored plan, rechecks current authority and prerequisites, rolls once if required, and atomically commits the receipt and supported effects.

The model may judge fictional plausibility and difficulty within the supported range. It cannot:

- submit SQL, tool names, code or arbitrary effect kinds;
- directly mutate state or call the dice roller;
- choose on behalf of the player;
- see or alter provider credentials and budgets;
- publish against a different story revision;
- convert prose into authoritative state after the fact.

## Immediate action package

The private package is a strict proposal, not a universal action language. It contains:

- a task-local action key, public label and clear intention;
- evidence handles and prerequisite facts supporting feasibility;
- resolution kind: automatic or one ability check;
- for a check: ability, optional supported skill, DC and a short difficulty basis;
- separate success and failure outcome summaries;
- bounded effects for each outcome;
- an optional player-facing commitment/risk description derived from the plan.

The server derives ability and proficiency modifiers from the committed character sheet. The DM cannot supply those modifiers. Advantage, disadvantage and situational modifiers are admitted only when tied to a supported current fact/evidence rule; omit them from the first slice if that validation cannot remain honest.

Action packages are private. A new persisted offer stores its public tree and private plans under the same offer identity. Plans are immutable once published. Replacing an offer creates a new identity; stale selections fail without rolling.

## Effects and facts

The first slice keeps effects intentionally small:

- update a declared numeric quantity when that story has one;
- set a bounded fact in an allowed scope;
- no direct HP damage, item creation/transfer, currency, location teleport or process completion.

A fact is authoritative only after its outcome commits. New facts require an explicit proposed declaration with a stable task-local key, scope (`character` or current `situation`), bounded boolean/string value and evidence basis. The validator rejects reserved identifiers, excessive counts and contradictory duplicate writes. Publication of an action plan does not make either outcome true.

This fact boundary is deliberately smaller than an entity system. It supports “Gary explained the promise” or “the microbe is exposed to the chemical” without creating a database census of every person and object mentioned in prose.

## The bounded DM turn

The DM turn is a distinct task type, not an always-running personality process. It receives the current scene, selected prior intention, committed receipts, character capabilities, current facts, storyteller settings, bounded evidence and the supported immediate-action contract. It returns consequence narration and the private plans behind the next public options together.

The first POC captures that small authority snapshot directly. Application code validates every returned plan and may make one bounded repair request with structured diagnostics. The saved original request, rejected output, diagnostics and repair remain inspectable. A second invalid result holds the story explicitly.

A later tool-using extension may expose `inspect_rule`, scoped `read_evidence` and non-mutating `validate_action_package` when measured context pressure or repair failures justify retrieval. It must retain the same captured story authority, bounded calls and final independent validation. It is not required before the three-round playable POC. There is no critic, router, voting swarm or agent per NPC.

## Durable execution and spending

Planning admission captures story revision, profile/settings revision, rules version, context manifest and execution policy. Model rounds happen outside database transactions. Each round has its own persisted request, response/tool request and accounting attempt. A saved completed round is never resent on retry. An ambiguous provider dispatch stops the operation as uncertain.

Tool results and final output are stored as steps under the planning operation. Publication locks the story, rechecks the captured revision and validates the final package again. Stale work remains inspectable but cannot replace the current offer.

Offline scripted execution is the implementation default. Live inference stays disabled until the owner authorizes a bounded evaluation and current pricing, allowance and reconciliation have been verified.

## Failure and recovery

- Invalid proposal: retain structured diagnostics, expose retry, and do not publish an offer.
- Repair limit exhausted: hold the story with an explicit planning failure; do not silently add attempts.
- Crash after final output but before publication: publish the saved output under the normal revision fence.
- Stale story revision: mark the operation stale and admit a fresh planner only from current state.
- No valid actions: publish a legitimate held state and explanatory scene; do not invent duplicate options or end the life.
- Narration failure after mechanical resolution: keep the roll/effects visible and retry planning/narration without rerolling.

## Acceptance

- The pineapple scenario supports at least three consecutive rounds of DM-proposed immediate options and committed mechanical consequences.
- At least one round changes its next options because of a saved roll/fact, not a hard-coded option branch in application policy.
- The microbe scenario completes the same loop without human/economic assumptions.
- The public client cannot submit DCs, effects, action definitions or tool calls.
- Fabricated IDs, stale offers, unsupported effects and invalid prerequisites are rejected before rolling.
- A retry cannot duplicate a roll, effect, fact or model round.
- Zero, one and several valid options render coherently.
- Scripted DM-turn outputs traverse the same task, validation and publication path used by a provider.
- The UI shows the selected intention, visible d20 receipt/consequence and newly published options without exposing hidden outcome branches.
- No long-running activity is admitted through this contract.

## Deliberate limits

This slice proves a playable DM loop, not general artificial intelligence or a universal simulation. It does not establish that a live model produces enjoyable options; that requires a later authorized evaluation. It does not solve long-term activity progress, travel, combat, character creation for arbitrary species, or all possible world effects.

## Accepted implementation boundaries

- Immediate actions are the entire next playable slice; long-running processes remain separate.
- Offers own private plans instead of resolving through a global catalogue of authored action definitions.
- Generated consequences use a small `character`/current-`situation` fact boundary; richer entities remain deferred.
- Tool-assisted planning is deferred until measured context or repair evidence justifies it.
- Opening mechanical options are generated and reviewed before Start, then their exact private plans are copied into the story.

## Owning specifications

[Game rules](../../game-rules.md), [storyteller runtime](../../technical/storyteller-runtime.md), [rules and activities](../../technical/rules-and-activities.md), [data](../../technical/data.md), and [progress](../../progress.md) own the implemented boundary as it advances.
