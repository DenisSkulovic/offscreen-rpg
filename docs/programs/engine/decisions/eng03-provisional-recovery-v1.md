# ENG03 recovery | Provisional status and same-G rearm V1

**Decision:** selected design for review, 2026-11-15. **Runtime status:** not implemented by this document. **Applies to:** already-shipped pending-consequence and committed-action context captures. **No general Storyteller retry, new generation or paid provider attempt is authorized.**

This narrows the two residuals recorded in [ENG03-C1](../../../changes/archive/2026-11/eng/2026-11-14--eng03-committed-action-capture/CHANGE.md). Existing code on main (8b7157f, 2026-11-14) has `storyteller_context_capture.state`, a three-claim ceiling, non-dispatchable provisional `generation.kind=storyteller.context-capture.v1`, and promotion in place to `storyteller.profiled.v1`. It does **not** yet have a safe exhausted-capture operator rearm. The public snapshot presently joins `generation` but does not explicitly discriminate that provisional kind before deriving `canRetry`.

## 1. Two retry systems, two authorities

| Lifecycle | Legal operation | Disallowed operation |
| --- | --- | --- |
| Provisional G, capture awaiting/materializing | Durable `campaignConsequenceTopic` wake and bounded provider-free CAS work | `retryStoryteller`, `storytellerTopic`, player button |
| Provisional G, transient failure, attempts below 3 | Existing bounded materialization retry through the same capture row/operation | New G; fresh accepted action; re-read live prompt facts |
| Provisional G, attempts exhausted or lease expired | Owner-authorized **capture rearm** after inspection; same G, frozen capture hash, same operation | Ordinary generation retry; automatic infinite loop |
| Provisional G, source corruption/mismatch, stale story, interrupted projection or changed receipt | Hold/blocked/stale; investigate or explicitly retire using the existing safe authority path | Rearm stale captured facts, silently regenerate story state |
| Promoted G with valid `storytellerTaskSchema` | Existing Storyteller generation recovery gates, including spend truth | Capture rearm; promotion again; second speculative G |
| Any possibly dispatched/charged/uncertain provider attempt | Existing provider uncertainty, repair or operator escalation policy | Provider-free rearm as a pretext for a second paid send |

`storyteller_context_capture` is a materialization record, not a second game workflow. `story_resolution` and campaign holds retain control. G remains both `generation.id` and `captureId` from Stage 1 onward.

## 2. Read and retry policy

At the **server read boundary**, a resolution whose generation kind is `storyteller.context-capture.v1` is **preparation**, not a valid completed Storyteller task. The public `StorySnapshot.resolution` must:

- Always return `canRetry: false` for provisional G, regardless of speculative failure-code formatting or the story's scripted/provider execution mode. Never label this as a player-retryable model failure.
- Preserve an existing legal public state (`pending` or `blocked` where applicable). Do not add a new public enum or reveal private capture payload, missing CAS keys, provider configuration or internal retry counters in `reason`.
- For an exhausted/held provisional capture, expose only a safe blocker (`kind: generation, recovery: operator`); for in-progress capture use `blocker: null`. This is a **display hint**, not authorization to call an operator endpoint.
- On a transition that changes publicly visible preparation/hold status, invalidate the current story snapshot using the existing `viewVersion`/committed hint or an equivalent already-supported observable update. A stale cache must not keep a now-promoted G in preparation forever.

Use the joined `generation.kind` directly in `packages/application/src/stories/reads.ts`. Do not parse a provisional pointer with `storytellerTaskSchema`. `packages/application/src/storyteller/recovery.ts::retryStoryteller` already restricts to `storytellerKind`; retain that hard enforcement even if a client sends a manually crafted retry request.

Read-model copy must be modest: "Preparing the next development" while active; "Story preparation needs attention" when held. The operator should see a precise sanitized failure code through authenticated administrative diagnostics, not through the player's narrative.

## 3. Explicit operator rearm contract

**Proposed application-private operation:** `rearmContextCapture({actor, storyId, captureId, rearmId, reasonCode})`. It is **not** a player API and is not a generic `retryResolution`. The caller must be a specifically granted, audited internal operator or an owner-authorized local repair tool using the same service policy. First implementation may expose the application service and a test-only caller; **do not** add an Admin button/route without an agreed grant and audit integration.

**Inputs:** authenticated operator identity, scoped story ID, exact capture/G UUID, independent idempotency UUID (`rearmId`), allowlisted reason (`storage-restored` or `transient-infra-recovered`), optional sanitized incident reference. No mutable prompt/body edits. The operator cannot choose a replacement generation, scene, resolution or provider tier.

**Under a short transaction, story lock first**, check all of:

