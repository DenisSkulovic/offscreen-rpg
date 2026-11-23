# LIB03 | Move content-package import ownership out of generic Documents

**State: PROPOSED BACKLOG, PLANNER-BLOCKED. DO NOT COMMISSION CURSOR.** Baseline `484fd4a0`. Prerequisite: LIB01 vocabulary, LIB02 checkpoint decomposition and a full actual caller/export/fixtures map.

**Goal:** Separate world/rule/start package ingestion and validation policy from immutable document bytes and generic Library operations. Candidate long-lived owner: content-package domain or submodule, **not yet an approved new workspace**.

**Observed candidates:** `packages/documents/src/{world-import,rule-import,start-import,start-instantiation}.ts`; manifest definitions in `schema.ts` (world/rule/start); `packages/documents/src/index.ts`; consumers in `packages/contracts`, `packages/lab-support`, `packages/story-engine`, `apps/api`, `apps/game-authority`, `apps/worker`. Present source manifests declare `@offscreen/documents` at multiple layers. No assumption that they only import content-package code.

**Planner work before readiness:** inventory each exported symbol and import; choose domain ownership, whether within Documents folders or new workspace, exact old→new source/caller/test map and backward-compatible export strategy, package dependency direction and authored manifest/hash preservation. Preserve importer file caps, path traversal protections, reference pins and historical manifest decoding. Reject a new package if it would only contain wrappers and increase dependency cycles.

**Proof target:** unchanged import fixtures and pinned world/rule/start hashes, malformed path/size/schema negatives, all affected package typechecks and imports; no DB schema, source content mutation or package change as unplanned collateral. Stop if change would alter serialized content, library root or rule-pin semantics. This Change is only a recorded candidate until source-grounded TASKS are written and independently audited.
