# A living story with a life of its own

Offscreen RPG is the experience of living inside a story that unfolds over time. You would enter through a prepared experience or a freeform **Story Prompt**, then inhabit a perspective whose world can keep accumulating history between visits. That perspective may be a person, creature, community, organism, place, system, observer, distributed consciousness or something stranger. Ordinary life and dramatic events both matter. The story can be quiet, funny, strange, dangerous or tragic.

The defining promise is not “AI chat with a character sheet.” It is a **living, persistent, historically exact story**: the Storyteller would investigate and write from durable sources, the game would admit consequences under explicit authority, and each published scene would become a faithful historical point that can later be reviewed or forked. The experience centers on a character with a life. [Progress](../../../STATUS.md) records what has been demonstrated.

## What this page selects

The sections below select these commitments, each detailed where it appears:

- **Earned time and consequence:** effort takes real time and risk can destroy accumulated progress where the campaign permits ([Earned life](#earned-life)).
- **Player consent:** leaving the page does not authorize a new player decision. Accepted unattended work progresses only under the campaign's explicit time/autonomy rules, and a personality acting overnight without that consent remains outside the selected player-agency contract.
- **A genuine investigative Storyteller** and **persistent rooted knowledge** ([The storyteller](#the-storyteller)).
- **Exact scene history and forks** as a future experience ([Scene history and alternate continuities](#scene-history-and-alternate-continuities)).
- **Sparse continuity and world neutrality:** no universal humanoid body, D&D sheet, inventory, profession or grand quest is required.
- **Optional authoritative mechanics** ([Optional mechanical foundations](#optional-mechanical-foundations)).

The sponsored allowance in [Why build it](#why-build-it) is illustrative and is not spend authorization. A general delegated player choice is not accepted merely because the Storyteller can delegate research to its own assistants; player autonomy and writer-agent delegation are separate concepts.

## Optional mechanical foundations

### The D&D foundation

D&D-style mechanics are one supported authored rules family, not the product's universal ontology. Authored rules families are optional: a prepared experience may opt into ability scores, checks, dice, hit points, inventory, professions or other typed mechanics, and when it enables them they are mechanically authoritative. Another experience may use different mechanics or remain largely narrative.

The engine stays world-neutral: it supplies authority, persistence, time, capabilities, evidence and versioned rules without assuming a humanoid body or fantasy-adventurer schema. When a world enables typed rules, those rules are real and authoritative; prose cannot override them. When a world does not enable them, the Storyteller must not quietly manufacture a D&D sheet as hidden scaffolding. See [gameplay rules](../gameplay/rules.md).

## Scene history and alternate continuities

**Selected long-term product promise (owner clarification, 2026-11-19):** Every committed narrative scene would become a durable historical checkpoint with sufficient versioned authoritative game state to revisit it as it was and to start an **independent fork from any committed scene**. The journal/book is a navigable, faithful history, not merely a prose transcript; a fork would continue from that scene's own character state, capabilities, meaningful possessions or resources, relationships/world facts, fictional time, commitments and other applicable mechanical truth. It must never inherit later changes from the parent timeline. An inventory is recorded where meaningful to that world, not mandated in a microbe or abstract setting. Scene-specific creative settings and rendered/source assets must remain associated with their original publication as appropriate for faithful review.

This is the **eventual experience target**. The current proof of concept does not implement historical state reconstruction, replay or arbitrary scene forking, and nothing here claims it does. A historical checkpoint must be internally consistent; never fabricate a fork by mixing an old passage with a newer character/item ledger. A branch is a separate continuation, and reading history does not replay dice, call a provider, spend resources or change live game time. Storage representation, atomic boundary, migration compatibility and pending-task/timer semantics need their own technical design before implementation. See [journal](../experience/return-and-journal.md) and [fork lifecycle](../../technical/engine/lifecycle-and-compatibility.md#forked-continuities).

## The storyteller

The Storyteller is the player-selected creative identity of the story. It shapes scenes, choices, judgments and developments, and it does so in a chosen style: different profiles shape tone, dramatic rhythm and unpredictability. The application's rules retain authority over time, permissions and committed consequences, so a profile never grants itself mechanical power. In editable campaigns, players can switch and customize these presets during play using [typed settings, tags and guidance](../storyteller/profiles-and-settings.md); locked campaigns preserve their declared commitments. Someone you met days ago or an object you gave away can become important again.

How a profile is realized is an implementation matter, not a product guarantee: the selected design composes reusable application logic, selected context and task-specific model generation, and it is not necessarily one agent or one model. See [Storyteller profiles](../storyteller/profiles-and-settings.md) and [concepts](concepts.md).

The engine is creatively unopinionated. It does not have a preferred amount of action, quiet, comedy, danger, momentum, choice or narrative closure. Those qualities come from the selected Storyteller, the campaign's direction, the story opening and established fiction. A deliberately dull, contemplative, chaotic or frantic Storyteller is valid when it realizes its declared configuration. The engine supplies neutral capabilities and authority—rules, time, persistence, evidence, permissions and cost bounds—without turning one preferred play style into a universal hidden director. Gameplay quality is therefore judged against the current story and Storyteller commitments, in addition to mechanical correctness, rather than against a generic definition of enjoyable pacing.

The world should feel rich without simulating everyone in it. Establish people, places and lore when they matter. Remember consequential facts afterward. A character can disappear from the story for weeks without needing a background schedule of meals and errands.

The fictional world may imply far more people, objects and places than the database explicitly stores. Distinguish implied background, details that actually appeared in a scene, and the smaller set of identities that later correctness depends on. Appearance in prose is not by itself a durable world record. Do not create Farmer Bob because farms exist beyond the hill. If the player forms a relationship with a tavern patron, gives them an object, or later returns looking for them, that specific identity becomes continuity-relevant. A later storyteller should produce one bounded coherent scene or world proposal rather than one agent per NPC, place or faction. The representation of durable people, places and objects is chosen when a concrete gameplay slice needs it; it is not a reason to add a census of unused entities.

Settings and characters should be flexible: fantasy, space, everyday life, unusual creatures or mixtures. The core should not require a specific profession, human body, economy or geography. Creative freedom still needs continuity: established facts and player choices should have weight.

The selected D&D rules can remain richer than a particular character's current form. Applicability belongs to the character and situation: a bodiless consciousness may have no current use for Strength or a humanoid skill, while a later embodied form can gain them through an admitted transformation. Preserve conventional D&D behavior when the world supports it; do not flatten the rules to the smallest common denominator or pretend every rule applies to every form.

## The experience on screen

The browser is a visual, atmospheric place to inhabit the current scene. Show what the character is doing, what they perceive and what they can do next. Quiet moments do not need artificial activity to fill the screen.

Relevant possessions, people and places are available when useful. A focused chronology helps you remember the story and return after a long break. Avoid a spreadsheet of world systems.

A messaging service such as Slack could support brief updates and choices during the day. Notification frequency, storyteller intensity and character autonomy are separate concerns.

## First playable target

A story begins through one of two deliberately simple entrances:

- **Prepared experience:** choose an authored experience and press **Play**. Optional **Customize** changes only the dimensions that experience exposes.
- **Custom story:** provide one freeform **Story Prompt**. A title, humanoid role, class, rules package, profile picker and review wizard are not prerequisites.

The Story Prompt is recorded verbatim as player intent; it is not automatically world canon. The Storyteller may invent an original world where policy permits, and Game Authority then admits the opening as one coherent first scene. The player does not approve a generated preview before play. A recoverable saved draft is useful, but “draft” is not a second lifecycle between prompt and play.

The first scene appears without fictitious background time: provider latency, retries and browser navigation never advance the world. A prepared experience may need **no setup model call at all** before the opening mission when its authored Library already holds the needed orientation.

The solo story and broader target journeys live in [acceptance scenarios](../gameplay/acceptance-scenarios.md); the shared ambition is stated in [Larger shared worlds](#larger-shared-worlds).

## Larger shared worlds

On 2026-11-18 the owner ratified the first tested playability milestone as solo. The intended experience still names the possibility of inviting friends into a shared story. A small cooperative party in one story is a distant, unscheduled later aspiration: not cancelled, not implemented, not required before that solo proof and not the next obligation. Shared decision and pause rules remain [proposed](../../../work/designs/backlog/shared-play/README.md), and the exact live acceptance for the small party stays Proposed/Blocked. Thousands of players across independent stories, and eventually a world with roughly a hundred participants, come only after that party if it is ever ratified; they are not demonstrated capacity. Larger worlds need independent scenes, limited pause authority and explicit absence rules; increasing a player-count setting cannot supply those behaviors.

## Why build it

This section is the portfolio purpose. It does not authorize provider spend, and it does not change the [pace rule](../gameplay/time-and-autonomy.md#pace). This is both a game we want to play and a senior fullstack portfolio project. A small, convincing experience should demonstrate thoughtful abstraction, persistent state, background execution, model orchestration, context management and cost control.

The delivery goal is a hosted, playable link from a CV or portfolio. A visitor should quickly experience a scene, make a meaningful choice and see persistent offscreen progression; inspecting GitHub is optional. Provide a short demonstration path without making the visitor wait ten minutes for their first interesting result. Keep longer real-time play available separately. A bounded sponsored AI trial is a later target, with an illustrative allowance around $2 rather than a settled entitlement or authorization to spend.

The first proof of concept should let us create a character, experience ordinary life, encounter a development, intervene with a choice, and return to a coherent continuation. An unanswered decision stays open until the player returns. A later timed fallback may close one only when the player already authorized it. A character who chooses from personality without that authorization remains the later aspiration in the participation rule above. That gives us something real to play before expanding it.

## Earned life

The defining experience is not simply that an AI tells a story slowly. Time, persistence and consequence make the character's life feel earned. An ordinary chat interface can declare a journey completed immediately; Offscreen RPG preserves the cost, elapsed time, state and uncertainty between intention and outcome. The distinction is **instant narration** versus **earned progression**.

An action that takes meaningful fictional effort can require meaningful real elapsed time. A character walking across a region may travel for hours while the player is elsewhere, a work shift may occupy part of an evening, and recovering, studying, earning money, building trust or waiting for an opportunity may unfold over days. Completion is authoritative: starting an eight-hour journey does not mean the character has arrived, and beginning a shift does not grant its pay. An estimated reward is not owned until the activity reaches its valid completion or consequence.

This makes modest things valuable. A few coins matter because they represent time spent earning them, ordinary equipment because obtaining it took days of decisions and survival, and a familiar NPC because the relationship accumulated through repeated encounters rather than being invented for the current prompt.

Risk matters for the same reason. The storyteller must not protect accumulated progress merely because losing it would be inconvenient. If the campaign permits serious injury, theft or death, reckless choices may destroy things that genuinely took time to obtain. Consequences follow the fiction and selected campaign risk rather than preserving progression by default.

Duration comes from what happens in the fiction, the campaign's selected pace and supported rules. A brief reply need not acquire an hour-long timer, but a hundred exchanges cannot all be treated as timeless merely because they use Storyteller choices. Every offered in-world action declares its time semantics. Reading choices, navigating menus and waiting for the model do not age the world. Time advances through deliberate accepted commitments, including an explicitly offered wait; it does not run freely while the character has no plan.

Time creates value through effort, opportunity cost and continuity, but it is not the only legitimate cause of change. Walking to another town or sustained practice cannot be replaced by an unearned narrative montage at an unchanged campaign pace. A conversation can establish a relationship, an immediate gift can change possessions, and a supported teleport can change location. Those causes have their own rules and are not exceptions to conceal. The design should make waiting meaningful and legible without declaring all important change inaccessible outside timers.

Unfinished activity is therefore made visible. A player can know that their character is travelling, working, recovering or waiting without receiving fresh prose every minute. Relevant developments can interrupt that activity; if nothing meaningful happens, it finishes quietly and commits its result.

### Ordinary life and Storyteller scenes

The intended rhythm combines sustained activity, narration and developed scenes. Activities carry understood routines over time: resting, studying, travelling, patrolling or something stranger. Supported rules can advance, record results and finish without model calls. Accepted follow-up policies may also narrate completion, describe a selected milestone, continue another activity or open a scene with choices. These are configurable combinations; neither always-narrate nor never-narrate is a universal completion rule. A whole quiet interval remains valid.

Activities can form a coherent itinerary with travel, rest, social downtime and selected narrated stops. Reporting a completed arrival need not interrupt the next permitted step; an interaction that might change that step needs its own continuation rule. Optional events can arise during any eligible leg independently of planned narration. A chain preserves achieved progress and revalidates the remainder after changes, rather than promising that its planned future has happened.

Ordinary life is not limited to following a prepared itinerary. The Storyteller can establish reusable local opportunities, then remain dormant while the player chooses among those it has authorized for the current situation. Fishing, rest or routine social time can repeat without regenerating their rules or menu. The engine never derives new choices from inventory or capabilities. Each new interactive scene offers its activities, carries specific offers forward, or offers none. Carrying an offer forward does not accept it. The player's choice accepts one, as [Pace](../gameplay/time-and-autonomy.md#pace) requires. Reusable definitions do not grant permanent access. See the [prepared-local-life contract](../gameplay/actions-and-commitments.md#prepared-local-life-while-the-storyteller-is-dormant).

The Storyteller also directs the moment-to-moment rhythm within campaign preferences and mechanical authority. A rapid run of narration and choices with no activity menu is as fundamental as hours-long offscreen travel. Short actions consume their admitted durations within that rhythm; no fixed wait per paragraph or automatic reopening of routines is required. See [Storyteller-directed pace](../gameplay/actions-and-commitments.md#storyteller-directed-pace).

Here, activity means a commitment extended over time. Immediate dialogue choices or individual attempts remain actions even when they share the same mechanical policies. A Storyteller turn prepares the next narration and authored possibilities, and many turns can develop the same scene rapidly. There are no chapters in the game model. The same fiction can change resolution detail: an ordinary patrol uses an admitted routine, while a consequential encounter develops through specific decisions, both on the same authoritative character and world state. [Concepts](concepts.md) defines these boundaries.

Unattended life is a sequence of intentions the player selected, such as rest and then a patrol. It is not a mandatory daily timetable, an eight-hour sleep rule, or a universal routine planner. Preparation may involve the Storyteller. Executing a known routine and its permitted transitions needs no inference. Permission to spend on a new scene is separate from permission to continue routine work. A queue, automatic event selection, and an absence policy remain [proposals](../../../work/designs/archive/legacy-initiatives-index/PARKED-2026-11-15.md#bounded-autonomy-and-re-entry), not part of this promise.

This principle is setting-independent. The same foundation should support a fantasy traveller, a Roman soldier, a space merchant, an ordinary modern life, a microorganism or something abstract. The engine records only the state and rules that matter to the current story rather than implementing one universal economy, profession system or biological simulation.
