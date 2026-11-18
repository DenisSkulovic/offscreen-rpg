# OBS00 | Repair default worker live authority and preserve the reviewed request envelope

**2026-11-18 executable decision:** [Backlog audit and acceptance](../../../designs/open/backlog-convergence-2026-11-18/README.md); [bounded contract choices](../../../designs/open/backlog-convergence-2026-11-18/CONTRACT-DECISIONS.md); [ordered Cursor handoff](../../../designs/open/backlog-convergence-2026-11-18/CURSOR-HANDOFF.md). The older Proposed/Blocked/No-code declarations retained below document the historical decision; they do not prohibit the **safe scoped implementation** now selected. External paid dispatch, nondisposable DB resets, production grants and irreversible accounting changes remain disallowed. A provider-free experiment that proves no new feature is needed must close with a source-backed positive alternative, not be parked again.

**State:** OBS00-A Done; OBS00-B Ready for fail-closed independent authority source and mock transport implementation (2026-11-18); live paid dispatch still DENIED.

**Source evidence:** [live-worker wiring preflight](../../../../evidence/runs/observability-program-2026-11-15/live-worker-dispatch-preflight-2026-11-15.md). **A proof:** [obs00-a](../../../../evidence/runs/observability-program-2026-11-15/obs00-a-dispatch-forward-2026-11-15.md). **Related contracts:** [prompt exactness](../../../../docs/technical/observability/identities-and-evidence.md), [capture failure semantics](../../../../docs/technical/observability/capture-and-provenance.md), [private storage](../../../../docs/technical/observability/retention-and-access.md).

## Cursor first screen

> Source confirmed at `main@7e15db38`: `readStorytellerWorkerOptions` currently supplies `provider: async(task) => provider(task)`, discarding `StorytellerProviderDispatch` overrides. It also doesn't supply `dispatchAuthority`, so `retainsCapturedAuthority(task,null)` returns false and `budget.dispatch` denies new paid sends. The **default live worker is therefore likely to block** all legal provider work; after wiring authority, the dropped request can create a reviewed-versus-sent packet mismatch on repair/memory rounds.
>
> **No user-owned provider record or real charge was inspected.** No assertion of actual paid mismatch. A source-level contract with mock transport must prove reachability and fix.

## Bounded changes, separated by security boundary

### A. Preserve exact provider override — **Done (2026-11-15)**

At `packages/application/src/storyteller/config.ts` the worker adapter conforms to `StorytellerProvider`'s full `(task,dispatch)` signature via `wrapApprovedWorkerProvider` and forwards **both** unmodified to the underlying `createOpenRouterProvider`. Keeps the static worker `task.execution`-vs-approved-`STORYTELLER_EXECUTION_JSON` check; never silently substitutes `task.request` or default output settings when a frozen per-round dispatch override exists.

**Negative proven:** mismatched execution fails before provider; repair dispatch body identity is distinct from `task.request`; live options omit `dispatchAuthority`.

### B. Restore independent current usage authority — **Blocked**

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

### C. Assert serialized packet equality at the real transport boundary — deferred with B

The underlying OpenRouter adapter's `buildOpenRouterRequest` and `JSON.stringify` are shared between `inspectOpenRouterRequest` and `fetch`. Avoid a new serializer. Instead provide a **mock transport assertion** that the full credential-free request body SHA/byte length matches the reviewed packet for the same exact `attemptId` and round. Include both one-shot and memory-round selected output protocol, repair request and generated token limits.

An optional production safety fence can check exact packet identity pre-send if verified cheap and authoritative; avoid introducing another remote fetch under a story lock or an attempt mutation that changes spend accounting. Never capture `Authorization` header, credential or API key in evidence.

## Required provider-disabled tests (A coverage)

1. **Normal default worker config**: with live flag and dummy key, composition includes a provider wrapper that forwards both `task` and `dispatch`. No real external network. **Proven (A).**
2. **Current authority absent**: no `dispatchAuthority` means paid path stays gated; cannot interpret static worker JSON as permission. **Proven omit (A); full unsent hold path remains B/C.**
3–6, 9–10: require B authority + mock transport at OpenRouter boundary — **blocked with B**.
7. **Wrapper object type regression**: explicit forwarded-call fixture. **Proven (A).**
8. **Wrong worker execution policy**: fail before transport. **Proven (A).**

## Exclusions and status discipline

- No new prompt instructions, Storyteller schema/agent orchestration, ENG03 capture redesign, Admin S3 access, production retention migration or paid evaluation.
- No change to provider selection/limits or loosening `budget.dispatch`. This packet restores **dispatch forwarding**; it does **not** grant spending.
- No automatic migration of previously `unsent`/`uncertain` attempts into new paid sends without explicit existing recovery gate.
- OBS00-B remains explicitly blocked pending independent server-owned authority sources.

**A Done; B not Ready.** Paid/provider launch still gated on OBS00-B.
