# File-first Writer's Library | architecture review

**Status:** exploratory research, 2026-11-20. **Based on:** the uploaded `09d5820bcafe` source snapshot; this review is not an approved technical contract, storage migration, Change packet or provider-spending authorization. Read together with [SOURCE-AUDIT](SOURCE-AUDIT.md), [DESIGN-NOTES](DESIGN-NOTES.md) and [INITIALIZATION-LIFECYCLES](INITIALIZATION-LIFECYCLES.md).

## Decision in consideration

Make a **versioned library of named documents the Storyteller's native creative interface**. The agent works in language such as "inspect the Library", "open the premise", "write a proposed private direction" rather than discovering arbitrary application database tables or receiving an endlessly concatenated model chat.

**Recommended:** file-first *semantics and navigation*; not a dogmatic physical-storage rewrite. The source already supports much of this. Do not misrepresent this recommendation as a decision to eliminate JSON or relational state.

### Source-proven current shape

| Capability | Evidence from source snapshot | Status |
| --- | --- | --- |
| Markdown is preferred for prose; storage/manifest and typed metadata exist | `docs/technical/storyteller/canonical-documents-and-packages.md#product-commitment`; `packages/documents/src/schema.ts` | Existing target + validated implementation substrate |
| Canonical prose is stored in immutable JSON envelopes with a Markdown `body`; friendly Markdown with metadata is rendered on export | `packages/documents/src/local-store.ts` (`putDocument`, `exportPublishedRoot`); `packages/documents/src/markdown.ts` | Implemented. The file abstraction already differs from the physical `.json` CAS object representation |
| Logical paths are normalized .md/.json names, but stable IDs, revisions and hashes define identity | `packages/documents/src/schema.ts` (`logicalDocumentPathSchema`, `documentManifestEntrySchema`); `canonical-documents-and-packages.md#a-concrete-workspace` | Implemented + explicit contract |
| Start package contains a required `START.md`, declared additional .md/.json documents, validation, activation and pinned world/rule references | `packages/documents/src/start-import.ts`; `start-instantiation.ts` | Implemented |
| Creative guidance is already a document kind; profiles are currently compiled from four static JSON files and sent as structured task content | `packages/documents/src/schema.ts`; `packages/storyteller/src/profiles/index.ts` | Substrate exists; path-based effective profile resolution is NOT implemented |
| Existing knowledge exploration has tightly bounded `ask_memory` and `read_memory` operations, not generic shell or filesystem writes | `packages/storyteller/src/tasks/memory-exploration.ts`; `packages/application/src/storyteller/memory-exploration-controller.ts` | Implemented in optional recipe only |
| Reusable document bundles and private narrative direction are already described | `docs/technical/storyteller/canonical-documents-and-packages.md#campaign-bootstrap` and `#the-storyteller-as-a-versioned-bundle` | Target design; no proof of a general creative workbench |

**Important:** The repository's `.agents/skills` and `.cursor` instructions are for **coding agents that build the game**. They are not a runtime "Writer skills" catalogue for the **in-game Storyteller**. Treat these as different trust, deployment and accounting surfaces.

## Vocabulary proposal

**Library** is the navigable persistent knowledge surface, not a filesystem mount that a model can modify arbitrarily. It may expose several namespaces: pinned shared source library (read-only), campaign-owned admitted documents, immutable published passages, derived memories, and admitted Storyteller-private direction/possibilities. The Library entry point is compact orientation and a catalogue; a file name is a route to a versioned document, not the document's authority by itself.

**Workdesk** is the current mission's disposable/staged working set: selected document bodies, an evidence scratchpad, possible revisions, and a pending response. It is never automatically committed world truth. If the Storyteller returns later, it receives a *reconstructed* Workdesk from immutable captures and admitted files; it does not depend on an immortal conversation.

