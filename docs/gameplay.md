# How a story could unfold

Use [Gameplay and Storyteller concepts](concepts.md) for the domain vocabulary. The Storyteller prepares a **turn**; the player receives narration and, when interaction is needed, a **decision point**. Multiple turns can share a scene and the same game-clock tick. Activities occupy eligible time. No chapters, literary boundaries or fixed turn durations are implied.

The working approach is one generic progression flow. Walking, noticing a tower, making an agreement, spending an afternoon somewhere and meeting a stranger can all become moments in the same chronology. We do not need a dedicated software system for each verb. This overview connects the product; the [playthrough](playthroughs.md) shows it from the players' perspective.

## From intention to continuation

The storyteller receives the current situation, relevant memories, character capabilities and campaign settings. It offers contextual intentions and can prepare reusable local activities. Supported rules adjudicate a selected attempt and commit its checks and effects; narration follows only when the accepted policy calls for it. Timed activities resolve at meaningful game-time boundaries, not through one unconstrained prose prediction.

Time passes. A quiet interval can finish, or a development can interrupt it. The player may respond, delegate or pause; the scope of changing direction between offered choices remains open. A choice can resolve the situation or lead to another stage. Nonresponse uses a permitted character fallback rather than requiring constant attention. In shared play, interacting intentions must resolve into a common, coherent consequence.

One passage might summarize a calm day, while a dangerous encounter unfolds through several moments. Neither narration nor notifications need to happen every tick.

An extended ordinary life is a target playthrough, not filler between mandatory plot twists. The player may repeat a chosen intention, save for equipment, revisit familiar people and observe gradual changes over real days. Resource changes and any supported skill progression must be recorded consistently, but the exact progression rules remain open. Professions and activities are examples of content; they do not each require a dedicated simulation subsystem. The finite testing chamber does not decide the lifetime or dramatic density of the eventual character experience.

Interaction presentation should be able to evolve without redefining story progression. The POC uses single selection from pre-generated contextual options, with no free-text gameplay actions; the set may vary with the situation. Different interaction forms can be considered after this POC, each requiring a clear meaning and validation before becoming supported behavior. Player input expresses an intention; it does not directly supply the resulting world changes.

## Prepared local life while the Storyteller is dormant

On establishing a village or another relevant situation, the Storyteller can prepare a bounded set of opportunities: fish by the lighthouse, spend time in the tavern, gather rumors, or rest. The game validates their supported rules, targets, outcomes, eligibility and wake conditions. The player may then discover, select, repeat or switch among still-valid prepared activities without fresh inference. This is broader than executing a previously accepted queue: choosing what to do next need not summon the Storyteller either. A queue is optional unattended permission over a subset of those opportunities.

The Storyteller authors the available intentions for each situation; the engine does not invent options from inventory, capabilities or physical feasibility. Owning an apple does not add “Eat apple.” Having access to a bed does not require a sleep option. The Storyteller can offer selected routines or no activity entry at all. The engine may filter or reject an authored choice whose conditions fail, but cannot substitute its own choice or expand the menu.

Each new interactive scene explicitly establishes its available choices and whether particular prepared activities remain offered. Earlier local activities do not automatically reappear because an encounter resolved or the character revisited a place. Reusing their definitions saves preparation; it does not confer permission to expose them. Within a still-authorized quiet situation, the player can repeatedly use exactly the Storyteller's prepared opportunities without another call. A supported condition can restore one only within that continuing authorization, not reopen an activity phase on the engine's initiative.

Known activities can end quietly, produce bounded mechanical results or prepared observations, continue accepted work, or request narration under their configured policies. A supported check, milestone, deadline or relevant world change can request a Storyteller wake; it need not wait for activity completion. Wakes are bounded and deduplicated, not model polling to ask whether anything interesting happened. No event is also a valid result.

Routine chitchat does not promise fresh bespoke dialogue, and repeated rumor gathering cannot manufacture unlimited novel lore for free. It can reveal prepared evidence or record a supported quiet outcome. When something genuinely new needs judgment/content, the Storyteller returns with current state and relevant history, prepares a scene or revises local opportunities through validated changes, then can become dormant again. Preparing a place does not mean exhaustively simulating its inhabitants or generating every possible future.

