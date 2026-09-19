# Canonical campaign storage and Storyteller bundles

Status: Prepared for implementation; not implemented.
Direction: the owner requested canonical files, reduced narrative reliance on tables, and prepared implementation features on 2026-09-19. This feature supplies that executable handoff. Paid services and live inference remain disabled.

## Intended outcome

A campaign has a durable, readable document library independent of any model conversation. Lore and recurring identities have stable linked documents; original published passages remain inspectable; creative Storyteller guidance lives in a versioned bundle. A maintainer can inspect revisions and export the library. Search can be rebuilt without reconstructing narrative content from embeddings.

Follow [concepts](../../concepts.md): a Storyteller turn prepares narration and current possibilities; a scene can span many turns. There are no chapters, chapter completion rules or mandatory narrative arcs. File boundaries organize storage, not the character's life.

## Representative flow

Start the harbor campaign, publish the opening and play several rapid decisions in the same conversation. Each published passage has a durable source reference. A newly admitted visitor identity points to the passages that established it. Close the application, restart it and read the same sources and identity with unchanged versions. Revise a descriptive note through an admitted operation, inspect its diff, and export the workspace.

An interrupted repair keeps its exact progress in the execution ledger. A prose edit cannot complete it or award credits. A failed required file write leaves publication recoverably held; a lost acknowledgement after a successful commit does not create a second passage. A stale edit cannot overwrite a newer identity description. Search/index failure does not erase documents.

## Scope and boundaries

- Canonical immutable document objects, metadata and manifest roots; local storage first.
- Atomic admission/publication references coordinated with current execution state; no object I/O under a database lock.
- Scoped directory/section reads, provenance, export and compact Chamber inspection.
- Transfer narrative-body ownership from SQL to file artifacts, including current/history read paths. SQL retains execution state, small publication references, permissions, deduplication and accounting.
- Storyteller creative file bundles compiled into validated, pinned task inputs.
- Rebuildable catalogue/index metadata and explicit source-export coverage, consumed by the memory feature.

Extraction, summaries, semantic retrieval and the bounded exploration loop belong to [memory and recall](../2026-09-18--20-09--storyteller-memory-and-recall/FEATURE.md). It consumes this store rather than building another. Full executable-save import, public lore editing/retcons, hosted storage deployment and shared-world coordination are outside this slice. The chosen local adapter can later be replaced with a bucket adapter through the same contract.

## Acceptance

1. Published prose and admitted descriptive canon have one editable authority in file artifacts; exports are not a second writable copy.
2. Readers see a complete committed document revision set. Unpublished staging is unavailable as history, and retries do not repeat effects/publications.
3. Stable document identities survive logical path changes; exact source citations and captured tasks retain the versions they read.
4. Restart and index rebuild preserve the readable library. Export includes version/source metadata and honestly distinguishes a knowledge archive from a runnable save.
5. Changing creative guidance affects newly captured tasks at the selected revision; it cannot alter an in-flight task or grant mechanical authority.
6. Chamber/manual QA can demonstrate rapid turns in one scene, exact evidence, stale-edit rejection and missing-document recovery. No chapter identity or transition is required anywhere.

## Owning specifications

[Canonical files](../../technical/canonical-files.md) owns storage/authority/recovery. [Concepts](../../concepts.md) owns terminology. [Continuity](../../continuity-and-consequences.md) owns the player promise. [PLAN.md](PLAN.md) identifies the implementation sequence and component owners. Runtime status stays in [progress](../../progress.md).
