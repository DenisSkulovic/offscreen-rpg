# DB10 | Final graph guard and integrated DB proof

**Status: Proposed / not commissioned. Kind: implementation. Profile: PROOF.** Baseline 7322b6f1a6df6f5ae612763b9786563dca2989eb; target main. Prerequisite: DB02–DB09 source integrated; Cache source waves joined; disposable resource authorization gates T02 live execution only, not T01. Owner-selected near-term planning, not execution permission.

[Selected architecture](../../../../docs/technical/platform/database-infrastructure.md) · [Parallel program and frozen interfaces](../../../undertakings/storyteller-workshop/DB-PARALLEL.md) · [TASKS](TASKS.md)

## Outcome and scope

- Enforce final graph: Reject DB domain workspace imports and retired schema subpaths, identity/story schema leaves runtime imports except Drizzle/identity, browser/workflows/SQL-free executor transitive SQL closure. Add fixtures per negative. Reconcile direct manifests, lock, package READMEs/SQL-OWNERSHIP; require no residual old alias. Existing migration asset paths unchanged.
- Integrated SQL evidence: Prove disposable migration lock/rollback/hash refusal, managed saturation/recovery, serializable concurrent conflict, rollback/read-only/lock timeout, no duplicated effects. Use owned database test path; no shared tenant or live cluster authorization inferred. Verify zero generated DDL and exact tracked migration bytes. Record actual commands, cases and NOT RUN; DBOPS01/02 retain mixed version and operational proof.

## Execution and ownership

Separate linked Change worktree, run `node scripts/repo-tools/change-branch-guard.mjs --change DB10 --target main`. One bounded Composer child at a time; no next Change authorization. Named custodian serializes shared manifest/lockfile/registry keys and docs joins; do not edit peer work. No SQL DDL or historical migration byte changes for extraction; no changes to authorization, spend, locks, wire contracts or publication behavior unless explicitly selected in this packet. No provider calls, protected DB writes or live cluster mutation.

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
| Final graph guard and integrated DB proof | database-infrastructure | pending | NOT RUN | TASKS | pending |
