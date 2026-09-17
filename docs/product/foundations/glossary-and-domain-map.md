---
id: DOC-GLOSSARY
layer: product
status: draft
domains: [foundations]
tags: [dnd-rules, autonomy, configurability, continuity]
updated: 2026-09-17
relations:
  - type: derives_from
    target: DOC-PRODUCT-VISION
---

# Glossary and domain map

Owner: Denis. Scope: shared product language, not a data schema.
Basis: [vision](../PRODUCT_VISION.md) and [confirmed decisions](../../decisions.md).
Definitions below are proposed terminology for the confirmed direction. They do not settle detailed behavior or override a selected D&D edition.

## People and authority

| Term | Meaning in this product |
| --- | --- |
| Player | The real human using a single-player campaign; distinct from the character's knowledge, abilities and judgment |
| Player character | The inhabited actor whom the player directly controls or delegates; may be humanoid, animal, microscopic or another supported form. Number of controllable actors remains open. |
| Non-player character (NPC) | Another inhabitant of the fiction, with their own circumstances, knowledge and motives |
| Direct control | The player chooses character actions; outcomes still follow the active game rules |
| Autonomy | The character chooses actions without immediate human direction, subject to the selected policy and their own traits |
| Player instruction | A goal, task or direction given to the character; obedience and interpretation rules remain open |
| Dungeon-master role / storyteller | Originating compatible incidents/content, maintaining relevant threads and portraying the world within the game's authority boundaries; no exhaustive population simulation |
| Harness | The full game that manages persistent state, mechanics, time and consequences and coordinates LLM contributions |
| Provider / model | The service and model used for AI tasks; neither is the identity of the campaign |
| Actor | An entity able to pursue actions under applicable capabilities and constraints; not necessarily a humanlike person |
| Mechanical profile | The campaign's adopted rules, supported capabilities and explicit adaptations that make its world and embodiments playable; proposed term, not a file format or architecture |
| Embodiment | The actor's current form and its relevant movement, sensing, interaction and environmental limits; changing form is not merely changing its name |

## Campaign and world

| Term | Meaning |
| --- | --- |
| World setting | A fictional backdrop and body of source material; may be original, established, partial or initially almost absent |
| World | The evolving fictional reality within a campaign, including established facts and unexplored or unspecified areas |
| Campaign | One continuing playthrough, with its world, character history, rules and configuration; separate from any one conversation |
| Session | A period of player interaction; ending a session does not necessarily pause the campaign |
| Scene | The local situation currently being presented or played; not a separate world clock |
| Established fact | Something already true in the campaign; distinct from what an actor knows about it |
| Canon / source lore | Reference material whose authority relative to campaign developments needs an explicit policy |
| Unknown to an actor | A fact that may already exist but the actor has not learned |
| Unspecified | Content not yet established; not equivalent to a hidden fact |
| Belief | What an actor considers true, possibly incorrectly |
| Discovery / invention | Learning an existing fact / establishing new content; these require different authority rules |
| State / history | What is currently true / what happened to bring the campaign here; conceptual distinction, not storage design |
| Story segment | A proposed unit of continuation that may summarize multiple actions or dwell on one moment; no fixed time granularity |
| Pending continuation | A conditional possible future, not a committed fact or part of the experienced chronology |
| Adjudication | Contextual judgment of feasibility, uncertainty, time and consequences within campaign constraints; may use adopted checks |

## Activity, time and consequence

| Term | Meaning |
| --- | --- |
| Action | A character attempt or decision whose result is resolved under the active rules |
| Activity | A narrative label for an intention unfolding over time; under D064 it does not imply a dedicated implementation per verb |
| Routine | An ongoing intention guiding autonomous continuation; not necessarily a programmed schedule of activity modules |
| Event | Something that occurs or changes the situation, initiated by the player or by the surrounding world |
| Consequence | An effect of actions or events, including gains, losses, relationships, injury or death where enabled |
| Fictional time | Time experienced within the campaign world |
| Real elapsed time | Time passing outside the game |
| Pace / game-speed setting | The player-facing control governing how fictional time advances relative to real time; does not specify an engine tick algorithm |
| Pause | Whole-world freeze: no campaign progression until resumed |
| Offline / absent | The player is not attending; the world may be paused or running |
| Intervention window | An opportunity to choose a response before the configured fallback; ordinary delegated play continues during it under D057; explicit hold policies are alternatives |
| Instant-time configuration | Real waiting is removed or greatly compressed as configured; other rules and intermediate consequences are not automatically waived |
| Progression | Changes in capabilities, possessions, relationships or standing; valuable development need not be combat advancement alone |
| Earned progression | Advancement obtained through the active campaign's requirements; real-time investment is central to one style, not mandatory in every configuration |
| Character mistake | A fallible fictional choice or judgment that may be intended gameplay |
| Product defect | A failure to follow game rules, preserve state or implement the chosen behavior; not excused by character fallibility |

## Rules and settings

D&D means the actual mechanical foundation (D021), not just narrative inspiration. Edition-dependent terms such as class, level, attribute, spell slot, initiative, rest and condition will use the selected edition's definitions. This glossary deliberately does not invent those definitions before edition selection.

A configuration setting is an individual configurable value; use “world setting” for a fictional backdrop and avoid bare “setting” when the distinction is ambiguous. A preset is a named collection of such values. A lock restricts changes under a campaign policy. Ironman refers to the intended stricter play style; its exact save, consequence and setting-lock rules are not yet defined. None of these labels alone selects a default.

## Conceptual connections

- A player participates in a campaign through direct control, instructions, configuration and pause.
- The campaign combines a world, an adopted D&D baseline, settings, characters and persistent history.
- Characters attempt actions and carry out activities. These meet rules and events, producing consequences that change state and history.
- Actors act on knowledge and beliefs, not automatically on all world truth.
- The world clock controls progression. Player presence and character control are separate from that clock.
- The dungeon-master experience presents and develops the game; narration is not permission to bypass mechanics.
- Notifications report events or invite intervention. Their delivery is distinct from whether the world is paused.

These links describe meaning, not software components or database entities.

## Open terminology decisions

Controllable character count; the exact boundary between campaign and reusable world content; player authoring authority during play; edition-specific language; whether named modes are needed beyond configurable settings.

When one of these is decided, revise its owning definition here and review documents that depend on DOC-GLOSSARY.