See the [Seyda Neen worked trace](technical/playthroughs/local-opportunities.md) and the [proposed technical opportunity contract](technical/rules-and-activities.md#prepared-local-opportunities-proposed). This direction is not implemented by the current scene-local offer system.

## Storyteller-directed pace

The game must support both narration → choice → narration → choice for a rapid sequence and an offered hours-long activity while the player is elsewhere. They are not a compulsory alternating cycle. In Red Mountain the Storyteller might provide several consecutive interactive scenes with no routine menu; in a quiet Seyda Neen situation it might authorize a broad prepared selection. These are situational choices, not map-name rules or permanent campaign modes.

The Storyteller selects the intended dramatic rhythm within the campaign's preferences, accepted risk and supported mechanics. Scene resolution does not automatically return to activities, and an activity completion does not automatically request a scene. Immediate decisions add no artificial activity/timer; real work and travel retain their admitted time/progress. “Eat apple,” when offered, can be an immediate action rather than an extended activity. Generation latency must be represented honestly, not disguised as fictional waiting; required narration still needs valid generation or explicitly prepared content within budget.

## What the game remembers

- **History:** what actually happened.
- **Current situation:** whereabouts, relevant conditions, relationships, capabilities and possessions.
- **Pending continuation:** what might happen next and under what circumstances.

A planned arrival is not a completed journey. Changing course may invalidate a prepared encounter on the abandoned route. A restart or repeated click must not apply the same outcome twice.

Important people and objects need consistent identity across appearances. Incidental detail can remain prose. Nobody needs an individual record merely because the world implies they exist.

## Judgment and chance

The storyteller judges plausibility, costs and consequences in context. D&D mechanics are a required foundation: character abilities, skill checks, dice and persistent effects determine supported uncertain outcomes. The selected POC subset and visible-roll experience are defined in [game rules](game-rules.md).

Whether an action succeeds and whether an interesting encounter occurs are different questions. Not every mundane action needs a roll. When a roll determines something, its result should constrain the story rather than be ignored or repeatedly rerolled.

The application enforces time, player permissions, relevant quantities and consistent recorded changes. Model judgment can still be wrong, so coherence needs testing as well as basic data validation.

## Possessions and bargains

A compact list may be enough for most possessions. Keep identity for a significant object and a quantity when a choice depends on the count.

The storyteller judges an offer from circumstances: coins, barter, a favor or a gift. No universal price system is necessary. If the player accepts three coins for flour, record the exchange consistently. The price is contextual; what was given and received is remembered.

How much inventory precision is worthwhile remains open. Avoid capacity rules, equipment slots and merchant economies before play needs them.

## Time and interruption

An option can show an approximate fictional duration and real wait. A model can estimate fictional duration, while the application enforces timing. Selected pace, immediate exchanges and response windows need a clear relationship; a single multiplier does not define all three. See [time and autonomy](time-and-autonomy.md).

An incident may offer a response window, then use a personality-influenced default. Some play styles may keep the story running during that window; others may briefly hold the scene. Manual pause remains indefinite.

A message should distinguish what already happened from what the player can still influence. Old buttons must not change a resolved situation.

## Keeping inference affordable

Prepare a short stretch after an intention is selected rather than generating every possible future. Reuse relevant context and prepared content. Waiting, publishing a valid scheduled update and applying an agreed change do not require another model call.

New circumstances may require new judgment. A simpler simulation makes model quality and cost more important. Bound generation and repair attempts, account for discarded plans, and measure costs during quiet and busy periods.

If generation is unavailable or its budget exhausted, use only still-valid prepared content or a supported fallback. Otherwise preserve the situation and explain the interruption. Do not invent progress or silently exceed the budget.

## The first playable experiment

Can this flow support a quiet interval, a surprising interruption, a changed intention and a memorable consequence? Does the player feel agency? Does the story remain coherent after absence, pause or restart? Is its ongoing cost acceptable?

Answer those through play before adding specialized mechanics.

The supporting descriptions cover [creation](story-creation.md), [the player experience](player-experience.md), [storyteller judgment](storytelling.md) and [continuity](continuity-and-consequences.md). Unresolved behavior is collected in [open questions](questions.md), rather than filled in implicitly during implementation.
