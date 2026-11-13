# Architecture decision study | predictive outcomes vs causal world change

**Status:** proposed future execution rule, **not code-approved**. Source: [`campaign/actions.ts:396–455`](../../../packages/application/src/campaign/actions.ts), [`action-overlap.ts`](../../../packages/application/src/campaign/action-overlap.ts), [`action-execution-transition.ts`](../../../packages/application/src/campaign/action-execution-transition.ts) and [`storyteller/publication.ts:263–296`](../../../packages/application/src/storyteller/publication.ts), inspected 2026-11-13.

## Product question

Can a player safely take a ten-hour journey, an opponent change the destination after three hours, and the server still use a dice roll and narrative draft it computed immediately at departure?

**Sometimes yes, often no.** The answer depends on whether the future action's *entire relevant read set* was captured and guaranteed not to change before execution. Today's solo benchmark can legitimately know much more than a future interactive world can.

The player's contract is **“my attempt will resolve when earned, under coherent world circumstances,”** not “the model always gets to write the outcome instantly.”

## Observed current optimization

For some finite actions, admission calculates a predicted resolved state and freezes it in `pendingResolution`. The digest in `action-overlap.ts` covers **character, storyFacts, gameSecond**. The selection path checks known intervening world obligations; publication later requires a matching receipt/projected-state digest.

These are serious guards. **They do not constitute a general dependency model for future items, targets, positions, actors, relations, dynamic worlds, or private events.** A digest not including item ownership cannot prove that a planned gift still has the same owner.

## Alternatives worth comparing

| Approach | Advantages | Limits | Recommended use |
| --- | --- | --- | --- |
| **A. Always resolve at the future boundary** | Strongest causal correctness, simple policy, no speculative provider spend | Storyteller response after time may add visible latency | **Default for new, potentially interactive capabilities** |
| **B. Always precompute at admission** | Fast final scene once wait is over; easy POC flow | Stale assumptions, wasted provider calls, possible hidden-result leakage | **Reject as universal engine rule** |
| **C. Explicitly dependency-certified precompute** | Latency optimization when the future result is genuinely independent | More contract/validation work, and not all dependencies are knowable | **Selectively retain for bounded action classes** |

**Selected direction:** A by default, C only for action families whose dependency declaration is complete and whose relevant state is frozen or revalidated. The current POC may retain its guarded optimization as long as its existing source invariants remain valid.

## Four stages, precisely distinguished

1. **Admitted intention:** character undertakes an attempt for stated duration/cost. This is committed immediately.
2. **Optional prepared mechanical candidate:** future RNG/state calculation from a frozen, permitted dependency set. **Not** a settled effect or public fact.
3. **Earned settlement:** after valid elapsed time and all intervening controlling boundaries, revalidate or compute the result and commit one receipt/effects.
4. **Published narration:** source-backed prose and next offered intentions after the receipt; may follow later or be unavailable.

The **Storyteller may prepare prose early**, but the prepared text is a draft tied to the predicted state and remains private until the mechanical outcome is truly committed.

## Future action dependency contract (conceptual, not a schema proposal)

A precomputable action would need:
- exact `actorId`, controlling permission version, action ID and captured rule version;
- target/other-actor IDs and relevant revisions where interacting with them;
- item and resource ownership/availability and **whether they are reserved, consumed or merely checked**;
- source/canon root + relevant rule/world environmental terms;
- start/target fictional time, allowed intervening event categories, scene/time-domain;
- deterministic RNG identity/provenance; no repeat roll under same settled operation;
- explicit failure behavior when any read dependency changes: invalidate prediction, re-evaluate **after** earned time if eligible, or interrupt/hold according to rule.

**Do not implement a universal list of all game facts as the dependency vector.** It makes every unrelated story update invalidate everything, becomes huge at scale, and may still omit a hidden dependency. Start with narrowly specified, recognized capability families.

## Five cases that discriminate the design

| Case | Precompute admissible? | Why |
| --- | --- | --- |
| A quiet solo skill check using only captured stats, with no permitted relevant intervening event | Potentially | Exact rule/state/entropy can be captured |
| Repair with periodic work checks and a known interruption at hour 4 | No single guaranteed final outcome | Intermediate checks and event precedence govern time/progress |
| Give a unique item to a companion who may give it away meanwhile | **No** without reservation or ownership fence | Dynamic shared resource |
| Investigate a stranger who may leave before action completes | Not by default | Target presence/knowledge can change |
| Narrative-only optional recap of a *settled* event | Yes, but as historical report | The input event is already immutable; not a future world prediction |

## Dice timing and player fairness

If dice are pre-drawn but not committed, define whether a cancelled/interrupted attempt ever exposes or consumes them. The pre-POC's immutably frozen result can avoid rerolling after duplicate delivery. However an interrupted action may never reach its settlement boundary; a future attempt may have a different operation identity.

**Never make a user's ability to cancel/restart a supported action a covert way to preview dice results.** If deterministic entropy is generated at admission, keep it private and commit it to the exact relevant operation only when that operation legitimately settles. If invalidated, record that the prediction was voided for audit, not a rewarded die result.

A stronger future policy might derive **per-occurrence RNG identities** from a cryptographically sound stream, but do not introduce custom cryptography merely to replace stored draws. The domain receipt, not the method used to draw, owns the one-time outcome.

## Provider cost and speculation

Preparing narrative early spends provider resources potentially **before** the player has completed the duration. If the player pauses, the target changes, or an encounter interrupts, the draft may be unusable. Therefore:
- prefetch must be budgeted against a specific valid accepted action and captured policy;
- do not auto-retry stale paid drafts;
- optional speculative narration can be disabled under low cost cap;
- separate consumed provider cost from committed gameplay effects;
- measure **speculative cost wasted / accepted action** and saved player-visible wait;
- prefer just-in-time generation when the ratio becomes unacceptable.

The correct optimization goal is **time-to-meaningful-play at justified spend**, not maximum early inference.

## Minimum negative test program

- Same action operation delivered twice, pending result drawn only once.
- Item/target/actor capability changes after admission but before due time; old predicted result never mutates the new world.
- Unknown world event at an intermediate boundary interrupts; final projected scene isn't published.
- Game clock progresses legitimately but worker is late; draw/effect occurs at the correct fictional instant.
- Provider pre-narration finishes, but final source root/receipt differs; text stays private.
- Retry after lost ACK cannot change or reroll the underlying captured result.
- Player pauses before due: no secret reward; no paid re-dispatch due solely to pause.
- No new outcome family enables speculative execution until it declares complete dependencies and version compatibility.

## Decision gate

**Do not implement speculative dependency registries now.** First choose one future capability with actual mutable target state, compare A and C under deterministic fixtures, and decide whether speculative narration produces enough improvement to justify the complexity. Existing validated solo optimization can remain until an incompatible new capability is admitted.
