# DB06 | Bounded PostgreSQL connection runtime

**Status: Done / source-only. Kind: implementation. Profile: STATE.** Release baseline 7033f654091a4fc66c7de6b0dce37e2b8fb504c1; target undertaking/storyteller-workshop. No dependency on other wave-0 Changes. [Exact implementation and proof](EXECUTION.md). DB01 parent is integration custodian. No live PostgreSQL authorization; DB08 live acceptance remains separately gated.

[Selected architecture](../../../../../../docs/technical/platform/database-infrastructure.md) · [Parallel program and frozen interfaces](../../../../../undertakings/storyteller-workshop/DB-PARALLEL.md) · [TASKS](TASKS.md)

## Outcome and scope

- Config and FIFO admission: Preserve existing config shape/defaults; add optional managed fields via separate parsed object or optional properties preserving hand-built fixture config. Implement src/connection/admission.ts bounded FIFO, max20 waiters, monotonic deadline, abort before admission, saturation, close drains/refuses. Permit held until actual settled work, late acquire releases immediately. Fake-clock tests for overflow, abort, timeout, close, FIFO, late acquire.
- Managed pool lifecycle: Preserve db/checkConnection/close signatures; add managed withClient seam (frozen program), typed narrow injectable lease runtime; pool error handling safe, idempotent close, one checkout per operation. Probe bounded through admission, with caller-visible deadline retaining actual work capacity; no direct raw DB calls silently marked managed. Fake tests late acquisition after close, callback throw, double close, tainted release and no premature permit release.

## Execution and ownership

Separate linked Change worktree, run `node scripts/repo-tools/change-branch-guard.mjs --change DB06 --target undertaking/storyteller-workshop`. One bounded Composer child at a time; no next Change authorization. Named custodian serializes shared manifest/lockfile/registry keys and docs joins; do not edit peer work. No SQL DDL or historical migration byte changes for extraction; no changes to authorization, spend, locks, wire contracts or publication behavior unless explicitly selected in this packet. No provider calls, protected DB writes or live cluster mutation.

## Acceptance and stop

Run named focused normal/negative tests in TASKS, affected builds/typechecks and module graph; prove actual source imports and exact historical SQL/journal bytes for ownership changes. Do not claim unrun SQL/cluster evidence. Actual source/contract contradiction or new cycle is planner stop. Creating the named tests is implementation, not a missing-fixture blocker. No live resource needed for source dispatch. **Readiness:** Current-source review and exact source implementation/proof selected in [Exact implementation and proof](EXECUTION.md); source Ready. No local build or live proof claimed by planner. Record exact accepted proof and baseline limitations.

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
| Bounded PostgreSQL connection runtime | database-infrastructure realization record | packages/db connection, config, and database on undertaking/storyteller-workshop 6d20838e | source-tested | saturated queue, closed late acquire, probe timeout keeps the permit; live PostgreSQL NOT RUN | joined with DB01 and DB08 |
