# ENG09 | An invalidated item-transfer action must not strand a story

**State:** Proposed, **NOT Ready** until interruption lifecycle policy and exact source route are selected. **Priority:** gameplay correctness follow-up to ENG01; may be implemented independently of ENG08. **Authority:** [post-wave code review](../../engine-architecture/evidence/postwave-implementation-review.md), [time/decision model](../../time-and-autonomy.md), [causal trace](../../engine-architecture/evidence/causal-transition-review.md).

## Core player failure to investigate and close

A valid accepted finite action intended to transfer the compass begins. Before it settles, a legitimate intervening change moves the item elsewhere. When time is due, the engine correctly refuses the transfer and marks the action interrupted **without a roll**. However the prior selectable offer was already consumed, and the inspected `action-executions.ts` interruption branch does not visibly create a new scene/offer for this item-holder mismatch.

**Suspected result:** no `activeActionOperationId`, no receipt and no current valid offer or controlling generation. A character may be stuck staring at an older scene. The current ENG01 SQL test checks the holder and absence of receipt, **not playability on return**.

## First step is a stronger source-backed regression, not code guesswork

For the disposable mid-flight holder-change fixture, inspect and assert:
- canonical `story.revision`, `campaign.offer` and `situationAuthorization` after invalidation;
- current hold owner(s), pending `storyResolution`/`campaignConsequence` and outbox;
- `StorySnapshot.current`, `campaign.actionExecution`, `campaign.actionExecutionEvents` and actual available actions;
- whether a real authorized existing recovery command can restore a playable offer.

If an existing path truly recovers, add the proof and **cancel** implementation. Do not create a fake UI button.

## Desired authoritative outcome

1. At the actual due boundary, commit the explicit **item no longer available** event and elapsed permitted fictional time, with no transfer/roll.
2. The current situation becomes a **source-grounded new decision** or a literal recoverable hold with a real supported recovery path. Player can choose what to try next.
3. A consequential new scene may use the normal Storyteller preparation/cost/hold contract. Never assume the model response succeeded or run unlimited speculative calls.
4. A stale previously offered transfer cannot simply be reauthorized; current item state and actor scope must be rechecked.
5. Duplicate worker delivery cannot regenerate multiple scenes, charge repeatedly, skip time or produce a new item.
6. If Storyteller is unavailable, keep an inspectable interrupted state and truthful recovery, **not** an invisible permanent dead end.

## Why this requires an explicit domain decision

The current `campaignConsequence` machinery appears primarily oriented toward settled receipts, activities and world obligations; item-holder invalidation has an interrupted execution but **no action receipt**. We must decide whether to add an admitted `action-interrupted` consequence source or a comparable existing semantic path. One option is a small source-linked interruption event that authorizes one controlling Storyteller follow-up; another is a general typed blocker/reentry operation. Choose based on actual source semantics, not UI ease.

The first chosen contract must preserve the existing holds/time/rules and old attempts, require no new human player input simply to recover a game-authority failure, and make a new legitimate offer available eventually.

## Acceptance

- The exact SQL mid-flight holder-change fixture returns a **playable** or **explicitly recoverable** result after settlement, not only `actionExecution === null`.
- Missing holder/permission at *admission* still rejects before spending time.
- Failure of a legitimate check does not grant item.
- Later new offer never contains the already invalid/stale transfer unless actively revalidated under a fresh authoring decision.
- Provider failure while preparing the new situation preserves the interrupted event with a bounded retry, no double model charge.
- Duplicate scheduling of same interruption is idempotent.
- A regular planned world-obligation interruption continues to behave as before.

**Not included:** unrestricted NPC theft, generalized free-intent, new frontend navigation, multiple actors, custom item economy or broad event sourcing. No provider cost or live DB mutation without authorization.

## Readiness gate

Run/inspect the current negative integration fixture, settle **one exact authoritatively sourced new-situation/hold transition**, and specify its idempotent identity and Storyteller failure behavior. This remains **NOT Ready** until those details are clear, rather than asking Cursor to invent them during a small feature.
