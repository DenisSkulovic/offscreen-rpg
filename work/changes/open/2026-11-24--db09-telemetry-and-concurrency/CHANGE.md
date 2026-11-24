# DB09 | Database observability and narrow concurrency utilities

**Status: Proposed / not commissioned. Kind: implementation. Profile: PATCH.** Baseline fa77f2d3614ee821b8e4ad849a46a66342000132; target undertaking/storyteller-workshop. Prerequisite: DB06 + DB07; no schema consumer edits. Owner-selected near-term planning, not execution permission.

[Selected architecture](../../../../docs/technical/platform/database-infrastructure.md) · [Parallel program and frozen interfaces](../../../undertakings/storyteller-workshop/DB-PARALLEL.md) · [TASKS](TASKS.md)

## Outcome and scope

- Telemetry implementation: Implement safe sink and snapshot counters, stable registered names, closed workload/outcome/error, monotonic elapsed time; wrap managed paths only, no SQL text/parameters/credentials. Observer exceptions isolated. No duplicate pg listeners. Tests sink throw, saturation, rollback/retry/unknown commit counters and no raw fields.
- Concurrency helpers: Add explicit expectOneAffected(count) typed conflict and acquireTransactionAdvisoryLock(tx, integer key) parameterized xact lock; no global lock IDs invented; no business semantics or automatic retries. Test zero/multiple count, parameterized lock and same tx only; no domain adoption.

## Execution and ownership

Separate linked Change worktree, run `node scripts/repo-tools/change-branch-guard.mjs --change DB09 --target undertaking/storyteller-workshop`. One bounded Composer child at a time; no next Change authorization. Named custodian serializes shared manifest/lockfile/registry keys and docs joins; do not edit peer work. No SQL DDL or historical migration byte changes for extraction; no changes to authorization, spend, locks, wire contracts or publication behavior unless explicitly selected in this packet. No provider calls, protected DB writes or live cluster mutation.

## Acceptance and stop

Run named focused normal/negative tests in TASKS, affected builds/typechecks and module graph; prove actual source imports and exact historical SQL/journal bytes for ownership changes. Do not claim unrun SQL/cluster evidence. Missing fixture, unresolved interface, new dependency cycle or semantic mismatch is planner stop, not executor investigation. **Readiness:** G0 target confirmed, remaining G1–G7 need current-source audit and exact fixture/consumer mapping at promotion; no Ready claim. Follow DB-PARALLEL review gates. Record exact accepted proof and baseline limitations.

## planned-impact.v1

| Plane | Disposition |
| --- | --- |
| Product | No changed player behavior, authorization or financial authority |
| Technical | Implement selected database-infrastructure contract; update realization only as proven |
| Source | Named tasks and ownership; no neighboring refactor |
| Proof | Focused tests; no unrun PASS |
| Related | Package READMEs, graph, migration registry and catalog reconciled at closure |

## Reconciliation ledger

| Affected claim | Authority | Source delta / SHA | Evidence tier | Negative | Links |
| --- | --- | --- | --- | --- | --- |
| Database observability and narrow concurrency utilities | database-infrastructure | pending | NOT RUN | TASKS | pending |
