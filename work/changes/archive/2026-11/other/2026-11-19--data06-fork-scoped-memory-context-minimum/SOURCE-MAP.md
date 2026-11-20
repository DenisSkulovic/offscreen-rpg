# DATA06 | branch-scoped context source investigation

**Profile:** STATE. **Inspected:** lean main at 584b594 (2026-11-19); **T01 verified** at `ec73a535` (2026-11-20, local application tests **3/3 PASS**). Not a runtime or cluster test. This is a targeted read map, not a request for Cursor to re-audit the codebase.

## Already implemented, do not duplicate

- packages/application/src/stories/forks.ts:createStoryForks.fork checks storySceneCheckpoint for the requested expectedRevision and invokes forkFromSceneCheckpoint when available. It reads exact checkpoint, remaps passage and interaction IDs, reconstructs captured mechanics, and writeBranchManifest creates a new campaignId=forkStoryId, revision=1, previousRootHash=null, with the ancestor's entries. The new branch root is not the parent's later root. **forkLiveRevisionOne is only the restricted fallback when no checkpoint selector exists**.
- packages/application/test/historical-fork.test.mjs proves a local story where scene1 king is alive and sword present, scene2 diverges, and a historical scene1 fork has its own manifest and IDs. It does NOT prove that a separate worker can continue the fork in kind after restart.
- packages/application/src/stories/scene-checkpoint.ts:readSceneCheckpointReference validates exact referenced object/hash and manifest, failing on missing/corrupt source.
- packages/application/src/storyteller/context-capture.ts:contextCaptureV1Schema already carries storyId, ownerId, narrativeRevision, root.hash/revision, bounded sourcePassages and canonicalSelection; it rejects duplicate or future source sequences. capturePendingActionNarration and captureCommittedActionNarration are real frozen-context primitives, not optional brainstorming.
- packages/application/src/storyteller/canonical-knowledge.ts:loadCanonicalKnowledge loads a manifest by specified rootHash and validates manifest.campaignId===input.storyId plus exact rootRevision. loadStartPackageKnowledge checks the selected start package; canonicalContextDependencies, canonicalRuleEvidence and canonicalWorldEvidence can be reused.
- packages/storyteller/src/tasks/memory-exploration.ts already defines bounded ask_memory/read_memory requests and item/source handle schemas. The missing part is a secure branch-pinned backing evidence resolver for the separated executor, not a whole new retrieval agent.

## Actual correctness limits

forkFromSceneCheckpoint deliberately refuses checkpoints with active holds, nonnull offer, active action/activity or accepted plan, and continuity state needing unsafe remap. Thus arbitrary live-action fork is **not implemented**. For POC select a supported quiescent checkpoint, and preserve a negative proving active work fails rather than inventing remap semantics.

Nest StoriesController.fork still uses local stories at baseline. To claim one authoritative GA writer in distributed mode, the fork must be a GA private command behind DIST03/BOOT03, not a hidden Nest SQL write. One shared GA route integrator is required.

The child's canonical branch manifest intentionally has a new campaignId. Passing the parent's root while requesting data under the child's ID should fail loadCanonicalKnowledge. Never relax this guard to make cross-branch retrieval easier. The lexical index/cache must validate root+branch after a cache hit; packages/application/test/lexical-story-index-cache.test.mjs contains explicit fork/root isolation checks.

## Cheapest bounded route to correct child context

1. Coordinate the owner-bound private fork method with BOOT03/DIST03. Reuse createStoryForks.fork and its validation; preserve Compose direct mode explicitly.
2. Capture trusted story ID, passage, root hash/revision and (where supported) checkpoint and visibility at task admission. Never ask the remote executor to find the current global story head after the task is frozen.
3. Compose bounded evidence from existing exact branch manifest, frozen mechanics and pinned source passages. Use already-defined memory handle and request caps; a missing lexical index can fall back to exact validated source or an explicit partial/unavailable result, never a future-parent passage.
4. At each memory read validate manifest campaignId/root/revision, source handle and authorized actor. Source prose can inform narrative; it does not authorize SQL/mechanical effects.
5. Fake-provider proof: scene1 king alive/sword held; parent scene2 king dead/sword gone; quiescent scene1 checkpoint fork; generate one continuation on child and prove all context/memory evidence remains child-scoped and does not contain parent future. Negatives: wrong actor, swapped root, missing object, active checkpoint, stale cache.

## Read/lock budget and unresolved design

DATA04 owns checkpoint compatibility and historical forks, DATA06 owns source selection, STORY03 owns the remote worker, TURN03 owns the one full-cluster proof. Do not ask multiple Cursor children to edit apps/api/src/modules/stories/controller.ts or apps/game-authority/src/server.ts concurrently. Narrow first reads: forks.ts, context-capture.ts, canonical-knowledge.ts, historical-fork.test.mjs and lexical-story-index-cache.test.mjs.

A reliable actor-visibility-specific ACL inside the frozen generation was not established from this lean inspection; verify it before promising an arbitrary multi-actor memory API. For the first solo POC, stay owner-scoped and record unsupported additional visibility rather than widening reads to all stories. No new Cognee, graph index, paid retrieval rounds, invented gameplay mechanics or schema without a demonstrated missing field.

**Evidence tier:** existing code + **T01** local tests (`historical-fork` 2/2, `lexical-story-index-cache` 1/1 @ `ec73a535`); `loadCanonicalKnowledge` campaignId/root mismatch guard is source-read only relative to those two files; branch-pinned remote resolver and cross-Pod fork continuation have **NOT** been run.
