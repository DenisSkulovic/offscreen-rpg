# Capture and crash protocol | SQL, immutable CAS, Temporal and provider sends

**Status: technical design for adversarial review, 2026-11-15.** Not code or migration authorization. Source [writer audit](../evidence/mutation-writer-audit-2026-11-15.md), [physical storage](physical-evidence-storage-v1.md), [evidence graph](evidence-model.md), [ENG03 short-lock lineage](../../engine-architecture/decisions/eng03-capture-migration-sequence.md). This protocol uses existing SQL/Temporal/DocumentStore owners rather than introducing a distributed transaction, event bus or generic saga.

## 1. Four evidentiary obligations, with different criticality

| Class | What must survive | On collection failure | Example |
| --- | --- | --- | --- |
| **E0: committed game truth** | Original source rows + ordered compact typed transition/effect/event evidence, same SQL commit | Abort **new** mutation transaction; accepted prior action/hold remains and can be retried using same identity | item transfer, roll, earned progress, clock/hold, publication |
| **E1: paid dispatch custody** | Exact prepared/sent packet identity + content custody and attempt/usage state **before** possible external send | Do not begin **new** paid send; report held/blocked. Never erase already committed mechanical result | Storyteller provider attempt, multi-round memory |
| **E2: rich forensic enrichment** | component/source graph, large protected artifacts, supplementary timings, indexed explanation | Retry bounded from frozen source or mark partial; E0/E1 remain valid. Never invent missing data | prompt derivation tree, display-friendly state diffs |
| **E3: operational telemetry** | sampled spans, metrics, logs | Best-effort; record ingestion-loss metric when possible; **never** change game behavior | Tempo/Loki/Prometheus |

A promise of *complete* historical prompt reconstruction requires E2 content availability. If E2 is merely optional by policy, the system must describe its coverage as **partial**, even though E0 game truth is complete.

**Important reliability distinction:** the assistant/user might say “capture everything,” but pushing every context byte into E0 under `story FOR UPDATE` risks violating a more important invariant: responsive, correct game mechanics. Treat important values as E0 **compact identity and typed change** plus E1 **pre-dispatch protected artifact**, not one giant hot SQL blob.

## 2. Pattern A: authoritative game transition (one SQL commit)

~~~text
Command or due worker with stable operation ID
  -> [optional off-lock read/preflight; NOT authority]
  -> database transaction
       acquire story row FOR UPDATE
       inspect actual authoritative current state + idempotency source
       if already committed: return existing receipt, NO new evidence sequence
       calculate deterministic allowed effects / ordered activity subevents
       construct strict E0 state delta + source/event IDs + before/after hashes
       validate bounded E0 capture and complete coverage
       apply existing source mutations (or stage in transaction)
       allocate new story_evidence_cursor sequence (one per atomic group)
       INSERT immutable transition and within-commit source/effect refs
       enqueue existing business outbox work if needed
       commit
  -> optional E2 enrichment worker receives a dedicated *derived* wake
  -> UI reads committed source + evidence; live hint is not the truth
~~~

**Atomicity:** it does not matter whether evidence INSERT appears slightly before or after campaign UPDATE **inside the same transaction**. They commit/rollback together. Avoid recursively using a generic SQL trigger for all tables: it cannot reliably infer business purpose, actor permission, original rule version and one grouped action from row changes.

**Failure:** if E0 insert fails, the whole **new transition** rolls back with its effect, with an explicit stable operator error. If an already accepted timer-driven operation is due and cannot settle due to the evidence store, its existing execution remains accepted and held/waiting under the current idempotency rules. An operator fix must resume the **same** execution after the fault is repaired; it must not issue a second RNG draw or new accepted action. The specific due-state UX/hold path needs validation in a disposable integration test before claiming launch readiness.

**No-ops/duplicates:** a duplicate command, notification or Temporal Activity must return the prior source result, not allocate a fresh forensic sequence. A clock wake that computes no state change should emit metrics, not thousands of story transitions.

**Multi-boundary activity:** `settleActivity` may process up to 24 boundaries in one transaction. Allocate **one** atomic-group sequence and record ordered subevents for each material check/effect/stop, with precise game seconds and source receipts. A second writer cannot interleave within the transaction; a crash before commit leaves none.

