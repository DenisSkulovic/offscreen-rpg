# CQ01 | Composer queue

**Commission:** Owner selects CQ01 explicitly. Use `change/cq01-admin-session-freshness` **inside its own linked worktree**, from latest `undertaking/storyteller-workshop`; never switch primary checkout. Before first edit run `pnpm repo:change-branch --change CQ01 --target undertaking/storyteller-workshop`. Parent owns commits, proofs and shared-branch join. T01 → T02 → T03. Each T-ID is an implementation step, not an independent Change.

## T01 | Application freshness denial | PLANNER-READY
**Read/write:** `packages/application/src/admin/session.ts:createAdminSessions.enter`, `packages/application/test/admin-session.test.mjs`; reference EXECUTION.md. Add finite/nonfuture inclusive age predicate and deny audit before token. Add focused invalid, future, old, valid boundary proofs (use disposable DB where required). **Positive:** valid recent timestamp eligible. **Negative:** NaN/future fails closed and no staff token. **Stop:** source API no longer matches, unknown session time semantics or unsafe DB; return exact symbol/assumption. **Receipt:** paths, actual checks, warnings, zero provider spend.

## T02 | HTTP conversion gate | PLANNER-READY AFTER T01
**Read/write:** `apps/api/src/modules/admin/controller.ts:AdminActorService.requireAuthProof`, `tools/api-integration/test/admin-session.integration.ts`; current `AuthProof`. Validate `Date | string` finite date before forwarding; preserve 403 and cookie semantics. Add narrow fixture if injection support exists; otherwise give a precise NOT-RUN integration gap, do not redesign auth transport. **Positive:** ordinary Better Auth date passes. **Negative:** invalid date string is denied before token mint. **Stop:** alternate source ownership requires architecture change.

## T03 | Closure and focused review | PLANNER-READY AFTER T02
**Read:** T01/T02 diff + PROOF.md; current technical Admin/session owner. Run changed-file format/quality lint, relevant builds and focused tests. Check all negative paths and denial audit; reconcile docs/STATUS only if changed claims require it. Ask ChatGPT for required independent security review before custodian integrates. **Stop:** any unproven critical negative remains Blocked, never mark Done. **Receipt:** actual command PASS/FAIL/NOT RUN, final SHA, affected-claim ledger, risk/spend.
