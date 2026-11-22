# STORY03R | Retry saved Storyteller publication while a prepared consequence is still settling

**State: Done (2026-11-22).**  
**Kind:** implementation · **Profile:** PATCH/STATE · **Reference branch:** `undertaking/storyteller-workshop`  
**Planner baseline:** `59863b3e8852cb6cee6d32f47c175b3fb2fb3133`.  
**Unblocks:** TURN03 `ga-scene-publication` and all downstream gates.  
**No provider call is authorized.**

## Observed failure

TURN03 cold-kind proof reached a real signed-in scripted opening and player action. `storytellerDistributedV1` executed and saved the generation, then `publishSavedStoryteller` ran before the finite action settled.

`publishStorytellerResult` correctly refused speculative publication with:

`StoryError('unavailable', 'pending-consequence-not-settled')`

but `createStorytellerSavedGenerationPublish` collapsed that to generic `reason: 'unavailable'`. The Worker then classified every `blocked` result as non-retryable, so the workflow failed before settlement.

The source already has the intended post-settlement path: a prepared finite action carries `preparationGenerationId`; on settlement `decideActionExecutionTransition` emits `publish-prepared-action-consequence`; `applyCampaignFollowUpIntents` reuses the frozen Storyteller notice topic. The missing behavior is safe waiting/retry of the already-saved publication, not another model round.

## Selected repair

1. Preserve `StoryError.reason` from saved-generation publication when present; fall back to `StoryError.code` for existing cases.
2. In `publishSavedStoryteller`, classify only `pending-consequence-not-settled` as retryable, with a dedicated failure type such as `PublicationPendingSettlement`.
3. Give the **publication activity only** a durable retry policy without a fixed attempt cap: initial 2s, maximum 30s. Keep execution/provider activity retry policy unchanged.
4. All other `blocked`, `stale`, `refused` responses remain non-retryable.
5. Retrying publication never re-runs provider execution. `executeFrozenStoryteller` is a previous completed Temporal activity; only the publication activity is redelivered. GA saved-generation publication remains idempotent and returns `already_published` after a lost acknowledgement.

## Write scope

- `packages/story-engine/src/storyteller/saved-generation-publish.ts`
- `apps/worker/src/activities/storyteller-distributed-control.ts`
- `packages/workflows/src/index.ts`
- focused tests for those owners / existing STORY03 causal integration fixture if needed.

Do not edit TURN03 harness, provider code, Writer round protocol, DB schema, Web, API routes, Kubernetes manifests, or spending policy.

## Acceptance

- pending prepared consequence returns the specific `pending-consequence-not-settled` reason across the GA publication seam;
- Worker maps exactly that reason to retryable `PublicationPendingSettlement`;
- other blocked publication remains non-retryable;
- publication activity retries until settlement without rerunning `executeFrozenStoryteller`;
- after settlement one saved result publishes exactly one scene;
- retry/lost acknowledgement still yields one passage;
- focused STORY03 worker/GA tests and relevant causal fixture pass;
- no provider call occurs.

After integration, TURN03 reruns T04 against the joined undertaking HEAD.
