# ENG09 selected decision | interrupted item action produces one controlling consequence

**Decision selected for owner review, 2026-11-13.** Source-grounded architecture contract, not application code and not paid-provider authorization. **Scope:** the confirmed `item.transfer.v1` holder-mismatch *during an already admitted finite action*. Existing [probe](../evidence/eng09-interruption-playability-probe-2026-11-13.md), [ENG09 Change](../../changes/2026-11-13--eng-item-interruption-reentry/CHANGE.md), [time authority](../time-and-execution.md) and [existing consequence/hold pipeline](../../technical/execution.md) are context. The last link is intentionally not a dependency; implement using the real source owners below.

## Product decision and rejected alternative

**Choose one durable `action-interrupted` consequence** keyed to the *original execution operation ID*. It is admitted atomically with the terminal interrupted execution event, owns the normal required-turn Storyteller hold, and eventually produces a newly authorized scene/offer via the already selected consequence publication path. Do **not** create a separate generic recovery command that fabricates a turn; and **never reauthorize** the stale transfer offer.

Why: current `campaign/action-executions.ts::settleActionExecution` correctly refuses the transfer, increments viewVersion and records `game_action_execution_event.kind='interrupted'` but leaves `campaign.offer=null`, `holds=[]` and no `campaign_consequence`. Existing `campaign/narration.ts::createConsequenceNarration`, `campaign/follow-up-intents.ts::applyCampaignFollowUpIntents`, `campaign/holds.ts::holdCampaignForStorytellerIntent`, `storyteller/publication.ts::publishStorytellerResult` already represent *one controlling event → one paid/authorized generation → next authorized offer*. A new UI Continue action would bypass precisely the authority we need to preserve.

**Narrowness matters:** `campaign/action-execution-transition.ts` has two different `interrupted` causes: a controlling world obligation at its own frontier, and an item transfer whose required holder changed at the target. ENG09 only adds a consequence for the latter **when no controlling world-obligation owner is already present**. The obligation route remains authoritative and unchanged. Other unmodeled causes require separate work.

## Authoritative transition

`settleActionExecution`, **under the current story lock and in the same SQL transaction** that terminalizes the execution:

1. Re-read the existing required item holders at the due boundary. Confirm the blocked positive `item.transfer.v1` from the admitted `plan` and `execution.operationId`; use the current transition result. Do not reroll, revise item ownership, apply its world effects, insert a successful `gameActionReceipt`, or restore old `offer`.
2. Commit `gameActionExecution.state='interrupted'` with revision +1, `settledAt`; record exactly one `gameActionExecutionEvent(kind='interrupted')` with stable execution/event identity. Preserve the already projected elapsed fictional `gameSecond` and clock boundary, then clear `campaign.activeActionOperationId`. **No item moves.** Do not invent a refund or zero elapsed time.
3. Capture a narrow immutable factual consequence receipt under `campaignConsequence`, **`operationId = execution.operationId`**, `storyId`, current `storyPassage.id`, `baseRevision=current.revision`, and `kind='action-interrupted'`. The source payload should include `executionId`, terminal `executionRevision`, `gameSecond`, `cause='required-item-holder-changed'`, admitted `offerId/actionKey`, relevant item reference(s), and safe public-facing summary of the **attempt** not its success. Do not serialize secret current holder identity or future model claims into public text. Ensure `eventId`/cause ref ties back to the real committed execution event. No fabricated roll/outcome/effect.
4. In this same transaction add one existing `storyteller-intent` hold for the execution operation ID (clock frozen), enqueue a **single durable consequence preparation intent/outbox** for that same ID and increment `viewVersion` once per logical change (do not double-increment accidentally via helpers).
5. The worker consumes `campaignConsequence(operationId)` idempotently, validates **terminal interrupted execution with same story/revision/event ID and no success receipt**, builds a `consequence` storyteller task from a verified current situation, and transitions its existing intent hold to `storyteller(generationId)`. Use existing versioned task + captured effective funding policy and `storyResolution`; `campaignConsequence.generationId` pins one task. The task's `context.resolution.receipts` can use a deliberately limited **factual no-roll** entry: `{id:executionId, text:'The accepted transfer could not complete; the required item was no longer available', roll:null, effects:[], declarations:[]}`, plus any permitted established context. **Do not represent it as a settled successful action receipt.**
6. Only the existing `storyteller/publication.ts` **controlling consequence** publication can create the next published scene, validate author-proposed plans against current public/admitted state, save a **new offer ID** and transition `storyteller` hold to `decision` hold. A model-suggested transfer using a now-disallowed item must be rejected at offer validation, not republished from the consumed offer.

**Idempotency:** row PK `campaignConsequence.operationId` = original `gameActionExecution.operationId`; existing unique `story,baseRevision`, `storyResolution(story,basePassageId,baseRevision)`, `gameActionExecutionEvent(executionId,executionRevision)` provide additional fences. Duplicate worker wake sees terminal execution and at-most-one consequence/hold/generation; it cannot generate a second paid task. Avoid duplicate outbox rows where possible; duplicate delivery remains harmless.

## Why the current early-speculation path doesn't collide in this fixture

