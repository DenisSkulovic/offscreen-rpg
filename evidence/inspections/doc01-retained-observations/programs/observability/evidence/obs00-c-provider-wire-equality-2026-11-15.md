# OBS00-C | Reviewed packet equals actual transport body (2026-11-15)

**Change:** [OBS00-C](../../../../../../work/changes/archive/2026-11/observability/2026-11-15--obs00-c-provider-wire-equality/CHANGE.md)
**Source base:** `c887716a53698c2e1afe375b91b41342787f75c3` (OBS00-L); this receipt ships in the OBS00-C commit.
**Provider spend / external HTTP:** **$0 / 0.** Injected recording `transport` mock only; `globalThis.fetch` is a thrower for the whole suite (asserted 0 calls in `test.after`). It is swapped to the same recording mock only inside the one generic-worker composition case, then restored. No `.env.openrouter` read, no real key, no OpenRouter, no paid call.
**DB:** one fresh disposable `offscreen_chamber_run_<uuid>` per case (Sandbox URL guard, destroyed in `finally`). Owner `offscreen_story_local` untouched. Synthetic ids: account `00000000-0000-4000-8000-0000000000c0`, trial run `…c2`; route `fake:obs00-c`; API key is the literal synthetic marker `obs00-c-dummy-key-0123456789abcdef`.

## What the guarantee is (and is not)

> **Per attempt, the exact string handed to the HTTP transport as `RequestInit.body` is the byte string whose SHA-256 was persisted in `storyteller_dispatch_review.packet_sha256` under the review row lock. A divergence is refused before `budget.reserve`, hence before `budget.dispatch` (the possibly-sent boundary), with 0 HTTP and the review row untouched.**

It is **not** provider-side receipt, understanding, or charge proof. A mock transport establishes the bytes the application handed to transport, nothing about what OpenRouter received.

## What changed

| Area | Change |
| --- | --- |
| `packages/storyteller/src/providers/openrouter.ts` | One serializer `wireForBody` → typed `PreparedProviderWire {version, serialized, sha256, serializedBytes}`. `prepareOpenRouterWire(task, dispatch)` and `inspectOpenRouterRequest` (what the review persists) both derive from it, so review hash and wire cannot drift by adapter-only serialization. `StorytellerProviderDispatch.wire?` carries the frozen bytes. `createOpenRouterProvider` rebuilds from `(task, dispatch)`, requires any supplied wire to be self-consistent and equal to the rebuild, then sends **`wire.serialized` itself** (no second `JSON.stringify`). A mismatch there (defence in depth, only reachable after the application guard) returns a no-HTTP outcome that is confirmed *unsent* (`provider_unavailable`, `finishReason: wire-mismatch-unsent`), not a fabricated uncertain/billed attempt. `StorytellerProvider` now optionally exposes a pure `prepareWire`; `createOpenRouterProvider` provides it. `recordResponse`/`recordDiagnostic` `requestSha256` is the wire digest. |
| `packages/application/src/storyteller/dispatch-review.ts` | New `prepareReviewedDispatch(...)`. After the existing review (insert-if-absent, `FOR UPDATE`, hold/release/supersede unchanged) it asks the provider's `prepareWire(task, dispatch)`, independently re-hashes the returned bytes, and requires `sha256 === persisted packet_sha256`. Refusals: `wire-unattested` (provider has no `prepareWire`) and `wire-mismatch`. It never writes to the review row. `prepareDispatchReview` keeps its signature/behaviour. |
| `execution.ts`, `memory-provider-runtime.ts` | Both call `prepareReviewedDispatch` **before** `budget.reserve`/`budget.dispatch` and pass the frozen-wire dispatch to the provider. Ordinary path: refusal → `failed`/`wire_mismatch`, no attempt row. Memory rounds: refusal → existing `review-stopped` (reuses the existing DB-checked failure vocabulary; no migration). |
| `config.ts::wrapApprovedWorkerProvider` | Forwards `(task, dispatch)` unchanged (OBS00-A) **and** forwards `prepareWire` behind the same approved-policy check. It never invents one: a wrapped provider without `prepareWire` stays unattested and is refused pre-send. |
| `tools/chamber/src/story-provider.ts` (new), `main.ts` | The exact local Story provider composition (`createOpenRouterProvider` + evidence hooks) moved out of `main.ts` into `createLocalStoryProvider({apiKey, evidenceDirectory, transport?})` so the launcher wiring is testable with an injected transport. `main.ts` calls it; behaviour unchanged. |
| `tools/chamber/test/obs00-l-story-trial.live.test.ts` | Its counting fake provider now carries `prepareWire` (a fake that never reaches HTTP nominally attests). |

