# DB09 | Database observability and narrow concurrency utilities

**State:** Done / source-only. Kind: implementation. Profile: PATCH. Baseline d08e36d809bb53c48fef3351224994bae92b6e7c; target main. DB07 joined. T01–T02 accepted. Live PostgreSQL remains separately gated under DB10 and is not part of this Change's accepted proof.

[Selected architecture](../../../../docs/technical/platform/database-infrastructure.md) · [Parallel program and frozen interfaces](../../../undertakings/storyteller-workshop/DB-PARALLEL.md) · [TASKS](TASKS.md)

## Outcome and scope

- Telemetry implementation: Implement safe sink and snapshot counters, stable registered names, closed workload/outcome/error, monotonic elapsed time; wrap managed paths only, no SQL text/parameters/credentials. Observer exceptions isolated. No duplicate pg listeners. Tests sink throw, saturation, rollback/retry/unknown commit counters and no raw fields.
- Concurrency helpers: Add explicit expectOneAffected(count) typed conflict and acquireTransactionAdvisoryLock(tx, integer key) parameterized xact lock; no global lock IDs invented; no business semantics or automatic retries. Test zero/multiple count, parameterized lock and same tx only; no domain adoption.

## Execution and ownership

Separate linked Change worktree, run `node scripts/repo-tools/change-branch-guard.mjs --change DB09 --target main`. One bounded Composer child at a time; no next Change authorization. Named custodian serializes shared manifest/lockfile/registry keys and docs joins; do not edit peer work. No SQL DDL or historical migration byte changes for extraction; no changes to authorization, spend, locks, wire contracts or publication behavior unless explicitly selected in this packet. No provider calls, protected DB writes or live cluster mutation.

## Acceptance and stop

Run named focused normal/negative tests in TASKS, affected builds/typechecks and module graph; prove actual source imports and exact historical SQL/journal bytes for ownership changes. Do not claim unrun SQL/cluster evidence. Missing live fixture gates live proof only; actual semantic or safety contradiction stops. **Readiness:** source mapping and selected implementation refreshed at the stated baseline; predecessor postconditions required as above; live proof separately gated. Follow DB-PARALLEL review gates. Record exact accepted proof and baseline limitations.

## planned-impact.v1

| Plane | Disposition |
| --- | --- |
| Product | No changed player behavior, authorization or financial authority |
| Technical | Implement selected database-infrastructure contract; update realization only as proven |
| Source | Named tasks and ownership; no neighboring refactor |
| Proof | Focused tests; no unrun PASS |
| Related | Package READMEs, graph, migration registry and catalog reconciled at closure |

## Reconciliation ledger

| Affected claim | Authority | Target delta | Source delta / SHA | Evidence tier | Negative | Map |
| --- | --- | --- | --- | --- | --- | --- |
| Database observability (bounded telemetry) | docs/technical/platform/database-infrastructure.md#query-performance-and-telemetry | changed: optional observer, telemetrySnapshot, bounded counters/gauges on managed paths | packages/db/src/telemetry/runtime.ts packages/db/src/telemetry/types.ts packages/db/src/database.ts packages/db/src/connection/admission.ts packages/db/src/transaction/execute.ts packages/db/test/db09-telemetry.test.ts joined on main `703da773f69df6d5f61d4bc46cf02c8125972a96` | source-tested (`pnpm --filter @offscreen/db test` 85/85) | observer throw; saturation; rollback/retry/unknown commit; secret-bearing errors omit raw fields; no query telemetry claim; live SQL out of scope | packages/db/README.md; work/undertakings/storyteller-workshop/DB-PARALLEL.md |
| Narrow concurrency helpers | docs/technical/platform/database-infrastructure.md#transaction-execution-and-errors | changed: expectOneAffected and acquireTransactionAdvisoryLock realized | packages/db/src/transaction/concurrency.ts packages/db/src/transaction/errors.ts packages/db/src/index.ts packages/db/test/db09-concurrency.test.ts | source-tested (same 85/85) | count 0/2/NaN reject; invalid keys no execute; same-tx parameterized lock only | packages/db/README.md |
| Realization record for DB09 | docs/technical/platform/database-infrastructure.md#realization-record | changed: record DB09 source realization without claiming live SQL or domain adoption | docs/technical/platform/database-infrastructure.md | source-observed | domain callers not adopted; live PostgreSQL NOT RUN | work/changes/README.md work/changes/open/README.md work/changes/ledger/2026-11.md work/undertakings/storyteller-workshop/OVERVIEW.md work/undertakings/storyteller-workshop/UNDERTAKING.md |

Read [EXECUTION.md](EXECUTION.md) for frozen source mapping and implementation decisions. No new live resource permission.
