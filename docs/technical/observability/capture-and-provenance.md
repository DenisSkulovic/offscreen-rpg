# Committed transition capture V1 | One real mechanic, one atomic forensic source

**Status:** wave-4 detailed technical contract, proposal only, 2026-11-15. **No code/schema/test authorized**. Source: [writer closure](../../programs/observability/evidence/writer-closure-and-sequence-2026-11-15.md), [physical evidence storage](../../programs/observability/technical/physical-evidence-storage-v1.md), [transaction protocol](../../programs/observability/technical/capture-transaction-protocol.md), [historical reconstruction](../../programs/observability/technical/reconstruction-algorithm-v1.md). This design intentionally does **not** require full event sourcing or a global collection of function-level logs.

## 1. Pilot before universal rollout

**Choose one committed finite-action settlement/interrupt path first** at `packages/application/src/campaign/action-executions.ts::settleActionExecution`, with the matching `gameActionExecutionEvent` and `gameActionReceipt` and the caller's `story FOR UPDATE`. Follow-up `campaign/follow-up-intents.ts` and `storyteller` capture are causal descendants but not additional earned action events. This is a **source-backed technical experiment** before accepting all writers.

Why:
- It has an exact accepted original operation, saved plan, source passage/revision and explicit game time.
- Its success case commits one `gameActionReceipt` with actual effects/roll; the interrupt case deliberately commits **no** success receipt.
- It can modify character, storyFacts, world, clock/anchor, activeAction, holds, and emit a consequence intent/outbox wake **in one SQL transaction**.
- It has a realistic duplicate worker/Temporal replay and same-story contention test.
- It exercises a meaningful before/after diff and source causal chain without needing to invent a universal historical world reducer.

**Do not use this pilot to claim arbitrary old-campaign rewind**. It establishes first-source evidence and measures cost; broader reconstruction remains partial until all material writer families and genesis/frontier support are proven.

## 2. Exact causal state and historical frontier

One successful **new business mutation** corresponds to one `GameCommitEvidenceV1` atomic group:

~~~ts
type GameCommitEvidenceV1 = Readonly<{
  version: 1;
  evidenceId: UUID;
  storyId: UUID;
  transitionSequence: DecimalString; // per-story, strictly increasing on commit
  atomicGroupId: UUID;
  source: {
    kind: 'finite-action-settled' | 'finite-action-interrupted';
    operationId: UUID;
    executionId: UUID;
    executionRevision: number;
    basePassageId: UUID;
    baseNarrativeRevision: number;
    receiptId: UUID | null;   // null for interruption, never fabricated
    executionEventId: UUID;
    consequenceOperationId: UUID | null;
  };
  authority: {
    sourceStoryRevision: number;
    inputPlanHash: SHA256;
    ruleVersion: string; codeBuildId: string;
    currentActorControlDigest: SHA256;
    effectEvaluationVersion: string;
  };
  game: {
    beforeGameSecond: number; afterGameSecond: number;
    beforeClock: CampaignClock;
    afterClock: CampaignClock;
    beforeClockAnchorAt: ISOTime;
    afterClockAnchorAt: ISOTime;
    beforeActiveActionOperationId: UUID | null;
    afterActiveActionOperationId: UUID | null;
    beforeHolds: CampaignHolds;
    afterHolds: CampaignHolds;
  };
  changed: readonly TypedChangedFieldV1[];
  subevents: readonly {
    withinCommitOrder: number;
    sourceKind: 'game-action-execution-event'|'game-action-receipt'
       |'world-obligation-event'|'outbox-notice';
    sourceId: string;
    gameSecond: number | null;
    proofHash: SHA256 | null;
  }[];
  integrity: { beforeDigest: SHA256; afterDigest: SHA256;
               codecId: string; coverage: 'complete-for-this-writer'|'partial' };
}>;
~~~

**Existing source wins:** exact type references are to *the source Zod/data contract versions* for `Character`/`StoryFacts`/`Clock`/`CampaignHolds` and accepted plan. `TypedChangedFieldV1` is a **closed discriminated union** over known changed fields for this one writer (character facts/quantities, storyFacts, clock/anchor, holds, activeAction, world conditions). It is not arbitrary `{ path, value: unknown }` JSON Patch that might be executed later as game logic.

**Only changed fields** are copied; unchanged fields are represented in the before/after state digest by the codec but not repeated in each row. For before/after root/source correctness, the group includes source references to the actual current story/campaign snapshot hash; no alias to current mutable row after commit is allowed.

**Source event order:** if the interrupt triggers a world obligation and new consequence, store actual recorded event IDs with stable ordinal. `outbox-notice` is **causal follow-up**, not a new game effect. If full subevent ordering wasn't captured before the SQL write, mark it partial; never reconstruct “this happened first” from different table insertion timestamps.

## 3. Per-story sequence correctness

Under **the same existing story row lock** (which serializes authoritative game writers), allocate the next committed evidence sequence from a small `story_evidence_cursor` row or a tested scalar source column. Use transactional `UPDATE ... RETURNING`; if the entire transaction rolls back, counter increment and evidence row roll back together.

**No sequence allocated for:** read-only snapshot; duplicate action replay returning original receipt; worker no-op; failed admission before mutation; provider budget reservation/attempt; Admin or visit ACK; speculative pending consequence prompt; outbox relay ACK.

**A sequence is allocated for:** settled/interrupted finite-action mechanic that changes source state, even if there is not yet a published passage. A later Storyteller publication gets a **separate** game frontier when it actually publishes passage/offer/root/continuity under story lock. The AI generation's intermediate provider stages are linked by G, not by fabricated game sequence numbers.