No prompt text, output schema, budget, authority or review-state rule changed.

## Proof (all passed)

```text
pnpm --filter @offscreen/storyteller build / test         # 52/52
pnpm --filter @offscreen/application build                # exit 0
pnpm --filter @offscreen/application exec node --test test/obs00-dispatch-forward.test.mjs test/memory-provider-runtime.test.mjs   # 9/9
pnpm --filter @offscreen/chamber build / typecheck        # exit 0
pnpm --filter @offscreen/chamber exec node --test dist/test/obs00-c-wire-equality.live.test.js   # tests 15, pass 15, fail 0
pnpm --filter @offscreen/chamber test                     # tests 35, pass 35, fail 0 (incl. OBS00-L 12/12)
eslint on the touched source and new test                 # clean
```

New: `tools/chamber/test/obs00-c-wire-equality.live.test.ts` (15 cases). Equality helper `assertWireEqualsReviews` checks, per attempt, `sha256(RequestInit.body) == review.packet_sha256`, `bytes == inspection.serializedBytes`, and `JSON.parse(body) deepEqual review.packet`.

| CHANGE.md matrix row | Test | Observation |
| --- | --- | --- |
| Normal one-shot | `normal one-shot…` (local Story composition via `createLocalStoryProvider`) | review row `attempt_id == generation.attempt_id`; body SHA/length == review; also == an offline `prepareOpenRouterWire` of the stored task; duplicate `complete()` → still 1 send, 1 review. Fixture packet: 8,275 bytes, sha256 `f3933a57…` (synthetic audit fixture, not player prose) |
| Output-schema projection | `OpenAI strict-schema projection…` | sent `response_format.json_schema.schema` ≠ captured domain schema (projected), and still equals the review |
| Invalid override over token limit | `invalid dispatch override…` | `prepareReviewedDispatch` rejects `Invalid provider dispatch output ceiling`; 0 HTTP, 0 review rows, 0 attempts |
| Repair request R | `repair request R differs…` | first body = `task.request.messages`; second body ≠ it, contains `Invalid candidate: {"invalid":true}`; two attempt ids, two distinct SHAs, each equals its own review |
| Memory decision + final | `memory decision round then final round (per-round runtime source)` | `createMemoryProviderRoundRuntime.source` driven for round 1 (`canRequestContext`, `json_object`) and round 2 (final, `json_schema`); two attempt ids, two distinct SHAs, differing `max_tokens`, 2 attempts (no G duplication), each body == its review |
| Wrapper ignoring 2nd arg (negative) | `wrapper that drops the dispatch argument…` | (a) plain wrapper lacking `prepareWire` → refused pre-send, `wire_mismatch`, 0 HTTP, 0 attempts; (b) wrapper that copies `prepareWire` but drops arg 2 → repair body equals the *original* body, `assertWireEqualsReviews` **throws** on the second attempt (no compliant claim) |
| Review row vs final wire (one-byte divergence) | `deliberate one-byte divergence…` | provider whose `prepareWire` differs by one byte (self-consistent) → 0 HTTP; generation `failed/wire_mismatch`; review `packet_sha256` still the honest hash, `state=not-held`, `revision=0`; **no attempt row, admitted 0, reserved 0, settled 0, account not stopped**. An internally inconsistent wire is refused the same way |
| Defence in depth | `provider-level defence in depth…` | `createOpenRouterProvider` given a tampered frozen wire: 0 HTTP, `failed` with `finishReason=wire-mismatch-unsent`, `httpStatus=null`; the honest frozen wire is sent byte-for-byte |
| Held review | `held review…` | 0 transport, 0 attempts, run reserved/admitted 0, review `awaiting-review`; after real `createDispatchReviewControls.decide('release')` exactly one send whose body == the held packet SHA |
| Released then task changed | `released review, then the task changes…` | 0 sends, review keeps original `packet_sha256` and original `packet` body (state `superseded`), no attempts |
| Uncertain after possible send | `uncertain after a possible send…` | transport throws `TimeoutError` → generation `uncertain`, attempt `uncertain`, account stopped; body still == review; re-`complete()` and a second generation → calls stay **1** |
| Stopped / wrong authority | `wrong or stale authority and a stopped account…` | pinned policy ≠ captured → `authority_unavailable`, 0 HTTP, though the persisted packet equals the rebuild; after `budget.stop` with correct authority → 0 HTTP, nothing settled |
| Generic worker missing OBS00-B | `generic worker composition…` | `readStorytellerWorkerOptions` has no `dispatchAuthority`; with it absent → `authority_unavailable`, 0 HTTP while the packet **was** reviewed; with a test-only pinned authority the worker-wrapped provider yields two sends (normal + repair) whose bodies equal their reviews. `worker wrapper keeps the attestation…` pins `prepareWire` forwarding + policy check |
| Auth header never in body/Git | `normal one-shot…` | `authorization: Bearer <dummy>` reached the transport headers only; body, persisted review rows and the local response evidence files contain neither the dummy key nor `Bearer`; evidence `requestSha256 == review.packet_sha256` |
| Local Story-mode composition | all non-worker cases | use `createLocalStoryProvider` + `pinnedLocalStoryDispatchAuthority` (the launcher's exact composition) without real key/network |
| v15/v16/v17 legacy reads | existing `packages/storyteller` suite | 52/52 pass; no prompt/schema/task-schema change |

**Negative control:** temporarily replacing the digest comparison (`wire.sha256 !== reviewed.persistedPacketSha256`) with `false` made the one-byte-divergence case fail (0 pass / 1 fail); reverted, 15/15 pass.

## Findings and limits

1. **Pre-existing, separate defect (not fixed here):** `budget.settle` (introduced by `7ba3ff1d`, 2026-09-23, "retain invalid repair settlements") rejects `operationOutcome:'continue'` unless a retained invalid-output repair candidate/diagnostic accompanies it. `memory-provider-runtime.ts::settlePersistedRound` passes `continue` with **no** `generationOutcome` for every memory decision round, so the real memory controller loop sends round 1, then throws `Only a retained invalid candidate may keep an operation open` from `settlePersistedRound`, leaving that attempt `dispatched` (round 2 is never reached). Pinned by the test `memory controller loop: round 1 is sent and wire-equal, then settlement hits pre-existing 7ba3ff1d defect`; flip that test when fixed. The OBS00-C memory proof therefore drives the per-round runtime `source` twice and releases the in-flight slot with a harness-only `budget.settle`; it does not claim the controller loop works end to end. The local Story profile has `maxReadsPerOperation: 0`, so the next local trial does not use memory exploration. Recommend a separate owner-authorized Change.
2. **Unattested providers are now refused.** Any `provider` function without `prepareWire` is denied before reserve/dispatch (`wire_mismatch` ordinary / `review-stopped` memory). `createOpenRouterProvider` and a compliant `wrapApprovedWorkerProvider` wrapper attest; plain async fakes do not. `tools/api-integration/test/{storyteller,start-package}.integration.ts` contain ~24 plain fake providers and will now hit `wire_mismatch`. Those suites were not run (already red per QA-SF01); **QA-SF01 must add `Object.assign(fn, { prepareWire: prepareOpenRouterWire })` to those fixtures** (the OBS00-L chamber fake shows the one-line pattern).
3. `prepareWire` is a *capability claim*. A wrapper that copies `prepareWire` but drops argument 2 passes the pre-send gate and is detectable only by the transport-level equality test (negative case (b)); the gate guarantees what a *compliant* provider will send, not that arbitrary third-party code complies.
4. **jsonb key order:** the wire bytes derive from the persisted task (`generation.input` is `jsonb`, key-ordered), so an offline rebuild of an in-memory task can differ by key order from the stored-task rebuild; the proof rebuilds from the stored row. This is existing behaviour and is stable across retries.
5. Not covered: a review row mutated between `prepareReviewedDispatch` and `budget.dispatch` (the existing review state race is unchanged), provider-side receipt, real `pnpm story:server`, real OpenRouter.
6. Unrelated pre-existing failure observed in `pnpm --filter @offscreen/application test` (166/167): `ENG03-M: DocumentStore delay propagates into story lock hold` (stale expectation since ENG03-C1 moved capture off-lock). That live test also rewrites the tracked `docs/programs/engine/evidence/eng03-lock-measurement-2026-11-14.md`, which was already uncommitted before this Change; it was left uncommitted, not staged.
