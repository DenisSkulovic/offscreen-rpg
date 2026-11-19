# D1 | Distributed command, workflow and publication handshake

**Date:** 2026-11-19. **Status:** candidate architectural decision for [DIST01](../../../changes/open/2026-11-19--dist01-ratify-distributed-execution-contract/CHANGE.md), **not yet selected as canonical technical authority or implemented**. Latest repository evidence was inspected on `main` during this design pass. Preserve ARCH02's current independent Cursor branch and reconcile rather than overwrite it. This page gives precise decisions to accept/challenge in DIST01; after ratification, relevant normative statements belong in the existing platform/game/Storyteller technical owners, not permanently here.

## Proposed deployment units and writer ownership

| Process | Inputs | Has permission to | Explicitly forbidden |
| --- | --- | --- | --- |
| Next.js Web | authenticated private Nest GET; browser navigation | SSR/hydrate public authorized projection | issue game writes in Server Components; act as second BFF |
| Nest player API | browser cookies, typed command/GET, SSE | verify session/CSRF, authorize transport, invoke **internal Game Authority** with actor identity and frozen operation ID, deliver authorized snapshot/SSE | direct business-state writes after cutover; forward secrets to browser |
| Game Authority (GA) | trusted Nest internal commands, pinned completed model proposal, guarded workflow requests | own the single application SQL writer for story/mechanics/canon commit; issue outbox in same transaction; stage and publish canonical objects using document storage adapter; provide branch-fenced reads and exact receipts | run paid model calls under locks; commit narrative before validating effects and roots |
| Outbox→Rabbit publisher | authoritative outbox lease | publish compact notice with publisher confirm, ACK SQL lease only after broker acceptance | interpret game facts; launch Temporal in publisher; mark delivered on uncertain publish |
| Rabbit→Temporal adapter | broker notice | validate contract and start/signal a **single named workflow** using stable workflow ID, ACK broker only after durable Temporal acceptance or known AlreadyStarted | apply gameplay, call LLM, ACK before Temporal acceptance |
| Temporal control worker | workflow history, receipt IDs | coordinate waits, retries, task queues, call GA internal operations for game consequences | direct SQL writes or model calls in deterministic workflow logic |
| Storyteller execution worker | exact task/operation reference + frozen context version; authorized read facade | build bounded task input, call fake or approved provider, persist inspectable immutable proposal/attempt artifact under owned execution protocol | mutate game/canon tables, apply dice/items/time, publish scene, unrestricted filesystem/DB access |
| Canonical object store | immutable object hashes and manifests | serve pinned, validated read/write through application adapters | determine what root is published |
| API SSE hub | committed view hints (current pg LISTEN/NOTIFY) | notify active authorized browser; recover from GET | durable gameplay event bus or story authority |

**Minimum migration privilege rule:** an in-process existing module may retain its current SQL dependency in the old Compose runtime, but a *new distributed deployment* cannot run two writer-capable copies of that module. Use a distinct build/entrypoint and independent runtime credentials rather than pretending a shared TypeScript package implies shared authority. Existing `apps/worker/src/activities/index.ts` creates both Storyteller and Game collaborators: it must be split intentionally. Check every current activity import before forbidding direct SQL in any target Pod.

## Exact durable path for one supported player intention

```text
1 Browser POST with original operationId / expected view revision / typed submission.
2 Nest verifies cookie/CSRF and calls internal GA via authenticated service-to-service request.
3 GA rechecks owner/story and revision, validates choice, commits receipt + any
  admitted mechanical effect + SQL outbox notice atomically; replies accepted/committed.
4 Outbox relay claims notice using existing lease, publishes minimal durable Rabbit message
  with confirm; SQL delivery ACK only after confirmed publish. Crash between confirm
  and SQL ACK causes a replay, which is expected.
5 Rabbit→Temporal adapter consumes; calls Temporal start/signal with existing stable
  workflow ID derived from the operation. Temporal success/AlreadyStarted => broker ACK.
  Temporal unavailable/unknown => NACK/retry, never a new operationId.
6 Temporal workflow invokes GA internal preparation/capture activity as needed;
  committed mechanical effects are not rerolled. GA stores exact state/root fence
  and a Storyteller task ID/version as durable record. Preparation is idempotent.
7 Temporal schedules a model-execution Activity on dedicated Storyteller task queue;
  worker obtains the frozen authorized task, model policy, allowed source handles.
  It returns/saves an immutable proposal and attempt status only.
8 GA publication invoked under same workflow, reads saved proposal by pinned reference,
  validates against captured state/root and current policy, stages S3 source/doc objects
  OUTSIDE SQL transaction; inside short SQL transaction rechecks expected revision and
  commits scene-passage source, committed effects/next offer, root + exact scene-checkpoint
  refs, viewVersion, operation receipt and outbox. Invalid/stale proposal stays held.
9 SSE is only a committed-view hint; browser GET reads authoritative public projection.
10 History view/fork resolve stored as-of scene game-state AND canon root, never latest.
```

**Notice v1 candidate** (reference only, not an approved Zod schema):

```json
{
  "schemaVersion": "offscreen.dispatch-notice.v1",
  "noticeId": "uuid",
  "topic": "storyteller.v1",
  "operationId": "uuid",
  "correlationId": "uuid",
  "traceparent": "optional validated trace context"
}
```

The notice is a **wake/reference**, not a replayable game fact or a provider request body. Full actor/branch/expected revisions come from GA's guarded durable operation record, not untrusted broker claims. Existing `Notice` has `id,topic,operationId,leaseId`; `leaseId` is local transport bookkeeping and must **never** enter the external envelope. Broker topic allowlist must match existing `apps/worker/src/outbox/dispatch.ts` mapping, with a staged dual-route migration and a durable dispatch mode for each topic. Idempotency checks happen at stable SQL operation IDs *and* stable Temporal workflow IDs; the inbox can record broker duplicate IDs for diagnostics but is not the ultimate correctness proof.

