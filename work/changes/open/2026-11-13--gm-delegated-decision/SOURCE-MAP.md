# GM07 | source investigation: pure delegation versus SQL decision timer

**Inspected:** 584b594 and canonical product/technical time docs, 2026-11-20. **No DB or clock test run.** This source map prevents Composer from confusing two *distinct* mechanisms.

## Mechanism A: already-present unconsented, scripted default

- `packages/application/src/stories/plans.ts:decisionPlanSchema` has `responseDurationMs`, `defaultOptionId`, and preauthored `outcome`; no GM07 consent identity/revocation/provenance.
- `packages/db/src/schema/stories.ts:storyPassage` stores `decisionPlan` and `responseDueAt` with `story_passage_decision_valid`, but does **not** have a durable GM07 grant record.
- `packages/application/src/stories/timing.ts:createStoryTiming.resolveDecision` locks current story by passage, checks current revision and expiry using DB clock, then invokes `commitStoryContinuation` with the preauthored default and `completingDecisionPassageId`. This path may be safe as an older “scripted timed decision” feature **but is NOT equivalent to user-consented fallback**.
- `packages/application/src/stories/command-policy.ts:continuationResponseProvenance` labels this source `default`, not `preapproved-withdrawal`; `packages/contracts/src/stories.ts` projects `dueAt/defaultOptionId`, not consent disclosure.

## Mechanism B: GM07 pure safe-withdrawal admission

- `packages/application/src/campaign/delegated-decision.ts:admitDelegatedDecision` operates on a `published-two-choice` object; sets fixed 20 real minutes from `publishedAtMs`, checks two choices, consent version and optional revocation, exact allowed fallback kind `withdrawal`, rejects model/combat requests and duplicate, produces `source='preapproved-withdrawal'` and specific provenance. It **does not** read or write a DB or schedule Temporal.
- `packages/application/test/delegated-decision.test.mjs` is a pure behavior proof, not concurrent SQL requests. The source export in `packages/application/src/stories/index.ts` does not establish a public API caller or durable saga.

## Design consequence

**Do not simply call `resolveDecision` with a GM07 option.** That timer does not know which grant version was published, whether an owner revoked it after publication, whether a manual pause is active, or what actor was authorized. Also don't put a browser 20-minute timer in charge of canonical actions. The game already has a story-row locking idiom: future GM07 integrated command and scheduled expiry must both validate under the **same story lock** and produce an idempotent ordinary action/receipt with a unique operation identity. A chosen one-shot alternative is a versioned consent+published-offer record, a row CAS for current offer+grant/revocation, and a deferred expiry notice. However, exact storage and pause/resume deadline policy **are not ratified** in the product docs; choosing fields in a migration would be premature.

The selected product first slice permits **one preapproved withdrawal** from a published two-choice invitation, not generalized autonomy. `docs/product/gameplay/time-and-autonomy.md#response-windows-and-absence` still calls actual timed fallback Proposed/Blocked, while the pure test is implemented. No packet status promotion from green reducer tests.

**ChatGPT next decision needed before a Composer implementation:** specify story/campaign-grant table identity and revocation versions, whether manual pause suspends or cancels remaining real response window, how an expired-but-held decision is resumed, and how the fallback source is disclosed as a new public event without leaking hidden options. Then split into contract, same-row SQL admission, scheduler, projection and race tests. [TASKS](TASKS.md) records that gate. The current source does not settle these choices.
