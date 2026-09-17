# Time and autonomy

The story unfolds across two kinds of time: duration inside the fiction and time the player actually waits. A day's journey might occupy several real minutes or hours. A reply to someone standing in front of the character may need to follow immediately.

## Pace

Fictional time normally continues during an active quiet interval, even when no new passage or choice appears. The character need not leave a familiar place for this to be meaningful. An ongoing life can span real months without a compulsory narrative ending. Manual pause, a declared decision hold or a system blocker can stop progression; simply not producing new prose does not.

Give the player understandable expectations for an action's fictional duration and real wait. Estimates are conditional on the situation remaining unchanged. An interruption replaces the old expectation with the new situation.

A selected pace should guide waiting, but a single multiplier is not sufficient to specify the entire experience. Immediate exchanges, long quiet stretches and response deadlines serve different purposes. The exact mapping, bounds and available pace controls are still open; they should be tested against the playthrough rather than inferred from a simulation tick rate.

Changing pace must explain what happens to an existing wait or deadline. The application must not quietly move an imminent deadline while another participant is deciding. Faster play also means potentially more generation per real hour, which spending controls must account for.

### Clock, consequences and narration

A development scheduled for a fictional date follows the game clock. Its estimated real arrival can move when pace changes or the story pauses. A real-time reply allowance is a different promise to the player. Label those expectations distinctly; a fantasy calendar name does not determine how long the player waits.

Separate the clock advancing, supported rules reaching a boundary, and the storyteller producing a development. During a permitted routine, code may apply a known outcome and schedule the next relevant boundary without calling a model. Reaching a condition that needs interpretation can request the storyteller. Neither a clock refresh nor each ordinary state update requires narration, a notification or a new choice screen.

A once-per-second tick is a candidate cadence, not a settled requirement. It may serve display, lightweight simulation or both; those roles need not share the same implementation. Show progress from an authoritative timing anchor and pace, then reconcile with committed state. Scheduling the next meaningful boundary is another option that can preserve continuous elapsed time while doing no per-second database writes or model calls. A duration estimate does not itself prove movement, earned resources or completion.

For example, a supported rest interval can advance toward its next needs check while the screen remains unchanged. The check may produce a routine consequence or require a decision. This example does not establish a universal hunger meter or a subsystem for every activity. Arbitrary model-invented routines still need a supported resolution policy or fresh interpretation; quiet-story settings alone cannot make them free.

## Travel duration and progress

Travel expectations must follow established spatial facts, movement conditions and character capabilities rather than a fresh unconstrained estimate in each passage. Fictional travel duration and the player's real waiting time remain separate: changing presentation pace does not change world distances or physical movement capabilities.

An interruption must preserve the journey's actual progress and establish the resulting situation consistently for every affected character. Elapsed duration is not universally proportional to distance: a route can include stationary waiting, varying terrain or a discrete transition such as a portal. The initial movement/progress rule remains to be designed; do not implement a universal straight-line interpolation merely because it makes animating a map marker easy. Paused real time must not create fictional travel progress.

## Response windows and absence

A development can request a response by a visible deadline. If a player does not answer, a permitted fallback based on the character and situation lets the story continue. Autonomy settings define the kinds of decisions that can be delegated; personality does not override those permissions.

The product must distinguish holding a scene briefly for a choice from explicitly pausing the story. Whether fictional danger continues during a response window needs a clear rule. “Ten minutes to respond” cannot secretly mean that the character dies after two.

Running a story while the browser is closed is part of the target experience. Ordinary waiting should not require repeated model calls. Quiet periods may produce a report rather than many trivial updates. Long absence, budget exhaustion and unsupported autonomous decisions need an explained stopping behavior, not invented progress.

## Pause and resume

When permitted, explicit pause stops progression and decision countdowns within its declared scope. Resume preserves the situation and gives players the remaining opportunity to respond; paused time must not count as missed decisions. A generation already in progress must not publish a consequence that advances a paused story.

Show when a pause request is still being processed. Distinguish manual pause from a story held because generation failed, allowance ran out or no permitted default exists. Fixing a system problem must not silently undo the player's pause. A retry should continue the unresolved situation, not repeat an outcome that already happened.

A solo story can grant pause to its player. A small cooperative party may share a pause policy, but host authority versus group agreement remains an open choice. A larger shared world should normally continue despite one participant being unavailable; leaving the browser is not a request to freeze everyone. Offer supported intentions/defaults or another declared absence policy instead of silently granting invulnerability to an unavailable character.

Keep pause authority, response-window duration, whether that window holds fiction, and permitted defaults separate. Do not derive all four from player count or one multiplayer flag. A campaign exposes a supported combination at entry; arbitrary combinations are not necessarily coherent. A scene hold cannot freeze a shared object for some participants while others continue changing it without an explicit interaction rule. Changing policy must not retroactively shorten an already published response opportunity. Large-world local holds and simultaneous scenes remain outside the first release.

## Notifications and reliability

A notification reports an actual development or an available decision. Delivery can be late or fail; the current story view is authoritative. Following an old notification should show what happened and what can be done now.

Scheduling must survive service restarts. Multiple devices, duplicate deliveries or a choice arriving near its deadline must still produce one coherent result. Quiet hours and notification preferences control contact; if a player also wants less autonomy or a paused story, that must be a separate explicit choice.

## First playable scope

Support a real wait, an immediate continuation, a timed choice with a fallback, manual pause/resume and continuation without an open browser. Define shared decision deadlines and pause permissions before implementing group progression. Defer elaborate per-player calendars and catch-up modes until the basic timing experience is convincing.
