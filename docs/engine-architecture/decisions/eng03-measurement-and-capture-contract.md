# ENG03 decision | instrument first; conditional bounded short-lock capture V1

**Status: selected measurement design, conditional capture target (2026-11-13).** Existing [instrument-first decision](eng03-instrument-before-refactor.md) remains the starting authority. **Do not** mark the full ENG03 rewrite Ready based on intuition: new remote CAS reads under `FOR UPDATE` are a risk to *measure*, not proof of the production bottleneck. Diagnostic code Change: [ENG03-M](../../changes/2026-11-13--eng03-lock-measurement/CHANGE.md); existing larger [ENG03](../../changes/2026-11-13--eng-short-lock-context/CHANGE.md) remains a conditional follow-up. No production DB/provider/cloud work authorized.

## A. Measurement design is fully chosen

**Path:** `packages/application/src/campaign/actions.ts` calls `preparePendingActionNarration` within `lockOwnedStory` transaction. `packages/application/src/storyteller/context.ts::loadStorytellerContext` reads passage rows, relevant mutable campaign/settings/item/activity state, and immutable documents via `loadCanonicalKnowledge`. Need to differentiate SQL lock acquisition, source materialization and provider execution (which should not be in the transaction). ENG05's local S3-compatible adapter is available for disposable tests; do not cut over production.

**Instrument four spans** with monotonic timestamps and a trace/operation ID (only durations and opaque IDs, no narrative bodies, tokens or secrets):
1. `storyLockAcquiredAt` → transaction COMMIT/rollback; total `FOR UPDATE` story write lock hold;
2. inside same tx, `loadStorytellerContext` start/end plus **DocumentStore** calls only, to separate I/O wait from SQL reads;
3. concurrent legitimate writer's attempt → actual `FOR UPDATE` acquire; distinguish **DB lock wait** from business conflict after acquire;
4. unrelated authorized read time (baseline) so row-level locks aren't falsely blamed for unrelated slow path.

**Test matrix:** one same-story admitted eligible action through `preparePendingActionNarration` with injected read delay **0ms, 250ms, 2000ms** at immutable DocumentStore retrieval; 5 repeated trials per delay after warm-up; normal short source and ~40-passage active-scene source. Run a conflicting authorized writer only when source state makes it a real write-lock competitor; expect eventual business conflict if the offer is consumed. A separate unrelated story writer is a control, not a substitute for testing same-story lock contention. Capture local machine, DB adapter, local/mock-S3 mode, pool size and test scheduling; do **not** call a paid Storyteller.

**Fault matrix:** required source missing, CAS temporarily unavailable, oversized context, and preparatory provider failure simulated before dispatch. The current accepted game action should not be silently committed when its admission preparation failed; already committed mechanics later in the pipeline must be preserved. Record exact rollback/hold behavior.

**Decision rule:** A full ENG03 capture refactor is warranted for this path if injected 2000ms I/O increases median story-lock hold by at least **1500ms**, and a legitimate same-story writer shows measurable lock waiting correlated with that interval (e.g. >1000ms above 0ms baseline). The 250ms case should establish proportionality; 150ms+ lock delta is corroborating evidence. These are **diagnostic ratios** (75% propagation), not a production p95 SLO. If real measured latencies are negligible with local CAS but the injected risk is clear, document deployment cutover dependency, compare lower-complexity alternatives, and prefer one bounded path before expansion. If lock cost doesn't propagate or no genuine writer waits, **do not** rewrite the pipeline merely to match a diagram. Negative cases and measurements must be included with the actual go/no-go call.

Do not conflate a second **legitimately rejected action** with a database failure. Only the time spent awaiting the lock is at issue.

## B. Conditional source-capture contract (target, not present code)

If A supports proceeding, reuse existing `campaignConsequence` / `storyResolution` / generation-outbox mechanisms rather than creating a second general workflow coordinator. An immutable **`ContextCaptureV1`** provides the exact source frontier for one narration purpose.

**Required fields, separated by authority:**

