# DATA04 | Historical scene read and independently forked game state

**Composer microtask entry (2026-11-20):** [TASKS.md](TASKS.md) is the selected microtask route *once the Change is authorized*; [all-open audit](../../../../COMPOSER-QUEUE-AUDIT-2026-11-20.md) records actual source tier and dependency. **Default parent/child model: Composer 2.5 Standard.** Delegation: test landed checkpoint-fork code and missing negatives, not a second fork schema. Don't interpret a task marked PLANNER-READY as permission to execute a Proposed Change, promote status or skip negative tests; novel architecture goes back to ChatGPT before a Grok exception.

**State:** Done · 2026-11-20
**Kind:** implementation  
**Execution:** Not part of currently active Kubernetes batch. Select individually or through explicitly approved safe batch.  
**Related:** [DISTURN program](../../../../../designs/open/distributed-turn-poc/README.md) · [D2 data design](../../../../../designs/open/distributed-turn-poc/D2-SCENE-DATA-CONTRACT.md) · [Gap register](../../../../../designs/open/distributed-turn-poc/GAPS.md)

## Independently verifiable outcome

Replace revision-1-only fork gate for newly checkpoint-complete scenes with a general as-of historical fork path, preserving safety for legacy incomplete scenes.

## Preconditions / source baseline

**Dependencies:** DATA01–DATA03; ARCH03 visibility/ancestry decisions; DIST03 owner-scoped GA API; document root campaign identity rule ratified.

Inspected GitHub main 2026-11-19. `story` has the latest root, `storyPassage` preserves passage source, `storyDocumentCommit` tracks root revisions. `campaign` and other mechanics are mutable. `forks.ts` is explicitly restricted to current revision 1. `packages/documents` already has typed immutable content and both local/S3 adapters. Recheck HEAD, migrations, source symbol owners and running Cursor branches before implementation. This packet is not proof of actual complete snapshot storage.

## Exact bounded delta

Implement a new owned historical scene read in packages/application/src/stories/reads.ts and API contracts in packages/contracts/src/stories* returning the exact frozen passage/appearance, scene-state projection and canon root from checkpoint (no live GET fallback). Extend packages/application/src/stories/forks.ts to accept source passage/sequence/hash and expected source identity, reconstruct supported game state, remap story-scoped activities/obligations/offer IDs or explicitly refuse unsupported active processes, pin inherited immutable ancestor knowledge safely, and create new story/initial branch checkpoint with atomically linked root. Preserve existing fork entry point and safe legacy refusal; expose GET + command through Nest/GA and adapt existing Living Book journal/React minimally for historical read/fork with disjoint query keys.

**Files / canonical documentation owners:** packages/application/src/stories/{forks,reads,index}.ts; packages/contracts/src/stories*; apps/api/src/modules/stories/controller.ts (GA client if migrated), apps/web/src/features/play or journal owners; docs/technical/engine/lifecycle-and-compatibility.md; docs/technical/client/architecture.md and product journal spec.

**Scope exclusions:** No new fictional economy, universally mandatory inventory, image generation, Stripe/subscriptions, global Cognee service, production HA, unbounded source rewrite, provider spend, database reset or unsupported rule mechanics. Do not mark a placeholder field dump complete until DATA01's mutable-table inventory proves completeness.

## Normal and negative acceptance

**Required proof:** Two scenes: sword transferred and king status revised in scene2; historical GET scene1 returns old state/root, fork scene1 retains sword/king-alive, parent remains modified, branch scene2 differs; repeat fork idempotently; deny cross-user/invalid checkpoint and unsupported active timer; journal read emits zero outbox/paid model writes.

**Discriminating negative:** No historical branch imports parent future state, no case where old passage uses current item tables; no authorizing commands from historic saved offer; no source-manifest campaignId mismatch disguised with duplicated mutable files.

Provide exact source refs and commit SHAs, schema/API examples, commands, test counts, actual provider-free or cluster evidence, and any not-run test. Run source-relevant checks and `pnpm wiki:change-guard --mode plan` / `--mode close` as supported; update actual STATUS only when runtime evidence exists.

**T01 VERIFY receipt (2026-11-20):** `packages/application/test/historical-fork.test.mjs` **2/2**; `packages/application/test/scene-checkpoint.test.mjs` **4/4**; `packages/application/test/scene-checkpoint-publication.test.mjs` **3/3**; **9/9 PASS** provider-free (historical-fork + scene-checkpoint family). Positive: scene-1 sword and living king; historical read and checkpoint fork with child campaignId and remapped IDs while parent scene-2 stays on parent. Negative in suite: wrong owner, bad/missing checkpoint, later live tables; checkpoint insert/rollback/S3/publication paths.

**Close receipt (2026-11-20, branch `change/data04-gap-negatives`, parent ef504d69):** `node --test test/historical-fork.test.mjs` **4/4 PASS**. The scene-1 read returns the frozen sword and living king, `canRespond` false, and the scene-1 canon root. The same read inserts no `outbox` row and no `generation` row. The fork keeps that scene while the parent stays on scene 2. Wrong checkpoint `storyId` and a non-empty `holds` blob fail as `invalid` / `checkpoint_hash_mismatch` with no child. Live revision-1 `continuityNotes: ['kept']` with no checkpoint fails as `conflict` / `fork_continuity_remap_required`. `sceneCheckpointSchema` only stores quiescent mechanics, so `fork_unsupported_active_work` is not a path the store can parse. `apps/web` `src/shared/api/list-page.test.ts` **3/3 PASS**: the historical scene query key is disjoint from the live history key. Private Game Authority transport stays [FORK01](../2026-11-20--fork01-private-game-authority-historical-fork/CHANGE.md). A cold cluster continuation stays TURN03. Those are separate packets.

