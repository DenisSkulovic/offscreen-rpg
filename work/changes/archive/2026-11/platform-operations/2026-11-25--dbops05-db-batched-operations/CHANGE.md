# DBOPS05 | Resumable bounded data-operation engine

**State: Done / source-only.** Kind: implementation. Profile: STANDARD. Baseline main 182efaf9563307636f993a66fb4e0bd158d14fcb; execution from main `7c3b73afc1683c633a9152313e3ab35587f1273b`. T01–T03 accepted. Live PostgreSQL NOT RUN. No outcome credit beyond batched runner/CLI/fixture tooling.

## Outcome
Resumable bounded data-operation engine. Selected authority: [database operations](../../../../../../docs/technical/platform/database-operations.md). [Programme](../../../../../undertakings/storyteller-workshop/DB-OPERATIONS.md) · [Tasks](TASKS.md).

## Execution
Dedicated change branch and linked worktree; node scripts/repo-tools/change-branch-guard.mjs --change DBOPS05 --target main before edits. Composer Standard, one bounded T-ID at a time. Parent owns changed-file quality/format review, focused tests, archive/ledger/STATUS reconciliation and squash join. No live DB, Docker, Kubernetes, providers, protected resources or destructive Git. No global queue change.

## Planned specification and implementation delta | planned-impact.v1

| Plane | Selected authority and exact change/no-op | Related documents/maps to inspect | Evidence/decision |
| --- | --- | --- | --- |
| Product | unchanged because no gameplay, authorization or spend promise moves | none | no product edit |
| Technical | changed: database-operations realization records batched runner/CLI resume bounds; infrastructure notes Done DBOPS05 | docs/technical/README.md; work/undertakings/storyteller-workshop/DB-OPERATIONS.md | source realization only |
| Code | change: BatchedOperation contract, batched runner, CLI `--batch-size`/`--max-batches`/resume, synthetic normalize-labels fixture; negative: wrong mode/cursor/count/verify/CAS/missing resume; packages/db untouched | tools/db-operations/README.md | fixture-tested package suite 86/86 |
| Related | changed: archive/catalog/ledger/DB-OPERATIONS after Done | work/changes/README.md; work/changes/ledger/2026-11.md work/changes/archive/2026-11/platform-operations/2026-11-25--dbops05-db-batched-operations/CHANGE.md work/changes/archive/2026-11/platform-operations/2026-11-25--dbops05-db-batched-operations/TASKS.md | catalog reconciled |

## Diff paths

tools/db-operations/src/execution/operation.ts tools/db-operations/src/execution/batched.ts tools/db-operations/src/arguments.ts tools/db-operations/src/cli.ts tools/db-operations/src/registry.ts tools/db-operations/test/batched-runner.test.ts tools/db-operations/test/batched-cli.test.ts tools/db-operations/test/batched-operation.test.ts tools/db-operations/test/fixtures/normalize-labels.ts tools/db-operations/README.md docs/technical/platform/database-operations.md docs/technical/platform/database-infrastructure.md work/undertakings/storyteller-workshop/DB-OPERATIONS.md work/undertakings/storyteller-workshop/OVERVIEW.md work/undertakings/storyteller-workshop/UNDERTAKING.md work/changes/README.md work/changes/open/README.md work/changes/ledger/2026-11.md work/changes/archive/2026-11/platform-operations/2026-11-25--dbops05-db-batched-operations/CHANGE.md work/changes/archive/2026-11/platform-operations/2026-11-25--dbops05-db-batched-operations/TASKS.md

## Reconciliation ledger

| Affected selected claim/heading | Authority | Target delta (changed/unchanged; reason) | Source delta & inspected SHA | Status/evidence tier | Negative proof | Map/link update or N/A |
| --- | --- | --- | --- | --- | --- | --- |
| Lightweight team practices / batched bounds, explicit resume, CAS/keyset | docs/technical/platform/database-operations.md | changed: realization records RegisteredBatchedOperation runner, CLI resume + batch bounds, synthetic fixture; empty production registry; fixture 86/86; live NOT RUN | docs/technical/platform/database-operations.md tools/db-operations/src/execution/batched.ts tools/db-operations/src/cli.ts @ 7c3b73afc1683c633a9152313e3ab35587f1273b+dbops05 | source-tested (`pnpm --filter @offscreen/db-operations` build/test 86/86) | explicit resume required for active running/paused; verify false / wrong cursor/count / CAS stale revision / missing execution on resume / wrong mode for batch flags | tools/db-operations/README.md; work/undertakings/storyteller-workshop/DB-OPERATIONS.md |
| Infrastructure ownership of ordinary schema vs ops tooling | docs/technical/platform/database-infrastructure.md | changed: realization note points to Done DBOPS03–06 source tooling; ordinary domain migration ownership unchanged | docs/technical/platform/database-infrastructure.md @ 7c3b73afc1683c633a9152313e3ab35587f1273b+dbops05 | source-observed | claiming domain migration ownership moved would be the failure | docs/technical/README.md row unchanged |
| Ordinary schema migration / packages/db runtime bytes | packages/db | unchanged because operational schema is separate from Drizzle domain registry; migration history preserved | packages/db @ 7c3b73afc1683c633a9152313e3ab35587f1273b+dbops05 | source-observed (`git diff --exit-code -- packages/db` clean) | no drizzle-kit or live DB invoked | no packages/db README rewrite |
| Proof: source fixtures first; live separately authorized | docs/technical/platform/database-operations.md#proof | unchanged because this Change is source-only; live atomicity/lock/recovery remain VER02-owned | no live harness ownership changed @ 7c3b73afc1683c633a9152313e3ab35587f1273b+dbops05 | source-observed | claiming live PASS from fakes would be the failure | work/undertakings/storyteller-workshop/DB-OPERATIONS.md; no QUEUE change |
| Product gameplay/auth/spend | none | no product/technical behavior impacted because DBOPS05 is operator tooling only | no product source changed @ 7c3b73afc1683c633a9152313e3ab35587f1273b+dbops05 | source-observed | no product page rewrite authorized | no product map rewrite |
