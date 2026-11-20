# OBS00 | Repair default worker live authority and preserve the reviewed request envelope

**Composer microtask entry (2026-11-20):** [TASKS.md](TASKS.md) has the source-backed, bounded `T01…` route, normal and negative tests and explicit stop gates; [full open-backlog audit](../../../../COMPOSER-QUEUE-AUDIT-2026-11-20.md) explains priority/ownership. **Default Cursor parent and child: Composer 2.5 Standard.** Current delegation: provider-disabled safety tests only; live paid dispatch remains DENIED. A planned `T-ID` is **not** selection, implementation, PASS or lifecycle promotion; this Change's existing state and authorization restrictions still govern. No Grok unless a newly identified, specifically owner-approved exception survives additional ChatGPT investigation.

**2026-11-18 executable decision:** [Backlog audit and acceptance](../../../../../../work/designs/open/backlog-convergence-2026-11-18/README.md); [bounded contract choices](../../../../../../work/designs/open/backlog-convergence-2026-11-18/CONTRACT-DECISIONS.md); [ordered Cursor handoff](../../../../../../work/designs/open/backlog-convergence-2026-11-18/CURSOR-HANDOFF.md). The older Proposed/Blocked/No-code declarations retained below document the historical decision; they do not prohibit the **safe scoped implementation** now selected. External paid dispatch, nondisposable DB resets, production grants and irreversible accounting changes remain disallowed. A provider-free experiment that proves no new feature is needed must close with a source-backed positive alternative, not be parked again.

**State:** **Done (2026-11-20) for the provider-free live-provider custody goal:** OBS00-A Done; OBS00-C Done in its archived Nov 15 packet (15/15 mock transport, no paid HTTP); OBS00-B independent SQL grant store, `loadCurrentDispatchAuthority`, and atomic `budget.dispatch` recheck **implemented and reconciled** (T02–T06). **Completed security capability is not operator-approved paid activation:** no production grant is seeded, default `readStorytellerWorkerOptions` still omits `dispatchAuthority`, the distributed executor remains `ProviderModeRefused`, and **TURN04 / live send are not Done**. Default live paid dispatch remains DENIED; TURN02 stays selected. Zero provider HTTP across recorded proof.

**Source evidence:** [live-worker wiring preflight](../../../../../../evidence/runs/observability-program-2026-11-15/live-worker-dispatch-preflight-2026-11-15.md). **A proof:** [obs00-a](../../../../../../evidence/runs/observability-program-2026-11-15/obs00-a-dispatch-forward-2026-11-15.md). **Related contracts:** [prompt exactness](../../../../../../docs/technical/observability/identities-and-evidence.md), [capture failure semantics](../../../../../../docs/technical/observability/capture-and-provenance.md), [private storage](../../../../../../docs/technical/observability/retention-and-access.md).

**Current closeout reconciliation (2026-11-20):** OBS00-C is [already Done and archived](../2026-11-15--obs00-c-provider-wire-equality/CHANGE.md), backed by [15/15 mock-transport receipt](../../../../../../evidence/runs/observability-program-2026-11-15/obs00-c-provider-wire-equality-2026-11-15.md). The older "C deferred/NOT-RUN" clauses below are **historical statements about that local parent test command**, not implementation status. **B is implemented:** independent current owner/platform/grant and route stored in SQL, rechecked under `budget.dispatch` locks before `reserved→dispatched`. The old pre-transaction Boolean `authorityGranted` was the revocation race; [the decision](DECISION-2026-11-20.md) is the contract that landed. Distributed executor remains scripted-only. No real paid provider activation authorized.

## Cursor first screen

> Source confirmed at `main@7e15db38`: `readStorytellerWorkerOptions` currently supplies `provider: async(task) => provider(task)`, discarding `StorytellerProviderDispatch` overrides. It also doesn't supply `dispatchAuthority`, so `retainsCapturedAuthority(task,null)` returns false and `budget.dispatch` denies new paid sends. The **default live worker is therefore likely to block** all legal provider work; after wiring authority, the dropped request can create a reviewed-versus-sent packet mismatch on repair/memory rounds.
>
> **No user-owned provider record or real charge was inspected.** No assertion of actual paid mismatch. A source-level contract with mock transport must prove reachability and fix.

## Bounded changes, separated by security boundary

### A. Preserve exact provider override — **Done (2026-11-15)**

At `packages/application/src/storyteller/config.ts` the worker adapter conforms to `StorytellerProvider`'s full `(task,dispatch)` signature via `wrapApprovedWorkerProvider` and forwards **both** unmodified to the underlying `createOpenRouterProvider`. Keeps the static worker `task.execution`-vs-approved-`STORYTELLER_EXECUTION_JSON` check; never silently substitutes `task.request` or default output settings when a frozen per-round dispatch override exists.

**Negative proven:** mismatched execution fails before provider; repair dispatch body identity is distinct from `task.request`; live options omit `dispatchAuthority`.

### B. Restore independent current usage authority — **Done (2026-11-20, provider-free)**

