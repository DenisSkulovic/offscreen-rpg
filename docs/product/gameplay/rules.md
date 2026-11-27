# Gameplay rules | world-neutral authority and optional mechanical packages

**Owns:** player-facing mechanical promises.  
**Does not own:** Storyteller creative taste ([behavior](../storyteller/behavior-and-quality.md)), UI choice chrome ([experience](../experience/play-and-decisions.md)), or staff investigation.  
**Companions:** [rules and activities](../../technical/engine/mechanics-and-capabilities.md).

## Foundation

Offscreen RPG has a universal **authority model**, not a universal D&D character model. Game Authority validates admitted state transitions, time, permissions, version fences and supported mechanics. A Storyteller may invent and describe fiction inside the world's creative policy, but prose alone cannot grant resources, settle dice, advance protected clocks or manufacture external effects.

Rule families are **optional executable packages**: a prepared experience may opt into typed mechanics, and the engine commits their dice and effects, and model prose cannot settle either (see the Negative below). The repository currently includes a small D&D-style subset based on SRD 5.2.1 (see [First rules subset](#first-rules-subset-poc)); it is a supported package and useful proof target, not a requirement imposed on every story. A microbe, galactic observer or abstract consciousness may have no STR/DEX/HP/inventory at all unless its authored world deliberately introduces analogous mechanics.

**Negative:** a model cannot choose a die face, reroll a failure, award an unsupported resource, or narrate away a committed result. Equally, the engine must not invent a humanoid sheet merely to make a narrative-only world fit an old schema.

## Authority split

| Actor | May | Must not |
| --- | --- | --- |
| Player | Select among authored intentions; configure creative settings | Directly write world outcomes or force rerolls |
| Storyteller / DM | Interpret intent, propose challenges, narrate outcomes, author available choices | Override dice, invent unsupported effects, seize player decisions |
| Application / engine | Validate plans, roll, commit effects, enforce time and permissions | Smuggle a preferred dramatic genre into universal rules |

**Product rights.** Only committed, application-validated effects create or transfer possessions or change facts; effects of one passage commit atomically with it. **Prose and descriptive canonical-document changes alone never create or transfer possessions**, and a narrative statement never transfers ownership.

**Current realization.** The authoritative story-item vocabulary (`item.create.v1`, `item.transfer.v1`, with ordered effects committing atomically with the passage) is recorded in [mechanics and capabilities](../../technical/engine/mechanics-and-capabilities.md#supported-mechanisms-and-the-future-kernel). The product rights above do not depend on that realization.

## Rule libraries and adapters

Rules are a reusable, immutable canonical library pinned by exact root and revision when a campaign starts. Campaign-local rulings live in versioned overlays. Markdown does not execute mechanics: every rule package declares an exact engine adapter identity and version. If a required rule or adapter is unavailable, the task holds or narrows—**it does not invent mechanics**.

## World-independent foundation

World independence means the engine can host typed mechanics **or** narrative-only interaction without silently converting every fiction into fantasy adventuring. Work, wages, fishing, inventory and combat are content capabilities, not universal systems.

Where a D&D-style package is selected, its ability scores and checks behave according to that pinned package. Applicability belongs to the current form and situation: an unavailable ability is not a score of zero and cannot be invoked by a generated plan. Other packages may define entirely different capabilities.

The common contract is authority: mechanics are explicit, versioned and executable when enabled; descriptive prose never substitutes for them.

## First rules subset (POC)

This subsection is scoped D&D content for the first proof target, not a global rule: another package may define entirely different capabilities. Six abilities (STR/DEX/CON/INT/WIS/CHA), modifiers `floor((score - 10) / 2)`, named skill proficiencies, proficiency bonus, hit points. Ability checks: d20 + ability modifier + proficiency when applicable + supported situational modifiers vs DC. Advantage/disadvantage as standard; natural 1/20 do **not** auto fail/succeed on these ability checks. No mandatory currency, wage or profession.

Long-running work contributes rule-defined progress at meaningful tick boundaries via a captured contribution contract (target, cadence, ability check). Failed or check-only boundaries can consume fictional time without contributing. A literal wait and travel are different process meanings. Encounter occurrence and action success remain **distinct** checks.

Advantage and disadvantage roll two d20s and select the higher or lower. Opposing sources cancel. Repeated sources do not stack.

Unfinished commitments are durable life, not disposable timer slots. Starting different work should suspend conflicting activity rather than erase it. Abandonment and lost progress require explicit player intent or process/world rules.

## Visible rolls and activity history

Show an expandable roll record with purpose, dice, modifiers, DC when knowable, result and applied effect. Animation illustrates an already saved roll—reload/retry/pace change cannot roll again. Hidden encounters must not leak future threats through the public roll log.

Activity history is durable game history: start, pause, switch, resume, block, interrupt, complete, abandon and rule-defined failure each record ordered typed events. Duplicate commands must not duplicate events.

## Choice breadth (mechanical)

Choice breadth follows actual opportunity (time, proximity, mobility, equipment, knowledge, commitments, threats)—not a fixed option count. Danger often narrows possibilities but does not prove only one button exists. Options disclose apparent commitments, approximate duration and known risks without leaking hidden facts. No free-text action box is required for broad agency; player-written preferences belong in Storyteller settings, not as an immediate action channel.

Certain ordinary actions can succeed without a check. Impossible actions cannot become possible through a lucky roll. Uncertainty with consequences warrants a check. An uneventful road is not evidence that the character failed to travel.

## Implemented entry and honest limits

**Dated realization (experimental; not a product promise).** The implemented slice is bounded to deterministic fixtures. Opening mechanical rehearsal runs on the pineapple, microbe and beacon fixtures; it proves that boundary only, not general model quality or that arbitrary worlds are enjoyable. Explicit abandonment, full combat, study and level progression and live-model evaluation are outside it, and existing narrative stories are not silently assigned character sheets. The exact vocabulary, receipt path, `clock-wait.v1` wait process and exclusions are recorded in [mechanics and capabilities](../../technical/engine/mechanics-and-capabilities.md#supported-mechanisms-and-the-future-kernel) and [persistence and known limits](../../technical/engine/mechanics-and-capabilities.md#persistence-and-known-limits).

See also: [actions and commitments](actions-and-commitments.md), [time and autonomy](time-and-autonomy.md), [continuity](continuity.md).

## Executable library shape

**Requirement.** The Storyteller receives only the bounded rules relevant to the current operation; the whole rulebook is never injected merely because it exists. A required rule or adapter that is unavailable holds or narrows the task (see [Rule libraries and adapters](#rule-libraries-and-adapters)). Editing prose can change interpretation, examples and campaign rulings, but changing a formula, supported effect or state transition requires a supported adapter or schema change. Storage stays complete across quality tiers; only the bounded working set changes. Imported rule material must be licensed for the product or privately supplied by an authorized user, with source and license provenance retained.

**Current realization.** Orientation, deterministic topic metadata, task recipes, bounded section reads and cost tiers are recorded in [prompts and tools](../../technical/storyteller/prompts-and-tools.md#selected-compilation-and-tool-contract). The requirement above does not depend on that realization.

## Resumption, hidden rolls and private fact transitions

Later resumption of unfinished work must reference the same commitment, preserve earned progress, recheck current prerequisites and reacquire its named capacity. The generic lifecycle must not invent abandonment, decay or lost progress. The current runtime retains work; it does not yet enforce capacity or the complete activity lifecycle.

The public roll log shows permitted completed checks and redacts secret DCs or modifiers where they would disclose unknown facts. The full record stays private. Repeated quiet checks may be grouped for presentation while their individual records remain. Completed activities stay inspectable after they leave the active commitments view.

No rule here makes an opening preview mandatory. Where one exists, review exposes public labels only; private intentions, prerequisites, checks, DCs, process rules and outcome branches stay private, Start copies the exact reviewed plans, and the browser submits only the offer identity and selected path. Declared writes to existing typed character facts must agree with the `fact.set.v1` effect, and that metadata is mechanical coherence, not a parser that derives rules from prose. Details: [mechanics and capabilities](../../technical/engine/mechanics-and-capabilities.md#persistence-and-known-limits).

**Negative:** prose that says an item changed hands does not create or transfer it. A reload, a narration retry or a pace change does not roll again. An approaching interruption may offer resumption of the same saved repair; it must not restart that repair at zero progress.