## 3. Pattern B: immutable context and source preparation outside a hot lock

~~~text
Stage 1: story lock (SQL only)
  -> freeze **exact** required source/state/ids/hashes and accepted authority
  -> durable capture G + same operation/hold + old-topic outbox wake
  -> commit quickly

Stage 2: no story lock, no long DB transaction
  -> claim bounded lease by G/operation
  -> load immutable CAS by captured hashes, validate schema/coverage
  -> build *same typed task/context data shape* as game uses
  -> emit source-selection/provenance and byte-identical request artifact
  -> verify protected artifact custody and hard size/retention policy
  -> short transaction: source/owner/root/actor/receipt fence and
       promote **same G**, link exact artifact and existing Storyteller wake
  -> commit

Stage 3: existing model dispatch and publication use their own short fences
  -> no second mechanic/dice; no stale scene publication
~~~

This reuses the **ENG03-narrow/C1/C2 capture pattern**; it must not be generalized blindly to historical reports or draft opening, which have different staleness/authority. [ENG03 purpose sequence](../../engine-architecture/decisions/eng03-capture-migration-sequence.md) governs each migration separately.

**Stale CAS/secret missing:** record an unambiguous held/blocked/stale reason. Do not silently replace frozen facts with current story state or invent narrative. A source whose root changed can still be a legitimate historical report under *report-purpose* rules; not every late result is stale.

## 4. Pattern C: exact protected packet and possible paid send

Current observed code already uses:

~~~text
prepareDispatchReview(G, attemptId, task, dispatch)
   -> save packet + packetSha256/inspection in storyteller_dispatch_review
budget.reserve(attemptId, G, request/limits)
   -> save reserved attempt + resource allocation
budget.dispatch(attemptId, execution, liveAuthority)
   -> commit state='dispatched' before provider transport
provider(task, dispatch)
   -> provider output | failure | uncertain transport
budget.settle / budget.uncertain + generation state
   -> ordinary publication attempt when valid
~~~

**The design preserves that sequencing**, adding a mandatory equality proof between archived `inspection.body` and actual last-serializer transport bytes. If serializer output differs because of provider projection, output ceiling, whitespace or model parameters, the stored packet is a **prepared review artifact**, not proof of what actually went on the wire until the transport edge produces/validates matching hash.

**Design policy:** for any actual external send, the durable E1 packet reference + hash, model/route/output-schema policy, G/attempt identity and `dispatched-or-possibly-dispatched` accounting state must exist before invoking external I/O. If protected storage fails, **hold the new dispatch**. Do not trigger a second provider call automatically when the first is possibly sent.

**Crash window:** a process can commit `state='dispatched'` and crash *before the socket write*. That is not proof the provider received anything. Conversely, bytes can reach the provider and the process crash before receiving an acknowledgment. Therefore `dispatched` means **possibly sent**, not guaranteed billed. Cost and retry logic must use existing uncertain/unsent/provider-reported evidence; never infer free retry from a missing HTTP response or old trace. For exact certainty, a provider-supported idempotency/reconciliation capability is needed and must be proven separately.

**Memory rounds:** each round has unique attemptId and exact packet/source provenance, while the shared operation G can execute zero, one or several model rounds. A pending model request already persisted in `storyteller_memory_exploration` should be referenced, not copied into another unbounded working-state blob; replay must not double-count a repaired/retried round.

## 5. Pattern D: long orchestration and asynchronous causality

Existing Postgres outbox `id/topic/operationId/leaseId/deliveredAt` is the bridge to worker/Temporal. It is not an event history containing every state change.

**One durable causal mapping record per notice/workflow effect is enough**:

~~~text
business operationId
  -> committed SQL source and outbox noticeId
  -> delivery attempt(s), lease, workflowType and workflowId
  -> Temporal runId(s) and Activity attempt(s) where supported
  -> same game operation's authoritative receipt or held state
  -> G, paid model attempt(s), publication and new passage
~~~