## Parallel execution contract

Independent read DTO design while DATA03 writer is underway; actual fork SQL depends on DATA03. Coordinate Nest controller and Next client edits with DIST03/K8S11 through one integrator.

The Cursor orchestrator may use isolated branches/worktrees for disjoint Ready packets, not execute unselected Proposed packets. No concurrent DB migration numbering, canon-owner heading edits, publication SQL edits or shared kind resources. Integrate, verify, reconcile and archive each Change independently.

## Four-plane planned impact

| Plane | Owner and intended effect | Evidence |
| --- | --- | --- |
| Product | **Unchanged**: text-first, D&D-like DM and fully reviewable/forkable scene promise, optional applicable possessions | No invented inventory/economy rules |
| Technical | Reconcile [data persistence](../../../../../../docs/technical/platform/data-and-persistence.md), [fork lifecycle](../../../../../../docs/technical/engine/lifecycle-and-compatibility.md), [canonical files](../../../../../../docs/technical/storyteller/canonical-documents-and-packages.md), [context selection](../../../../../../docs/technical/storyteller/context-selection-and-recall.md) only where affected | Exact heading claims: current vs selected target vs demonstrated |
| Code | Scoped implementation in file owners above, with migrations only after compatibility review | Diff and regression tests |
| Related | Runbook/source maps/Change queue/dated evidence; no premature Done | Link guards, actual source checks |

## Reconciliation ledger

| Affected selected claim/heading | Authority | Target delta (changed/unchanged; reason) | Source delta & inspected SHA | Status/evidence tier | Negative proof | Map/link update or N/A |
| --- | --- | --- | --- | --- | --- | --- |
| docs/product/experience/return-and-journal.md | product | unchanged: a historic scene stays read-only and this close does not rewrite the journal promise | packages/contracts/src/stories.ts historicalSceneSchema canRespond literal false, inspected on change/data04-gap-negatives at 627f6fff | source-observed | historical read asserts canRespond false and adds no outbox or generation row | N/A |
| docs/technical/engine/lifecycle-and-compatibility.md#forked-continuities | technical | unchanged: the heading already names readHistoricalScene and createStoryForks for the quiescent checkpoint pair | packages/application/src/stories/reads.ts and packages/application/src/stories/forks.ts at 627f6fff | fixture-tested | wrong owner, bad checkpoint, corrupt holds, and live continuity notes fail closed in packages/application/test/historical-fork.test.mjs | heading already matches the landed reader and fork |
| docs/technical/platform/data-and-persistence.md#story-snapshot-and-chronology | technical | unchanged: the heading already says historical GET and checkpoint fork read the object and do not rebuild from live tables | packages/application/src/stories/reads.ts readHistoricalScene at 627f6fff | fixture-tested | scene-1 items stay with the character while live story_item holder is the rival | heading already states that boundary |
| docs/technical/storyteller/canonical-documents-and-packages.md#inherited-manifest-campaign-id | technical | unchanged: the branch manifest campaignId remains the fork story id | packages/application/src/stories/forks.ts writeBranchManifest at 627f6fff | fixture-tested | a checkpoint whose storyId disagrees with the SQL row is checkpoint_hash_mismatch and inserts no child | N/A |
| packages/application/test/historical-fork.test.mjs | code | changed: the close adds the zero-outbox and zero-generation count on the historical read, plus the story-id, corrupt-holds, and live continuity refusals | packages/application/test/historical-fork.test.mjs on change/data04-gap-negatives at 627f6fff | fixture-tested | 4 pass, 0 fail; no child story after the three refusals | N/A |
| apps/api/src/modules/stories/controller.ts | code | unchanged: GET :id/scenes/:sequence already calls readHistoricalScene in this process; the private Game Authority hop is FORK01 | apps/api/src/modules/stories/controller.ts historicalScene at 627f6fff | source-observed | a non-integer sequence throws StoryError invalid before the read | N/A |
| apps/web/src/shared/api/story-historical-query.ts | code | unchanged: the journal historical query key was already disjoint from the live history key | apps/web/src/shared/api/list-page.test.ts at 627f6fff | fixture-tested | vitest list-page.test.ts 3 pass; historical query key is not the live history key | N/A |

**Closure:** Done. The domain historical read and checkpoint fork are the outcome of this packet. Private Game Authority transport remains FORK01. A cold cluster continuation remains TURN03. No second fork schema.

exception: work/changes/README.md because the catalog row has to follow this packet out of open/.
exception: work/changes/CURSOR-OPEN-BACKLOG-HANDOFF-2026-11-20.md because the dispatch link has to follow this packet out of open/.
exception: work/changes/COMPOSER-QUEUE-AUDIT-2026-11-20.md because the audit link has to follow this packet out of open/.
exception: work/designs/open/distributed-turn-poc/GAPS.md because the program gap link has to follow this packet out of open/.
exception: work/designs/open/distributed-turn-poc/POC-READINESS-AUDIT-2026-11-19.md because the audit link has to follow this packet out of open/.
