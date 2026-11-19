# DIST01 | Ratify writer ownership, transport choreography and migration sequence

**State:** Ready for owner-authorized design reconciliation (2026-11-19)  
**Kind:** documentation  
**Execution:** Owner may explicitly select this docs reconciliation; inspect the active ARCH02 branch first.  
**Program:** [Program](../../../designs/open/distributed-turn-poc/README.md) · [Gap register](../../../designs/open/distributed-turn-poc/GAPS.md) · [D1 candidate contract](../../../designs/open/distributed-turn-poc/D1-EXECUTION-CONTRACT.md)

## Goal / independently verifiable outcome

Ratify writer ownership, transport choreography and migration sequence. This Change is one bounded documentation outcome in the [distributed-turn POC](../../../designs/open/distributed-turn-poc/README.md), not authorization to implement the entire initiative.

## Current source owners and exact baseline

Source inspected on 2026-11-19 at GitHub `main`: [Work queue](../../README.md), [runtime](../../../../apps/worker/src/runtime/index.ts), [worker Activity adapter](../../../../apps/worker/src/activities/index.ts), [outbox](../../../../apps/worker/src/outbox/dispatch.ts), [application stories](../../../../packages/application/src/stories/README.md), [Storyteller publication](../../../../docs/technical/storyteller/generation-and-publication.md), [canonical files](../../../../docs/technical/storyteller/canonical-documents-and-packages.md). Reinspect current HEAD and the user's active Cursor branches. The source currently combines work in `apps/worker`; this plan does **not** claim it is already distributed. Existing local Compose stays a working fallback.

**Prerequisites:** ARCH01 Done; coordinate with **ARCH02 active/unmerged Cursor branch**. No shared-file writes during its integration.

## Implementation / documentation delta

Reconcile [candidate D1 contract](../../../designs/open/distributed-turn-poc/D1-EXECUTION-CONTRACT.md) against source-observed `apps/worker/src/runtime/index.ts`, `apps/worker/src/activities/index.ts`, `apps/worker/src/outbox/dispatch.ts`, `packages/application/src/storyteller/runtime.ts` and current ARCH02 branch. Select a single Game Authority SQL writer, a separate Storyteller *execution-only* Temporal worker, and SQL-outbox→RabbitMQ→Temporal handoff for only explicitly migrated topics. Determine exact process permissions, command→proposal→publication owner, per-topic migration/rollback switches and two Task Queue boundaries. Keep old Compose path executable. Resolve source incompatibilities before making selected claims.

**Specific owners/paths to touch:** `docs/technical/platform/topology.md#distributed-learning-target`, `docs/technical/platform/execution-and-delivery.md#commands-and-durable-delivery`, `docs/technical/storyteller/generation-and-publication.md#what-publication-is-allowed-to-do`, `docs/technical/platform/data-and-persistence.md#who-owns-the-durable-record`, `docs/technical/README.md` and index maps only where necessary. Preserve historical ARCH01 and D-0001 rationale.

**Hard exclusions:** No paid provider dispatch, no Stripe or customer billing, no image generator, no arbitrary new gameplay, no fictional Economy service, no live secrets or destructive data reset. Do not work around a missing architectural contract by claiming the service is 'blocked forever'; report one concrete mismatch with exact sources and revise the narrow contract.

## Acceptance: positive and discriminating negative

**Positive proof:** Produce a table: every existing `dispatchedNoticeTopics` topic, current workflow ID, selected legacy-vs-Rabbit route, receiving worker/queue, writer, dedup fence and fallback. One diagram for start/command/turn/publication, and three negative walkthroughs: duplicate broker notice, stale provider proposal, fork-from-old-scene.

**Negative proof:** A reader cannot conclude each microservice writes its own game DB schema, RabbitMQ can reroll mechanics, a model can publish canon, or a second relay dispatches the same notice.

**Evidence/report:** source and SHA inspected; intended/actual command and event state diagram; file diff; exact commands/tests and result counts; status of each normal/negative test; version/compatibility and resource evidence where relevant. Tests on fakes do not count as deployed Rabbit/Temporal proof. Never mark a contract satisfied merely because a Pod is Ready.

## Documentation is a required implementation plane

Update the **canonical** owning headings as part of the same code diff or ratifying documentation Change: [topology](../../../../docs/technical/platform/topology.md#distributed-learning-target), [execution/outbox](../../../../docs/technical/platform/execution-and-delivery.md#commands-and-durable-delivery), [data](../../../../docs/technical/platform/data-and-persistence.md#who-owns-the-durable-record), [Storyteller](../../../../docs/technical/storyteller/generation-and-publication.md#what-publication-is-allowed-to-do), and the relevant source maps/runbooks/STATUS. Edit **only the owner headings materially changed**; leave reasoned no-ops. Do not copy this packet wholesale into every spec. Historical product promises on D&D, scene forking and canonical files remain intact. Run `pnpm wiki:change-guard --mode plan` and `--mode close`, source-relevant tests and doc link checks where available, report skipped checks honestly.

## Parallel orchestration

Read-only mapping may parallel K8S03/K8S09, image-build investigation and package inventory. Shared topology/execution docs **must serialize with ARCH02** and have one integrator.

A user-approved Cursor orchestrator may distribute truly disjoint Ready Changes into isolated worktrees. It must integrate dependencies, shared canonical-doc headings and the same cluster itself. **A Proposed packet is not executable merely because another packet was authorized.**

## Planned-impact.v1 (complete receipt before archiving)

| Plane | Exact planned difference | Proof |
| --- | --- | --- |
| Product | unchanged; world-neutral D&D, text-first DM, admitted mechanical truth, forkable scenes | No new economy, mandatory inventory or invented rule |
| Technical | Ratify the process/writer/transport ownership and update existing owners | Normal and negative sequence/contract check |
| Code | No code allowed | Actual diff, tests and version compatibility |
| Related | Update affected source maps, docs index, runbooks, Change queue, dated STATUS only when runtime behavior is proven | Wiki/Change guards, links and evidence |

## Reconciliation ledger (fill with actual evidence)

| Owning claim/heading | Expected delta or reasoned no-op | Source SHA / diff | Test or semantic proof | Negative proof | Status/link |
| --- | --- | --- | --- | --- | --- |
| Technical runtime owner | Pending | Pending | Pending | Pending | Pending |
| Execution / outbox owner | Pending | Pending | Pending | Pending | Pending |
| Product/scene and Storyteller boundary | unchanged unless ratified | Pending | Pending | Pending | Pending |
| Source implementation / tests | unchanged | Pending | Pending | Pending | Pending |

**Closure:** Reconcile the ledger, archive Done/Cancelled per established workflow, repair inbound links, stop. No automatic successor selection.
