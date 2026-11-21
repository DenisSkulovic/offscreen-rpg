# CQ04 | enforce complete document-store capabilities before checkpoint/fork operations

**State:** Ready for owner commission when WR06/fork owner is not concurrently editing the same source. **Kind:** implementation, runtime trust-boundary correctness. **Priority:** P1. **Branch:** `change/cq04-document-store-capability-guards`; **target:** `undertaking/storyteller-workshop`. Can run with CQ01/CQ03 but land **before WR06** if WR06 later changes fork semantics.

**Baseline:** Static inspection of `undertaking/storyteller-workshop` at `c13d64ee450ad6b2b1da75dddf0a3de8331efa1a` (2026-11-21). New source/doc planning landed later; no code has been run by ChatGPT. Before implementation, confirm names and neighboring active work in the *dedicated linked worktree*. No unrelated changes or speculative style rewrite.

**Git:** Branch from actual `undertaking/storyteller-workshop` HEAD into this Change's own linked worktree; do not switch user's primary checkout. Parent dispatches small ready T-IDs and owns focused proof, closure and integration via the named custodian. Never auto-commission siblings or spend paid provider budget.

**Observed:** `packages/application/src/stories/scene-checkpoint.ts:checkpointWriterStore(store: object)` returns `store as SceneCheckpointWriterStore` after checking only `putSceneCheckpoint`, `readSceneCheckpoint`, `readManifest`, although the declared `SceneCheckpointStore` also requires `readStructuredDocument` and `readLibraryRoot`. `forks.ts:forkDocumentStore` uses further `as ForkStore` checks and returns an asserted value. Malformed injected adapters can pass a partial check and fail with a runtime TypeError later instead of a controlled unavailable/refusal. Static inspection, not observed exploit.

**Selected fix:** A single complete runtime method-capability type guard at the existing scene-checkpoint adapter boundary, reused by fork guard, checking **all required methods** before narrowing. No opaque dynamic proxy, automatic fallback store or unsafe widening. Preserve `DocumentStore | object` compatibility and existing output/errors; missing capability must be refused **before any store read/write** and before publication/fork mutation. Do not alter checkpoint hashing, source ownership, v1/v2 fork behavior or SQL transaction choreography.

**Proof:** provider-free pure guard negative tests plus existing fork/checkpoint/Library-v2 tests (disposable SQL only when authorized); no late TypeError, no wrong-story read, no silent missing canon. ## Planned-impact.v1 (before implementation)

| Owner | Disposition |
| --- | --- |
| Product | No gameplay or fork semantics change. |
| Technical | Existing document-store/scene-checkpoint contract maintained, enforcement stronger for incomplete ports. |
| Code and tests | Checkpoint capability guard, fork adapter check and normal/negative tests. |
| Related status, maps and evidence | Story source map update if needed; actual historical-fork SQL proof recorded. |

This is **planning**, not the post-implementation affected-claim closure ledger. The parent records actual outcomes and NOT RUN gaps at acceptance.

[Source](SOURCE-MAP.md) · [Execution](EXECUTION.md) · [Proof](PROOF.md) · [Tasks](TASKS.md).
