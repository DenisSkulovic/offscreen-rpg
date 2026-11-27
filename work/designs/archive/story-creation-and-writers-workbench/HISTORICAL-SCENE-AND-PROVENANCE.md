# Historical scene identity and fork-safe source provenance | candidate contract

**Status:** technical design review, 2026-11-20. **Unaccepted; no schema or runtime changes have been made.** Based on [versioned Library source audit](VERSIONED-LIBRARY-SOURCE-AUDIT.md), [pre-play staging](PREPLAY-WORKDESK-PROTOCOL.md), current `packages/application/src/stories/{forks,scene-checkpoint,passage-documents,documents}.ts` and `packages/documents/src/schema.ts`.

## The requirement, stated precisely

When a player revisits or forks **scene 37**, the application must reconstruct **the same story-relevant knowledge, narration, authorized state, constraints, capabilities, time and creative configuration that existed at the committed boundary of scene 37**. Nothing from parent scenes 38+, siblings or later revisions may leak in. Reconstructing does not run inference or mechanical effects.

“Everything” should **not** mean copying global authentication, current account plans, provider invoices, staff roles, unrelated caches, or future background jobs into the new story. A fork inherits historical *fictional state*, not the parent's operational identity, settled billing, external secrets or provider retry entitlements.

## Separate three layers that are currently partly conflated

### A. Immutable Library content tree

A hash-addressed persistent mapping from path to exact version and metadata. It is **campaign-ID-neutral**, so fork branch B can initially point at parent scene-37 Library root with no file content rewrite. Logical filenames such as `STORYTELLER_PROFILE.md` are discoverable roles; file path is neither ownership nor authority by itself.

### B. Scene boundary (history/commit)

A small committed envelope points to:
- **Library root hash** and index format/version; possibly the precise staged/provenance root references for a Storyteller operation.
- **Passage / interaction / exact evidence refs**, and a causal parent scene commit. Passage number and branch-local scene sequence are independent.
- **Engine state checkpoint** (optional only when read/fork explicitly report unavailable). State version, relevant character/capability/mechanics where supported, counted items, facts, obligations/offers/holds, gameSecond, clock definition/pace/anchor semantics and outstanding authorized operations must have faithful meaning.
- **Creative and rules pins**: resolved profile, skill versions, source world/rule/start package roots, source invention policy and effective typed control versions applicable at the boundary.
- **Publication identity**: operation ID, deterministic input/delivery reference where relevant, source evidence, branch lineage and commit authority proof.

This is a **semantic tuple selected by one authority transaction**, not a giant Markdown or JSON blob that duplicates all referenced bytes. The immutable scene envelope itself may be serialized compactly if a stable identity is helpful. Current SQL `story_scene_checkpoint` is a valid *selector* design even if future payload/checkpoint representations differ.

### C. Branch and operation control

A branch has its own owner authorization, story ID, stable lineage back to the parent scene, new sequence numbers, activity namespace and future mutation rights. It **does not inherit active provider attempts, spend reservations, retries, unsettled staff work or live parent timers as if they were its own**. Root hashes can be shared, but **access is checked through branch/scene/root authorization**, never by possession of an object hash.

These three layers may be optimized independently as long as Game Authority commits a coherent boundary.

## Concrete source-level gaps to resolve

1. **Current manifests are campaign-bound**: `documentManifestSchema` includes `campaignId`, and `writeBranchManifest` copies the ancestor entry array into another v1 manifest. v2 must decouple *shareable tree content* from *branch/commit identity*. This is the core performance migration.
2. **Source references aren't branch-globally unique**: `documentSourceSchema` currently has only UUID, local revision and optional section. Parent and child can both create revision 2 of the same inherited UUID with different object hashes. A future proof-carrying source reference needs exact immutable content identity and authorized scope.
3. **Source lookup is ancestry-walk-bound**: `readManifestHistory` hard-limits history to 256 manifests. Historical citations should resolve directly through an immutable source object/hash plus authorized membership/retention proof, not replay the entire manifest chain.
4. **Checkpoints are deliberately narrow**: `sceneCheckpointSchema` handles mechanics absent or quiescent supported states. `forkFromSceneCheckpoint` actively rejects holds/offer/accepted plans/running activity. “Every scene forkable” requires a richer state protocol, not merely a new Library tree.
5. **Forked row configuration must derive from the historical boundary**: current `forkFromSceneCheckpoint` inserts `premise: checkpoint.premise` but `storyteller: source.storyteller`, `execution: source.execution`, `usagePolicy: source.usagePolicy`. **Do not assert a present user-visible bug:** these row fields appear effectively stable along the observed code paths. Nevertheless, any future editable profile/settings makes such mixed historical/current sourcing unsafe. The target should explicitly specify *historical pinned creative inputs* versus *new branch's current financial/execution policy*.
6. **Engine clock is distinct from player-visible passage**: a passive arrival or lost connection may create a scene the player has not viewed. Real-time advancement, future timers and outstanding activity cannot be reconstructed merely by reading scene prose; the checkpoint needs truthful clock and active-work meaning.
7. **The copied fork boundary passage has a new branch-local UUID** even while ancestral passage source objects remain immutable. The v2 design must specify an explicit branch-local presentation/evidence alias or provenance reference, not force the whole ancestor Library to be rewritten with new passage UUIDs.
8. **Search/embedding indexes are not authority**: all retrieval must be rooted in the exact authorized scene/branch snapshot with visibility and provenance filtering. An object hash is not a global public read token.

## Proposed immutable citation v2 (conceptual only)

