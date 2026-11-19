# OBS00 | Composer dispatch: provider-disabled custody safety

**Baseline:** 584b594; **state:** OBS00-A landed, OBS00-B fail-closed evidence; paid dispatch still DENIED. **Model:** Composer Standard for all zero-spend tests. Canonical spend/authority: docs/technical/storyteller/provider-boundary.md.

**Existing source:** `packages/application/src/storyteller/config.ts:readStorytellerWorkerOptions` calls `wrapApprovedWorkerProvider` preserving the full `(task,dispatch)` override contract; absence of `dispatchAuthority` keeps live-path denied. `storyteller/execution.ts` handles uncertain/held attempts. Do not remove the failure gate because a test mock would be easier. No actual provider invoice or real request was verified in this Change.

## T01 | Contract verification without a billable transport | PLANNER-READY, VERIFY
**Read:** `storyteller/config.ts`, `execution.ts`, `packages/application/test/` relevant provider/budget tests; existing [OBS00 preflight evidence](../../../../evidence/runs/observability-program-2026-11-15/live-worker-dispatch-preflight-2026-11-15.md). **Positive:** approved fake `StorytellerProviderDispatch` override arrives intact at test adapter; offline/scripted adapter makes no model HTTP request. **Negative:** missing authority refuses even when fake task has a provider field; timeout uncertain is not auto-repeated and no second charge reservation. Run only source-backed test scripts in an isolated fixture.

## T02 | Dispatch authority design / durable send policy | PLANNER-BLOCKED
No Cursor child invents an authorization token or “fixes” paid provider testing. The planner must fully specify reserved→dispatched→uncertain→settled identity, actor/budget enforcement and reject-on-unknown-ACK, then introduce tiny contract and SQL tasks under a separately selected risk Change. This is **not a prerequisite for scripted POC or K8S10**.

## T03 | Status receipt | PLANNER-READY
Mark A observed, B only fail-closed, C NOT-RUN, exact no-key/no-live setup and tests. No Grok agent or live provider required.
