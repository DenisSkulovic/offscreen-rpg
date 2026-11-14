# Admin technical operations | AI, gameplay, funding, LiveOps and incident truth

**Status:** Selected long-term technical boundary, 2026-11-14; only bounded read surfaces are first-wave candidates. Product owners: [Commercial](../commercial-operations-product.md), [Gameplay](../gameplay-worlds-product.md), [AI Operations](../ai-engineering-operations-product.md), [LiveOps](../live-operations-product.md) and [product acceptance](../product-acceptance-and-scope.md).

## 1. Four distinct operational truth sources

The Admin correlates but does not combine:
- **Commercial authority:** actual offerings/subscriptions/entitlements/grants and customer allowance admissions under selected policy.
- **Game authority:** `story`, campaign, accepted action/execution, fictional time, receipts, published passages, events and canonical documents, with engine validation.
- **Model authority/observations:** admitted generation/task, model round/attempt, input evidence references, proposal status, publication status, tokens and provider expense, subject to privacy.
- **Operations authority:** effective configuration version/eligibility, incidents, rollout assignments, emergency stops and affected cohorts.

An operation may have one or more model rounds; a model round may incur provider cost without publication; a game action may settle while narration remains pending; a stopped rollout cannot undo history.

**Hard invariant:** `storyteller_usage_allocation` or a captured usage policy is **not** a commercial purchase, a subscription ledger, or necessarily a customer-chargeable unit. `story.ownerId` is not automatically payer or multiplayer beneficiary. A customer's fictional money or earned time is never an administrative AI credit.

## 2. Read-only source-backed operating views

| View | Possible current source | Valid truthful statement | Invalid assumption |
| --- | --- | --- | --- |
| Account usage status | `storyteller_funding`, allocations, effective usage policy where present | Verified reservation/settlement/uncertain **technical** window consumption | "Customer has 50 paid turns left" |
| Model/generation status | `generation`, `storyteller_attempt`, `storyteller_publication` as verifiable | Task lifecycle/attempt/publication and limited failure reason | "One model call equals one published turn" |
| Campaign status | `story`, `campaign`, event/publication lineage | Current committed revision, active hold, source coverage | "Narration is canon because model produced it" |
| Provider expense | Source-backed usage/cost events when instrumented | Actual/estimated/unknown with attribution and timestamp | "Unknown is $0" |
| Commercial subscription | **No verified production source in audited API** | Not supported / unavailable in initial Admin | Inferring subscription from account creation or `usagePolicy` |
| Live release exposure | Named current config and task captured versions when instrumented | Effective policy/version for supported work | "Every old campaign uses latest runtime version" |
| Incident response | Cross-linked case/incident evidence from approved source | Source-backed impact, action and outstanding unknowns | "Green API means stories are healthy" |

Operator read endpoints must not run provider inference, complete fictional time or make implicit owner-like commands. Avoid expensive N+1 document reads in dashboard summaries. Never use optional Chamber developer test hooks for production diagnostics.

## 3. Funding and provider dispatch safety seam

Existing [usage windows](../../../packages/application/src/storyteller/window-accounting.ts) reserve multiple platform/account/story windows and track `reserved/dispatched/uncertain` states; [dispatch authority](../../../packages/application/src/storyteller/dispatch-authority.ts) retains captured task permission. A future sponsor stop must align with those owners.

**Expected emergency control** (future, not part of read-only foundation):
1. Authorized incident actor proposes a named stop of **new sponsored provider dispatch** by scope (environment, route, task/offer, payer/sponsor), with reason, expiry/recovery policy and case/incident.
2. Strongly consistent **enforcement** at the authoritative admission/dispatch path, including worker dispatch where fresh external cost may occur. No shortcut based only on UI state, Redis key, dashboard cache or captured historic task policy.
3. Specify behavior for previously admitted work: tasks not yet dispatched may be held before cost; already dispatched uncertain work remains reconciled, and committed mechanical consequences are not erased.
4. Audited state change is verified by a real provider-free test that **zero new dispatches** passed the stop gate; the UI separately reports old in-flight attempts and unknown billing.
5. Safe reversal requires explicit authorized unpause after cause review; cannot silently requeue duplicate paid work.

If the existing dispatch path lacks a strong global decision point or revocation-effective check, a proposed stop button is **not Ready**. The technical seam must be designed/tested first. The current `retainsCapturedAuthority` policy comparison is not by itself proof of an emergency stop.

### Commercial allowance accounting (future)

