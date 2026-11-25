# DB05 | Delivery package extraction

**Status: Ready (dependency-gated) / owner-commissioned source implementation. Kind: implementation. Profile: CONTRACT.** Baseline d08e36d809bb53c48fef3351224994bae92b6e7c; target main. DB04 joined (includes DB03); DB01 Transaction root export remains. No further planner promotion for the frozen scope.

[Selected architecture](../../../../docs/technical/platform/database-infrastructure.md) · [Parallel program and frozen interfaces](../../../undertakings/storyteller-workshop/DB-PARALLEL.md) · [TASKS](TASKS.md)

## Outcome and scope

- Move delivery store: Create @offscreen/outbox with schema, enqueue, relay subpaths; move exact implementations; Transaction imported from @offscreen/db root. Keep notice identity conflict, SKIP LOCKED order, clock_timestamp lease, 30s expiry, token-fenced acknowledge. Update registry outbox module. No new delivery topics or timing changes.
- Migrate delivery and transaction consumers: Move all type-only Transaction imports to DB root, runtime enqueue/Notice to @offscreen/outbox/enqueue, relay to /relay, table to /schema. For mixed import split exactly; update direct manifests. Remove DB outbox aliases and files. Use exact literal selector and workspace map in SOURCE-MAP.md. Existing SQL behavior remains byte-equivalent except imports.

## Execution and ownership

Separate linked Change worktree, run `node scripts/repo-tools/change-branch-guard.mjs --change DB05 --target main`. One bounded Composer child at a time; no next Change authorization. Named custodian serializes shared manifest/lockfile/registry keys and docs joins; do not edit peer work. No SQL DDL or historical migration byte changes for extraction; no changes to authorization, spend, locks, wire contracts or publication behavior unless explicitly selected in this packet. No provider calls, protected DB writes or live cluster mutation.

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
| Delivery package extraction | database-infrastructure | pending | NOT RUN | TASKS | pending |

Read [SOURCE-MAP.md](SOURCE-MAP.md) for frozen source mapping and implementation decisions before dispatch. The revised TASKS supersede older outcome shorthand wherever more precise. No new live resource permission.
