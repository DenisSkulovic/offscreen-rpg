# DB08 | Migration integrity and single-runner hardening

**Status: source implemented / live acceptance open. Kind: implementation. Profile: STATE.** Release baseline 7033f654091a4fc66c7de6b0dce37e2b8fb504c1; target undertaking/storyteller-workshop. No dependency on other wave-0 Changes. [Exact implementation and proof](EXECUTION.md). DB01 parent is integration custodian. No live PostgreSQL authorization; DB08 live acceptance remains separately gated.

[Selected architecture](../../../../docs/technical/platform/database-infrastructure.md) · [Parallel program and frozen interfaces](../../../undertakings/storyteller-workshop/DB-PARALLEL.md) · [TASKS](TASKS.md)

## Outcome and scope

- Verify applied journal prefix: Keep stable lock 683291351 and dedicated Client. Read migration entries with pinned Drizzle readMigrationFiles, compare ordered applied hashes and timestamps under lock before migrate. Empty ledger legal only when absent/empty; reject unknown, gap, tamper, duplicate/out-of-order or malformed metadata; do not repair. Pinned Drizzle 0.45.2 source verified; exact one-read dialect seam and corrected failing fixture prefix in EXECUTION.md. Fake tests prefix match/changed hash/missing entry/newer unknown; actual SQL tests later disposable only.
- Bound runner and safe failure: Set bounded migration lock timeout and retain configured statement budget without changing deployment path; ensure session lock retained through validation/DDL and released by end; fail safe on connection error, no retry ambiguous outcome; sanitize CLI output. Preserve generic migrationsFolder signature. Existing test competing lock and rollback plus new tamper refusal under authorized fixture.

## Execution and ownership

Separate linked Change worktree, run `node scripts/repo-tools/change-branch-guard.mjs --change DB08 --target undertaking/storyteller-workshop`. One bounded Composer child at a time; no next Change authorization. Named custodian serializes shared manifest/lockfile/registry keys and docs joins; do not edit peer work. No SQL DDL or historical migration byte changes for extraction; no changes to authorization, spend, locks, wire contracts or publication behavior unless explicitly selected in this packet. No provider calls, protected DB writes or live cluster mutation.

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
| Migration integrity and single-runner hardening | database-infrastructure | change/db08-migration-integrity source; historical SQL/journal bytes unchanged from 7033f654 | source tests PASS; live SQL NOT RUN | journal tamper/unknown and runner refusal in db08-*.test.ts; integration fixture NOT RUN | DB01 owns the shared join |
