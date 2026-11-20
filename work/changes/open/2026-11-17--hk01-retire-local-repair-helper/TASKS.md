# HK01 | Bounded recovery-replacement execution tasks

**State:** T01 VERIFY PASS (5/5); **T02 PATCH PASS** on branch `change/hk01-saved-repair` (pure inspector, provider-free). **T03 PATCH PASS** on branch `change/hk01-saved-repair` (read-only preview + plan CLI + disposable SQL proof). **T04–T05 PLANNER-READY, not executed.** The old CLI remains the only operator procedure. No approval to run against a real local/hosted Storyteller database, settle money, start provider transport, or change another worker's code. Composer Standard, one T-ID per bounded assignment, use only the exact source anchors listed.

## T01 | Existing minimal guard | PASS at ec73a535

`node --test packages/application/test/saved-response-settlement.test.mjs` previously 5/5 provider-free. Valid/invalid generation/attempt state and missing input checks only. **Not** evidence validation, DB safety or operator replacement.

## T02 | Pure verified evidence derivation | PASS (worktree `change/hk01-saved-repair`)

**Read:** `packages/application/src/storyteller/saved-response-settlement.ts`; `scripts/repo-tools/reconcile-storyteller-response.mjs`; `packages/storyteller/src/providers/openrouter.ts:recordResponse/prepareOpenRouterWire`; `packages/application/src/storyteller/dispatch-review.ts:prepareReviewedDispatch`. Implement the pure H1 validator in [decision](DECISION-2026-11-20.md). Never accept caller-composed usage/charge as proof; derive it strictly from complete saved bytes with matching reviewed request SHA and captured frozen route. **Tests:** good invalid-output repair; wrong digest/provider/model/body id/purpose; malformed cost, token count, absent response ID, valid output, nonrepairable recipe, oversized input/refused parse. 0 provider calls, 0 DB.

**T02 receipt:** `inspectSavedInvalidRepairResponse` in `packages/application/src/storyteller/saved-response-inspection.ts`. `node --test packages/application/test/saved-response-inspection.test.mjs` 17/17 and `saved-response-settlement.test.mjs` 5/5. No database, no provider, CLI not deleted.

## T03 | Read-only state/provenance preview | PASS (worktree `change/hk01-saved-repair`)

**Read:** `packages/db/src/schema/{generations,storyteller}.ts` generation/attempt/dispatchReview; `docs/runbooks/uncertain-work-recovery.md`; `tools/chamber/src/story-provider.ts` evidence writer. Add local-only `--plan` runner with safe explicit context/disposable DB target. Bind exact generation/attempt/review row and account/run, revision and state, requestSHA vs stored review, known provider ID and ambiguous identical-request alternatives. Redacted plan fingerprint; never auto-select among matching attempts. **Tests:** read-only SQL fake + disposable DB for review lookup; refusal wrong environment/namespace, traversal/symlink, ambiguous digest, missing review, changed revision and no mutation. No provider or settlement invocation.

**T03 receipt:** `previewSavedRepair` in `packages/application/src/storyteller/saved-repair-plan.ts`; `scripts/repo-tools/plan-storyteller-saved-repair.mjs`. `node --test packages/application/test/saved-repair-plan.test.mjs packages/application/test/saved-repair-plan.integration.test.mjs packages/application/test/saved-response-inspection.test.mjs` 24/24. Disposable DB `offscreen_hk01_repair_test` only; no provider, no settlement, legacy CLI not deleted.

## T04 | One guarded durable audited settlement | PLANNER-READY after T03; explicit disposable-DB test authorization only

**Read:** `packages/application/src/storyteller/budget.ts:settle`; `packages/application/src/storyteller/saved-response-settlement.ts`; `packages/db/src/schema/{generations,storyteller}.ts`; `packages/application/src/storyteller/dispatch-review.ts`. Implement H3: explicit apply plan hash/operator/reason, reread/lock generation+review/attempt on the existing budget transaction and fence revision/state/digests, append one immutable unique-attempt recovery audit in same transaction. Do not copy accounting writes. **Tests:** success one charge and invalid-output repair retained; same-plan idempotency, contradictory-plan denial, state-race/parallel apply, rollback when audit insert fails, no fund re-enable, no provider HTTP. Use disposable `offscreen_auth_test` or explicitly owned test DB only; do not touch `offscreen_story_local` or cluster data.

## T05 | Retire old CLI and close HK01 | PLANNER-READY after T04 proof

**Read:** current `scripts/repo-tools/reconcile-storyteller-response.mjs`, `docs/runbooks/uncertain-work-recovery.md`, `docs/runbooks/local-storyteller-rehearsal.md`, `work/designs/open/repository-housekeeping/AUDIT-2026-11-17.md`, root/package-local script usages. Compare complete old positive/negative behavior with new preview/apply. Delete legacy script only after tested operator replacement; update runbook, housekeeping audit, current command routing, source receipts, wiki navigation/guards. Stop on any lost operator capability or active dependent command; don't invent a workaround by removing a test. Archive only with a real proof ledger and coordinated DXK04 naming.

**STOP rule:** source drift breaks the proven link between persisted reviewed request digest, saved evidence request digest and particular attempt; ambiguous file-to-attempt origin; no safe transaction fence; unowned financial DB; missing explicit approval for apply. Such cases stay held with exact evidence. Don't rewrite provider accounting or silently drop the old recovery route.
