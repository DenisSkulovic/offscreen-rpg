# STORY03R bounded tasks

## T01 | preserve the transient publication reason

Read/write:
- `packages/story-engine/src/storyteller/saved-generation-publish.ts`
- focused saved-generation publication tests.

Change the `StoryError` catch to return `error.reason ?? error.code`.

Positive: `StoryError('unavailable','pending-consequence-not-settled')` becomes blocked reason `pending-consequence-not-settled`.  
Negative: a StoryError without reason still reports its existing code.  
Stop if the HTTP contract schema forbids the reason string; report the exact schema.

## T02 | retry only pending settlement

Read/write:
- `apps/worker/src/activities/storyteller-distributed-control.ts`
- `apps/worker/test/story03-control-publication.test.ts`

For `response.status === 'blocked'`:
- reason `pending-consequence-not-settled` → retryable ApplicationFailure type `PublicationPendingSettlement`;
- every other blocked reason → existing non-retryable `PublicationBlocked`.

Positive and negative unit tests are mandatory.

## T03 | separate publication retry policy

Read/write:
- `packages/workflows/src/index.ts`
- existing workflow contract/replay tests.

Keep `executeFrozenStoryteller` on its existing bounded retry policy. Give `publishSavedStoryteller` its own policy:
- initialInterval 2s
- maximumInterval 30s
- no fixed maximumAttempts

Do not change workflow identity or activity ordering.

Negative: provider/execution activity policy remains unchanged.

## T04 | connected regression and integration

Run focused worker + story-engine tests and the existing STORY03 causal integration fixture that exercises a prepared consequence.

Required observation:
1. one execute activity saves the result;
2. first publication can observe pending settlement;
3. publication retries after settlement;
4. story advances once;
5. one generation/attempt/passage;
6. no provider send.

Then reconcile/close/merge STORY03R into `undertaking/storyteller-workshop`. Do not start another Change. TURN03 becomes eligible to rerun T04 immediately.
