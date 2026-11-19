# DIST01 | Ratify writer ownership, transport choreography and migration sequence

**State:** Ready for owner-authorized design reconciliation (2026-11-19)  
**Kind:** documentation  
**Execution:** Owner may explicitly select this docs reconciliation; inspect the active ARCH02 branch first.  
**Program:** [Program](../../../designs/open/distributed-turn-poc/README.md) · [Gap register](../../../designs/open/distributed-turn-poc/GAPS.md) · [D1 candidate contract](../../../designs/open/distributed-turn-poc/D1-EXECUTION-CONTRACT.md)

**Current-head correction, 2026-11-19:** ARCH02 is **Done and merged**, not active/unmerged. The canonical [commands/events/workflows](../../../../docs/technical/platform/execution-and-delivery.md#commands-business-events-and-workflows) already selects direct SQL-outbox→Temporal starts/wakes and separate RabbitMQ postcommit **business-event** distribution. Treat any D1 demand for RabbitMQ→Temporal as superseded by [execution reconciliation](../../../designs/open/distributed-turn-poc/EXECUTION-RECONCILIATION-2026-11-19.md). This packet may now resolve the remaining concrete GA RPC, fact/event and consumer ownership, idempotency and extraction exceptions without reopening or rewriting ARCH02's settled decisions. No execution before re-review.

**HK09 disposition, 2026-11-19:** This packet stays open. ARCH02 already records the single consistency boundary, the rejection of a second schema writer, Storyteller proposal without commit, and same-command idempotency. DIST03 already requires one admitted receipt and no leftover Nest writer for its one migrated operation, so no extra writer note was copied there. The remaining requirement is the per-topic route table, the migration and rollback switches, and the two task-queue boundaries. That table does not fit DIST03's one-operation seam, and this Change does not edit the canonical technical docs. The RabbitMQ-to-Temporal hop stays superseded.

## Goal / independently verifiable outcome

Ratify writer ownership, transport choreography and migration sequence. This Change is one bounded documentation outcome in the [distributed-turn POC](../../../designs/open/distributed-turn-poc/README.md), not authorization to implement the entire initiative.

## Current source owners and exact baseline

Source inspected on 2026-11-19 at GitHub `main`: [Work queue](../../README.md), [runtime](../../../../apps/worker/src/runtime/index.ts), [worker Activity adapter](../../../../apps/worker/src/activities/index.ts), [outbox](../../../../apps/worker/src/outbox/dispatch.ts), [application stories](../../../../packages/application/src/stories/README.md), [Storyteller publication](../../../../docs/technical/storyteller/generation-and-publication.md), [canonical files](../../../../docs/technical/storyteller/canonical-documents-and-packages.md). Reinspect current HEAD and the user's active Cursor branches. The source currently combines work in `apps/worker`; this plan does **not** claim it is already distributed. Existing local Compose stays a working fallback.

**Prerequisites:** ARCH01 Done; coordinate with **ARCH02 active/unmerged Cursor branch**. No shared-file writes during its integration.

## Implementation / documentation delta

Reconcile [candidate D1 contract](../../../designs/open/distributed-turn-poc/D1-EXECUTION-CONTRACT.md) against source-observed `apps/worker/src/runtime/index.ts`, `apps/worker/src/activities/index.ts`, `apps/worker/src/outbox/dispatch.ts`, `packages/application/src/storyteller/runtime.ts`. ARCH02 is merged. The engine inside the current Compose worker is the SQL writer. A separate Game Authority service is not implemented. A separate Storyteller execution worker is not implemented. Superseded: RabbitMQ-to-Temporal handoff for migrated topics. Do not revive that hop. A story wake is a direct Temporal RPC. The per-topic route table, the migration and rollback switches, and the two task-queue boundaries are below. The current Compose path stays executable.

**Canonical pages left unedited:** [topology](../../../../docs/technical/platform/topology.md#distributed-learning-target), [execution](../../../../docs/technical/platform/execution-and-delivery.md#commands-business-events-and-workflows), [Storyteller publication](../../../../docs/technical/storyteller/generation-and-publication.md#what-publication-is-allowed-to-do), and [durable record](../../../../docs/technical/platform/data-and-persistence.md#who-owns-the-durable-record). This reconciliation does not edit those pages. The route table is in this packet and in `work/designs/open/distributed-turn-poc/D1-EXECUTION-CONTRACT.md`. Historical ARCH01 and D-0001 rationale stays in place.

**Hard exclusions:** No paid provider dispatch, no Stripe or customer billing, no image generator, no arbitrary new gameplay, no fictional Economy service, no live secrets or destructive data reset. Do not work around a missing architectural contract by claiming the service is 'blocked forever'; report one concrete mismatch with exact sources and revise the narrow contract.

## Per-topic route table

Inspected at `d3ad620b` in [dispatch.ts](../../../../apps/worker/src/outbox/dispatch.ts), [runtime](../../../../apps/worker/src/runtime/index.ts), and [worker config](../../../../apps/worker/src/bootstrap/config.ts). The same table is in [D1](../../../designs/open/distributed-turn-poc/D1-EXECUTION-CONTRACT.md#per-topic-route-table) (`work/designs/open/distributed-turn-poc/D1-EXECUTION-CONTRACT.md`). This packet stays open. It is not archived.

`dispatchedNoticeTopics` is the wake and start list. Each start uses `deliverOutboxNotice` and a direct Temporal RPC. Superseded: RabbitMQ-to-Temporal. RabbitMQ carries a post-commit business event to an independent consumer and does not wake Temporal. This table does not claim a Game Authority service, a broker consumer, or a private route is implemented.

Every start rejects a duplicate workflow id (`REJECT_DUPLICATE`). The SQL operation id remains the idempotency key. The Compose fallback for every wake and start is the one worker on `offscreen-local`. RabbitMQ is not a fallback wake.

| Topic | Who writes SQL | Who may start a workflow | Queue name selected | What stays in the current Compose process |
| --- | --- | --- | --- | --- |
| `campaign.action.v1` | Engine module `createStories` inside the current Compose worker. A separate Game Authority service is not implemented. | The outbox relay, by a direct Temporal RPC, may start `campaignActionV1` as `campaign-action/<id>`. A RabbitMQ consumer may not. | `control` for a later workflow-task split. That queue is not deployed. | Relay, workflow tasks, and `advanceCampaignAction` stay on `offscreen-local` in the one worker. |
| `campaign.activity.v1` | Engine module `createStories` inside the current Compose worker. A separate Game Authority service is not implemented. | The outbox relay, by a direct Temporal RPC, may start `campaignActivityV1` as `campaign-activity/<id>`. A RabbitMQ consumer may not. | `control` for a later workflow-task split. That queue is not deployed. | Relay, workflow tasks, and `advanceCampaignActivity` stay on `offscreen-local` in the one worker. |
| `campaign.consequence.v1` | Engine module `createStories` inside the current Compose worker. A separate Game Authority service is not implemented. | The outbox relay, by a direct Temporal RPC, may start `campaignConsequenceV1` as `campaign-consequence/<id>`. A RabbitMQ consumer may not. | `control` for a later workflow-task split. That queue is not deployed. | Relay, workflow tasks, and `prepareCampaignConsequence` stay on `offscreen-local` in the one worker. |
| `storyteller.profiled.v1` | Engine module `createStorytellerRuntime.complete` inside the current Compose worker. That call is one process. It is not a second schema writer and not a separate Storyteller service. | The outbox relay, by a direct Temporal RPC, may start `storytellerV1` as `storyteller/<id>`. A recovery notice uses its own notice id in the workflow id and still passes the generation id. A RabbitMQ consumer may not start it. | Workflow tasks: `control`. Proposal activity, when split: `storyteller-execute`. Neither queue is deployed. | `storytellerV1` and `completeStoryteller` stay on `offscreen-local` in the one worker. |
| `opening.playable.scripted.v1` | Engine module `createScriptedOpenings` inside the current Compose worker. A separate service is not implemented. | The outbox relay, by a direct Temporal RPC, may start `scriptedOpeningV1` as `scripted-opening/<id>`. A RabbitMQ consumer may not. | `control` for a later workflow-task split. That queue is not deployed. | Relay, workflow tasks, and `completeScriptedOpening` stay on `offscreen-local` in the one worker. |
| `continuation.playable.scripted.v1` | Engine module `createScriptedContinuations` inside the current Compose worker. A separate service is not implemented. | The outbox relay, by a direct Temporal RPC, may start `scriptedContinuationV1` as `scripted-continuation/<id>`. A RabbitMQ consumer may not. | `control` for a later workflow-task split. That queue is not deployed. | Relay, workflow tasks, and `completeScriptedContinuation` stay on `offscreen-local` in the one worker. |
| `story.interval.v1` | Engine module `createStories` inside the current Compose worker. A separate service is not implemented. | The outbox relay, by a direct Temporal RPC, may start `storyIntervalV1` as `controlled-interval/<id>`. A RabbitMQ consumer may not. | `control` for a later workflow-task split. That queue is not deployed. | Relay, workflow tasks, and `advanceControlledInterval` stay on `offscreen-local` in the one worker. |
| `story.interval.wake.v1` | The same `createStories` module. The signal does not write. The workflow rereads SQL. | No new workflow. The relay may signal `intervalChanged` on `controlled-interval/<id>` by a direct Temporal RPC when the interval still needs a wake. A RabbitMQ consumer may not signal it. | No new queue. The running workflow keeps the queue selected for `story.interval.v1`. | The signal and `advanceControlledInterval` stay on `offscreen-local` in the one worker. |
| `story.decision.v1` | Engine module `createStories` inside the current Compose worker. A separate service is not implemented. | The outbox relay, by a direct Temporal RPC, may start `storyDecisionV1` as `story-decision/<id>`. A RabbitMQ consumer may not. | `control` for a later workflow-task split. That queue is not deployed. | Relay, workflow tasks, and `resolveStoryDecision` stay on `offscreen-local` in the one worker. |
| `scene.published.v1` | No consumer writer is selected. A scene commit stays with the engine in the current Compose worker. This topic is not in `dispatchedNoticeTopics`. | Nobody. No consumer is selected, so this topic must not start or signal a workflow. Left unimplemented. | None. No queue name is selected. | The scene commit stays in the current Compose process. The fact stays undispatched. The consumer is unimplemented. |

## Migration and rollback switches

Superseded: RabbitMQ-to-Temporal as a migration switch. A wake or start does not move onto the broker, and rollback does not drain a broker queue. In-flight notices retry from SQL.

These start topics share one switch: `campaign.action.v1`, `campaign.activity.v1`, `campaign.consequence.v1`, `opening.playable.scripted.v1`, `continuation.playable.scripted.v1`, `story.interval.v1`, and `story.decision.v1`. Migration, when a later Change deploys the split, moves that topic's workflow tasks from `offscreen-local` to `control` and leaves the direct RPC in place. Rollback returns those workflow tasks to `offscreen-local` in the current Compose worker. The switch is not deployed.

`storyteller.profiled.v1` uses the same workflow-task switch, plus a second switch for the proposal activity: from `offscreen-local` to `storyteller-execute`. Rollback returns both the workflow tasks and the proposal activity to `offscreen-local`. The wake transport stays the direct RPC. `storytellerDistributedV1` is not the running workflow.

`story.interval.wake.v1` has no queue of its own. It follows the queue of the `story.interval.v1` workflow it signals. Rollback returns that signal to the workflow still running on `offscreen-local`.

`scene.published.v1` has no migration switch. No consumer and no queue are selected. Rollback is to keep that fact undispatched.

## Two task-queue boundaries

1. Current boundary, executable today. One Temporal task queue, `offscreen-local` (`TEMPORAL_TASK_QUEUE` in the worker config). The Compose worker polls it and runs every activity listed above. This is the queue `deliverOutboxNotice` passes for every start. It is one process. It is not a private HTTP route and not a second service.
2. Proposed boundary, not deployed. Workflow tasks use `control`. Storyteller proposal activities use `storyteller-execute`. Engine SQL activities stay off `storyteller-execute`, so that worker cannot become a second schema writer. Neither name is a running queue. Superseded: RabbitMQ-to-Temporal as a stand-in for this split.

## Acceptance: positive and discriminating negative

**Positive proof:** Produce a table: every existing `dispatchedNoticeTopics` topic, current workflow ID, selected legacy-vs-Rabbit route, receiving worker/queue, writer, dedup fence and fallback. One diagram for start/command/turn/publication, and three negative walkthroughs: duplicate broker notice, stale provider proposal, fork-from-old-scene.

**Negative proof:** A reader cannot conclude each microservice writes its own game DB schema, RabbitMQ can reroll mechanics, a model can publish canon, or a second relay dispatches the same notice.

**Evidence/report:** source and SHA inspected; intended/actual command and event state diagram; file diff; exact commands/tests and result counts; status of each normal/negative test; version/compatibility and resource evidence where relevant. Tests on fakes do not count as deployed Rabbit/Temporal proof. Never mark a contract satisfied merely because a Pod is Ready.

## Documentation is a required implementation plane

Update the **canonical** owning headings as part of the same code diff or ratifying documentation Change: [topology](../../../../docs/technical/platform/topology.md#distributed-learning-target), [execution/outbox](../../../../docs/technical/platform/execution-and-delivery.md#commands-and-durable-delivery), [data](../../../../docs/technical/platform/data-and-persistence.md#who-owns-the-durable-record), [Storyteller](../../../../docs/technical/storyteller/generation-and-publication.md#what-publication-is-allowed-to-do), and the relevant source maps/runbooks/STATUS. Edit **only the owner headings materially changed**; leave reasoned no-ops. Do not copy this packet wholesale into every spec. Historical product promises on D&D, scene forking and canonical files remain intact. Run `pnpm wiki:change-guard --mode plan` and `--mode close`, source-relevant tests and doc link checks where available, report skipped checks honestly.

## Parallel orchestration

Read-only mapping may parallel K8S03/K8S09, image-build investigation and package inventory. Shared topology/execution docs **must serialize with ARCH02** and have one integrator.

A user-approved Cursor orchestrator may distribute truly disjoint Ready Changes into isolated worktrees. It must integrate dependencies, shared canonical-doc headings and the same cluster itself. **A Proposed packet is not executable merely because another packet was authorized.**

## Planned specification and implementation delta | planned-impact.v1

| Plane | Selected authority and exact change/no-op | Related documents/maps to inspect | Evidence/decision |
| --- | --- | --- | --- |
| Product | unchanged because world-neutral play, admitted mechanical truth, and forkable scenes stay as written | docs/product/gameplay/rules.md#world-independent-foundation | No economy service is introduced |
| Technical | unchanged because the merged wake rule stays in force and this Change does not rewrite it | docs/technical/storyteller/generation-and-publication.md#what-publication-is-allowed-to-do | ARCH02 is merged. Superseded: RabbitMQ-to-Temporal |
| Code | unchanged because no executable modification is authorized. Negative: a broker hop must not appear beside the direct RPC | apps/worker/src/outbox/dispatch.ts | no source behavior changed |
| Related | changed: work/designs/open/distributed-turn-poc/D1-EXECUTION-CONTRACT.md#per-topic-route-table records the route table | work/designs/open/distributed-turn-poc/D1-EXECUTION-CONTRACT.md#migration-and-rollback-switches | Packet stays open |

## Reconciliation ledger (fill with actual evidence)

| Affected selected claim/heading | Authority | Target delta (changed/unchanged; reason) | Source delta & inspected SHA | Status/evidence tier | Negative proof | Map/link update or N/A |
| --- | --- | --- | --- | --- | --- | --- |
| docs/technical/platform/execution-and-delivery.md#commands-business-events-and-workflows | technical | unchanged: merged ARCH02 already selects the direct Temporal RPC and this packet leaves that heading in place | no source behavior changed; inspected d3ad620b in apps/worker/src/outbox/dispatch.ts | reviewed | A broker delivery must not be read as a workflow start | Canonical page left untouched |
| docs/technical/platform/topology.md#distributed-learning-target | technical | unchanged: the learning target stays as merged and this packet leaves that heading in place | no source behavior changed; inspected d3ad620b | reviewed | A second schema writer must not be inferred from the route table | Canonical page left untouched |
| docs/technical/platform/data-and-persistence.md#who-owns-the-durable-record | technical | unchanged: the engine remains the durable-record owner and this packet leaves that heading in place | no source behavior changed; inspected d3ad620b | reviewed | Each topic row must not grant SQL to its own service | Canonical page left untouched |
| docs/technical/storyteller/generation-and-publication.md#what-publication-is-allowed-to-do | technical | unchanged: publication stays a proposal until the engine admits it and this packet leaves that heading in place | no source behavior changed; inspected d3ad620b | reviewed | The Storyteller row must not be read as a canon commit by a model | Canonical page left untouched |
| docs/product/gameplay/rules.md#world-independent-foundation | product | unchanged: no player-facing rule was edited | no source behavior changed | reviewed | The table must not add an economy service | Product page left untouched |
| work/designs/open/distributed-turn-poc/D1-EXECUTION-CONTRACT.md#per-topic-route-table | evidence | changed: the note now names each topic writer, starter, queue, and Compose remainder, and leaves scene.published.v1 unimplemented | no source behavior changed; inspected d3ad620b | reviewed | scene.published.v1 must not be read as a selected consumer or as a Temporal wake | Same table in this packet |
| apps/worker/src/outbox/dispatch.ts | evidence | unchanged: the notice list was read and not modified | no source behavior changed; inspected d3ad620b | source-observed | Adding a RabbitMQ hop beside deliverOutboxNotice would falsify this row | No source map edited |

**Closure:** The route table is recorded. This packet stays open and is not Done. Canonical technical pages were not edited. Do not archive this packet from this pass. No automatic successor selection.
