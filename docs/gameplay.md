# How a story could unfold

The working approach is one generic progression flow. Walking, noticing a tower, making an agreement, spending an afternoon somewhere and meeting a stranger can all become moments in the same chronology. We do not need a dedicated software system for each verb. This overview connects the product; the [playthrough](playthroughs.md) shows it from the players' perspective.

## From intention to continuation

The storyteller receives the current situation, relevant memories, character capabilities and campaign settings. It offers contextual intentions. Supported rules adjudicate a selected attempt and commit its checks and effects; the storyteller narrates those results. Timed activities resolve at meaningful game-time boundaries, not through one unconstrained prose prediction.

Time passes. A quiet interval can finish, or a development can interrupt it. The player may respond, delegate or pause; the scope of changing direction between offered choices remains open. A choice can resolve the situation or lead to another stage. Nonresponse uses a permitted character fallback rather than requiring constant attention. In shared play, interacting intentions must resolve into a common, coherent consequence.

One passage might summarize a calm day, while a dangerous encounter unfolds through several moments. Neither narration nor notifications need to happen every tick.

An extended ordinary life is a target playthrough, not filler between mandatory plot twists. The player may repeat a chosen intention, save for equipment, revisit familiar people and observe gradual changes over real days. Resource changes and any supported skill progression must be recorded consistently, but the exact progression rules remain open. Professions and activities are examples of content; they do not each require a dedicated simulation subsystem. The finite testing chamber does not decide the lifetime or dramatic density of the eventual character experience.

Interaction presentation should be able to evolve without redefining story progression. The POC uses single selection from pre-generated contextual options, with no free-text gameplay actions; the set may vary with the situation. Different interaction forms can be considered after this POC, each requiring a clear meaning and validation before becoming supported behavior. Player input expresses an intention; it does not directly supply the resulting world changes.

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
