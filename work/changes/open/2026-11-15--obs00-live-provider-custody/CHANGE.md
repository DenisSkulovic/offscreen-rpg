# OBS00 | Repair default worker live authority and preserve the reviewed request envelope

**Composer microtask entry (2026-11-20):** [TASKS.md](TASKS.md) has the source-backed, bounded `T01…` route, normal and negative tests and explicit stop gates; [full open-backlog audit](../../COMPOSER-QUEUE-AUDIT-2026-11-20.md) explains priority/ownership. **Default Cursor parent and child: Composer 2.5 Standard.** Current delegation: provider-disabled safety tests only; live paid dispatch remains DENIED. A planned `T-ID` is **not** selection, implementation, PASS or lifecycle promotion; this Change's existing state and authorization restrictions still govern. No Grok unless a newly identified, specifically owner-approved exception survives additional ChatGPT investigation.

**2026-11-18 executable decision:** [Backlog audit and acceptance](../../../designs/open/backlog-convergence-2026-11-18/README.md); [bounded contract choices](../../../designs/open/backlog-convergence-2026-11-18/CONTRACT-DECISIONS.md); [ordered Cursor handoff](../../../designs/open/backlog-convergence-2026-11-18/CURSOR-HANDOFF.md). The older Proposed/Blocked/No-code declarations retained below document the historical decision; they do not prohibit the **safe scoped implementation** now selected. External paid dispatch, nondisposable DB resets, production grants and irreversible accounting changes remain disallowed. A provider-free experiment that proves no new feature is needed must close with a source-backed positive alternative, not be parked again.

**State:** **OPEN: OBS00-A DONE; OBS00-C DONE in its own archived Nov 15 packet (15/15 mock transport, no paid HTTP); OBS00-B current independent SQL grant/atomic dispatch NOT IMPLEMENTED.** Parent T01's 12/12 (2026-11-20) did not rerun C, which is a narrower test-scope fact, not C's status. [Source-backed B contract](DECISION-2026-11-20.md) and [bounded T02–T06 tasks](TASKS.md) resolve the former planner gate, implementation still unselected. Default live paid dispatch remains DENIED; TURN02 stays selected. No runtime tests/grants/provider sends were performed by this planning audit.

**Source evidence:** [live-worker wiring preflight](../../../../evidence/runs/observability-program-2026-11-15/live-worker-dispatch-preflight-2026-11-15.md). **A proof:** [obs00-a](../../../../evidence/runs/observability-program-2026-11-15/obs00-a-dispatch-forward-2026-11-15.md). **Related contracts:** [prompt exactness](../../../../docs/technical/observability/identities-and-evidence.md), [capture failure semantics](../../../../docs/technical/observability/capture-and-provenance.md), [private storage](../../../../docs/technical/observability/retention-and-access.md).

**Current closeout reconciliation (2026-11-20):** OBS00-C is [already Done and archived](../../archive/2026-11/observability/2026-11-15--obs00-c-provider-wire-equality/CHANGE.md), backed by [15/15 mock-transport receipt](../../../../evidence/runs/observability-program-2026-11-15/obs00-c-provider-wire-equality-2026-11-15.md). The older "C deferred/NOT-RUN" clauses below are **historical statements about that local parent test command**, not implementation status. **Only B remains:** independent current owner/platform/grant and route stored in SQL, rechecked under `budget.dispatch` locks before `reserved→dispatched`. Its old pre-transaction Boolean `authorityGranted` is a revocation race even when a resolver is installed; [new decision](DECISION-2026-11-20.md) specifies the atomic boundary. Distributed executor remains scripted-only. No real paid provider activation authorized.

## Cursor first screen

> Source confirmed at `main@7e15db38`: `readStorytellerWorkerOptions` currently supplies `provider: async(task) => provider(task)`, discarding `StorytellerProviderDispatch` overrides. It also doesn't supply `dispatchAuthority`, so `retainsCapturedAuthority(task,null)` returns false and `budget.dispatch` denies new paid sends. The **default live worker is therefore likely to block** all legal provider work; after wiring authority, the dropped request can create a reviewed-versus-sent packet mismatch on repair/memory rounds.
>
> **No user-owned provider record or real charge was inspected.** No assertion of actual paid mismatch. A source-level contract with mock transport must prove reachability and fix.

## Bounded changes, separated by security boundary

### A. Preserve exact provider override — **Done (2026-11-15)**

At `packages/application/src/storyteller/config.ts` the worker adapter conforms to `StorytellerProvider`'s full `(task,dispatch)` signature via `wrapApprovedWorkerProvider` and forwards **both** unmodified to the underlying `createOpenRouterProvider`. Keeps the static worker `task.execution`-vs-approved-`STORYTELLER_EXECUTION_JSON` check; never silently substitutes `task.request` or default output settings when a frozen per-round dispatch override exists.

