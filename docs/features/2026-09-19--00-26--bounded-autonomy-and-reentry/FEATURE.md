# Bounded autonomy and re-entry

Status: Draft for owner review. Preparation does not authorize implementation, notifications or live inference.
Approval: Pending.

## Intended outcome

Let a character's life continue within permissions the player understands when the browser is closed. An interruption may request attention, wait for a declared response window and then apply a permitted character fallback exactly once. Returning later shows what the character chose autonomously and what remains influenceable.

Autonomy is not a blanket “AI plays for me” switch. It is a campaign policy over classes of decisions, risk and response windows. Personality may shape a permitted fallback, but cannot expand its authority.

## Representative flow

During a guard shift, someone approaches the post while the player is away. The story enters a response window and records a small set of feasible intentions plus an admitted fallback such as call for assistance, observe without escalating, or hold the situation. A notification may report that attention is available, but delivery is not authority.

If the player returns before the deadline, their selected intention wins. If not, the saved permitted fallback commits through the same mechanical path and the shift is resumed, altered or abandoned from that result. A late click cannot replace it. When the player returns afterward, the recap distinguishes the interruption, the autonomous decision, its roll/effects and the current situation.

In a high-risk situation with no permitted fallback, the story holds instead of inventing consent. Manual pause remains different from a response window or system failure.

## Scope and boundaries

Included:

- solo campaign autonomy policy with a small explicit vocabulary;
- admitted fallback identity and mechanics captured with a response window;
- durable deadline, pause interaction, exactly-once arbitration and late-response rejection;
- truthful current-state and return-recap projection;
- optional notification event contract without choosing an external channel;
- offline cases for permitted fallback, no-authority hold, pause and race at deadline.

Deferred:

- multiplayer voting, companion control, shared-world pause authority and simultaneous scenes;
- broad personality simulation or autonomous long-term goal planning;
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
- No external notification service is required to prove the gameplay contract offline.

## Decisions still needed

- Which initial autonomy vocabulary is understandable: risk tiers, decision categories, explicit per-process fallback, or a narrow combination?
- Does a response window hold fictional danger by default in the solo POC, or may selected cases continue under a separately visible rule?
- Which decisions must always hold for player input in the first release?
- Which first notification channel, if any, follows offline browser acceptance?

## Owning specifications

[Vision](../../vision.md), [playthroughs](../../playthroughs.md), [time and autonomy](../../time-and-autonomy.md), [player experience](../../player-experience.md), [notifications](../../technical/notifications.md), and [earned-time playable loop](../2026-09-19--00-26--earned-time-playable-loop/FEATURE.md).
