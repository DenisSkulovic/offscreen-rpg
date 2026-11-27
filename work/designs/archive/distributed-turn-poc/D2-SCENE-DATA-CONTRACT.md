# D2 | Scene checkpoint and canonical-state contract for the distributed POC

**Status:** candidate design, 2026-11-19. Not a selected implementation or proof of running historical forks. Reconcile normative sections via [DATA01](https://github.com/DenisSkulovic/offscreen-rpg/blob/34e2b4fd8d9d9967e13311da3a938460b1a02244/work/changes/archive/2026-11/data/2026-11-19--data01-ratify-scene-checkpoint-and-fork-schema/CHANGE.md). This narrows [ARCH03](https://github.com/DenisSkulovic/offscreen-rpg/blob/34e2b4fd8d9d9967e13311da3a938460b1a02244/work/changes/archive/2026-11/architecture/2026-11-19--arch03-branch-scoped-storyteller-knowledge/CHANGE.md), not replaces it. The eventual product requirement is still **review and independently fork from any committed scene**; this POC must prove an actual *non-current* fork without promising unsupported current histories.

## What source actually stores (inspected HEAD 2026-11-19)

- `packages/db/src/schema/stories.ts`: `story` holds **latest** `documentRootHash/documentRootRevision`, `revision/viewVersion` and fork parent references. `storyPassage` holds source content/hash, effects, interaction, time plans, sequence and generation metadata, but **no exact as-of campaign/obligation/item snapshot**. `storyDocumentCommit` holds root history by operation, not an arbitrary complete passage-state lookup.
- `packages/db/src/schema/campaign.ts`: live `campaign` holds character, `storyFacts`, location, clock, active offers, holds and action state; there are additional tables for game activities, world obligations, receipts and plans. Every omitted mutable family must be explicitly classified.
- `packages/application/src/stories/continuation.ts::commitStoryContinuation` applies item effects, inserts passage, optionally commits staged canon root and increments `viewVersion` under a locked story transaction. This is the **correct natural commit seam** for a new checkpoint, not an independent scheduled snapshotter.
- `packages/application/src/stories/forks.ts` only forks restricted revision 1/current snapshot-complete cases; it explicitly refuses mutable campaigns, outstanding obligations, resolution and timing state. Do **not** bypass the protections.
- `packages/documents/src/schema.ts` already has `offscreen.document.v1`, `offscreen.structured-document.v1`, and `offscreen.manifest.v1`. Immutable source-passage content and optional canonical documents can be stored by hash; **do not blindly change those formats**.

## Binding outcomes to ratify

**Definitions:** a committed *scene checkpoint* is a named state boundary associated with a published narrative passage. A passage, UI book leaf, mechanical receipt, provider attempt and clock tick are different things. A checkpoint must represent **the exact relevant authoritative state of that scene**. Time/activities may advance between scenes, but the state at the scene boundary must remain recoverable. This design does not promise every timer tick is a book scene.

**One source of mechanical truth:** the mutable Game Authority SQL schema owns current mechanics. Immutable checkpoint payloads are **captured historical representations**, not additional writable rule authorities. They may be stored in object storage with a SQL index/reference, but creation is admitted only through the Game Authority transaction fence. A Storyteller may read validated projections and propose descriptive changes, not directly rewrite checkpoint or current SQL.

**Atomic pairing:** every scene publication must commit together (inside one SQL transaction) an immutable passage reference, a validated scene-state snapshot content hash/reference, the exact resulting canon manifest root/revision, accepted transition/receipt and version. S3 staging occurs before this commit; a failed SQL transaction leaves inaccessible objects, not a published half-scene. Restart recovery either sees prior checkpoint or complete next checkpoint. No reader infers old state from latest SQL.

### Proposed v1 logical checkpoint (not a finalized wire/schema)

```json
{
  "format": "offscreen.scene-checkpoint.v1",
  "storyId": "uuid",
  "passageId": "uuid",
  "sceneSequence": 12,
  "transitionId": "uuid-or-null-for-first-scene",
  "gameState": {
    "character": "validated typed character snapshot when present",
    "items": "ordered typed possession state when meaningful",
    "gameSecond": 600,
    "clock": "validated clock snapshot if campaign exists",
    "location": "optional value",
    "facts": "admitted facts and relevant other state"
  },
  "canon": {
    "rootHash": "sha256-or-null-for-legacy-only",
    "rootRevision": 12
  },
  "pins": {
    "rules": "immutable package ref or null",
    "world": "immutable source-world ref or null",
    "start": "immutable start-package ref or null",
    "storytellerProfile": "captured profile/config version or value"
  }
}
```

**Caution:** `gameState` above is a *placeholder category*, not permission to dump arbitrary Drizzle rows as JSON. DATA01 must enumerate **every** consequential current field/table, its snapshot/reconstruction policy, and its versioned validator. IDs of story-scoped rows need a remapping strategy. Never snapshot secrets, provider keys, account profile, private billing credentials or unrelated campaign data. Avoid saving live provider internal working memory as public scene truth.

**Recommended physical shape:** immutable canonical-JSON checkpoint object in existing `DocumentStore` S3 implementation with a dedicated `putSceneCheckpoint/readSceneCheckpoint` content-hash API (typed, size bounded, digest verified). SQL table `story_scene_checkpoint` keyed by `(story_id,scene_sequence)`, plus unique passage ID and transition/operation identity, stores `checkpoint_hash`, `canon_root_hash/revision`, `state_schema_version`, `created_at` and relevant provenance. Add FKs, version checks and uniqueness in migration. Check the exact current schema and DB migration tooling before implementation. The SQL row is the publication selector; object stores are not transaction coordinators.

If snapshot size or transaction ordering makes this impossible on a subset of current state, stop and design a verified persistent-state reconstruction alternative. Do **not** label a partial field copy a full arbitrary-fork snapshot. The POC's source-derived completeness map must justify which mutable records are included, versioned, or categorically excluded by first-campaign fixture. Explicitly reject unsupported historical checkpoints rather than silently fall back to latest state.

### What is captured at start and publication

- **Start**: `initializeStoryInTransaction` / `createStoryStart` stage bootstrap canonical objects, pin rule/world/start sources, write first passage and *scene-1 checkpoint* with correct initialized state and root as one admitted SQL effect. Initializing without a campaign row still has a typed empty/mechanics-absent state, not arbitrary unknown.
- **Continuation**: current `commitStoryContinuation` stages passage/canon edits, locks story, validates idempotency/expected revision, applies effects, writes new passage and **captures post-admission state within the same transaction** before publication and outbox ACK. For a consequence that spans separate mechanical and narrative transactions, DATA01 must state which committed state boundary is captured and prevent stale-writer mix.
- **Read**: owner-scoped historical GET selects `(story_id,sequence)` checkpoint then resolves exact source passage and canon root, verifies hashes/versions and returns a validated historical DTO. A missing/corrupt checkpoint fails explicitly; GET may not repair by mutating the story.
- **Fork**: owner creates `newStoryId` with source `(storyId,sequence,checkpointHash)`, not “fork the current revision unless it's 1.” In one SQL transaction reconstruct/insert authorized new branch's game state, settings, relevant items/obligations, remapped internal IDs and branch origin, then point the fork's document root at inherited immutable manifest objects (with explicit campaign/manifest identity handling). Do **not** copy an ancestor `campaignId` field into a new branch's manifest and claim the new story owns it; either explicitly reference ancestor root with provenance or introduce a branch-specific root/alias. The current `documentManifestSchema.campaignId` and current staging function's `current.campaignId !== storyId` check expose this mismatch.
- **Retention**: shared ancestor objects referenced by any supported published checkpoint/fork stay reachable; delete/erasure and orphan cleanup must not garbage-collect still referenced source content. Current S3 object adapter has no comprehensive root reachability GC proven. Start with retention-safe *no destructive GC* for POC and record operational cost.

### A deliberately hard fork fixture

1. Start authored D&D-lite campaign with character HP 20, possession `sword-a`, king alive as canonical descriptive fact.
2. Scene 2: lawful supported action transfers `sword-a` away and commits a source-linked canon change that king is dead. Scene-2 current state: no sword, king dead.
3. Request historic scene-1 GET: HP 20, sword held, king alive; reading doesn't mutate current branch or retry a provider.
4. Fork from scene 1, after scene 2 exists. New independent branch has original sword and alive king at its first state/root. Parent stays changed. Fork then publishes a different scene-2; sibling events must not leak.
5. Repeat with an abstract/microbe campaign with **no item rows**. Same schema and fork protocol, no mandatory inventory fiction.

**Negative fixtures:** root pointer stale despite valid object; root hash points to future branch; missing/corrupt blob; duplicate checkpoint write with different payload; unsupported active timer/workflow or foreign owner; different rules/source package pin; cross-branch global search returning future king death. All fail closed or produce explicitly scoped known state.

## Implementation decomposition

- **DATA01**: ratify completeness inventory, typed checkpoint representation, FK/reference and fork lineage semantics; docs only. Avoid “everything in campaign table” as an uninspected assumption.
- **DATA02**: add immutable checkpoint content API, typed schema, SQL table and staging/commit helper without changing live gameplay. Test storage, versioning, read-back and atomic reference insertion.
- **DATA03**: wire scene-1 and later publication checkpoints to existing bootstrap/continuation paths. Distinguish incomplete legacy scenes and don't backfill with latest state. Require current state/manifest root/SQL transaction consistency.
- **DATA04**: historical fork implementation and as-of read public API/client contract in following separate Changes once DATA03 works.
- **DATA05**: S3 cross-Pod and scene/canon root retrieval proof, coordinated with K8S05 and Storyteller split. May proceed independently of DATA02 after credential/source compatibility decisions.
- **DATA06**: branch-scoped Storyteller context and bounded exact memory reads depend on ARCH03/05 plus DATA03/04. This is not Cognee adoption.

**No production readiness claim:** current source not checkpoint-complete, historical fork not implemented, live S3 integration unproven. This is a candidate schema and migration map for Cursor to ratify, not executed code.
