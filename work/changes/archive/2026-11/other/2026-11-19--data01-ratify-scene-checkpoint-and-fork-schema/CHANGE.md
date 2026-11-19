# DATA01 | Ratify complete scene checkpoint v1 and branch inheritance contracts

**State:** Done · 2026-11-19  
**Kind:** documentation  
**Execution:** Not part of currently active Kubernetes batch. Select individually or through explicitly approved safe batch.  
**Related:** [DISTURN program](../../../../../../designs/open/distributed-turn-poc/README.md) · [D2 data design](../../../../../../designs/open/distributed-turn-poc/D2-SCENE-DATA-CONTRACT.md) · [Gap register](../../../../../../designs/open/distributed-turn-poc/GAPS.md)

## Independently verifiable outcome

Perform a field-by-field source inventory of every relevant mutable game state table, decide what constitutes a scene boundary, and ratify a versioned as-of checkpoint contract. The logical selector is `(storyId, sceneSequence)`. Explicitly model branch ancestry and manifest campaign identity. This outcome is the logical contract. It does not add a SQL table, a migration, or a historical fork.

## Preconditions / source baseline

**Dependencies:** ARCH03 is already on this branch. ARCH02 is merged: the engine is the single consistency boundary for a future scene checkpoint. The Storyteller returns proposals and does not commit the checkpoint or the canon root. There is no Game Economy service and no second writer. DIST01 is not a blocker for this documentation contract. No code or running cluster is required.

Inspected GitHub main 2026-11-19. `story` has the latest root, `storyPassage` preserves passage source, `storyDocumentCommit` tracks root revisions. `campaign` and other mechanics are mutable. `forks.ts` is explicitly restricted to current revision 1. `packages/documents` already has typed immutable content and both local/S3 adapters. Recheck HEAD, migrations, source symbol owners and running Cursor branches before implementation. This packet is not proof of actual complete snapshot storage.

## Exact bounded delta

Inspect packages/db/src/schema/{stories,campaign,storyteller}.ts, packages/application/src/stories/{initialization,continuation,forks,reads}.ts, and packages/documents/src/schema.ts. Classify campaign character/location/storyFacts/clock/holds, storyItem, active activities/events/obligations, settings, offers, decision/wait plan, pending operations, rolls, receipts and source passage fields into: copied snapshot, reference to immutable earlier record, quiesced/rejected state, or excluded non-game data. For every included field specify stable ID, type validator, schema version, historical read and fork-ID remapping. Set a precise state/publication consistency fence and define whether a 'scene' includes an opening or other quiet boundaries. Resolve inherited manifest roots' campaignId mismatch (a fork's story ID differs from the ancestor's documentManifestSchema.campaignId). Record alternatives and selected POC subset without dropping the long-term any-scene promise.

**Files / canonical documentation owners:** docs/technical/platform/data-and-persistence.md#story-snapshot-and-chronology; docs/technical/engine/lifecycle-and-compatibility.md#forked-continuities; docs/technical/storyteller/canonical-documents-and-packages.md#scene-rooted-canon-and-fork-safe-publication--selected-target-2026-11-19. docs/technical/README.md, docs/technical/storyteller/context-selection-and-recall.md, STATUS.md, and the change queue stay untouched. No executable files.

**Scope exclusions:** No new fictional economy, universally mandatory inventory, image generation, Stripe/subscriptions, global Cognee service, production HA, unbounded source rewrite, provider spend, database reset or unsupported rule mechanics. Do not mark a placeholder field dump complete until DATA01's mutable-table inventory proves completeness.

## Normal and negative acceptance

**Required proof:** A completeness matrix lists each mutable table/column and handling rule. Explain exact scene-1 and scene-2 payloads and an unstarted/no-inventory scenario. Show old scene state/canon root reconstruction and independent fork; document timer and active-work policies without handwaving.

**Discriminating negative:** An older scene cannot inherit today's sword holder, later king death, later game clock, or a future root. Unsupported active work cannot be silently cloned. A Storyteller markdown document is not authoritative inventory data.

Provide exact source refs and commit SHAs, schema/API examples, commands, test counts, actual provider-free or cluster evidence, and any not-run test. Run source-relevant checks and `pnpm wiki:change-guard --mode plan` / `--mode close` as supported; update actual STATUS only when runtime evidence exists.

## Parallel execution contract

