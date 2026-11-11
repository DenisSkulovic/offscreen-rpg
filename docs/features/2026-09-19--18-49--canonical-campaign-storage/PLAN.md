# Canonical storage implementation plan

Feature: [Canonical campaign storage and Storyteller bundles](FEATURE.md).
Status: Implementation active. C1 is connected and the first C2 runtime ownership seam is implemented.
Execution scope: local/offline canonical storage, narrative and executable-state ownership transfer, creative bundles and inspection. The owner explicitly authorized this expanded file-first scope on 2026-09-20. No new approval gate between these phases; backend provisioning or provider spending remains outside that scope.
Implementation owner: the coding agent assigned the next implementation turn; one active owner per slice. Commit and push each coherent phase before moving on.

## Fixed design decisions

- [Concepts](../../concepts.md) is authoritative. Published source unit = passage; memory segmentation is a storage policy. No chapters or required scene-ending operation.
- [Canonical files](../../technical/canonical-files.md) owns the data contract: immutable objects, an immutable manifest, and a transactional published-root reference. Narrative bodies and executable game-state/receipt bodies migrate to files. PostgreSQL remains the atomic root selector and compact coordination/accounting control plane.
- Start with shared ignored local `data/` storage, configured explicitly for API/worker. Keep the adapter replaceable. No bucket provisioning or embedding selection is needed for C1.
- [Bounded-cost recipes](../2026-09-19--19-08--bounded-storyteller-cost/PLAN.md) constrain model-visible document reads and creative bundle assembly. Storage C1/C2 remains independently implementable; files do not authorize automatic summarization or recursive agent exploration.
- Extend the single baseline migration and reset disposable saves per repository lifecycle rules. Remove replaced write paths rather than introduce permanent dual writes.

## C1 — Local document store and admitted revisions

Outcome: one descriptive canon document and its linked sources survive restart, support scoped reads and change through a conflict-checked commit.
Dependencies: none beyond existing authentication, campaign locks and outbox. Status: implemented; connected passage ownership remains C2.

Owners/file map:

- A focused document-storage module/package owns immutable objects, manifests and the local adapter. Keep filesystem code outside `packages/game` and transport contracts.
- `packages/db/src/schema/stories.ts` plus the baseline migration own small root/commit references and deduplication metadata; no lore/identity body tables.
- Application document operations own admission; read `storyteller/context.ts`, `memory.ts`, `publication.ts`, `stories/persistence.ts` and outbox operations before connecting them.
- `packages/contracts/src/chamber.ts`, application `developer-tools/chamber-inspector.ts`, the API Chamber controller and web Chamber inspector own scoped developer inspection. Extend the existing local-only authorization boundary.

Bounded work:

1. Define validated document/envelope, source reference, manifest and change-set schemas. Stable IDs, expected revisions/root, logical paths, authority, visibility, source coverage and hashes have explicit meaning. Use descriptive/lore, source, derived memory and creative-guidance roles; no mandatory species or location shape.
2. Implement immutable put/read and bounded directory/section listing under a configured root. Define durability guarantees, size limits and root-confined path resolution. No host paths, arbitrary URLs or unrestricted storage credentials in model tools.
3. Stage and verify document objects plus candidate manifest outside a transaction. Under the campaign lock, recheck expected root/state, deduplicate by operation identity, select the new root and insert an indexing notice atomically. Same operation with different content conflicts.
4. Implement one application command for admitted descriptive changes and a read-only projection of existing source passages/receipts. Label the latter SQL-owned during C1. Validate references/authority and expose a readable diff; this command cannot apply mechanical effects.
5. Return explicit unavailable, stale, missing-source and forbidden outcomes. Emit correlated commit/read diagnostics without logging document bodies. Staged objects are invisible to normal readers.
6. Add local export with source/version metadata and Chamber inspection. Any later staging cleanup must preserve old versions referenced by retained history, tasks, sources and pending commits; do not delete unrecognized runtime files.

Acceptance/QA: restart/read one document; publish two related updates together; retry the same operation; reject a conflicting edit and a foreign-story handle; demonstrate unavailable required storage without repeating effects; inspect coverage of the projected receipts. These are manual QA stages with optional focused automated probes under repository policy.

Exit: a real application-admitted file version, not merely an export of an editable SQL lore row. No claim of model recall yet.

## C1b — Reusable world packages and pinning