- Duplicate outbox delivery/new lease **links to the same notice/business identity**; no duplicate game result.
- A restarted Temporal Activity may acquire a new OTel trace, but **stable domain references** link the two; do not create one 8-hour span.
- A Temporal workflow may Continue-As-New or terminate separately from a game outcome. Link actual Workflow ID/Run ID and status without mistaking the workflow's own replay for a game replay.
- A worker failure after starting the workflow but before ACK leaves a retriable notice. Business idempotence, not an optimistic "delivered once" flag, prevents double execution.
- A complete source-based investigation should remain possible after sampled OTel spans or limited Temporal history expire, at least at the compact E0/E1 evidentiary level.

## 6. Lifecycle state machine for an evidence artifact

~~~text
UNREFERENCED_STAGED (immutable bytes written, SQL business pointer not committed)
  | hash verified, source/owner bound
  v
PREPARED (intent and metadata committed, payload custody proved)
  | authoritative SQL link becomes committed / paid send admitted
  v
ACTIVE (ready, access governed, retention window running)
  | expiry / explicit deletion / approved hold
  +--> HELD (named incident, bounded expiry, approved actor)
  +--> EXPIRED (raw body unavailable; safe coverage tombstone remains)
  +--> DELETED (subject erasure; body/hash metadata per lawful policy)
  +--> QUARANTINED (corrupt checksum, incompatible codec, privacy incident)
  
UNREFERENCED_STAGED -- timed GC after safe reference check --> REMOVED
PREPARED -- cancellation or failed business transaction --> GC_ELIGIBLE
~~~

**No distributed atomic commit between SQL and CAS is assumed.** An immutable object may exist after SQL rollback; orphan GC must verify absence of any live reference and retention hold before deletion. A SQL pointer can never be `ready` while its object is absent/mismatched; readiness is conditional on checksum/metadata validation and storage availability. During outage report `unavailable`/`missing` explicitly.

