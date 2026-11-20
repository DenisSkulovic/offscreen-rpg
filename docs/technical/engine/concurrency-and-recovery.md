# Engine concurrency and recovery

**Owns:** how a story lock, a capture, an outbox wake and a retry interact so one accepted action has one effect.  
**Selected target:** short capture under the lock, materialization and provider work outside the lock, then a fenced publication. See [selected architecture](selected-architecture.md).  
**Landed subset:** ENG03-C1 provisional recovery, ENG03-C2 interrupted-action capture, and the isolated `change/eng03-short-lock` proofs below. **Full ENG03 is not finished and is not archived.** The packet stays open. `work/QUEUE.md` is none after the TURN02 close.  
**Branch proof (2026-11-20, `change/eng03-short-lock`, disposable SQL, no provider):** player resolution no longer holds the story lock across document reads. A 2000ms injected read left the same-story competitor near 2ms, while the Storyteller document reads themselves still took about 10s. Changing continuity notes during that read conflicts and writes no resolution or generation. Activity narration freezes SQL under the lock, materializes off-lock on one generation, and a drifted receipt publishes as stale. An activity historical report promotes and publishes against frozen source revision 1 after the live story revision is 2. A report whose root was not preserved stays held and the mechanical report row remains. Pending-action lock timing stayed near 20ms at a 2000ms read. World-obligation narration promotes one generation; a matching receipt publishes, and a drifted label becomes stale while the consequence row remains. A world-obligation report commits one row and one generation, and a conflicting source is rejected without replacing that row. Opening checkpoint confirmation was classified only: it re-reads storage inside a transaction without a story row lock, and BOOT03/TURN02 still own that path. `forks.ts:fork` reads the checkpoint before it locks the source story, then refuses the fork if that checkpoint row changed. A 2000ms delayed checkpoint read left the competing writer at about 4ms, against about 36ms with no delay. The branch manifest write still happens after the lock.

**Does not own:** fictional time rules ([chronology](chronology-and-activities.md)) or provider settlement math ([spending](../platform/spending-and-entitlements.md)).

## Before, during, and after the lock

The selected target is still a short capture under the lock, work outside it, and then a fenced publication. C1 and C2 are the landed subset below. They are not the full ENG03 path.

- **Before.** Stage 1 freezes under the story lock in SQL. It does not write the document store or a success receipt.
- **During.** Stage 2 materializes the interrupted receipt off the lock and keeps the same generation.
- **After.** Stage 3 publishes only through the fence. A duplicate prepare keeps one generation and no second success receipt.

An uncertain retry reconciles that generation and receipt. It does not reroll a settled reward, and it does not publish an outdated generation under a new identity. This note adds no transaction algorithm.

## What C1 and C2 actually proved

ENG03-C1-R (2026-11-15, no provider spend) made public snapshots join `generation.kind` with `storyteller_context_capture.state`. A provisional `storyteller.context-capture.v1` always projects `canRetry: false`. A held exhausted provisional projects a safe blocker `{ kind: 'generation', recovery: 'operator' }` with `reason: null`. Migration `0006_eng03_c1r_provisional_recovery` adds `rearm_epoch` and an audit table. Application-private `rearmContextCapture` resets attempts once (epoch 1), enqueues the original `campaign.consequence.v1` wake, and preserves the generation and capture SHA. There is no Admin UI for that rearm.

ENG03-C2 (2026-11-15, no provider spend) added interrupted-action capture beside that path:

1. **Stage 1, under the story lock.** SQL-only freeze. Provisional capture G. Link `campaignConsequence.generationId`. Hold the transfer. Durable wake. No document store under the lock. No `gameActionReceipt` yet.
2. **Stage 2, off the lock.** Materialize an ordinary `task=consequence` with one factual interrupted receipt (`offer: null`, no roll, no effects). Promote the same G.
3. **Stage 3.** Publication fence for the interrupted companion: execution interrupted, event match, absent success receipt, post-interrupt digest.

An injected document-store delay showed Stage 1 hold time does not scale with that delay. Duplicate prepare yields one G and no success receipt.

Evidence: [C1 provisional recovery](../../../evidence/inspections/doc01-retained-observations/programs/engine/evidence/eng03-c1r-provisional-recovery-2026-11-15.md) and [C2 interrupted capture](../../../evidence/inspections/doc01-retained-observations/programs/engine/evidence/eng03-c2-interrupted-capture-2026-11-15.md), plus the archived Changes those notes cite. Those notes are observations. This page is the contract for what they proved.

## Negatives that are already enforced in those slices

- A non-exhausted capture denies rearm (`rearm_ineligible_state`).
- A live lease denies rearm (`lease_live`).
- A duplicate `rearmId` is idempotent. A second distinct epoch after promote conflicts.
- C1 and C2 tests do not call a model provider.
- There is no second speculative success receipt for the same interrupted action identity.

## What is still not done

This Change is closed. It does not include an opening-checkpoint measurement or moving the fork branch-manifest write before the source story lock. An Admin-granted operator rearm endpoint and Control UI remain out of scope. Holding a story lock across a paid model call is still forbidden.

**Negative:** do not describe full short-lock refactor as Done because C1 and C2 passed. Do not describe a synthetic disposable grant or a local Chamber race as production Support authority. A retry of an uncertain provider attempt must reconcile the existing receipt. It must not pay again or advance fictional time because the model was slow.

## Recovery the player can see

Commands, delivery and visible recovery for the solo prototype stay in [authority and transitions](authority-and-transitions.md). This page adds only the capture race: settlement and narration are different fences; an interrupted action can have a factual companion passage without a success receipt; provisional capture is not a retryable player button.

The read-only first response for an uncertain operation is [Uncertain work recovery](../../runbooks/uncertain-work-recovery.md). This page still owns the capture race.