Outcome: import a bounded authored world tree once, inspect it, and start multiple campaigns pinned to the same immutable package root while each campaign writes only its own overlay. Dependencies: C1. Status: queued; it precedes the full context-loading portion of C2.

Define world-package identity/root metadata separately from campaign manifests while reusing immutable document objects and storage adapters. Import Markdown/text and explicitly supported structured sources with stable IDs, provenance, path/size limits and deterministic section metadata; no model call is required. Require a bounded `WORLD.md` orientation or generate only a deterministic navigation projection—not invented lore. Campaign bootstrap stores exact mounted package/root references. Reads expose a merged view with provenance and explicit overlay authority, never last-write-wins canon merging.

Acceptance/QA: import a multi-page invented fixture world; pin two campaigns; retrieve a small relevant section under a constrained recipe; establish a campaign-local change; publish world package revision two; prove both campaigns remain on revision one until one explicitly repins. Missing package content has a named unavailable state. Export distinguishes shared package references from campaign-owned files. Include a tiny abstract or microbe world to reject assumptions that every package has nations, maps or humanoid characters.

Exit: extensive authored lore is a reusable canonical source rather than pasted into one premise, duplicated per campaign or assumed to exist in model memory.

## C1c — Reusable rule packages and bounded rule discovery

Outcome: replace the campaign's opaque rules string with an exact immutable rule-package reference whose readable pages are available to deterministic task recipes and bounded Storyteller inspection. Dependencies: C1. Status: foundation implemented; campaign pinning and context use are queued.

Define a rule-package manifest separately from world lore. Require a compact `RULES.md` orientation, stable topic tags on pages/headings, source sizes, immutable history and an exact executable-adapter identity/version. The adapter remains code authority; Markdown can explain or guide only mechanics that application validation supports. A local ruling overlay records provenance and precedence, while a rules change that affects formulas/effects requires a compatible adapter revision.

Create the default package from concise, properly attributed SRD 5.2.1 subset pages that correspond to implemented mechanics. Do not duplicate a Storyteller answer into another storage format or copy an entire rulebook into every prompt. Task recipes map known operation/mechanic tags directly to mandatory sections and expose a byte-counted topic catalogue. Optional reads select one exact page/heading under the shared operation allowance. Minimal/rich modes vary optional evidence, not authority.

Acceptance/QA: start two campaigns pinned to one default package; prove existing tasks remain pinned when revision two is published; reject a missing/mismatched adapter; inspect an ability-check task containing only its kernel and applicable sections; use a bounded extra read for an edge case; prove a lore-only magic statement cannot create a mechanic. Include a campaign with no calendar and an abstract protagonist to reject fantasy-world assumptions.

Exit: the Storyteller can efficiently consult canonical rules like a game master using indexed references, while executable outcomes remain reproducible in code.

## C1d — Reusable start packages

Outcome: an authored game start can pin world/rule roots and seed a coherent set of campaign-owned canonical documents without scenario-specific application branches. Dependencies: C1/C1b/C1c. Status: manifest, provider-free directory import, deterministic campaign-root staging and application selection/obligation activation implemented; connected abstract and conventional evidence plus reusable-revision pinning pass.

Define an immutable start-package manifest with stable identity/history, compact orientation, exact world/rule references and bounded starter entries. Entries classify instantiation authority as initial canon, private possibility or executable obligation. Enforce compatible kind/authority/visibility combinations so an anticipated storyline cannot masquerade as completed canon and a prose possibility cannot become a scheduled effect.

Instantiation publishes compact typed start/world/rule reference documents plus deterministic campaign-owned clones. Each clone cites its exact package document revision; shared package bodies are not copied. The document-store operation only stages a root. Application admission remains responsible for atomically selecting that root and activating any typed obligations once under the same retry identity.

The package may include maps or spatial references, locations, seeded characters, relationships, quests/threads, starting state and possessions, activities, conditions, possibilities and obligations. These are optional compositions of generic document kinds. A microbe start can omit maps, humanoids, named locations and quests entirely. Instantiation remaps campaign-owned identities deterministically, records package provenance, references shared package objects, and publishes one campaign root under the normal retry fence.

Acceptance/QA: instantiate a conventional authored start containing a map, three characters, two locations, a visible quest, a private possible antagonist arc and one conditional obligation; inspect their distinct authority. Instantiate the abstract microbe start through the same operation with none of those fantasy roles. Revise the reusable start and prove an existing campaign remains pinned. Retry creates neither duplicate characters nor obligations.

