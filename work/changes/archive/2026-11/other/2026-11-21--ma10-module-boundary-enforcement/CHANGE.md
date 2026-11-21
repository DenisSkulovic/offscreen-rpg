# MA10 | Remove the Application test facade without losing coverage

**State: Done (2026-11-21).** `packages/application` is gone. All 112 legacy tests live under `tools/api-integration/legacy-engine-tests/`. Pure runner 215/215. Disposable, integration, and live suites stay gated. Joined on `undertaking/storyteller-workshop` at `66ced2cd`. Not on `main`.

**Readiness: READY for independent Cursor lane A, subject to HEAD and worktree guard.** **Inspected code baseline:** MA08 integrated at `6dd1276131a813f694ec3bccf4f9062ad3708208`. **Integration target:** `undertaking/storyteller-workshop`, never `main`. **Not an authorization** for paid AI, protected database writes, or reset/force-push. MA08 is Done, and MA10 must not relitigate its ownership decisions.

## Chosen outcome

`packages/application` is a test-only compatibility shell: ~152 tiny forwarding TS source files, zero legitimate production consumers, **112 legacy MJS tests**. Eliminate that workspace and all executable references, preserving the 112 test files and their behavioral assertions in the existing `tools/api-integration/legacy-engine-tests/` directory. Do not create another package, reintroduce forwarders, or make Story Engine depend on Lab Support.

**Critical exception:** Some old tests assert identity/existence of Application forwarders; specifically `ma06a-story-engine-compatibility`, `ma05b-outbox-compat` and `admin-compat`. Rewrite their obsolete facade-identity assertions as direct Story Engine/Admin/DB/Contracts ownership and import-liveness negatives. Preserve all other meaningful positive and negative tests. All old filenames must remain present; altered assertions need an explicit before/after receipt.

## Exact execution classification

**112 original files = 60 pure + 16 disposable-SQL + 14 integration + 22 live.** The first two groups both have `.test.mjs` suffix; therefore a filename-glob `*.test.mjs` is **NOT** a safe automatic unit test runner. Add a mode-aware runner in API Integration: `pure` is the only default; `disposable`, `integration` and `live` demand separate explicit disposable/local prerequisites before importing or spawning tests. [Complete filename ledger](TEST-INVENTORY.md), [16 exact SQL cases and exceptional import roots](SOURCE-MAP.md).

## Exclusive implementation ownership

**MA10:** deletion of `packages/application/**`; creation of `tools/api-integration/legacy-engine-tests/**`, `tools/api-integration/scripts/run-legacy-engine-tests.mjs`, adjustments to `tools/api-integration/package.json`; legacy dist/manifest references in `apps/worker/test/{eng06-worker-restart,gm07-temporal-relay}.live.test.ts`, the specific `scripts/repo-tools/{focused-integration,knowledge-health,storyteller-playability,storyteller-live-comparison,plan-storyteller-saved-repair}.mjs` and `tools/chamber/package.json` only if still used. The integration custodian owns the single joined `pnpm-lock.yaml` regeneration and global ledgers.

**Strict exclusions:** no `packages/story-engine/src/**`, `packages/db/src/**`, `packages/storyteller/src/**`, `scripts/repo-tools/module-graph*.mjs`, `apps/worker/src/**`, `packages/story-engine/package.json`, `tools/api-integration/test/wr09a-*.ts`; those belong to other Changes.

## Affected-claim reconciliation

| Claim | Target | Source | Evidence | Negative | Map |
| --- | --- | --- | --- | --- | --- |
| Application package | changed: removed | `packages/application` absent | joined pure tests 215/215 | disposable mode refuses before import | catalog updated |
| Legacy tests | changed location, same basenames | `tools/api-integration/legacy-engine-tests` | 112 files, 60/16/14/22 | OBS00-B resolves the DB package | N/A |
| Gated SQL | unchanged behavior, not a blanket pass | P3B integration | 5/5 on disposable Postgres | live and remaining SQL suites NOT RUN | N/A |

## Done

All 112 moved once, **all 60 pure tests discoverable and runnable** with truthful pass/fail; 16+14+22 gated and retained (NOT RUN is not PASS); actual dependency builds; no remaining executable Application import/path, package manifest or lock importer; old compatibility-only claims replaced with real direct-owner tests. No broken negative owner, stale root, provider accounting or permission assertions hidden. No new domain/package cycles.

**Parallel integration:** MA10 Cursor A owns final integration. Each lane works from the current undertaking HEAD in its *own linked worktree*. WR09A and MA11 push tested Change branches and return branch SHA/receipt to A. A serially joins MA10 → WR09A → MA11, runs combined proof/lockfile, archives, pushes undertaking and retires worktrees only after proof. Do not self-merge while siblings are active.

Read [SOURCE-MAP](SOURCE-MAP.md), [TEST-INVENTORY](TEST-INVENTORY.md), [EXECUTION](EXECUTION.md), [TASKS](TASKS.md), [PROOF](PROOF.md); the short `TASKS.md` is Cursor's dispatch route.
