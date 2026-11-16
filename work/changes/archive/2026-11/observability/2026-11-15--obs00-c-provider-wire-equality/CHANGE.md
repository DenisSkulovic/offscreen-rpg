# OBS00-C | Prove exact reviewed packet equals actual transport body

**State: Done (2026-11-15, provider-free, disposable DB).** Evidence: [obs00-c receipt](../../../../../../docs/programs/observability/evidence/obs00-c-provider-wire-equality-2026-11-15.md); read its Findings (memory-controller settle defect, unattested providers now refused). Original packet text follows. One bounded backend/provider-boundary code and test outcome: **a specific provider attempt/round cannot go out with application JSON body bytes different from the packet approved and persisted in `storyteller_dispatch_review`**. Provider-disabled mock HTTP only in this Change; no real network, account credits, model output, raw evidence export or production entitlement changes.

**Source and authority:** [independent trial review](../../../../../../docs/programs/observability/evidence/independent-connected-trial-review-2026-11-15.md), [Storyteller source/packet map](../../../../../../docs/programs/observability/technical/storyteller-prompt-source-map-v1.md), [capture/uncertain ordering](../../../../../../docs/programs/observability/technical/capture-transaction-protocol.md). Existing OBS00-A forwards `(task,dispatch)` for the generic worker; local `tools/chamber/src/main.ts` directly passes `createOpenRouterProvider` with a callback. Both paths must be tested as composed, not only the isolated utility.

## Cursor first screen

> Current `openrouter.ts::buildOpenRouterRequest(task,dispatch)` already builds the full credential-free OpenRouter body. `inspectOpenRouterRequest` hashes `JSON.stringify(body)`; `dispatch-review.ts::prepareDispatchReview` stores packet JSON and `packetSha256` before reserved/dispatch state; `createOpenRouterProvider` rebuilds the same request and sends `body: JSON.stringify(request)`. These should match **if and only if the exact per-attempt dispatch overrides, output schema and serialization are unchanged**.
>
> **The trial did not verify the actual `transport(...{body})` bytes against the persisted review for any real provider path.** Held-packet SHA alone is not evidence of what the external model actually received.
>
> **Implement or prove one robust invariant** without a general tracing rewrite: per attempt, the **last serialized HTTP body** is the same exact byte string approved by persisted review, with no secrets included in the archived body. If equality cannot be guaranteed under the current boundaries, stop the dispatch safely *before* marking a possible provider send, and return the exact mismatch.

## 1. Small owners and first source audit

Inspect only:
- `packages/storyteller/src/providers/openrouter.ts::{providerDispatch,buildOpenRouterRequest,inspectOpenRouterRequest,createOpenRouterProvider}`;
- `packages/application/src/storyteller/dispatch-review.ts::prepareDispatchReview`;
- `packages/application/src/storyteller/execution.ts` and `memory-provider-runtime.ts` selected per-round construction, review, `budget.reserve/dispatch`, provider call;
- `packages/application/src/storyteller/config.ts::wrapApprovedWorkerProvider` and `tools/chamber/src/main.ts` provider composition;
- existing mock transport tests in `packages/storyteller/test` and the corresponding application OBS00-A tests.

**Do not change prompt text/schema** simply to make hashing easier; same original task and final request should result from the existing builder. Avoid duplicating full packet JSON into OTel/runtime logs.

## 2. Exact acceptance contract

**Packet identity = `(generationId, attemptId, round identity, selected request, provider execution route/output protocol/token limits)`.** The persisted review is attempt keyed, not "one G = one packet." Distinct repair/memory rounds may have different bodies, schemas and request ceilings under the same G.

For one permitted dispatch:

~~~text
actual task and per-round dispatch
  -> build exact provider-facing body using the existing builder
  -> exact UTF-8 JSON serialization ONCE (credential-free)
  -> sha256(bytes) + length + schema/route/attempt metadata
  -> compare to stored reviewed (attemptId, packetSha256, body)
  -> if mismatched: fail/hold BEFORE budget.dispatch's possibly-sent
     transition, no provider HTTP and no fabricated "billed" attempt
  -> if same and independent current funding/usage authority passes:
     budget.dispatch -> send precisely that same frozen byte buffer
  -> actual transport and provider/usage status recorded per normal path
~~~