Exit: starts are reusable canonical content packages rather than fixture names interpreted by application code.

## C2 — File-owned passages and task capture

Outcome: the normal play surface and Storyteller read original prose through file references. Dependencies: C1. Status: active; direct story/Chamber initialization now publishes its opening as a source-passage object and normal list/snapshot/history/resolution/inspection reads dereference it. Storyteller publication and later passages remain to migrate.

Story creation is a bootstrap bundle, not a passage-only special case. Publish separate documents for the meaningful setup values present in that campaign. At minimum this includes orientation and opening source; add premise, every explicitly created character, settings/time/rules selection, initial item/possession state, current executable state and creative-bundle references when those inputs exist. Absence is meaningful: do not fabricate a calendar, humanoid biography, location or economy file for worlds without them. Promote later identities and topics through generic admitted document operations rather than a fixed fantasy folder checklist.

Reusable authored starts compose exact world/rule package pins with campaign-owned starter documents. Treat future-story material by authority: optional/expected arcs are private possibilities, while rule-required conditional or timed events are typed world obligations. Do not mark either as completed history, and do not convert a benchmark's famous plot into a universal mandatory progression system. The conventional-fantasy and microbe/abstract benchmarks must pass through the same bundle contract with different documents present.

File granularity must earn its retrieval cost. Separate content with distinct identity, authority, visibility, revision cadence or likely consumers; do not build giant mixed state/lore files, and do not atomize every scalar. Add compact headers/size/coverage inspection and section reads before broad context loading. Storage retention stays tier-independent, while task recipes choose a small or rich working set under the effective user/story/account policy. Acceptance compares useful selected evidence per transmitted byte across a minimal recipe and a deliberately rich recipe; neither “fewest tokens” nor “largest context” wins automatically.

Owners: application story initialization/history/snapshot reads, `storyteller/publication.ts`, `context.ts`, `memory.ts`, generation capture, and database narrative metadata. Follow imports from the [code map](../../engineering/code-navigation.md); keep public presentation DTOs stable where practical.

Move narrative bodies to immutable objects and retain ordering, ownership, operation/source identities and references in SQL. Stage required content before publication; recheck root and gameplay fences when selecting it. Capture exact source versions in tasks and preserve legacy current/arrival publication semantics until their owning flow changes. Report publication still cannot replace current choice authority.

Extend the existing Storyteller result contract without duplicate-format generation. The one accepted passage value is both the player-facing value and the input to deterministic Markdown/document serialization; the prompt must never request the passage again as storage prose. Bounded typed `propose_document_changes` operations carry only additional content or compact intent and cite the passage when it already contains the evidence. Application code turns that single passage value into its source document and validates optional descriptive changes against captured document revisions and sources. Do not add a mandatory extraction/summarization call after each turn, and do not publish the raw provider envelope, rejected output or unselected alternatives as canon. After each content owner moves, context construction must read its committed document version rather than a parallel SQL body.

Quiet activity receipts remain exact ledger entries. Materialize readable source bundles asynchronously with explicit coverage; tasks include the relevant unexported tail or hold for required evidence. Remove obsolete narrative-body writes and reset disposable saves instead of maintaining competing authorities.

Acceptance/QA: opening → three immediate decisions in one continuing scene → quiet activity → reload/history. Original source references remain readable, no chapter/scene closure is needed, and unavailable required prose has a named recovery state. Duplicate publication still creates one result.

Exit: file-owned published narration is used by actual gameplay and captured context. Memory Phase 1 can consume the document references.

## C3 — File-owned executable campaign state

Outcome: character, possessions, clock/settings, offers, active commitments, obligations and exact mechanical receipts are reachable from the committed manifest as validated structured documents. PostgreSQL contains only the compact fields necessary to fence commands, schedule due work, deduplicate operations and select the root. Dependencies: C1; implement after the passage publication seam establishes the shared commit primitive. Status: queued.

Start with one complete `state/current.json` snapshot and immutable receipt documents generated from the exact already-admitted application values—never by an LLM. Refactor reads to resolve the committed snapshot. Then move one command family at a time, deleting its superseded SQL JSON bodies in the same baseline change. Scheduling rows may retain IDs, revisions, due ticks/timestamps and state needed to claim work, but their definitions/results point to exact document hashes. Do not create a file per tick; publish a new bounded state snapshot and append meaningful receipts at admitted boundaries.

