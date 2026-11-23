# LIB04 | Current ownership, exact gaps, future migration map

**Baseline:** uploaded source 484fd4a0 and remote LIB01 doc addition; source may move after LIB02/LIB03. No live tests executed by planner.

| Current source/symbol | What it really does | Decision |
| --- | --- | --- |
| `packages/storyteller/src/tasks/writer-mission.ts`: `writerMissionCaptureCommonFields`, `writerMissionCaptureV1Schema`, `V2OpeningSchema`, `V3ContinuationSchema`, `WRITER_MANDATORY_TOOL_NAMES` | One `libraryRootHash` + revision and fixed tools; continuation root must equal scene scope base root | Do not mutate v1/v2/v3 capture schemas. New v4 must separately pin mount set and grant identity |
| `packages/storyteller/src/tasks/writer-round-request.ts` | Serializes capture fields into provider wire | Must include exactly the approved new mount descriptors for v4; input budget, provenance and task hashing need examination |
| `packages/story-engine/src/storyteller/library-navigation.ts`: `createPinnedLibraryNavigation`, `entriesForCurrentAccess`, `browse`, `open`, `find`, `readByObjectHash` | Campaign-root-only; v2 uses trie, v1 manifest fallback; `entriesForCurrentAccess` returns only first 128 entries in v2 | Existing API stays legacy; new shelf view must be separate and fix full paged search, rather than using partial first-page helper |
| `packages/story-engine/src/storyteller/writer-library-tools.ts`: `createWriterLibraryToolExecutor`, `assertToolGranted`, `assertNoCapabilityElevation` | `library.*` anchored to one story root, rejects foreign root | Preserve hard check for legacy; new `shelf.*` operations require trusted alias lookup, never foreign-root override |
| `packages/story-engine/src/storyteller/writer-loop.ts` and `writer-research.ts` | Construct Writer library executor from pinned capture and host authorize | Future v4 entrypoint needs per-call read reauthorization and bounded result accumulation |
| `packages/story-engine/src/storyteller/writer-research-join.ts`: `verifyWriterResearchEvidenceCitation` | Requires evidence.rootHash === capture.rootHash, checks membership, visibility and section | A new citation schema must explicitly carry source mount identity; do not drop foreign-root rejection |
| `packages/story-engine/src/storyteller/canonical-knowledge.ts`: `loadCanonicalLibraries` | Already reads pinned world/rule manifests, uses bounded catalog and section handles | Reuse source validation and pin checks; do not duplicate a global indexing subsystem |
| `packages/documents/src/schema.ts`: `worldPackageReferenceSchema`, `rulePackageReferenceSchema`, world/rule manifests, library v2 root | Source references and document visibility exist; references are not ACL grants | Keep wire formats; no migration needed for A |
| `packages/documents/src/library-{page,trie,index}.ts` | Generic path lookup, pagination, immutable trie index | Reuse for story root; world/rule manifest adapters require distinct enumeration |
| `packages/documents/src/{local-store,s3-store}.ts` | Hash-verified object reads, typed manifests | No Redis / no external catalog |
| `packages/story-engine/src/stories/start.ts` and `packages/documents/src/start-instantiation.ts` at baseline | Validates pins, writes `world/references.json`, `rules/reference.json` in campaign root | Post-LIB03 ownership of instantiation changes; refs serve provenance, not permission |
| `packages/story-engine/src/storyteller/lexical-story-index.ts` | Existing lexical indexing/cache | Scope indexes to mounted source and actor grants, do not leak metadata across visibility |

## Critical missing implementation mapping before LIB04-B readiness
1. Every producer of `writerMissionCaptureSchema` and its persisted record / replay consumer (GA → SQL task → worker / Temporal → writer loop), including external typed event versioning and backwards decode paths.
2. Actor, owner and tenant authorization join for story source refs, entitlement to curated library content, revocation check owner, and test-fixture/test grant.
3. Provider request serialization, prompt packing budget and tooling response custody for new tool types and citation IDs; confirm no unknown-tool dispatch bypass.
4. Source-vs-story evidence checks in saved proposals / publication; any citation to reference material must remain attributed and cannot masquerade as committed story canon.
5. Versioned source mounting policy if shared source updates independently; pin immutable root at capture, opt-in upgrade only after new authorized capture.

**No new workspace package or SQL mount catalog selected for A/B.** If runtime sources reveal a second authoritative grant store is needed, escalate before coding. API, Web attach UI and arbitrary user supplied Libraries are LIB04-C, not B.
