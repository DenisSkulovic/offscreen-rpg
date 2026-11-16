# GM07 | One published-decision opt-in safe fallback V1

**Status:** recommended **first-slice product/authority contract**, 2026-11-15; no code authorized. [GM07 Change](../../../../work/changes/open/2026-11-13--gm-delegated-decision/CHANGE.md) stays Proposed. Long-term ambitions and alternatives: [decision delegation](./decision-delegation.md).

## 1. Make consent tangible, not "AI personality"

**Select one exact already-published, already-admitted, low-stakes fallback option, with opt-in on that particular decision.** The character does not acquire general future permission. A Storyteller style or "cautious" profile never constitutes a consent grant.

**Fixture:** a harmless, public invitation is presented with two options: a player-initiated response and **"Politely decline and stay where you are"** (prevalidated deterministic automatic action, no equipment transfer, currency spend, damage, reputation effect, travel or information leak; e.g. a five-fictional-second reply). The player may enable **"If I don't answer within 20 real minutes, decline this particular invitation"**. No opt-in: indefinite decision hold. This is a small testing contract, not a universal social fallback mechanism.

We choose **per-decision consent** for V1 instead of broad "automatically respond to all invitations" account settings, which introduce a much larger undisclosed scope of delegated authority. Later persistent preferences must be a separate product and capability review. A fallback that is no longer eligible **does nothing and keeps the story held**, even if waiting would be awkward.

The 20-minute window is an actual real-world deadline only for this one fixture and only after the specific decision is **published**. No fictional time accrues during deliberation. If consent is granted partway through the window, the UI must clearly show the **remaining** time, never promise a fresh 20 minutes. To avoid retroactive instant execution, a consent granted at or after the original deadline is rejected; return to a manual choice instead.

## 2. Typed grant and captured decision authority

~~~text
decisionDelegationGrantV1 {
  id: UUID,
  ownerId: ID,
  storyId: UUID,
  actorControlId: ID,
  sourcePassageId: UUID,
  sourceRevision: PositiveInt,
  publishedDecisionId: UUID,
  offerId: UUID,
  fallbackOptionId: UUID, // server-defined exact permitted option
  fallbackClass: 'decline-harmless-invitation.v1',
  capturedOptionPlanSha256: SHA256,
  publishedAt: ServerTimestamp,
  dueAt: ServerTimestamp, // publishedAt + exactly 20 real minutes
  approvedAt: ServerTimestamp,
  approvalOperationId: UUID,
  revision: NonnegativeInt,
  state: 'active'|'revoked'|'consumed'|'expired-held',
  stopReason: SmallEnum|null,
}
~~~

**Authoritative source:** The current *published* decision (`storyPassage` with exact passage/control revision, deadline and validated public/private offer pair), valid current actor, approved safe class and underlying `immediateActionPlan`. The browser only requests permission to use **that** already admitted fallback; it does not supply plan effects, default ID not offered by server, fictional duration, secret target, success or resource transfer. Capture a strict digest of the private fallback plan and read-only public preview in the grant. Never reinterpret player text as new action authority.

