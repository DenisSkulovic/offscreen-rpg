# Time and autonomy

Simulation time is measured in ticks. A tick is a fixed simulation unit within a campaign; its mapping to fictional duration is independent of playback speed. A real second measures waiting. Pace converts eligible real elapsed time into simulation ticks. The existing implementation does not define a tick as one real second. A one-second countdown refresh can be convenient without becoming a simulation rule. A world's calendar and duration labels are content projections; a microbe or distributed consciousness does not require human calendar concepts.

Every offered in-world action declares its time semantics. Conversation, observation and combat attempts consume their admitted fictional duration even when the presentation is a rapid sequence of choices. Extended activities declare supported progress rules and cadences; productive attempts can earn points, while a literal wait needs no contribution check. Different checks can be due at different boundaries. The runtime may batch quiet ticks or wake at the next meaningful boundary, preserving ordered consequences and interruptions. A check is not required every real second.

The owner clarified deliberate time investment on 2026-09-19. This is the maintained target. Campaign-clock projection now requires the identity of the accepted activity, so empty time cannot accrue merely because no hold exists or become a head start for newly selected work. Terminal/horizon clamping and intent-owned preparation holds remain in T1; short timed actions remain T2. The [committed-time contract](technical/committed-time.md) and its active feature own the correction.

## Pace

Fictional time advances only through an accepted action, activity or eligible entry in an accepted plan. No accepted execution means no time progression, even if the page remains open or the player returns days later. An offered option to wait, rest, observe or spend time idly can authorize progression; the engine cannot silently choose it. A displayed reusable activity menu grants possibilities, not acceptance. An empty menu also grants no permission to tick.

During an accepted quiet interval, fictional time continues without fresh narration and with the browser closed, up to the accepted limit or first stopping boundary. Completion with no accepted successor stops time. Manual pause, a required decision and a blocking system failure stop the affected execution independently. Ongoing life can span real months through successive commitments without a compulsory ending.

Give the player understandable expectations for an action's fictional duration and real wait. Estimates are conditional on the situation remaining unchanged. An interruption replaces the old expectation with the new situation.

A selected pace guides waiting. An option exposes its fictional duration or work estimate and corresponding real wait before acceptance; an atomic short exchange is not automatically free in fictional time. Calendar-based presets require an explicit mapping supplied by content. Pace changes waiting, not how many checks belong to the same fictional interval. Instant play still commits the declared fictional duration and ordered consequences. The [clock contract](technical/story-settings.md) defines rescheduling and locked settings; response deadlines are separate real-time allowances.

For contribution processes, pacing advances only the exact clock position. At a productive boundary, a separately captured D&D check decides how much contribution is earned and whether the completion predicate has been satisfied. A failed, check-only or interrupted boundary may therefore consume fictional time without increasing productive progress, and changing pace cannot manufacture a reward. Any displayed completion time is recalculated from current progress and expected future check results; it is not a deadline or promise.

Changing pace must explain what happens to an existing wait or deadline. The application must not quietly move an imminent deadline while another participant is deciding. Faster play also means potentially more generation per real hour, which spending controls must account for.

### Clock, consequences and narration

A development scheduled for a fictional date follows the game clock. Its estimated real arrival can move when pace changes or the story pauses. A real-time reply allowance is a different promise to the player. Label those expectations distinctly; a fantasy calendar name does not determine how long the player waits.

Separate the clock advancing, supported rules reaching a boundary, and the storyteller producing a development. During a permitted routine, code may apply a known outcome and schedule the next relevant boundary without calling a model. Reaching a condition that needs interpretation can request the storyteller. Neither a clock refresh nor each ordinary state update requires narration, a notification or a new choice screen.

Keep simulation tick position, real-time scheduling and UI refresh cadence separate. Pace maps only accepted execution time to simulation ticks; pause, decision holds and absence of a commitment stop advancement. Rate changes preserve earned progress, including the uncompleted fraction of a tick. Scheduling the next meaningful boundary avoids compulsory per-tick writes or model calls. A duration estimate does not itself prove movement, earned resources or completion.

Choosing is followed by performing the action and presenting its result. Reading options consumes no fictional time. Model latency also has no fictional duration of its own. If a chosen action requires five real seconds at the captured pace and safely prepared narration takes thirty seconds, that action still consumes only its declared fictional duration. Its countdown can finish while the screen says that narration is still being prepared. If narration is ready in two seconds, its outcome and next options remain private until the action completes. Safe overlapping preparation is scoped in the technical contract; activities with intervening outcomes may have to finish before consequence generation starts.

For example, a supported rest interval can advance toward its next needs check while the screen remains unchanged. The check may produce a routine consequence or require a decision. This example does not establish a universal hunger meter or a subsystem for every activity. Arbitrary model-invented routines still need a supported resolution policy or fresh interpretation; quiet-story settings alone cannot make them free.

## Calendars, seasons and story deadlines

Calendar detail is a per-campaign choice. A story can use only elapsed cycles, a defined day count such as “Day 47,” or a named calendar with custom month lengths and an era. None requires a 24-hour day, an Earth year, a planet, or astronomical simulation. Where “day” or “month” affects an accepted action, its definition must exist; prose alone cannot supply executable time units. Calendar rules label simulation positions and translate authored dates into them. Pace only changes the real wait.

Calendar labels and world behavior are separate. Displaying a winter date does not automatically freeze a river or reduce food. A supported scheduled transition can establish winter conditions, change known route eligibility or request a controlling scene. The same rule system can schedule a festival, siege or approaching catastrophe. Stories that need none of those effects pay no maintenance cost for them. Irregular seasons may follow explicit story conditions or scheduled transitions without repeating annually.