Source-only analysis may run in parallel with infrastructure and DIST02/DIST03. Canonical lifecycle/persistence headings must be integrated by one owner with ARCH03/DIST01.

The Cursor orchestrator may use isolated branches/worktrees for disjoint Ready packets, not execute unselected Proposed packets. No concurrent DB migration numbering, canon-owner heading edits, publication SQL edits or shared kind resources. Integrate, verify, reconcile and archive each Change independently.

## Ratified contract

Scene 1 includes the opening. The publication fence is the engine SQL transaction that writes that passage: `initializeStoryInTransaction` for scene 1, and `commitStoryContinuation` after `lockOwnedStory` for a later scene. The checkpoint is the post-admission mechanical state plus the canon root committed in that same transaction. The Storyteller does not commit either half. A clock tick, a book leaf, a viewer acknowledgement, and a search update are not scenes.

`offscreen.scene-checkpoint.v1` with `stateSchemaVersion` 1 is the logical payload. The long-term promise remains a review and an independent fork from any committed scene. The POC subset is a quiescent checkpoint only. Unsupported active work is rejected and is not replaced with the latest SQL rows. A fork mints new story-scoped UUIDs, keeps stable business keys, and writes a branch manifest whose `campaignId` is the fork story id. Ancestor manifest bytes stay immutable.

The current journal and `forkCurrent` do not store or reconstruct this checkpoint. No migration and no `story_scene_checkpoint` table were added. Provider calls were not run.

## Planned specification and implementation delta | planned-impact.v1

| Plane | Selected authority and exact change/no-op | Related documents/maps to inspect | Evidence/decision |
| --- | --- | --- | --- |
| Product | unchanged because the any-scene review and fork promise, with possessions only where that world uses them, stays on docs/product/foundations/vision.md#scene-history-and-alternate-continuities | docs/product/experience/return-and-journal.md#scene-checkpoints-review-and-forks--long-term-target | The product text already says historical forks are not implemented |
| Technical | changed: logical field inventory, publication fence, fork id remap, and manifest campaignId on docs/technical/platform/data-and-persistence.md#story-snapshot-and-chronology, docs/technical/engine/lifecycle-and-compatibility.md#forked-continuities, and docs/technical/storyteller/canonical-documents-and-packages.md#scene-rooted-canon-and-fork-safe-publication--selected-target-2026-11-19 | docs/technical/storyteller/context-selection-and-recall.md#fork-scoped-retrieval-and-task-input--selected-target-2026-11-19 | Source-observed schema at af512d1f; no table added |
| Code | unchanged because this documentation contract authorizes no executable modification and the inspected schema files stay at af512d1f | packages/db/src/schema/stories.ts, packages/db/src/schema/campaign.ts, packages/application/src/stories/forks.ts | No source behavior changed |
| Related | unchanged because docs/technical/storyteller/context-selection-and-recall.md#fork-scoped-retrieval-and-task-input--selected-target-2026-11-19 already states the pair and this packet does not edit it; work/changes/README.md and work/designs/open/distributed-turn-poc/GAPS.md stay with the orchestrator | docs/technical/README.md | Queue and index edits are outside this packet |

## Reconciliation ledger

