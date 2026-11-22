# STORY03R bounded tasks

## T01 | preserve the transient publication reason — Done

`publishSavedGeneration` returns `error.reason ?? error.code`. Proved by `packages/story-engine/test/saved-generation-publish-reason.test.mjs` (2/2).

Read/write:
- `packages/story-engine/src/storyteller/saved-generation-publish.ts`
- focused saved-generation publication tests.

Change the `StoryError` catch to return `error.reason ?? error.code`.

Positive: `StoryError('unavailable','pending-consequence-not-settled')` becomes blocked reason `pending-consequence-not-settled`.  
Negative: a StoryError without reason still reports its existing code.  
Stop if the HTTP contract schema forbids the reason string; report the exact schema.

## T02 | retry only pending settlement — Done

`apps/worker/dist/test/story03-control-publication.test.js` 8/8, including retryable `PublicationPendingSettlement` and non-retryable `PublicationBlocked`.

Read/write:
- `apps/worker/src/activities/storyteller-distributed-control.ts`
- `apps/worker/test/story03-control-publication.test.ts`

For `response.status === 'blocked'`:
- reason `pending-consequence-not-settled` → retryable ApplicationFailure type `PublicationPendingSettlement`;
- every other blocked reason → existing non-retryable `PublicationBlocked`.

Positive and negative unit tests are mandatory.

## T03 | separate publication retry policy — Done

`packages/workflows/test/storyteller-workflow-contract.test.mjs` 4/4. Execution retry stays `maximumAttempts: 5`. Publication retry is 2s–30s with no `maximumAttempts`.

Read/write:
- `packages/workflows/src/index.ts`
- existing workflow contract/replay tests.

Keep `executeFrozenStoryteller` on its existing bounded retry policy. Give `publishSavedStoryteller` its own policy:
- initialInterval 2s
- maximumInterval 30s
- no fixed maximumAttempts

Do not change workflow identity or activity ordering.

Negative: provider/execution activity policy remains unchanged.

## T04 | connected regression and integration — focused proof Done; causal fixture NOT RUN

Game Authority `storyteller-generation-publish.test.js` 6/6. `pnpm exec turbo run build --filter=@offscreen/api-integration` failed before the causal fixture on unrelated files: `test/turn03-cold-kind-evidence.test.ts` TS5097 and `test/wr10-private-round-protocol.integration.ts` TS7006. `DATABASE_TEST_URL` was unset. The live execute-once / publish-retry / one-passage sequence was not run. Temporal isolation is the separate activity plus the publication-only retry policy.

Run focused worker + story-engine tests and the existing STORY03 causal integration fixture that exercises a prepared consequence.

Required observation:
1. one execute activity saves the result;
2. first publication can observe pending settlement;
3. publication retries after settlement;
4. story advances once;
5. one generation/attempt/passage;
6. no provider send.

Then reconcile/close/merge STORY03R into `undertaking/storyteller-workshop`. Do not start another Change. TURN03 becomes eligible to rerun T04 immediately.
