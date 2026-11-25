# DBOPS03 | Database operations catalog and local target guard

**State: Done / source-only.** Kind: implementation. Profile: STANDARD. Baseline main 182efaf9563307636f993a66fb4e0bd158d14fcb; execution from main `3eaf941cfff9749f1e54a52bd176ccaaeb62c5d5`. T01–T03 accepted. Live PostgreSQL NOT RUN. No outcome credit beyond catalog/CLI/target-guard tooling.

## Outcome
Database operations catalog and local target guard. Selected authority: [database operations](../../../../../../docs/technical/platform/database-operations.md). [Programme](../../../../../undertakings/storyteller-workshop/DB-OPERATIONS.md) · [Tasks](TASKS.md).

## Execution
Dedicated change branch and linked worktree; run `node scripts/repo-tools/change-branch-guard.mjs --change DBOPS03 --target main` before edits. Composer Standard, one bounded T-ID at a time. Parent owns final proof, code-craft review, changed-file Prettier/quality lint, typecheck, archive/ledger/STATUS reconciliation and squash join. No live DB, Docker, Kubernetes, providers, protected resources or destructive Git. No global queue change.

## Planned specification and implementation delta | planned-impact.v1

| Plane | Selected authority and exact change/no-op | Related documents/maps to inspect | Evidence/decision |
| --- | --- | --- | --- |
| Product | unchanged because no gameplay, authorization or spend promise moves | none | no product edit |
| Technical | changed: docs/technical/platform/database-operations.md records source realization of catalog/CLI/loopback target guard without live PASS; infrastructure realization points at Done DBOPS03 | docs/technical/README.md; work/undertakings/storyteller-workshop/DB-OPERATIONS.md | source realization only |
| Code | change: new `tools/db-operations` workspace, root `db:ops`, lockfile; negative: remote/ambient/unknown-op/secret leakage refused; packages/db and migration bytes untouched | tools/db-operations/README.md | fixture-tested package suite |
| Related | changed: archive/catalog/ledger/DB-OPERATIONS after Done; DBOPS04–06 remain open | work/changes/README.md; work/changes/ledger/2026-11.md | catalog reconciled |

## Diff paths

tools/db-operations/package.json tools/db-operations/tsconfig.json tools/db-operations/README.md tools/db-operations/src/contract.ts tools/db-operations/src/registry.ts tools/db-operations/src/target.ts tools/db-operations/src/arguments.ts tools/db-operations/src/cli.ts tools/db-operations/test/contract.test.ts tools/db-operations/test/target.test.ts tools/db-operations/test/cli.test.ts package.json pnpm-lock.yaml docs/technical/platform/database-operations.md docs/technical/platform/database-infrastructure.md docs/technical/README.md work/undertakings/storyteller-workshop/DB-OPERATIONS.md work/undertakings/storyteller-workshop/OVERVIEW.md work/changes/README.md work/changes/open/README.md work/changes/ledger/2026-11.md work/changes/archive/2026-11/platform-operations/2026-11-25--dbops03-db-operation-catalog/CHANGE.md work/changes/archive/2026-11/platform-operations/2026-11-25--dbops03-db-operation-catalog/TASKS.md

## Reconciliation ledger

| Affected selected claim/heading | Authority | Target delta (changed/unchanged; reason) | Source delta & inspected SHA | Status/evidence tier | Negative proof | Map/link update or N/A |
| --- | --- | --- | --- | --- | --- | --- |
| Reviewed operation catalog in tools/db-operations; explicit registry; no app dependency | docs/technical/platform/database-operations.md#purpose-and-scope | changed: source realization of `@offscreen/db-operations` with empty explicit registry, validateManifest/operationKey, root `db:ops` | tools/db-operations/** @ post-T03 worktree | source-tested (`pnpm --filter @offscreen/db-operations` build/typecheck/test 27/27; `pnpm db:ops --help` exit 0) | no `@offscreen/db-operations` import from apps/packages; `git diff --exit-code -- packages/db` clean | tools/db-operations/README.md; docs/technical/README.md row; DB-OPERATIONS.md |
| Hard local safeguards: DB_OPS_URL only, literal loopback, exact session identity | docs/technical/platform/database-operations.md#hard-local-safeguards | changed: parseTarget/verifySession/target CLI enforce loopback URL, ambient PG* refusal, read-only session check; enrollment/marker still deferred to DBOPS04 | tools/db-operations/src/target.ts tools/db-operations/src/cli.ts @ post-T03 | source-tested (fake-query target/cli tests) | remote/DNS localhost/ambient/missing-password/reserved-db refused; credentials absent from errors; help/list/inspect never connect | database-operations.md realization note |
| Operation definition identity/risk/tables/kind/mode/recovery | docs/technical/platform/database-operations.md#lightweight-team-practices | changed: OperationManifest validation with defensive frozen copy; high risk accepted in catalog only | tools/db-operations/src/contract.ts @ post-T03 | source-tested | unknown fields / invalid enums / whitespace / duplicate keys rejected | N/A for execution engine (DBOPS04/05) |
| Proof: source fixtures first; live separately authorized | docs/technical/platform/database-operations.md#proof | unchanged because this Change is source-only; live atomicity/lock/recovery remain VER02-owned | no live harness ownership changed | source-observed | claiming live PASS from fakes would be the failure | N/A |
| Product gameplay/auth/spend | none | no product/technical behavior impacted because DBOPS03 is operator tooling only | no product page rewrite | source-observed | N/A | N/A |
| Ordinary schema migration / packages/db runtime | docs/technical/platform/database-infrastructure.md | unchanged because DBOPS03 owns a separate tool; migration history preserved | packages/db untouched; migrations diff empty | source-observed | `git diff --exit-code -- packages/db` | infrastructure realization points to Done DBOPS03 catalog only |
