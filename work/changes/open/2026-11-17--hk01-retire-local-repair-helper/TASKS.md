# HK01 | Composer route: replacement-first uncertain response settlement

**Baseline:** 584b594; **status:** Implementing, not Done. **Default model:** Composer Standard. **Never delete unique operator recovery before its replacement is proven.**

**Source already landed:** `packages/application/src/storyteller/saved-response-settlement.ts:settleUncertainAttemptFromSavedResponse` validates generation.state=uncertain, attempt.state=uncertain, saved response has usage+telemetry and then calls `createStorytellerBudget().settle`. This is a **pure guarded function supplied with saved input**, not an operator reader/CLI replacement; worker does not call it. `scripts/repo-tools/reconcile-storyteller-response.mjs` remains the sole operator procedure and can mutate sensitive accounting. Do not invoke it against any DB.

## T01 | Existing guarded function and contract test | PLANNER-READY, VERIFY
Read `saved-response-settlement.ts`, `packages/application/test/saved-response-settlement.test.mjs`, `storyteller/budget.ts` only relevant settle signature. Test normal one valid saved response into mocked budget.settle and negatives: already-settled, generation not uncertain, attempt not uncertain, missing usage/telemetry => no settlement call. **No DB, script execution, provider or money.** If tests fail, make one narrow Composer patch only after exact expected behavior is proven.

## T02 | Complete safe operator path | **PLANNER-BLOCKED**
The current helper does not read/verify an already-saved response's origin, attempt identity, hashes, double-settlement or audit trail from a supported durable store. ChatGPT must first design the supported caller/recovery route and exact ledger verification using `storyteller/budget.ts`, existing attempt tables, current runbooks and the legacy CLI behavior. Split into: read-only verified record lookup; strict preview/refusal; one approved idempotent settle; audited negative and rollback. Never turn an untrusted local JSON file into billable truth or auto-replay uncertain provider requests.

## T03 | Retire CLI only after operator parity | GATED
Search authoritative callers/commands, replace runbook, prove saved already-uncertain response reconciles once with no charge/error duplication and unknown provider send remains held. Then remove obsolete CLI, update housekeeping audit and status in same diff. Until then **leave it**; no fake closure. **No Grok required to understand why deletion is unsafe.**
