# Multiple suspended commitments

Status: Approved as the next architectural evolution by the owner on 2026-09-19. Implementation is deferred until the next work session. Live inference remains unauthorized.

## Intended outcome

A character may leave unfinished work without the engine pretending that the work vanished. They can start activity A, suspend it, perform activity B, and later return to A with its earned progress and history intact when the world still permits resumption.

This replaces the current single-active-activity shortcut. `campaign.activeActivityId` currently conflates the activity receiving clock advancement, the commitment occupying a capacity, and the only unfinished activity worth retaining. Those concerns must become explicit rather than multiplying special cases around one pointer.

## Player contract

- Starting another incompatible activity suspends earlier work; it does not implicitly abandon it.
- Suspended work retains its identity, rule-owned progress, rolls, captured terms and interruption history.
- Only running work earns clock or process progress. Suspension itself never completes work.
- Resumption rechecks current prerequisites and reacquires the required capacity. It does not assume that the world remained unchanged.
- A process can become temporarily blocked or permanently invalidated by admitted world changes.
- Abandonment is an explicit player decision or an explicit irreversible rule consequence.
- Progress decay, spoilage and loss are process-specific rules. The generic lifecycle never invents them.
- The player can inspect unfinished commitments and understand which one is active, suspended, blocked, invalidated or complete.

## Representative flow

Mara earns 3/9 beacon repair, then suspends it. She starts a separate errand, completes or suspends that errand, returns to the beacon and attempts to resume. If the beacon, tools and access still satisfy the captured rule, the original repair continues at 3/9. If circumstances changed, the game explains the blocking or invalidating fact and offers only admitted responses. It never creates a new zero-progress repair under the same fiction.

## Architecture boundaries

- Persist many commitments per campaign; identify the currently running commitment separately.
- Represent capacity claims explicitly enough to prevent incompatible simultaneous work without assuming one universal humanoid body model.
- Keep lifecycle state separate from process-specific progress and from current opportunity presentation.
- Fence resume/suspend/abandon commands by story, activity identity and activity revision.
- Schedule only the currently running activity. Stale wakeups for suspended or superseded revisions are harmless.
- Preserve the existing opaque public-offer/private-plan authority boundary.
- Do not implement autonomous activity selection, multiplayer arbitration, universal calendars or every process family in this evolution.

## Acceptance

- Start A, earn nonzero progress, suspend A, start B, then resume the same A record at exactly its saved progress.
- B does not overwrite A's terms, rolls, estimates or completion effects.
- Two activities cannot simultaneously own the same exclusive capacity.
- A stale wakeup or stale resume command cannot advance or reactivate the wrong revision.
- Explicit abandonment prevents later resume and grants no completion reward.
- Invalid prerequisites produce a legible blocked/invalidated result rather than silent restart.
- Completion and rewards remain exactly once for each independent commitment.
- Reload and worker restart preserve the commitment collection and currently running identity.

## Owning specifications

[Game rules](../../game-rules.md), [time and autonomy](../../time-and-autonomy.md), [rules and activities](../../technical/rules-and-activities.md), [earned-time playable loop](../2026-09-19--00-26--earned-time-playable-loop/FEATURE.md), and [activity processes](../2026-09-18--16-48--activity-processes-and-progress/FEATURE.md).
