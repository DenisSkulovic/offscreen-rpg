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

Chapters are a promising presentation of that overview: unequal stretches grouped around changes in circumstances, goals or relationships. Settling in a town could form a long chapter; a brief escape could form another. Neither a fixed entry count nor every dramatic incident automatically defines a boundary. A return recap can select across chapters while keeping the current situation and any available decision easy to reach.

Treat significance and chapter boundaries as interpretations of recorded history. A passing acquaintance or ordinary purchase may become important later. The current chapter can remain provisional, and later context can change grouping or emphasis without rewriting what happened. Summaries should let the player open their supporting passages. Do not discard ordinary entries merely because they initially seem unimportant, and do not require every mechanical update to become a separate prose entry.

This is a direction for the returning experience, not an implemented chapter engine or a requirement to score every passage. Evaluate it against a long quiet-life example after the first playable chamber; first provide dependable access to the underlying saved history.

## Acting and waiting

At a meaningful decision, present a small set of distinct contextual options. They can include cautious, direct, strange or deliberately inactive responses when those make sense. There is no required universal number of choices.

Selecting an option commits an intention. Show that it was received; do not leave an apparently clickable choice while its result is being prepared. Some consequences follow immediately, while others begin an interval during which the player can leave. Authenticated live stories at `/play/:id` now show a saved journey wait against the server deadline, including Pause/Resume when the interval is controllable. Reloading does not restart that wait.

Agency between offered decisions needs deliberate limits. The player should understand whether they can change course now, and what doing so means. The POC uses pre-generated contextual options, with no free-text gameplay intervention; premise and storytelling direction remain text during setup. Neither repeated clicks nor reloading should produce free rerolls, duplicate actions or endless regeneration of suggestions. Rate limits can protect resources, but must not disguise whether a meaningful action is available.

Quiet time is a valid experience. We should not manufacture choices merely because the player keeps the browser open. Pause, current progress and the expectation for the next update should remain understandable.

## Playing with friends

A creator can invite friends into a shared story, with each player controlling their own character. The group experiences a common developing situation. A choice should make clear whose character it concerns; controlling one character does not authorize controlling another.

The first shared experience should keep the party in a common storyline. Separate simultaneous adventures would multiply context and coordination before we have established the basic experience. How simultaneous intentions are collected and resolved remains a focused design question.

## Notifications

Notifications bring the story back into the player's day. Distinguish a report from a request for a decision, show the response deadline when relevant, and open the current situation. A late notification must not imply that a resolved decision remains available.

The first playable target includes one way to receive updates away from the story page. The channel is unchosen. A full messaging interface with embedded choices can follow if the first channel only links back to the browser. Notification frequency and quiet hours should not silently change how dangerous or autonomous the story is.