**Negative proven:** mismatched execution fails before provider; repair dispatch body identity is distinct from `task.request`; live options omit `dispatchAuthority`.

### B. Restore independent current usage authority — **fail-closed check only; live dispatch still denied**

**Do not hardcode `dispatchAuthority: async()=>task.resources.authority.policy` or `true`.** `retainsCapturedAuthority` compares captured creative/usage authority to an independently supplied current policy. `retainsIndependentCurrentAuthority` is the resolution-shaped check: a missing current resolution, a denied resolution (revoked or disabled entitlement, route, or funding), and any unequal policy are denied. Deep equality is the only allow. A task snapshot is **not** an input to that check, and an environment route string alone isn't entitlement.

**Missing live source (2026-11-19):** `packages/db` has no platform-policy, entitlement, restriction, or funding-grant table. The only persisted usage document is `story.usage_policy` (`packages/db/src/schema/stories.ts`), and that column is a captured snapshot. `resolveEffectiveUsagePolicy` intersects profiles the caller already holds; it does not load them. No worker bootstrap reads a current grant. This slice does not invent that store and does not wire a live call. `readStorytellerWorkerOptions` still omits `dispatchAuthority`, so paid dispatch stays denied.

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
- OBS00-B's live resolver remains absent. The fail-closed comparison is recorded, and paid dispatch stays denied until an independent server-owned authority source exists.

**A Done; B's live dispatch is not Done.** Paid launch stays gated. The proof is `packages/application/test/obs00-b-fail-closed-authority.test.mjs` against `packages/application/src/storyteller/dispatch-authority.ts`. A revoked entitlement is denied. An equal independently supplied current policy is the only allow. The task snapshot with no current resolution is denied. The default worker still omits `dispatchAuthority`.

`node --test packages/application/test/obs00-b-fail-closed-authority.test.mjs` passed 2 tests and failed 0 without a provider call. The negative case is a disabled entitlement (`policy_disabled`), a null current resolution, a tightened limit, and a changed profile revision, each denied while the captured snapshot is still present. Live dispatch stays denied because no independent grant store exists.

## Planned specification and implementation delta | planned-impact.v1

| Plane | Selected authority and exact change/no-op | Related documents/maps to inspect | Evidence/decision |
| --- | --- | --- | --- |
| Product | unchanged because this slice does not grant spending, change a player rule, or enable a live provider | docs/product/storyteller/profiles-and-settings.md | Creative settings stay distinct from entitlement |
| Technical | unchanged because current entitlement must still be rechecked, and this slice does not add a grant store | docs/technical/platform/spending-and-entitlements.md#distinct-authorities | Live dispatch stays denied |
| Code | changed: packages/application/src/storyteller/dispatch-authority.ts denies a missing, revoked, or changed entitlement. Negative: a task snapshot is not current authority, and the worker still rejects paid dispatch by omitting dispatchAuthority | packages/application/src/storyteller/dispatch-authority.ts | Provider-free unit test; no live resolver |
| Related | unchanged because mock transport and the live authority store stay outside this slice | work/designs/open/backlog-convergence-2026-11-18/CONTRACT-DECISIONS.md | OBS00-C remains deferred |

## Reconciliation ledger

| Affected selected claim/heading | Authority | Target delta (changed/unchanged; reason) | Source delta & inspected SHA | Status/evidence tier | Negative proof | Map/link update or N/A |
| --- | --- | --- | --- | --- | --- | --- |
| docs/technical/platform/spending-and-entitlements.md#distinct-authorities | technical | unchanged because entitlement, funding, and recipe stay distinct and this slice adds no grant | packages/application/src/storyteller/dispatch-authority.ts at baf75f03 | source-observed | a disabled entitlement does not become a current policy | the heading stayed in place |
| docs/technical/storyteller/provider-boundary.md#attempt-custody-and-an-unknown-call | technical | unchanged because dispatch stays a separate denied transition and this slice does not release a packet | packages/application/src/storyteller/config.ts at ec73a535 (T01 12/12) | source-observed | live worker options still omit dispatchAuthority | the heading stayed in place |
| packages/application/src/storyteller/dispatch-authority.ts | code | changed: an independent current resolution must deep-equal the captured policy or the check denies | packages/application/src/storyteller/dispatch-authority.ts at baf75f03 | fixture-tested | a revoked resolution and a changed revision are denied while the snapshot remains | packages/application/test/obs00-b-fail-closed-authority.test.mjs |
| packages/application/test/obs00-b-fail-closed-authority.test.mjs | code | changed: the provider-free test is the only allow proof for an equal current policy | packages/application/test/obs00-b-fail-closed-authority.test.mjs | fixture-tested | missing, revoked, and changed inputs are denied and the worker supplies no authority callback | the test file is the new proof |