| Affected selected claim/heading | Authority | Target delta (changed/unchanged; reason) | Source delta & inspected SHA | Status/evidence tier | Negative proof | Map/link update or N/A |
| --- | --- | --- | --- | --- | --- | --- |
| docs/product/foundations/vision.md#scene-history-and-alternate-continuities | product | unchanged: the any-scene fork promise and the statement that historical reconstruction is not implemented remain the product claim | docs/product/foundations/vision.md @ af512d1f | reviewed | A field inventory must not be read as proof that a historical fork already runs | docs/product/experience/return-and-journal.md#scene-checkpoints-review-and-forks--long-term-target stays the experience statement of the same promise |
| docs/product/experience/return-and-journal.md#scene-checkpoints-review-and-forks--long-term-target | product | unchanged: the journal still says the basic reader is passage prose and historical forking is not implemented | docs/product/experience/return-and-journal.md @ af512d1f | reviewed | Labeling the current journal as a checkpoint would hide that it cannot restore a sword holder | No edit; the technical inventory is the schema the journal page already defers to |
| docs/technical/platform/data-and-persistence.md#story-snapshot-and-chronology | technical | changed: scene 1 includes the opening, the fence is the engine transaction, and each inspected mutable column is copied, referenced, rejected, or excluded | packages/db/src/schema/stories.ts @ af512d1f; packages/db/src/schema/campaign.ts @ af512d1f; packages/db/src/schema/storyteller.ts @ af512d1f; packages/documents/src/schema.ts @ af512d1f; no source behavior changed | source-observed | An older scene must not inherit today's sword holder, a later clock, or a future canon root; a markdown document is not item authority | Contract-dependency rows point at the fork and canon headings. No SQL table added |
| docs/technical/engine/lifecycle-and-compatibility.md#forked-continuities | technical | changed: a fork mints story-scoped UUIDs, keeps stable business keys, re-anchors the clock, and refuses unsupported active work | packages/application/src/stories/forks.ts @ af512d1f; no source behavior changed | source-observed | A fork from scene 10 must still see the king alive when parent scene 20 has recorded the king dead; active work is not cloned as finished | Links to the field inventory and the manifest campaign id heading |
| docs/technical/storyteller/canonical-documents-and-packages.md#scene-rooted-canon-and-fork-safe-publication--selected-target-2026-11-19 | technical | changed: the fork writes a branch manifest whose campaignId is the fork story id and reuses ancestor object hashes; ancestor bytes stay immutable | packages/documents/src/schema.ts @ af512d1f; packages/application/src/stories/passage-documents.ts @ af512d1f; no source behavior changed | source-observed | Copying the ancestor campaignId into the fork manifest would claim the fork authored the parent documents | Prose-is-not-inventory heading states a markdown body cannot move story_item |
| docs/technical/storyteller/context-selection-and-recall.md#fork-scoped-retrieval-and-task-input--selected-target-2026-11-19 | technical | unchanged: that read contract already requires scene 10's pair and already says the journal and current-only fork do not reconstruct it | docs/technical/storyteller/context-selection-and-recall.md @ af512d1f | reviewed | Editing the retrieval page here would race the owner of that heading | Left untouched on purpose |
| docs/technical/platform/execution-and-delivery.md#commands-business-events-and-workflows | technical | unchanged: the proposed service schema heading on the persistence page was not rewritten, so delivery classes stay as written | docs/technical/platform/data-and-persistence.md#proposed-service-schemas-and-delivery-records @ af512d1f | reviewed | A checkpoint inventory must not become a second writer for a story item | No edit to the execution page |
| docs/technical/platform/http-api-and-client-contracts.md#service-calls-are-not-player-routes | technical | unchanged: player HTTP replay stays on the frozen operation id; this packet does not add a checkpoint route | docs/technical/platform/http-api-and-client-contracts.md @ af512d1f | reviewed | A historical read must not be described as an HTTP route that repairs state | No edit |
| docs/technical/platform/http-api-and-client-contracts.md#frozen-operation-identity | technical | unchanged: five-owners command identity was not edited, so a retry still reuses the captured operation | docs/technical/engine/lifecycle-and-compatibility.md#five-owners @ af512d1f | reviewed | A fork transition id must not reuse the parent transition id | No edit |
| docs/technical/platform/security-and-trust-boundaries.md#boundary-map | technical | unchanged: the selected document store heading was not edited, so content-addressed bytes stay the store contract | docs/technical/platform/data-and-persistence.md#selected-document-store @ af512d1f | reviewed | A fork manifest alias must not become a public or cross-story reveal | No edit |
| docs/technical/platform/topology.md#proposed-service-ownership | technical | unchanged: who owns the durable record, and quantities and ownership, were not edited; the engine remains the only checkpoint writer | docs/technical/platform/data-and-persistence.md#who-owns-the-durable-record @ af512d1f | reviewed | Naming a future checkpoint must not create a Game Economy service | No edit |
| packages/application/src/stories/forks.ts | evidence | unchanged: no executable modification is authorized; forkCurrent still accepts only revision 1 while it is current | packages/application/src/stories/forks.ts @ af512d1f; packages/application/src/stories/reads.ts @ af512d1f; no source behavior changed | source-observed | Inspecting forkCurrent must not be reported as a stored scene-10 checkpoint | No package, test, or migration edited |

**Closure:** Ledger filled from the source inventory at af512d1f. `pnpm wiki:change-guard` and `python3 scripts/check_docs.py` are the checks. Provider calls were not run. The orchestrator archived this packet and repaired the queue and gap-register links. No auto-successor.
