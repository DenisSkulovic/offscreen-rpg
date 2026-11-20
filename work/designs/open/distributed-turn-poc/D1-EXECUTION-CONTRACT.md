# D1 | Distributed command, workflow and publication handshake

**Implementation clarification (2026-11-20):** The optional `scene.published.v1` RabbitMQ producer/consumer is **not selected**: DIST02 and [DIST04](https://github.com/DenisSkulovic/offscreen-rpg/blob/34e2b4fd8d9d9967e13311da3a938460b1a02244/work/changes/archive/2026-11/distributed/2026-11-19--dist04-rabbitmq-temporal-live-handoff/CHANGE.md) were Cancelled, not Done. D1's optional fact route below is a *possible later design*, not an open code obligation or a readiness gate. Existing direct SQL-outbox→Temporal remains authoritative.

**Date:** 2026-11-19. **Status:** design note aligned to merged ARCH02. Not canonical technical authority, and not an implementation order. Normative delivery classes live in [Commands, business events, and workflows](../../../../docs/technical/platform/execution-and-delivery.md#commands-business-events-and-workflows). [DIST01](https://github.com/DenisSkulovic/offscreen-rpg/blob/34e2b4fd8d9d9967e13311da3a938460b1a02244/work/changes/archive/2026-11/distributed/2026-11-19--dist01-ratify-game-authority-delivery-boundaries/CHANGE.md) may still record remaining process details. It must not reopen ARCH02.

## Operative execution rule

A story command that starts or wakes a workflow is a PostgreSQL outbox notice delivered by a direct Temporal RPC. The relay polls the outbox and calls Temporal. RabbitMQ is not on that path.

RabbitMQ carries post-commit business events to independent idempotent consumers, and only when such a consumer is separately selected. A broker message is not a commit, not a workflow start, and not the story SSE stream. The K8S03 laboratory broker is not an application producer. There is no Game Economy service.

The engine remains the consistency boundary for a committed scene checkpoint. A future Game Authority process, if one is extracted, is that writer. The Storyteller proposes. Temporal orchestrates. Neither owns the checkpoint. The default Compose chamber still runs `storytellerV1` as one `completeStoryteller` Activity on `offscreen-local`. Source on MAIN also registers `storytellerDistributedV1`, `storyteller.distributed.v1`, and split worker entrypoints (`start:executor`, control bootstrap). That split is **not** STORY03 Done and is **not** the default Compose layout.

K8S06 proved a disposable Temporal 1.32.2 laboratory server and then deleted the cluster. That laboratory is not the Compose development server and not the game workflow.

## Superseded broker wake

Superseded: an early draft of this page routed the story command from the SQL outbox through RabbitMQ into Temporal, including a Rabbit→Temporal adapter and a broker wake envelope. Merged ARCH02 rejected that hop. The path in this page does not use it.

## Proposed deployment units and writer ownership

| Process | Inputs | Has permission to | Explicitly forbidden |
| --- | --- | --- | --- |
| Next.js Web | authenticated private Nest GET; browser navigation | SSR/hydrate public authorized projection | issue game writes in Server Components; act as second BFF |
| Nest player API | browser cookies, typed command/GET, SSE | verify session/CSRF, authorize transport, invoke the internal writer with actor identity and frozen operation ID, deliver authorized snapshot/SSE | direct business-state writes after cutover; forward secrets to browser; publish the story stream on RabbitMQ |
| Game Authority (the engine writer, if later extracted) | trusted Nest internal commands, pinned completed model proposal, guarded workflow requests | own the single application SQL writer for story, mechanics, and canon commit; write the outbox in the same transaction; stage and publish canonical objects; provide branch-fenced reads and exact receipts | run paid model calls under locks; commit narrative before validating effects and roots; hand the scene checkpoint to another service |
| Outbox→Temporal relay | authoritative outbox lease | call Temporal start or signal with the stable workflow ID; mark the SQL notice delivered only after Temporal accepts it or the execution is already started | publish that wake to RabbitMQ; interpret game facts; mark delivered on an uncertain RPC |
| Optional business-event publisher | a committed fact in the outbox, and only if a consumer is separately selected | publish that fact with publisher confirm; acknowledge SQL only after the broker accepts it | start or signal Temporal; apply gameplay; carry the story SSE stream; become mandatory for the turn |
| Temporal control worker | workflow history, receipt IDs | coordinate waits, retries, and task queues; call the writer for game consequences | direct SQL writes or model calls in deterministic workflow logic |
| Storyteller execution worker | exact task reference and frozen context version; authorized read facade | build bounded task input, call a fake or approved provider, persist an immutable proposal and attempt record | mutate game or canon tables, apply dice or items, publish the scene, own the checkpoint |
| Canonical object store | immutable object hashes and manifests | serve pinned, validated reads and writes through application adapters | decide which root is published |
| API SSE hub | committed view hints from PostgreSQL LISTEN/NOTIFY | notify an active authorized browser; recover with GET | a durable gameplay bus, story authority, or a RabbitMQ stream |

An in-process module may keep its current SQL dependency on the Compose runtime. A new distributed deployment cannot run two writer-capable copies of that module. `apps/worker/src/activities/index.ts` still composes Storyteller and game collaborators in one worker. Splitting that file is future work, not a claim that the split exists.

## Exact durable path for one supported player intention

```text
1 Browser POST with the original operation id, expected view revision, and typed submission.
2 Nest verifies the cookie and CSRF and calls the internal writer over authenticated HTTP.
3 The writer rechecks owner, story, and revision, validates the choice, and commits the
  receipt, any admitted mechanical effect, and the SQL outbox wake in one transaction.
4 The outbox relay claims that wake and calls Temporal start or signal with the stable
  workflow ID. SQL is marked delivered only after Temporal accepts the call or the
  execution is already started. A crash before that mark retries the same notice.
  RabbitMQ is not consulted.
5 The Temporal workflow asks the writer for idempotent preparation. Committed mechanical
  effects are not rerolled. The writer stores the state and canon-root fence and the
  Storyteller task id. The engine remains the checkpoint boundary.
6 Temporal schedules model execution on a Storyteller task queue when that split exists.
  Until then, storytellerV1 still runs one completeStoryteller Activity. The worker
  returns an immutable proposal and attempt status only.
7 Publication under the same workflow reads the saved proposal by pinned reference,
  validates it against the captured state and root, stages object-store bytes outside
  the SQL transaction, then in a short SQL transaction rechecks the expected revision
  and commits the passage, effects, root, scene checkpoint, view version, and receipt.
  An invalid or stale proposal stays held. The Storyteller does not commit that row.
8 SSE is a PostgreSQL LISTEN/NOTIFY hint. The browser GET reads the authoritative
  projection. The hint is not a RabbitMQ message.
9 A historical read or fork uses the stored scene state and canon root, not the latest row.
```

After that commit, the same transaction may also record a business fact in the outbox. Relaying the fact to RabbitMQ is a separate optional consumer. The consumer does not start the workflow, does not write the checkpoint, and does not feed SSE. If no consumer is selected, the fact stays undispatched and the broker stays laboratory-only. That option is not a new requirement for the turn.

The wake itself is the existing outbox notice: `id`, `topic`, `operationId`. `leaseId` stays in SQL and never enters an external envelope. Idempotency is the SQL operation id and the Temporal workflow id. Superseded, and not a schema to implement: a broker wake envelope that existed only to carry that notice into Temporal.

## How the two transports stay apart

The direct SQL-outbox to Temporal RPC is the selected wake. It is not a legacy mode waiting to be switched off. `apps/worker/src/outbox/dispatch.ts` already starts or signals Temporal with the client RPC. Do not put a second route beside it for the same topic.

RabbitMQ is the laboratory broker for a separately selected post-commit consumer. It is not a second scheduler and not required for the Storyteller to run.

Selected Temporal task queues `control` and `storyteller-execute-v1` are defined in `packages/workflows/src/contracts.ts`. **[STORY03](https://github.com/DenisSkulovic/offscreen-rpg/blob/34e2b4fd8d9d9967e13311da3a938460b1a02244/work/changes/archive/2026-11/storyteller/2026-11-19--story03-separate-temporal-executor-and-publication/CHANGE.md)** is archived for the local split. The default Compose worker still does not poll those queues. A cold kind run remains TURN03. The names and per-topic switches are [below](#two-task-queue-boundaries). `storytellerDistributedV1` is the replay-safe workflow type for the distributed notice selector; wakes for both Storyteller topics stay direct SQL-outbox→Temporal RPC in `deliverOutboxNotice`, with no broker hop.

## Per-topic route table

Inspected at `ec73a535` in [dispatch.ts](../../../../apps/worker/src/outbox/dispatch.ts), [runtime](../../../../apps/worker/src/runtime/index.ts), [execution and control runtimes](../../../../apps/worker/src/runtime/execution.ts), and [worker config](../../../../apps/worker/src/bootstrap/config.ts). `dispatchedNoticeTopics` is the wake and start list. Each listed start or signal uses `deliverOutboxNotice` and a **direct Temporal RPC** (including `storyteller.profiled.v1`, `storyteller.distributed.v1`, and campaign wake topics). Superseded: RabbitMQ-to-Temporal. RabbitMQ may carry a **separately selected** post-commit business event; it does not wake Temporal. This table does not claim remote publication, a mandatory broker consumer, or that distributed Storyteller workers are the default Compose process.

**Change ownership:** ARCH02 is merged. **[STORY03](https://github.com/DenisSkulovic/offscreen-rpg/blob/34e2b4fd8d9d9967e13311da3a938460b1a02244/work/changes/archive/2026-11/storyteller/2026-11-19--story03-separate-temporal-executor-and-publication/CHANGE.md)** owns the selected `control` and `storyteller-execute-v1` queue split. **[BOOT03](https://github.com/DenisSkulovic/offscreen-rpg/blob/34e2b4fd8d9d9967e13311da3a938460b1a02244/work/changes/archive/2026-11/distributed/2026-11-19--boot03-game-authority-start-admission/CHANGE.md)** owns private Game Authority start admission (`PUT …/start`); it is not an outbox topic row. The same table is in [DIST01](https://github.com/DenisSkulovic/offscreen-rpg/blob/34e2b4fd8d9d9967e13311da3a938460b1a02244/work/changes/archive/2026-11/distributed/2026-11-19--dist01-ratify-game-authority-delivery-boundaries/CHANGE.md#per-topic-route-table). That packet is Done and archived.

**Labels in each row:** **Current Compose** is what `startRuntime` runs today on `offscreen-local` (one worker, one combined Storyteller activity unless the notice topic is `storyteller.distributed.v1` and split workers are started separately). **Selected target** is the ratified later deployment, not a claim it is live. **Optional business fact** applies only to `scene.published.v1`.

**Negative reading:** No topic changes route because a broker exists. An unselected optional derived projection does not block the game.

Every start rejects a duplicate workflow id (`REJECT_DUPLICATE`). The SQL operation id remains the idempotency key. The Compose fallback for every wake and start is the one relay plus the worker(s) actually polling `offscreen-local` (and, only when explicitly started for STORY03 work, the split workers on their selected queues). RabbitMQ is not a fallback wake.

| Topic | Who writes SQL | Who may start a workflow | Queue name selected | What stays in the current Compose process |
| --- | --- | --- | --- | --- |
| `campaign.action.v1` | **Current Compose:** engine module `createStories` inside the one Compose worker; no separate GA writer on this topic. **Selected target:** same single engine writer after GA extraction. | **Current Compose:** outbox relay → direct Temporal RPC starts `campaignActionV1` as `campaign-action/<id>`. **Selected target:** unchanged wake; a RabbitMQ consumer may not start it. | **Selected target:** workflow tasks on `control`. **Current Compose:** `offscreen-local` only. | Relay, workflow tasks, and `advanceCampaignAction` on `offscreen-local` in `startRuntime`. |
| `campaign.activity.v1` | **Current Compose:** `createStories` in the one worker. **Selected target:** engine writer. | **Current Compose:** relay → direct Temporal RPC → `campaignActivityV1` / `campaign-activity/<id>`. **Selected target:** same; no broker wake. | **Selected target:** `control`. **Current Compose:** `offscreen-local`. | Relay, `campaignActivityV1`, and `advanceCampaignActivity` on `offscreen-local`. |
| `campaign.consequence.v1` | **Current Compose:** `createStories` in the one worker. **Selected target:** engine writer. | **Current Compose:** relay → direct Temporal RPC → `campaignConsequenceV1` / `campaign-consequence/<id>`. **Selected target:** same. | **Selected target:** `control`. **Current Compose:** `offscreen-local`. | Relay, workflow, and `prepareCampaignConsequence` on `offscreen-local`. |
| `storyteller.profiled.v1` | **Current Compose:** `createStorytellerRuntime.complete` in the one worker (generation + publication). **Selected target:** engine/GA writer; Storyteller proposes only. | **Current Compose:** relay → direct Temporal RPC → `storytellerV1` / `storyteller/<id>` (recovery notice id in workflow id when present). **Selected target:** same RPC; no Rabbit start. | **Selected target:** `storytellerV1` workflow tasks on `control` after STORY03 deploys the split. **Current Compose:** default notice topic; `offscreen-local`. | **Current Compose:** `storytellerV1` and one `completeStoryteller` activity in `startRuntime`. |
| `storyteller.distributed.v1` | **Current Compose:** same engine admission as `storyteller.profiled.v1` when `STORYTELLER_DISTRIBUTED_V1=true` at admission only. **Selected target:** frozen notice topic; engine writer. | **Current Compose (source on MAIN, STORY03 not Done):** relay → direct Temporal RPC → `storytellerDistributedV1` / `storyteller/<generationId>` stable id. **Selected target:** same wake; no Rabbit hop. | **Selected target (STORY03):** workflow + `publishSavedStoryteller` on `control`; `executeFrozenStoryteller` on `storyteller-execute-v1`. **Current Compose:** not default; split workers exist in source (`start:executor`, control bootstrap) but are not STORY03 closure. | When started for STORY03 work: relay stays in `startRuntime`; executor polls `storyteller-execute-v1` only; control worker polls `control` for publish activity. Default chamber does not require this row. |
| `opening.playable.scripted.v1` | **Current Compose:** `createScriptedOpenings` in the one worker. **Selected target:** engine writer. | **Current Compose:** relay → direct Temporal RPC → `scriptedOpeningV1` / `scripted-opening/<id>`. **Selected target:** same. | **Selected target:** `control`. **Current Compose:** `offscreen-local`. | Relay, workflow, `completeScriptedOpening` on `offscreen-local`. |
| `continuation.playable.scripted.v1` | **Current Compose:** `createScriptedContinuations` in the one worker. **Selected target:** engine writer. | **Current Compose:** relay → direct Temporal RPC → `scriptedContinuationV1` / `scripted-continuation/<id>`. **Selected target:** same. | **Selected target:** `control`. **Current Compose:** `offscreen-local`. | Relay, workflow, `completeScriptedContinuation` on `offscreen-local`. |
| `story.interval.v1` | **Current Compose:** `createStories` in the one worker. **Selected target:** engine writer. | **Current Compose:** relay → direct Temporal RPC → `storyIntervalV1` / `controlled-interval/<id>`. **Selected target:** same. | **Selected target:** `control`. **Current Compose:** `offscreen-local`. | Relay, workflow, `advanceControlledInterval` on `offscreen-local`. |
| `story.interval.wake.v1` | **Current Compose:** same `createStories` writer on interval commit; this signal row does not write. **Selected target:** unchanged. | **Current Compose:** relay → direct Temporal RPC signals `intervalChanged` on `controlled-interval/<id>` when wake still needed. **Selected target:** same signal path; no Rabbit. | **Selected target:** follows `story.interval.v1` workflow queue (`control` when split). **Current Compose:** `offscreen-local`. | Signal handling and `advanceControlledInterval` on `offscreen-local`. |
| `story.decision.v1` | **Current Compose:** `createStories` in the one worker. **Selected target:** engine writer. | **Current Compose:** relay → direct Temporal RPC → `storyDecisionV1` / `story-decision/<id>`. **Selected target:** same. | **Selected target:** `control`. **Current Compose:** `offscreen-local`. | Relay, workflow, `resolveStoryDecision` on `offscreen-local`. |
| `scene.published.v1` | **Optional business fact.** **Current Compose:** scene commit stays with the engine in the one worker; topic not in `dispatchedNoticeTopics`. **Selected target:** post-commit fact only if a consumer is separately selected. | **Current Compose:** nobody; must not start or signal Temporal. **Selected target:** still no workflow start. | **Selected target:** none until a consumer Change selects one. | Fact may stay undispatched. Optional DIST02/DIST04 consumer does not block the turn. No remote publication claim. |

## Migration and rollback switches

Superseded: RabbitMQ-to-Temporal as a migration switch. A wake or start does not move onto the broker, and rollback does not drain a broker queue. In-flight notices retry from SQL.

Per-service configuration and queue rollback. A switch is **implemented** only when current source enforces it; otherwise it is **documented only**. No switch may silently fall back to a path that bypasses the owning writer or starts an incompatible workflow type. The legacy monolith queue `offscreen-local` stays registered and remains the Compose default until a later Change explicitly moves workflow tasks; rollback repoints workers to that queue. **[STORY03](https://github.com/DenisSkulovic/offscreen-rpg/blob/34e2b4fd8d9d9967e13311da3a938460b1a02244/work/changes/archive/2026-11/storyteller/2026-11-19--story03-separate-temporal-executor-and-publication/CHANGE.md)** deploys the split queues. **[BOOT03](https://github.com/DenisSkulovic/offscreen-rpg/blob/34e2b4fd8d9d9967e13311da3a938460b1a02244/work/changes/archive/2026-11/distributed/2026-11-19--boot03-game-authority-start-admission/CHANGE.md)** owns private Game Authority start admission separately from these env names. Canonical readers: [execution](../../../../docs/technical/platform/execution-and-delivery.md#commands-business-events-and-workflows), [topology](../../../../docs/technical/platform/topology.md#proposed-service-ownership). Packet: [DIST01](https://github.com/DenisSkulovic/offscreen-rpg/blob/34e2b4fd8d9d9967e13311da3a938460b1a02244/work/changes/archive/2026-11/distributed/2026-11-19--dist01-ratify-game-authority-delivery-boundaries/CHANGE.md#migration-and-rollback-switches).

| Switch | Where | Values | Status | Rollback |
| --- | --- | --- | --- | --- |
| `GAME_AUTHORITY_MODE` | `apps/api` (`readStoryAuthorityConfig`) | unset on host tests → `embedded`; `distributed`; retired `compose` is rejected | **Implemented** for the selected story HTTP seam: owned snapshot `GET`, start-from-candidate `PUT …/start`, and scripted resolution `PUT …/resolutions/:operationId`. Invalid or incomplete distributed config fails at config read; distributed mode does not silently use in-process SQL. A lab release with `OFFSCREEN_DOCUMENT_STORE=s3` fails closed when the mode is unset. GA start admission is **[BOOT03](https://github.com/DenisSkulovic/offscreen-rpg/blob/34e2b4fd8d9d9967e13311da3a938460b1a02244/work/changes/archive/2026-11/distributed/2026-11-19--boot03-game-authority-start-admission/CHANGE.md)** closure; the switch does not move campaign commands, outbox relay, or publication. | unset → `embedded` on host processes |
| `STORYTELLER_DISTRIBUTED_V1` | Application admission (`selectStorytellerNoticeTopicAtAdmission` in `packages/application/src/storyteller/records.ts`) | unset / not `true` → durable notice `storyteller.profiled.v1`; `true` → `storyteller.distributed.v1` frozen at enqueue | **Implemented at admission only.** The relay reads the persisted notice topic and starts `storytellerV1` or `storytellerDistributedV1`. Default Compose omits the flag (profiled path). Split workers and dual-queue execution are **not** STORY03 Done. | unset / not `true` → profiled topic and `storytellerV1` |
| `TEMPORAL_TASK_QUEUE` | Compose worker bootstrap | `offscreen-local` (default) | **Implemented.** Every outbox start today passes this queue name. Retained explicitly for rollback while `control` and `storyteller-execute-v1` exist as selected constants only. | `offscreen-local` |
| Workflow task queues per topic | Worker deployment (**STORY03**) | `offscreen-local` today; selected `control` and `storyteller-execute-v1` | **Documented only.** No env switch in default Compose moves campaign or profiled workflow tasks off `offscreen-local`. | Repoint workers to `offscreen-local` and monolith activities |

These start topics share one documented queue switch (not yet deployed as an env flag): `campaign.action.v1`, `campaign.activity.v1`, `campaign.consequence.v1`, `opening.playable.scripted.v1`, `continuation.playable.scripted.v1`, `story.interval.v1`, and `story.decision.v1`. Migration, when a later Change deploys the split, moves that topic's workflow tasks from `offscreen-local` to `control` and leaves the direct RPC in place. Rollback returns those workflow tasks to `offscreen-local` in the current Compose worker. The switch is not deployed.

`storyteller.profiled.v1` uses the same workflow-task switch on `control` when STORY03 deploys. Rollback returns workflow tasks to `offscreen-local` and the monolith `completeStoryteller` path. The wake transport stays the direct RPC.

`storyteller.distributed.v1` is owned by **STORY03**: migrate workflow tasks to `control` and execution to `storyteller-execute-v1`, with rollback to the legacy topic and `offscreen-local` monolith. The wake transport stays the direct RPC. Source registers `storytellerDistributedV1`; that is not STORY03 Done and is not the default Compose selector.

`story.interval.wake.v1` has no queue of its own. It follows the queue of the `story.interval.v1` workflow it signals. Rollback returns that signal to the workflow still running on `offscreen-local`.

`scene.published.v1` has no migration switch. No consumer and no queue are selected. Rollback is to keep that fact undispatched.

## Two task-queue boundaries

1. Current boundary, executable today. One Temporal task queue, `offscreen-local` (`TEMPORAL_TASK_QUEUE` in the worker config). The Compose worker polls it and runs every activity listed above. This is the queue `deliverOutboxNotice` passes for every start. It is one process. It is not a private HTTP route and not a second service.
2. Selected boundary (**STORY03**). Workflow tasks and GA publish activity use `control` (`storytellerControlTaskQueue`). Storyteller execution uses `storyteller-execute-v1` (`storytellerExecuteTaskQueue`). Engine SQL activities stay off `storyteller-execute-v1`, so the executor cannot become a second schema writer. Names are in source; default Compose does not poll them until STORY03 deploys the split. Superseded: RabbitMQ-to-Temporal as a stand-in for this split. **BOOT03** owns GA start admission separately from these queue names.

## Security and state consistency

- An internal writer endpoint is cluster-internal, uses a distinct service credential for Nest and for Temporal control, and rechecks the owner from durable SQL. Ingress cannot reach it. A client-supplied `ownerId` is never trusted.
- The Storyteller execution worker should have no credentials that can mutate game state. It obtains a bounded task and allowed document reads. Any temporary SQL read during a migration is read-only and recorded as an exception.
- Storyteller output is a proposal, not canon. Admission checks the expected state and document root. A successful result may be stale. Do not force-publish it.
- Pairing a scene's mechanical state with its canon root is the engine's checkpoint obligation. RabbitMQ and Temporal cannot supply that pair. DATA02 is the open checkpoint implementation. This page does not mark it Done.
- Every external model attempt needs its own persisted dispatch record before recovery. A Temporal retry is not permission for a new paid call. The fake-provider path is the default. This page claims no paid result.
- GET is the truth. HTTP 202 means accepted, not settled. SSE is a lossy hint.
- Versioned operation schemas, redacted logs, package boundaries, and authorization negatives stay mandatory.

## Explicit alternatives and why rejected

1. **Superseded: SQL outbox to RabbitMQ to Temporal.** A second acknowledgement and a second wake owner. Merged ARCH02 keeps the direct RPC. Do not implement this hop.
2. **RabbitMQ runs game handlers and Temporal is dropped.** That discards durable workflow orchestration and timers.
3. **RabbitMQ and the SQL relay both start Temporal.** Two dispatch owners for one notice.
4. **Every service writes the shared SQL tables.** Scene truth and historical snapshots become incoherent. The engine keeps the single checkpoint boundary.
5. **A synchronous Nest to Storyteller to writer request.** Web latency follows the model, and a reload cannot recover a durable receipt.
6. **A new Storyteller HTTP control service.** A separate Temporal task queue is the proposed scale seam. It does not exist yet, and it is not a broker.
7. **Event sourcing as the only source of truth.** Not this milestone. Committed SQL plus immutable scene checkpoints remain the authority if they are later proved.
8. **Cognee or a shared mutable filesystem as scene truth.** That fails an as-of branch fence. Cognee stays rejected research.

## Questions intentionally deferred

- The exact internal writer RPC, credential rotation, and the command mapping from current controllers.
- The checkpoint schema and story constraints. DATA02 owns that implementation. This note does not finish it.
- The read-only Storyteller task API, proposal schema, and provider reconciliation.
- Whether `scene.published.v1` is worth a consumer. The route table leaves that topic unimplemented. Until a consumer is selected, no broker topology is required for the turn.
- Resource limits on the local machine. Measure them. Do not invent a second cluster installer.
- A backfill from current forks to an arbitrary historical scene.
- Multiple users, autonomous planning, images, payments, and chaos or high-availability work.

## Ratification and work ordering

ARCH02 is merged. DIST01 records the per-topic route table, the per-service migration and rollback switch table (T02), and the two task-queue boundaries in this note. The normative classes stay in [execution](../../../../docs/technical/platform/execution-and-delivery.md), [topology](../../../../docs/technical/platform/topology.md), [data](../../../../docs/technical/platform/data-and-persistence.md), [Storyteller publication](../../../../docs/technical/storyteller/generation-and-publication.md), and [client HTTP](../../../../docs/technical/platform/http-api-and-client-contracts.md). This design note does not edit those owners. ARCH03 and ARCH05 are merged design contracts. They are not a built checkpoint and not a built context pack. DIST02 and DIST04, as rewritten, describe an optional post-commit fact and consumer. They are Proposed. They are not a wake bridge and they are not selected.

## First discriminating tests

- The same outbox wake is claimed twice and produces one Temporal workflow.
- The relay crashes after Temporal accepts and before SQL marks the notice delivered. The retry finds the existing execution and does not apply a second effect.
- Temporal is down. The SQL notice stays retryable. A running broker does not unblock the wake.
- The broker is down. The Storyteller wake, the scene commit, and the authoritative GET still proceed.
- A duplicate business-event delivery, if a consumer is later selected, does not start a second workflow, write a second checkpoint, or become the SSE stream.
- A model proposal arrives after the branch has advanced. Publication stays held.
- A worker dies after a possible external model dispatch. There is no automatic second paid attempt. No paid call is claimed here.
- Two writer replicas see one operation and leave one SQL receipt. The engine still owns the checkpoint.
- A fork from an old scene keeps that scene's mechanical state and canon root after the parent has moved on.
- A dropped SSE hint is recovered by GET. The stream is not rebuilt from RabbitMQ.
