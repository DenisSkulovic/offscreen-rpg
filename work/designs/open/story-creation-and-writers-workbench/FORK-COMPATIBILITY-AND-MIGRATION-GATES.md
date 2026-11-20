# Scene/fork V2 reconciliation, tests and migration gates

**Status:** actionable *research/acceptance plan*, not a selected Cursor Change, no provider dispatch, no production migrations. 2026-11-20. Read the [source audit](SCENE-COMMIT-AND-ACTIVE-WORK-AUDIT.md) and [Scene Commit V2](SCENE-COMMIT-AND-ACTIVE-WORK-DESIGN.md).

## Highest-priority source-level falsification tests

**S1: post-notes integrity.** Generate an admitted continuation with a new private continuity note, existing `[]` notes, no active mechanics, a staged document root and checkpoint. After publication read the checkpoint and the story's live continuity projection. A true **post-scene checkpoint** must contain or reference the newly admitted note and its evidence. V1 code appears to capture pre-notes; make a focused executable regression test before changing order. Moving a function call alone may break `lockedCheckpointMatches`: instead project the complete result and validate it.

**S2: historical blockers.** Insert an otherwise quiescent story with a `world_obligation` in `fired` state or a completed `game_activity` row, then attempt checkpoint staging. Inspect whether `checkpointIsBlocked` returns undefined merely because the row exists. Repeat with an actual pending obligation. This separates obsolete historical record presence from genuinely nonportable active work. Do not delete event history to make the test green.

**S3: generated choice after fork.** Publish a Storyteller-generated opening with an interaction, create a supported fork of its checkpoint, and attempt to admit the inherited choice. Confirm the currently cleared `sourceGenerationId` is insufficient for the admission path; then test the proposed immutable intent capsule under a new branch-owned operation. No repeat paid generation.

**S4: old creative profile.** Create two passages and change the live Storyteller/profile configuration *through an authorized test path* between them. Read historical scene 1 and fork it. Assert creative view is sourced from scene 1's pinned guidance while current budget/permission is newly authorized. If the current system does not support profile mutation, construct a controlled test fixture to demonstrate the potential drift rather than claiming a currently supported UX fails.

**S5: committed passage versus later state event.** At scene 37 publish an accepted finite action; then commit a progress/obligation transition with no new passage; then create scene 38. A scene-37 review/fork must use the state frontier captured at scene 37 publication, not the newer live row, even if it is read after the intervening event.

## Fork-state acceptance cases

| Scenario | Required V2 behavior | V1 status / gate |
| --- | --- | --- |
| Quiescent checkpoint with item holder and story fact | Correct historical item/fact plus rooted Library; same-ID retry idempotent | Partial V1 support; keep green |
| Generated opening with visible narrative choice | Fork has new interaction identity and admissible original intention under current branch state | Requires ChoiceCapsule or equivalent; no known E2E proof |
| Waiting accepted activity at 35% progress | Preserve semantic progress and remaining fictional duration, rehome under new executor identity | V1 unsupported; define precise plan/clock semantics |
| Pending world obligation with due-game-time | Remap causation ID, preserve trigger/firing evidence, schedule only branch-owned wake | V1 unsupported; don't clone parent worker |
| Held action pending provider response | Fork either explicitly unsupported or rehome a **safe settled intent** under an authorized new operation | Never clone unsettled provider attempt or spending identity |
| Decision countdown with 12s remaining at checkpoint | Explicit remaining-window reanchor or unsupported, no inherited parent absolute dueAt | Policy decision still open |
| Content-only scene with no mechanical campaign | Historical Library and choice are coherent, no fake humanoid body | V1 absent-mechanics checkpoint supported in some openings |
| Parent future reveals a secret, child branches earlier | Child lacks future secret in Library, search index and private direction | Reuse immutable historical root, root-scoped retrieval |
| Historical scene had different Storyteller profile | Recover historical creative guidance and exact captured skill/prompt pins | Current historic summary reads live row; future-change risk |
| Old scene has no checkpoint | Review passage where possible, fork unavailable with explicit reason | Never synthesize from current SQL |
| Same fork request twice after lost HTTP response | Same child story/lineage/state, no duplicate obligations, cost or effects | Existing idempotency pattern, expand tests |

## Migration sequence: preserve historical evidence

