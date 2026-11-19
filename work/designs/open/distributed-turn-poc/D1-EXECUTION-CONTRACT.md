# D1 | Distributed command, workflow and publication handshake

**Date:** 2026-11-19. **Status:** design note aligned to merged ARCH02. Not canonical technical authority, and not an implementation order. Normative delivery classes live in [Commands, business events, and workflows](../../../../docs/technical/platform/execution-and-delivery.md#commands-business-events-and-workflows). [DIST01](../../../changes/open/2026-11-19--dist01-ratify-game-authority-delivery-boundaries/CHANGE.md) may still record remaining process details. It must not reopen ARCH02.

## Operative execution rule

A story command that starts or wakes a workflow is a PostgreSQL outbox notice delivered by a direct Temporal RPC. The relay polls the outbox and calls Temporal. RabbitMQ is not on that path.

RabbitMQ carries post-commit business events to independent idempotent consumers, and only when such a consumer is separately selected. A broker message is not a commit, not a workflow start, and not the story SSE stream. The K8S03 laboratory broker is not an application producer. There is no Game Economy service.

The engine remains the consistency boundary for a committed scene checkpoint. A future Game Authority process, if one is extracted, is that writer. The Storyteller proposes. Temporal orchestrates. Neither owns the checkpoint. The current worker still runs `storytellerV1` as one `completeStoryteller` Activity. That is the source, not a finished process split.

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

Two Temporal task queues, control and storyteller-execute, remain a proposed process split. They are not deployed. Workflow definitions in `@offscreen/workflows` stay deterministic. A later `storytellerDistributedV1` is a versioning choice for that future split, not permission to insert a broker hop, and not a claim that the workflow already has two stages.

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
- Whether any post-commit consumer is worth building. Until one is selected, no broker topology is required for the turn.
- Resource limits on the local machine. Measure them. Do not invent a second cluster installer.
- A backfill from current forks to an arbitrary historical scene.
- Multiple users, autonomous planning, images, payments, and chaos or high-availability work.

## Ratification and work ordering

ARCH02 is merged. DIST01 reconciles remaining writer RPC and task-queue details with [execution](../../../../docs/technical/platform/execution-and-delivery.md), [topology](../../../../docs/technical/platform/topology.md), [data](../../../../docs/technical/platform/data-and-persistence.md), [Storyteller publication](../../../../docs/technical/storyteller/generation-and-publication.md), and [client HTTP](../../../../docs/technical/platform/http-api-and-client-contracts.md). This design note does not edit those owners. ARCH03 and ARCH05 are merged design contracts. They are not a built checkpoint and not a built context pack. DIST02 and DIST04, as rewritten, describe an optional post-commit fact and consumer. They are Proposed. They are not a wake bridge and they are not selected.

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
