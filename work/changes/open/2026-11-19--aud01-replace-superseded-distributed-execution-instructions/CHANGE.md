# AUD01 | Replace stale RabbitMQ/Temporal execution instructions at their source

**State:** Proposed, source-grounded audit follow-up (2026-11-19)  
**Kind:** documentation  
**Selection:** Not part of Cursor's active batch; select explicitly after confirming current head and file ownership.  
**Origin:** [Snapshot 2f45deed audit](../../../designs/open/distributed-turn-poc/AUDIT-2026-11-19--2f45deed.md) · [Architecture reconciliation](../../../designs/open/distributed-turn-poc/EXECUTION-RECONCILIATION-2026-11-19.md) · [Change queue](../../README.md)

## Observable intended outcome

Replace stale RabbitMQ/Temporal execution instructions at their source. Fix a source-proven defect rather than create more speculative architecture work. Preserve ratified product and technical decisions and Cursor's active implementation scope.

## Current evidence / authority

The audit's baseline is the **committed lean ZIP at `2f45deed`**. The ZIP intentionally excludes archived Changes and historical evidence, so a missing archive file in that ZIP does not prove `main` is broken. Reinspect the latest HEAD and actual branch/merged status before edits. Source authority: [Commands, events and workflows](../../../../docs/technical/platform/execution-and-delivery.md#commands-business-events-and-workflows), [topology and ownership](../../../../docs/technical/platform/topology.md#proposed-service-ownership), current documentation/Change lifecycle policy and portable snapshot metadata.

## Bounded diff

Rewrite rather than prepend notices in `work/designs/open/distributed-turn-poc/{D1-EXECUTION-CONTRACT,D4-STORYTELLER-HANDOFF,D5-RELEASE-AND-ACCEPTANCE,README}.md`, `work/designs/open/distributed-turn-poc/EXECUTION-RECONCILIATION-2026-11-19.md` and `work/changes/README.md`. Fix/normalize existing DIST02 and DIST04 **packet bodies** (title, goal, scope, paths, acceptance, prerequisites, migration/rollback, status) to the already merged ARCH02 rule: direct SQL-outbox→Temporal RPC for orchestration; postcommit business facts→RabbitMQ→one bounded, independently recoverable subscriber only if separately selected. Remove misleading executable steps and diagrams from outdated D1/D4/D5 and prior packet descriptions; preserve historical rationale in a small clearly non-normative change note or link. Do not overwrite ratified technical owners or invent a new broker-mandatory game requirement; a consumer must be demonstrated as useful or remain independent learning-lab work. Queue must have **one** current active-batch declaration and date historical snapshots so readers of an old subsection are not misled. Keep ARCH02/03/04/05 and actual Kubernetes statuses correctly marked Done where evidenced.

**Explicit owners:** D1/D4/D5/EXECUTION/README + queue + DIST02/DIST04. `docs/technical/platform/execution-and-delivery.md#commands-business-events-and-workflows` and topology are read-only authority unless a discovered verified contradiction requires a separate ratification.

**Out of scope:** No Kubernetes deployments, checkpoint schema migrations, game/service extraction, Stripe, provider calls, image generation, indiscriminate archive removal, status inflation or new temporary docs with no durable contract.

## Acceptance and discriminating negative

No currently authoritative or executable-looking command includes RabbitMQ→Temporal as a mandatory Storyteller hop. Search all active design/Change docs for 'RabbitMQ→Temporal', 'Rabbit→Temporal', 'ARCH02 unmerged', 'K8S09 active' and inspect each hit **in context**; documented historical quotes explicitly labelled superseded. DIST02/DIST04 now have executable-looking, noncontradictory, source-specific acceptance and negative cases. An agent retrieving D5 Gate A alone gets the correct graph. Queue's active-batch state and STATUS agree with actual source/record, no premature Done.

**Negative:** A lean snapshot's expected excluded archive file is not reported as a source regression. A previously ratified service-authority decision cannot be reversed by a documentation convenience fix. No edit may hide a failed full-repo validation behind a lean-only success or accidentally revive a broker→Temporal mandatory chain. Running Cursor branches are not overwritten.

## Scheduling / collision policy

A single docs coordinator writes this packet, not the running K8S06/DATA02/K8S08 agents. It can run in isolated worktree while executable branches continue; lock the Change queue and D1–D5/DIST02/DIST04 files for one merge.

The Change must follow the repository's ordinary planning and closure workflow: source-inspect before work, record exact change-set SHA/diffs and outcome, reconcile affected **canonical** docs rather than only this packet, run source-relevant validation with honest NOT-RUN where unavailable, then archive once Done. No automatic permission to execute from audit existence.

## planned-impact.v1

| Plane | Expected impact | Closure evidence |
| --- | --- | --- |
| Product | No gameplay or commercial changes | No new rule, scene or economy system |
| Technical | Remove contradictory or broken documentation/tooling behavior; keep source-grounded status | Exact before/after claims and relevant negatives |
| Code | No executable diff | Tests and diff where applicable |
| Related | Queue/audit traceability, link validity, wiki and guard checks | Original audit issue mapped to an actual Change receipt |

## Reconciliation ledger (fill on closure)

| Audit issue / owner | Intended edit or reasoned no-op | Source SHA / changed path | Positive and negative result | Evidence / status |
| --- | --- | --- | --- | --- |
| A1/A5 | Pending | Pending | Pending | Pending |
| Canonical technical / queue claims | Preserve or reconcile | Pending | Pending | Pending |
| Other impacted owners | Inspect | Pending | Pending | Pending |
