# CQ04 | enforce complete document-store capabilities before checkpoint/fork operations

**State:** Done (2026-11-21). Incomplete document ports are refused before object IO. Integrated onto `undertaking/storyteller-workshop`. **Kind:** implementation, runtime trust-boundary correctness. **Priority:** P1. **Branch:** `change/cq04-document-store-capability-guards`; **target:** `undertaking/storyteller-workshop`. Landed while WR06 was not editing these files.

**Baseline:** Static inspection of `undertaking/storyteller-workshop` at `c13d64ee450ad6b2b1da75dddf0a3de8331efa1a` (2026-11-21). New source/doc planning landed later; no code has been run by ChatGPT. Before implementation, confirm names and neighboring active work in the *dedicated linked worktree*. No unrelated changes or speculative style rewrite.

**Git:** Branch from actual `undertaking/storyteller-workshop` HEAD into this Change's own linked worktree; do not switch user's primary checkout. Parent dispatches small ready T-IDs and owns focused proof, closure and integration via the named custodian. Never auto-commission siblings or spend paid provider budget.

**Observed:** `packages/application/src/stories/scene-checkpoint.ts:checkpointWriterStore(store: object)` returns `store as SceneCheckpointWriterStore` after checking only `putSceneCheckpoint`, `readSceneCheckpoint`, `readManifest`, although the declared `SceneCheckpointStore` also requires `readStructuredDocument` and `readLibraryRoot`. `forks.ts:forkDocumentStore` uses further `as ForkStore` checks and returns an asserted value. Malformed injected adapters can pass a partial check and fail with a runtime TypeError later instead of a controlled unavailable/refusal. Static inspection, not observed exploit.

**Selected fix:** A single complete runtime method-capability type guard at the existing scene-checkpoint adapter boundary, reused by fork guard, checking **all required methods** before narrowing. No opaque dynamic proxy, automatic fallback store or unsafe widening. Preserve `DocumentStore | object` compatibility and existing output/errors; missing capability must be refused **before any store read/write** and before publication/fork mutation. Do not alter checkpoint hashing, source ownership, v1/v2 fork behavior or SQL transaction choreography.

**Proof:** provider-free pure guard negative tests plus existing fork/checkpoint/Library-v2 tests (disposable SQL only when authorized); no late TypeError, no wrong-story read, no silent missing canon.

## Planned specification and implementation delta

planned-impact.v1 before implementation.

| Owner | Disposition |
| --- | --- |
| Product | unchanged because no gameplay or fork semantics change |
| Technical | unchanged because the document-store and scene-checkpoint contract stays the same while incomplete ports are refused |
| Code and tests | changed: packages/application/src/stories/scene-checkpoint.ts and packages/application/src/stories/forks.ts gain the capability guard; the negative case rejects a missing method before object IO |
| Related status, maps and evidence | changed: packages/application/src/stories/README.md names the capability guard and the historical-fork SQL proof is recorded |

This is **planning**, not the post-implementation affected-claim closure ledger. The ledger below records the implementation inspection.

## Reconciliation ledger

exception: work/changes/README.md because the catalog only moves this finished packet out of the open list.
exception: work/changes/ledger/2026-11.md because the ledger only records this finished packet.
exception: work/changes/archive/2026-11/README.md because the archive index only adds this finished packet.

| Affected selected claim/heading | Authority | Target delta (changed/unchanged; reason) | Source delta & inspected SHA | Status/evidence tier | Negative proof | Map/link update or N/A |
| --- | --- | --- | --- | --- | --- | --- |
| Selected document store | docs/technical/platform/data-and-persistence.md#selected-document-store | unchanged: canonical JSON, SHA-256 identity, and typed store errors stay the same; this Change only refuses an incomplete caller-supplied method port | packages/application/src/stories/scene-checkpoint.ts; packages/application/test/document-store-capability-guard.test.mjs; 8531e44d15edbafa8397344c8d81b384d214ef1e | fixture-tested | a port missing readStructuredDocument or readLibraryRoot, or with a non-function putSceneCheckpoint, returns no writer and performs no object IO | story source map names checkpointWriterStore and forkDocumentStore |
| Historical fork publication | packages/application/src/stories/forks.ts | unchanged: v1 and v2 fork roots, hashing, and SQL lock timing stay the same; putManifest is now required with the checkpoint methods before a checkpointed fork writes | packages/application/src/stories/forks.ts; packages/application/test/historical-fork.test.mjs; packages/application/test/library-v2-fork.test.mjs; 8531e44d15edbafa8397344c8d81b384d214ef1e | fixture-tested | a checkpointed fork whose adapter omits putManifest throws StoryError unavailable/document_store and creates no fork story | packages/application/src/stories/README.md#source-responsibilities |
| Product fork behavior | docs/product/foundations/vision.md#scene-history-and-alternate-continuities | unchanged: the selected historical-fork promise is the same; this Change does not alter a complete store's fork result | packages/application/test/historical-fork.test.mjs; packages/application/test/library-v2-fork.test.mjs; 8531e44d15edbafa8397344c8d81b384d214ef1e | fixture-tested | a complete LocalDocumentStore still forks the scene-1 checkpoint and shares a v2 library root | N/A |

[Source](SOURCE-MAP.md) · [Execution](EXECUTION.md) · [Proof](PROOF.md) · [Tasks](TASKS.md).
