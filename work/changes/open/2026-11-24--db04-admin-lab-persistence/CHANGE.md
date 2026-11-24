# DB04 | Admin and QA table ownership

**Status: Proposed / not commissioned. Kind: implementation. Profile: CONTRACT.** Baseline fa77f2d3614ee821b8e4ad849a46a66342000132; target undertaking/storyteller-workshop. Prerequisite: DB03; coordinate DB05 test/import ownership; DB04/05 may overlap only if exact changed files disjoint. Owner-selected near-term planning, not execution permission.

[Selected architecture](../../../../docs/technical/platform/database-infrastructure.md) · [Parallel program and frozen interfaces](../../../undertakings/storyteller-workshop/DB-PARALLEL.md) · [TASKS](TASKS.md)

## Outcome and scope

- Move Admin schema: Move exact schema to packages/admin/src/persistence/schema.ts; import user/session from identity leaf; internal imports relative, external consumers @offscreen/admin/persistence/schema. Add explicit export and identity direct dep. Registry admin module consumes new export. Delete old DB export/file; preserve staff/actor/session constraints and audit semantics.
- Move QA schema: Move exact QA tables to packages/lab-support/src/persistence/schema.ts, identity FK from leaf, local use relative. External test consumers use explicit lab persistence export. Registry QA module consumes it. Remove residual temporary DB dependency on identity leaf after no declarations import it; do not grant production API lab runtime edge.

## Execution and ownership

Separate linked Change worktree, run `node scripts/repo-tools/change-branch-guard.mjs --change DB04 --target undertaking/storyteller-workshop`. One bounded Composer child at a time; no next Change authorization. Named custodian serializes shared manifest/lockfile/registry keys and docs joins; do not edit peer work. No SQL DDL or historical migration byte changes for extraction; no changes to authorization, spend, locks, wire contracts or publication behavior unless explicitly selected in this packet. No provider calls, protected DB writes or live cluster mutation.

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
| Admin and QA table ownership | database-infrastructure | pending | NOT RUN | TASKS | pending |
