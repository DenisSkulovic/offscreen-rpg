# A character with a life of their own

Offscreen RPG is a story that unfolds over time. You create a character, become familiar with their habits and relationships, and occasionally influence what happens next. Ordinary life and dramatic events both matter. The story can be quiet, funny, strange, dangerous or tragic.

The intended experience includes solo play and inviting friends into a shared story, each controlling their own character. The first playable target includes a small group in a common storyline. Shared decision and pause rules still need to be settled before implementing that behavior.

Participation is on your terms. Watch a journey in the browser, give the character a general intention, respond briefly to a message, or leave them to act according to their personality. While the campaign runs, unanswered choices normally lead to an autonomous response. Where the campaign permits pause, an authorized pause stops progression within its declared scope.

## The D&D foundation

The storyteller is the dungeon master. D&D-style character abilities, skill checks, dice and recorded consequences are fundamental across work, fishing, travel and combat, not optional narrative decoration. Start with the explicit [POC rules subset](game-rules.md); full edition fidelity and combat depth are separate scope decisions.

## The storyteller

A storyteller is a player-selected creative profile realized by reusable application logic, selected context and task-specific model generation. It shapes scenes, choices, judgments and developments; it is not necessarily one agent or one model. Profiles are data, while application rules retain authority over time, permissions and committed consequences. Different styles can shape tone, dramatic rhythm and unpredictability. In editable campaigns, players can switch and customize these presets during play using [typed settings, tags and guidance](storyteller-settings.md); locked campaigns preserve their declared commitments. Someone you met days ago or an object you gave away can become important again.

The world should feel rich without simulating everyone in it. Establish people, places and lore when they matter. Remember consequential facts afterward. A character can disappear from the story for weeks without needing a background schedule of meals and errands.

The fictional world may imply far more people, objects and places than the database explicitly stores. Distinguish implied background, details that actually appeared in a scene, and the smaller set of identities that later correctness depends on. Appearance in prose is not by itself a durable world record. Do not create Farmer Bob because farms exist beyond the hill. If the player forms a relationship with a tavern patron, gives them an object, or later returns looking for them, that specific identity becomes continuity-relevant. A later storyteller should produce one bounded coherent scene or world proposal rather than one agent per NPC, place or faction. The representation of durable people, places and objects is chosen when a concrete gameplay slice needs it; it is not a reason to add a census of unused entities.

Settings and characters should be flexible: fantasy, space, everyday life, unusual creatures or mixtures. The core should not require a specific profession, human body, economy or geography. Creative freedom still needs continuity: established facts and player choices should have weight.

The selected D&D rules can remain richer than a particular character's current form. Applicability belongs to the character and situation: a bodiless consciousness may have no current use for Strength or a humanoid skill, while a later embodied form can gain them through an admitted transformation. Preserve conventional D&D behavior when the world supports it; do not flatten the rules to the smallest common denominator or pretend every rule applies to every form.

## The experience on screen

The browser is a visual, atmospheric place to inhabit the current scene. Show what the character is doing, what they perceive and what they can do next. Quiet moments do not need artificial activity to fill the screen.

Relevant possessions, people and places are available when useful. A focused chronology helps you remember the story and return after a long break. Avoid a spreadsheet of world systems.

A messaging service such as Slack could support brief updates and choices during the day. Notification frequency, storyteller intensity and character autonomy are separate concerns.

## First playable target

Create an account, start a story from a premise, select basic storytelling and pace preferences, and play alone or with an invited friend. Follow a scene, choose an intention, leave during a quiet interval, receive a development and respond or let the character act. Pause and return to a coherent chronology. The browser is the main interface, with one notification channel to bring players back.

This target needs a small relevant world and a reliable story, not a grid map, dedicated work/travel/trade systems or a simulated population. Richer imagery, saved custom storytellers and deeper messaging interaction can grow from the first experience. Separate party adventures and elaborate world simulation are outside this scope.

## Larger shared worlds

Thousands of players across independent stories, and eventually a world with roughly a hundred participants, are future design ambitions. They are not demonstrated capacity or requirements for the first release. Solo play and a small cooperative party come first. Larger worlds need independent scenes, limited pause authority and explicit absence rules; increasing a player-count setting cannot supply those behaviors.

## Why build it

This is both a game we want to play and a senior fullstack portfolio project. A small, convincing experience should demonstrate thoughtful abstraction, persistent state, background execution, model orchestration, context management and cost control.

