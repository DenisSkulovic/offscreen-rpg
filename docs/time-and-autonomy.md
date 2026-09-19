# Time and autonomy

Simulation time is measured in ticks. A tick is an ordered unit of progression, not an hour, a second, a narration beat or an LLM call. Real elapsed time determines how quickly eligible ticks advance under the selected pace. A world's calendar and duration labels are optional content projections over ticks; a microbe or distributed consciousness does not require human calendar concepts.

Extended activities declare supported progress rules and cadences in ticks; immediate actions need no artificial duration. Different checks can be due at different boundaries. The runtime may batch quiet ticks or wake at the next meaningful boundary, but must preserve ordered consequences and stop affected work at an interruption. Choosing an efficient scheduler does not change the simulation's time model.

## Pace

Fictional time normally continues during an active quiet interval, even when no new passage or choice appears. The character need not leave a familiar place for this to be meaningful. An ongoing life can span real months without a compulsory narrative ending. Manual pause, a declared decision hold or a system blocker can stop progression; simply not producing new prose does not.

Give the player understandable expectations for an action's fictional duration and real wait. Estimates are conditional on the situation remaining unchanged. An interruption replaces the old expectation with the new situation.

A selected pace should guide waiting, but a single multiplier is not sufficient to specify the entire experience. Immediate exchanges, long quiet stretches and response deadlines serve different purposes. Without a content-defined calendar, controls express ticks per real duration, plus instant resolution to the next meaningful boundary. Calendar-based presets require an explicit mapping supplied by the content. These alter waiting, not the number or fairness of mechanical checks. The [clock contract](technical/story-settings.md) defines current-activity rescheduling, narrative wait boundaries and locked settings.

For contribution processes, pacing advances only the exact clock position. At a productive boundary, a separately captured D&D check decides how much contribution is earned and whether the completion predicate has been satisfied. A failed, check-only or interrupted boundary may therefore consume fictional time without increasing productive progress, and changing pace cannot manufacture a reward. Any displayed completion time is recalculated from current progress and expected future check results; it is not a deadline or promise.

Changing pace must explain what happens to an existing wait or deadline. The application must not quietly move an imminent deadline while another participant is deciding. Faster play also means potentially more generation per real hour, which spending controls must account for.

### Clock, consequences and narration

A development scheduled for a fictional date follows the game clock. Its estimated real arrival can move when pace changes or the story pauses. A real-time reply allowance is a different promise to the player. Label those expectations distinctly; a fantasy calendar name does not determine how long the player waits.

Separate the clock advancing, supported rules reaching a boundary, and the storyteller producing a development. During a permitted routine, code may apply a known outcome and schedule the next relevant boundary without calling a model. Reaching a condition that needs interpretation can request the storyteller. Neither a clock refresh nor each ordinary state update requires narration, a notification or a new choice screen.

There is no universal real-time tick frequency. Keep simulation tick position, real-time scheduling and UI refresh cadence separate. Pace maps real elapsed time to simulation ticks; pause and decision holds stop advancement. Rate changes preserve earned progress, including the uncompleted fraction of a tick. Scheduling the next meaningful tick boundary avoids compulsory per-tick writes or model calls. A duration estimate does not itself prove movement, earned resources or completion.

For example, a supported rest interval can advance toward its next needs check while the screen remains unchanged. The check may produce a routine consequence or require a decision. This example does not establish a universal hunger meter or a subsystem for every activity. Arbitrary model-invented routines still need a supported resolution policy or fresh interpretation; quiet-story settings alone cannot make them free.

## Travel duration and progress

Travel expectations must follow established spatial facts, movement conditions and character capabilities rather than a fresh unconstrained estimate in each passage. Fictional travel duration and the player's real waiting time remain separate: changing presentation pace does not change world distances or physical movement capabilities.

An interruption must preserve the journey's actual progress and establish the resulting situation consistently for every affected character. Elapsed duration is not universally proportional to distance: a route can include stationary waiting, varying terrain or a discrete transition such as a portal. The initial movement/progress rule remains to be designed; do not implement a universal straight-line interpolation merely because it makes animating a map marker easy. Paused real time must not create fictional travel progress.

## Response windows and absence

### Routine execution and event escalation

Design direction, not current runtime coverage: an admitted routine progresses through code, including applicable D&D checks, bounded effects, ordinary completion and transitions already authorized by the player. Deterministic progress or pure waits need no gratuitous dice. Quiet summaries use recorded facts and templates; opening the page, checking progress or starting the next admitted routine must not implicitly request generation.

For example, rest followed by patrol can proceed without inference once both entries have supported, accepted mechanics. A patrol contract may cover routine outcomes and known costs within a declared area/risk envelope. It cannot settle arbitrary villains, invent permanent NPCs or resolve unknown tactics without a supported rule or Storyteller interpretation. A check that nominates an unusual development requests a scene; it does not by itself invent that development's facts.

Occurrence policy is separate from productivity and from writing style. Supported checks, meaningful state changes or admitted plot leads may nominate developments. Selection considers relevance, repetition/cooldown, pending events and allowed generation cost. No model call is needed merely to ask whether a model call is needed. Increasing clock speed or polling frequency must not add random opportunities, and starting the same routine again must not reset its event exposure or bypass a cooldown. No event is a valid result; a surprise quota would turn quiet life into compulsory drama.

Before handing off, commit resolved effort/costs and stop incompatible progress at the event boundary. The proposed first solo policy holds that scene's clock during event preparation and a declared response opportunity. If generation is unavailable, hold visibly or apply only an already admitted safe rule; do not narrate the threat away. An optional, not-yet-established story opportunity can be declined without undoing facts, but committed hazards cannot be dropped because generation is inconvenient. Broader continuing-danger and group policies require separate design.

### Bounded plans for absence

The proposed queue is a small sequence of intentions over supported activities, with an explicit horizon or terminal condition and risk/resource limits. Entries are conditional instructions, not promises that future prerequisites will hold. Admission of each next entry rechecks the then-current actor, location, resources, capacity and unresolved decisions. Waiting entries claim no future resources by default. Unsupported or blocked entries stop with a reason unless the player explicitly chose a supported skip/fallback.

An event suspends incompatible queued transitions; the next activity cannot start behind an unresolved fight. After resolution, revalidate remaining intentions and resume only when captured policy permits. Queue completion produces a quiet recap and an explained idle state or an explicitly admitted continuing routine. It does not synthesize a new agenda. Maximum unattended horizon, response policy and permission for new generation are independent settings. Detailed queue admission and recovery belong to the [autonomy plan](features/2026-09-19--00-26--bounded-autonomy-and-reentry/PLAN.md).

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

## Local storyteller POC policy

New profiled stories use an explicit quick-play policy: a proposed fictional interval takes twenty real seconds, while immediate conversation stays immediate. Test composition can inject a shorter duration. The profile cannot alter this policy. No fresh generation or autonomous choice is admitted during absence; an already prepared interval can publish once and then wait for the player. This bounded local POC policy does not settle the later campaign pace/autonomy controls.

## Mechanical activities

Five game hours of work can produce five hourly checks and earned outcomes; twenty game hours of travel can produce twenty encounter checks, all quiet. These checks run in code without hourly inference. Activity cadence is a rule/content choice, not a universal tick for conversation or combat. See [game rules](game-rules.md) and [segment execution](technical/rules-and-activities.md). Faster or instant play preserves costs, dice and decision boundaries.
