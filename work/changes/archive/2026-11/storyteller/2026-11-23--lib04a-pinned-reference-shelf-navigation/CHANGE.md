# LIB04-A | Provider-neutral pinned reference shelf navigation

**State: Done.** Source-only. Live authorization was not run. **Baseline:** `undertaking/storyteller-workshop@abdce8d7457305baacd13971f116f343562999ff`. **Parent design:** `work/changes/backlog/agent-runtime/2026-11-23--lib04-mounted-reference-libraries/`. **Target:** same Undertaking branch. **Scope:** read-only source adapter and focused injected-reader tests; no Writer mission schema, database/Temporal, authentication endpoint, CLI, provider, cluster, migration or catalog changes.

## Decided capability
Implement `createPinnedReferenceShelfNavigation(input)` in NEW `packages/story-engine/src/storyteller/pinned-reference-shelf-navigation.ts`. It is a library-agnostic *domain read helper for already-authorized host callers*, not a public route or a model capability. Support at most 8 independent world source references (the v1 `worldPackageReferenceSchema` includes `mount`) plus one rules source named `rules` (not a v2 Library root). Host supplies trusted refs and an async `authorize({mount,kind,operation})` callback; the callback must be evaluated before every manifest/object read and returns `{privateDocuments:boolean,accessVersion:string}` or null. No default authorizer or permissive fallback.

The only operations: `browse({mount,prefix?,cursor?,pageSize?})`, `findPath({mount,query,cursor?,pageSize?})` (literal path substring, not body grep), and `read({mount,path,offset?,characters?})` with exact cited source identifiers. Never allow user/tool args to pass `rootHash`, `reader`, `authorize`, `tenantId` or `privateDocuments`. Validate source manifest identity (worldId/ruleSetId), root/revision, and rule engine against pinned refs before path lookup. Validate returned canonical document envelope against the manifest's ID/revision/kind/authority/visibility and hash membership before returning text. Developer-private material always denied; Storyteller-private requires grant. Empty results/errors must not leak private titles/counts.

All mounts are fully explicit and namespaced: world mount aliases and reserved rules alias; the same path in two mounts never shadows. Source references grant **identity**, not entitlement; authorization is always host-owned. The host must supply trusted actor/tenant/story scope; this helper does not derive privileges from a root hash. `read` supports only canonical Markdown/text source documents, not structured mechanical state nor arbitrary object hash probes. Existing `createPinnedLibraryNavigation` and Writer tool behavior unchanged.

## Limits and cursors
Max 128 visible returned entries/page; scan at most 512 manifest entries/call; max per-read 16,384 Unicode codepoints and total output 64 KiB per call. Manifests currently allow up to 4,096 entries: never assume all are <=256. Cursor is a validated, bounded, versioned continuation token binding mount, source root, prefix/query, last scanned path and current `accessVersion`. Cursor is untrusted input, must reauthorize and reject source/role mismatch, and does not grant access; it need not be cryptographically secret in this injected helper. If first 512 entries are private, a zero-result page may still return a continuation. Do not accidentally scan all 4096 per small page or loop forever on sparse visibility.

## Ownership and writes
Only NEW `packages/story-engine/src/storyteller/pinned-reference-shelf-navigation.ts`, a named new unit test under `tools/api-integration/test/pinned-reference-shelf-navigation.test.ts` (TS build resolves the Story Engine wildcard export), limited source-availability/readme docs and this packet/evidence. No modification to `writer-library-tools.ts`, `writer-mission.ts`, existing `library-navigation.ts`, Documents schemas/stores, game SQL, or published APIs. Reuse existing `@offscreen/documents` manifest/document schemas; do not copy them. If tests require direct import of the new Story Engine wildcard and existing TS project restrictions prohibit it, stop with exact error rather than adding a broad export framework.

## Exit
Focused tests demonstrate two world mounts + rules with overlapping paths, exact cite identity, privacy and grant revocation, negative forged cursor/root, corrupt manifest/envelope, pagination >128 and first private 512, invalid inputs/size cap. Typecheck Story Engine + api-integration, focused node test + changed-file quality. No live proof is implied. Integrate and archive only this slice; parent LIB04-B stays backlog planner-blocked. Stop for missing trusted authorization, cross-domain write need, or runtime schema/custody impact.

## Reconciliation ledger

| Affected selected claim/heading | Authority | Target delta and reason | Source delta & inspected SHA | Status/evidence tier | Negative proof | Map/link update |
| --- | --- | --- | --- | --- | --- | --- |
| packages/story-engine/src/storyteller/pinned-reference-shelf-navigation.ts | Code | changed: new read-only helper for at most eight pinned world mounts plus the reserved rules mount | createPinnedReferenceShelfNavigation on change/lib04-a-pinned-reference-shelf-navigation | source-only | Denied authorize performs zero store reads. A forged cursor root is invalid-cursor. Developer-private paths are absent from the page | packages/story-engine/README.md |
| tools/api-integration/test/pinned-reference-shelf-navigation.test.ts | Code | changed: injected-reader proof only. This is not a live authorization integration | node --test tools/api-integration/dist/test/pinned-reference-shelf-navigation.test.js passed 6/6 | source-only | Storyteller-private disappears when the grant is revoked. The first 512 private entries return an empty page and a continuation | No Writer mission test was added |
| packages/story-engine/README.md | Code | changed: the question table names the new helper | packages/story-engine/README.md | reviewed | The row does not claim a public route or a Writer tool | The existing storyteller wildcard export was reused |
| docs/product | Product | unchanged because no player-facing behavior, route, or story rule changed | No product page was edited | reviewed | A shelf read is not a play action | work/QUEUE.md stayed on DXK09 |
| docs/technical/storyteller/operation-and-controller.md | Technical | unchanged because Writer mission schemas, tool grants, and story-root navigation were not edited | writer-library-tools.ts and library-navigation.ts were not edited | reviewed | Full @offscreen/api-integration tsc is still blocked by missing sibling app builds and was not used as acceptance | LIB04-B/C remain backlog |

Declared paths:

- packages/story-engine/src/storyteller/pinned-reference-shelf-navigation.ts because this is the new helper
- packages/story-engine/README.md because discoverability names that helper
- tools/api-integration/test/pinned-reference-shelf-navigation.test.ts because the proof is injected
- STATUS.md because demonstrated source now includes this helper and still excludes live authorization
- work/changes/README.md because the catalog must point at the archive
- work/changes/backlog/agent-runtime/README.md because the parent design must keep B/C in backlog
- work/changes/backlog/agent-runtime/2026-11-23--lib04-mounted-reference-libraries/CHANGE.md because the parent link moves with the archive
- work/undertakings/storyteller-workshop/OVERVIEW.md because the undertaking status names this slice as integrated source

Receipt: `@offscreen/story-engine` `tsc --noEmit` passed. Changed-file ESLint quality passed. Focused test 6/6. `pnpm --filter @offscreen/api-integration build` was not a clean acceptance: that package project still fails on unrelated missing `@offscreen/admin`, `@offscreen/api`, and `@offscreen/lab-support` outputs. The new test file was compiled alone with the package's NodeNext settings and passed. No database, cluster, or provider call.