**Idempotency:** using `(storyId, operationId, executionRevision, settlementKind)` as part of forensic source identity may be useful, but the **existing underlying game-action receipt/event uniqueness** is the primary proof. A duplicate same-operation worker call must read original source and return with no new evidence/counter. Never key on wall timestamp or random “capture request ID” alone.

**Legacy enablement:** an old story with no `story_evidence_cursor` initializes an **instrumented-from frontier**, not a fictitious genesis. A pilot capture may include bounded before-state evidence without implying all prior clock/fact changes are known. The read layer must say `complete-for-this-writer` rather than `complete-historical-state`.

## 4. Hook locations and transactional boundaries

Code paths to inspect, **not implement until owner selects**:

~~~text
createCampaignActionExecutions(...).settle
  -> lockStoryById(tx, storyId)
  -> requireCampaign / active gameActionExecution
  -> determine action transition with actual admitted time/plan/effects
  -> settleActionExecution(tx, current, state, execution, ...)
       -> if waiting: return no new event/counter
       -> if interrupted: update execution/event/campaign, maybe world effects
       -> if settled: insert receipt, roll/result/effects, update campaign
       -> handle holds/source and enqueue follow-up
       -> **E0 strict delta and source refs for the whole commit**
  -> COMMIT source + evidence + outbox atomically
~~~

**Place the minimal capture assembler inside the already-owned application transaction** with source-authoritative before and calculated after values. The caller should not create another transaction or independently fetch “latest” after commit. Prefer a pure `projectTransitionEvidence(before, transitionResult)` that produces strict deterministic data with **no extra CAS read**.

Avoid two competing event sources: if `gameActionReceipt` already stores the original plan/outcome/roll, evidence references its ID + verified hash instead of reproducing all fields in another SQL JSONB. The E0 row holds the before/after **missing values**, not a full duplicate of receipt, task, scene and world.

**Hard limit:** bounded E0 data size and SQL statements, measured before a migration is Ready. Avoid full `Character`/`WorldConditions` deep snapshots on *every* wake if no change. Source projector may check a full in-memory hash without persisting the full copy.

## 5. What about stochastic inputs and deterministic replay?

A recorded `gameActionReceipt.roll` and `gameRoll` are essential. **Retain actual draw/result/modified score source**, not only a new RNG seed generated later. An accepted finite action may be interrupted with no roll/effects, which is also a meaningful source fact.

For future deterministic Chamber comparison, a fixture must include:
- historical before-state or a verified prior checkpoint and full typed delta prefix;
- original saved plan/version, character settings/time/rules, source root;
- actual RNG draws/check inputs from source receipt;
- external world obligations/events that controlled settlement;
- recorded result and authoritative after-state digest.

The *pure replay reader* should apply recorded changed values, not rerun `settleActionExecution`, randomInt or provider generation. A separate Chamber test can run a frozen old-rule comparator without touching live story.

## 6. Crash and concurrency proof matrix

| Injection | Expected source and evidence |
| --- | --- |
| Before business transaction | No new source/evidence |
| After writing receipt but before E0 insert | Rollback both; no “earned without evidence” |
| After E0 insert before commit | Rollback all, including counter |
| Commit succeeds, HTTP/Temporal ACK lost | Existing source and evidence returned; no new sequence, receipt or roll |
| Two workers settle same execution | One under story lock wins; second reads existing state and no new evidence |
| Required item holder changes mid-wait | One interrupted event, correct cause, **no successful receipt**, no transferred item |
| World obligation due at exact boundary | Obligation wins equality according to existing engine; no premature productive effects |
| Settled action creates pending Storyteller G | Mechanic committed; G and its later stages remain separate causal graph, same operation |
| Model succeeds but publication stale | No second game commit for a rejected candidate |
| E0 size/SQL failure | Entire new settlement rolls back; prior accepted execution remains, recovery uses same operation |
| CAS delayed 2 seconds in later context stage | Story lock is not stretched by the forensic writer and CAS remains off-lock |
| Provider disabled | Game evidence still complete for mechanic, model stages are truly not run |
| Legacy story no prior baseline | New writer may be captured with source proof, but whole historical replay is **partial** |

**No production test/paid call authorized here.** Disposable SQL, local Temporal, fault injection and exact evidence source assertions are required for any later Ready approval.

## 7. Scaling and rollout acceptance

Do not enable a new E0 contract globally until:
- source editor/DB/CAS audit confirms no alternate successful writer can modify the pilot's stated fields without its own evidence capture;
- extra p50/p95 SQL work, story-lock wait/hold and WAL/index bytes are measured under 1/10/100 concurrent stories with realistic source shapes;
- a 20-scene provider-disabled game produces the same actual game outcomes with instrumentation on/off, and authoritative state digest matches;
- a strict reconstruction reader can apply this **one writer's** committed deltas and display missing coverage for other writers, without false full-replay claim;
- a compatibility plan exists for migrations/reader codecs and source rollback, including pending/uncertain provider work.

**If it adds latency without enough missing information**, choose a narrower scoped before/after snapshot approach at selected boundary. Do not pursue event-sourcing elegance for its own sake. The purpose is **real production forensic value per byte and per DB lock millisecond**.

**Next code-bearing packet candidate:** OBS04 finite-action evidence pilot, after owner explicitly selects and approves this typed contract/measurement. This document alone is not Ready.
