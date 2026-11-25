# DBOPS04 | Explicit enrollment and atomic operation ledger

**State: Done / source-only.** Kind: implementation. Profile: STANDARD. Baseline main 182efaf9563307636f993a66fb4e0bd158d14fcb; execution from main `311e053b001f337e258f00b576560b7adad1ec36`. T01–T03 accepted. Live PostgreSQL NOT RUN. No outcome credit beyond enrollment/ledger/atomic tooling.

## Outcome
Explicit enrollment and atomic operation ledger. Selected authority: [database operations](../../../../../../docs/technical/platform/database-operations.md). [Programme](../../../../../undertakings/storyteller-workshop/DB-OPERATIONS.md) · [Tasks](TASKS.md).

## Execution
Dedicated change branch and linked worktree; node scripts/repo-tools/change-branch-guard.mjs --change DBOPS04 --target main before edits. Composer Standard, one bounded T-ID at a time. Parent owns changed-file quality/format review, focused tests, archive/ledger/STATUS reconciliation and squash join. No live DB, Docker, Kubernetes, providers, protected resources or destructive Git. No global queue change.

## Planned specification and implementation delta | planned-impact.v1

| Plane | Selected authority and exact change/no-op | Related documents/maps to inspect | Evidence/decision |
| --- | --- | --- | --- |
| Product | unchanged because no gameplay, authorization or spend promise moves | none | no product edit |
| Technical | changed: database-operations realization records enroll/ledger/atomic CLI; infrastructure points at Done DBOPS04 | docs/technical/README.md; work/undertakings/storyteller-workshop/DB-OPERATIONS.md | source realization only |
| Code | change: ledger/session/atomic modules + CLI enroll/plan/status/run; negative: wrong target/lock/dirty git/SHA mismatch/unknown commit; packages/db untouched | tools/db-operations/README.md | fixture-tested package suite 60/60 |
| Related | changed: archive/catalog/ledger/DB-OPERATIONS after Done; DBOPS05 remains open | work/changes/README.md; work/changes/ledger/2026-11.md work/changes/archive/2026-11/platform-operations/2026-11-25--dbops04-db-operation-ledger/CHANGE.md work/changes/archive/2026-11/platform-operations/2026-11-25--dbops04-db-operation-ledger/TASKS.md | catalog reconciled |

## Diff paths

tools/db-operations/src/ledger/schema.ts tools/db-operations/src/ledger/enroll.ts tools/db-operations/src/ledger/repository.ts tools/db-operations/src/execution/session.ts tools/db-operations/src/execution/operation.ts tools/db-operations/src/execution/atomic.ts tools/db-operations/src/arguments.ts tools/db-operations/src/cli.ts tools/db-operations/src/registry.ts tools/db-operations/src/target.ts tools/db-operations/test/enroll.test.ts tools/db-operations/test/ledger.test.ts tools/db-operations/test/atomic.test.ts tools/db-operations/README.md docs/technical/platform/database-operations.md docs/technical/platform/database-infrastructure.md work/undertakings/storyteller-workshop/DB-OPERATIONS.md work/undertakings/storyteller-workshop/OVERVIEW.md work/undertakings/storyteller-workshop/UNDERTAKING.md work/changes/README.md work/changes/open/README.md work/changes/ledger/2026-11.md work/changes/archive/2026-11/platform-operations/2026-11-25--dbops04-db-operation-ledger/CHANGE.md work/changes/archive/2026-11/platform-operations/2026-11-25--dbops04-db-operation-ledger/TASKS.md

## Reconciliation ledger

| Affected selected claim/heading | Authority | Target delta (changed/unchanged; reason) | Source delta & inspected SHA | Status/evidence tier | Negative proof | Map/link update or N/A |
| --- | --- | --- | --- | --- | --- | --- |
| Hard local safeguards / enrollment, ledger, atomic provenance | docs/technical/platform/database-operations.md | changed: realization records enroll, offscreen_ops ledger/session lock, atomic plan/status/run; empty production registry; fixture 60/60; live NOT RUN | docs/technical/platform/database-operations.md tools/db-operations/src/ledger/enroll.ts tools/db-operations/src/execution/atomic.ts @ 311e053b001f337e258f00b576560b7adad1ec36+dbops04 | source-tested (`pnpm --filter @offscreen/db-operations` build/typecheck/test 60/60) | wrong confirm-target / busy lock / existing namespace / dirty git / SHA mismatch / verify false / count limit / unknown COMMIT no replay / unregistered or high-risk refuse before connect | tools/db-operations/README.md; work/undertakings/storyteller-workshop/DB-OPERATIONS.md |
| Infrastructure ownership of ordinary schema vs ops tooling | docs/technical/platform/database-infrastructure.md | changed: realization note points to Done DBOPS03+04 source tooling; ordinary domain migration ownership unchanged | docs/technical/platform/database-infrastructure.md @ 311e053b001f337e258f00b576560b7adad1ec36+dbops04 | source-observed | claiming domain migration ownership moved would be the failure | docs/technical/README.md row unchanged |
| Ordinary schema migration / packages/db runtime bytes | packages/db | unchanged because operational schema is separate from Drizzle domain registry; migration history preserved | packages/db @ 311e053b001f337e258f00b576560b7adad1ec36+dbops04 | source-observed (`git diff --exit-code -- packages/db` clean) | no drizzle-kit or live DB invoked | no packages/db README rewrite |
| Proof: source fixtures first; live separately authorized | docs/technical/platform/database-operations.md#proof | unchanged because this Change is source-only; live atomicity/lock/recovery remain VER02-owned | no live harness ownership changed @ 311e053b001f337e258f00b576560b7adad1ec36+dbops04 | source-observed | claiming live PASS from fakes would be the failure | work/undertakings/storyteller-workshop/DB-OPERATIONS.md; no QUEUE change |
| Product gameplay/auth/spend | none | no product/technical behavior impacted because DBOPS04 is operator tooling only | no product source changed @ 311e053b001f337e258f00b576560b7adad1ec36+dbops04 | source-observed | no product page rewrite authorized | no product map rewrite |
