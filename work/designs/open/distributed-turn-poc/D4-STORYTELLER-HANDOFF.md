# D4 | Remote Storyteller task, attempt custody and guarded scene publication

**Status:** proposed source-derived architecture, 2026-11-19. The custody and publication contract is [STORY01](../../../changes/archive/2026-11/other/2026-11-19--story01-ratify-task-custody-and-publication-contract/CHANGE.md), not a deployed contract. [DIST05](../../../changes/archive/2026-11/other/2026-11-19--dist05-storyteller-execution-worker-split/CHANGE.md) is cancelled into [STORY03](../../../changes/archive/2026-11/other/2026-11-19--story03-separate-temporal-executor-and-publication/CHANGE.md). The local split is archived in STORY03. A cold kind run remains TURN03. Coordinates [DATA03](../../../changes/archive/2026-11/other/2026-11-19--data03-checkpoint-at-initialization-and-publication/CHANGE.md), [DATA06](../../../changes/open/2026-11-19--data06-fork-scoped-memory-context-minimum/CHANGE.md), ARCH03 and ARCH05.

## Operative handoff

The Storyteller wake is the PostgreSQL outbox delivered by a direct Temporal RPC. RabbitMQ is not on that path. Superseded: an earlier draft of the diagram below sent the wake through RabbitMQ into Temporal. That hop is not an instruction.

The engine remains the consistency boundary for the scene checkpoint. The Storyteller returns a proposal. The story SSE hint stays on PostgreSQL LISTEN/NOTIFY and is recovered by GET. Neither the hint nor the checkpoint moves onto RabbitMQ. There is no Game Economy service. DATA02 and DATA03 are not marked Done by this page. K8S06's disposable Temporal 1.32.2 laboratory deleted its cluster; that laboratory is not this workflow and not the Compose development server.

## What is true in current source

- `packages/workflows/src/index.ts::storytellerV1(id)` invokes one `completeStoryteller(id)` Temporal Activity with retries. It is **not** a two-stage remote execution and GA publication workflow.
- `apps/worker/src/activities/index.ts` composes a single worker with Storyteller and game-affecting `createStories` operations.
- `packages/application/src/storyteller/runtime.ts::createStorytellerRuntime.complete(id)` classifies generation, runs `createStorytellerExecution.execute` for pending/running records, **then** calls `publishStorytellerResult`. In-memory `activeGenerationIds` only serializes within one process; durable dedup and state checks must work across Pods.
- `packages/application/src/storyteller/execution.ts` has scripted/provider paths, context/lexical-memory exploration, budget and reviewed dispatch. It updates `generation` and execution-stage records; this is not currently a read-only worker.
- `packages/db/src/schema/storyteller.ts` already defines `storytellerOperation`, `storytellerAttempt`, `storytellerUsageAllocation`, retry, dispatch review, capture and `storytellerPublication` states. `storytellerAttempt.state`: reserved/dispatched/settled/uncertain/unsent; `storytellerPublication.state`: pending/published/stale/blocked. **Reuse** these ledgers; do not introduce a competing charge counter.
- `packages/application/src/storyteller/publication.ts::publishStorytellerResult` reads succeeded candidate, validates `storytellerTaskSchema`/result, stages immutable passage and descriptive document changes when root matches, locks source story and admits publication. `commitStoryContinuation` atomically applies item effects + inserts passage + commits staged manifest root, but per-scene historical state checkpoints remain incomplete.
- `packages/storyteller/src/tasks/memory-exploration.ts` already has constrained `ask_memory` / `read_memory` vocabulary, so no need for model shell access.

## Selected *candidate* process responsibilities

**Game Authority / operation custodian:** owns authoritative generation/task admission, story/context capture identity, mechanical admission, expected scene/root fence and final publication; owns the durable budget and attempt state transitions. It exposes bounded private methods, not full SQL credentials, to the Storyteller executor. That writer, standing for the engine, is the sole writer for `story`, `campaign`, `storyPassage`, `storyDocumentCommit`, scene checkpoints, and mechanical receipts. The checkpoint does not move to the Storyteller, to Temporal history, or to a broker.