**No remote CAS/OTLP under story `FOR UPDATE`**. Do not mark `storytellerAttempt.dispatched` and then compute a purely local mismatch and call that "uncertain" without a real possible send. Preserve existing idempotency and review hold/release; a previously released packet must still match original reviewed SHA, not a task rebuilt under newer prompt build.

**Engineering selection:** reuse `buildOpenRouterRequest` plus a small typed prepared-envelope value carrying the exact byte string and SHA from a single serializer, or a similarly proven faithful approach. If adding a pre-send review guard requires changing `prepareDispatchReview` disposition to provide the persisted hash, preserve old callers' security behavior and test review state races. Do not fetch arbitrary/latest request data just before send. Prefer no new table.

**Production runtime vs proof:** A mock transport equality test establishes deterministic configured bytes, but **not provider-side receipt** or actual provider charge. The operational promise is "bytes handed to the HTTP transport match reviewed packet"; do not claim "provider received/understood every instruction".

## 3. Required provider-free cases

| Scenario | Must observe |
| --- | --- |
| Normal one-shot G task | Real `prepareDispatchReview` persisted SHA = mock transport intercepted exact body SHA and length |
| Different output-schema projection/provider policy | Packet/transport still match after correct OpenRouter projection |
| Invalid dispatch override would exceed token limit | Denied before HTTP, no partial unreviewed send |
| Repair request R differs from original `task.request` | Mock receives **R**, SHA matches review for that attempt (catches dropped override) |
| Memory explorer decision round followed by final round | Two distinct attempt IDs + protocol/request bodies + SHA matches, no G duplication |
| Provider wrapper ignoring second argument (negative deliberate fixture) | Equality test **fails**, no compliant “sent” claim |
| Review row intentionally differs from final wire body | Pre-send mismatch refusal, **0 mock HTTP** and original review not overwritten |
| Held review packet awaiting approval | Zero provider transport, no budget reservation/spend |
| Review released then source code/route changed before retry | Same original attempt/hash guarded, not silently rebuilt/resent |
| Duplicate Temporal delivery | Same existing attempt/review where applicable, no extra paid mock send |
| Local Story-mode launcher composition (without real key/network) | Actual local wrapper/harness passes round override and uses the same captured serialized body |
| Generic worker missing OBS00-B | Stays denied; mock provider never called despite packet equality |
| Attempt dispatched then mock timeout (possible send) | **Uncertain**, no automatic retry/free-charge fiction |
| Wrong/stale authority or stopped account | No dispatch, even with perfectly matching packet |
| Transport header contains private Authorization | Header **never** archived/committed to evidence body or Git |
| Regression of v15/v16/v17 task read | Legacy decoding/read contracts remain valid, no prompt/schema modification |

**How Cursor should run it:** use injected `config.transport` mock in `createOpenRouterProvider` (existing hook), plus a **configured application+worker integration** test with a disposable local DB. Compare actual recorded SQL `storytellerDispatchReview.packetSha256` to hash of `RequestInit.body` and assert exact attempt ID/round. Don't test only a toy direct `buildOpenRouterRequest` call and call that end-to-end. Choose one normal and one negative mismatch injection as minimum Done proof.

## 4. Side effects and test safety

- No credential/account required for mock `transport`. Inject a dummy key in local env, but do not read real `.env.openrouter` or make any external HTTP.
- No new paid execution, no production enrollment, no entitlement bypass, no real S3/raw prompt archive.
- Verify source SHA, exact commands, normal+repair+memory cases, mismatch/hold/uncertain denial, and the absence of any outgoing network.
- Source-encoded private task/input and provider reviewed packet stay in **test DB/local ignored artifact**; Git evidence records hashes, byte counts, route/protocol names and IDs only. No raw player prose, auth header or provider envelope.

## 5. Dependency and Done

**Independent of production OBS00-B** for provider-free proof; it does **not** authorize a live send. [OBS00-L](../../../../../../work/changes/archive/2026-11/observability/2026-11-15--obs00-l-local-story-trial-guards/CHANGE.md) separately handles local restart/cap safety. Both need real pass receipts before a newly authorized low-budget local Story-model trial.

**Ready:** owner explicitly selects OBS00-C, current source reinspection and disposable/provider-disabled transport fixtures validated. **Done:** a real mock HTTP body matches the exact stored per-attempt review under normal/repair/memory cases, and a deliberately divergent body is blocked *before the potential-send liability boundary*, without weakening account authority. If the design reveals a larger interface/transaction mismatch, leave Verifying/Blocked and return the smallest source-specific revision, not a large provider refactor.
