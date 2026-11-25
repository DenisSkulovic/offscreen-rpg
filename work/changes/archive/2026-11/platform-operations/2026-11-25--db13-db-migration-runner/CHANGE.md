# DB13 | Migration runner postcondition and failure reporting

**State: Done / source-only.** Kind: implementation. Profile: STANDARD. Baseline main 630f70bb0d2bf1f4de0304dc3bd6bde5c6e696d0; execution started from main `ad3c4edfedcdc7750c34af66fb23d21e8d7851c1`. T01–T03 accepted. Live PostgreSQL NOT RUN. No outcome credit beyond migration runner postcondition and safe CLI diagnostics.

## Outcome
Migration runner postcondition and failure reporting; retain domain authority, SQL history, public exports, pool limits and compatibility. DB12 deliberately repairs cleanup and narrow definitive COMMIT classification; DB13 adds final ledger verification. [Programme](../../../undertakings/storyteller-workshop/DB-CRAFT.md) · [Tasks](TASKS.md) · [Technical owner](../../../../docs/technical/platform/database-infrastructure.md).

## Execution
Dedicated change branch and linked worktree; run node scripts/repo-tools/change-branch-guard.mjs --change DB13 --target main before edits. Composer Standard, one bounded T-ID at a time. Parent owns final proof, code-craft review, changed-file Prettier/quality lint, typecheck, archive/ledger/STATUS reconciliation and squash join. DB11 parent coordinates shared joins until its join, then DB12 parent (or agreed remaining single custodian); coordinate active VER/INF/cache parents. No concurrent writes to shared catalogs. No live PostgreSQL, Docker, cluster, migrations, provider calls or destructive Git. No global queue change.

## Planned specification and implementation delta | planned-impact.v1

| Plane | Selected authority and exact change/no-op | Related documents/maps to inspect | Evidence/decision |
| --- | --- | --- | --- |
| Product | unchanged because no gameplay, authorization or spend promise moves | none | no product edit |
| Technical | changed: docs/technical/platform/database-infrastructure.md#realization-record and Migration execution (post-ledger + safe CLI); selected corrections split (migration implemented / transaction still DB12) | packages/db/README.md; work/undertakings/storyteller-workshop/DB-CRAFT.md | source realization only |
| Code | changed: packages/db/src/migrations/runner.ts packages/db/src/migrations/applied-ledger.ts packages/db/src/migrations/diagnostics.ts packages/db/src/migrate-cli.ts packages/db/test/migration-runner.test.ts packages/db/test/migration-diagnostics.test.ts packages/db/package.json — post-ledger assert, StepResult, extract, allowlisted CLI; negative: short/invalid post-ledger, secret-bearing CLI error, lock busy | packages/db/README.md | fixture-tested package suite |
| Related | changed: archive/catalog/ledger/DB-CRAFT/OVERVIEW after Done; DB12/14 remain open | work/changes/README.md; work/changes/ledger/2026-11.md | catalog reconciled |

## Diff paths

packages/db/src/migrations/runner.ts packages/db/src/migrations/journal.ts packages/db/src/migrations/applied-ledger.ts packages/db/src/migrations/diagnostics.ts packages/db/src/migrate-cli.ts packages/db/test/migration-runner.test.ts packages/db/test/migration-diagnostics.test.ts packages/db/package.json packages/db/README.md docs/technical/platform/database-infrastructure.md work/undertakings/storyteller-workshop/DB-CRAFT.md work/undertakings/storyteller-workshop/OVERVIEW.md work/changes/README.md work/changes/open/README.md work/changes/ledger/2026-11.md work/changes/archive/2026-11/platform-operations/2026-11-25--db13-db-migration-runner/CHANGE.md work/changes/archive/2026-11/platform-operations/2026-11-25--db13-db-migration-runner/TASKS.md

## Reconciliation ledger

| Affected selected claim/heading | Authority | Target delta (changed/unchanged; reason) | Source delta & inspected SHA | Status/evidence tier | Negative proof | Map/link update or N/A |
| --- | --- | --- | --- | --- | --- | --- |
| Migration execution (post-ledger under advisory lock) | docs/technical/platform/database-infrastructure.md (Migration execution paragraph); packages/db/src/migrations/runner.ts | changed: second readLedger + assertLedger + length===verifiedEntries while lock held; MigrationLockBusyError; StepResult primary/close | packages/db/src/migrations/runner.ts packages/db/test/migration-runner.test.ts @ ad3c4edfedcdc7750c34af66fb23d21e8d7851c1+db13 | source-tested (`pnpm --filter @offscreen/db build && test` 94/94; typecheck PASS) | short/invalid post-ledger, post-read error, primary/close throw undefined; lock refusal still no DDL; `git diff --exit-code -- packages/db/migrations` | packages/db/README.md; DB-CRAFT |
| Applied-ledger readability extract | packages/db/src/migrations/applied-ledger.ts; journal.ts reexports | changed: helpers extracted; journal comments; parsePositiveSafeInteger null branch removed | packages/db/src/migrations/applied-ledger.ts packages/db/src/migrations/journal.ts @ ad3c4edfedcdc7750c34af66fb23d21e8d7851c1+db13 | source-tested (journal+runner focused PASS) | validation acceptance/error categories unchanged | N/A |
| Safe migrate CLI diagnostics | packages/db/src/migrations/diagnostics.ts; migrate-cli.ts | changed: formatMigrationFailure allowlist; config read inside async main; applyMigrations unchanged | packages/db/src/migrations/diagnostics.ts packages/db/src/migrate-cli.ts packages/db/test/migration-diagnostics.test.ts @ ad3c4edfedcdc7750c34af66fb23d21e8d7851c1+db13 | source-tested (diagnostics 4/4) | hostile category, secret-bearing Error, unknown → generic message | package.json test script path |
| Realization record / selected corrections | docs/technical/platform/database-infrastructure.md#realization-record | changed: DB13 realization; migration row marked source-implemented; DB12 transaction row remains not yet | docs/technical/platform/database-infrastructure.md @ ad3c4edfedcdc7750c34af66fb23d21e8d7851c1+db13 | source-observed | live PostgreSQL NOT RUN; no public export drift | OVERVIEW note; no percentage change |
| Product gameplay/auth/spend | none | no product/technical behavior impacted because DB13 does not alter player authority or spend | no product source changed @ ad3c4edfedcdc7750c34af66fb23d21e8d7851c1 | source-observed | no product page rewrite authorized | N/A |
| Live PostgreSQL / migration recovery proof | docs/technical/platform/verification-programmes.md | unchanged because this Change is source-only and VER04/VER05 own live profiles | no live harness ownership changed @ ad3c4edfedcdc7750c34af66fb23d21e8d7851c1 | source-observed | claiming live PASS from package fakes would be the failure | N/A |