**Retention is not one background cron that deletes rows indiscriminately.** Raw SQL provider/task JSONB is currently a source too; see the [physical model retention conflict](physical-evidence-storage-v1.md#6-retention-conflict-in-the-current-schema-an-implementation-blocker). Any TTL claim requires all copies, indexes and backup policy reconciled. An expired raw body can coexist with a still-valid published story and safe source hash if lawful.

## 7. Crash and race matrix (must be tested, not reasoned away)

| Injection point | Allowed outcome | Forbidden outcome |
| --- | --- | --- |
| Before player command lock | No accepted game write | Phantom committed action/evidence |
| After business effect UPDATE, before evidence INSERT, SQL crash | Whole transaction rolled back | Earned item/time without E0 proof |
| After E0 INSERT, before SQL commit, crash | Both evidence/effects rolled back | Standalone “ghost” transition |
| After SQL commit, before HTTP ACK | Receipt exists; retry same operation reads it | New roll, second effect or second event sequence |
| Activity processes 3 checks and crashes before commit | No partial earned result; next attempt within original rules | Half-applied rewards or extraneous subevents |
| After SQL commit, before outbox relay | Durable notice retried | Lost required narration without detectable hold |
| Outbox starts Temporal then relay dies before ACK | Duplicate start/notice converges on same work | Parallel duplicate game settlement |
| Context capture committed, CAS missing | Same G remains held/blocked with reason | New G or fabricated prompt |
| CAS artifact staged, SQL publication fails | Orphan eligible for safe later GC; old story unchanged | Public scene that never committed |
| CAS slow during context materialization | Story lock held only for short SQL stages | 2s CAS read becomes 2s FOR UPDATE hold |
| Source/actor/settings revision changes before promotion | Purpose-specific stale/held boundary, no illegal publish | Old task claims new current authority |
| Packet prepared, budget reservation fails | No provider call; task held/failure reason | Unaccounted/unauthorized external spend |
| Attempt recorded dispatched, process dies before provider socket | Conservative uncertain/possibly sent state | Guaranteed “free retry” assertion |
| Provider sent, timeout before response | Uncertain billing and one attempt identity | Automatic paid duplicate or assumed zero usage |
| Provider returns output, SQL settle fails | Recover exact captured outcome if persisted; otherwise uncertain policy, no blind resend | Re-computation with new model call and same attempt as though identical |
| Output valid, publication stale | Generation may succeed, publication blocked/stale; game unchanged | Player-visible unearned scene |
| Telemetry collector down | E0/E1 still work; trace may be missing | Gameplay rollback or a fake traced history |
| Artifact expires while Support/Developer viewing | New protected read denied; existing safe metadata/coverage visible | Cached access bypasses policy/expiry |
| Two operators rearm same G | One audited valid epoch / same-G path per existing C1-R | Second capture identity or provider budget bypass |
| Player story deleted during artifact GC | Scoped deletion/hold workflow, no cross-user leak; replay gap honest | Content resurrected from orphan/backup without lawful source |

**Source-specific negative:** `storyteller_context_capture` has rearm metadata and lease attempts; a retry must never invoke a new model call simply because forensic E2 source enrichment failed. The mandatory original command/receipt/G identity always wins.

## 8. Fail-open vs fail-closed policy matrix

| Dependency unavailable | New action/settlement | New paid dispatch | Story replay/Admin |
| --- | --- | --- | --- |
| OTel Collector/Grafana/Loki | **Continue** with E0 | Continue if E1 valid | Show telemetry gap |
| Derived provenance projector | Continue if critical source/E1 retained; mark enrich partial | Continue **only if** exact required packet custody already proven | Show incomplete graph |
| Primary SQL/game ledger | **Fail closed** no new commit; preserve accepted prior state | Deny new budget/dispatch | Read unavailable, no fabricated state |
| Forensic compact E0 insert in same DB | **Fail closed new mutation transaction** under proposed guarantee | N/A or deny where E0 required | Historic coverage remains previous state |
| Protected archive for new E1 packet | Gameplay mechanics continue, narration can hold | **Deny new external send**, preserve source/attempt | Metadata and previous published story available |
| Optional old raw packet expired | Does not change committed game | Existing new dispatch uses new exact packet custody | Read meta-only with explicit expired body |
| Admin audit store down | Game continues | Player provider policy unaffected | **Deny exceptional raw/private staff disclosure**; safe public reads according to access policy |
| CAS corruption | Hold stage requiring content; no fictional fallback | Deny sending unverified packet | Show corrupt/missing artifact, never repair from "latest" |

**Nuance:** “fail closed game settlement if E0 down” is only safe when evidence INSERT shares the same SQL transaction and cannot partially commit. The settled action may be due and still legally accepted; its previous accepted state must remain and the incident must be recoverable without double-counting fictional time. Validate that in one genuine test. Do not give a simplistic “500 -> retry with new UUID” instruction.

## 9. Required instrumentation of the capture machinery itself

Capturing forensic data introduces its own failure modes. Expose bounded metrics:
- `offscreen_evidence_capture_total{class,outcome,sourceFamily}`
- `offscreen_evidence_stage_latency_seconds{class,sourceFamily}`
- `offscreen_evidence_pending_artifacts{class}`
- `offscreen_evidence_orphans_detected_total{class}`
- `offscreen_evidence_checksum_failures_total{class}`
- `offscreen_evidence_access_denials_total{capability,reasonClass}`
- `offscreen_evidence_reconstruct_failures_total{reasonClass}`

No `storyId` or packet hash in Prometheus labels. Persist precise subject IDs only in the native authorized evidence index or carefully scoped trace attributes. Put exact failure reason and coverage in the Admin view; not another raw SQL log dump.

## 10. Readiness gate

1. Prove exact current transaction and external send order from source, including `budget.reserve` / `budget.dispatch` and `prepareDispatchReview`.
2. Verify every E0 writer on the [mutation map](../evidence/mutation-writer-audit-2026-11-15.md) has a co-commit adapter; activity batch subevent ordering preserved.
3. Prove no external CAS, telemetry or provider call inserted under story lock, using 0/250/2000ms fault injection and an authorized same-story contender.
4. Prove persistence recovery for each crash matrix row with disposable SQL/Temporal plus scripted provider-disabled fixtures. Do not make real paid calls.
5. Prove Admin exceptional private-content access is gated/audited and fail-closed under audit-store failure.
6. Produce actual byte/latency overhead results and enforce measured retention budgets. Define one owned rollback path before a migration is Ready.

**Not selected for code.** The design intentionally extends the existing modular monolith and does not authorize a generic distributed saga, new Kafka topic fleet or universal log flood.
