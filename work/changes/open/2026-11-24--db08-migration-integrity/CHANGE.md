# DB08 | Migration integrity and single-runner hardening

**Status: Proposed / not commissioned. Kind: implementation. Profile: STATE.** Baseline fa77f2d3614ee821b8e4ad849a46a66342000132; target undertaking/storyteller-workshop. Prerequisite: DB01; independent of DB06 (config backward compatible). Owner-selected near-term planning, not execution permission.

[Selected architecture](../../../../docs/technical/platform/database-infrastructure.md) · [Parallel program and frozen interfaces](../../../undertakings/storyteller-workshop/DB-PARALLEL.md) · [TASKS](TASKS.md)

## Outcome and scope

- Verify applied journal prefix: Keep stable lock 683291351 and dedicated Client. Read migration entries with pinned Drizzle readMigrationFiles, compare ordered applied hashes and timestamps under lock before migrate. Empty ledger legal only when absent/empty; reject unknown, gap, tamper, duplicate/out-of-order or malformed metadata; do not repair. Preserve existing fixture where when=1 etc; planner confirms exact Drizzle metadata semantics before dispatch. Fake tests prefix match/changed hash/missing entry/newer unknown; actual SQL tests later disposable only.
- Bound runner and safe failure: Add migration-specific lock/statement budget without changing deployment path; ensure session lock retained through validation/DDL and released by end; fail safe on connection error, no retry ambiguous outcome; sanitize CLI output. Preserve generic migrationsFolder signature. Existing test competing lock and rollback plus new tamper refusal under authorized fixture.

## Execution and ownership

Separate linked Change worktree, run `node scripts/repo-tools/change-branch-guard.mjs --change DB08 --target undertaking/storyteller-workshop`. One bounded Composer child at a time; no next Change authorization. Named custodian serializes shared manifest/lockfile/registry keys and docs joins; do not edit peer work. No SQL DDL or historical migration byte changes for extraction; no changes to authorization, spend, locks, wire contracts or publication behavior unless explicitly selected in this packet. No provider calls, protected DB writes or live cluster mutation.

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
| Migration integrity and single-runner hardening | database-infrastructure | pending | NOT RUN | TASKS | pending |
