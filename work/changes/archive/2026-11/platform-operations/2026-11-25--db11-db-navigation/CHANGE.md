# DB11 | Database package navigation and test ownership

**State: Done / source-only.** Kind: implementation. Profile: STANDARD. Baseline main 630f70bb0d2bf1f4de0304dc3bd6bde5c6e696d0; execution started from main `d6e013c19702f2ee4a4c7c34465217ad19b30ea0`. T01–T02 accepted. Live PostgreSQL NOT RUN. No outcome credit beyond navigation/test ownership.

## Outcome
Database package navigation and test ownership; retain domain authority, SQL history, public exports, pool limits and compatibility. DB12 deliberately repairs cleanup and narrow definitive COMMIT classification; DB13 adds final ledger verification. [Programme](../../../undertakings/storyteller-workshop/DB-CRAFT.md) · [Tasks](TASKS.md) · [Technical owner](../../../../docs/technical/platform/database-infrastructure.md).

## Execution
Dedicated change branch and linked worktree; run node scripts/repo-tools/change-branch-guard.mjs --change DB11 --target main before edits. Composer Standard, one bounded T-ID at a time. Parent owns final proof, code-craft review, changed-file Prettier/quality lint, typecheck, archive/ledger/STATUS reconciliation and squash join. DB11 parent coordinates shared joins until its join, then DB12 parent (or agreed remaining single custodian); coordinate active VER/INF/cache parents. No concurrent writes to shared catalogs. No live PostgreSQL, Docker, cluster, migrations, provider calls or destructive Git. No global queue change.

## Planned specification and implementation delta | planned-impact.v1

| Plane | Selected authority and exact change/no-op | Related documents/maps to inspect | Evidence/decision |
| --- | --- | --- | --- |
| Product | unchanged because no gameplay, authorization or spend promise moves | none | no product edit |
| Technical | changed: docs/technical/platform/database-infrastructure.md#realization-record records DB11 navigation/test rename without live PASS or runtime-behavior credit | packages/db/README.md; work/undertakings/storyteller-workshop/DB-CRAFT.md | source realization only |
| Code | change: eight responsibility-named `packages/db/test/*.test.ts`, package.json test script; README navigation map; negative: old db06–db09 filenames not invoked; migrations/public exports unchanged | packages/db/README.md | fixture-tested package suite |
| Related | changed: archive/catalog/ledger/DB-CRAFT after Done; DB12/13/14 remain open after DB11 | work/changes/README.md; work/changes/ledger/2026-11.md | catalog reconciled |

## Diff paths

packages/db/README.md packages/db/package.json packages/db/test/admission.test.ts packages/db/test/managed-pool.test.ts packages/db/test/transaction-errors.test.ts packages/db/test/managed-transaction.test.ts packages/db/test/migration-journal.test.ts packages/db/test/migration-runner.test.ts packages/db/test/database-telemetry.test.ts packages/db/test/transaction-concurrency.test.ts docs/technical/platform/database-infrastructure.md work/undertakings/storyteller-workshop/DB-CRAFT.md work/changes/README.md work/changes/open/README.md work/changes/ledger/2026-11.md work/changes/archive/2026-11/platform-operations/2026-11-25--db11-db-navigation/CHANGE.md work/changes/archive/2026-11/platform-operations/2026-11-25--db11-db-navigation/TASKS.md

## Reconciliation ledger

| Affected selected claim/heading | Authority | Target delta (changed/unchanged; reason) | Source delta & inspected SHA | Status/evidence tier | Negative proof | Map/link update or N/A |
| --- | --- | --- | --- | --- | --- | --- |
| Package navigation and ownership (connection/admission/transactions/migrations; not domain tables) | docs/technical/platform/database-infrastructure.md#ownership-and-dependency-law; packages/db/README.md | changed: README first sentence and navigation map (root vs `/migrate`, raw `db` vs managed, journal vs ledger vs generator snapshot, source vs destructive integration; DBOPS01 + VER04/05 owners) | packages/db/README.md @ d6e013c19702f2ee4a4c7c34465217ad19b30ea0 | source-observed | no schema/migration/package-boundary edit; `git diff --exit-code -- packages/db/migrations` clean | packages/db/README.md; work/undertakings/storyteller-workshop/DB-CRAFT.md |
| Source test ownership filenames | packages/db/package.json `test` script; packages/db/test/* | changed: eight Change-era test files renamed by responsibility; explicit dist/test list order preserved | packages/db/test/admission.test.ts packages/db/test/managed-pool.test.ts packages/db/test/transaction-errors.test.ts packages/db/test/managed-transaction.test.ts packages/db/test/migration-journal.test.ts packages/db/test/migration-runner.test.ts packages/db/test/database-telemetry.test.ts packages/db/test/transaction-concurrency.test.ts packages/db/package.json @ d6e013c19702f2ee4a4c7c34465217ad19b30ea0 | source-tested (`pnpm --filter @offscreen/db build && typecheck && test` 85/85) | old db06–db09 filenames not invoked; integration and config/typecheck names unchanged | work/changes/README.md; work/changes/open/README.md; work/changes/ledger/2026-11.md |
| docs/technical/platform/database-infrastructure.md#realization-record (DB11 navigation only) | docs/technical/platform/database-infrastructure.md#realization-record | changed: record DB11 rename + README map without live or runtime-behavior credit | docs/technical/platform/database-infrastructure.md @ d6e013c19702f2ee4a4c7c34465217ad19b30ea0 | source-observed | live PostgreSQL NOT RUN; no public export or dependency drift | STATUS / OVERVIEW unchanged for outcome credit |
| Product gameplay/auth/spend | none | no product/technical behavior impacted because DB11 does not alter player authority or spend | no source behavior changed for product claims @ d6e013c19702f2ee4a4c7c34465217ad19b30ea0 | source-observed | no product page rewrite authorized | N/A |
| Live PostgreSQL / migration recovery proof | docs/technical/platform/verification-programmes.md | unchanged because this Change is source-only and VER04/VER05 own live profiles | no live harness ownership changed @ d6e013c19702f2ee4a4c7c34465217ad19b30ea0 | source-observed | claiming live PASS from package fakes would be the failure | N/A |