If no current campaign decision path can represent a published default with these fields, add the **smallest application-owned authorizing state** in the GM07 packet; do not activate older narrative rehearsal defaults merely because `StorySnapshot.decision` has `dueAt/defaultOptionId` in some flows. The [committed-time contract](../../../../content/rules/srd-5.2.1-subset/time/committed-time.md#decisions-with-deadlines) explicitly says the first solo campaign keeps indefinite decisions, and timed default behavior is only future support.

**Grant command:** authenticated owner/actor uses a distinct idempotent UUID to opt in. Under owner story lock, verify current published offer/option identity, active window and exact harmless-eligibility. A duplicate opt-in with same UUID/body is a no-op, conflicting contents rejected. Revoke is idempotent and only affects a future unconsumed fallback; it cannot undo a committed outcome.

**Publication and deadline:** publish the decision and authoritative due time atomically. Deadline begins at publication, not private candidate generation, provider start, notifications or browser render. Deadline is calculated using **database time** and persisted; no client timer is authoritative. Expiry worker wake is only a hint. Consent is an additional predicate, not an automatic consequence of `dueAt`.

## 3. Exactly-one-action expiry contract

At expiry the scheduler competes with a player response under the **same story lock and captured decision identity**. The first legal accepted action to acquire the lock wins, by server database time and the current state; there is no speculative two-outcome race. Before settling a fallback, require:

1. Current owner/actor control and story/decision revision, offer ID and exact fallback plan digest still match published authority.
2. A live, unrevoked, one-decision grant for this actor and exact offered option is present; published deadline has actually passed; no manual pause or incompatible hold.
3. Option remains **currently eligible** by rule, item/location/capacity/resource/target and world state; it still belongs to the safe permitted class, without nondisclosed material consequences.
4. Another player command or any prior fallback has **not** consumed the offer or action identity; a single immutable source command/receipt linkage remains available.
5. Funds/provider readiness are treated separately: deterministic choice acceptance is legal within existing mechanical policy; later narration obeys current task/cost policy but cannot reroll or reapply this command.

**Execution:** generate one stable operation identity keyed by the published decision + selected fallback option (not a random fresh ID per wake); use normal mechanically admitted action path with normal fictional 5-second duration and zero unapproved cost. Commit grant `consumed`, action admission and public provenance of *delegated* choice atomically under the same authority. The current GM05 event taxonomy may project the ordinary action; attach truthful fallback provenance at the source/receipt level and decide its safe public extension without leaking operator/internal consent rows. If the public event schema cannot convey provenance without an additive compatible field, require that change within GM07 and prove old records still work. **Do not** claim a player explicitly clicked the declined invitation.

**If expiry is invalid:** mark `expired-held` (or equivalent durable reason), keep the controlling decision held, report "The approved default could not be used; your decision is still needed." Never choose a second "best" option or pay a model to improvise. A manual player choice can still proceed if current authority admits it.

**Race priority examples:** a player decision committed before the deadline consumes the offer, fallback no-op; an expiry activity that gets the lock after the deadline may win if no response has committed, even if a player's network request is in transit. Do not advertise a guaranteed grace period that code doesn't enforce. A manual pause/revocation that commits before expiry bars auto choice. A scheduler wake that arrives too early must reschedule/return without acting.

## 4. Review/UX and reversible consequences

Player sees: **"If you don't respond by 20:30, your character may decline this invitation. This is the only action you've approved. You can cancel this permission until it is used."** Render the exact local deadline and correct time-zone conversion; never imply a message/push notification guarantees they saw it. Accessibility: the first fixture must provide a practical indefinite-manual alternative and a clear disable control; no dark-pattern default-on countdown.

After an auto decline, source-backed Journal states "**Your approved absence response declined the invitation**" and points to the underlying accepted operation/time. If no consent: "**Waiting for your response**", no clock advance. If published option disappears: "**Still waiting: your approved default is no longer available**". If provider narration fails after mechanics: "**The decision was made; its description is still being prepared**" without a fresh roll.

The *consent itself is revocable before consumption*, not the accepted past action. Do not take "safe" to mean guaranteed risk-free in later world systems. In this first fixture the actual plan has no reversible economy/health/position effects, so it is narrowly safe by construction.

## 5. Adversarial tests and stop rules

| Case | Falsifiable result |
| --- | --- |
| No grant, Storyteller setting "cautious" | Deadline may be displayed only if valid, but no fallback; indefinite hold |
| Offer privately generated but not published | No expiry starts and no delegated action |
| Grant for exact current fallback, 20m elapsed | One deterministic declined action; 5 fictional seconds only after acceptance; provenance source; grant consumed |
| Player chooses at 19:59 | Normal player action wins; fallback never settles |
| Player command racing expiry | Under same lock one normal operation/receipt/roll maximum |
| Grant revoked, manual pause, owner lost | Expiry has no authority; held, no unapproved progress |
| Offer/scene/actor/plan digest changed; deadline missing | Deny/re-hold, not stale auto response |
| Duplicate wake, worker restart, lost ACK | Same fallback operation ID, no second effect/time/provider spend |
| Unrelated story/user/replayed grant ID | Conflict/denial, no cross-character control |
| Narration/usage failure after selection | No reroll, no new character decision or backdated success |
| Browser tab hidden and notifications muted | Does not alter accepted server deadline/grant (unless player explicitly revoked) |

**No paid model calls** for this fixture; no universal personality ranker; no autoplay, auto-combat, money/item transfer, long-term account setting, party voting, battle parser or notifications. Any inability to distinguish consented published decisions from private generated offers is a **stop**, not a reason to use the UI as authority.

**Ready requires:** owner approves the exact "decline harmless invitation" class and real 20-minute window; current-source/Nest/DB mapping to a published decision and normal mechanical command is verified; provider-free deadline/race tests are specified. Then and only then may Cursor begin [GM07](../../../../work/changes/open/2026-11-13--gm-delegated-decision/CHANGE.md), separately authorized.
