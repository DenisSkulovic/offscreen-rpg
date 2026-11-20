# HK01 | Bounded recovery-replacement execution tasks

**State:** T01 VERIFY PASS (5/5); **T02 PASS** (pure inspector, provider-free). **T03 PASS** (read-only preview + plan CLI + disposable SQL proof). **T04 PASS** (guarded apply + audit migration on `offscreen_hk01_repair_test`). **T05 PASS** (legacy CLI removed, runbook/housekeeping reconciled, packet archived). Operator maintenance command: `scripts/repo-tools/plan-storyteller-saved-repair.mjs`. No approval to run against production/staging databases, paid provider transport, or non-disposable clusters.

## T01 | Existing minimal guard | PASS at ec73a535

`node --test packages/application/test/saved-response-settlement.test.mjs` 5/5 provider-free.

## T02 | Pure verified evidence derivation | PASS

`inspectSavedInvalidRepairResponse` in `saved-response-inspection.ts`. `saved-response-inspection.test.mjs` 17/17; `saved-response-settlement.test.mjs` 5/5.

## T03 | Read-only state/provenance preview | PASS

`previewSavedRepair` in `saved-repair-plan.ts`; `plan-storyteller-saved-repair.mjs` `--plan`. Unit + integration tests on disposable `offscreen_hk01_repair_test`.

## T04 | One guarded durable audited settlement | PASS

Migration `0013_hk01_saved_repair_audit.sql`; `applySavedRepair` in `saved-repair-apply.ts`; `plan-storyteller-saved-repair.mjs --apply`. `saved-repair-apply.integration.test.mjs` on disposable DB only.

## T05 | Retire old CLI and close HK01 | PASS (2026-11-20, base `eeeb2fef`)

**Delivered:** `git rm scripts/repo-tools/reconcile-storyteller-response.mjs`; `databasePathAllowed` allowlist (`/offscreen_story_local`, `/offscreen_hk01_repair_test`); integration tests for disallowed DB, `evidence_symlink`, `evidence_escape`, and pathname allowlist without DB client; `docs/runbooks/uncertain-work-recovery.md` and housekeeping audit F02 cite `plan-storyteller-saved-repair.mjs`; maintenance command stays under `scripts/repo-tools/` (no DXK04 packet in this worktree). **Proof:** `node --test` bundle **40/40 PASS** (~4960ms): inspection 17, plan unit 5, plan integration 5, apply integration 8, settlement 5. `wiki:change-guard --mode close` ok (historical-packet info only).