# Canonical campaign storage and Storyteller bundles

Status: Implementation active. C1 local storage is implemented; passage and executable-state ownership transfers are underway.
Direction: the owner requested canonical files, then explicitly clarified on 2026-09-20 that most or all game data should live in those files with minimal PostgreSQL coordination. Paid services and live inference remain disabled.

## Intended outcome

A player can create or import reusable, versioned world and rule libraries, then start campaigns pinned to their exact roots. Each campaign begins with its own durable overlay independent of any model conversation. Setup publishes the meaningful campaign artifacts it already knows rather than only an opening passage: orientation, premise, each created character, pinned world/rule references, settings/time, initial possessions or story items, executable state and the opening source where applicable. Campaign lore, local rulings and recurring identities then gain stable linked documents as they become relevant; original published passages remain inspectable; creative Storyteller guidance lives in a versioned bundle. A maintainer can inspect revisions and export combined provenance without copying an entire shared library into every campaign. Search can be rebuilt without reconstructing narrative content from embeddings.

Follow [concepts](../../concepts.md): a Storyteller turn prepares narration and current possibilities; a scene can span many turns. There are no chapters, chapter completion rules or mandatory narrative arcs. File boundaries organize storage, not the character's life.

## Representative flow

Start the harbor campaign, publish the opening and play several rapid decisions in the same conversation. Each published passage has a durable source reference. A newly admitted visitor identity points to the passages that established it. Close the application, restart it and read the same sources and identity with unchanged versions. Revise a descriptive note through an admitted operation, inspect its diff, and export the workspace.

Separately, import a multi-page invented setting and start two campaigns pinned to the same immutable revision. One campaign establishes a local change through an overlay; the other remains unchanged. Publish a new world-library revision and confirm neither campaign moves until explicitly repinned.

An interrupted repair keeps its exact progress in the execution ledger. A prose edit cannot complete it or award credits. A failed required file write leaves publication recoverably held; a lost acknowledgement after a successful commit does not create a second passage. A stale edit cannot overwrite a newer identity description. Search/index failure does not erase documents.

## Scope and boundaries

- Canonical immutable document objects, metadata and manifest roots; local storage first.
- Reusable world-library roots, bounded import and exact campaign pinning with campaign-local overlays.
- Atomic admission/publication references coordinated with current execution state; no object I/O under a database lock.
- Scoped directory/section reads, provenance, export and compact Chamber inspection.
- Transfer narrative and executable game-state ownership from SQL JSON bodies to immutable file artifacts, including current/history/context reads. SQL retains small root/reference fences, permissions, operation deduplication, due-work projections, outbox coordination and accounting. A projection is disposable and cannot become an independently editable authority.
- Storyteller creative file bundles compiled into validated, pinned task inputs.
- Rebuildable catalogue/index metadata and explicit source-export coverage, consumed by the memory feature.

Extraction, summaries, semantic retrieval and the bounded exploration loop belong to [memory and recall](../2026-09-18--20-09--storyteller-memory-and-recall/FEATURE.md). It consumes this store rather than building another. Full executable-save import, public lore editing/retcons, hosted storage deployment and shared-world coordination are outside this slice. The chosen local adapter can later be replaced with a bucket adapter through the same contract.

## Acceptance

1. Published prose and admitted descriptive canon have one editable authority in file artifacts; exports are not a second writable copy.
2. Readers see a complete committed document revision set. Unpublished staging is unavailable as history, and retries do not repeat effects/publications.
3. Stable document identities survive logical path changes; exact source citations and captured tasks retain the versions they read.
4. Restart and index rebuild preserve the readable library and executable campaign state. Export includes version/source metadata and distinguishes a complete runnable save from an intentionally partial knowledge export.
5. Changing creative guidance affects newly captured tasks at the selected revision; it cannot alter an in-flight task or grant mechanical authority.
6. Chamber/manual QA can demonstrate rapid turns in one scene, exact evidence, stale-edit rejection and missing-document recovery. No chapter identity or transition is required anywhere.
7. A large authored world is reusable across campaigns, retrieved section-by-section under different cost recipes, and cannot silently change a pinned campaign. Campaign developments do not mutate the shared package.

## Owning specifications

[Canonical files](../../technical/canonical-files.md) owns storage/authority/recovery. [Concepts](../../concepts.md) owns terminology. [Continuity](../../continuity-and-consequences.md) owns the player promise. [PLAN.md](PLAN.md) identifies the implementation sequence and component owners. Runtime status stays in [progress](../../progress.md).