Acceptance/QA: initialize a campaign, select and settle one action, restart, and reproduce the exact character/possession/time/current-work state from the published root plus compact control rows. Retry changes neither state nor receipts; a stale root loses. Removing disposable scheduling/index projections and rebuilding them does not change game truth.

Exit: the migrated command family has no independently editable SQL JSON authority. Continue family-by-family rather than designing a universal event-sourcing framework.

## C4 — Versioned creative bundles

Outcome: voice, pacing, choice principles and examples are editable creative documents with a validated entry manifest. Dependencies: C1/C2 task references. Status: queued; can be implemented independently of memory retrieval after C2.

Owners: `packages/storyteller/src/profiles/index.ts`, `profiles/definitions/`, task request construction and creative-settings references. Existing profiles are already JSON files; evolve their representation without inventing personality rows or another agent runtime.

Compile selected bounded sections into the existing typed profile/task contract. Pin the bundle revision and source hashes. Keep executable schemas, tool authority and spending rules in application policy. Reject invalid bundle references before generation; failed edits leave the previous published bundle usable.

Acceptance/QA: revise a style section and compare newly captured versus already captured tasks; unrelated sections are not blindly injected; a story document cannot impersonate creative/system guidance.

Exit: two fixture styles run through the same bundle loader with reproducible task inputs and no provider calls.

## C5 — Recovery and connected handoff

Outcome: the store is inspectable and usable by the memory feature. Dependencies: C1–C4. Status: queued.

Owners: Chamber and `packages/application/src/developer-tools/qa-catalog.ts`; document store export/index hooks; permanent storage docs. Add document-tree/version/source/coverage evidence to the relevant QA cases. Keep the UI modest.

Acceptance/QA: discard the disposable index and rebuild metadata from committed roots; export the library; recover a failed required read/write; verify pinned old sources survive ordinary cleanup. Demonstrate a visitor identity established across several turns of one scene and later read by a fresh task. Memory retrieval/semantic quality is the dependent feature's exit, not claimed here.

Exit: durable storage decisions and actual evidence folded into permanent docs; remove this feature folder only when all four phases are delivered. No hosted rollout is required.

## Current checkpoint

- **Scope and phase:** C1 storage/import/read/commit foundation is implemented. The C1b/C1c/C1d world, rule and start-package foundations are connected. **C2 is partially implemented**: immutable passage objects, narrative publication and selected current-source reads work; other SQL-owned narrative/state, fork and lifecycle paths still need ownership transfer. **C3 `state/current.json` is staged as a schema/storage foundation only**, not the live authoritative mechanical state. C4 creative-bundle versioning and final C5 handoff remain future work.
- **Current authority:** PostgreSQL is the transactional owner of mechanical state, receipts, command deduplication and the selected document root. Immutable storage owns published passage bodies and admitted descriptive documents. Do not introduce dual current-state writers or treat an offline structured-state prototype as an implementation.
- **Implemented seams:** world/rule/start package imports pin immutable roots; exact selected rule/world headings are bounded by existing task/byte limits; Storyteller admission captures source/root revisions; admitted narrative/document publication checks root and story fences before committing. Consult [canonical files](../../technical/canonical-files.md), [application navigation](../../../packages/application/README.md) and [documents package](../../../packages/documents/README.md), rather than replaying old phase logs here.
- **Next action:** The [selected S3 continuity plan](../2026-09-21--21-56--story-mode-vvardenfell-continuity/PLAN.md) takes precedence. If it exposes missing exact world-section evidence, connect one bounded read at the owning task/admission layer. Separately resume C2 by tracing one remaining SQL-owned passage/state/fork operation and transferring ownership without widening the surface. Do not start generic autonomous retrieval, speculative semantic search or hosted storage.
- **Historical evidence:** The provider-free start-package integration path passed 4/4 tests in its recorded development slice, demonstrating source pinning, one root on idempotent Start and exact rule-section carriage. Those are not fresh tests or proof of later recall. The detailed prior checkpoint is preserved in [Git history](https://github.com/DenisSkulovic/offscreen-rpg/blob/05c60fb334e2432bde02197dfe18ab4f4773eff0/docs/features/2026-09-19--18-49--canonical-campaign-storage/PLAN.md).
- **Limits and spend:** no new verification or provider calls during documentation reconciliation; unknown current external account balance. Source progress/evidence must be rechecked before changing live authority.

