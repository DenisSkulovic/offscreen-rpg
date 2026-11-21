# WR02 | verified source and state ownership map
**Baseline:** `undertaking/storyteller-workshop` inspected at planning head `f2e0b237` (2026-11-21); GitHub committed tree only, Cursor's unpushed worktree **not inspected**. **Evidence level:** static source inspection, tests NOT RUN. **Scope:** v2 root substrate and safe adoption, not just a trie prototype.

## Actual current path
- `packages/documents/src/schema.ts:logicalDocumentPathSchema` limits paths to 320 characters, relative .md/.json; `documentManifestEntrySchema` stores documentId, revision, path, objectHash, kind, authority, visibility. `documentManifestSchema` is `offscreen.manifest.v1` with campaignId, whole `entries[]` capped at **4096** and previousRootHash.
- `packages/documents/src/local-store.ts:LocalDocumentStore` and `s3-store.ts:S3DocumentStore` share typed CAS put/read methods; max single stored object 1 MiB. `DocumentStore` is the interface consumers use; add versioned typed tree API **to both adapters**.
- `packages/application/src/stories/documents.ts:createCampaignDocuments`: `readRoot` assumes manifest.campaignId=storyId; `readDocument` searches `readManifestHistory` (max 256); `admit` reconstructs full entries, checks revisions/sources, stages CAS object+manifest, then in `database.db.transaction` locks story via `lockOwnedStory`, checks expected root, inserts `storyDocumentCommit`, selects `story.documentRootHash/Revision`, emits `knowledge.index.v1`.
- `packages/application/src/stories/forks.ts:writeBranchManifest` **copies ancestor entries into branch-specific v1 manifest**, explicitly violating new zero-whole-list fork target.
- `packages/application/src/storyteller/library-navigation.ts:createPinnedLibraryNavigation` uses `readManifest` and whole entries; a v2 root needs a new rooted reader adapter rather than a cast to flat manifest.
- `packages/db/src/schema/stories.ts:story` has `documentRootHash`, `documentRootRevision`; `storyDocumentCommit` uniqueness on (storyId,operationId), (storyId,rootRevision). No document-format column observed: introduce explicit version discrimination by **content format** rather than interpreting v2 as v1.
## Decision/compatibility traps
- `document.envelope.revision` is logical-local revision; same ID@revision can diverge in forks. Cite **rootHash + objectHash + logical document ID**, not ID@revision alone.
- A path trie alone is insufficient for fast `readDocument(documentId)`: create an accompanying **immutable ID→path index root** in the v2 root header. Both indexes derive from one canonical sorted entry set and must update atomically before selector adoption.
- Root has **no storyId/branchId**; all access is authorized through owning story and root membership, not possession of a hash. Historical v1 objects/checkpoints keep their original hash and reader.
- Mount roles `START.md` and `STORY_PROMPT.md` must not silently become globally mutable or last-write-wins overlays.
## Ownership graph
Typed CAS bytes: documents package; root selection and permissions: application/story lock + SQL; import/mount adapters: documents start packages + application; forks: forks.ts; Storyteller browse: library-navigation.ts; downstream knowledge index is derived only. Source trees are an immutable data layer, **not** a bypass around `lockOwnedStory`.
## Known unresolved live fact
Cursor reportedly started WR02 before this amendment; **current dirty branch/files unknown**. Parent must reconcile the new planner recipe with those diffs; no destructive reset, no automatic parallel edits.