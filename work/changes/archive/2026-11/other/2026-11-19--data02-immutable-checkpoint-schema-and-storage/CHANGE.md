# DATA02 | Typed immutable checkpoint objects with SQL selector and atomic insert

**State:** Done · 2026-11-19  
**Kind:** implementation  
**Execution:** Not part of currently active Kubernetes batch. Select individually or through explicitly approved safe batch.  
**Related:** [DISTURN program](../../../designs/open/distributed-turn-poc/README.md) · [D2 data design](../../../designs/open/distributed-turn-poc/D2-SCENE-DATA-CONTRACT.md) · [Gap register](../../../designs/open/distributed-turn-poc/GAPS.md)

## Independently verifiable outcome

Introduce a typed immutable scene checkpoint artifact and a SQL reference keyed by story and scene with its canon root, without yet altering all gameplay writers.

## Preconditions / source baseline

**Dependencies:** DATA01 ratified; can use existing LocalDocumentStore for unit/integration tests without Kubernetes.

Inspected GitHub main 2026-11-19. `story` has the latest root, `storyPassage` preserves passage source, `storyDocumentCommit` tracks root revisions. `campaign` and other mechanics are mutable. `forks.ts` is explicitly restricted to current revision 1. `packages/documents` already has typed immutable content and both local/S3 adapters. Recheck HEAD, migrations, source symbol owners and running Cursor branches before implementation. This packet is not proof of actual complete snapshot storage.

## Exact bounded delta

Implement schema version and size bounds for scene checkpoint in packages/documents/src/schema.ts and a dedicated put/read hash-verified API across packages/documents/src/{local-store,s3-store}.ts, maintaining existing content-addressed shapes. Add Drizzle table and generated migration in packages/db/src/schema/stories.ts (e.g. story_scene_checkpoint keyed by story ID + sequence, unique passage ID and transition/operation, content hash, canon root+revision, pins/schema version). Add a small GA-owned transaction helper to insert a fully staged checkpoint reference with expected story revision and root; reject nonidentical duplicates, never rewrite prior checkpoints. Explicitly validate content hashes and referential integrity. Use test-only fake state; **do not** fabricate a complete campaign snapshot from live DB yet.

