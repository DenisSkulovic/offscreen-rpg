# HK01 | Composer route: replacement-first uncertain response settlement

**Planner investigation:** [SOURCE-MAP.md](SOURCE-MAP.md) establishes actual source-state and forbidden shortcuts at baseline `584b594`. Cursor reads this only for the selected symbol/contradiction, not as compulsory full-context preload.

**Baseline:** 584b594; **T01 inspected SHA:** `ec73a535` (working tree dirty, unrelated paths). **State:** T01 **VERIFY PASS** (5/5); T02 **PLANNER-BLOCKED**; packet **open**, **not Done**. **Default model:** Composer Standard. **Never delete unique operator recovery before its replacement is proven.**

**Source already landed:** `packages/application/src/storyteller/saved-response-settlement.ts:settleUncertainAttemptFromSavedResponse` validates generation.state=uncertain, attempt.state=uncertain, saved response has usage+telemetry and then calls `createStorytellerBudget().settle`. This is a **pure guarded function supplied with saved input**, not an operator reader/CLI replacement; worker does not call it. `scripts/repo-tools/reconcile-storyteller-response.mjs` remains the sole operator procedure and can mutate sensitive accounting. Do not invoke it against any DB.

## T01 | Existing guarded function and contract test | VERIFY PASS (`ec73a535`)

**Command:** `node --test packages/application/test/saved-response-settlement.test.mjs` — **5/5 PASS** (~237ms), provider-free. **Positive:** one valid saved response calls mocked `budget.settle` once. **Negatives:** `generation_not_uncertain`, `missing_saved_response`, `already_settled` (second settle refused; `budget.settle` not called again), `attempt_not_uncertain`. **NOT-RUN / not claimed:** reconcile CLI execution, `offscreen_story_local` or any DB, provider HTTP, operator recovery path, worker wiring.

**Receipt (2026-11-20):** guarded `settleUncertainAttemptFromSavedResponse` contract holds in unit tests only. `scripts/repo-tools/reconcile-storyteller-response.mjs` remains the sole operator procedure; this receipt is not CLI retirement or supported operator replacement proof.

## T02 | Complete safe operator path | **PLANNER-BLOCKED**
The current helper does not read/verify an already-saved response's origin, attempt identity, hashes, double-settlement or audit trail from a supported durable store. ChatGPT must first design the supported caller/recovery route and exact ledger verification using `storyteller/budget.ts`, existing attempt tables, current runbooks and the legacy CLI behavior. Split into: read-only verified record lookup; strict preview/refusal; one approved idempotent settle; audited negative and rollback. Never turn an untrusted local JSON file into billable truth or auto-replay uncertain provider requests.

## T03 | Retire CLI only after operator parity | GATED
Search authoritative callers/commands, replace runbook, prove saved already-uncertain response reconciles once with no charge/error duplication and unknown provider send remains held. Then remove obsolete CLI, update housekeeping audit and status in same diff. Until then **leave it**; no fake closure. **No Grok required to understand why deletion is unsafe.**
