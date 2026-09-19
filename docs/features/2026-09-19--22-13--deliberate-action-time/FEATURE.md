# Deliberate action time and bounded progression

Status: T1 explicit clock permission and durable preparation holds are implemented. T2 finite action duration and T3 bounded overlap remain.
Approval: The owner requested deliberate time investment, time-bearing story choices, held decisions and careful handling of model latency on 2026-09-19. Five seconds, thirty minutes and timed defaults are illustrations rather than mandatory global values. Codex is preparing design here; no runtime rewrite is included in this pass.

## Intended outcome

The player knows what time a choice costs. A conversation or confrontation advances fictional chronology through selected actions, while reading choices does not. An accepted activity can progress while the player is away. With no commitment, the world waits. Storyteller-controlled options remain the only source of new gameplay intentions, including deliberately waiting.

## Representative flow

The Storyteller offers a careful search taking thirty fictional minutes, estimated at five real seconds at this campaign's pace. The player can read indefinitely, then select it. The accepted execution consumes that duration exactly once. If safe preparation finishes after two seconds, the result remains private until completion. If it takes thirty seconds, the clock stops after the five-second action and the screen separately explains that narration is still pending. Reloading or retrying does not repeat time, dice or effects. Published options hold until the next selection.

A subsequent conversation consumes its own shorter admitted durations. An interrupted repair gains no labor during it, although the world clock advances. Finishing a finite activity or chain without a successor stops progression. Waiting in the tavern for four hours requires an authored option and acceptance.

## Scope and boundaries

Includes one accepted-execution clock gate, explicit action time contracts, short action settlement, independent execution/presentation readiness, a bounded safe-overlap path, minimal status/countdown display, history/diagnostics and manual QA maintenance. Preserve contribution rules, retained commitments, authored access, accepted chains, exact arithmetic and bounded provider accounting.

The recommended unit convention retains stable simulation ticks and treats one-second countdown updates as presentation. Pace maps real wait into simulation progression. It does not redefine an action's fictional length when speed changes. This explains the current code and avoids conflating a scheduler heartbeat with check cadence.

The first solo default remains indefinite choice. Timed authored defaults have a defined integration contract but implementation stays with bounded autonomy. Full combat, shared worlds, general cancellable atomic actions and speculative generation across unresolved activity outcomes are excluded. Existing narrative rehearsal remains a separate adapter. No live calls are authorized.

## Acceptance

- A sequence of ordinary dialogue/observation actions records positive, meaningful fictional durations without charging reading/model time.
- No accepted execution means zero elapsed fictional time, including empty menus, completed queues and offline returns.
- Long activity contribution and literal waiting retain distinct completion rules and one shared campaign clock.
- A five-second finite action correctly handles early, late, invalid and duplicate narration delivery; no result becomes current early and no elapsed-time charge repeats.
- A suspended activity earns no work while another accepted action advances world time.
- Pause, pace changes, retries and restart preserve exact progress, receipt identity and independent holds.
- Current options disclose timing, and logs/history distinguish acceptance, elapsed work, settled result and pending narration.
- The [technical acceptance traces](../../technical/committed-time.md#worked-traces-and-acceptance-checklist) can be reproduced offline. Human play must still assess whether scene rhythm feels good.

## Decisions still needed

No additional product approval is required to prepare or implement the requested deliberate-time correction. Choose content-specific durations and granularity within the implementation fixtures; do not mistake them for universal settings. Future deadline defaults and general interruption retain their own scope decisions.

## Owning specifications

- [Time and autonomy](../../time-and-autonomy.md)
- [Gameplay concepts](../../concepts.md)
- [Committed-time contract](../../technical/committed-time.md)
- [Tick units and arithmetic](../../technical/ticks-and-tags.md)
- [Solo integration](../../technical/solo-gameplay-contract.md)