`campaign/actions.ts` uses `actionOverlapEligibility({hasItemTransfer:true})` to disallow speculative `pendingResolution` for actions with a positive item transfer; `gameActionExecution.preparationGenerationId` is therefore absent for this specific item-transfer case. Thus the new controlling consequence does not compete with a prior speculative `storyResolution` for the same `baseRevision`. **Verify that invariant in ENG09's SQL test.** If implementation reveals a prior generation on this fixture, stop and reconcile rather than violating `story_resolution_base` uniqueness. General speculative interruption is **not** part of ENG09.

Controlling world-obligation interruption already calls `fireWorldObligations` to save a distinct `world-obligation` consequence/hold. Do not admit a second `action-interrupted` consequence in that case or double-charge; later event read models may display both source facts without implying two controlling scenes.

## Cost, hold, failure and recovery rules

- **Spend:** one normal required-turn Storyteller admission subject to existing effective account/story/operation/platform funding and attempt caps. No free hidden call, implicit grant, automatic unlimited retry, or frontend-issued operation. The interruption is committed **even when narration cannot currently be funded**.
- **Before generation exists:** `campaignConsequence` and `storyteller-intent` hold persist together. The outbox/worker may retry a *known unsent, same operation* preparation according to existing bounded worker policy. A permanent preparation failure must be observable as a specific held/blocked consequence in the authorized public snapshot/operator diagnostics rather than `holds=[]`. Minimal public projection: interruption event/label and a literal reason that next scene is unavailable/pending; no invented action buttons.
- **After generation admitted:** `storyResolution` and existing public blocker/recovery state remain the authority. `retryStoryteller` (via current `retryResolution`) can only retry **the exact admitted generation** when its current attempt is genuinely unsent or meets the captured repair eligibility; confirmed charged/uncertain attempts are not automatically replayable. Usage-uncertain goes to operator/status reconciliation, not a second call.
- **Missing CAS/context or invalid task input:** leave original event and hold; no fabricated story, roll, transfer or new offer. If permanent and not eligible for safe retry, report a precise operator/repair requirement. Do not keep unbounded outbox spin.
- **Success:** next published scene/offer is new and current; hold transfers to decision; no old item transfer can be committed from stale revision/offer ID.

This is **not** a guarantee of automatic playability during provider outages; it is an honest, inspectable interruption and a permitted route to resume once funding/provider issues are resolved. Do not manufacture a provider-free fiction “Continue” to satisfy a screenshot.

## Source symbols and compatibility

Start in:
1. `packages/application/src/campaign/action-executions.ts::settleActionExecution` (item-holder interruption branch);
2. `packages/application/src/campaign/narration.ts::consequenceReceiptSchema/createConsequenceNarration` (add one kind, no fresh task family);
3. `packages/application/src/campaign/holds.ts::holdCampaignForStorytellerIntent` (reuse current hold owner);
4. `packages/application/src/storyteller/publication.ts::publishStorytellerResult` (controlling consequence validation and fresh offers);
5. `packages/application/test/eng01-item-transfer.live.test.mjs` (confirmed disposable SQL case).

Inspect `packages/application/src/campaign/follow-up-intents.ts` or public `campaign/reads.ts` only when required by implementing the atomic intent and held-status projection. `packages/db/src/schema/campaign.ts` already has a consequence row with JSONB receipt; prefer an additive strict receipt discriminant, not a new general event bus or migration. Keep existing task union versions/old generations backward-readable.

## Acceptance tests and discriminating negatives

**Normal (disposable SQL, no provider):** existing mid-flight fixture moves compass holder to another actor; target time is preserved; no `gameActionReceipt`, no roll, no transfer; exactly one terminal event and one `action-interrupted` consequence/hold with same operation ID. Worker prepares exactly one scripted/storyteller fixture task; published consequence creates a new grounded offer and decision hold; an authorized next action can be selected.

**Negative:** (a) wrong holder *before admission* still rejected immediately with no time; (b) duplicate settlement/outbox/worker replay preserves one event/consequence/generation and spend; (c) original transfer offer ID/path cannot be submitted; (d) provider disabled/funding absent/unsent vs uncertain/settled failure leaves visible hold with correct safe recovery; (e) missing immutable source does not write fake prose; (f) world-obligation controlling interrupt does **not** acquire a second consequence, retains prior semantics; (g) wrong viewer cannot inspect interrupted context; (h) old non-interrupted successful transfer remains exactly once.

**Proof:** provider-free pure `action-execution-transition` tests plus `pnpm --filter @offscreen/application exec node --test test/eng01-item-transfer.live.test.mjs` only on disposable SQL DB expressly authorized for that run, and nearest storyteller publication/idempotency tests. Never run production DB, paid models or destructive integration suites without permission. Return row/hold/offer traces and actual executed commands; don't claim Storyteller quality from deterministic fixture proof.

## Scope outside ENG09

No general recovery command, new free-text choice, action refusal dialogue generator, NPC theft system, actor/capability framework, generalized event streaming, GM05 return feed, no change to ENG01 success, no front-end invented CTA, no Temporal deployment/remote CAS cutover. No code edits are authorized by saving this document.

**Readiness interpretation:** selected semantics and source owners are now specified; code work still follows the repository's work-unit rule (explicit owner approval and disposable-test consent before marking the Change formally Ready/active).