A firm promise such as “the invasion begins in two months” needs a recorded origin, calendar interpretation and due simulation position. Two calendar months need not equal sixty days. A prophecy, estimate or unreliable NPC claim may remain uncertain; it must not silently become an exact countdown. Known deadlines can be shown to the player, while hidden developments retain their information boundary.

These deadlines follow deliberate time. Reading, manual pause and model latency do not consume the preparation period; accepted dialogue, travel and training do. Finishing a long activity cannot jump over a due event. A future date alone never starts the world clock or chooses a waiting activity for the player. Real-world expiring events are a distinct policy outside the current solo design.

The [calendar and scheduled-world contract](technical/calendars-and-world-time.md) prepares a bounded implementation: ordinal or simple custom dates, plus consequential scheduled boundaries. Complex astronomy, arbitrary calendar programs and a full climate simulation are unnecessary for this POC. This design is not implemented yet.

## Travel duration and progress

Travel expectations must follow established spatial facts, movement conditions and character capabilities rather than a fresh unconstrained estimate in each passage. Fictional travel duration and the player's real waiting time remain separate: changing presentation pace does not change world distances or physical movement capabilities.

An interruption must preserve the journey's actual progress and establish the resulting situation consistently for every affected character. Elapsed duration is not universally proportional to distance: a route can include stationary waiting, varying terrain or a discrete transition such as a portal. The initial movement/progress rule remains to be designed; do not implement a universal straight-line interpolation merely because it makes animating a map marker easy. Paused real time must not create fictional travel progress.

## Response windows and absence

### Routine execution and event escalation

Design direction, not current runtime coverage: an admitted routine progresses through code, including applicable D&D checks, bounded effects, completion and permitted transitions. Deterministic progress or pure waits need no gratuitous dice. Mechanical settlement does not require generation; an explicit accepted follow-up can still request narration or a scene at completion or a milestone. Quiet configurations use factual summaries. Opening the page or polling progress never implicitly requests generation.

For example, rest followed by patrol can proceed without inference once both entries have supported, accepted mechanics. A patrol contract may cover routine outcomes and known costs within a declared area/risk envelope. It cannot settle arbitrary villains, invent permanent NPCs or resolve unknown tactics without a supported rule or Storyteller interpretation. A check that nominates an unusual development requests a scene; it does not by itself invent that development's facts.

Occurrence policy is separate from productivity and from writing style. Supported checks, meaningful state changes or admitted plot leads may nominate developments. Selection considers relevance, repetition/cooldown, pending events and allowed generation cost. No model call is needed merely to ask whether a model call is needed. Increasing clock speed or polling frequency must not add random opportunities, and starting the same routine again must not reset its event exposure or bypass a cooldown. No event is a valid result; a surprise quota would turn quiet life into compulsory drama.

Before handing off, commit resolved effort/costs and stop incompatible progress at the event boundary. The proposed first solo policy holds that scene's clock during event preparation and a declared response opportunity. If generation is unavailable, hold visibly or apply only an already admitted safe rule; do not narrate the threat away. An optional, not-yet-established story opportunity can be declined without undoing facts, but committed hazards cannot be dropped because generation is inconvenient. Broader continuing-danger and group policies require separate design.

### Bounded plans for absence

The proposed queue is a small sequence of intentions over supported activities, with an explicit horizon or terminal condition and risk/resource limits. Entries are conditional instructions, not promises that future prerequisites will hold. Admission of each next entry rechecks the then-current actor, location, resources, capacity and unresolved decisions. Waiting entries claim no future resources by default. Unsupported or blocked entries stop with a reason unless the player explicitly chose a supported skip/fallback.

An interactive event suspends incompatible queued transitions; the next activity cannot start behind an unresolved fight. After resolution, revalidate remaining intentions and resume only when captured policy permits. A report-only narrated milestone may accompany continued work; it records the earlier boundary if delivered late. Queue completion follows its accepted policy, stopping with no active commitment, entering an admitted next routine or presenting an interaction. It cannot silently invent a new agenda or begin an idle-time allowance. Maximum unattended horizon, reporting, response and spending permissions are separate. Detailed chain admission belongs to the [autonomy plan](features/2026-09-19--00-26--bounded-autonomy-and-reentry/PLAN.md).

A development can request a response by a visible deadline under a supported policy. That countdown begins when valid options are published, never when generation begins. Fiction remains held during deliberation in the solo design. Expiry may select only a pre-authorized default and then execute its ordinary time/cost contract once; it cannot grant the action's result retroactively. Without an eligible default, retain the hold. The first POC uses indefinite decisions; timed default selection remains a separate autonomy phase.

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

## Existing narrative rehearsal adapter

The legacy narrative-only rehearsal maps a proposed interval to twenty real seconds and leaves immediate conversation at zero duration. Test composition can inject a shorter wait. It remains an isolated existing adapter, not the target time policy for mechanical campaigns. The committed-time feature must not add this timer on top of the mechanical clock.

## Mechanical activities

Five game hours of work can produce five hourly checks and earned outcomes; twenty game hours of travel can produce twenty encounter checks, all quiet. These checks run in code without hourly inference. Activity cadence is a rule/content choice, not a universal tick for conversation or combat. See [game rules](game-rules.md) and [segment execution](technical/rules-and-activities.md). Faster or instant play preserves costs, dice and decision boundaries.
