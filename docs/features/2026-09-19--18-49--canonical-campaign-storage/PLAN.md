# Canonical storage implementation plan

Feature: [Canonical campaign storage and Storyteller bundles](FEATURE.md).
Status: Prepared; next implementation starts C1. No runtime changes in this preparation pass.
Execution scope: local/offline canonical storage, narrative ownership transfer, creative bundles and inspection. No new approval gate between these phases; backend provisioning or provider spending remains outside that scope.
Implementation owner: the coding agent assigned the next implementation turn; one active owner per slice. Commit and push each coherent phase before moving on.

## Fixed design decisions

- [Concepts](../../concepts.md) is authoritative. Published source unit = passage; memory segmentation is a storage policy. No chapters or required scene-ending operation.
- [Canonical files](../../technical/canonical-files.md) owns the data contract: immutable objects, an immutable manifest, and a transactional published-root reference. Narrative bodies migrate to files; mechanical ledger state remains transactional.
- Start with shared ignored local `data/` storage, configured explicitly for API/worker. Keep the adapter replaceable. No bucket provisioning or embedding selection is needed for C1.
- Extend the single baseline migration and reset disposable saves per repository lifecycle rules. Remove replaced write paths rather than introduce permanent dual writes.

## C1 — Local document store and admitted revisions

Outcome: one descriptive canon document and its linked sources survive restart, support scoped reads and change through a conflict-checked commit.
Dependencies: none beyond existing authentication, campaign locks and outbox. Status: ready.

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

## C2 — File-owned passages and task capture

Outcome: the normal play surface and Storyteller read original prose through file references. Dependencies: C1. Status: queued.

Owners: application story initialization/history/snapshot reads, `storyteller/publication.ts`, `context.ts`, `memory.ts`, generation capture, and database narrative metadata. Follow imports from the [code map](../../engineering/code-navigation.md); keep public presentation DTOs stable where practical.

Move narrative bodies to immutable objects and retain ordering, ownership, operation/source identities and references in SQL. Stage required content before publication; recheck root and gameplay fences when selecting it. Capture exact source versions in tasks and preserve legacy current/arrival publication semantics until their owning flow changes. Report publication still cannot replace current choice authority.

Quiet activity receipts remain exact ledger entries. Materialize readable source bundles asynchronously with explicit coverage; tasks include the relevant unexported tail or hold for required evidence. Remove obsolete narrative-body writes and reset disposable saves instead of maintaining competing authorities.

Acceptance/QA: opening → three immediate decisions in one continuing scene → quiet activity → reload/history. Original source references remain readable, no chapter/scene closure is needed, and unavailable required prose has a named recovery state. Duplicate publication still creates one result.

Exit: file-owned published narration is used by actual gameplay and captured context. Memory Phase 1 can consume the document references.

## C3 — Versioned creative bundles

Outcome: voice, pacing, choice principles and examples are editable creative documents with a validated entry manifest. Dependencies: C1/C2 task references. Status: queued; can be implemented independently of memory retrieval after C2.

Owners: `packages/storyteller/src/profiles/index.ts`, `profiles/definitions/`, task request construction and creative-settings references. Existing profiles are already JSON files; evolve their representation without inventing personality rows or another agent runtime.

Compile selected bounded sections into the existing typed profile/task contract. Pin the bundle revision and source hashes. Keep executable schemas, tool authority and spending rules in application policy. Reject invalid bundle references before generation; failed edits leave the previous published bundle usable.

Acceptance/QA: revise a style section and compare newly captured versus already captured tasks; unrelated sections are not blindly injected; a story document cannot impersonate creative/system guidance.

Exit: two fixture styles run through the same bundle loader with reproducible task inputs and no provider calls.

## C4 — Recovery and connected handoff

Outcome: the store is inspectable and usable by the memory feature. Dependencies: C1–C3. Status: queued.

Owners: Chamber and `packages/application/src/developer-tools/qa-catalog.ts`; document store export/index hooks; permanent storage docs. Add document-tree/version/source/coverage evidence to the relevant QA cases. Keep the UI modest.

Acceptance/QA: discard the disposable index and rebuild metadata from committed roots; export the library; recover a failed required read/write; verify pinned old sources survive ordinary cleanup. Demonstrate a visitor identity established across several turns of one scene and later read by a fresh task. Memory retrieval/semantic quality is the dependent feature's exit, not claimed here.

Exit: durable storage decisions and actual evidence folded into permanent docs; remove this feature folder only when all four phases are delivered. No hosted rollout is required.

## Current checkpoint

- Base: `1240f49`; preparation changes documentation only.
- Exact next step: C1 schema/local-adapter/admitted-document slice; read the listed owners, implement it, maintain QA and commit/push before C2.
- Verification: existing source and design reviewed; no runtime checks or provider calls during preparation.
- Open implementation choices: internal module layout and bounded local manifest size; choose and record them inside C1. They do not reopen the product/storage decision. Hosted adapter and semantic model selection belong to later scoped work.
- Spend: $0 application-provider spend; cumulative account usage unverified.
