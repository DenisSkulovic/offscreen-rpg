# Player experience

The player follows a character's life through scenes, choices and periods of waiting. Opening the website should feel like returning to a situation, not administering a simulation.

The public `/demo` route is an authored browser prototype of that experience: a quiet interval, choices, immediate consequences, another interval, a conclusion and an inspectable chronology. It needs no sign-in or provider. Demonstration time advances manually; Pause disables interaction until Resume, and refreshing starts over. These controls explore presentation, not the production rules for time or absence. The script is separate from the scene component, and neither defines authoritative gameplay state.

## Arriving and returning

A new visitor should quickly understand the promise: create a character, choose a storytelling direction, and receive developments over time. A representative scene with a choice can communicate this better than a catalogue of features.

OAuth provides a quick route to an account. Returning users enter a Stories space showing their stories and an obvious way to create another. Each story should be recognizable by its premise and current situation, with an indication of whether it needs attention, is progressing, is paused or has ended. These are useful descriptions, not yet a prescribed set of database statuses.

For an empty account, lead directly toward story creation. Whether a visitor can draft a premise before signing in is an onboarding detail to test; require an account before saving a playable story and spending its generation budget.

## Inside a story

The main view centers on the current scene: evocative presentation, concise narration, the character's situation and the interaction currently available. During a journey it might say, “Crossing the mountains; expected to reach the pass by evening, about five minutes from now.” Estimates can change when circumstances change.

An illustration can establish atmosphere. It need not be regenerated for every sentence or choice, and a delayed image must not block play. Possessions, character details and earlier passages should be accessible without competing with the current scene. A map is not required to understand every setting or journey.

A later map experiment may offer a rotatable uniform cube grid, selection to inspect known places, and destination selection to request travel. A layer selector or cutaway could expose underground cells. Selecting a destination proposes movement through the applicable rules; it does not instantly relocate the character. The map should respect character knowledge rather than reveal hidden locations by default. A regional map plus one local level is a possibility, not a requirement, and worlds with abstract spatial rules may need another presentation. This experiment is deferred while the main application flow is connected.

The chronology contains what happened, including autonomous choices. It helps someone understand how they reached the current situation. Returning after a long absence should offer a focused recap and then make any current decision clear; it should not require reading every quiet interval.

### Reading a long life

A month of ordinary life should remain enjoyable to revisit without becoming hundreds of equally prominent cards. Offer the detailed chronology underneath a shorter narrative overview. Quiet accomplishments, relationships and routines can matter as much as dramatic danger; significance is not a measure of violence or surprise.

Use a focused recap and searchable history linked to people, places, commitments and original passages. A passing acquaintance or ordinary purchase may become important later; later relevance can change what a recap includes without rewriting what happened. Do not discard ordinary entries because they initially seem unimportant, or require every mechanical update to become prose.

There are no chapters or chapter boundaries in the experience. A continuous conversation can contain many rapid decisions, and quiet life can continue without a literary transition. Internal summary segments serve storage and retrieval only. See [concepts](concepts.md) for Storyteller turns, scenes, decision points and passages.

## Acting and waiting

At a meaningful decision, present a small set of distinct contextual options. They can include cautious, direct, strange or deliberately inactive responses when those make sense. There is no required universal number of choices.

Selecting an option commits an intention. Show that it was received; do not leave an apparently clickable choice while its result is being prepared. Some consequences follow immediately, while others begin an interval during which the player can leave. Authenticated live stories at `/play/:id` now show a saved journey wait against the server deadline, including Pause/Resume when the interval is controllable. Reloading does not restart that wait.

Agency between offered decisions needs deliberate limits. The player should understand whether they can change course now, and what doing so means. The POC uses pre-generated contextual options, with no free-text gameplay intervention; premise and storytelling direction remain text during setup. Neither repeated clicks nor reloading should produce free rerolls, duplicate actions or endless regeneration of suggestions. Rate limits can protect resources, but must not disguise whether a meaningful action is available.

Quiet time is a valid experience. We should not manufacture choices merely because the player keeps the browser open. Pause, current progress and the expectation for the next update should remain understandable.

Affordability is part of the intended experience, not an invisible implementation concern. A routine must not wake paid research or memory agents on every check. Narrative spending has explicit limits independent of game speed. If the next necessary Storyteller turn cannot be funded, preserve committed results and explain the hold; do not silently buy a larger model, invent a substitute outcome or choose for the player. Already authorized quiet work follows its existing continuation/hold rules. Optional literary reports or memory maintenance may be deferred without pretending they happened. These controls are prepared work in the [bounded-cost feature](features/2026-09-19--19-08--bounded-storyteller-cost/FEATURE.md), not a claim of measured live affordability.

Account profiles can permit different models, working-context sizes and usage windows. Players can choose lower personal/story spending limits; a paid tier does not override those choices. Show what limit is binding, what remains reserved/available and when capacity may return, if known. Default behavior holds the affected story when a required turn cannot run, then requires explicit Resume after recovery. Waiting for quota earns no catch-up progress and never clears manual pause. Optional reporting can wait while permitted quiet play continues. On-demand overage is off unless separately consented to and capped; no silent switch from included quota to extra charges. Saved history remains readable even when the account's working context is small. See [usage policy](technical/usage-policy.md) for the prepared contract.

The proposed activity/scene rhythm makes quiet life playable without displaying every mechanical detail. During a routine, show the intention, meaningful progress, conditional time estimate, known risk and relevant stop/change controls. Routine results can accumulate in a compact factual log without new generated prose. An event brings a developed scene and contextual choices to the foreground; a minor failed check need not summon the Storyteller.

Chains should read like intentions for a journey or part of a life, with selected narrated moments rather than a required narrative screen between every step. Activity outcomes may request narration, continue, or open a choice according to accepted policy. Explain whether a passage is a report that allows the itinerary to continue or an interaction awaiting a response. Do not require the player to click through a purely descriptive arrival merely to start already permitted rest.

For absence, a small plan such as “rest, then patrol until the chosen limit” should explain its horizon and interruption policy before commitment. It is neither a guaranteed future nor an obligation to manage an hourly calendar. Returning should show completed work, actual costs/results, unfinished intentions and any current decision. A factual return summary can be free of inference; generated literary recaps are a separate, explicitly budgeted option. These are proposed experience requirements, not implemented queue controls.

## Playing with friends

A creator can invite friends into a shared story, with each player controlling their own character. The group experiences a common developing situation. A choice should make clear whose character it concerns; controlling one character does not authorize controlling another.

The first shared experience should keep the party in a common storyline. Separate simultaneous adventures would multiply context and coordination before we have established the basic experience. How simultaneous intentions are collected and resolved remains a focused design question.

## Notifications

Notifications bring the story back into the player's day. Distinguish a report from a request for a decision, show the response deadline when relevant, and open the current situation. A late notification must not imply that a resolved decision remains available.

The first playable target includes one way to receive updates away from the story page. The channel is unchosen. A full messaging interface with embedded choices can follow if the first channel only links back to the browser. Notification frequency and quiet hours should not silently change how dangerous or autonomous the story is.
