# TURN04 | Composer-only preparation, live provider locked

**Baseline:** 584b594. **State:** Proposed, requires new explicit owner spend authority. **Model:** Composer Standard for any local prep; no Cursor agent gets permission to place a paid call from a design packet. **Prerequisite:** TURN03 complete provider-free real kind POC on same source/runtime path and an independent budget approval specifying model, ceiling, one-run scope.

**Source:** `packages/application/src/storyteller/{budget,config,execution,dispatch-review,provider-boundary}.ts` as available; `packages/db/src/schema/storyteller.ts` for attempt/funding, `apps/worker/src/bootstrap/main.ts`, `docs/technical/storyteller/provider-boundary.md`, `work/changes/open/2026-11-15--obs00-live-provider-custody/CHANGE.md`. Provider wire safety is NOT inferred from having a scripted result.

## T01 | Read-only spend authority fixture and fail-closed dry-run | PLANNER-READY, VERIFY ONLY
Under fake transport and disposable ledger, verify effective caps (microusd, token count), frozen task+source, unique attempt/reservation identity, refusal with missing dispatchAuthority, uncertain ACK hold, same saved-result publication path and redacted report. **Negative:** missing/expired approval, a second send after unknown outcome, hidden price fallback, untrusted usage, no provider key -> no outbound call. Use mock that throws before any network; assert exactly zero actual sends.

## T02 | Final protocol decision | **PLANNER-BLOCKED** UNTIL TRUE T01/TURN03
ChatGPT reconciles exact persisted reserve→dispatched→uncertain→settled procedure and model API idempotency limits. If one bridge missing, produce a small source-backed Composer PATCH contract plus approval/negative test. Do not let the child infer external exactly-once billing or introduce silent retries to make Temporal green.

## T03 | One actual live model continuation | **OWNER-LOCKED, NOT SELECTED**
Requires new explicit instruction with exact provider/model maximum charge, approved action, time and policy; record one actual request/response and uncertain state if ACK lost; no automatic retry or secret/log leak. A failed narrative does not invalidate fake systems proof. **No Grok price can be justified by this optional test.**
