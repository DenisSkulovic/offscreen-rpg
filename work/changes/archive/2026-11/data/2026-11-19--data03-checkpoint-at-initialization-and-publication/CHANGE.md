# DATA03 | Commit exact scene checkpoint with opening and continuation

**State:** Done (2026-11-19). Supported openings and continuations insert the selector. A historical fork is not implemented.  
**Kind:** implementation  
**Execution:** Not part of currently active Kubernetes batch. Select individually or through explicitly approved safe batch.  
**Related:** [DISTURN program](../../../../../designs/open/distributed-turn-poc/README.md · [D2 data design](../../../../../designs/open/distributed-turn-poc/D2-SCENE-DATA-CONTRACT.md · [Gap register](../../../../../designs/open/distributed-turn-poc/GAPS.md

## Independently verifiable outcome

Make new committed scenes carry exact post-admission state and document root at their SQL publication point. Older scenes without checkpoints remain explicitly unsupported.

## Preconditions / source baseline

**Dependencies:** DATA02 and DATA01; DIST01 writer choice; coordinate with DIST05 Game Authority publication migration.

Inspected GitHub main 2026-11-19. `story` has the latest root, `storyPassage` preserves passage source, `storyDocumentCommit` tracks root revisions. `campaign` and other mechanics are mutable. `forks.ts` is explicitly restricted to current revision 1. `packages/documents` already has typed immutable content and both local/S3 adapters. Recheck HEAD, migrations, source symbol owners and running Cursor branches before implementation. This packet is not proof of actual complete snapshot storage.

## Exact bounded delta

Use packages/application/src/stories/{initialization,start,continuation,persistence,passage-documents}.ts to stage validated checkpoint object after constructing actual post-effect state, before short commit as needed, then insert checkpoint SQL selector atomically with storyPassage, storyDocumentCommit, items, current story root and outbox. Carefully handle staged S3 writes and SQL transaction scope; if mechanical side effects are only computed in SQL transaction, use a deterministic pre-stage + fence/recheck or a reconstructable DB-contained snapshot captured within TX with postcommit immutable finalize and a safe visibility fence. No provider or external object request under long story lock. Cursor must resolve this precise staged-objects vs transactional post-effect tension in selected contract and **stop on correctness conflict**, not simply reorder calls. Start scene 1 and later continuation code paths are both required for supported state families.

**Files / canonical documentation owners:** packages/application/src/stories/initialization.ts; packages/application/src/stories/start.ts; packages/application/src/stories/continuation.ts; packages/application/src/stories/persistence.ts; packages/application/src/stories/passage-documents.ts; packages/application/src/stories/scene-checkpoint.ts; packages/application/src/stories/index.ts; packages/application/src/storyteller/publication.ts; packages/application/test/scene-checkpoint-publication.test.mjs. No schema or migration: the merged `story_scene_checkpoint` selector can represent the opening and continuation rows. The technical owner `docs/technical/platform/data-and-persistence.md` is left for the orchestrator. The headings that still say the writers do not insert the row are `Story snapshot and chronology`, `Scene checkpoint v1`, `Publication fence`, and `Scene payloads`.

**Scope exclusions:** No new fictional economy, universally mandatory inventory, image generation, Stripe/subscriptions, global Cognee service, production HA, unbounded source rewrite, provider spend, database reset or unsupported rule mechanics. Do not mark a placeholder field dump complete until DATA01's mutable-table inventory proves completeness.

## Normal and negative acceptance

**Required proof:** Start → checkpoint1 with matching source/canon; one supported D&D-lite item effect + canon patch → checkpoint2 with post-effect item state; prior checkpoint stays byte-identical; duplicate/rollback/stale-root/SQL failure tests; no unbounded S3 under lock; legacy no-checkpoint read returns explicit unsupported.

**Discriminating negative:** No generation-created text can publish a new scene checkpoint before game effects are admitted. No half-published state/root, no latest-table replacement for missing history, and no inaccurate Done if a required mutable table was skipped.

Provide exact source refs and commit SHAs, schema/API examples, commands, test counts, actual provider-free or cluster evidence, and any not-run test. Run source-relevant checks and `pnpm wiki:change-guard --mode plan` / `--mode close` as supported; update actual STATUS only when runtime evidence exists.

## Parallel execution contract

Can design read-only while DATA02 is coded, but executable edits depend on DATA02 and share publication code with DIST05. Do not run in parallel writes to continuation.ts or storyteller/publication.ts.

The Cursor orchestrator may use isolated branches/worktrees for disjoint Ready packets, not execute unselected Proposed packets. No concurrent DB migration numbering, canon-owner heading edits, publication SQL edits or shared kind resources. Integrate, verify, reconcile and archive each Change independently.

## Four-plane planned impact

| Plane | Owner and intended effect | Evidence |
| --- | --- | --- |
| Product | **Unchanged**: text-first, D&D-like DM and fully reviewable/forkable scene promise, optional applicable possessions | No invented inventory/economy rules |
| Technical | Reconcile [data persistence](../../../../../../docs/technical/platform/data-and-persistence.md, [fork lifecycle](../../../../../../docs/technical/engine/lifecycle-and-compatibility.md, [canonical files](../../../../../../docs/technical/storyteller/canonical-documents-and-packages.md, [context selection](../../../../../../docs/technical/storyteller/context-selection-and-recall.md only where affected | Exact heading claims: current vs selected target vs demonstrated |
| Code | Scoped implementation in file owners above, with migrations only after compatibility review | Diff and regression tests |
| Related | Runbook/source maps/Change queue/dated evidence; no premature Done | Link guards, actual source checks |

## Implementation record

Supported openings and continuations stage `offscreen.scene-checkpoint.v1` on the caller-supplied document adapter before the short SQL transaction, then recheck the canon root and post-effect mechanics inside that transaction and insert the existing selector with the story row, passage, document commit, and outbox. Item effects are projected from the pre-lock rows. A failed `putSceneCheckpoint` throws before the transaction and does not fall back to another store. A store that has no checkpoint methods, such as the delayed test wrapper, skips the checkpoint and still commits. Scenes with a decision, a wait, a hold, an offer, an activity, a pending report, a world obligation, or items and no campaign row still commit and do not get a selector. No historical fork, search index, memory summary, provider call, or migration.

The same transition staged against the same passage object returns the committed continuation and does not insert a second selector. `packages/application/test/scene-checkpoint-publication.test.mjs` and `packages/application/test/scene-checkpoint.test.mjs` passed 7 tests, 0 failed, on disposable `offscreen_chamber_run_*` databases. No provider call was executed.

**State is Done.** `docs/technical/platform/data-and-persistence.md#scene-checkpoint-v1` now says the supported writers insert the selector. A historical fork is not implemented.

## Reconciliation ledger

| Affected selected claim/heading | Authority | Target delta (changed/unchanged; reason) | Source delta & inspected SHA | Status/evidence tier | Negative proof | Map/link update or N/A |
| --- | --- | --- | --- | --- | --- | --- |
| no product/technical behavior impacted | product | unchanged: the text-first scene promise and optional possessions stay as ratified; this packet does not edit a product page | packages/application/src/stories/continuation.ts at 707e6081, baseline d3ad620b | source-observed | a failed checkpoint put leaves no story row, so the product scene is not half-published | N/A |
| docs/technical/platform/data-and-persistence.md#scene-checkpoint-v1 | technical | changed: supported openings and continuations insert the selector | packages/application/src/stories/initialization.ts and packages/application/src/stories/continuation.ts at 707e6081 | fixture-tested | a failed object write leaves no story; a second publication does not add a checkpoint | heading updated on main |
| docs/technical/storyteller/canonical-documents-and-packages.md | technical | unchanged: the document schema and adapters were not edited; the writer uses the existing checkpoint object | packages/application/src/stories/scene-checkpoint.ts at 707e6081, baseline d3ad620b | source-observed | an unavailable object store does not fall back to a local store | N/A |
| packages/application/src/stories/continuation.ts | code | changed: supported scenes stage the checkpoint before the lock and insert one selector in the same commit | packages/application/test/scene-checkpoint-publication.test.mjs at 707e6081, baseline d3ad620b | fixture-tested | the same transition and root do not create a second checkpoint; a scripted wait still commits with no suggestion field | N/A |

**Closure:** the technical heading above is the orchestrator's edit. Do not archive this packet or set State to Done until that heading matches the writer. No auto-successor.
