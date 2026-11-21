# WR05 | decided execution design (planner-owned)
**Depends on WR02 and WR03 being integrated.** The legacy `offscreen.scene-checkpoint.v1` and SQL v1 selectors remain readable with original hashes.

## V2 state contract
Define `offscreen.scene-commit.v2` immutable object holding {passageObjectHash, libraryRootHash, stateRootHash, stateFrontier, pins, choicesHash, causalOperationId}. Define `offscreen.world-state.v2` typed immutable semantic snapshot for **as-of** time with exact facts/resources/clock, note roots, activities, offered decisions, accepted plans/progress/holds/deadlines, obligations, visibility and appropriate causation. No operational money, provider attempt, worker lease or Temporal execution ID in semantic state. Start with a bounded canonical serialized snapshot **only if actual corpus stays within 1 MiB**; if not, apply the already selected WR02 persistent trie/copy-on-write state index, not silent truncation. Distinguish semantic in-game remaining duration from wall clock. For every supported active semantic class, require a schema field and exact parser; no generic JSON fallback that allows omitted active state to look quiescent.

## Publication transaction, in order
1. Capture expected story revision, document root/version, state frontier/control revision, operation/attempt identity and allowed source/profile pins before composing.
2. GA validates a WR03 final proposal and permitted mechanics; **purely project** accepted after-effects, notes, story facts, world obligations, offers, active progress and choices into one complete candidate post-state. A private idea is not an admitted fact.
3. Stage immutable passage, accepted notes/docs, world-state and scene-commit CAS objects; verify all referenced hashes exist, shapes and root membership. Staging makes no scene visible.
4. Under `lockOwnedStory` transaction: re-check owner, expected story/root/frontier/operation, verify existing exact receipt on retry, select document root, insert passage+mechanical projections+one versioned scene selector atomically; enqueue required derived/index/scheduling work using operation identity. No S3/SQL two-phase fantasy: unselected CAS bytes are inert.
5. Return **selected** scene only. Lost ACK/HTTP rereads by same operation ID; wrong/stale inputs get conflict, no second effects/provider spend. No uncontrolled start-time interval; clock advances only via admitted fictional work.

## Migration and collision
Update `sceneCheckpointSchema` with versioned discriminated v1/v2 readers and `storySceneCheckpoint` SQL state version check so v1 rows stay valid. Do NOT mutate v1 checkpoint bytes or fabricate v2 for every old scene. Replace current `stageSupportedContinuationCheckpoint` quiescent early-return only when complete v2 state can be staged. Ensure `publishStorytellerNotes` is applied to projected candidate **before** hash/selector, not as a later mutable side effect. Distinguish passage row content hash from scene/state root. Serialize GA writer and migration against TURN03/DIST03.

## Edit order
1. Typed v2 semantic state and scene commit schemas, pure projection fixtures (including all active state classes).
2. CAS storage and versioned SQL selector/migration/read adapters.
3. Complete projection of notes/choices/active commitments and deterministic staging.
4. GA locked selector and idempotent receipt, negative crash/fence tests.
5. Integration with Storyteller publish and timed/activity transitions, historical reader tests.

**Hard stop:** missing semantic class, oversized state requiring unplanned indexing, post-commit note mutation, or unproven lock/transaction ownership. Such counterexamples go to ChatGPT, **not** a Cursor architectural expedition.