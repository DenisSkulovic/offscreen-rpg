# OBS00 | Composer dispatch: provider-disabled custody safety

**Baseline:** 584b594; **state:** OBS00-A source-observed, OBS00-B fail-closed only; OBS00-C transport equality NOT-RUN in this packet; paid live dispatch DENIED. T01 VERIFY PASS at `ec73a535` (12/12, no-key/no-live). **Model:** Composer Standard for all zero-spend tests. Canonical spend/authority: docs/technical/storyteller/provider-boundary.md.

**Existing source:** `packages/application/src/storyteller/config.ts:readStorytellerWorkerOptions` calls `wrapApprovedWorkerProvider` preserving the full `(task,dispatch)` override contract; absence of `dispatchAuthority` keeps live-path denied. `storyteller/execution.ts` handles uncertain/held attempts. Do not remove the failure gate because a test mock would be easier. No actual provider invoice or real request was verified in this Change.

## T01 | Contract verification without a billable transport | VERIFY PASS (`ec73a535`)
**Read:** `storyteller/config.ts`, `execution.ts`, `packages/application/test/` relevant provider/budget tests; existing [OBS00 preflight evidence](../../../../evidence/runs/observability-program-2026-11-15/live-worker-dispatch-preflight-2026-11-15.md). **Positive:** approved fake `StorytellerProviderDispatch` override arrives intact at test adapter; offline/scripted adapter makes no model HTTP request. **Negative:** missing authority refuses even when fake task has a provider field; timeout uncertain is not auto-repeated and no second charge reservation. Run only source-backed test scripts in an isolated fixture.

**Result (2026-11-20):** `pnpm --filter @offscreen/application exec node --test test/obs00-dispatch-forward.test.mjs test/obs00-b-fail-closed-authority.test.mjs test/memory-provider-runtime.test.mjs test/storyteller-loop-lifecycle.test.mjs` — **12/12**, 0 fail. No API key, no live provider HTTP, no paid dispatch. Reuses prior A/B/C program evidence where noted; this run does not execute OBS00-C wire-equality or mock-transport suites.

## T02 | Dispatch authority design / durable send policy | PLANNER-BLOCKED
No Cursor child invents an authorization token or “fixes” paid provider testing. The planner must fully specify reserved→dispatched→uncertain→settled identity, actor/budget enforcement and reject-on-unknown-ACK, then introduce tiny contract and SQL tasks under a separately selected risk Change. This is **not a prerequisite for scripted POC or K8S10**.

## T03 | Status receipt | DOC RECEIPT (2026-11-20)

**Result:** Recorded slice labels after T01 at `ec73a535`:

| Slice | Label | Basis |
| --- | --- | --- |
| **A** | source-observed | `obs00-dispatch-forward` (4/4) proves `(task, dispatch)` forwarding and worker options omit `dispatchAuthority` |
| **B** | fail-closed only | `obs00-b-fail-closed-authority` (2/2); no independent grant store; live `dispatchAuthority` not wired |
| **C** | NOT-RUN | Transport/wire-equality mock suites not in T01 command; do not treat OBS00-C packet closure as proven here |

**Setup:** no-key/no-live provider-free Node tests only (`memory-provider-runtime`, `storyteller-loop-lifecycle` included in 12/12). **Paid live dispatch:** DENIED. **Canonical spend owner:** [provider-boundary.md](../../../../docs/technical/storyteller/provider-boundary.md) — unchanged (T01 consistent with custody map; no edit).

**Blocker:** T02 planner-owned durable send policy and grant store remain **PLANNER-BLOCKED**; B live resolver absent; C deferred with B. Packet stays open; not Done. No Grok or live provider required for this receipt.
