# LIB03 | Content package ingestion ownership, without a second canonical store

**State:** Done (2026-11-24). Source-only ownership move. **Reference baseline:** `undertaking/storyteller-workshop@ed0837d0531be4050b40d9b2485b5759ef479fea` (packet recorded `abdce8d7457305baacd13971f116f343562999ff`; HEAD was ahead and an ancestor). **Integration:** `undertaking/storyteller-workshop`. **No cluster, provider, DB or content mutation.**

## Reconciliation ledger

| Affected selected claim/heading | Authority | Target delta (changed/unchanged; reason) | Source delta & inspected SHA | Status/evidence tier | Negative proof | Map/link update or N/A |
| --- | --- | --- | --- | --- | --- | --- |
| Authored world/rule/start import | technical `docs/technical/storyteller/canonical-documents-and-packages.md#campaign-bootstrap` | changed: directory import owner is `@offscreen/content-packages`; manifest codecs stay in Documents | `packages/content-packages/src/*-import.ts` from pre-join `ed0837d0531be4050b40d9b2485b5759ef479fea` | fixture-tested | symlink, duplicate normalized path, missing WORLD.md, oversize file, path traversal, invalid license rejected; content-packages 6/6 | authoring runbook links updated |
| Start instantiation | technical same heading | changed: `instantiateStartPackage` lives in Story Engine and still only stages objects | `packages/story-engine/src/stories/start-package-instantiation.ts` | fixture-tested | v2 path collision rejected; retry root equal; instantiation tests 3/3 | Documents barrel no longer exports it |
| Manifest hashes, storage, SQL | technical / code | unchanged: schema, local store, S3 store, trie, and migrations were not edited | `packages/documents/src/schema.ts` and stores untouched | fixture-tested | documents unit tests passed after the export removal | N/A |
| work/QUEUE.md | process | unchanged: LIB03 was an owner-commissioned parallel Change | same baseline | source-inspected | Current work line not rewritten | catalog link moves to archive |

## Decision and reason
Content packages are **authored source bundles**, not general-purpose libraries or campaign canon. Their import rules (WORLD.md, RULES.md, START.md, license, path allowances, activation, author operation) must not live in a generic immutable-document/storage implementation. Define a new inward-facing `@offscreen/content-packages` workspace for world, rule, start import + filesystem discovery only; it depends one-way on `@offscreen/documents`. Keep the existing package-manifest codecs, immutable store typed methods, trie, hash serializer and historical root formats in Documents: moving those would change a widely shared persistence contract for no benefit.

`instantiateStartPackage` is **not source ingestion**: it validates pinned world/rule sources, creates campaign-specific document IDs and provenance, merges story Library roots and produces activation entries. Its long-term owner is `@offscreen/story-engine` under `src/stories/start-package-instantiation.ts`, called from `stories/start.ts`. It must continue producing staged objects; Story Engine's transaction/publication path remains responsible for selecting roots, never the importer or S3 store.

**No compatibility back-export from `@offscreen/documents` to the new package.** Such a re-export would create a documents → content-packages → documents dependency cycle. Migrate every actual importer consumer at once with a staged atomic package-graph build. Importing a source bundle never mutates a live campaign; no new Pod, Catalog, Redis or Tool registry.

## Exclusive edits
`packages/content-packages/**` (new); `packages/documents/src/{index,world-import,rule-import,start-import,start-instantiation}.ts` (remove moved exports/sources, do NOT alter storage/schema/trie); `packages/documents/test/documents.test.mjs` (extract relevant importer/instantiation tests into their new owners, preserving fixtures); `packages/story-engine/src/stories/{start,start-package-instantiation}.ts`; exact direct consumers and manifests listed in SOURCE-MAP.md; workspace lockfile, scoped catalogs/docs and packet receipts. Touch source `schema.ts` only to resolve an independently verified post-LIB02 import issue, **stop** rather than rework that schema here. No SQL, migrations, world/rule/start manifest wire edits, bootstrap semantics, public endpoint changes, network or provider calls.

## Ordered implementation
T01 creates content-packages source/import test surface, migrates the three importer implementations unmodified, and removes only their Documents barrel exposure. T02 relocates start instantiation to Story Engine, importing Documents' stable primitives; campaign ID/root provenance output must be identical. T03 migrates all exact named callers/tests/dependency declarations; no facade or second implementation. T04 executes focused fixtures, negative tests, package graph/build and quality guard, reconciles docs and integrates through dedicated Change worktree.

## Invariants
Identical source bytes + IDs + operation IDs yield identical document hashes and manifest roots. Enforce current file-count, total bytes, per-file UTF-8, symlink/path-traversal, duplicate normalized path, WORLD/RULES/START orientation, license and engine pins. Imports cannot select a campaign head or bypass Story Engine. Keep v1/2 stored root and historical package references readable. A failed import may leave unreachable immutable objects, never a selected campaign root. Avoid broad filesystem rewrite, generic importer framework, duplicate path parser and new database table.

## Stop
If removal of legacy exports requires a circular dependency, a live consumer unlisted in SOURCE-MAP, a hash/shape change, or source migration conflicts with concurrent LIB02 edits, return exact symbols and unblock through ChatGPT. LIB03 is not TURN03 fork repair. No deploy is authorized.
