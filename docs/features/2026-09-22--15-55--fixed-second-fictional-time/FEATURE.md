# Fixed-second ticks and fictional action time

Status: Implementing
Approval: The owner explicitly required one tick to equal one real second, model-estimated game time, engine-owned conversion and speed-adjustable play on 2026-09-22; on the same date they authorized implementation toward the 10–15-turn POC.

## Intended outcome

Players choose actions described in fictional time and can change how quickly that fiction advances. The Storyteller estimates a conversation, journey or work shift in game seconds or a larger exact duration unit. It never estimates scheduler ticks or wall-clock delay. The engine stores the fictional commitment, derives its real wait from the current speed, and preserves the same fictional result across pause, restart and speed changes.

This is required for the connected POC because the current contract let Luna and Sol call a warehouse shift two or four ticks. A stronger model improved prose but could not repair the unit error.

## Representative flow

Neris is offered a thirty-minute warehouse shift paying six septims. The public choice shows thirty fictional minutes and, at the selected speed of 360 fictional seconds per real-second tick, about five real seconds. Acceptance stores 1,800 fictional seconds and the explicit reward. Each eligible real second advances up to 360 fictional seconds; the worker may batch directly to the next meaningful boundary.

After two real seconds the player pauses. Exactly 720 fictional seconds plus any precise partial-tick remainder are retained. Changing speed to 180 fictional seconds per tick changes the remaining real estimate without rewriting the 1,800-second commitment, its check cadence or reward. Completion applies six septims once. A worker restart or duplicate wake cannot grant more time or coin.

A calendar-free microbe uses the same elapsed game-second coordinate and may present it as local cycles supplied by content. A calendar is optional presentation and never required for duration arithmetic.

## Scope and boundaries

The feature replaces model-visible `durationTicks`, `requiredTicks` and cadence ticks with explicit fictional durations. One scheduler tick is fixed at 1,000 real milliseconds. Speed is fictional seconds per scheduler tick; instant mode keeps the same fictional duration and ordered mechanics while removing the wall wait.

The first phase covers finite actions and clock-wait activities end to end. Contribution cadence, world obligations, accepted-plan horizons and calendar projections move to the same fictional coordinate in the next coherent phase before the feature is complete. Disposable development data may reset; no compatibility decoder is required.

This work preserves one authoritative campaign clock, exact rational partial progress, accepted-execution gating, holds, deterministic boundary ordering, early/late narration rules and exactly-once effects. It does not add a universal calendar, profession system, per-second database writes, model calls per tick or scenario branches in shared runtime code.

The maintained Seyda start may supply explicit local warehouse terms as content after the generic duration contract exists. The engine must not infer wages or human time scales from an action label.

## Acceptance

- Storyteller request and output schemas ask for fictional duration, never ticks or real wait.
- A rate stores fictional seconds per one real-second tick; tick length is not editable.
- A thirty-minute action remains 1,800 fictional seconds at every speed while its real estimate changes from five to ten seconds in the representative speed change.
- Pause/restart/speed changes preserve precise earned fictional time and never replay a boundary or reward.
- Finite actions and clock waits expose fictional duration plus derived real estimate without presenting simulation ticks as game time.
- Instant mode commits the full fictional duration and all intervening ordered mechanics exactly once.
- A provider-free Seyda fixture completes a substantial warehouse shift and adds its admitted septims once.
- A later connected Sol run produces an enjoyable continuation under this contract; that live evidence is separate from implementation acceptance.

## Decisions still needed

Subsecond fictional durations are deferred until a microscopic connected case requires them. Phase one accepts positive whole fictional seconds. Calendar presentation and named duration units compile to seconds before mechanical admission.

## Owning specifications

- [Deliberate time and autonomy](../../time-and-autonomy.md)
- [Tick and tag contracts](../../technical/ticks-and-tags.md#target-one-real-second-tick)
- [Committed action time](../../technical/committed-time.md)
- [Story settings and clock policy](../../technical/story-settings.md#clock-and-speed)
- [Connected generative POC proof](../../engineering/connected-poc-proof.md)