A source reference should identify:
```text
SourceVersionRef:
  sourceScope: campaign | source-package | world | rule | ...
  documentId: stable UUID in its source lineage
  objectHash: SHA256 of exact immutable version
  documentRevision: optional local human label
  section/range: optional exact span
  provenance: immutable source-domain/root/commit evidence (when applicable)
```

The **objectHash resolves content identity**. The **authorization scope and membership proof decide whether this task/user can access it**. Stable UUID and local revision are useful human-facing labels, not sufficient immutable uniqueness on their own.

### Avoid a subtle content-address cycle

Suppose a new note is published in Library root R and includes its own newly created source citation. If the note's hashed body includes `libraryRootHash=R` while R's Merkle tree contains that note's hash, the hashes recursively depend on each other. **Never require a document object to embed the hash of the root/scene commit containing itself.**

Instead, content can cite already-hashed source *objects* (for example, the passage minted earlier in the same staged publication). A **separate commit-level provenance/attestation record** certifies that those objects were eligible and admitted at the selected boundary. References to older roots may be pinned where acyclic. The source resolution layer can prove authorized reachability from the captured source set without rewriting the original citation.

Also avoid assuming that an object hash alone grants reading permission: globally deduplicated private-note hashes remain access-controlled by rooted provenance.

## Historical semantics requiring a decision

- **Snapshot moment:** a “scene” should mean the Game Authority's **committed boundary**, not the mutable situation at the instant someone opens a webpage. If mechanics change offscreen between scenes, either capture their own authorized state transition boundaries and select an exact scene-linked state, or reject forks that cannot reconstruct it. Never combine the current campaign row with an older Library root.
- **Review versus fork:** historical *review* can be supported even when an exact executable *fork* is not. The UI/API should surface the difference, not silently fabricate a checkpoint.
- **Pending work:** active offers, timed activities, holds, scheduled obligations and deadlines may be part of legitimate story state. A future fork protocol needs either a deterministic rehoming/causation conversion with bounded semantics or an explicit unsupported reason. Do not misreport “quiescent only” as complete universal forkability.
- **Creative profile evolution:** scene 7's effective profile/version must remain recoverable at scene 7 even after scene 8 installs a new one. A new branch can later change style under a new explicit event. Changing a default profile file is not retroactive.
- **World/rule package lifetime:** old pinned source package roots need retention and independent read support through children and historical scenes. Package owner future edits must not rewrite past knowledge.
- **Historical user intent:** retain the original exact Story Prompt and later accepted changes as separately versioned intent. Inventions by a Storyteller are never retroactively written into the player's input.
- **Root retention/GC:** traverse live branch heads, historical retained scene commits, pending Workdesks, package roots, source-citation evidence and legally retained exports. Privacy deletion may override normal retain-forever assumptions; define explicit policy.
- **“Everything” excludes live provider context:** preserve admitted input/output provenance as needed for audit and replay, but do not retain hidden model reasoning or an immortal context window as a precondition for coherent continuation.

## A safe v2 scene/fork sketch

```text
Scene 37 publication:
  stage new passage object, revised source docs, small persistent-tree path nodes
  stage/check exact mechanical state and creative/rule pins
  SQL Game Authority transaction validates base refs and admits:
     (branchId, sceneSequence=37, parentSceneCommit, libraryRoot=T37,
      engineCheckpoint=C37 or explicit unsupported, passage=P37,
      profileRoot=PR3, sourcePins=W/R, operationReceipt=OP37)

Parent scene 38:
  libraryRoot=T38 (shares most of T37)
  checkpoint=C38
  no changes to T37

Fork from scene 37:
  verify owner, read T37 and C37 from scene-37 selector
  reject honestly if C37 insufficient for live state
  create branchId=new, ancestor=(parent,37), first scene/event presentation mapping
  branch initial Library tree = **T37** (no manifest/body cloning)
  create new branch-local mechanics IDs/clock anchors under defined mapping
  commit branch selector and remapped state *once*
  later child changes produce T37_CHILD1 while parent continues on T38
```

The **scene history commit and the Library root are different hashes**. A scene can point to the same Library root as another scene when no Library document changes, but ordinary passage publication generally adds a new source-passage document and hence new root.

## Migration and first proofs

1. Preserve v1 objects, scene checkpoint hashes and historical selectors as immutable evidence. Build versioned readers. New v2 roots cannot invalidate old checkpoint references.
2. Prototype path-index structural sharing and **root membership proofs** with a verified CAS store. Test the divergent `documentId@2` case before offering source citations in general-purpose Workdesk edits.
3. Specify *what state is legally forkable* and how to capture an active obligation/offer. The current narrow v1 checkpoint path can remain supported while v2 aims broader.
4. Make publication adopt one coherent scene tuple and reject mixed-root/current-state publication. Test lost HTTP reply, stale source root, corrupt CAS object and concurrent edits.
5. Benchmark mechanical checkpoint sizes separately from document-index scaling; a performant narrative tree doesn't solve growing inventory or simulation state.
6. Evaluate legacy fork's current/current-boundary configuration mixing under a test that changes profile policy **after** scene 7; don't state a bug before reproduction and explicit policy selection.

## Recommendation at this gate

Prefer a **branch-neutral Library tree root + explicitly historical scene commit/selector + independently admissible mechanical checkpoint + hash-qualified source provenance**. This is strong enough to guide focused benchmarks and contract reconciliation.

Still unresolved: exact node format/fanout, retained checkpoint representation of active work, profile precedence and user-intent semantic kind, and the earliest valid fork point after first launch. No direct production migration or Cursor Change is authorized by this document.
