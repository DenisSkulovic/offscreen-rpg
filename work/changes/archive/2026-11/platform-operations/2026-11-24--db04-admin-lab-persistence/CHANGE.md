# DB04 | Admin and QA table ownership

**Status: Done / source-only. Kind: implementation. Profile: CONTRACT.** Baseline d08e36d809bb53c48fef3351224994bae92b6e7c; target main. DB03 joined; DB05 not concurrent. T01–T02 accepted. Joined main at pending-commit. Live PostgreSQL remains separately gated and is not part of this Change's accepted proof.

[Selected architecture](../../../../../../docs/technical/platform/database-infrastructure.md) · [Parallel program and frozen interfaces](../../../../../undertakings/storyteller-workshop/DB-PARALLEL.md) · [TASKS](TASKS.md)

## Outcome and scope

- Move Admin schema: Move exact schema to packages/admin/src/persistence/schema.ts; import user/session from identity leaf; internal imports relative, external consumers @offscreen/admin/persistence/schema. Add explicit export and identity direct dep. Registry admin module consumes new export. Delete old DB export/file; preserve staff/actor/session constraints and audit semantics.
- Move QA schema: Move exact QA tables to packages/lab-support/src/persistence/schema.ts, identity FK from leaf, local use relative. External test consumers use explicit lab persistence export. Registry QA module consumes it. Remove residual temporary DB dependency on identity leaf after no declarations import it; do not grant production API lab runtime edge.

## Execution and ownership

Separate linked Change worktree, run `node scripts/repo-tools/change-branch-guard.mjs --change DB04 --target main`. One bounded Composer child at a time; no next Change authorization. Named custodian serializes shared manifest/lockfile/registry keys and docs joins; do not edit peer work. No SQL DDL or historical migration byte changes for extraction; no changes to authorization, spend, locks, wire contracts or publication behavior unless explicitly selected in this packet. No provider calls, protected DB writes or live cluster mutation.

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
| Admin and QA table ownership | database-infrastructure | Admin → `@offscreen/admin/persistence/schema`; QA → `@offscreen/lab-support/persistence/schema`; `./admin-schema` and `./qa-schema` removed from `@offscreen/db`; identity dep removed from db; registry remapped; join SHA recorded after main merge | source-tested: admin tests 34/34; `check:schema` ok; turbo build/typecheck admin+lab+db+db-migrations PASS; migration diff empty | zero residual `@offscreen/db/(admin\|qa)-schema` literals among remapped callers; live SQL NOT RUN | [realization record](../../../../../../docs/technical/platform/database-infrastructure.md#realization-record) · [SOURCE-MAP](SOURCE-MAP.md) · [db README](../../../../../../packages/db/README.md) |

Read [SOURCE-MAP.md](SOURCE-MAP.md) for frozen source mapping and implementation decisions. No new live resource permission.
