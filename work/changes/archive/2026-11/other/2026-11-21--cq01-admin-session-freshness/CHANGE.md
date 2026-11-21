# CQ01 | fail-closed staff-session freshness

**State:** Done. Owner directed archive and integration onto `undertaking/storyteller-workshop` after the implementation review. **Kind:** implementation (security correctness). **Priority:** P0, first. **Integration target:** `undertaking/storyteller-workshop`. **Change branch:** `change/cq01-admin-session-freshness`. **Overlaps:** CQ02 Admin module extraction (run CQ01 first); no WR Writer files.

**Planning basis:** Inspected committed `undertaking/storyteller-workshop` at `c13d64ee450ad6b2b1da75dddf0a3de8331efa1a` on 2026-11-21. GitHub source inspection only; no local tests executed. Recheck relevant symbols in the actual Change worktree before execution. **Do not touch another agent's dirty worktree.**

**Custody:** Create dedicated linked worktree + `change/<id>-<slug>` from the then-current `undertaking/storyteller-workshop` HEAD; keep user's primary checkout unchanged. Integrate only to the undertaking branch, with integration custodian serializing shared indexes/STATUS/closure; do not change `main`. No automatic work selection, paid providers, non-disposable data or destructive infra.

**Observed defect, not an exploit claim:** `apps/api/src/modules/admin/controller.ts:AdminActorService.requireAuthProof` accepts a Better Auth `createdAt` string and converts it to `new Date(createdAt)` without rejecting Invalid Date; `packages/application/src/admin/session.ts:createAdminSessions.enter` rejects only when `now.getTime() - createdAt.getTime() > ADMIN_LOGIN_FRESHNESS_MS`. `NaN > freshness` is false, as is a negative age for future timestamps. Current signed-in staff gating remains, but the *fresh login* rule can fail open if malformed/future timestamp reaches it. This observation is static analysis, not a verified remote exploit.

**Selected result:** Fail closed for non-finite, invalid and future auth session creation times at the application freshness authority, and reject invalid dates at the API conversion boundary. Maintain the 15-minute allowance for valid past sessions and existing 403 `step_up_required` semantics. No new user-facing feature, migration, extra privilege or login retry. Write tests before treating the fix accepted.

**Canonical docs:** Current [identities](../../../../../../docs/technical/platform/identities-and-access.md) and [Admin authorization](../../../../../../docs/technical/admin/topology-and-authorization.md) already require trustworthy sessions and denied unauthorized staff entry. No new policy is being selected; reconcile a concise explicit freshness assertion only if missing, not a rewritten product specification.

**Out of scope:** Replacing Better Auth, changing staff grants, broad Admin router decomposition (CQ02), production environment mapping decision, unrelated SQL.

**Ready gate:** exact application and API functions confirmed; normal and negative outcomes decided. **Done requires** new invalid/future-date negatives, existing valid/old tests, full affected typecheck and no privilege mint on refusal. **Security review:** ChatGPT checks the focused diff and evidence *before* the integration custodian joins. Tests NOT RUN by planner.

## Planned specification and implementation delta

planned-impact.v1, recorded before implementation and kept as the plan the close guard reads.

| Owner | Disposition |
| --- | --- |
| Product | unchanged because no new player-facing behavior is selected and staff denial stays the existing denial |
| Technical | changed: docs/technical/platform/identities-and-access.md#authentication-and-sessions states finite staff-login freshness |
| Code and tests | changed: packages/application/src/admin/session.ts and apps/api/src/modules/admin/controller.ts reject a non-finite session time; the negative case is denial before a staff token |
| Related status, maps and evidence | unchanged because STATUS.md is not a new demonstrated capability and the denial audit stays |

## Reconciliation ledger

exception: work/sessions/2026-11-21.md because the minutes record the CQ01 review gate and are not a contract.
exception: work/sessions/README.md because the index only links those minutes and is not a contract.
exception: work/changes/README.md because the catalog only moves this finished packet out of the open list.
exception: work/changes/ledger/2026-11.md because the ledger only records this finished packet.
exception: work/changes/CODE-CRAFT-REMEDIATION-2026-11-21.md because the schedule only marks this finished packet closed.

| Affected selected claim/heading | Authority | Target delta (changed/unchanged; reason) | Source delta & inspected SHA | Status/evidence tier | Negative proof | Map/link update or N/A |
| --- | --- | --- | --- | --- | --- | --- |
| Authentication and sessions | docs/technical/platform/identities-and-access.md#authentication-and-sessions | changed: finite staff-login freshness is now explicit. The fifteen-minute window already existed; non-finite and future times previously failed open | docs/technical/platform/identities-and-access.md#authentication-and-sessions; packages/application/src/admin/session.ts; apps/api/src/modules/admin/controller.ts; packages/application/test/admin-session.test.mjs; cff42c517f860c4677ed996508e7214e00817cf9 | fixture-tested | invalid, future, and too-old session times are denied before staff lookup and no staff token is minted | paragraph added on that heading |
| Authorization claim map | docs/technical/admin/topology-and-authorization.md#authorization-claim-map | unchanged: staff entry stays a separate principal from the player session, with no new grant | docs/technical/admin/topology-and-authorization.md#authorization-claim-map | source-inspected | a fresh timestamp still reaches the existing nonstaff denial | N/A |
| Boundary map | docs/technical/platform/security-and-trust-boundaries.md#boundary-map | unchanged: the session trust boundary is the same page's existing rule | docs/technical/platform/security-and-trust-boundaries.md#boundary-map | source-inspected | denial still does not echo the timestamp | N/A |
| Authenticated actor scope | docs/technical/platform/http-api-and-client-contracts.md#authenticated-actor-scope | unchanged: player actor scope is not a staff credential | docs/technical/platform/http-api-and-client-contracts.md#authenticated-actor-scope | source-inspected | missing primary auth stays unauthorized | N/A |
| Private DTO projection | docs/technical/platform/http-api-and-client-contracts.md#private-dto-projection | unchanged: staff denial still uses the existing error code and hides session internals | docs/technical/platform/http-api-and-client-contracts.md#private-dto-projection | source-inspected | the denial body does not include the timestamp | N/A |
| Read and reconstruction | docs/technical/observability/identities-and-evidence.md#7-read-and-reconstruction | unchanged: this gate does not change evidence reconstruction | docs/technical/observability/identities-and-evidence.md#7-read-and-reconstruction | source-inspected | the audit payload remains the existing stale-login reason | N/A |
| Product staff experience | docs/product | unchanged: no product page changes | no source behavior changed | source-inspected | refusal still mints no staff token | N/A |
| STATUS coverage | STATUS.md | unchanged: this is not a new demonstrated player capability | STATUS.md | source-inspected | HTTP invalid-date integration remains NOT RUN | N/A |

[Source map](SOURCE-MAP.md) · [Execution](EXECUTION.md) · [Proof](PROOF.md) · [Composer tasks](TASKS.md).
