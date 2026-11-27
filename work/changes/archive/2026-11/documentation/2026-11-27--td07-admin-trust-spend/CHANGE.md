# TD07 | Administration, trust and spending

**State:** Done — source joined to implementation/technical-documentation-renewal; joint semantic acceptance pending (PD07/TD10 and Design). **Kind:** DOC. **Base:** `4b621ec9708361a2304efdcff4d34bb7da2b6c88` main; E1 DEFENDED at `c7058958ec3f43fd37ec680d05757561d628926b`, owner accepted 2026-11-27. **Target:** `implementation/technical-documentation-renewal`. [Accepted Design](../../../../designs/open/technical-documentation-renewal/README.md) · [Group](../../../open/technical-documentation-renewal/README.md).

**Release:** [group readiness and dispatch](../../../open/technical-documentation-renewal/README.md#owner-release-and-independent-readiness); exact reviewed candidate `606de3a0a4856eb36ce275bd4bc109ea46d480c0`. Verify named assignment, actual target, branch guard, prerequisites and custody before editing.

## Implementation first-screen brief

Seven canonical technical pages; preserve security, financial integrity, identity and scoped reusable primitives; M04. 4 bounded editorial tasks. Parent reads [TASKS](TASKS.md) and [PROOF](PROOF.md); child receives one card and named anchors. [SOURCE-MAP](SOURCE-MAP.md) is planner evidence. No source predecessor; group frozen transfer facts are available at planning base. Verify active ownership and actual HEAD before dispatch. Downstream: TD10. No paid, cluster, DB, provider, runtime, fixture or configuration operations.

## Target and exact write set

- `docs/technical/admin/topology-and-authorization.md`
- `docs/technical/admin/console-and-read-models.md`
- `docs/technical/admin/investigation-and-privacy.md`
- `docs/technical/admin/commands-and-audit.md`
- `docs/technical/platform/identities-and-access.md`
- `docs/technical/platform/security-and-trust-boundaries.md`
- `docs/technical/platform/spending-and-entitlements.md`

Retain existing path and headings; substantive authority-first rewriting, not label-only. Preserve selected/proposed distinctions, conditions, negative guarantees, unique realization facts and exact proof provenance. No new product/architecture decisions. Only these paths and own closure records may change. Protected AC/OBS/native normative owners excluded. Any active overlap gates only the affected task.

## Planned specification and implementation delta | planned-impact.v1

| Plane | Selected change / no-op | Related owner | Proof |
| --- | --- | --- | --- |
| Technical | Listed owners: editorial restructure only, no new semantic authority | exact task anchors and transfer table | meaning-preserving diff and negatives |
| Product | Unchanged authority; no new commitments | listed read-only canonical anchors | preserve selected constraints |
| Code | Unchanged because DOC only; no executable source/config/test edit | inspected source anchors | actual diff |
| Related | Shared maps/indexes/STATUS reserved to integration; report concrete affected routes | TD10 | navigation and preservation proof |

## Closure

Once separately Ready and commissioned, branch from verified `implementation/technical-documentation-renewal` using `change/td07-admin-trust-spend`. Run `node scripts/repo-tools/change-branch-guard.mjs --change TD07 --target implementation/technical-documentation-renewal --design technical-documentation-renewal` before edits; recheck branch, dirty state, ownership and prerequisites. Parent owns staging, lock, reconciliation, gate and archive. [PROOF](PROOF.md) before join. Archive own packet on implementation target before reporting completion; verify archive present/open absent, report exact SHA. No automatic successor, no independent main merge, no runtime acceptance claim.

## Reconciliation ledger

| Affected heading | Authority | Target delta / unchanged reason | Source delta and SHA | Evidence tier | Negative proof | Route update |
| --- | --- | --- | --- | --- | --- | --- |
| Authorization claim map; Current realization (topology) | `packages/admin/src/session.ts`, `policy.ts`, `registry.ts`; `apps/api/src/modules/admin/`; `apps/web/src/server/admin-actor.ts` | Routes no longer called unimplemented; compat re-export removed; PD06 status mirrored with provenance | source-inspected 2026-11-27 | source-inspected | Player auth alone: 403 to `/control/enter`; scope only from server actor | TD10 |
| Current realization (console); section 2 | `apps/web/app/(control)/control/**`, `features/admin/` | Realized subset separated from ten-destination target; nav is presentation | source-inspected | source-inspected | Visible nav grants nothing; no browser `ownerId` scope | TD10 |
| Relationship semantics (mirror); Current realization (investigation) | `player-reads.ts`, `audit-reads.ts`, `case-writes.ts` | PD06 mirror; realized reads vs absent search/export; audit not in one transaction | source-inspected | source-inspected | Self-assignment confers no scope (commands s6/s8) | TD10 |
| Commands: status, section 7, section 8 | `case-writes.ts`, `admin-cases.ts` | Realized case ops separated from envelope/approval target; six categories conditional | source-inspected | source-inspected | Retry never duplicates refund; audit failure returns no sensitive result | TD10 |
| Identities: Current realization, terminal status; Security: map, evidence links | `apps/api/src/modules/terminal-auth/service.ts`, `identity-interface`, `identity-persistence` | Realized vs selected (membership/invitations); links repointed to story-engine | source-inspected | source-inspected | Terminal token not accepted by Admin; matching email does not link; story id grants nothing | TD10 |
| Spending: opening and sections | `packages/usage-policy`, `story-engine/.../usage-policy-*` | Opening restructured; enum is schema vocabulary; unknown never refunds; September evidence dated | source-inspected | source-inspected | Subscription != payment; historical != live billing | TD10 (STATUS facts) |

## Closure receipt

- Page commits `ddf2e8a47cb1` and `e4a9b6fd1b31`; changed paths: the seven write-set pages only.
- Checks: `git diff --check` PASS; `check_docs.py` 94 vs baseline 97 lines (3 pre-existing broken links in security page fixed, none new); `docs-health` no new violation. Link health is not semantic proof. Acceptance NOT RUN; no runtime, provider or cluster operation.
- Semantic answers: Player auth alone opens staff page: no (topology Current realization; console Current realization, 401/403 redirects). Nav grants operation: no (console section 2). Scope forged with ownerId: no (console section 2; topology claim map). Self-assignment confers scope: no (commands sections 6, 8). Retry duplicates refund: no (commands sections 2, 8). Denied audit failure leaks result: no (commands sections 4, 5, 8). Terminal token accepted by Admin: no (identities terminal section). Matching email links accounts: no (identities sessions). Story ID alone grants read: no (identities Current realization; security Cross-owner 404). Unknown delivery refunds capacity: no (spending window accounting). Subscription implies payment: no (spending Distinct authorities). Historical proof certifies live billing: no (spending September evidence).
- Mirrors: PD06 status mirrored at topology Authorization claim map and investigation Relationship semantics; no expansion of the frozen transfer-and-delete set (DOC-E1-IR-M02).
- Deferred Medium/Low: (Medium) case create/assign/status audit append is not in one transaction with the case write; recorded in investigation Current realization and commands section 7. (Low) spending page retains pre-existing historical Git-history links; group register (custodian).
