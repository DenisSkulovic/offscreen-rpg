# Bounded autonomy and re-entry

Status: Expanded design proposal following the owner's 2026-09-19 brainstorming about quiet activities and selective Storyteller events. Preparation does not authorize implementation, notifications or live inference.
Approval: Design work requested; exact queue, risk, horizon and response policies remain proposed.

## Intended outcome

Let a character's life continue within understood permissions when the browser is closed. A bounded sequence of player-selected routines can progress without generation, while a meaningful event may bring in the Storyteller, request attention and eventually use a permitted captured fallback. Returning distinguishes routine results, delegated choices and what remains influenceable.

Autonomy is not a blanket “AI plays for me” switch. It is a campaign policy over classes of decisions, risk and response windows. Personality may shape a permitted fallback, but cannot expand its authority.

## Representative flow

The player chooses an available rest routine followed by a patrol until a declared horizon. The accepted plan states scope, risk/resource limits, stop conditions and what happens if an event appears. Rest and routine patrol settlement need no fresh inference. At the transition, changed conditions can block patrol; the initial plan is not permission to bypass prerequisites or resolve any imaginable crime. Batman, Gotham and eight hours are illustrations, not hard-coded content or required timings.

A quiet run finishes its planned work and returns a factual recap with no generated passage. Another run nominates a significant development from an occurrence check or relevant state change. The game commits prior work, prevents incompatible queued advancement and records one event request. The Storyteller then develops a scene from those facts under separately permitted generation spending. The request alone does not commit a newly invented villain or attack outcome.

During a guard shift, someone approaches the post while the player is away. The story enters a response window and records a small set of feasible intentions plus an admitted fallback such as call for assistance, observe without escalating, or hold the situation. A notification may report that attention is available, but delivery is not authority.

If the player returns before the deadline, their selected intention wins. If not, the saved permitted fallback commits through the same mechanical path and the shift is resumed, altered or abandoned from that result. A late click cannot replace it. When the player returns afterward, the recap distinguishes the interruption, the autonomous decision, its roll/effects and the current situation.

In a high-risk situation with no permitted fallback, the story holds instead of inventing consent. Manual pause remains different from a response window or system failure.

## Proposed initial policy

Use a bounded ordered list, not an arbitrary branching program or an AI choosing a new agenda. Each entry selects supported admitted terms, an actor/target binding and a stop condition. The plan has an overall horizon, cost/risk limits and an explicit interruption/resumption policy. Until values are chosen, no universal day length, queue count or offline limit is assumed.

Pending entries reserve no resources by default; acquire claims and recheck eligibility when they actually start. Invalid entries stop with a reason unless an explicit supported skip/fallback was captured. Queue exhaustion leaves an explained idle state or a separately authorized continuing routine. Returning to the browser does not itself cancel the plan; editing it cannot undo committed results or reroll event checks.

Keep three permissions separate: execution of accepted routine terms, delegated decisions at a scene, and spending on new generation. A zero-generation allowance can still permit quiet work. If a committed hazard needs interpretation outside supported fallback rules, hold it; do not continue farming rewards through unresolved danger. Optional undeveloped story opportunities may be declined under policy before new facts commit.

The first solo event policy holds the scene's clock at the escalation boundary while content is prepared and during the declared response opportunity. The response allowance begins when valid content/options publish, not when a background request starts. This protects the opportunity while the player is away but means a serious event can stop the remaining overnight plan. That tradeoff must be visible. Continuing danger, human multiplayer and broad unsupervised combat are separate choices.

Events are selected, not compulsory. Independent occurrence cadence and campaign-scoped cooldown/repetition rules prevent every work check becoming drama. A useful scene may be an ordinary relationship, discovery or opportunity, not only a threat. An event may resolve back into the routine or lead into several active scenes; it need not create a chapter or immediately resume queued work.

## Scope and boundaries

Included:

- bounded player-selected routine sequence with conditional start, horizon, limits, stop/edit and revalidation;
- quiet completion/queue transition and factual return summary without generation-task admission;
- code-owned event nomination/selection, deduplicated scene escalation and a clear generation-failure hold;
- solo campaign autonomy policy with a small explicit vocabulary;
- admitted fallback identity and mechanics captured with a response window;
- durable deadline, pause interaction, exactly-once arbitration and late-response rejection;
- truthful current-state and return-recap projection;
- optional notification event contract without choosing an external channel;
- offline cases for permitted fallback, no-authority hold, pause and race at deadline.

Deferred:

- multiplayer voting, companion control, shared-world pause authority and simultaneous scenes;
- broad personality simulation or autonomous long-term goal planning;
- arbitrary schedule graphs, automatic replanning, unlimited repeating queues or a mandatory daily calendar;
- direct decisions from Slack/email/push and a selected delivery provider;
- live-model improvisation at the deadline;
- lethal autonomous decisions unless separately designed and explicitly selected.

Prepared options and fallbacks must be rechecked against current state at resolution. A personality description is never authorization to spend, attack, abandon or accept irreversible risk.

## Acceptance

- The player can explain what classes of decision may proceed without them before the story starts.
- A response window names its deadline and whether fiction is held or continuing.
- Player response versus fallback commits one result under a database-clock authority; duplicates and late responses cannot create a second outcome.
- Pause preserves the remaining opportunity and prevents the fallback from publishing while paused.
- When no fallback is permitted or still valid, the story holds with an understandable reason.
- Returning after absence clearly attributes an autonomous action and exposes its committed consequence.
- An old notification or old tab opens the current story and cannot revive the expired choice.
- Ordinary quiet process advancement needs no autonomous “decision” and no model call.
- A two-entry quiet plan reaches the next routine and finishes without creating any generation task; using a free fake provider alone is insufficient evidence.
- Routine preparation cost, quiet execution, event generation and optional literary recap are distinguishable; zero quiet inference is not a promise of a zero-cost campaign.
- Event nomination, restart, retry, reloading and pace changes cannot duplicate occurrence rolls, scenes, queue transitions or rewards.
- A blocked next entry or event stops incompatible progression and explains what the player must do. Resume rechecks the original remaining intentions rather than generating a new agenda.
- An unavailable/budget-blocked Storyteller neither erases committed danger nor starts a response deadline against unpublished options.
- No external notification service is required to prove the gameplay contract offline.

## Decisions still needed

- Review the proposed bounded list and separate routine/decision/spending permissions; select initial horizon and queue bounds through the small playthrough, not the illustrative eight-hour/day numbers.
- Review the proposed solo hold during generation/response and the first supported captured fallback categories. Later continuous-danger modes must be deliberate.
- Which decisions must always hold for player input in the first release?
- Which first notification channel, if any, follows offline browser acceptance?

## Owning specifications

[Vision](../../vision.md), [playthroughs](../../playthroughs.md), [time and autonomy](../../time-and-autonomy.md), [player experience](../../player-experience.md), [notifications](../../technical/notifications.md), and [earned-time playable loop](../2026-09-19--00-26--earned-time-playable-loop/FEATURE.md).
