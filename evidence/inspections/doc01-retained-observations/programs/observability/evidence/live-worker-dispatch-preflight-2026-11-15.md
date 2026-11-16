# Live worker dispatch preflight | Two source-proven wiring gaps

**Status:** urgent **source-level defect hypothesis**, inspected on GitHub `main@7e15db38`, 2026-11-15. **No live provider attempt, worker start, test, paid call or runtime fix was performed.** These findings are more immediate than adding new observability tables. [Bounded design-only correction packet](../../../../../../work/changes/open/2026-11-15--obs00-live-provider-custody/CHANGE.md). Architectural context: [exact provenance](../../../../../../docs/technical/observability/identities-and-evidence.md), [capture contract](../../../../../../docs/technical/observability/capture-and-provenance.md).

## 1. Source chain, not conjecture about a log message

**Direct source links:**
- `apps/worker/src/bootstrap/main.ts`: calls `startRuntime(..., {...readStorytellerWorkerOptions(process.env), ...(documentStore ? {documentStore}: {})})`. No other dispatch-authority field in this bootstrap object.
- `packages/application/src/storyteller/config.ts::readStorytellerWorkerOptions`: when live enabled, returns **only** `{ provider: async (task) => { ...; return provider(task); } }`. It checks a static worker execution JSON equals the task execution policy, but accepts only one argument and calls underlying `createOpenRouterProvider` with **task alone**. It does **not** define `dispatchAuthority`.
- `packages/application/src/storyteller/execution.ts::StorytellerRuntimeOptions`: `provider?: StorytellerProvider` and `dispatchAuthority?:(input)=>EffectiveUsagePolicy|null` are separate fields.
- In `execution.ts` normal provider branch, `prepareDispatchReview(G,attemptId,task,providerDispatch)` and `budget.reserve(...)` receive **the selected override**, `retainsCapturedAuthority(task, await options.dispatchAuthority?.(...) ?? null)` decides live authority, `budget.dispatch(attemptId, policy, authorityGranted)` runs, then **if granted** `options.provider(task,providerDispatch)` is called.
- In `memory-provider-runtime.ts` each round builds **a different** `providerDispatch` from `round.request`, per-round maxGeneratedTokens and sometimes per-round outputProtocol, then reviews/reserves it and later calls `input.provider(input.task, providerDispatch)`.
- `application/storyteller/dispatch-authority.ts::retainsCapturedAuthority` returns false unless `task.resources.authority.kind === 'effective-usage-policy'` **and** `current` is non-null and deep-equal to the captured policy.
- `application/storyteller/budget.ts::dispatch` checks `if (!authorityGranted || account.stopped || !allowance.enabled || unknown)` and moves the attempt to `unsent` before any transport call.
- `packages/storyteller/src/providers/openrouter.ts` accepts `(task,dispatch)` and calls `providerDispatch(task,dispatch)`. It uses `buildOpenRouterRequest` and `JSON.stringify(request)` in both `inspectOpenRouterRequest` and the actual `fetch` transport.

## 2. Two distinct defects with different severity and reachability

| Finding | Observed source truth | Likely runtime implication | Confidence |
| --- | --- | --- | --- |
| **F-A: missing worker dispatch authority** | Worker bootstrap receives no `dispatchAuthority` through `readStorytellerWorkerOptions`; both normal and memory paths turn missing resolver into `null`; current authority predicate returns false | The **default live-enabled worker** cannot legally move a newly reserved attempt to real provider dispatch. It likely records `unsent`/`authority_unavailable` or a held/failure depending on stage | **High** source-level confidence; actual end-to-end still untested |
| **F-B: provider wrapper drops per-round dispatch** | Wrapper signature `async(task)` calls `provider(task)`, while execution and memory pass `(task, providerDispatch)` | **If a valid authority resolver is wired**, a normal repair attempt or memory round can send the original `task.request` and default output protocol/limit instead of the specific **reviewed and budgeted** round. Provider packet/source mismatch, wrong response contract and misleading forensic evidence possible | **High** conditional source-level confidence; not proven to reach transport in default wiring |

These issues interact. **Do not assert real users were charged for a mismatched packet**: F-A likely blocks normal transport first. Nor assert the absence of impact is guaranteed: test harnesses, custom worker composition or future fixes may supply authority and expose F-B immediately. The pair is a **pre-live release gate**.

### Why this matters for this observability program

The project already archives `storyteller_dispatch_review.packet`/SHA. A developer might inspect that packet and be certain it was what the provider received. If the wrapper throws away the per-round request, the stored packet can describe **one task** while the HTTP adapter sends **another**. That is *worse than missing logs*: it is **false forensic evidence**.

The underlying OpenRouter adapter itself uses a shared request builder/JSON serializer, a strength. The data is lost **one layer higher** at a composing wrapper, not inside the JSON schema serializer.

