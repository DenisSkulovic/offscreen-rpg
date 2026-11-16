# Gameplay rules | D&D foundation and mechanical promises

**Owner (DOC01 P2):** player-facing mechanical promises. Reconciles former `foundations/game-rules.md` + mechanical sections of `foundations/gameplay.md`.  
**Technical companion:** [rules and activities](../../technical/rules-and-activities.md).  
**Does not own:** Storyteller creative taste ([behavior](../storyteller/behavior-and-quality.md)), UI choice chrome ([experience](../experience/play-and-decisions.md)), or staff investigation.

## Foundation

D&D-style character abilities, skill checks, dice and recorded consequences are fundamental across work, fishing, travel and combat—not optional narrative decoration. The Storyteller fills the dungeon master’s role for interpretation and narration; **code** validates challenges, rolls dice, determines results and applies supported effects.

The initial product uses a small, explicitly versioned D&D-style rules subset. It must not claim full compatibility with a particular edition. Owner-delegated edition baseline: revised fifth edition, pinned to [SRD 5.2.1](https://www.dndbeyond.com/srd). Full combat, character advancement and long-running progress remain separate scope. Attribution: [rules attribution](../../history/legal/rules-attribution.md) and `/rules`.

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

Long-running work contributes rule-defined progress at meaningful tick boundaries via a captured contribution contract (target, cadence, ability check). Failed or check-only boundaries can consume fictional time without contributing. Waiting/traversal process families remain designs where not yet implemented. Encounter occurrence and action success remain **distinct** checks.

Unfinished commitments are durable life, not disposable timer slots. Starting different work should suspend conflicting activity rather than erase it. Abandonment and lost progress require explicit player intent or process/world rules.

## Visible rolls and activity history

Show an expandable roll record with purpose, dice, modifiers, DC when knowable, result and applied effect. Animation illustrates an already saved roll—reload/retry/pace change cannot roll again. Hidden encounters must not leak future threats through the public roll log.

Activity history is durable game history: start, pause, switch, resume, block, interrupt, complete, abandon and rule-defined failure each record ordered typed events. Duplicate commands must not duplicate events.

## Choice breadth (mechanical)

Choice breadth follows actual opportunity (time, proximity, mobility, equipment, knowledge, commitments, threats)—not a fixed option count. Danger often narrows possibilities but does not prove only one button exists. Options disclose apparent commitments, approximate duration and known risks without leaking hidden facts. No free-text action box is required for broad agency; player-written preferences belong in Storyteller settings, not as an immediate action channel.

## Implemented entry and honest limits

Opening mechanical rehearsal (pineapple/microbe/beacon) proves the boundary with deterministic fixtures—not general model quality. Immediate actions and ability checks share the receipt path. Explicit abandonment, full combat, study/level progression and live-model evaluation remain outside this subset where not separately landed. Existing narrative stories are not silently assigned character sheets.

See also: [actions and commitments](actions-and-commitments.md), [time and autonomy](time-and-autonomy.md), [continuity](continuity.md).
