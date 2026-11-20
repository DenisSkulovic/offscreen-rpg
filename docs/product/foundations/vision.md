# A character with a life of their own

Offscreen RPG is a story that unfolds over time. You create a character, become familiar with their habits and relationships, and occasionally influence what happens next. Ordinary life and dramatic events both matter. The story can be quiet, funny, strange, dangerous or tragic.

The intended experience includes a character with a life, and it still names the possibility of inviting friends into a shared story. On 2026-11-18 the owner ratified the first tested playability milestone as solo. The small-party ambition stays a distant, unscheduled aspiration. It is not cancelled, not implemented, and not required before that solo proof. Shared decision and pause rules remain [proposed](../../../work/designs/open/shared-play/README.md).

## What this page selects

Selected promises on this page are earned time, player consent, D&D-style rules, a Storyteller that does not impose one preferred pace, sparse continuity, world neutrality, and risk where the campaign permits loss. The first tested playability milestone is solo. The small-group ambition is a distant later aspiration, not this page's first-playable obligation, and its live acceptance stays Proposed/Blocked. The sponsored allowance later in this page is illustrative. It is not a spend authorization. A general delegated choice is not accepted. A personality that acts overnight without that consent is a later aspiration, not a rule.

Participation is on your terms. Watch a journey in the browser, give the character a general intention, respond briefly to a message, or leave during a quiet interval the player already accepted. Leaving the page does not authorize a new choice. The accepted rule is in [time and autonomy](../gameplay/time-and-autonomy.md): no accepted execution means no fictional time, and a timed fallback applies only to a decision the player pre-authorized. A general delegated-decision policy remains [proposed](../../../work/changes/archive/2026-11/experience/2026-11-13--gm-delegated-decision/CHANGE.md), not accepted. One owner-enabled harmless invitation is the archived exception. A Chamber timed-default fixture is a developer test, not this player rule. Where a campaign has an authorized pause, that pause stops progression within its declared scope. A character who acts from personality overnight is a long-term aspiration, and only after that specific consent exists.

## The D&D foundation

The storyteller is the dungeon master. D&D-style character abilities, skill checks, dice and recorded consequences are fundamental across work, fishing, travel and combat, not optional narrative decoration. Start with the explicit [POC rules subset](../gameplay/rules.md); full edition fidelity and combat depth are separate scope decisions.

## Scene history and alternate continuities

**Selected long-term product promise (owner clarification, 2026-11-19):** Every committed narrative scene is a durable historical checkpoint with sufficient versioned authoritative game state to revisit it as it was and initiate an **independent fork from any committed scene**. The journal/book is a navigable, faithful history, not merely a prose transcript; a fork continues from that scene's own character state, capabilities, meaningful possessions or resources, relationships/world facts, fictional time, commitments and other applicable mechanical truth. It must never inherit later changes from the parent timeline. An inventory is recorded where meaningful to that world, not mandated in a microbe or abstract setting. Scene-specific creative settings and rendered/source assets must remain associated with their original publication as appropriate for faithful review.

