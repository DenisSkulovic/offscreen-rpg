# Versioned Library source audit | snapshot and fork scalability

**Status:** investigated 2026-11-20, **read-only static source review** of supplied tree `09d5820bcafedbed7cf969fe228ee84f44ff2405`. Not a performance test, a storage migration, or accepted implementation contract. See [persistent Library DAG proposal](PERSISTENT-LIBRARY-DAG-DESIGN.md) and [versioning test vectors](VERSIONING-ACCEPTANCE-VECTORS.md).

## User requirement

The story is forkable from an addressable committed scene. Review of scene N must reconstruct what that branch knew and what its Game Authority could execute **at that point**, including canon/private Library, effective creative profile and source package pins, and actual mechanical state. It must **not** clone all content on every scene; neither should one new document revision require traversing the entire life of a long-running story.

## Verified in existing source

| Component | Source | What actually happens |
| --- | --- | --- |
| Immutable content-addressed objects | `packages/documents/src/local-store.ts` (`putValidated`, `putDocument`, `putManifest`, `putSceneCheckpoint`), plus S3 adapter | Serializes canonical JSON, hashes with SHA-256, writes objects by hash; same hash is reused. Markdown prose lives in a validated document envelope, not an independently mutable .md file. |
| Flat campaign manifest | `packages/documents/src/schema.ts` (`documentManifestSchema`) | `offscreen.manifest.v1` contains `campaignId`, monotonically increasing revision, previous-root hash, author operation ID and a **full array of entries**, capped at 4,096. Each entry contains document ID/revision, logical path, object hash, kind, authority and visibility. |
| Ordinary document revision | `packages/application/src/stories/documents.ts` (`admit`) | Loads entire current entry array into a Map, updates changed entries, sorts all entries and stores a new **full** manifest. Changed document bodies get new CAS objects; unchanged bodies reuse their object hashes. The metadata array is not structurally shared inside the manifest. |
| Passage publication appends source evidence | `packages/application/src/stories/passage-documents.ts` (`stageStoryPublicationDocuments`), called by `packages/application/src/storyteller/publication.ts` | A supported Storyteller continuation that stages canonical publication adds **one new immutable source-passage document** to the Library even if `result.documentChanges` is empty. Thus the root commonly advances **once per passage**; no ordinary lore edit is necessary to grow manifest history. |
| Historical document lookup and source validation | `packages/application/src/stories/documents.ts` (`readManifestHistory`, `readDocument`, `admit`) | Walks `previousRootHash` back through revisions, explicitly throws at history length **256**, flattens entries across historical manifests. The source-availability check builds a Set from all historical entries, not an indexed immutable history. This is a hard scale ceiling on the current path. |
| Historical scene selector and checkpoint | `packages/db/src/schema/stories.ts` (`storySceneCheckpoint`), `packages/documents/src/schema.ts` (`sceneCheckpointSchema`), `packages/application/src/stories/reads.ts` | Selector binds scene sequence, immutable checkpoint hash, canon root reference/revision and pins. Read of a supported historical checkpoint does not fall back to current mutable state. V1 checkpoint is one immutable **full** structured object with 1 MiB cap; currently quiescent-or-mechanics-absent, not arbitrary active work. |
| Historical fork | `packages/application/src/stories/forks.ts` (`forkFromSceneCheckpoint`, `writeBranchManifest`) | New branch gets its own story ID, remapped passage and interaction IDs, a staged checkpoint and a new `offscreen.manifest.v1` with **all ancestor entries copied as metadata**. The entries retain their existing **object hashes**: **not a copy of each Markdown body**. |
| Fork limitation | `packages/application/src/stories/forks.ts`, `docs/technical/engine/lifecycle-and-compatibility.md` | Phase-1 checkpoint fork handles supported quiescent/absent-mechanics cases, remaps state; active holds/offers/work are rejected. `forkCurrent` remains a separate revision-1-only limited path. This is **not** yet “fork any scene regardless of activity.” |
| Source provenance | `packages/documents/src/schema.ts` (`documentSourceSchema`) | A cited source stores `documentId`, `revision`, optional section, **but no content object hash or branch/root identity**. Across two divergent branches, document ID and revision may name different objects. |
| Existing declared long-term contract | `docs/technical/storyteller/canonical-documents-and-packages.md#scene-rooted-canon-and-fork-safe-publication--selected-target-2026-11-19` and `docs/technical/engine/lifecycle-and-compatibility.md` | Explicitly rejects copying all documents at each scene. Each supported scene binds checkpoint and canon root; fork must not inherit future parent or sibling information. This review **strengthens** that chosen product/technical target, not competes with it. |

