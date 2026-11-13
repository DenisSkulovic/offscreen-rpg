# A player's intention through the entire engine | causal trace review

**Status:** source-grounded architectural investigation, not a claim of an executed test or discovered production bug. **Source:** `main@a313d0aad9ba6bee5a06d83d534abba5037a4c29`, 2026-11-13. **Product benchmark:** begin repair, spend real time, encounter stranger, choose a response, later resume saved work. Follow original [vision](../../vision.md), [time rules](../../time-and-autonomy.md), [harbor playthrough](../../technical/playthroughs/harbor-session.md), and [target engine](../target-engine.md).

## What is actually implemented conceptually

```text
player action + immutable operation ID
  → one owner-scoped story-row lock / SQL transaction
  → current revision, offer and action eligibility
  → chosen admitted action + command receipt + outbox
  → temporal wake/Activity
  → story-row lock again, exact permitted time/check/effect settlement
  → committed receipt + possible Storyteller generation intent
  → bounded model execution/uncertainty
  → optionally staged immutable narrative objects
  → short publication lock verifies version/receipt/source and commits root/passage
  → viewer-scoped read model, optional cache and invalidation hint
```

**Verdict:** this is a serious causal foundation. Rewrite only where the product needs a different kind of result, or a measured concurrency/operational failure justifies a new implementation. The architecture already distinguishes acceptance, mechanical settlement and publication. Preserve that separation.

## 1. Player action admission

[`campaign/actions.ts:62–139`](../../../packages/application/src/campaign/actions.ts) parses an action command, locks the owner-scoped story row, checks existing receipt/identity, fences story revision, controls competing generation, verifies current offer ID and finds an authorized private action plan. It branches to resume at :202–271, start process at :272–395, or finite action at :396–488.

**Good:** source-authoritative offer, immutable duplicate identity, actor eligibility for the existing solo character, revalidated retained activity identity and transactional command + outbox. The current design doesn't rely on the browser to grant rewards.

**Pressure:** that one command path must know plan sequencing, active work suspension, time, world obligations, pending future resolution, narration preparation, event receipts and scheduling. This is currently one coherent transaction, not automatically a bad 'God function'; however every new world capability could increase its conditional fan-out. **Test the change surface before reorganizing it.**

## 2. Progress settlement and interruption

[`campaign/activities.ts:226–575`](../../../packages/application/src/campaign/activities.ts) computes eligible elapsed time and iterates up to 24 mechanical boundaries per transaction, preserving partial progress. It makes a controlling world obligation own equality at a shared boundary (:302–309), records rolls/effects, and only later finalizes quiet/report/scene follow-ups. [`campaign/clock.ts`](../../../packages/application/src/campaign/clock.ts) allows advancement only under the matching accepted action/activity identity and no controlling hold.

**Good:** failed work can spend time without earning progress. Interruption can preserve previous contribution. Quiet facts don't require a paid story passage every check. The 24-boundary cap is a transaction safety limit, not a product horizon.

**Open proof:** at 25+ due boundaries, a crash/retry/hold must never skip, multiply or reorder one check. Test exact-before, exact-at and exact-after a controlling obligation. Check both the settled `gameSecond` and the legitimately projected fractional clock.

## 3. Early outcome preparation

[`campaign/actions.ts:396–455`](../../../packages/application/src/campaign/actions.ts) may compute/freeze a future finite result before its accepted duration finishes and capture a pending Storyteller task. [`campaign/action-overlap.ts`](../../../packages/application/src/campaign/action-overlap.ts) hashes character, story facts and game time. [`campaign/action-execution-transition.ts`](../../../packages/application/src/campaign/action-execution-transition.ts) rechecks this digest and may use the saved future result when the time arrives. [`storyteller/publication.ts:263–296`](../../../packages/application/src/storyteller/publication.ts) requires a settled matching receipt before publishing a previously prepared passage.

**Good:** the player cannot receive actual work/reward merely because narrative prediction was computed. Source digest is a real guard, not blind optimism.