**Do not hardcode `dispatchAuthority: async()=>task.resources.authority.policy` or `true`.** `retainsCapturedAuthority` compares captured creative/usage authority to an independently supplied current policy. `retainsIndependentCurrentAuthority` is the resolution-shaped check: a missing current resolution, a denied resolution (revoked or disabled entitlement, route, or funding), and any unequal policy are denied. Deep equality is the only allow. A task snapshot is **not** an input to that check, and an environment route string alone isn't entitlement.

**Implemented (branch `change/obs00-b-current-authority`, T02–T05):** migrations `0016`/`0017` add disabled-by-default `storyteller_current_platform_policy` and `storyteller_current_owner_grant`. `loadCurrentDispatchAuthority` runs inside `budget.dispatch` after advisory lock `714092631` and the funding, run, attempt, and operation locks. A true callback alone is insufficient; a missing grant releases reserved allocations as unsent. `startRuntime` installs `createGenerationDispatchAuthorityReader` only when a provider is configured and the caller did not pass `dispatchAuthority`; `readStorytellerWorkerOptions` still omits it. The distributed executor still throws `ProviderModeRefused` with no SQL grant reader. No production grant is seeded. Captured `story.usage_policy` remains a snapshot, not current entitlement.

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
**A and B security slices Done; operator live send is not Done.** Paid launch stays gated without spending approval and enabled grants. Provider-free proof: parent dispatch integration **7/0** on `offscreen_db_test`; T05 pure A/B **7/0**, application OBS00 DB **22/0**, OBS00-C wire **15/15**; zero provider HTTP. Negatives retained: a funding row or captured usage policy alone does not dispatch; `dispatchAuthority: async () => true` with no grant stays unsent; distributed executor stays `ProviderModeRefused`.

## Planned specification and implementation delta | planned-impact.v1

| Plane | Selected authority and exact change/no-op | Related documents/maps to inspect | Evidence/decision |
| --- | --- | --- | --- |
| Product | unchanged because this slice does not grant spending, change a player rule, or enable a live provider | docs/product/storyteller/profiles-and-settings.md | Creative settings stay distinct from entitlement |
| Technical | changed: `spending-and-entitlements.md#distinct-authorities` and `provider-boundary.md` status + Attempt custody now describe the SQL grant store and dispatch recheck; live paid send still separately gated | docs/technical/platform/spending-and-entitlements.md#distinct-authorities; docs/technical/storyteller/provider-boundary.md | Provider-free security Done; not paid activation |
| Code | changed: migrations 0014/0015, `load-current-dispatch-authority.ts`, `read-generation-dispatch-authority.ts`, `budget.dispatch`, `startRuntime` authority install, OBS00 B integration tests | packages/application + packages/db + apps/worker runtime | 7/0 dispatch integration; 7/0 + 22/0 + 15/15 mock suites; 0 HTTP |
| Related | unchanged convergence contracts; OBS00-C already archived Done | work/designs/open/backlog-convergence-2026-11-18/CONTRACT-DECISIONS.md | TURN04 live send still unselected |

## Reconciliation ledger

| Affected selected claim/heading | Authority | Target delta (changed/unchanged; reason) | Source delta & inspected SHA | Status/evidence tier | Negative proof | Map/link update or N/A |
| --- | --- | --- | --- | --- | --- | --- |
| docs/technical/platform/spending-and-entitlements.md#distinct-authorities | technical | changed: funding balance and captured `story.usage_policy` are not entitlements; disabled-by-default platform policy + owner grant; atomic `budget.dispatch` recheck | `packages/db/migrations/0016_obs00_current_authority.sql`, `0017_obs00_dispatch_authority_audit.sql`, `load-current-dispatch-authority.ts`, `budget.ts` @ 6a7d4492 | fixture-tested + disposable SQL | empty DB denies; funding row or snapshot alone does not dispatch | link to archived packet |
| docs/technical/storyteller/provider-boundary.md#attempt-custody-and-an-unknown-call | technical | changed: SQL recheck exists; env worker omits callback; distributed executor `ProviderModeRefused`; live send still separate | `provider-boundary.md`, `config.ts`, `storyteller-distributed-execution.ts` @ 6a7d4492 | source-observed | default worker still no `dispatchAuthority`; TURN04 not done | links Distinct authorities |
| packages/application/src/storyteller/load-current-dispatch-authority.ts | code | changed: DB-backed current authority loader | branch `change/obs00-b-current-authority` @ 6a7d4492 | disposable SQL | wrong owner/run/route/profile denies | `obs00-b-current-authority-loader.integration.test.mjs` |
| packages/application/src/storyteller/budget.ts | code | changed: `dispatch` owns SQL authority recheck before `reserved→dispatched` | `budget.ts` @ 6a7d4492 | disposable SQL 7/0 | missing grant → unsent; true callback without grant denied | `obs00-b-dispatch-authority.integration.test.mjs` |
| apps/worker `startRuntime` / distributed executor | code | changed: conditional authority reader install; executor still refuses provider mode | `apps/worker/src/runtime/index.ts`, `storyteller-distributed-execution.ts` @ 6a7d4492 | integration 22/0 + 15/15 wire | distributed path has no SQL grant reader | T05 receipt in TASKS.md |