**Files / canonical documentation owners:** packages/documents/src/{schema,local-store,s3-store,index}.ts; packages/db/src/schema/stories.ts; packages/db/migrations/*; packages/application/src/stories/ checkpoint helper; docs/technical/platform/data-and-persistence.md; docs/technical/storyteller/canonical-documents-and-packages.md; source READMEs and related tests.

**Scope exclusions:** No new fictional economy, universally mandatory inventory, image generation, Stripe/subscriptions, global Cognee service, production HA, unbounded source rewrite, provider spend, database reset or unsupported rule mechanics. Do not mark a placeholder field dump complete until DATA01's mutable-table inventory proves completeness.

## Normal and negative acceptance

**Required proof:** Provider-free immutable blob storage round-trip local+mock S3; wrong hash, missing blob and malformed state/schema rejected; SQL insert under transaction rollback leaves no checkpoint reference; repeated identical operation idempotent; same sequence/different hash conflicts; no current story state mutation.

**Discriminating negative:** Do not allow a DB row pointing at a missing/mismatched object to be considered valid. Never overwrite historical hash or permit file-store fallback from S3. Not an any-scene fork implementation.

Provide exact source refs and commit SHAs, schema/API examples, commands, test counts, actual provider-free or cluster evidence, and any not-run test. Run source-relevant checks and `pnpm wiki:change-guard --mode plan` / `--mode close` as supported; update actual STATUS only when runtime evidence exists.

## Parallel execution contract

Independent file owners from DATA05 S3 Kubernetes operational wiring if both use separate branches; coordinate changes to s3-store.ts and storage docs through one integration owner. Avoid same DB migration number as other agents.

The Cursor orchestrator may use isolated branches/worktrees for disjoint Ready packets, not execute unselected Proposed packets. No concurrent DB migration numbering, canon-owner heading edits, publication SQL edits or shared kind resources. Integrate, verify, reconcile and archive each Change independently.

## Four-plane planned impact

| Plane | Owner and intended effect | Evidence |
| --- | --- | --- |
| Product | **Unchanged**: text-first, D&D-like DM and fully reviewable/forkable scene promise, optional applicable possessions | No invented inventory/economy rules |
| Technical | Reconcile [data persistence](../../../../docs/technical/platform/data-and-persistence.md), [fork lifecycle](../../../../docs/technical/engine/lifecycle-and-compatibility.md), [canonical files](../../../../docs/technical/storyteller/canonical-documents-and-packages.md), [context selection](../../../../docs/technical/storyteller/context-selection-and-recall.md) only where affected | Exact heading claims: current vs selected target vs demonstrated |
| Code | Scoped implementation in file owners above, with migrations only after compatibility review | Diff and regression tests |
| Related | Runbook/source maps/Change queue/dated evidence; no premature Done | Link guards, actual source checks |

## Touched files

- packages/documents/src/schema.ts
- packages/documents/src/local-store.ts
- packages/documents/src/s3-store.ts
- packages/documents/test/scene-checkpoint.test.mjs
- packages/documents/README.md
- packages/db/src/schema/stories.ts
- packages/db/migrations/0012_data02_story_scene_checkpoint.sql
- packages/db/migrations/meta/_journal.json
- packages/db/README.md
- packages/application/src/stories/scene-checkpoint.ts
- packages/application/src/stories/README.md
- packages/application/test/scene-checkpoint.test.mjs
- docs/technical/platform/data-and-persistence.md
- docs/technical/storyteller/canonical-documents-and-packages.md
- work/designs/open/distributed-turn-poc/GAPS.md

`packages/documents/src/index.ts` already re-exports the schema and both stores, so it did not need an edit. Publication files were not edited. Provider calls were not run.

## Reconciliation ledger (fill before Done)

| Affected selected claim/heading | Authority | Target delta (changed/unchanged; reason) | Source delta & inspected SHA | Status/evidence tier | Negative proof | Map/link update or N/A |
| --- | --- | --- | --- | --- | --- | --- |
| docs/product/foundations/vision.md#scene-history-and-alternate-continuities | product | unchanged: the any-scene review and fork promise stays, and this change does not make a historical fork exist | docs/product/foundations/vision.md @ 24f0af40 | reviewed | A stored selector must not be read as a fork from scene 10 | No product edit |
| docs/product/experience/return-and-journal.md#scene-checkpoints-review-and-forks--long-term-target | product | unchanged: the journal still reads passage prose and does not restore a checkpoint | docs/product/experience/return-and-journal.md @ 24f0af40 | reviewed | Calling the journal a checkpoint would hide that it cannot restore a sword holder | No product edit |
| docs/technical/platform/data-and-persistence.md#story-snapshot-and-chronology | technical | changed: the quiescent payload is a content-addressed object and story_scene_checkpoint is the selector; publication still does not write it | packages/documents/src/schema.ts; packages/documents/src/local-store.ts; packages/documents/src/s3-store.ts; packages/db/src/schema/stories.ts; packages/application/src/stories/scene-checkpoint.ts @ 24f0af40 | fixture-tested | A missing blob, a mismatched hash, a different hash for the same sequence, and a rolled-back insert are rejected; the story row stays unchanged | Heading now names the object and the selector |
| docs/technical/storyteller/canonical-documents-and-packages.md#scene-rooted-canon-and-fork-safe-publication--selected-target-2026-11-19 | technical | changed: the checkpoint half of the pair now names the object and the selector; the Storyteller still does not commit either half | packages/documents/src/schema.ts; packages/application/src/stories/scene-checkpoint.ts @ 24f0af40 | fixture-tested | An S3 failure does not write the local store, and the helper does not update story | Cross-link to the story snapshot heading |
| docs/technical/engine/lifecycle-and-compatibility.md#forked-continuities | technical | unchanged: fork identity remap was not edited and forkCurrent still refuses a historical revision | packages/application/src/stories/forks.ts @ 24f0af40 | reviewed | A scene-10 fork must not be claimed from this selector | No edit |
| docs/technical/storyteller/context-selection-and-recall.md#fork-scoped-retrieval-and-task-input--selected-target-2026-11-19 | technical | unchanged: the read contract already requires the scene pair and this packet does not edit that page | docs/technical/storyteller/context-selection-and-recall.md @ 24f0af40 | reviewed | Editing the retrieval page here would race its owner | No edit |
| docs/technical/platform/execution-and-delivery.md#commands-business-events-and-workflows | technical | unchanged: delivery classes were not edited; the new selector is not an inbox or a second command bus | docs/technical/platform/execution-and-delivery.md @ 24f0af40 | reviewed | A checkpoint row must not be read as a delivered command | No edit |
| docs/technical/platform/http-api-and-client-contracts.md#service-calls-are-not-player-routes | technical | unchanged: no player route was added for the checkpoint | docs/technical/platform/http-api-and-client-contracts.md @ 24f0af40 | reviewed | A historical GET must not appear just because the selector exists | No edit |
| docs/technical/platform/security-and-trust-boundaries.md#boundary-map | technical | unchanged: the selected document store heading was not rewritten; checkpoint bytes stay content-addressed | docs/technical/platform/security-and-trust-boundaries.md @ 24f0af40 | reviewed | A checkpoint hash must not become a public or cross-story reveal | No edit |
| docs/technical/platform/topology.md#proposed-service-ownership | technical | unchanged: no new service owner was introduced; the engine helper is the only new writer of the selector | docs/technical/platform/topology.md @ 24f0af40 | reviewed | The Storyteller must not gain a checkpoint commit | No edit |
| packages/application/src/stories/scene-checkpoint.ts | code | changed: the helper inserts or reuses one selector and never updates story | packages/application/src/stories/scene-checkpoint.ts; packages/application/test/scene-checkpoint.test.mjs @ 24f0af40 | fixture-tested | Identical insert is idempotent; a different hash conflicts; rollback leaves no row; story_item stays empty | stories/README.md names the helper |
| packages/documents/src/schema.ts | code | changed: offscreen.scene-checkpoint.v1 stateSchemaVersion 1 rejects unknown keys and active work | packages/documents/src/schema.ts; packages/documents/test/scene-checkpoint.test.mjs @ 24f0af40 | fixture-tested | A hold, an offer, a decision plan, and schema version 2 fail parsing | documents/README.md names the object |

**Evidence:** provider was not called. `node --test test/scene-checkpoint.test.mjs` in packages/documents: 3 pass. `node --test test/documents.test.mjs test/scene-checkpoint.test.mjs`: 15 pass. `node --test test/scene-checkpoint.test.mjs` in packages/application: 4 pass, on a disposable `offscreen_chamber_run_*` database. Existing Postgres was started; its volume was not reset.

**Closure:** ledger complete. Archive this packet. No auto-successor. `work/changes/README.md` stays with the orchestrator.