**Gate 0: owner contract reconciliation.** Explicitly agree on meaning of scene boundary, accepted post-state, forkable active-work categories, time/arrival, choice capsules and source pin authority across `docs/product` and `docs/technical`. These design notes aren't accepted canonical documentation yet.

**Gate 1: executable source correctness.** Add provider-free disposable-DB tests S1–S4 (initially capturing current limitations) and classify nonforkable reasons. Reuse v1 selectors unchanged. Don't label an unsupported v1 activity as a regression merely because the target is broader.

**Gate 2: versioned scene reader/provenance.** Add a typed v2 **read** model and immutable source/choice references, while retaining v1 reader unchanged. Prove v1 historical hashes/read/fork are identical on existing fixtures. Do not backfill invented historic state for missing checkpoints.

**Gate 3: shareable Library index.** Evaluate path-ordered B+/radix implementations with insertion, batch update, deletion, prefix listing, deterministic hash, corruption and 1,000+ histories. Introduce a v2 branch-neutral root behind adapters only when benchmark results justify selection. Migrate an existing v1 **current head** through an explicit root-adoption fence. The immutable v1 chain/checkpoints remain readable; don't rewrite old bytes or convert each old scene automatically.

**Gate 4: coherent v2 publication.** Build a pure post-publication state projection and atomically select scene/root/state/choice/pins; test new continuity notes in the checkpoint, publication races, crash after CAS objects but before SQL, and retry after SQL success. Can begin for quiescent cases before active-state support, but don't advertise universal forks yet.

**Gate 5: rehome one active-work family.** Start with the simplest deterministic future obligation or finite duration *only if* it has pure, bounded remapping semantics. Add schema/worker outbox admission in a new branch namespace; prove no parent timer/gen/receipt crosses. Add subsequent categories separately; failure stays explicit per state. Do not start with the hardest suspended activity and 15 kinds of holds.

**Gate 6: full workflow UX and public claims.** Only after supported fork categories work and recovery tests pass, expose accurate `reviewable` and `forkable` states per scene; make playable generated choices operate after fork, ensure original account policy/budget is not copied, and update product documentation and UI. “Every scene forkable” remains the selected *target*, not a current guarantee.

## Rollout hazards

- A `manifest.v2` reader must preserve v1 object hashes, not recalculate or silently reserialize history under new code.
- A legacy scene source may contain a `campaignId`-bound v1 manifest; v2 branch-neutral tree can share document objects but must retain legacy source-provenance mapping. Retain original document IDs even if their historical IDs were minted under an ancestor campaign ID; fork owner determines authorization, not UUID prefix.
- Do not create one SQL row *per snapshot file*. Object store persists immutable content and Merkle nodes; SQL selects authoritative roots, event frontiers and branch identity.
- Avoid a global mutable `latest` search index; both private and public search must include historical root and visibility fence.
- Do not put a parent scene-commit hash inside a document whose object hash participates in that same commit root. Keep causation/provenance metadata acyclic and separate.
- Parent account financial terms and model provider execution are not replayable historical world state. Fresh branch permission/budget policy is required.
- Creating 100 branch roots must not scale with 100 × number of Library documents; state remapping might have its own cost and must be benchmarked separately.
- Don't quietly bind a new root to a checkpoint containing old notes, or mark a copied interaction as playable without the intent needed to resolve it.

## Decision gates still open

| Decision | Working preference | Blocking evidence |
| --- | --- | --- |
| Scene as-of moment | Post-publication atomic state frontier | Active events versus passage ordering |
| Initial v2 checkpoint data | Exact complete semantic state; choose physical representation by measured size | Full-state payload growth and active-work capture schema |
| Choice persistence | Immutable admitted ChoiceCapsule with branch-local alias | Need source-generation-independent resolver design |
| Active-work policy | Rehome one safe family at a time, refuse unknown | Pure ID/deadline/clock mappings and causation proof |
| Reusable Library index | Branch-neutral bounded-fanout persistent map | Real mixed-write/GC fault benchmarks |
| Historical profile | Pin original creative source; reauthorize branch's new spend policy | Exact profile precedence/format remains unresolved |
| First scene | Publication must not automatically schedule unrequested activity; prepared preset may have an explicit admitted start plan | Time/arrival and consent semantics |

**Suggested next investigation:** write the typed **ChoiceCapsule and CompletePostState** contracts, and prototype a single *provider-free* scene-boundary projection against one existing continuation test. That is a bounded route toward executable changes without waiting for the entire perfect Git-like Library.