Offerings, customer entitlements, sponsor grants and commercial usage need an independent authoritative design with stable beneficiaries, revocation/cancellation, reservation/settlement, idempotency and external billing reconciliation. The existing technical provider window ledger can contribute cost evidence but cannot be repurposed as a historical payment record by renaming its rows.

A successful payment-provider acknowledgment cannot automatically prove effective in-game access; a failed model attempt cannot automatically consume a customer allowance unless a separately accepted commercial policy says so.

## 4. Gameplay and story provenance

The Admin's Gameplay reader follows **accepted cause → committed receipt/state → publication visibility**. When an LLM generated a proposal but the app did not publish it, the Admin must not treat that proposal as current player narrative. A historical derived summary is not a canonical source.

For legitimate accepted long-running activities, absence of model calls may be correct. Real time, fictional game time, model latency, usage window time and invoice period are distinct clock concepts.

A future approved repair must call a **domain-specific operation** with expected state version and a bounded, provably safe effect, with audit and participant impact. It cannot patch arbitrary campaign JSON or rewrite a historic receipt. The technical design of repairs cannot be completed until the product owner chooses the supported repair taxonomy and shared-campaign rights.

The existing Chamber supports isolated developer scenarios; an Admin sandbox may reuse a restricted, production-safe boundary only after proving isolation from real stories, credentials, notifications and funding. Do not mount `developerTools: true` on regular production API for this purpose.

## 5. Storyteller/agent diagnostic semantics

Keep identifiers and states separate:
- Player command and admitted world operation.
- Logical Storyteller task and its captured source/version/funding authority.
- Individual model round(s) and evidence reads, if actually instrumented.
- Generated candidate and validation outcome.
- Publication, staleness/blocked result, and current player-visible state.
- Provider cost, technical consumption and commercial allowance.

The current target Storyteller may use bounded evidence reads and optional extra rounds. **Zero investigation rounds is not automatically a defect.** A trace with no evidence of agent steps cannot be prettied into a fictitious agent chain.

Raw prompt/response/documents and hidden strategy remain a separate sensitive access tier. Initial `ai.operation.read` returns redacted status, IDs, measured timing/cost and safe failure class only.

## 6. LiveOps version and migration boundary

A release record must eventually distinguish:
- configuration/proposal source and reviewed version;
- effective target audience and **actual exposure**;
- captured/in-flight work version and committed campaign promises;
- compatible forward-only updates versus opt-in/incompatible migration;
- pause/rollback of future eligibility, not restoration of historical fiction;
- customer notice/participant consent obligations per selected policy.

**Initial phase:** read version/effective state where sources support it; no UI-driven arbitrary prompts, game rules, direct SQL, migrations or bulk experiments. Future activation uses the audited Admin action lifecycle and independent LiveOps permissions, not an unrestricted config editor.

For shared campaigns, the mechanical/risk rule version ordinarily belongs to a shared authoritative campaign, not separately random-assigned conflicting versions per participant.

## 7. Cross-team incident handling

A single incident correlates:
- affected player/campaign/beneficiary where legitimately visible;
- operation and provider cost status;
- release/config/version and environment;
- account/entitlement impact;
- mitigations proposed/authorized/actually enforced;
- remaining in-flight cost uncertainty and customer communication.

**Source of truth stays with each domain.** Incident closure does not mark a provider charge reversed or a corrupted campaign repaired. Command Center displays current incident status subject to permission and freshness. Support may read safe impact summaries without raw model context.

## 8. Verification hazards

- Model request incurred charge, did not publish: technical expense and customer allowance remain distinct.
- A long quiet campaign uses no AI: no false `agent down` alert or invented per-tick charge.
- User's fictional inventory changed by a valid receipt: no Admin write via raw story JSON.
- Hidden passage content appears in `story_public_event` title: redacted before staff projection.
- A stop is activated but one worker has stale config: provider-free integration proves fresh work is blocked at dispatch, not merely UI.
- A release rollback leaves old in-flight task: version lineage is visible and historical receipts unchanged.
- One player is paid but restricted: operational eligibility remains separate from purchase/entitlement.
- Unverified cost total because telemetry is disconnected: `unknown`, not `0`.
- Customer/payer differs from character controller: no inappropriate account/financial access.
- Raw model JSON payload contains someone else's private narrative: `ai.operation.read` must not serialize it.

Until a real source and authoritative verification exist, a dashboard card is an informative placeholder, not an operational guarantee.