## Cost model: logical versus physical copying

Current `N` = active document count, `R` = document-root revisions, `K` = files changed in one commit. Assuming broadly similar entry sizes:

- **Current flat manifest:** a one-file edit stores one changed content object and another **O(N)** manifest. Over R such edits, metadata storage is **O(R × N)**. No whole-body copies per revision. Full manifest read/list is O(N); current history lookup can do **O(R × N)** parsing/flattening and stops after 256 manifests.
- **Current fork:** constructs **O(N)** new manifest metadata referencing existing document objects. Existing content bodies are reused. Mechanical checkpoint state and some SQL projections are remapped/copied separately.
- **Proposed persistent bounded-fanout tree:** one-file edit stores the changed content object, leaf/metadata and **O(log_f N)** index nodes in a fanout-f tree. Unchanged nodes, contents and source package roots remain shared. A fork can initially reuse the same Library root with **O(1) document-root pointer work**, though its branch metadata and mechanical state remapping may still cost more.
- **Naive delta-only manifest:** few writes per edit but unbounded lookup/history replay unless constrained by checkpoints/indexes; not an automatic improvement.

### Illustrative metadata sizing, not a benchmark

A synthetic manifest encoded as compact JSON with approximately 260 bytes per entry is approximately 25 KiB at 100 entries, 254 KiB at 1,000, and 508 KiB at 2,000. If a 1,000-entry flat manifest is rewritten 1,000 times, that is roughly **254 MiB of manifest metadata alone** (not document bodies, compression or overhead). Exact storage and cost require measurement using real document distributions, serialization and S3 billing. The object adapter currently caps individual stored objects at **1 MiB**, so the nominal 4,096-entry schema ceiling may not be achievable with realistic entry lengths.

## Additional integrity risks

1. **Passage growth is itself a document change:** in the current Storyteller canonical-publication path, each passage adds `sources/passages/passage-...md` even with no other lore edits. Efficient publication should add one passage object and only the affected Merkle nodes. Because passages grow the manifest history, the 256-history ceiling can affect normal long play.
2. **Version collision after forks:** two branches can advance inherited `documentId` from revision 1 to revision 2 with different `objectHash`. A source handle of only `documentId@2` is not globally unique. Cross-branch citations, inherited provenance, generic indexes and future Library tools must pin immutable source identity plus authorized lineage.
3. **Old source retention:** an ancestor entry may be removed from the current head while a later note cites its old version. Source evidence must stay accessible through immutable citation/provenance references under retention policy, not require the current head to contain it.
4. **Source-package instantiation:** `packages/documents/src/start-instantiation.ts` creates campaign-specific document identities/envelopes for imported package entries. It preserves provenance but can create new CAS objects for those envelopes. Consider immutable source-root overlays/read references instead of rematerializing every bundled body, while preserving campaign-owned fork/edit semantics.
5. **Checkpoint volume:** the existing structured scene checkpoint may repeat stable `premise`, `storyteller`, `execution`, `usagePolicy` fields and current game-state arrays. The narrative Library can become structurally shared while checkpoint payloads still grow. Treat mechanical checkpoint compression/sharing as a **separate investigation**, not an excuse to merge executable state with prose.
6. **Document-free transitions:** only events that produce no Library documents (for example, some control/state transitions) can retain an identical root. A Storyteller passage publication generally cannot, because that passage itself is a new source document.
7. **Read authorization:** global CAS deduplication is safe only if retrieval checks permitted roots and per-document visibility. Knowledge that an object hash exists must **not** become permission to read another branch's private notes.

## Severity and confidence

- **Confirmed source-level limitation:** 256-history bound; full manifest serialization/update; O(N) branch manifest metadata copy; current source-reference shape.
- **Confirmed existing progress:** immutable CAS, durable checkpoint selector and at least one history-safe fork path, with a two-scene sword/king regression fixture in `packages/application/test/historical-fork.test.mjs`.
- **Likely architectural risk requiring executable proof:** performance/storage at high document counts; source citation collision on diverging revision 2; checkpoint growth; source reachability and GC.
- **Not yet established:** actual 1,000-scene runtime costs, load latency, branch security under a persistent tree, or suitability of a specific balanced Merkle tree implementation.

**Strong recommendation:** fix lookup scalability and branch-safe source identity before adding a general writable Storyteller Workdesk with frequent updates. Otherwise a clever creative agent will hit the current history ceiling simply by being productive.