~~~ts
type ContextCaptureV1 = {
  version: 1;
  captureId: UUID;                 // immutable preparation intent
  storyId: UUID;
  ownerId: string;                 // authorization scope (not client-provided)
  purpose: 'pending-consequence';  // selected first path ONLY
  operationId: UUID;               // accepted finite action
  passageId: UUID;
  narrativeRevision: number;       // exact published source frontier
  root: { hash: Sha256 | null; revision: number };
  sourcePassages: readonly {
    passageId: UUID;
    sequence: number;
    contentHash: Sha256 | null;    // immutable CAS identity if external
    // Local inline content must be immutable/version-fenced at captured ID.
  }[];
  activeSceneScope: unknown;       // validated frozen scope/cues, bounded
  actorAndWorld: {
    character: unknown;           // captured already accepted actor envelope
    storyFacts: unknown;
    itemHolders: unknown;         // only needed known player-visible/item-dependent facts
    worldConditions: unknown;
    commitments: unknown;         // bounded active nonterminal context, not all history
    offerAndAuthorization: unknown;
    clock: { gameSecond: number; targetGameSecond: number };
  };
  settings: {
    revision: number;
    capturedSettings: unknown;    // immutable campaign_settings row data
    profile: unknown;
    execution: unknown;
    effectiveUsagePolicy: unknown;// exact accepted funding/recipe envelope
  };
  selected: { id: UUID; label: string; intention: string };
  acceptedPendingResult: unknown;  // frozen v1 pending resolution and source/projected digests
  capturedAt: string;             // trace only; not canonical story time
};
~~~

**Exact physical fields and validation:** this is a **minimal semantic contract**, not permission to persist `unknown` blobs as-is. Cursor must map each `unknown` group to existing Zod types and exact source symbol at the measured path when converting ENG03 to formal Ready. Mutable SQL values that affect model context must be **copied/frozen under lock**, not represented by mutable row IDs later re-read. Immutable CAS sources can be referenced by hash; passage IDs + sequence require immutability/capture verification. A small bounded serialized capture must not become a dump of all history. Remove unsupported fields only with explicit source audit proof; do not infer missing actor categories or build a universal ECS.

**Stage 1: short lock/capture.** Under existing story lock, establish same command admission and idempotency; freeze exact source references and mutable context/usage values; durably record a deterministic preparation intent/outbox keyed by accepted operation. Commit without external DocumentStore I/O. Any necessary story hold is recorded in same transaction so no fiction continues between capture and preparation.

**Stage 2: off-lock materialize.** Read CAS by captured hash and passage frontier, verify source bytes/schema and required evidence selections; assemble bounded ContextInput and final provider request exactly once (hash/digest). Save its identity and effective cost authority, then dispatch through existing Storyteller generation mechanism. No long PostgreSQL transaction, no reading mutable `campaign` rows for current facts after capture. Missing/corrupt CAS or over-budget results in typed held/blocked preparation and no fallback invented prose. An unsent intent may retry its immutable materialization under bounded worker policy; a dispatched paid attempt follows existing uncertainty rules.

**Stage 3: short lock/publication.** Recheck task purpose, story/owner, unchanged controlling narrative/source identity, canonical root hash/revision, correct accepted operation/receipt, projected state digest and current eligibility to publish. A changed current scene/root means **stale** controlling draft, not forced merge or fresh auto-paid regeneration. The existing publication CAS and `storyResolution` uniqueness are authoritative. A historical/report task is not automatically treated like current control; it may publish an appropriately source-bound report independently (separate later scope).

**Speculation settles before draft:** if accepted finite mechanics settle while a speculative narration capture/materialization is pending, its source-bound pending draft cannot become an unearned result. For the first path, retain one eligible generation/admission identity across settlement, then either (a) publish it if final exact receipt/projected state still match or (b) mark it ineligible and enqueue the **existing** post-settlement consequence under its own correct idempotency/cost policy, but **never two competing controlling `storyResolution` rows** on one base revision and never an automatic second paid attempt after confirmed spend. This race requires explicit provider-free test before a full refactor is authorized.

**Old task compatibility:** `storytellerTaskSchema` tasks admitted before this work remain decodable/publishable with original `task` format and source/attempt identity. Add a versioned capture-intent union only if new persistence actually requires it; no destructive migration/backfill. An already sent, failed or uncertain old attempt is not moved to a new task solely because a worker restarted. Bounded task de-duplication must cover repeated outbox delivery.

## C. What measurements can authorize

**Ready for owner authorization today:** ONLY [ENG03-M](../../changes/2026-11-13--eng03-lock-measurement/CHANGE.md), provider-free instrumentation and disposable SQL/local object-store verification.

**Not yet Ready:** wholesale short-lock capture/admission/publication rewiring. To close its readiness, attach measured lock/contender traces, pick first source path, replace `unknown` groups above with exact existing schemas, demonstrate task/old-worker migration and settle one-generation speculative race in tests. If the measured evidence justifies only a simpler source-prefetch/revalidation improvement, prefer that narrower Change and park full ENG03.

**Not included:** generic saga/bus rewrite, cloud bucket cutover, worker deployment/versioning, game-rule changes, model provider calls, unbounded history fetch, free retries, raw private text logging or fake continuation after missing source.
