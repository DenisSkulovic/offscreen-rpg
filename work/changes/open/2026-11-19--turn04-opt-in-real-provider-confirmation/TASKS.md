# TURN04 | Composer-only preparation, live provider locked

**Baseline:** 584b594. **State:** Proposed; **T01 VERIFY PASS** at `ec73a535` (zero-spend overlap + integration slices); requires new explicit owner spend authority for any live send. **Model:** Composer Standard for any local prep; no Cursor agent gets permission to place a paid call from a design packet. **Prerequisite:** TURN03 complete provider-free real kind POC on same source/runtime path and an independent budget approval specifying model, ceiling, one-run scope.

**Source:** `packages/application/src/storyteller/{budget,config,execution,dispatch-review,provider-boundary}.ts` as available; `packages/db/src/schema/storyteller.ts` for attempt/funding, `apps/worker/src/bootstrap/main.ts`, `docs/technical/storyteller/provider-boundary.md`, `work/changes/open/2026-11-15--obs00-live-provider-custody/CHANGE.md`. Provider wire safety is NOT inferred from having a scripted result.

## T01 | Read-only spend authority fixture and fail-closed dry-run | VERIFY PASS (`ec73a535`)
Under fake transport and disposable ledger, verify effective caps (microusd, token count), frozen task+source, unique attempt/reservation identity, refusal with missing dispatchAuthority, uncertain ACK hold, same saved-result publication path and redacted report. **Negative:** missing/expired approval, a second send after unknown outcome, hidden price fallback, untrusted usage, no provider key → no outbound call. Use mock that throws before any network; assert exactly zero actual sends.

**Result (2026-11-20):**

| Tier | Command / scope | Outcome |
| --- | --- | --- |
| Overlap (prior) | OBS00 / application budget custody units shared with this gate — **no dedicated TURN04 fixture file** | **23/23 PASS**, **zero actual provider sends** |
| Integration retry | `tools/api-integration/test/storyteller-provider-budget.integration.js` | **3/3 PASS** (~3.8s); `STORYTELLER_LIVE_ENABLED=false`; Nest harness on **3001**, then port freed |
| Integration retry | `tools/api-integration/test/storyteller-provider-recovery.integration.js` | **4/4 PASS**; `dispatchAuthority: () => null` refuses until restored; **`unsentCalls === 0`** while authority absent |

**Proven at HEAD:** shared cap / duplicate settlement (budget slice); fake-provider accounting and unknown dispatch not repeated; missing `dispatchAuthority` fail-closed with no outbound calls in exercised paths; no API key / no live HTTP in these runs.

**NOT-RUN in this receipt:** **hidden price fallback**, **untrusted usage** negatives, and a **dedicated TURN04-named fixture** (overlap reuses OBS00/budget suites only). Do not treat overlap PASS as exhaustive T01 negative coverage.

**Setup:** provider-free, zero-spend only. **Paid live dispatch:** DENIED. **Canonical spend owner:** [provider-boundary.md](../../../../docs/technical/storyteller/provider-boundary.md) — unchanged (no edit unless a sentence is false).

## T02 | Final protocol decision | **PLANNER-BLOCKED**
ChatGPT reconciles exact persisted reserve→dispatched→uncertain→settled procedure and model API idempotency limits. If one bridge missing, produce a small source-backed Composer PATCH contract plus approval/negative test. Do not let the child infer external exactly-once billing or introduce silent retries to make Temporal green. T01 overlap does not unblock T02.

## T03 | One actual live model continuation | **OWNER-LOCKED, NOT AUTHORIZED**
Requires new explicit instruction with exact provider/model maximum charge, approved action, time and policy; record one actual request/response and uncertain state if ACK lost; no automatic retry or secret/log leak. A failed narrative does not invalidate fake systems proof. **No Grok price can be justified by this optional test.** T01 PASS does **not** authorize live continuation.