This is the **eventual experience target**, not a statement that current POC implements historical state reconstruction, replay or arbitrary scene forking. A historical checkpoint must be internally consistent; never fabricate a fork by mixing an old passage with a newer character/item ledger. A branch is a separate continuation, and reading history does not replay dice, call a provider, spend resources or change live game time. Storage representation, atomic boundary, migration compatibility and pending-task/timer semantics need their own technical design before implementation. See [journal](../experience/return-and-journal.md) and [fork lifecycle](../../technical/engine/lifecycle-and-compatibility.md#forked-continuities).

## The storyteller

A storyteller is a player-selected creative profile realized by reusable application logic, selected context and task-specific model generation. It shapes scenes, choices, judgments and developments; it is not necessarily one agent or one model. Profiles are data, while application rules retain authority over time, permissions and committed consequences. Different styles can shape tone, dramatic rhythm and unpredictability. In editable campaigns, players can switch and customize these presets during play using [typed settings, tags and guidance](../storyteller/profiles-and-settings.md); locked campaigns preserve their declared commitments. Someone you met days ago or an object you gave away can become important again.

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

The first tested playability milestone is one solo protagonist in one authored setting. Create an account, start a story from a premise, select basic storytelling and pace preferences, and play alone. Follow a scene, choose an intention, leave during an already accepted quiet interval, receive a development, and respond. Pause and return to a coherent chronology. The browser is the main interface, with one notification channel to bring the player back. That proof does not require a map, a party, a world economy, or unbounded NPC autonomy.

An invited friend who controls their own character is outside this milestone. That small party remains a distant later aspiration in [proposed shared play](../../../work/designs/open/shared-play/README.md). It is not cancelled and not implemented. Simultaneous consent cases stay Proposed in [the consent and resolution matrix](../../../work/designs/open/shared-play/CONSENT-AND-RESOLUTION-MATRIX.md#matrix). The concrete solo story is the [harbor and return walkthrough](../gameplay/acceptance-scenarios.md#first-solo-acceptance-walkthrough--harbor-and-return). It is an authored target, not a logged run, and not a rights clearance. It does not make the harbor the only world the product may later offer. The short obligation list stays [what the first playable build should demonstrate](../gameplay/acceptance-scenarios.md#what-the-first-playable-build-should-demonstrate). The wizard and goblin scenes are a later stress vignette.

This target needs a small relevant world and a reliable story, not a grid map, dedicated work/travel/trade systems or a simulated population. Richer imagery, saved custom storytellers and deeper messaging interaction can grow from the first experience. Separate party adventures and elaborate world simulation are outside this scope.

## Larger shared worlds

The first tested playability milestone is solo, as [First playable target](#first-playable-target) states. A small cooperative party in one story is a distant later aspiration, not the next obligation and not a cancelled idea. Thousands of players across independent stories, and eventually a world with roughly a hundred participants, come only after that party if it is ever ratified. They are not demonstrated capacity. The exact live acceptance for the small party stays Proposed/Blocked. Larger worlds need independent scenes, limited pause authority and explicit absence rules; increasing a player-count setting cannot supply those behaviors.

## Why build it

This section is the portfolio purpose. It does not authorize provider spend, and it does not change the [pace rule](../gameplay/time-and-autonomy.md#pace). This is both a game we want to play and a senior fullstack portfolio project. A small, convincing experience should demonstrate thoughtful abstraction, persistent state, background execution, model orchestration, context management and cost control.

The delivery goal is a hosted, playable link from a CV or portfolio. A visitor should quickly experience a scene, make a meaningful choice and see persistent offscreen progression; inspecting GitHub is optional. Provide a short demonstration path without making the visitor wait ten minutes for their first interesting result. Keep longer real-time play available separately. A bounded sponsored AI trial is a later target, with an illustrative allowance around $2 rather than a settled entitlement or authorization to spend.

The first proof of concept should let us create a character, experience ordinary life, encounter a development, intervene with a choice, and return to a coherent continuation. An unanswered decision stays open until the player returns. A later timed fallback may close one only when the player already authorized it. A character who chooses from personality without that authorization remains the later aspiration in the participation rule above. That gives us something real to play before expanding it.

## Earned life

The defining experience is not simply that an AI tells a story slowly. Time, persistence and consequence make the character's life feel earned.

An action that should take meaningful fictional effort can require meaningful real elapsed time. A character walking across a region may genuinely be travelling for hours while the player is elsewhere. A work shift may occupy part of an evening. Recovering, studying, earning money, building trust or waiting for an opportunity may unfold over days.

Completion is authoritative. Starting an eight-hour journey does not mean the character has already arrived. Beginning a shift does not immediately grant its pay. An estimated reward is not owned until the relevant activity actually reaches its valid completion or consequence.

This creates value from otherwise modest things. A few coins can matter because they represent real time spent earning them. Ordinary equipment can matter because obtaining it required several days of decisions and survival. A familiar NPC can matter because the relationship accumulated through repeated encounters rather than being invented for the current prompt.

Risk matters for the same reason. The storyteller must not protect accumulated progress merely because losing it would be inconvenient. If the campaign permits serious injury, theft or death, reckless choices may destroy things that genuinely took time to obtain. Consequences should follow the fiction and selected campaign risk rather than preserve a player's progression by default.

Duration comes from what happens in the fiction, the campaign's selected pace and supported rules. A brief reply need not acquire an hour-long timer, but a hundred exchanges cannot all be treated as timeless merely because they use Storyteller choices. Every offered in-world action declares its time semantics. Reading choices, navigating menus and waiting for the model do not themselves age the world. Time advances through deliberate accepted commitments, including an explicitly offered wait; it does not run freely while the character has no plan.

The important distinction is between **instant narration** and **earned progression**. An ordinary chat interface can declare a journey completed immediately; Offscreen RPG should preserve the cost, elapsed time, state and uncertainty between intention and outcome.

The game should therefore make unfinished activity visible. A player can know that their character is travelling, working, recovering or waiting without receiving fresh prose every minute. Relevant developments can interrupt that activity. If nothing meaningful happens, the activity can finish quietly and commit its result.

### Ordinary life and Storyteller scenes

The intended rhythm combines sustained activity, narration and developed scenes. Activities carry understood routines over time: resting, studying, travelling, patrolling or something stranger. Supported rules can advance, record results and finish without model calls. Accepted follow-up policies may also narrate completion, describe a selected milestone, continue another activity or open a scene with choices. These are configurable combinations; neither always-narrate nor never-narrate is a universal completion rule. A whole quiet interval remains valid.

Activities can form a coherent itinerary with travel, rest, social downtime and selected narrated stops. Reporting a completed arrival need not interrupt the next permitted step; an interaction that might change that step needs its own continuation rule. Optional events can arise during any eligible leg independently of planned narration. A chain preserves achieved progress and revalidates the remainder after changes, rather than promising that its planned future has happened.

Ordinary life is not limited to following a prepared itinerary. The Storyteller can establish reusable local opportunities, then remain dormant while the player chooses among those it has authorized for the current situation. Fishing, rest or routine social time can repeat without regenerating their rules or menu. The engine never derives new choices from inventory or capabilities. Each new interactive scene offers its activities, carries specific offers forward, or offers none. Carrying an offer forward does not accept it. The player's choice accepts one, as [Pace](../gameplay/time-and-autonomy.md#pace) requires. Reusable definitions do not grant permanent access. See the [prepared-local-life contract](../gameplay/actions-and-commitments.md#prepared-local-life-while-the-storyteller-is-dormant).

The Storyteller also directs the moment-to-moment rhythm within campaign preferences and mechanical authority. A rapid run of narration and choices with no activity menu is as fundamental as hours-long offscreen travel. Short actions consume their admitted durations within that rhythm; no fixed wait per paragraph or automatic reopening of routines is required. See [Storyteller-directed pace](../gameplay/actions-and-commitments.md#storyteller-directed-pace).

Here, activity means a commitment extended over time. Immediate dialogue choices or individual attempts remain actions even when they share the same mechanical policies. A Storyteller turn prepares the next narration and authored possibilities; many turns can develop the same scene rapidly. There are no chapters in the game model. The same fiction can change resolution detail: an ordinary patrol uses an admitted routine, while a consequential encounter develops through specific decisions. Both use the same authoritative character and world state. [Concepts](concepts.md) defines these boundaries.

Unattended life is a sequence of intentions the player selected, such as rest and then a patrol. It is not a mandatory daily timetable, an eight-hour sleep rule, or a universal routine planner. Preparation may involve the Storyteller. Executing a known routine and its permitted transitions needs no inference. Permission to spend on a new scene is separate from permission to continue routine work. A queue, automatic event selection, and an absence policy remain [proposals](../../../work/designs/open/legacy-initiatives-index/PARKED-2026-11-15.md#bounded-autonomy-and-re-entry), not part of this promise.

Time creates value through effort, opportunity cost and continuity. Walking to another town or sustained practice cannot be replaced by an unearned narrative montage at an unchanged campaign pace. However, a conversation can establish a relationship, an immediate gift can change possessions, and a supported teleport can change location. Those are legitimate causes with their own rules, not exceptions to conceal. The design should make waiting meaningful and legible without declaring all important change inaccessible outside timers.

This principle is setting-independent. The same foundation should support a fantasy traveller, a Roman soldier, a space merchant, an ordinary modern life, a microorganism or something abstract. The engine records only the state and rules that matter to the current story rather than implementing one universal economy, profession system or biological simulation.
