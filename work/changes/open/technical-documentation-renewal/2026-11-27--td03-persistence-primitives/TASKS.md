# TD03 | task queue

Base `a28693dcefe80a3242a870ed03a6c144b47f1ac7`; state READY; owner-authorized for named dispatch; selected task none. All T-IDs independent construction with disjoint exact paths; maximum two isolated workers at once or serial if isolation unavailable. Parent-only staging and final proof. Group target join lock. No sibling/shared files.

## T01 | Durable authority and record families | PROPOSED

DEPTH=PATCH; type DOCUMENT.

Requires: commission, verified branch/ownership, group transfer contract. No sibling task prerequisite.

May write: `docs/technical/platform/data-and-persistence.md`. Must not write: any unlisted owner, source, config, protected contract or shared index.

Read: `docs/technical/platform/data-and-persistence.md`; `packages/db/src/database.ts#createDatabase`; `packages/story-engine/src/stories/scene-checkpoint-v2.ts#assertV2PostStateMatches`; `packages/documents/src/scene-checkpoint-schema.ts`.

Algorithm: Lead with SQL authoritative admission and exact committed root/frontier; PostgreSQL package ownership points to protected database owner. Under Durable records retain all ten Implemented subsections and their exact headings as legacy realization reference, rewrite prose to remove historical completion sequence while retaining IDs, state, version, unique/revision and transaction conditions. Planned story records remains proposal. Put binding invariants in Who owns the durable record, Publication fence, Story isolation and Changes/retention; v1/v2 checkpoint, identity remaps, mutable field inventory, interaction contract and immutable payload compatibility cannot be discarded. Profiled storage and Proposed service schemas stay separate, no new cross-store atomicity. Keep source routes for actual record readers and dated proof. M04: source createDatabase does not qualify every domain transaction.

Keep existing heading anchors and correct links; rewrite the controlling prose, not just add a warning. Preserve unique conditions, counterexamples, compatibility and exact proof provenance. No new architecture or permission; no runtime edits, tests, live operations or paid calls.

Test: source/diff semantic gate only; parent runs PROOF once. Negative: Dropping a legacy format is authorized; prose or cache can mutate possession; staged object upload is itself publication.

Stop: material contradiction, drift of authority, unique fact lacking successor, active writer, or need for new policy. Receipt: exact headings, source routes, preserved claims/limitations, negative answer, diff and unresolved finding destination.

## T02 | Cache and independently useful storage | PROPOSED

DEPTH=PATCH; type DOCUMENT.

Requires: commission, verified branch/ownership, group transfer contract. No sibling task prerequisite.

May write: `docs/technical/platform/persistence-and-caching.md`. Must not write: any unlisted owner, source, config, protected contract or shared index.

Read: `docs/technical/platform/persistence-and-caching.md`; `packages/cache/src/cache-adapter.ts#createCacheAdapter`; `packages/cache/src/tiered-store.ts#createTieredStore`; `packages/documents/src/library-trie.ts#createLibraryTrieEdit`; `packages/documents/src/s3-store.ts#S3DocumentStore`.

Algorithm: Keep Read models, Redis boundary and Identity/consistency/freshness as invariant-first. Split source-existence and proof tiers in Current state: actual adapter and tiered store, memory/Redis tests as exact existing evidence, native Redis owner protected, no new live proof. Preserve cache authorization-before-lookup, observed identity, absolute expiry on promotion, single-flight cancellation, origin bulkhead, optional bypass, distributed lease not business lock and no cached permission. Distinguish independent immutable document trie and S3 storage candidates from experimental story projection. Preserve release/live restart gaps; remove obsolete current claims about native installation only if verified, otherwise label prior implementation as dated.

Keep existing heading anchors and correct links; rewrite the controlling prose, not just add a warning. Preserve unique conditions, counterexamples, compatibility and exact proof provenance. No new architecture or permission; no runtime edits, tests, live operations or paid calls.

Test: source/diff semantic gate only; parent runs PROOF once. Negative: Cache loss changes authority; Redis lease owns a financial operation; fixture PASS certifies cross-Pod restart.

Stop: material contradiction, drift of authority, unique fact lacking successor, active writer, or need for new policy. Receipt: exact headings, source routes, preserved claims/limitations, negative answer, diff and unresolved finding destination.

## T03 | Execution and delivery boundaries | PROPOSED

DEPTH=PATCH; type DOCUMENT.

Requires: commission, verified branch/ownership, group transfer contract. No sibling task prerequisite.

May write: `docs/technical/platform/execution-and-delivery.md`. Must not write: any unlisted owner, source, config, protected contract or shared index.

Read: `docs/technical/platform/execution-and-delivery.md`; `apps/worker/src/activities/index.ts#createWorkerActivities`; `apps/game-authority/src/launch-put.ts#createLaunchPutService`; `docs/technical/engine/chronology-and-activities.md#decisions-with-deadlines`.

Algorithm: Separate selected durable execution contract from local proof. Worker lifecycle safety OPS12 injected fake, Implemented opening/fixed interval/solo response deadline become dated realization under existing headings; retain exact receipt/replay conditions and not-run distinctions. Keep Elapsed time and Game-time targets as selected time authority, no provider/wall-clock inference. Consolidate Commands and durable delivery and Commands/business events/workflows around admitted command, transaction/outbox, idempotent delivery and recorded outcome; keep identity/revision, competing deadline and retry/recovery fences, uncertain external effect cannot resend. Laboratory broker is a scoped lab capability not authoritative game history. No edits to active native Temporal or messaging owner.

Keep existing heading anchors and correct links; rewrite the controlling prose, not just add a warning. Preserve unique conditions, counterexamples, compatibility and exact proof provenance. No new architecture or permission; no runtime edits, tests, live operations or paid calls.

Test: source/diff semantic gate only; parent runs PROOF once. Negative: Temporal timer commits gameplay; a retry doubles effect; lab broker proves durable game turn.

Stop: material contradiction, drift of authority, unique fact lacking successor, active writer, or need for new policy. Receipt: exact headings, source routes, preserved claims/limitations, negative answer, diff and unresolved finding destination.