### RabbitMQ and Temporal separation

RabbitMQ is **the cross-process durable notification boundary**, not a second scheduler. Temporal is the **workflow control** and long-running activity executor; the Game Authority alone admits effects. For the first POC, use the existing operation→workflow mapping `selectNoticeDispatch` and `storytellerWorkflowId(id)`, `campaignActionWorkflowId(id)`; change the transport behind the delivery seam, not domain names all at once. Existing direct SQL→Temporal relay remains a *legacy selectable mode*, but never enable both routes for the same topic/operation simultaneously. Document operator switch and rollback, including in-flight notices.

For the initial migration, add two distinct Temporal Task Queues: **control** for game orchestration/GA interactions and **storyteller-execute** for model work. A durable workflow running on control can dispatch a model Activity to storyteller-execute; no new independently running Storyteller HTTP server is required. The Storyteller worker is a separate Kubernetes Deployment/process; it is still independently scalable. Workflow definitions in `@offscreen/workflows` remain deterministic. Proposed change to the existing `storytellerV1` workflow must be version-safe for older histories; prefer introducing `storytellerDistributedV1` and a new task queue if needed rather than mutating replay expectations in place.

### Security and state consistency

- Internal GA endpoint is ClusterIP-only, uses authenticated service credential with a distinct identity for Nest and Temporal control, and **rechecks owner and resource** from durable SQL. Ingress cannot reach it. Client-supplied `ownerId` is never trusted.
- The Storyteller execution worker should ideally have **no credentials capable of mutating game state**. It can obtain a bounded task and allowed document reads via a purpose-limited internal facade; if temporary SQL read access is required during migration, it must be read-only and tracked as an exception.
- Storyteller output is a **proposal**, not direct canon. Admission checks expected state and document root. A success result may be stale; never force-publish it.
- Exact scene-state and canon-root pairing is the obligation of ARCH03's checkpoint design, not something RabbitMQ or Temporal can provide.
- Before crash recovery, every external model attempt has its own persisted dispatch/uncertainty record. Temporal or broker retry is not permission for a new paid call. Fake-provider path is the default.
- Preserve `GET` as truth, `202` as accepted not settled, and SSE as lossy hints.
- Versioned operation schemas, safe redacted logs, code package boundaries and auth negative tests are mandatory.

## Explicit alternatives and why rejected for the first POC

1. **RabbitMQ directly runs game handlers, no Temporal**: throws away existing durable workflow orchestration and long-lived timer model; rejected for this educational POC.
2. **RabbitMQ and old SQL relay independently start Temporal**: creates double dispatch owners and difficult reconciliation; rejected.
3. **Every service writes shared SQL tables**: violates scene truth and makes historical snapshots incoherent; rejected.
4. **A synchronous Nest→Storyteller→GA request**: ties web latency to model/provider duration and breaks reload-recovery; rejected.
5. **New arbitrary HTTP service for Storyteller**: unnecessary for first POC; a separate Temporal task queue and Deployment offer the desired scaling without inventing another control protocol.
6. **Event sourcing as sole source of truth**: not necessary for this milestone; immutable scene checkpoints + committed SQL state + events for delivery are sufficient if proven.
7. **Use Cognee or a shared mutable filesystem as scene truth**: fails exact as-of branch scope and/or publication fencing; rejected.

## Questions intentionally deferred to the next detailed design passes

- The exact internal GA RPC body/auth/token rotation and command mapping from all existing controllers.
- The exact versioned checkpoint/reconstruction schema and migrated story DB constraints.
- The read-only Storyteller task context API, output artifact location, provider reconciliation and the full proposal schema.
- Final RabbitMQ topology/dead-letter policy for cloud multi-replica deployment; the POC has durable/retry tests on single broker.
- Resource requests/limits and how components share the 12 GB-ish local budget; require actual measurement.
- A safe backfill/migration path from current restricted forks to arbitrary historical forkable scenes.
- Multiple users, autonomous action planning, images, Stripe and full chaos/HA are later work.

## Ratification and work ordering

`DIST01` should reconcile this *candidate* with ARCH02's in-flight branch and existing [execution](../../../docs/technical/platform/execution-and-delivery.md), [topology](../../../docs/technical/platform/topology.md), [data](../../../docs/technical/platform/data-and-persistence.md), [Storyteller publication](../../../docs/technical/storyteller/generation-and-publication.md) and [client HTTP](../../../docs/technical/platform/http-api-and-client-contracts.md) owners. Do not edit those shared owners while ARCH02 is actively changing them. Document rejections and compatibility obligations. **Then** the separately scoped executable `DIST02–DIST05` packets can be selected individually or in an owner-approved parallel batch. ARCH03 and ARCH05 own deeper scene knowledge and context semantics and must be reconciled before integrated real scene publication.

## First discriminating tests

- Same committed outbox notice delivered twice by RabbitMQ → **one** Temporal workflow.
- Crash relay after broker confirm but before SQL `deliveredAt` → replay accepted but no second game effect.
- Crash Rabbit consumer before Temporal start acknowledgment → retry, no lost operation.
- Slow/down Temporal with RabbitMQ available → visible pending operation and eventual convergence.
- Model proposal succeeds after branch advanced → rejected/held, no stale passage publication.
- Worker dies after external paid-model dispatch → no implicit second attempt.
- Two game authority replicas handling same operation → one SQL receipt/checkpoint.
- Fork from old scene after parent-world state changed → exact old mechanical and canon roots.
