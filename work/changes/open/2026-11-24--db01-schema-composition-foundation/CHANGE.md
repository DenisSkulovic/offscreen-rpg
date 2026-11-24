# DB01 | Schema composition and identity baseline

**Status: Proposed / not commissioned. Kind: implementation. Profile: CONTRACT.** Baseline fa77f2d3614ee821b8e4ad849a46a66342000132; target undertaking/storyteller-workshop. Prerequisite: None; Cache foundation independent; coordinate shared manifest joins. Owner-selected near-term planning, not execution permission.

[Selected architecture](../../../../docs/technical/platform/database-infrastructure.md) · [Parallel program and frozen interfaces](../../../undertakings/storyteller-workshop/DB-PARALLEL.md) · [TASKS](TASKS.md)

## Outcome and scope

- Freeze all table identities: Create tools/db-migrations private workspace, explicit per-family registry modules auth, story, admin, qa, outbox; import current canonical DB schema exports. Include every table and auth relation; 71 tables from inspected declarations, 20 Writer tables. Move existing schema identity test into tool with unchanged fingerprint; add full-table identity fingerprint and diagnostic missing-table/FK/default change. Canonicalize only stable SQL config fields; render check/default/index SQL with PgDialect, not raw object identity. Capture baseline from pre-extraction schema, never regenerate expected digest to make migration pass.
- Move generator composition: Move Drizzle Kit config/generate script to tools/db-migrations, pinned 0.31.10, explicit registry schema source, out ../../packages/db/migrations resolved from tool cwd. Provide separate check-schema script copies migration dir to mkdtemp, writes temp config inside tool with absolute registry/out paths, runs generator non-interactively, compares all files SHA256, fails on new SQL or modified snapshot/journal, cleanup finally. Never run generator directly in tracked migration dir during proof. Update baseline.mjs filter and dev sync classification/tests for new generator config path; remove old config and generate script. Preserve migrate CLI and migration folder paths.
- Neutral transaction type and policy vocabulary: Extract Transaction type to src/transaction/types.ts; export root type; old outbox module reexports until DB05 rewrites callers. Define shared policy types and error/telemetry contracts in src/transaction/policy.ts and src/telemetry/types.ts (see program). No runtime behavior changes. Positive compile existing callers; negative invalid policy/label type tests.

## Execution and ownership

Separate linked Change worktree, run `node scripts/repo-tools/change-branch-guard.mjs --change DB01 --target undertaking/storyteller-workshop`. One bounded Composer child at a time; no next Change authorization. Named custodian serializes shared manifest/lockfile/registry keys and docs joins; do not edit peer work. No SQL DDL or historical migration byte changes for extraction; no changes to authorization, spend, locks, wire contracts or publication behavior unless explicitly selected in this packet. No provider calls, protected DB writes or live cluster mutation.

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
| Schema composition and identity baseline | database-infrastructure | pending | NOT RUN | TASKS | pending |
