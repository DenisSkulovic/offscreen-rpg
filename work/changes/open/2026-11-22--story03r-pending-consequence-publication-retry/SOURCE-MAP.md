# STORY03R source map

**Baseline:** `undertaking/storyteller-workshop@59863b3e8852cb6cee6d32f47c175b3fb2fb3133`.

## Existing correct lifecycle

- `campaign/actions.ts` may call `preparePendingActionNarration` before a finite action settles.
- `narration.ts:preparePendingActionNarration` stores the returned generation in `gameActionExecution.preparationGenerationId`.
- `action-execution-transition.ts` returns `publish-prepared-action-consequence` on settlement when that generation exists.
- `follow-up-intents.ts` transitions the hold and enqueues the generation's frozen Storyteller notice topic after settlement.
- `publication.ts:publishStorytellerResult` refuses early publication with `StoryError('unavailable','pending-consequence-not-settled')`.

## Broken compression

`saved-generation-publish.ts` catches `StoryError` and returns only `error.code`, losing `error.reason`.

`storyteller-distributed-control.ts` maps every `blocked` response to non-retryable `PublicationBlocked`.

`packages/workflows/src/index.ts` currently shares one retry policy with maximumAttempts=5 between execution and publication.

## Chosen boundary

Execution remains bounded. Publication of an already-saved result is safe to retry durably because:
- it cannot invoke the provider;
- GA owns idempotent adoption/publication;
- published/stale/blocked terminal states are explicit;
- only the transient pre-settlement reason becomes retryable.

No new outbox topic, workflow type, DB column, or provider path is required.
