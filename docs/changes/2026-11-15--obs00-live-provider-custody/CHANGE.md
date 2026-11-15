# OBS00 | Repair default worker live authority and preserve the reviewed request envelope

**State: Proposed, design specified, NOT Ready.** **Severity:** P0 pre-live correctness and forensic integrity. **Scope:** provider composition contract + server-authority source validation + provider-disabled mock transport tests. **No actual paid dispatch, production funding, model prompts or game engine changes authorized.** This packet takes precedence over OBS01 **for launch readiness**, not because it has more immediate UI value.

**Source evidence:** [live-worker wiring preflight](../../observability/evidence/live-worker-dispatch-preflight-2026-11-15.md). **Related contracts:** [prompt exactness](../../observability/technical/storyteller-prompt-source-map-v1.md), [capture failure semantics](../../observability/technical/capture-transaction-protocol.md), [private storage](../../observability/technical/protected-artifact-store-v1.md).

## Cursor first screen

> Source confirmed at `main@7e15db38`: `readStorytellerWorkerOptions` currently supplies `provider: async(task) => provider(task)`, discarding `StorytellerProviderDispatch` overrides. It also doesn't supply `dispatchAuthority`, so `retainsCapturedAuthority(task,null)` returns false and `budget.dispatch` denies new paid sends. The **default live worker is therefore likely to block** all legal provider work; after wiring authority, the dropped request can create a reviewed-versus-sent packet mismatch on repair/memory rounds.
>
> **No user-owned provider record or real charge was inspected.** No assertion of actual paid mismatch. A source-level contract with mock transport must prove reachability and fix.

## Bounded changes, separated by security boundary

### A. Preserve exact provider override (simple, independent correction)

At `packages/application/src/storyteller/config.ts` the worker adapter must conform to `StorytellerProvider`'s full `(task,dispatch)` signature and forward **both** unmodified to the underlying `createOpenRouterProvider`. Keep the static worker `task.execution`-vs-approved-`STORYTELLER_EXECUTION_JSON` check, but never silently substitute `task.request` or default output settings when a frozen per-round dispatch override exists.

**Negative:** if caller passes repair request R but worker sends original task.request T, the mock-transport equality test must fail. A provider override with custom per-round `maxGeneratedTokens` or `outputProtocol` must survive.

**Do not “fix” mismatched hashes by re-writing `storyteller_dispatch_review.packet` after the send.** Persisted review/source history must reflect the actual admitted packet before transport.

### B. Restore independent current usage authority (security-critical; may need own subpacket)

**Do not hardcode `dispatchAuthority: async()=>task.resources.authority.policy` or `true`.** `retainsCapturedAuthority` is specifically designed to compare captured creative/usage authority to current effective policy. A task snapshot is **not** independent authority, and an environment route string alone isn't entitlement.

Before implementing a live resolver, identify actual persistent server-owned sources of **platform policy, account/entitlement profile, active restrictions, route and funding mode**. `packages/application/src/storyteller/usage-policy-resolution.ts::resolveEffectiveUsagePolicy` is a pure intersection helper; this source inspection did **not** find a ready-to-use current-authority DB resolver wired in worker bootstrap. If those policy sources cannot be loaded independently and safely from the current system, leave provider dispatch **denied** and record the missing authority integration as a separate explicit blocker.

**Candidate resolver contract:**

~~~ts
loadCurrentDispatchAuthority({
  storyId, generationId, ownerId,
  requestedAccountId, requestedRunId,
  capturedEffectivePolicyVersion
}): Promise<
  { kind: 'allowed'; current: EffectiveUsagePolicy; evaluatorVersion: string }
  | { kind: 'denied'; reason: SafeReasonCode }
>
~~~

The resolver must verify **actual story/account ownership and current entitlement**, not accept caller-provided IDs as authority. It evaluates current platform/account policy and restrictions (including a terminated/paused account), funding run and permitted route. Only an independently computed current effective policy equal to the captured task policy may pass `retainsCapturedAuthority`. `budget.dispatch` still separately enforces allowance stopped/enabled/uncertain gates.

**Source compatibility:** `story.usagePolicy` might hold a captured effective policy, not current independent entitlement. Reading that unchanged would not detect a revoked entitlement. Check all actual policy owners and update semantics before selecting B's implementation. If B expands into full auth/billing redesign, implement A as a **separately authorized narrow fix** and keep B blocked rather than bypass security.

### C. Assert serialized packet equality at the real transport boundary

The underlying OpenRouter adapter's `buildOpenRouterRequest` and `JSON.stringify` are shared between `inspectOpenRouterRequest` and `fetch`. Avoid a new serializer. Instead provide a **mock transport assertion** that the full credential-free request body SHA/byte length matches the reviewed packet for the same exact `attemptId` and round. Include both one-shot and memory-round selected output protocol, repair request and generated token limits.

An optional production safety fence can check exact packet identity pre-send if verified cheap and authoritative; avoid introducing another remote fetch under a story lock or an attempt mutation that changes spend accounting. Never capture `Authorization` header, credential or API key in evidence.

## Required provider-disabled tests

1. **Normal default worker config**: with live flag and dummy key, the actual composition includes a provider wrapper that forwards both `task` and `dispatch`. No real external network.
2. **Current authority absent**: no `dispatchAuthority` means no outgoing mock transport, attempt remains unsent/held per source; cannot interpret static worker JSON as permission.
3. **Current authority matched**, fully server-owned validated fixture: one allowed mock send with exact reviewed SHA/attempt, one budget dispatch; no extra G/roll/effect.
4. **Current authority revoked/route removed/limit tightened**: fail closed with exactly one denied attempt, no request send and safe reason.
5. **Non-memory repair attempt**: review/transport request body includes the repair messages/schema, **not** original `task.request`; correct smaller token ceiling.
6. **Memory decision vs final round**: the two actual request bodies/output schemas/protocols match their respective `prepareDispatchReview` packet and `budget.reserve` input. Distinct round attempt IDs; no fake same packet reuse.
7. **Wrapper object type regression**: TypeScript contract test ensures provider wrapper can't silently omit second argument via structural function assignability; use an explicit forwarded-call fixture, not a type assertion alone.
8. **Wrong worker execution policy**: fail before transport, with an explainable safe error; no fallback to current task JSON.
9. **Provider uncertain mock response**: existing accounting remains uncertain, no automatic second paid send, no misreporting zero charge.
10. **No response hooks configured**: report raw provider-envelope content retention **unverified**, without claiming it exists in `generation.output` if parsing/validation fails.

**Required proof:** exact source SHA, compile + focused provider-disabled worker-composition test, two distinct reviewed/transport body hashes for two different round requests, one observed allowed mock path with independently computed current authority, one denied path, no external HTTP, no paid key, no funding side effects outside a disposable DB, and a summary of existing in-flight compatibility.

## Exclusions and status discipline

- No new prompt instructions, Storyteller schema/agent orchestration, ENG03 capture redesign, Admin S3 access, production retention migration or paid evaluation.
- No change to provider selection/limits or loosening `budget.dispatch`. This packet is intended to **restore existing intended authorization**, not grant spending.
- No automatic migration of previously `unsent`/`uncertain` attempts into new paid sends without explicit existing recovery gate.
- If source has changed since this audit, stop and re-evaluate exact symbols/affected test evidence.

**Ready only after:** owner explicitly selects OBS00 or a narrower A-only packet; proper independent server authority source is mapped and security-approved for B; test environment and no-network constraints verified; no conflicting work active. The default position remains **provider denied**, not permissive guessing.