**Hard limit:** the digest covers character, story facts and time. It does not prove independence from every future rule family (unique inventory, another actor's action, position, relation, weather, target survival, hidden private event). The present solo policy excludes many such overlaps. **Do not make early preparation the default when new world capabilities are added.** See [prediction-fence decision](../decisions/prediction-dependency-fences.md).

## 4. Context capture under a write lock

[`campaign/narration.ts:57–159`](../../../packages/application/src/campaign/narration.ts) calls `loadStorytellerContext(tx)` during a pending action's admission. [`storyteller/context.ts:100–265`](../../../packages/application/src/storyteller/context.ts) can read passages via `readPassageDocument`, then load pinned canonical knowledge/document sections through the supplied store, all inside the same transaction. The parent caller already holds `lockOwnedStory ... FOR UPDATE`. [PostgreSQL's locking semantics](https://www.postgresql.org/docs/current/explicit-locking.html) mean conflicting writers to that story row wait until the transaction ends.

**Real architecture exposure:** object-store/network latency and history volume can inflate the lock's critical section and make unrelated accepted commands queue behind it. Not a proven present bottleneck with the local store. **Do not remove the lock by merely moving unversioned reads outside:** the admitted task must capture exact current source/actor/time/permissions. See [context capture decision](../decisions/context-capture-and-locks.md).

## 5. Candidate generation and source publication

[`storyteller/execution.ts`](../../../packages/application/src/storyteller/execution.ts) distinguishes scripted and provider paths; provider request review, reserved/dispatched/uncertain charges and an immutable attempt identity are nontrivial. [`storyteller/publication.ts:101–154`](../../../packages/application/src/storyteller/publication.ts) stages immutable documents *before* the final transaction; :201–303 rechecks owner, current revision and root/receipt; :409–490 publishes content and authorized next plans through one locked commit. Old report publication is separately historical (:212–248).

**Good:** model output is a candidate, not a committed mechanical fact. A failed provider generation can preserve already committed state. A staged object whose SQL root never commits is just an orphan, not accidental canon.

**Tension:** task context, narrative source manifest and SQL mechanical truth must form one coherent **captured generation snapshot**. If an older model output remains textually plausible but mechanically stale, correct disposition is stale/review/repair under bounded policy, not to publish it anyway. Objects stored outside SQL need reachability, verification, backups and garbage collection.

## 6. Read and return

[`stories/reads.ts:360–598`](../../../packages/application/src/stories/reads.ts) reads the current passage and campaign projection inside a read-only repeatable-read transaction and caches by snapshot identity. [`campaign/reads.ts:63–156`](../../../packages/application/src/campaign/reads.ts) selects all `gameActivity` rows for a story (then later filters to running/paused/etc), plus separately bounded 20/100-event sets. [`storyteller/context.ts:125–138`](../../../packages/application/src/storyteller/context.ts) queries all passages within an active-scene range when such a scope exists; the later context schema caps evidence, so unbounded query size can first become a validation/availability problem. Those are concrete structural read-growth risks.

**Design:** a story's full immutable chronology must not be reloaded for every current-state GET or per-action Storyteller preparation. Current active commitments, recent facts and history index each deserve a bounded read contract. See [read-growth analysis](read-growth-and-availability.md).

## What the “one valid action” structure already buys us

- One operation ID can be reused across HTTP and worker retries, without a new roll.
- Retained work can have one stable activity ID and real earned progress.
- Time has a source of permission separate from wall-clock passage.
- A staged narrative and committed mechanical receipt have distinct states.
- A late report cannot automatically replace the current scene.
- A public hint does not itself grant new actions.
- Pure game transitions can be checked without provider access.

Those are *substantial architectural assets*, not leftovers to discard.

## Differential fault matrix for the next connected tests

| Deliberate race/fault | Expected product behavior | Test authority |
| --- | --- | --- |
| Two same-body commands race | One admitted operation, same receipt/result on retry | PostgreSQL transaction + HTTP |
| Same ID, different body | Conflict, no second result | PostgreSQL |
| Pause vs check at exact boundary | Rule-defined ordering, one progress event, no elapsed donation | Pure test + SQL transaction |
| World obligation at same boundary as completion | One controlling event or finished action according to explicit priority; no both by accident | Pure + SQL |
| Early prepared outcome vs later target item transfer | Target relevant dependency changes → precomputed future no longer authoritative | Future capability + SQL |
| Provider request reaches remote, response lost | Usage uncertain, no blind second paid request | Fake provider/attempt ledger |
| Publication CAS root changes during staging | Stale/conflict, no root/passage partial commit | CAS + PostgreSQL |
| Object store stalls while second action wants story lock | Bounded lock wait with capture/materialization redesign | Instrumented connected test |
| 400 stored commitments including completed history | Current Now still reads bounded, correct active subset | EXPLAIN + DTO |
| Long scene contains 40+ passages | Request either scopes content deliberately or gives precise truncation/continuation policy; no surprise O(N) loader | Context builder + corpus |
| Replica B reads a hash staged by replica A | Source bytes present, verified, private visibility preserved | Multi-replica object store |
| Worker version changes during long activity | Same admitted rule/receipt, no workflow nondeterminism | Temporal replay/deploy test |

## Architecture direction, not a code patch

**Maintain the current causal skeleton.** Targeted changes should make the *product's future possibilities* composable: typed world capabilities, source-fenced off-lock context preparation, explicit speculative dependencies, bounded reads, per-actor permissions and eventual group time. Avoid a rewrite that replaces known good locks and receipts with implicit model or process authority.
