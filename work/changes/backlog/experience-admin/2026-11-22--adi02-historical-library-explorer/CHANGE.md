# ADI02 | Versioned Library explorer for an authorized historical scene

**State: PROPOSED / NOT CURSOR-READY.** Independent from [ADI01 scene/game state](../2026-11-22--adi01-scene-history-game-state-explorer/CHANGE.md) and [AI03 model-visible prompt inspector](../2026-11-22--ai03-staff-agent-context-inspector/CHANGE.md). Owner wants to inspect the Storyteller's **Library as a human-readable file workspace**, including Markdown source, changes and exact historic roots.

## Desired operator experience

From an authorized story/scene, click **Library at this checkpoint**. Display the pinned historical Library tree or **virtual** tree of logical document paths; browse folders, Markdown files, structured document metadata and source/version lineage, with safe formatted Markdown preview, original bounded raw text, object hashes, authors/provenance and differences between two scene roots. Show added/removed/modified files across scene 4→7 and detect where a character, memory or canon entry was introduced or changed. Provide direct links to the related scene, operation and Writer tool receipt where genuinely recorded.

Do not invent a writable physical folder hierarchy. **First verify** whether the canonical Library currently has real paths, keys, flat documents and root snapshots. A client-side navigation tree derived from stable virtual paths may be enough; nested database folders are *not selected*. Do not change the underlying CAS/object hash or snapshot format for UI convenience. Markdown names and directory display are not safe filesystem paths, authorization scopes or external links.

## Critical distinction: available vs actually read by agent

Library contents available at root R are not automatically the bytes present in the model's first request. AI03/AI02 will show *what was actually sent/read*; ADI02 will show **what was available at a pinned point**. When evidence links a model tool read to a document version, provide that relationship without implying all other files were seen. A hypothetical reassembly must use pinned roots, not today's latest Library.

## Privacy, costs, retention

Metadata-first view for permitted staff; raw Markdown, participant-private content and tool-created private documents are separately gated, purpose-bound and audited (reuse Admin's case/campaign binding). No general customer-support universal Library browser. Lazy per-document retrieval, bounded pagination and diff; no bulk raw export, unbounded CAS directory walk, search-index leak, executable embedded HTML/script or unsafe Markdown image requests. Existing owner-authorized deletion and retention continue applying. If an old CAS object or root was legitimately deleted, report unavailable rather than synthesize it.

## Future implementation boundary and proof

Build an **authorized read-only Admin projection** over existing document/root/history reader in `@offscreen/documents`, Story Engine or relevant owner, with a typed Nest Admin DTO and staff Web component. No new Library write API, no second document store, no schema migration to real nested directories by default. After ADI01 navigation and AI02/AI03 provenance design, source-map pinned root and publication identity; decide which document classes may be shown by each capability before implementation.

A disposable scene-7 Library viewer must show identical document versions when revisited after scene 10 has changed the current world; compare against scene 4 without future leakage. Unauthorized staff cannot learn forbidden filenames or directory counts. Not implemented, not approved for customer data access.
