# DB01 | Schema composition and identity baseline

**Status: Ready / owner-commissioned for source implementation. Kind: implementation. Profile: CONTRACT.** Release baseline 7033f654091a4fc66c7de6b0dce37e2b8fb504c1; target undertaking/storyteller-workshop. No dependency on other wave-0 Changes. [Exact source map and proof](SOURCE-MAP.md). DB01 parent is integration custodian. No live PostgreSQL authorization; DB08 live acceptance remains separately gated.

[Selected architecture](../../../../docs/technical/platform/database-infrastructure.md) · [Parallel program and frozen interfaces](../../../undertakings/storyteller-workshop/DB-PARALLEL.md) · [TASKS](TASKS.md)

## Outcome and scope

- Freeze all table identities: Capture frozen synthetic current-schema baseline from original schema before edits; create explicit registry with 71 tables and three auth relations. Preserve 20 Writer-table fingerprint. Exact table names and baseline digest algorithm in SOURCE-MAP.md; no rewriting expected fixture after extraction.
- Move generator composition: Move Drizzle Kit config/generate script to tools/db-migrations, pinned 0.31.10, explicit registry schema source, out ../../packages/db/migrations resolved from tool cwd. Provide check:schema against frozen synthetic baseline and fresh snapshot digest. Current checked-in history has 25 entries but latest snapshot idx4 contains 48 tables; tracked generation refuses until metadata reconciliation (DBOPS01). Historical SQL and journal unchanged. See SOURCE-MAP.md. Never run generator directly in tracked migration dir during proof. Update baseline.mjs filter and dev sync classification/tests for new generator config path; remove old config and generate script. Preserve migrate CLI and migration folder paths.
- Neutral transaction type and policy vocabulary: Extract Transaction type to src/transaction/types.ts; export root type; old outbox module reexports until DB05 rewrites callers. Define shared policy types and error/telemetry contracts in src/transaction/policy.ts and src/telemetry/types.ts (see program). No runtime behavior changes. Positive compile existing callers; negative invalid policy/label type tests.

## Execution and ownership

Separate linked Change worktree, run `node scripts/repo-tools/change-branch-guard.mjs --change DB01 --target undertaking/storyteller-workshop`. One bounded Composer child at a time; no next Change authorization. Named custodian serializes shared manifest/lockfile/registry keys and docs joins; do not edit peer work. No SQL DDL or historical migration byte changes for extraction; no changes to authorization, spend, locks, wire contracts or publication behavior unless explicitly selected in this packet. No provider calls, protected DB writes or live cluster mutation.

## Acceptance and stop

Run named focused normal/negative tests in TASKS, affected builds/typechecks and module graph; prove actual source imports and exact historical SQL/journal bytes for ownership changes. Do not claim unrun SQL/cluster evidence. Actual source/contract contradiction or new cycle is planner stop. Creating the named tests is implementation, not a missing-fixture blocker. No live resource needed for source dispatch. **Readiness:** Current-source review and exact source implementation/proof selected in [Exact source map and proof](SOURCE-MAP.md); source Ready. No local build or live proof claimed by planner. Record exact accepted proof and baseline limitations.

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
| Schema composition and identity baseline | database-infrastructure | pending | NOT RUN | TASKS | pending |
