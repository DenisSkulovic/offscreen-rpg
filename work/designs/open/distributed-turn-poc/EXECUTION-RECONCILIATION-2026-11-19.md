# DISTURN | Execution reconciliation against merged ARCH02 and current Cursor batch

**Status:** planning correction, 2026-11-19. This page is **not** a new implementation Change or authorization. It corrects earlier DISTURN planning assumptions after inspecting current `main`, the [queue](../../../changes/README.md), [proposed service ownership](../../../docs/technical/platform/topology.md#proposed-service-ownership), and [commands/business events/workflows](../../../docs/technical/platform/execution-and-delivery.md#commands-business-events-and-workflows). Re-read current HEAD and local Cursor worktrees before execution. Do not overwrite an active branch. Evidence here is GitHub source/queue status, **not** live Kubernetes probe results.

## Current verified progress / uncertainty

| Area | Verified merged record | Still not shown as integrated |
| --- | --- | --- |
| Architecture | ARCH01/02/03/04 Done in queue; proposed Engine writer and branch-scoped canon owner | Separate deployed Game Authority and Storyteller, working historical fork |
| kind | K8S01 Done; disposable kind smoke, cluster deleted after proof | One permanently assembled/full-run profile |
| CloudNativePG | K8S02 Done, single primary retained test row through Pod death | App schema migration and in-cluster production application connectivity |
| Redis | K8S04 Done, cache-loss probes | Cache use by game, intentionally not required to prove turn |
| Gateway | K8S09 Done, synthetic loopback / and /api routes | Real Next/Nest auth/SSR/SSE through gateway |
| Active queue | K8S03 RabbitMQ, K8S05 S3, K8S06 Temporal, K8S07 observability, DATA01 scene-schema design | Completion receipts and integration (Cursor work may exist uncommitted) |

**Branch discovery:** public GitHub branches did not expose a newer active implementation branch in this inspection; do not infer that local Cursor worktrees are idle, absent or merged. `Current change: none` coexists intentionally with the explicit active batch. Earlier DISTURN D1–D5 prose still contains stale references to ARCH02 unmerged and old K8S03/K8S09 status; the queue and canonical technical documents supersede them.

## Corrected architectural position: three different deliveries

The merged [execution authority](../../../docs/technical/platform/execution-and-delivery.md#commands-business-events-and-workflows) preserves the existing SQL-outbox→**direct Temporal RPC** wake path for workflow starts and signals. **Do not implement SQL-outbox→RabbitMQ→Temporal as the default model-call orchestration chain merely to put RabbitMQ on the diagram.** It would add delivery ownership, duplicate acknowledgements and a needless second scheduler wake bridge. RabbitMQ instead transports **committed, versioned domain events** for independent, replay-tolerant consumers, as already ratified.

Suggested **smallest meaningful broker vertical slice** for POC (requires independent ratification of exact event, consumer, and index owner):
- Game Authority commits scene/passage/root/checkpoint and a post-commit outbox `scene.published.v1` **fact** in one transaction.
- A bounded publisher relays that fact to RabbitMQ with publisher confirm and idempotent delivery tracking.
- One separate consumer updates a **disposable derived scene/source retrieval projection** keyed by `storyId, branch/as-of root, passageId, committed revision`, allowing incremental discoverability for future Storyteller tasks. This may be a lexical index/subscriber; it **must not** set canonical root, rewrite passage or apply mechanics.
- The consumer has own inbox/dedup key and recovers by exact committed-root/source read or index rebuild after missed events; retrieval must revalidate results against root and visibility. The first Storyteller turn still works through exact S3 source and SQL state if this derived projection is lagging/down.
- A *non-decorative* broker proof compares pre/post projection, duplicate and out-of-order delivery, and broken projection recovery. If a genuine read-model consumer is not worth introducing for the POC, mark the RabbitMQ integration as **laboratory-only** rather than falsely counting broker in the functional Storyteller causality path. A broker transport cannot be the source of state truth.

The owner wants real experience with RabbitMQ, but the educational requirement does not justify corrupting the game's already selected execution model. A later design might route a justified independently addressed command through broker, with an explicit nonoverlapping ownership decision; not by default.

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
       -> RabbitMQ -> independent derived retrieval projection (can lag/rebuild)
  -> PostgreSQL LISTEN/NOTIFY -> Nest SSE hint -> browser authoritative GET
  -> historical GET scene1 and independent fork from scene1
```

**Join constraint:** do not require the derived projection to be current in order to commit or read an authoritative scene. Any indexing error must not block gameplay or inject uncommitted/future-branch knowledge.

## Existing packets: KEEP, REVISE, or RECONCILE

| Packet | Decision | Precise correction / successor |
| --- | --- | --- |
| DIST01 | **Update against ARCH02 Done** | No blocking “ARCH02 unmerged.” Ratify only remaining process-specific details: GA RPC, direct Temporal task-queue topology and the separate broker fact consumer. Do not duplicate ARCH02's canonical decisions. |
| DIST02 | **Narrow/retarget** | Versioned broker `scene.published.v1` fact + inbox/idempotent **projection** contract, not an `operationId` notice to start Temporal. Scope contract tests to branch/root/event identity, ordering, visibility and consumer retry. |
| DIST03 | **Keep** | Private GA extraction with real command/owner auth and a single SQL writer remains critical. |
| DIST04 | **Replace proposed implementation semantics** | Implement postcommit business-event relay to RabbitMQ and derived consumer, preserving direct SQL-outbox→Temporal dispatch for workflow notices. `apps/worker/src/outbox/relay.ts` may need topic classification, not blanket rerouting. |
| DIST05 / STORY03 | **Consolidate by owning seam** | DIST05 owns pure separation of execution vs publication and narrow permissions. STORY03 owns Temporal workflow/task-queue wiring and actual separate worker entrypoint. One shared worker runtime integrator, not duplicate worker implementations. |
| DIST06 / BOOT04 / STORY04 / TURN03 | **Single test harness, different assertions** | BOOT04 first scene, DIST06 distributed fake continuation, STORY04 canonical read/proposal, DATA04 historical fork; TURN03 runs **one combined end-to-end** trace and fail cases. |
| DATA01–06 | **Keep, respect active DATA01** | DATA01 in active batch. DATA02 + DATA05 can parallel after schema/storage gates; DATA03 publication and DATA04 fork serialized at merge; DATA06 after branch rules. |
| BOOT01–04 | **Keep** | BOOT02 controlled package import parallel after ownership; BOOT03 GA start depends on single writer and DATA03 checkpoint. |
| STORY01/02/04 | **Keep** | Reuse attempt/usage ledger; no second charge/claims schema and no broad GA-write credentials to model executor. |
| TURN01/02 | **Prepare in parallel** | One fixture specification and one real app deployment profile, not separate duplicated releases. TURN02 merges with K8S08/K8S11 and infra authoring. |
| TURN04 | **Opt-in only** | No provider charge, model dispatch or automatic subscription/payments integration from any implementation batch. |

## Critical path: actual dependency graph

```text
ACTIVE Cursor wave: K8S03 K8S05 K8S06 K8S07 DATA01
  │
  ├─ after ARCH02 done: DIST01 reconcile service/transport exceptions; STORY01; BOOT01
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

1. **Current: no change to active batch.** K8S03, K8S05, K8S06, K8S07 have disjoint infra directories but share the cluster lock; DATA01 owns checkpoint-document headings. Build receipts must be merged before treating prerequisites as Done.
2. **Contract integration, research immediately permissible with authorization:** DIST01 transport correction and artifact-specific source mapping; STORY01 attempt/task contract; BOOT01 candidate/start owner; TURN01 deterministic fixture. Independent read-only worktrees; no competing canonical-heading writes.
3. **First parallel code wave (after contracts):** DIST03 private GA entrypoint/API boundary; DATA02 typed checkpoint/SQL selector; DIST02 event schema + consumer pure adapters; BOOT02 content import script/image; web image build/release research. Distinct file owners. DB migration number and root `pnpm-lock.yaml` are global write locks.
4. **Second wave:** DIST04 Rabbit business-event projection; STORY02 task/result custody; DATA05 S3 cluster wiring; K8S11 Next/Nest real edge; BOOT03 Game Authority start once DATA03 and DIST03 join.
5. **Serial correctness joins:** DATA03 scene-publish, DIST05 pure execution/publication extraction, STORY03 Temporal routing. They share story publication, workflow runtime and DB authority and must not be blind parallel edits.
6. **Last join:** DATA04 history/fork, DATA06 branch-safe memory, STORY04 cross-Pod canon, BOOT04 campaign start, TURN02 release and TURN03 combined proof. TURN04 may be separately authorized afterward.

## Before any Cursor Change is promoted to Ready

The coordinator must check current main + local worktree, existing file lock/owner, exact canonical source and proposed schema, updated/remaining predecessor states, one normal and one discriminating negative test, actual script/test commands, planned resource use, migration rollback and doc reconciliation. No packet becomes Done from a diagram or Pod Ready. A Proposed packet is not automatically executable under the existing active batch.

## Deferred, still retained

Image generation linked to original scene, richer Storyteller indexing / Cognee or sandboxed Code Mode if measured, customer usage reconciliation and Stripe, external notifications, commercial subscriptions, multiplayer, advanced mechanics and cloud/HA/load work stay in [GAPS](GAPS.md#defer-deliberately-but-do-not-lose-the-work). Minimal per-attempt spending custody stays within STORY execution, but real provider remains opt-in.