## 3. Secondary gap: raw provider response hooks not installed by default

`createOpenRouterProvider` exposes optional `recordResponse` (bounded original provider envelope with HTTP status, provider ID and request hash) and `recordDiagnostic` callbacks. `readStorytellerWorkerOptions` currently constructs the provider with only `{enabled:true, apiKey}` and provides neither callback.

Therefore default worker source does not prove **byte-exact rejected response-envelope custody**. It does persist some parsed output, usage and diagnostic state in generation/attempt/memory paths, but a complete historical raw response may not survive. This needs a separate protected storage/access policy, **not** an invitation to dump raw text in JSON stderr. It is **not** a reason to block all scripted/provider-disabled test work.

## 4. Required pre-live contract

**Invariant 1: effective usage authority.** Before reserving and dispatching a paid request, the worker must resolve **current server-owned, account/story-scoped effective usage policy** from authoritative source, independent of caller-provided task. It then compares the current policy to the captured task policy under existing `retainsCapturedAuthority`. Stale/changed policy denies; unavailable backend denies; approved unchanged policy may proceed subject to funding, account, recipe, attempt and provider limits.

**Invariant 2: exact envelope passthrough.** The worker's provider adapter forwards the **same `(task,dispatch)` pair** that was frozen for review and budget reservation, including per-round request, output protocol and max generated tokens. The policy check may validate `task.execution` but **must not rewrite or drop `dispatch`**.

**Invariant 3: transported request custody.** Immediately before the authenticated fetch, compute the actual serialised application body bytes and match `attemptId` + stored review packet hash/bytes. A mismatch is held/denied **before** a possible provider send, never reinterpreted as “review approved.” Authorization headers/API tokens remain excluded from evidence.

**Invariant 4: accounting and uncertainty.** A denied attempt is `unsent` with no provider work. A possibly dispatched attempt is `uncertain` until resolved, not free to retry. The same attempt/G/source operation identity is retained. No auto top-up, new paid test or provider rate change is authorized.

**Invariant 5: source provenance.** The effective policy resolver's decision is recorded as safe metadata (captured policy digest, current policy digest/revision, decision code, time and evaluator version) under proper staff access; **no raw payment/account/secret policy** leaks into logs.

## 5. Deterministic provider-disabled test matrix

| Test | Must demonstrate |
| --- | --- |
| Actual default bootstrap options, live enabled, valid mock execution+funding but missing authority | Source contract either explicitly denies as intended, or new resolver exists; **no external HTTP** |
| Approved story/account effective policy unchanged | Current authority grants exactly one **mock transport** invocation under original G/attempt; funding and model route remain governed |
| Captured vs current effective policy differ by one field | Denial, recorded `unsent`/safe reason, zero transport |
| Missing DB/account authority resolver, malformed policy, wrong owner | Fail closed, no fallback to static task or `STORYTELLER_EXECUTION_JSON` as spending authorization |
| Normal one-shot request (no override) | Reviewed body SHA equals mock transport body SHA |
| Repair request with distinct serialized messages/schema and reduced output budget | **Must send the repair request**, not original task request, and hash matches review |
| Memory exploration decision round with `round.request` and json-object protocol | Exact per-round body/response protocol and token limit matches reviewed/reserved envelope |
| Final memory round with different output schema/protocol | Exact round-specific packet, no stale prior request |
| Duplicate Temporal delivery / crashed worker after possible dispatch | Same attempt ID, no unauthorized second paid mock send |
| Provider response hook absent | No claim that byte-exact raw provider envelope was retained; parsed output/usage remain truth with appropriate coverage |
| Mock provider returns an uncertain timeout | Existing uncertain accounting, no fabricated zero-cost settlement |
| No account funding/stopped run | Zero mock transport and no privileged override |

**No paid calls, live API key or production funding should be necessary.** Use injected local transport with counters/captured body bytes. A unit test that directly calls `createOpenRouterProvider(task, dispatch)` but bypasses `readStorytellerWorkerOptions` **will not catch** F-B; test the **actual worker composition path**.

## 6. Scope and source ownership

**Implementation candidate:** [OBS00](../../../../../../work/changes/open/2026-11-15--obs00-live-provider-custody/CHANGE.md). Preserve current funding/usage gates, all task schemas, ENG03-C1/C2 capture, engine mechanics, provider adapter behavior and memory explorer rules. Do not solve by returning the task’s captured policy as “current authority”: that bypasses the very fence protecting against stale grants.

**Stop if:** the proper effective-policy read owner cannot be identified from existing account/story/settings/usage source without a larger authority redesign. In that case fix/pass-through safety separately while keeping paid sends denied; return a source-grounded proposal to owner instead of hardcoding “allow true”.

**Status:** P0 pre-live **design finding**, not a runtime-proven production incident. The owner has not authorized code modification. No new outbound provider work is permitted by this documentation.