1. Actor has an explicit recovery capability for this environment/story, and the action can be durably attributed. Deny unavailable audit capability rather than performing an unlogged repair.
2. Capture ID, story ID, operation ID, `generation.id`, `storyResolution.generationId`, source passage/revision, owner and controlling hold match. `generation.kind` remains provisional and `generation.state` pending, `attemptId` null, output null. There is no `storyteller_operation`, provider attempt or already promoted executable input for G; if uncertain, **stop**.
3. Capture hash re-parses and matches stored SHA; the immutable source frontier and current story eligibility still satisfy the **same purpose-specific fences** that promotion applies. Do **not** rewrite captured facts to current values. A known missing CAS dependency must have been restored; otherwise the recovery can be rearmed but it must remain blocked before any model dispatch.
4. `storyteller_context_capture.state` is `held` due to exhausted *transient* materialization, or `materializing` with an expired lease and the attempt ceiling reached. A live lease, `ready`, `blocked`, `stale`, permanent schema/size mismatch or an interrupted pending action is ineligible.
5. Materialization attempts are at the declared ceiling (3). A single explicit **rearm epoch** per G is supported in V1, yielding at most three further *provider-free* attempts. Never silently rearm as part of a worker wake.

**Atomic write:** insert a uniquely keyed durable rearm/audit record (`captureId, rearmId, operatorId, previous failure/state/count, reason, timestamp, epoch`); increment the rearm epoch; reset per-epoch `materializationAttempts` to zero; clear failed/expired lease; set state `captured`; enqueue a fresh existing `campaignConsequenceTopic` notice with **the original operation ID**. Preserve G, the immutable capture JSON/hash, `storyResolution`, campaign hold, original receipt/execution and source root. Do not publish `storytellerTopic` until later successful promotion. If the existing Admin audit store can durably prove these fields with uniqueness, reuse it; otherwise add a **small additive recovery audit record**, not a generic audit subsystem. No destructive migration or backfill.

**Idempotency:** same `rearmId` + exact same actor/request returns the already recorded outcome, without another wake or count reset. Same ID with a changed payload conflicts. Racing two distinct rearms on G serialize under the lock: only the first wins; the second cannot exceed the one-epoch cap. A crash after commit is safe because the outbox notice was written atomically. A failed transaction leaves the original hold intact.

**Rearm eligibility is never provider authority.** Revalidate the live effective usage policy at later dispatch. An already promoted or possibly sent task can only use the existing Storyteller recovery system; there is never a second provider call from capture rearm itself.

## 4. Recovery/state matrix to prove

| Case | Expected |
| --- | --- |
| At attempt 1 or 2, CAS transient failure | Same G reuses existing bounded claim; no operator rearm yet |
| Attempt 3, CAS unavailable | Capture held; G provisional; player `canRetry=false`; original hold remains |
| Restored CAS + authorized rearm | Same G, unchanged captured SHA, epoch=1, attempts reset, one materialization notice; promotes once |
| Duplicate `rearmId` and two operator requests | One audit/rearm, one durable wake, no extra epoch |
| Live lease; stale passage/root; changed actor; corrupt source; oversized context | Deny rearm, no hidden rebase or new G |
| Attempts exhausted again in epoch 1 | Held and operator-visible; V1 refuses another automatic or manual epoch |
| CAS fails after promotion, or provider attempt exists/uncertain | Capture rearm denied; use established generation/provider gates |
| Same G eventual publish / old generation without capture | Correct existing publication and legacy replay; no new `storyResolution` |

Use provider-disabled deterministic fixtures and disposable DB only when separately authorized. Prove no DocumentStore call under `story FOR UPDATE` and no provider call anywhere in this Change. A post-rearm real model test is neither needed nor permitted.

## 5. Exact implementation boundaries

**Likely source owners:** `packages/application/src/stories/reads.ts`; `packages/application/src/storyteller/capture-materialization.ts`, `recovery.ts` and `context-capture.ts`; `packages/db/src/schema/storyteller.ts` plus small additive migration only if audit/epoch requires it; narrow trusted service wiring, focused tests and nearest source map. Do not alter `@offscreen/storyteller` public task union, generation attempt accounting, campaign settlement rules, or Admin first-wave contracts.

**Stop and return to design owner if:** operator grant/audit reuse cannot be established without privileged scope expansion, the actual provisional row could already have a provider attempt, the capture hash cannot be verified, or the current SQL row/lease semantics differ. A small residual must not grow into an operator console redesign.

**Ready gate:** latest-source recheck and explicit owner code authorization; [bounded Change](../../../changes/archive/2026-11/eng/2026-11-15--eng03-c1-provisional-recovery/CHANGE.md). No code has been changed here.