**Storyteller executor:** separately deployable Temporal Activity worker on `storyteller-execute` task queue. Accepts `generationId` only (or a versioned task reference), calls GA's scoped task/attempt API for frozen task and allowed context, performs role-scoped retrieval through explicit document-read capability, invokes *scripted* or explicitly authorized provider, and submits an immutable versioned proposal/result and provider receipt. It **does not** use a general `createStories` or `publishStorytellerResult` dependency and has no SQL credentials capable of committing story/campaign/item/root changes. Restricted attempt ledger writes must go through custodial endpoints or a deliberately limited, auditable attempt-only access design. The latter is an exception to justify, not a default.

**Temporal orchestration:** stable workflow execution identity and, as a proposal, two Activity boundaries (execution, then publication). Current `storytellerV1` is still one Activity. The wake that reaches Temporal is the direct RPC, not a broker message. Workflow history carries only IDs and bounded statuses, never narrative or secret prompts. Activity retries may retry idempotent bookkeeping and publication but may not automatically resubmit an uncertain paid call.

**S3 DocumentStore:** immutable content-addressed canon and published source; may also hold a validated provider proposal artifact where useful. One trusted publication custodian chooses the manifest root/scene checkpoint. Staging an object never means publication.

## Candidate handoff v1 (not yet exported Zod schemas)

```text
GA capture/admit: generationId + storyId + operationId, taskVersion,
  expectedStoryRevision, expectedCanonRootHash/Revision,
  contextCaptureSha256, task/provenance pins and resource limits
      ↓ durable SQL record and outbox wake
direct Temporal RPC; workflowId stable from generationId
      ↓
Activity 1 on storyteller-execute:
  requestTask(generationId) → frozen bounded task+allowed source handles
  acquire/record attempt under GA-issued idempotent attemptId
  scripted fixture OR explicitly permitted paid dispatch
  saveCandidate(generationId, attemptId, outputHash, result, usage/uncertainty)
  return {generationId, outcome: succeeded|held|failed|uncertain, attemptId?}
      ↓
If succeeded only:
Activity 2 on game-authority-control:
  requestPublication(generationId) → GA loads persisted validated proposal
  GA stages source+canon patches, locks game state/root, validates source
  and DATA03 checkpoint, commits one passage/root/state/receipt/outbox
  return {publication: published|already-published|stale|blocked}
      ↓
SSE only hints committed viewVersion; Nest GET resolves authoritative scene
```

**Important distinction:** `held` and `uncertain` are *not* workflow exceptions that Temporal should blindly retry with a fresh HTTP/model attempt. The durable generation/attempt record is the arbiter. A resumed/replayed workflow asks the custodian for recorded disposition and may continue only from safe operations.

### Identity / version fence

Suggested minimal service contract is:
```json
{
  "schemaVersion": "storyteller.task-ref.v1",
  "generationId": "uuid",
  "operationId": "uuid",
  "expectedStoryRevision": 2,
  "expectedCanonRootHash": "sha256",
  "contextCaptureSha256": "sha256",
  "taskInputVersion": 1
}
```
The wire request should ordinarily pass only `generationId` and a task reference; the writer checks those fields against its durable captured record. No raw prompt, user cookie, payment secret, private world graph, full canon manifest, or caller-chosen `ownerId` enters the Temporal workflow input or Activity payload. The executor receives a **time-frozen and branch-scoped task**, not a request to assemble latest data. The exact schema must be ratified from actual task formats in STORY01. Superseded: putting that payload on RabbitMQ so a consumer can start Temporal.

## How paid attempt custody works

