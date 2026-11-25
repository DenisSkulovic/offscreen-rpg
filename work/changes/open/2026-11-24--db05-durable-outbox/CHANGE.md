# DB05 | Delivery package extraction

**Status: Proposed / not commissioned. Kind: implementation. Profile: CONTRACT.** Baseline 7322b6f1a6df6f5ae612763b9786563dca2989eb; target main. Prerequisite: DB03 and DB01 Transaction export; DB04 disjoint ownership or serialized after it. Owner-selected near-term planning, not execution permission.

[Selected architecture](../../../../docs/technical/platform/database-infrastructure.md) · [Parallel program and frozen interfaces](../../../undertakings/storyteller-workshop/DB-PARALLEL.md) · [TASKS](TASKS.md)

## Outcome and scope

- Move delivery store: Create @offscreen/outbox with schema, enqueue, relay subpaths; move exact implementations; Transaction imported from @offscreen/db root. Keep notice identity conflict, SKIP LOCKED order, clock_timestamp lease, 30s expiry, token-fenced acknowledge. Update registry outbox module. No new delivery topics or timing changes.
- Migrate delivery and transaction consumers: Move all type-only Transaction imports to DB root, runtime enqueue/Notice to @offscreen/outbox/enqueue, relay to /relay, table to /schema. For mixed import split exactly; update direct manifests. Remove DB outbox aliases and files. Consumer inventory pinned before release. Existing SQL behavior remains byte-equivalent except imports.

## Execution and ownership

Separate linked Change worktree, run `node scripts/repo-tools/change-branch-guard.mjs --change DB05 --target main`. One bounded Composer child at a time; no next Change authorization. Named custodian serializes shared manifest/lockfile/registry keys and docs joins; do not edit peer work. No SQL DDL or historical migration byte changes for extraction; no changes to authorization, spend, locks, wire contracts or publication behavior unless explicitly selected in this packet. No provider calls, protected DB writes or live cluster mutation.

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
| Delivery package extraction | database-infrastructure | pending | NOT RUN | TASKS | pending |
