# DISTURN | Execution reconciliation against merged ARCH02 and current Cursor batch

**Status:** planning correction, 2026-11-19. This page is **not** a new implementation Change or authorization. It corrects earlier DISTURN planning assumptions after inspecting current `main`, the [queue](../../../changes/README.md), [proposed service ownership](../../../../docs/technical/platform/topology.md#proposed-service-ownership), and [commands/business events/workflows](../../../../docs/technical/platform/execution-and-delivery.md#commands-business-events-and-workflows). Re-read current HEAD and local Cursor worktrees before execution. Do not overwrite an active branch. Evidence here is GitHub source/queue status, **not** live Kubernetes probe results.

## Current verified progress / uncertainty

| Area | Verified merged record | Still not shown as integrated |
| --- | --- | --- |
| Architecture | ARCH01 through ARCH05 are merged design contracts. The engine is the proposed checkpoint boundary. There is no Game Economy service | Separate deployed writer and Storyteller processes, and a working historical fork |
| kind | K8S01 Done; disposable kind smoke, cluster deleted after proof | One permanently assembled full-run profile |
| CloudNativePG | K8S02 Done, single primary retained a test row through Pod death | Application schema migration and in-cluster application connectivity |
| RabbitMQ laboratory | K8S03 merged. One replica, then the cluster was deleted | An application producer or consumer. The game does not use that broker |
| Redis | K8S04 Done, cache-loss probes | Cache use by the game. The cache is not required to prove a turn |
| Temporal laboratory | K8S06 merged. Temporal 1.32.2 kept one non-game workflow, then the cluster was deleted | The Compose development server, and the game workflow |
| Gateway | K8S09 Done, synthetic loopback `/` and `/api`, then the cluster was deleted | Real Next or Nest auth, SSR, or SSE through the gateway |
| Checkpoint | DATA01's design contract is merged | DATA02's checkpoint object. This page does not mark that implementation Done |
| Active batch | Not declared on this page. The queue is the only declaration | Two current-tense batch sentences still sit in the queue. The orchestrator owns that edit |

**Branch discovery:** do not infer that other Cursor worktrees are idle or merged. This page does not declare an active batch. Superseded phrase: "ARCH02 unmerged." ARCH02 is merged. Superseded status: K8S03, K8S06, and K8S09 as the current batch. They are merged laboratory proofs, and each cluster was deleted.

## Corrected architectural position: three different deliveries

The merged [execution authority](../../../../docs/technical/platform/execution-and-delivery.md#commands-business-events-and-workflows) keeps the SQL outbox to a **direct Temporal RPC** for workflow starts and signals. Superseded, and not an instruction: SQL outbox to RabbitMQ to Temporal as the model-call chain. That hop adds a second acknowledgement and a second wake owner. RabbitMQ transports committed domain events to independent, replay-tolerant consumers, and only when a consumer is separately selected. This page does not add a broker requirement to the turn. The story SSE stream stays on PostgreSQL LISTEN/NOTIFY. The engine keeps the scene checkpoint.

The notes below are constraints on a future consumer. They are not a build order. If no consumer is worth selecting, RabbitMQ stays laboratory-only:
- Game Authority commits scene/passage/root/checkpoint and a post-commit outbox `scene.published.v1` **fact** in one transaction.
- A bounded publisher relays that fact to RabbitMQ with publisher confirm and idempotent delivery tracking.
- One separate consumer updates a **disposable derived scene/source retrieval projection** keyed by `storyId, branch/as-of root, passageId, committed revision`, allowing incremental discoverability for future Storyteller tasks. This may be a lexical index/subscriber; it **must not** set canonical root, rewrite passage or apply mechanics.
- The consumer has own inbox/dedup key and recovers by exact committed-root/source read or index rebuild after missed events; retrieval must revalidate results against root and visibility. The first Storyteller turn still works through exact S3 source and SQL state if this derived projection is lagging/down.
- A *non-decorative* broker proof compares pre/post projection, duplicate and out-of-order delivery, and broken projection recovery. If a genuine read-model consumer is not worth introducing for the POC, mark the RabbitMQ integration as **laboratory-only** rather than falsely counting broker in the functional Storyteller causality path. A broker transport cannot be the source of state truth.

The owner wants real experience with RabbitMQ. That educational aim does not change the selected execution model. A story command stays on the direct Temporal wake or on a direct call to its owner. It is not republished as a business event in order to give the broker a job.

## One coherent proposed runtime flow

```text
Next browser -> Nest public auth/SSE/HTTP
  -> private Game Authority HTTP (one writer), exact command ID
  -> PostgreSQL transaction, game effect/receipt + Temporal wake outbox
  -> direct Temporal RPC by durable wake relay
  -> distributed Temporal workflow (stable workflow ID, control task queue)
  -> Storyteller execution-only Activity worker (separate task queue)
  -> bounded root/branch-pinned context + S3 canonical reads
  -> scripted provider proposal + already-existing attempt ledger
  -> Game Authority guards scene publication, state+canon checkpoint in SQL
  -> scene-published business fact in SQL outbox
       -> optional, and only if a consumer is selected: RabbitMQ -> disposable projection
  -> PostgreSQL LISTEN/NOTIFY -> Nest SSE hint -> browser authoritative GET
  -> historical GET scene1 and independent fork from scene1
```

**Join constraint:** do not require the derived projection to be current in order to commit or read an authoritative scene. Any indexing error must not block gameplay or inject uncommitted/future-branch knowledge.

## Existing packets: KEEP, REVISE, or RECONCILE

| Packet | Decision | Precise correction / successor |
| --- | --- | --- |
| DIST01 | **Update against ARCH02 Done** | Superseded phrase, not a blocker: "ARCH02 unmerged." Ratify remaining writer RPC and Temporal task-queue details. A broker consumer stays optional. Do not duplicate ARCH02's canonical decisions. |
| DIST02 | **Narrowed in AUD01** | A versioned post-commit fact and an idempotent consumer contract. Not an operation-id notice that starts Temporal. Still Proposed. Not a new mandatory topic. |
| DIST03 | **Keep** | Private GA extraction with real command/owner auth and a single SQL writer remains critical. |
| DIST04 | **Replaced proposed semantics in AUD01** | If a consumer is later selected, relay one committed fact to RabbitMQ. The workflow wake stays the direct RPC in `apps/worker/src/outbox/relay.ts`. Still Proposed. Not a broker-to-Temporal adapter. |
| DIST05 / STORY03 | **Consolidate by owning seam** | DIST05 owns pure separation of execution vs publication and narrow permissions. STORY03 owns Temporal workflow/task-queue wiring and actual separate worker entrypoint. One shared worker runtime integrator, not duplicate worker implementations. |
| DIST06 / BOOT04 / STORY04 / TURN03 | **Single test harness, different assertions** | BOOT04 first scene, DIST06 distributed fake continuation, STORY04 canonical read/proposal, DATA04 historical fork; TURN03 runs **one combined end-to-end** trace and fail cases. |
| DATA01–06 | **Keep** | DATA01 is merged. DATA02 is the open checkpoint implementation and is not Done. DATA03 publication and DATA04 fork join at merge. DATA06 follows branch rules. |
| BOOT01–04 | **Keep** | BOOT02 controlled package import parallel after ownership; BOOT03 GA start depends on single writer and DATA03 checkpoint. |
| STORY01/02/04 | **Keep** | Reuse attempt/usage ledger; no second charge/claims schema and no broad GA-write credentials to model executor. |
| TURN01/02 | **Prepare in parallel** | One fixture specification and one real app deployment profile, not separate duplicated releases. TURN02 merges with K8S08/K8S11 and infra authoring. |
| TURN04 | **Opt-in only** | No provider charge, model dispatch or automatic subscription/payments integration from any implementation batch. |

## Critical path: actual dependency graph

```text
Superseded snapshot, not the current batch: K8S03 K8S05 K8S06 K8S07 DATA01
Those five are merged laboratory or design records. They are not a running game.
The queue alone names the current batch. This diagram does not repeat it.
  │
  ├─ ARCH02 is merged: DIST01 may still record remaining writer and task-queue details; STORY01; BOOT01
  │      ├─ DIST03 private Game Authority ───── BOOT03 owned Start
  │      ├─ DIST02 fact/event contract ──── DIST04 broker derived consumer
  │      └─ STORY02 attempt/task facade ── DIST05 pure split ── STORY03 Temporal
  │
  ├─ after DATA01: DATA02 checkpoint object/schema ── DATA03 scene1/scene2 commit
  │                                            └────── DATA04 historic read/fork
  ├─ after K8S05: DATA05 cross-Pod S3 ─ BOOT02 pinned source import
  ├─ ARCH03/05, DATA03/04, STORY02/03 ── DATA06 branch-scoped context
  ├─ after gateway / actual service images: K8S11 actual Next/Nest ─ TURN02 one release
  └─ BOOT04 / DIST06 / STORY04 are subproofs in ONE integrated fixture
                                └─ TURN03 full historic-forkable fake turn
                                    └─ TURN04 separately approved real-provider
```

**Schedule caveats:** this is a dependency model, not a claim that every listed gate is a hard code dependency. For example, broker projection can be tested independently and need not block the Storyteller's exact-root task; infrastructure and client packaging may run in parallel within memory/file ownership limits. New state snapshot migrations and Storyteller publication code have overlapping files and one integrator. Shared cluster state is protected by the existing lock and no parallel test runs.

## Parallel Cursor waves and file ownership

1. **Superseded wave.** K8S03, K8S05, K8S06, K8S07, and DATA01 are merged. K8S06's Temporal proof deleted its cluster and is not the Compose server or the game workflow. DATA02 owns the checkpoint implementation and is not Done. This page does not declare a replacement active batch. The queue still contains two current-tense batch sentences; that edit belongs to the orchestrator. Shared cluster work still takes the cluster lock, and this Change does not take it.
2. **Contract integration, research immediately permissible with authorization:** DIST01 transport correction and artifact-specific source mapping; STORY01 attempt/task contract; BOOT01 candidate/start owner; TURN01 deterministic fixture. Independent read-only worktrees; no competing canonical-heading writes.
3. **First parallel code wave (after contracts):** DIST03 private GA entrypoint/API boundary; DATA02 typed checkpoint/SQL selector; DIST02 event schema + consumer pure adapters; BOOT02 content import script/image; web image build/release research. Distinct file owners. DB migration number and root `pnpm-lock.yaml` are global write locks.
4. **Second wave:** DIST04 Rabbit business-event projection; STORY02 task/result custody; DATA05 S3 cluster wiring; K8S11 Next/Nest real edge; BOOT03 Game Authority start once DATA03 and DIST03 join.
5. **Serial correctness joins:** DATA03 scene-publish, DIST05 pure execution/publication extraction, STORY03 Temporal routing. They share story publication, workflow runtime and DB authority and must not be blind parallel edits.
6. **Last join:** DATA04 history/fork, DATA06 branch-safe memory, STORY04 cross-Pod canon, BOOT04 campaign start, TURN02 release and TURN03 combined proof. TURN04 may be separately authorized afterward.

## Before any Cursor Change is promoted to Ready

The coordinator must check current main + local worktree, existing file lock/owner, exact canonical source and proposed schema, updated/remaining predecessor states, one normal and one discriminating negative test, actual script/test commands, planned resource use, migration rollback and doc reconciliation. No packet becomes Done from a diagram or Pod Ready. A Proposed packet is not automatically executable under the existing active batch.

## Deferred, still retained

Image generation linked to original scene, richer Storyteller indexing / Cognee or sandboxed Code Mode if measured, customer usage reconciliation and Stripe, external notifications, commercial subscriptions, multiplayer, advanced mechanics and cloud/HA/load work stay in [GAPS](GAPS.md#defer-deliberately-but-do-not-lose-the-work). Minimal per-attempt spending custody stays within STORY execution, but real provider remains opt-in.
