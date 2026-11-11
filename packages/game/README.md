# Game: deterministic mechanics

`@offscreen/game` owns **pure mechanical policy**, not database transactions, Temporal scheduling, UI or Storyteller inference. Start from [product game rules](../../docs/game-rules.md) and the [technical rules-and-activities contract](../../docs/technical/rules-and-activities.md) before proposing behavioral changes.

## Find the owning rule

| Question | Source | Key boundary |
| --- | --- | --- |
| What character facts, abilities and quantities exist? | [state.ts](src/state.ts) | Typed state, not persistence |
| Which immediate plans are valid, available and resolvable? | [immediate-actions.ts](src/immediate-actions.ts) | `validateImmediateActionProposal`, `immediateActionAvailable`, `resolveImmediateAction` |
| Who calculates checks and dice? | [checks.ts](src/checks.ts) | Supplied deterministic draw; model cannot pick outcomes |
| How are effects represented/applied? | [effects.ts](src/effects.ts) | Pure outcome policy; application admits committed transitions |
| What are offers and local opportunities? | [offers.ts](src/offers.ts), [opportunities.ts](src/opportunities.ts) | Private plan authority and public choices remain distinct |
| How do contribution/waiting processes advance? | [activities.ts](src/activities.ts) | Eligibility, occurrences, boundaries, process progress; no scheduler |
| How does time accumulate and display? | [time.ts](src/time.ts), [calendar.ts](src/calendar.ts) | Exact fictional seconds versus calendar projections |
| When are world obligations due? | [world-obligations.ts](src/world-obligations.ts) | Typed conditions/events, not autonomous simulation |

## Where policy becomes gameplay

[Application action admission](../application/src/campaign/actions.ts), [action executions](../application/src/campaign/action-executions.ts) and [activities](../application/src/campaign/activities.ts) own SQL/state transitions and deduplication. [Committed time](../../docs/technical/committed-time.md) and [solo gameplay](../../docs/technical/solo-gameplay-contract.md) own cross-cutting semantics. Do not add storage or model transport here to solve an application issue.

The package defines `build`, `typecheck`, `test`. The [tests](test/) cover clocks, immediate offers, obligations and contributions; fixture success does **not** certify general arbitrary-world playability. Inspect the relevant script before running it, and add nonhuman counterexamples when assumptions require them.
