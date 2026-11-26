# DB10 | Final graph guard and integrated DB proof

**State:** Done (source scope only; owner-approved closure 2026-11-26). T01–T03 joined main at `a658f707aeb93d425f3712cbcd63a577855cf1d8`; live SQL NOT RUN, transferred to [VER04](../../../../open/2026-11-25--ver04-db-transaction-migration-recovery-programme/CHANGE.md). Historical full graph failure remains unverified on current HEAD; no PASS credit. Prior execution instructions below are historical, not commission.

[Selected architecture](../../../../../../docs/technical/platform/database-infrastructure.md) · [Parallel program and frozen interfaces](../../../../../undertakings/storyteller-workshop/DB-PARALLEL.md) · [TASKS](TASKS.md)

## Outcome and scope

- Enforce final graph: Reject DB domain workspace imports and retired schema subpaths, identity/story schema leaves runtime imports except Drizzle/identity, browser/workflows/SQL-free executor transitive SQL closure. Add fixtures per negative. Reconcile direct manifests, lock, package READMEs/SQL-OWNERSHIP; require no residual old alias. Existing migration asset paths unchanged.
- Integrated SQL evidence: Prove disposable migration lock/rollback/hash refusal, managed saturation/recovery, serializable concurrent conflict, rollback/read-only/lock timeout, no duplicated effects. Use owned database test path; no shared tenant or live cluster authorization inferred. Verify zero generated DDL and exact tracked migration bytes. Record actual commands, cases and NOT RUN; DBOPS01/02 retain mixed version and operational proof.

## Execution and ownership

Separate linked Change worktree, run `node scripts/repo-tools/change-branch-guard.mjs --change DB10 --target main`. One bounded Composer child at a time; no next Change authorization. Named custodian serializes shared manifest/lockfile/registry keys and docs joins; do not edit peer work. No SQL DDL or historical migration byte changes for extraction; no changes to authorization, spend, locks, wire contracts or publication behavior unless explicitly selected in this packet. No provider calls, protected DB writes or live cluster mutation.

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

| Affected claim | Authority | Source delta / SHA | Evidence tier | Negative | Links |
| --- | --- | --- | --- | --- | --- |
| Final graph guard (T01–T02 source) | database-infrastructure | T01–T02 on change/db10; module-graph + wiki owners | pure PASS (focused); full `pnpm repo:module-graph` still fails pre-existing `forbidden-authority-writer-import` in action-executions.ts | retired db subpath / non-table path refusal | README, SQL-OWNERSHIP, realization updated |
| Integrated disposable SQL proof (T03) | database-infrastructure | harness in packages/db/test/database.integration.ts + test:integration wiring | build+unit PASS; live NOT RUN (DATABASE_TEST_URL unset) | loopback/offscreen_db_test guard throws without URL | pending live |

Read [EXECUTION.md](EXECUTION.md) for frozen source mapping and implementation decisions before dispatch. The revised TASKS supersede older outcome shorthand wherever more precise. No new live resource permission.

## Retirement receipt

Owner explicitly accepted source-scope closure. Preserve migration lock/rollback/hash refusal, managed saturation/recovery, serializable conflicts, rollback/read-only/lock timeouts and duplicate-effect oracle through VER04. Historical graph violation `forbidden-authority-writer-import` in `packages/story-engine/src/campaign/action-executions.ts` remains a distinct source health obligation; current file still imports writer-continuation runtime constant, but full graph check NOT RUN. DBOPS01/02 retain their complementary scopes. Recovery: `68663d698c4a5a6c6d31b46fa7876ab17a136adf:work/changes/open/2026-11-24--db10-dependency-closure-and-proof/CHANGE.md`.
