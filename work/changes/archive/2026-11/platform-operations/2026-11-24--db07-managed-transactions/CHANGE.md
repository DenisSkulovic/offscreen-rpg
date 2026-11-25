# DB07 | Managed SQL transaction execution

**State:** Done / source-only. Kind: implementation. Profile: STATE. Baseline d08e36d809bb53c48fef3351224994bae92b6e7c; target main. DB01 and DB06 joined. T00–T02 accepted. Live PostgreSQL remains separately gated under DB10 and is not part of this Change's accepted proof.

[Selected architecture](../../../../docs/technical/platform/database-infrastructure.md) · [Parallel program and frozen interfaces](../../../undertakings/storyteller-workshop/DB-PARALLEL.md) · [TASKS](TASKS.md)

## Outcome and scope

- Classify failures and retry policy: Implement bounded cause walk SQLSTATE classification; preserve internal cause, closed category; default no retry; only 40001/40P01 known rollback with sql-only-conflicts policy; <=3 attempts, jitter25–200ms remaining budget. Explicit unknown commit class never retry; constraints/lock/timeouts/auth/application errors never retry. Deterministic fake tests for wrapped errors, callback attempt count, budget and no retry on connection loss.
- Managed transaction runner: Implement packages/db/src/transaction/execute.ts against withClient: BEGIN/SET TRANSACTION chosen enum, set_config local statement/lock/idle, Drizzle transaction callback on same checked-out client; track commit phase; do not promise-race release; rollback on callback/deadline, destroy tainted client; retry only after known rollback. Use pinned implementation seam in EXECUTION.md; no nested transaction or fake Tx. Preserve existing caller transaction type. Fake test commit-unknown, timeout before commit, callback rejection, rollback failure, local timeout reset.

## Execution and ownership

Separate linked Change worktree, run `node scripts/repo-tools/change-branch-guard.mjs --change DB07 --target main`. One bounded Composer child at a time; no next Change authorization. Named custodian serializes shared manifest/lockfile/registry keys and docs joins; do not edit peer work. No SQL DDL or historical migration byte changes for extraction; no changes to authorization, spend, locks, wire contracts or publication behavior unless explicitly selected in this packet. No provider calls, protected DB writes or live cluster mutation.

## Acceptance and stop

Run named focused normal/negative tests in TASKS, affected builds/typechecks and module graph; prove actual source imports and exact historical SQL/journal bytes for ownership changes. Do not claim unrun SQL/cluster evidence. Actual semantic or safety contradiction stops; missing live fixture only gates live proof. **Readiness:** Ready, dependencies joined. See selected implementation details below. Only actual semantic/safety contradictions stop. Record exact accepted proof and baseline limitations.

## Planned specification and implementation delta | planned-impact.v1

| Plane | Selected authority and exact change/no-op | Related documents/maps to inspect | Evidence/decision |
| --- | --- | --- | --- |
| Product | unchanged because no player behavior, authorization or financial authority is in scope | none | no game edit |
| Technical | changed: implement selected managed transaction and admission-deadline contracts in docs/technical/platform/database-infrastructure.md; update realization only as proven | work/undertakings/storyteller-workshop/DB-PARALLEL.md work/undertakings/storyteller-workshop/OVERVIEW.md work/undertakings/storyteller-workshop/UNDERTAKING.md | selected architecture |
| Code | change: packages/db/package.json packages/db/src/index.ts packages/db/src/database.ts packages/db/src/connection/admission.ts packages/db/src/connection/managed-client.ts packages/db/src/transaction/types.ts packages/db/src/transaction/errors.ts packages/db/src/transaction/execute.ts packages/db/test/db06-admission.test.ts packages/db/test/db06-pool.test.ts packages/db/test/db07-errors.test.ts packages/db/test/db07-transaction.test.ts; negative: commit-unknown, rollback failure, constraint no-retry, deadline preservation | packages/db/README.md | source-tested |
| Related | changed: work/changes/README.md work/changes/open/README.md work/changes/ledger/2026-11.md and DB program maps reconciled at closure | work/undertakings/storyteller-workshop/DB-PARALLEL.md | archive on Done |

## Reconciliation ledger

| Affected claim | Authority | Target delta | Source delta / SHA | Evidence tier | Negative | Map |
| --- | --- | --- | --- | --- | --- | --- |
| Managed SQL transaction execution | docs/technical/platform/database-infrastructure.md#transaction-execution-and-errors | changed: managed transaction helper and SQLSTATE retry policy now realized in @offscreen/db | packages/db/src/transaction/execute.ts packages/db/src/transaction/errors.ts packages/db/src/transaction/types.ts packages/db/src/database.ts packages/db/src/index.ts packages/db/package.json packages/db/test/db07-errors.test.ts packages/db/test/db07-transaction.test.ts on change/db07-managed-transactions | source-tested (`pnpm --filter @offscreen/db test` 73/73) | commit-unknown, rollback failure, timeout-before-commit, constraint no-retry; live SQL is out of scope for this source-only packet | work/undertakings/storyteller-workshop/DB-PARALLEL.md; packages/db/README.md |
| Absolute admission deadlines and drain-before-end close | docs/technical/platform/database-infrastructure.md#database-runtime | changed: absolute total/acquisition deadlines across queue drain; close awaits actual drain | packages/db/src/connection/admission.ts packages/db/src/connection/managed-client.ts packages/db/test/db06-admission.test.ts packages/db/test/db06-pool.test.ts | source-tested (db06 regressions in the same 73/73 run) | queued wait must not reset total deadline; pending connect retains permit | N/A |
| Realization record for DB07 | docs/technical/platform/database-infrastructure.md#realization-record | changed: record DB07 source realization without claiming live SQL or domain adoption | docs/technical/platform/database-infrastructure.md | source-observed | domain callers not yet on managed helper | work/changes/README.md work/changes/open/README.md work/changes/ledger/2026-11.md work/undertakings/storyteller-workshop/OVERVIEW.md work/undertakings/storyteller-workshop/UNDERTAKING.md |

Read [EXECUTION.md](EXECUTION.md) before dispatch. No further planner approval.