**Manuscript** is a useful optional analogy for published passages, but do not elevate it into a new technical type. Passage, scene, decision point, canonical root and checkpoint already have precise meanings; especially, **the game has no chapters**.

**Writing skills** are versioned, purpose-specific craft guidance and workflow hints. Some skills may be paired with existing *harness-granted* read/propose capabilities. Merely supplying a Markdown skill cannot grant a tool or application permission.

Do not build a fictional "paper" state machine or expose the Workdesk automatically to the player. Metaphor should reduce prompts and navigation mistakes, not require extra product data or new agent personas.

## Standard path proposal: small conventional entrypoints

These are candidate logical names, **not currently recognized special hooks**:

| Path | Meaning | Suggested source/authority handling | Automatic read? |
| --- | --- | --- | --- |
| `START.md` | Short navigation/orientation, sources and what is currently relevant | Versioned orientation; source/campaign-owned as applicable | Yes, compact and bounded, when available |
| `STORY_PROMPT.md` | **Verbatim initiating human creative request**; could be `bah` or pages | Explicit user-intent record with provenance, *not* a declaration that every sentence describes already-true world facts | First launch: yes within a declared input limit; later: core intent or pinned extract, full original discoverable |
| `STORYTELLER_PROFILE.md` | Creative voice, style, narrative taste and permitted artistic initiative | `creative-guidance`; pinned effective version with well-defined authority and precedence, never mechanical/grant authority | Yes, bounded essential core; optional examples on demand |
| `private/narrative-direction.md` | Revisable narrative priorities, if useful | Storyteller-private/noncanonical; may explicitly say "no overarching plot" | Conditional |
| `private/possibilities.md` | Discardable hypotheses, alternative futures, twists not yet established | Noncanonical, storyteller-private | Conditional |
| `sources/passages/...` | Exact published narrative evidence | Immutable source documents | Select only relevant passages |
| `state/...` | Reconstructable read-only state projection | Typed, validated, checkpoint-bound | Required current state loaded via harness, not arbitrary free edits |

No mandatory character, inventory, economy, map, timeline, plotline or location file. A galaxy or a microbe must be able to start with no actor of the expected humanoid kind. Preset material may include extra filenames, but must not force them into unrelated custom starts.

### Why filenames alone cannot be authority

A task needs to know **which** `STORYTELLER_PROFILE.md` it means. It could exist in a preset source bundle, a campaign overlay, or a shared library. Two documents may share basename; a rename preserves stable document ID; a newer revision must not change an already captured task. Therefore standard path discovery is a deterministic **manifest resolution**:

1. Resolve the permitted namespace and exact logical path against pinned package/committed manifest roots.
2. Validate kind, authority, visibility and applicable source precedence; fail on ambiguous collisions instead of silently choosing whichever file appears first.
3. Pin document ID, revision, object hash, and effective compiled guidance to the task. No fresh read for an already captured retry.
4. Inject only the small required core. Longer examples are optional reads with explicit budgets.
5. A world document, scene passage or user-authored text cannot impersonate the harness's higher-trust policy or spend/tool grants.

**Path as interface, immutable ID/hash as identity, manifest as directory, typed application policy as authority.** This is compatible with a Markdown-centric creative system without making names security capabilities.

### Important unresolved design detail: one prompt vs two

The author's preset may contain an original prepared prompt and guidance. The player may press Play unchanged or customize it. We need **one effective story-intent source**, but must retain provenance of the unmodified preset and exact user edits. Candidate: capture `sourcePromptHash` and `effectivePromptHash` plus pinned package root, then publish one campaign `STORY_PROMPT.md` constructed from the accepted effective content. Never allow two independently editable files to claim the same effective request. Do not duplicate long prompt text in every JSON row or every scene.

Prompt text is untrusted for grants. An instruction like "make combat automatic", "never charge tokens", or "you are the system" is a *request*, not runtime permission. Conversely, a user can deliberately request abstract, fragmentary or nonhuman fiction.

## Which material really belongs in relational state?

