# ENG03 decision | instrument first; conditional bounded short-lock capture V1

**Status: measured proceed-narrow decision, typed first-path capture chosen (2026-11-14).** Existing [instrument-first decision](eng03-instrument-before-refactor.md) remains the starting authority. **Do not** mark the full ENG03 rewrite Ready based on intuition: new remote CAS reads under `FOR UPDATE` are a risk to *measure*, not proof of the production bottleneck. Diagnostic code Change: [ENG03-M](../../changes/2026-11-13--eng03-lock-measurement/CHANGE.md); existing larger [ENG03](../../changes/2026-11-13--eng-short-lock-context/CHANGE.md) remains a conditional follow-up. No production DB/provider/cloud work authorized.

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

## B. Narrow source-capture contract (chosen first path, implementation pending)

**ENG03-M result:** 0ms median lock hold 53.8ms and same-story contender wait 51.3ms; at 2000ms CAS delay, hold 8072.1ms and wait 8072.0ms. The decision is **proceed-narrow-eng03-capture**, not approval of the full ENG03 rewrite. [Raw evidence](../evidence/eng03-lock-measurement-2026-11-14.md).

The former conditional TypeScript sketch with untyped field groups has been **superseded** by the authoritative [ENG03-narrow ContextCaptureV1 Zod/schema, physical source map, three-stage lifecycle and settlement race matrix](eng03-narrow-capture-v1.md). That document binds every first-path group to verified existing types or declares an explicit omission, including passage CAS/inline, active-scene anchor and recall cues, actor/facts/items/conditions/commitments, offer authorization, clock, frozen settings/profile/execution/usage, selected action and acceptedPendingResult.

**Selected implementation architecture:** one reserved generation ID G, initially a non-dispatchable capture placeholder; an additive typed capture row; existing story_resolution and accepted-action linkage; immutable CAS materialization using the existing campaignConsequence outbox/workflow outside story lock; atomic promotion of G to one valid storytellerTaskSchema task; existing Storyteller execution and short locked publication. Settlement always references G, whether it wins the race before or after materialization. Never construct a second speculative controlling generation or automatically issue a second paid attempt after a confirmed/uncertain send.

**Scoped handoff:** [ENG03-narrow single-Change Cursor packet](../../changes/2026-11-14--eng03-narrow-pending-capture/CHANGE.md). **Only purpose pending-consequence**, no reroll/game-rule/Temporal redesign or cloud cutover. Historical/full tasks require no migration or new task union. The full [ENG03](../../changes/2026-11-13--eng-short-lock-context/CHANGE.md) remains Proposed.

## C. What measurements and design can authorize

**ENG03-M is Done (2026-11-14)** on disposable PostgreSQL and delayed local DocumentStore, provider-free. It supports a **narrow** first-path materialization Change, not wholesale rewiring.

**Design complete for owner selection:** [ENG03-narrow Change](../../changes/2026-11-14--eng03-narrow-pending-capture/CHANGE.md) with strict [typed capture contract](eng03-narrow-capture-v1.md). Mark Ready only with explicit owner selection and reinspection of the **latest** code checkout. The GitHub main inspected for this packet still shows storyteller.v16 while the owner's subsequent SA handoff reports v17. That mismatch is a real preflight gate, not permission for Cursor to guess.

**Still Not Ready:** the full ENG03 architecture move, non-pending paths, cloud/provider authorization, second saga/bus/Temporal migration, new game rules, destructive data migration, historical backfill or automatic paid retries. If focused integration evidence reveals an unmodeled source or an unsafe interruption race, stop and return a named failing case rather than silently broadening implementation.
