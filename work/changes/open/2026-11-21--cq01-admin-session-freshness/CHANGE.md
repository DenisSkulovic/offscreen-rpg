# CQ01 | fail-closed staff-session freshness

**State:** Ready for owner commission. **Kind:** implementation (security correctness). **Priority:** P0, first. **Integration target:** `undertaking/storyteller-workshop`. **Change branch:** `change/cq01-admin-session-freshness`. **Overlaps:** CQ02 Admin module extraction (run CQ01 first); no WR Writer files.

**Planning basis:** Inspected committed `undertaking/storyteller-workshop` at `c13d64ee450ad6b2b1da75dddf0a3de8331efa1a` on 2026-11-21. GitHub source inspection only; no local tests executed. Recheck relevant symbols in the actual Change worktree before execution. **Do not touch another agent's dirty worktree.**

**Custody:** Create dedicated linked worktree + `change/<id>-<slug>` from the then-current `undertaking/storyteller-workshop` HEAD; keep user's primary checkout unchanged. Integrate only to the undertaking branch, with integration custodian serializing shared indexes/STATUS/closure; do not change `main`. No automatic work selection, paid providers, non-disposable data or destructive infra.

**Observed defect, not an exploit claim:** `apps/api/src/modules/admin/controller.ts:AdminActorService.requireAuthProof` accepts a Better Auth `createdAt` string and converts it to `new Date(createdAt)` without rejecting Invalid Date; `packages/application/src/admin/session.ts:createAdminSessions.enter` rejects only when `now.getTime() - createdAt.getTime() > ADMIN_LOGIN_FRESHNESS_MS`. `NaN > freshness` is false, as is a negative age for future timestamps. Current signed-in staff gating remains, but the *fresh login* rule can fail open if malformed/future timestamp reaches it. This observation is static analysis, not a verified remote exploit.

**Selected result:** Fail closed for non-finite, invalid and future auth session creation times at the application freshness authority, and reject invalid dates at the API conversion boundary. Maintain the 15-minute allowance for valid past sessions and existing 403 `step_up_required` semantics. No new user-facing feature, migration, extra privilege or login retry. Write tests before treating the fix accepted.

**Canonical docs:** Current [identities](../../../../docs/technical/platform/identities-and-access.md) and [Admin authorization](../../../../docs/technical/admin/topology-and-authorization.md) already require trustworthy sessions and denied unauthorized staff entry. No new policy is being selected; reconcile a concise explicit freshness assertion only if missing, not a rewritten product specification.

**Out of scope:** Replacing Better Auth, changing staff grants, broad Admin router decomposition (CQ02), production environment mapping decision, unrelated SQL.

**Ready gate:** exact application and API functions confirmed; normal and negative outcomes decided. **Done requires** new invalid/future-date negatives, existing valid/old tests, full affected typecheck and no privilege mint on refusal. **Security review:** ChatGPT checks the focused diff and evidence *before* the integration custodian joins. Tests NOT RUN by planner.

[Source map](SOURCE-MAP.md) · [Execution](EXECUTION.md) · [Proof](PROOF.md) · [Composer tasks](TASKS.md).