- Keep existing `storytellerAttempt`, `storytellerOperation`, funding, review and usage allocation states. The custodial API wraps existing budget/reservation and wire-authority checks under a narrow capability. The provider call must never occur before dispatch authorization is durably recorded. The operation can be scripted in fake mode without any external authorization.
- Reserve, dispatch, settle and uncertainty have separate *durable* states and consistent attempt IDs. Retrying a network response does not create a new attempt ID, spend reservation, or dispatch unless custody proves the prior attempt was never sent. A timeout **after possible send** is uncertain; park it and require permitted reconciliation, not a fresh paid call.
- A concurrent second executor with the same `generationId` cannot bypass a persistent claim/fence. In-memory Set is not sufficient. Lease expiry is not proof that provider didn't receive a request.
- A result may be provider-valid but stale relative to the Game Authority's story revision or canon manifest; stale publication must not mutate current state. Retain provenance and attempt costs for inspection even if publication is refused.
- Fake scripted execution is the only required POC runtime default. Budgeted real-model demonstration is a **separate authorized gate** after fake end-to-end evidence, without Stripe integration.

## Canonical documents and proposal ownership

The model sees a role-specific P0/P1/P2 task envelope and optionally invokes bounded `ask_memory`/`read_memory`; branch, actor visibility and as-of scene/root scope are enforced in application code. Data from exact mechanic checkpoint is injected, and canonical manifests are read from shared S3 under validated source handles. The Storyteller may return:
- one typed narrative passage/offer or report according to the existing task schema;
- bounded `documentChanges` descriptive proposals with source evidence, expected document revisions and visibility;
- optional non-publishable creative direction/usage diagnostics allowed by current role contract.

It **cannot** return direct SQL, scripts, unbounded Markdown rewrites or instructions to create mechanical state outside supported validated effects. The Game Authority validates the existing `validateStorytellerResult` and `stageStoryPublicationDocuments` semantics and DATA03 scene checkpoint under the story lock. No unapproved changes to D&D rules or knowledge authority.

## Failure boundaries and acceptance oracle

| Fault | Expected retained truth |
| --- | --- |
| Duplicate outbox wake or Temporal history replay | One workflow identity, one generation and one publication. A broker redelivery, if a consumer is later selected, does not start another workflow |
| Two executor replicas race | One persistent attempt claim; no second provider dispatch |
| Executor crashes before scripted result save | Safe scripted retry with same task/fence |
| Executor crashes after provider send | Mark uncertain or reuse durable settled receipt; **never pay twice automatically** |
| Result delivered but ack lost | Replayed `saveCandidate` idempotent by generation+attempt+hash |
| Story advances while model responds | Proposal preserved, final publication stale/blocked with no changed scene |
| S3 object staged, SQL transaction fails | Unreachable orphan possible; no new committed root or scene |
| Publication committed but response lost | Retried GA publication returns already-published; no second passage |
| Context root missing/cross-branch | Held/refused; never read latest parent/sibling by convenience |
| Provider key disabled | Fake mode works; real attempt refuses before dispatch |

**First full proof:** a provider-free continuation on actual separate Temporal task queues, stable execution record, persisted proposal, one GA publication, scene state+canon pairing and browser SSE/GET, with at least two controlled failure injections. This alone is not a paid-model demonstration or a 90-scene memory-quality claim.

## Next implementation Change subdivision

- **STORY01:** documentation-only reconciliation of exact task/proposal/reference shapes and execution/authority/Temporal roles; checks existing code's attempt state guards.
- **STORY02:** typed private task+result handoff with persistent claims, source-checked ledger transitions and fake adapter tests, no Temporal migration yet. Never create independent duplicate charge tables.
- **STORY03:** separate storyteller-execute Temporal worker and replay-safe workflow phases with GA publication activity. Coordinates DIST05 shared worker source files. No live paid calls.
- **STORY04:** on actual multi-Pod application, run one Storyteller proposal with bounded S3 canonical read and coherent publication; test wrong branch/root and duplicates. Requires DATA03/05/06, DIST03–05 and cluster infrastructure. Record real evidence.

**Exclude** image generation, Stripe, production pricing, vector/Cognee dependencies, model Code Mode, multiplayer and full HA. They stay in the deferred register.
