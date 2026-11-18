# Gameplay rules | D&D foundation and mechanical promises

**Owner (DOC01 P2):** player-facing mechanical promises. Reconciles former `foundations/game-rules.md` + mechanical sections of `foundations/gameplay.md`.  
**Technical companion:** [rules and activities](../../technical/engine/mechanics-and-capabilities.md).  
**Does not own:** Storyteller creative taste ([behavior](../storyteller/behavior-and-quality.md)), UI choice chrome ([experience](../experience/play-and-decisions.md)), or staff investigation.

## Foundation

D&D-style character abilities, skill checks, dice and recorded consequences are fundamental across work, fishing, travel and combat—not optional narrative decoration. The Storyteller fills the dungeon master’s role for interpretation and narration; **code** validates challenges, rolls dice, determines results and applies supported effects.

The initial product uses a small, explicitly versioned D&D-style rules subset. It must not claim full compatibility with a particular edition. Owner-delegated edition baseline: revised fifth edition, pinned to [SRD 5.2.1](https://www.dndbeyond.com/srd). Full combat, character advancement and long-running progress remain separate scope. Attribution: [rules attribution](../../../NOTICE.md) and `/rules`.

**Negative:** a model cannot choose a die face, reroll a failure, award an unsupported resource, or narrate away a committed result. The player’s character, resources and completed history survive Storyteller changes.

## Authority split

| Actor | May | Must not |
| --- | --- | --- |
| Player | Select among authored intentions; configure creative settings | Directly write world outcomes or force rerolls |
| Storyteller / DM | Interpret intent, propose challenges, narrate outcomes, author available choices | Override dice, invent unsupported effects, seize player decisions |
| Application / engine | Validate plans, roll, commit effects, enforce time and permissions | Smuggle a preferred dramatic genre into universal rules |

Narrative continuation supports a small authoritative story-item vocabulary: `item.create.v1` introduces one bounded keyed item; `item.transfer.v1` moves an item only when the declared prior holder still matches. Ordered effects and the passage commit in one transaction. **Prose and descriptive canonical-document changes alone never create or transfer possessions.**

## Rule libraries and adapters

Rules are a reusable, immutable canonical library pinned by exact root and revision when a campaign starts. Campaign-local rulings live in versioned overlays. Markdown does not execute mechanics: every rule package declares an exact engine adapter identity and version. If a required rule or adapter is unavailable, the task holds or narrows—**it does not invent mechanics**.

## World-independent foundation

The game is D&D checks + LLM dungeon master + time, for arbitrary worlds and characters. Work, wages and fishing are example content, not core systems. A microbe story need not have money or employment. Ability scores remain on the selected rules sheet; the character’s **current form** declares which abilities and skills apply. An unavailable ability is not a score of zero and cannot be invoked by a generated plan.

## First rules subset (POC)

Six abilities (STR/DEX/CON/INT/WIS/CHA), modifiers `floor((score - 10) / 2)`, named skill proficiencies, proficiency bonus, hit points. Ability checks: d20 + ability modifier + proficiency when applicable + supported situational modifiers vs DC. Advantage/disadvantage as standard; natural 1/20 do **not** auto fail/succeed on these ability checks. No mandatory currency, wage or profession.

Long-running work contributes rule-defined progress at meaningful tick boundaries via a captured contribution contract (target, cadence, ability check). Failed or check-only boundaries can consume fictional time without contributing. A literal wait and travel are different process meanings. Encounter occurrence and action success remain **distinct** checks.

Unfinished commitments are durable life, not disposable timer slots. Starting different work should suspend conflicting activity rather than erase it. Abandonment and lost progress require explicit player intent or process/world rules.

## Visible rolls and activity history

Show an expandable roll record with purpose, dice, modifiers, DC when knowable, result and applied effect. Animation illustrates an already saved roll—reload/retry/pace change cannot roll again. Hidden encounters must not leak future threats through the public roll log.

Activity history is durable game history: start, pause, switch, resume, block, interrupt, complete, abandon and rule-defined failure each record ordered typed events. Duplicate commands must not duplicate events.

## Choice breadth (mechanical)

Choice breadth follows actual opportunity (time, proximity, mobility, equipment, knowledge, commitments, threats)—not a fixed option count. Danger often narrows possibilities but does not prove only one button exists. Options disclose apparent commitments, approximate duration and known risks without leaking hidden facts. No free-text action box is required for broad agency; player-written preferences belong in Storyteller settings, not as an immediate action channel.

## Implemented entry and honest limits

Opening mechanical rehearsal (pineapple/microbe/beacon) proves the boundary with deterministic fixtures—not general model quality. Immediate actions and ability checks share the receipt path. A literal wait is a supported activity process (`clock-wait.v1`). A separate traversal family is not that process. Explicit abandonment, full combat, study/level progression and live-model evaluation remain outside this subset where not separately landed. Existing narrative stories are not silently assigned character sheets.

See also: [actions and commitments](actions-and-commitments.md), [time and autonomy](time-and-autonomy.md), [continuity](continuity.md).

## Executable library shape

The rules library is a compact game-master reference, not one giant prompt attachment. A small orientation identifies the executable adapter, important topics and navigation handles. Each rule page and heading carries deterministic topic metadata such as `ability-check`, `advantage`, `time` or `contribution`. A task recipe selects mandatory sections from its known mechanics without a routing-model call. The Storyteller receives the compact applicable rules and may inspect another exact section under the same bounded operation allowance. The whole rulebook is never injected merely because it exists.

Editing prose can change interpretation, examples and campaign rulings. Changing a formula, supported effect or state transition requires a supported adapter or schema change. Low-cost recipes include the mechanical kernel and the exact sections needed for the current operation. Richer recipes may add examples and edge cases, but they use the same pinned sources and executable authority. Storage stays complete across tiers; only the bounded working set changes. Imported rule material must be licensed for the product or privately supplied by an authorized user, with source and license provenance retained.

Certain ordinary actions can succeed without a check. Impossible actions cannot become possible through a lucky roll. Uncertainty with consequences warrants a check. An uneventful road is not evidence that the character failed to travel.

Advantage and disadvantage roll two d20s and select the higher or lower. Opposing sources cancel. Repeated sources do not stack.

## Resumption, hidden rolls and private fact transitions

Later resumption of unfinished work must reference the same commitment, preserve earned progress, recheck current prerequisites and reacquire its named capacity. The generic lifecycle must not invent abandonment, decay or lost progress. The current runtime retains work; it does not yet enforce capacity or the complete activity lifecycle.

The public roll log shows permitted completed checks and redacts secret DCs or modifiers where they would disclose unknown facts. The full record stays private. Repeated quiet checks may be grouped for presentation while their individual records remain. Completed activities stay inspectable after they leave the active commitments view.

On an opening preview, review exposes public labels while the generated result retains private intentions, prerequisites, checks, DCs, process rules and outcome branches. Start copies those exact reviewed plans into the story. The browser later submits only the offer identity and selected path.

Newly generated finite plans identify every intended write to an existing typed character fact by outcome branch. Admission requires the declaration and `fact.set.v1` effect to agree in both directions and rejects targets absent from the captured character state. Empty declarations are valid and do not make a state change compulsory. This metadata is private mechanical coherence. It is not a parser that derives rules from narrative prose.

**Negative:** prose that says an item changed hands does not create or transfer it. A reload, a narration retry or a pace change does not roll again. An approaching interruption may offer resumption of the same saved repair; it must not restart that repair at zero progress.
