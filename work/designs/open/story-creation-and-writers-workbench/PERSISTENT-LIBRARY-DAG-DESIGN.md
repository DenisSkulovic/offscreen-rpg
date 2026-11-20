# Persistent Library DAG | structural sharing and scene-rooted history

**Status:** proposed **technical architecture**, authored 2026-11-20; **not ratified** and **not a Cursor implementation Change**. This supports the existing [scene-rooted canon contract](../../../../docs/technical/storyteller/canonical-documents-and-packages.md#scene-rooted-canon-and-fork-safe-publication--selected-target-2026-11-19); it must be reconciled with that owner rather than replace it. Read the [source audit](VERSIONED-LIBRARY-SOURCE-AUDIT.md) and [test vectors](VERSIONING-ACCEPTANCE-VECTORS.md).

## Core answer

Yes: design the Library **like a Git-style immutable DAG**, but do not install Git as the storage engine or copy Git's directory serialization without measuring it.

**The snapshot of a story scene is a small, immutable set of **references to immutable roots**, not a complete fresh copy of every source document and mechanical row.**

- **Content objects**: immutable Markdown/structured bodies and source passages, identified by content hash.
- **Document identity**: stable logical ID, current path, kind, authority, visibility, version and **immutable content hash**. Path is navigational; ID is identity; content hash distinguishes divergent versions.
- **Library root**: one hash for a persistent, authenticated directory/index tree mapping logical paths to document-version references.
- **Scene boundary/commit**: immutable or transactionally selected tuple of Library root, **compatible game-state checkpoint**, published passage/event references, pinned world/rule/source package roots, effective Storyteller profile/skill versions, clock/control and provenance. A scene, passage, and client book leaf remain distinct existing concepts.
- **Branch**: a new story/causation identity created from a selected eligible scene-boundary tuple. It initially references the same immutable ancestor Library nodes and documents; future writes create branch-local successors. Forking is **not merging**, does not execute effects, and must not invoke the model.

The source-of-truth commit selector is admitted **atomically by Game Authority** with relevant SQL state/receipts. The object store stages data first; a successful CAS upload is not a published scene.

## A small example

```text
Scene 37 commit (parent)
  libraryRoot = TREE_A
  stateCheckpoint = STATE_37
  profile = PROFILE_3
  sourcePins = SOURCES_1

TREE_A   [world/, people/, threads/, private/, ...]
  world/      -> SUBTREE_WORLD (shared)
  people/     -> SUBTREE_PEOPLE (shared)
  private/    -> SUBTREE_PRIVATE (shared)
  threads/    -> SUBTREE_THREADS_A

Parent scene 38 edits threads/thread-12.md:
  TREE_B = tree update(TREE_A, threads/thread-12.md -> DOC_NEW)
  It reuses SUBTREE_WORLD, SUBTREE_PEOPLE and SUBTREE_PRIVATE.

Fork from scene 37:
  new branch = child story, source scene 37, initial library TREE_A.
  Only branch control/lineage + state remapping need new identities.
  Later fork edit creates TREE_C from TREE_A, without changing TREE_B.
```

**No file tree is cloned by copying Markdown bodies.** Even where a fork must create its own top-level ownership envelope, the payload graph remains shared by hash. A branch's new root identity should not force rewriting a flat array of all ancestor entries.

## Why a Git metaphor is not sufficient as a data structure

A Git-like directory tree hashes directory listings; a very large flat directory can still require rewriting a large directory node. We should compare actual **persistent bounded-fanout maps**, for example:

- **Content-addressed B+ tree / balanced radix tree** with keys ordered by validated logical path and fanout perhaps 32–128. Path lookup, single-file update and prefix listing are bounded by depth and range. Nodes are immutable and share unchanged siblings. Splits/merges must be deterministic.
- **Hash-array mapped trie (HAMT)** indexed by normalized path or stable document ID. Good expected key lookup/update; ordered `list prefix` and Markdown directory navigation need another derived/indexed path view.
- **Sharded Merkle directory tree** with bounded-sized child maps, enabling friendly browsing. Must ensure that thousands of files in one folder do not force writing a huge directory listing.

**Working preference to prototype:** persistent, path-ordered bounded-fanout Merkle tree (or equivalent) because the model needs navigable prefix listing, exact path reads and efficient changes. **Do not choose a node format, fanout or schema version until offline benchmarks validate it.**

There is no mandate for a mutable `current.md` or a global “latest document” map. Queries resolve from the **captured root**, then follow the immutable paths and object references.

## Separate branch and history dimensions

A document can have:
- a stable identity (`documentId`) across rename and inherited branch history;
- a **branch-local revision** for user-friendly edits;
- immutable **objectHash** identifying the actual version;
- an optional source commit/root pointer to establish when/how it became visible.

After a fork, both parent and child may produce `documentId@revision=2`, but different hashes. **Never treat ID + integer revision alone as globally unique.** A verifiable citation needs at least an immutable object hash plus originating logical identity and an authorized ancestry/scope; optional section and read-boundary identity are retained. Branch-scoped revision still helps UI, it simply isn't cryptographic content identity.

Paths can change without losing document identity. A rename is an atomic removal of old path mapping plus insertion of new path mapping, with the same logical ID and explicit provenance. Deleting a document removes it from the current tree, but must not delete a historical object referenced by a retained scene or citation. No need to rewrite old scenes when a path changes.

## Source packages and Workdesk overlays

- Author-supplied source package roots are **immutable read-only dependencies**; a prepared preset can include `START.md`, `STORY_PROMPT.md`, `STORYTELLER_PROFILE.md` and any optional lore. **Source package updates do not mutate a captured launch/scene.**
- A campaign may mount shared read-only libraries **by root reference** and materialize only actual campaign-specific overrides/accepted changes. An overlay resolver must specify exact precedence, collision and source provenance. Don't duplicate whole packages just to change the campaign ID.
- The Storyteller's **pre-play Workdesk** can use the *same immutable tree/object format* but has a separate operation-owned **staged root**, not a published campaign head. One setup mission may produce new objects and a new staged root; a subsequent opening reads exactly that root. The Game Authority decides which proposals, if any, enter a published scene.
- `STORYTELLER_PROFILE.md` is pinned *creative guidance*, not mechanical policy. Automatic injection resolves effective guidance at a captured root/version, never “whichever current file currently has this name.”
- Player prompt remains a verbatim versioned user-intent document, not forced world canon. Private directions remain private and noncanonical; a model-created narrative possibility never becomes truth just because it lives in a file.

## One committed scene: what “everything” actually means

**SceneRoot = (Library root, engine checkpoint, published evidence, effective configuration/source pins, causal lineage).** This is a semantic consistency requirement, **not** one giant serialized object.

A scene-boundary record should be able to answer, without running a model:
1. What Library documents and prior published passages were available at that boundary? What was marked private/rumor/canon, and to whom?
2. Which world/rule packages, creative profile and writer skills were effective? What was *captured* for the invocation versus changed afterward?
3. What was the mechanical state (where mechanics exist), fictional time, counted resources, valid offers, obligations or allowed control revision?
4. Which narrative passage/interaction and source receipts led to the boundary? What earlier scene commit is its parent?
5. From that exact point, is historical **review** supported? Is an independent **fork** executable without parent pending work? If not, return an explicit unsupported reason.

Not every passage is a scene; a book leaf is purely presentation. **A quiet mechanical transition may occur between published passages.** The engine must capture that authoritative state at the appropriate committed boundary, or make the requested fork ineligible; retrieving an old narrative Library root and current live SQL rows is never acceptable.

The current v1 checkpoint is a quiescent, single-object structured payload. Full-state checkpoint per scene might be acceptable for small bounded states; it is not automatically efficient for huge simulation worlds. Evaluate state-specific persistent structures / delta-with-checkpoint strategies **separately**, with a bounded read/reconstruction SLA. A delta chain with unbounded replay is not a victory.

## Complexity promises to test, not handwave

Define `N` = current documents; `K` = changed documents; `F` = tree fanout; `R` = story document revisions; `S` = scenes.

| Operation | Current flat manifest | Target persistent tree, excluding engine-state work |
| --- | --- | --- |
| Read one current document by path | O(N) manifest scan + content read | O(log_F N) indexed node reads + content read (with caching) |
| List `prefix/` | O(N) current entry scan | O(log_F N + matching results) |
| Update K documents in one admitted revision | O(N) reserialized metadata + K content objects | O(K × log_F N) new nodes, potentially shared upper paths + K content objects |
| Scene with no document changes | No content change required; must still pin same root | **Exactly reuse prior Library root** |
| Fork at eligible prior scene | O(N) new branch manifest metadata, inherited bodies shared | **O(1) Library-root pointer reuse**, separately remap engine/branch identity |
| Find old cited version | Historical manifest walk; hard bound 256 | Direct immutable hash/authorized provenance lookup; independent of story age |
| Compare two Library roots | Usually enumerate flat arrays | Hash-pruned tree diff; skip identical subtrees |

Target complexity assumes a correctly designed balanced/indexed immutable tree, not every thing calling itself “Merkle.” Measure actual node sizes, hash costs, S3 GET/PUT counts and cache behavior. **Avoid fanout knobs by intuition.**

## Publication, concurrency and failure

1. Freeze a task's `baseLibraryRoot`, document-version hashes, effective profile/core, world/rule pins, control/state revision and allowed spending. No model tool may switch secretly to the newest root.
2. Storyteller proposals are a bounded change set, not raw writes. Game Authority validates kind, visibility, ability and causal/epistemic authority. Batch K changes against the captured root with CAS expected-root fences.
3. Store new document objects and persistent-tree nodes outside the database transaction; hashes checked on read. The pending root may exist in storage without authorization to read it as published canon.
4. Under the existing transaction boundary, recheck source revision, costs/attempt custody, authoritative state and current root; select one new root and checkpoint/scene references together. Commit can fail or be retried idempotently. **Never infer that an S3 object write and a SQL write are atomic together.**
5. Fork reads only the **selected historical tuple**, creates its own branch/causation namespace, and inherits only objects reachable from that tuple and its pinned source references. A parent's later commit, new private note or revised profile is not reachable unless explicitly re-imported under policy.
6. Player-visible Library search must be root-scoped and visibility-filtered; secondary search indexes and embeddings are **derived caches**, never global authority. Cache keys should include root/branch/visibility where required; a shared object hash grants no read permission by itself.

A held or uncertain provider attempt pins its original staged root. Replaying after a newer Library edit cannot “just use latest” and change the creative outcome. A fork does no new inference by default.

## Retention and portability

GC traverses **all retention roots**: current branch heads, retained historical scene commits/checkpoints, source packages, staged Workdesks with outstanding operations, source citations, authorized exports, and other legally retained references. Only objects unreachable from **all** retained roots and outside retention grace are candidates for removal. Ensure a source object used by one fork cannot be collected when the parent changes or is archived. User-authorized deletion and privacy erasure may override normal historical retention; product expectations must be explicit, not “forever no matter what.”

Export materializes user-friendly `.md` paths plus a manifest/revision graph/checksums. The complete **runnable** save must also include or reconstruct the transactional engine/clock ledger, pending operations and grants. A ZIP of Markdown is a portable Library view, not automatically an executable time machine.

## Migration strategy (no implementation authorized)

**Do not rewrite all old content just because a new Merkle tree is selected.**

- Freeze/hash the old `offscreen.manifest.v1` roots as historical read inputs.
- Build a `manifest.v2`-style persistent tree *only after* performance/fork tests. A migration adapter may materialize a v2 root from an existing v1 manifest **once per head or retained historical boundary**, with root translation/verification. Avoid doing a full import on every scene and every fork.
- Preserve original `documentId`, object hashes, path, visibility, authority, provenance and exact historical refs. Old scene checkpoint hashes must remain valid. If a v1 checkpoint cannot point to a new root, support a versioned reader or explicit mapping without rewriting its bytes.
- Replace the O(R × N) source validator with bounded immutable source proofs/read APIs **before** enabling hundreds of automatic Workdesk edits.
- Retain the current Game Authority commit and per-operation idempotency fences. Avoid dual-authority root writers in the migration.
- Bench the new read/write/fork/export/GC path on synthetic histories of 1k/10k docs, 1k+ changes and branched histories before selecting defaults.

**Open technical question:** should the durable tree be keyed by paths with a derived stable-ID index, or maintain two mutually committed Merkle indexes (path and ID)? Start with one authoritative path index and a rebuildable ID lookup unless real workloads prove otherwise; never let the two return disagreeing current versions.

This is a proposed plan and strong architectural preference, not a statement that the current system already provides O(log N) writes or universal forks.
