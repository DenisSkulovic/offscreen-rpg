# WR07B | Planner readiness and discriminating proof

**Review basis:** current undertaking source inspected 2026-11-21 after WR05P1, WR07M and WR08A. Detailed actual function/symbol map in [SOURCE-MAP](POST-MA06A-SOURCE-MAP.md), chosen algorithm in [EXECUTION](POST-MA06A-EXECUTION.md). Source inspection is not test execution.

## Readiness as of 2026-11-21

- **G0 — PENDING, genuine predecessor contracts:** WR05P2 (v2 scene-one publication API), WR07N (v2 final proposal union), WR07L (ledger insert/status SQL) are still running. Must re-read their exact landed exports before READY, not leave discovery to Composer.
- **G1 — PASS for source map:** public URI/body DTO, Web lost-PUT behavior, GA local/remote auth, initialization, Writer mission/step/custody, worker outbox, source Library v2 and incumbent tests inspected.
- **G2 — PASS at algorithm level:** owner TEXT migration scoped to v2 capture + SQL, no UUID alias, owner-scoped client ID vs globally unique reserved story worker ID, stable generationId/outbox, typed final scene, direct GA commit, no phantom story.
- **G3 — PASS at planned task level:** six bounded owner slices have code entrypoints, payloads, positive/negative tests and no redesign invitations. Release after predecessor type check; any truly new join symbols get updated anchors.
- **G4 — PENDING release:** source pin of T01 shall use landed WR07N `writerMissionCaptureV2OpeningSchema`; T02 WR07L ledger; T04 WR05P2 publisher. First executable T-ID T01 once all are verified.
- **G5 — PASS for internal order; no parallel implementation claim:** one WR07B parent executes serial T01→T02→T03→T04→T05→T06; join across GA, worker, SQL and Web too coupled to dispatch separate Cursor Changes without an authority split. WR06 or WR04 may be commissioned in parallel only after a fresh write-set/migration/test resource matrix; never share one disposable DB.
- **G6 — SPECIFIED, UNRUN:** zero-cost scripted E2E from `BAH`, immutable prompt root, one generation+attempt, v2 checkpoint/first passage+ready same TX; foreign user 404, duplicate owner request, changed 409, two users same client UUID but different reserved story IDs, CAS/source failure, missing/expired owner grant, provider uncertain, worker restart, duplicate wake, no partial SQL/outbox. V1 Writer mission replay unchanged.
- **G7 — PASS for intended closure scope:** deliver real scripted Launch backend with honest feature gate and status. Default provider still disabled without authorized transport; this limitation remains visible as a whole-undertaking Gate, not hidden under the WR07B archive.

## Explicit risk ledger for future release

1. Existing `writerMissionCaptureV2OpeningSchema.ownerId=z.uuid()` and SQL `storyteller_writer_mission.ownerId uuid` mismatch authenticated string `user.id` and GA actor regex. Must migrate without data loss or owner re-mapping.
2. Existing `storytellerOperation` requires accountId/runId. Test-only synthetic funding must be restricted to verified disposable DB; production missing grant is held, never implicitly funded.
3. Existing `writer-loop.ts:runWriterMissionModelRound` accepts a **scriptedDecisionBody**; real provider pipeline remains independent, requires explicit authorized funding and is mandatory for full LLM Storyteller operating claim.
4. WR07L client UUID key is **(ownerId,operationId)**; outbox only contains a UUID. Must use globally unique **reservedStoryId** for worker lookup, or risk cross-owner ambiguity.
5. Existing `stories/passage-documents.ts:stageStoryBootstrapDocuments` constructs v1 manifest. Initial Writer source root requires **Library v2** via `createEmptyLibraryIndex/applyLibraryBatch`; never feed v1 manifest into Workdesk.
6. `initializeStoryInTransaction` chooses passage UUID from staged document or random; must preserve ledger's reserved passage ID and check identity before ready.
7. WR08A Web `hashStoryLaunchRequest` hashes plain JSON.stringify while WR07L server uses canonical sorted JSON with trailing newline. Must standardize through a pure browser-safe Contracts serializer and positive/negative parity tests before enabling Launch.\n8. Known budget concurrency diagnostic failed on MA06A baseline and writer custody has conservative global uncertain-attempt check; neither may be weakened to produce a green test. Scope, prove and fix any real provider-spend bug before live enablement.

**Verdict:** PLANNER-DESIGNED, **NOT READY** until source checks G0/G4 after the three current Cursors integrate. No need for fresh product-level architecture negotiation unless their implementation contradicts the decided contract.