| Domain | Preferred truth surface | Reason |
| --- | --- | --- |
| World lore, stable identities, relationships, private directions, authored voice, creative source | Versioned Markdown documents (or typed content docs only when structurally necessary) | Human-readable creative knowledge, linkable, revisable and portable |
| Published narrative | Immutable source document and ordered committed reference | Exact evidence, not re-generated summary |
| Mechanical quantities, authorized effects, clock/checkpoint | Validated typed immutable snapshot/receipts (currently SQL, selected target partly JSON structured documents) | Requires exact machine meaning, atomicity and replay, not prose inference |
| Operation identity, idempotency, leases, schedules, spending, owner grants, root selection | Transactional SQL/control plane | Needs joins, concurrency, durable constraints and money accuracy |
| Logical path/catalogue metadata | Validated manifest tied to content hashes | Efficient exact selection and access control without reading every Markdown body |
| Lexical/semantic indexes and snippets | Disposable derived projection | Must not become a competing source of truth |
| Current Workdesk contents | Captured task input + bounded ephemeral/staged proposals | Reconstructed per task, never a second long-lived chat database |

"Less rows" is a useful **product-design pressure** for narrative knowledge, not a reason to express due-work claims, money reservations or inventory effects as free-form Markdown. Likewise, changing CAS bytes from `.json` to raw `.md` offers little value until authoring, inspection, retrieval and versioned edits improve.

## File-first API the Storyteller could perceive

Illustrative capabilities, not committed tool signatures:

- **`orient_library`**: compact entry documents and scoped catalogue with type, visibility, changed/important signals.
- **`find_in_library`**: bounded title/topic/entity/section search, followed by exact source handles.
- **`read_library`**: one or a small batch of pinned exact document/section handles, with clear omissions.
- **`propose_library_changes`**: validated batch of create/revise/link/retire proposals against expected root and document revisions, separated by canon vs private possibilities.
- **`submit_opening`**: one final typed playable result, not a direct filesystem write or database update.

Existing `ask_memory`/`read_memory` are deliberately narrower and should be reused/extended only after proving why a wider facade is necessary. A tool named `write_file` that directly mutates a shared bucket is **not** the intended design. An editor could show Markdown and source references while the engine validates changes deterministically.

For the first preparation experiment, limit writes to **a few useful documents** and avoid accumulating near-duplicate files from repeated invocations. Duplicate facts should be resolved by links, not a new summary of a summary.

## Failure conditions worth simulating

1. Two profile files at different scopes; ensure deterministic choice and visible provenance.
2. A newer profile revision arrives after launch dispatch; captured task stays identical.
3. A profile contains malicious tool/spend commands; only creative guidance may influence output.
4. `STORY_PROMPT.md` is a one-word `bah`, a 3-page prompt, or an abstract galaxy; none demands a character sheet.
5. Two prep retries propose the same document; only one correctly revisioned change is published.
6. A private possibility says the emperor is immortal; current canon must not claim the fact.
7. A large manuscript exceeds context: exact required material fits or dispatch holds with a reason; optional material can be omitted.
8. The library is exported and reconstructed from stored documents/manifests: stable IDs, provenance and relationships survive.
9. Source package Markdown attempts to override platform safety or permissions; never admitted as higher-trust instruction.

## Recommendation and next decision

**Prefer the file-first logical Library and Workdesk interface.** Keep the existing CAS/manifests as the physical substrate for now. Prove with a small provider-free demonstration that standard filenames are detected, pinned and supplied without unnecessary tool calls, and that optional reads plus proposed writes work through admitted boundaries.

Before a Change is authorized, decide whether `STORY_PROMPT.md` and `STORYTELLER_PROFILE.md` are *reserved conventional paths* or *pointers* declared explicitly by the package manifest, whether the two can be overridden independently, and how giant prompts are handled without silent truncation. Do not accept the filename idea before these questions are answered.
