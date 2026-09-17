# Time and autonomy

The story unfolds across two kinds of time: duration inside the fiction and time the player actually waits. A day's journey might occupy several real minutes or hours. A reply to someone standing in front of the character may need to follow immediately.

## Pace

Give the player understandable expectations for an action's fictional duration and real wait. Estimates are conditional on the situation remaining unchanged. An interruption replaces the old expectation with the new situation.

A selected pace should guide waiting, but a single multiplier is not sufficient to specify the entire experience. Immediate exchanges, long quiet stretches and response deadlines serve different purposes. The exact mapping, bounds and available pace controls are still open; they should be tested against the playthrough rather than inferred from a simulation tick rate.

Changing pace must explain what happens to an existing wait or deadline. The application must not quietly move an imminent deadline while another participant is deciding. Faster play also means potentially more generation per real hour, which spending controls must account for.

## Response windows and absence

A development can request a response by a visible deadline. If a player does not answer, a permitted fallback based on the character and situation lets the story continue. Autonomy settings define the kinds of decisions that can be delegated; personality does not override those permissions.

The product must distinguish holding a scene briefly for a choice from explicitly pausing the story. Whether fictional danger continues during a response window needs a clear rule. “Ten minutes to respond” cannot secretly mean that the character dies after two.

Running a story while the browser is closed is part of the target experience. Ordinary waiting should not require repeated model calls. Quiet periods may produce a report rather than many trivial updates. Long absence, budget exhaustion and unsupported autonomous decisions need an explained stopping behavior, not invented progress.

## Pause and resume

Explicit pause stops progression and decision countdowns. Resume preserves the situation and gives players the remaining opportunity to respond; paused time must not count as missed decisions. A generation already in progress must not publish a consequence that advances a paused story.

For shared stories, the authority to pause the whole group and the handling of individual unavailability remain open. A single browser disconnect should not implicitly pause everyone. These rules should be visible to participants rather than hidden in technical behavior.

## Notifications and reliability

A notification reports an actual development or an available decision. Delivery can be late or fail; the current story view is authoritative. Following an old notification should show what happened and what can be done now.

Scheduling must survive service restarts. Multiple devices, duplicate deliveries or a choice arriving near its deadline must still produce one coherent result. Quiet hours and notification preferences control contact; if a player also wants less autonomy or a paused story, that must be a separate explicit choice.

## First playable scope

Support a real wait, an immediate continuation, a timed choice with a fallback, manual pause/resume and continuation without an open browser. Define shared decision deadlines and pause permissions before implementing group progression. Defer elaborate per-player calendars and catch-up modes until the basic timing experience is convincing.
