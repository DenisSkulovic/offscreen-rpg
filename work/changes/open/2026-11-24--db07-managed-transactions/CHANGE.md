# DB07 | Managed SQL transaction execution

**Status: Proposed / not commissioned. Kind: implementation. Profile: STATE.** Baseline fa77f2d3614ee821b8e4ad849a46a66342000132; target undertaking/storyteller-workshop. Prerequisite: DB06 plus DB01 policies; no domain adoption. Owner-selected near-term planning, not execution permission.

[Selected architecture](../../../../docs/technical/platform/database-infrastructure.md) · [Parallel program and frozen interfaces](../../../undertakings/storyteller-workshop/DB-PARALLEL.md) · [TASKS](TASKS.md)

## Outcome and scope

- Classify failures and retry policy: Implement bounded cause walk SQLSTATE classification; preserve internal cause, closed category; default no retry; only 40001/40P01 known rollback with sql-only-conflicts policy; <=3 attempts, jitter25–200ms remaining budget. Explicit unknown commit class never retry; constraints/lock/timeouts/auth/application errors never retry. Deterministic fake tests for wrapped errors, callback attempt count, budget and no retry on connection loss.
- Managed transaction runner: Implement transaction/execute.ts against withClient: BEGIN/SET TRANSACTION chosen enum, set_config local statement/lock/idle, Drizzle transaction callback on same checked-out client; track commit phase; do not promise-race release; rollback on callback/deadline, destroy tainted client; retry only after known rollback. Exact Drizzle transaction API/commit phase proof must be pinned by planner (do not use nested transaction or invent fake Tx); if pinned API cannot expose commit phase safely, stop. Preserve existing caller transaction type. Fake test commit-unknown, timeout before commit, callback rejection, rollback failure, local timeout reset.

## Execution and ownership

Separate linked Change worktree, run `node scripts/repo-tools/change-branch-guard.mjs --change DB07 --target undertaking/storyteller-workshop`. One bounded Composer child at a time; no next Change authorization. Named custodian serializes shared manifest/lockfile/registry keys and docs joins; do not edit peer work. No SQL DDL or historical migration byte changes for extraction; no changes to authorization, spend, locks, wire contracts or publication behavior unless explicitly selected in this packet. No provider calls, protected DB writes or live cluster mutation.

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
| Managed SQL transaction execution | database-infrastructure | pending | NOT RUN | TASKS | pending |