The delivery goal is a hosted, playable link from a CV or portfolio. A visitor should quickly experience a scene, make a meaningful choice and see persistent offscreen progression; inspecting GitHub is optional. Provide a short demonstration path without making the visitor wait ten minutes for their first interesting result. Keep longer real-time play available separately. A bounded sponsored AI trial is a later target, with an illustrative allowance around $2 rather than a settled entitlement or authorization to spend.

The first proof of concept should let us create a character, experience ordinary life, encounter a development, intervene or let the character choose, and return to a coherent continuation. That gives us something real to play before expanding it.

## Earned life

The defining experience is not simply that an AI tells a story slowly. Time, persistence and consequence make the character's life feel earned.

An action that should take meaningful fictional effort can require meaningful real elapsed time. A character walking across a region may genuinely be travelling for hours while the player is elsewhere. A work shift may occupy part of an evening. Recovering, studying, earning money, building trust or waiting for an opportunity may unfold over days.

Completion is authoritative. Starting an eight-hour journey does not mean the character has already arrived. Beginning a shift does not immediately grant its pay. An estimated reward is not owned until the relevant activity actually reaches its valid completion or consequence.

This creates value from otherwise modest things. A few coins can matter because they represent real time spent earning them. Ordinary equipment can matter because obtaining it required several days of decisions and survival. A familiar NPC can matter because the relationship accumulated through repeated encounters rather than being invented for the current prompt.

Risk matters for the same reason. The storyteller must not protect accumulated progress merely because losing it would be inconvenient. If the campaign permits serious injury, theft or death, reckless choices may destroy things that genuinely took time to obtain. Consequences should follow the fiction and selected campaign risk rather than preserve a player's progression by default.

Real waiting is not mandatory friction. Immediate events remain immediate. A reply in an active conversation should not acquire an artificial hour-long timer. Picking up an object beside the character need not take fifteen minutes merely because the game supports long-running activities. Duration should come from what is happening in the fiction, the campaign's selected pace and supported rules.

The important distinction is between **instant narration** and **earned progression**. An ordinary chat interface can invent the next chapter immediately; Offscreen RPG should preserve the cost, elapsed time, state and uncertainty between intention and outcome.

The game should therefore make unfinished activity visible. A player can know that their character is travelling, working, recovering or waiting without receiving fresh prose every minute. Relevant developments can interrupt that activity. If nothing meaningful happens, the activity can finish quietly and commit its result.

### Ordinary life and Storyteller scenes

The intended rhythm alternates sustained activity with developed scenes. Activities carry understood routines over time: resting, studying, travelling, patrolling or something stranger. Once admitted with supported rules, they advance, record results and finish without fresh model calls. Storyteller scenes develop consequential situations through contextual writing and choices. They may emerge from an activity, a known world change or a player entering an unresolved interaction. Not every roll, failure or completion needs a scene; a whole quiet interval is a valid outcome.

Here, activity means a commitment extended over time. Immediate dialogue choices or individual attempts remain actions even when they share the same mechanical policies. A chapter is a way to organize history, not a scheduling unit. The same fiction can change resolution detail: an ordinary patrol uses an admitted routine, while a consequential encounter opens a scene and resolves specific actions. Both use the same authoritative character and world state.

The owner proposed planning rest followed by patrol as an illustration of unattended life. The direction is bounded player-selected intentions, not a mandatory daily timetable, eight-hour sleep rule or universal routine planner. Preparation may involve the Storyteller; executing known routine rules and permitted transitions should need no inference. Spending authority for a new scene is separate from permission to continue routine work. The queue, event-selection and absence policies remain proposals in [bounded autonomy](features/2026-09-19--00-26--bounded-autonomy-and-reentry/FEATURE.md).

Time creates value through effort, opportunity cost and continuity. Walking to another town or sustained practice cannot be replaced by an unearned narrative montage at an unchanged campaign pace. However, a conversation can establish a relationship, an immediate gift can change possessions, and a supported teleport can change location. Those are legitimate causes with their own rules, not exceptions to conceal. The design should make waiting meaningful and legible without declaring all important change inaccessible outside timers.

This principle is setting-independent. The same foundation should support a fantasy traveller, a Roman soldier, a space merchant, an ordinary modern life, a microorganism or something abstract. The engine records only the state and rules that matter to the current story rather than implementing one universal economy, profession system or biological simulation.
