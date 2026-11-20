# DATA04 | Historical scene read and independently forked game state

**Composer microtask entry (2026-11-20):** [TASKS.md](TASKS.md) is the selected microtask route *once the Change is authorized*; [all-open audit](../../COMPOSER-QUEUE-AUDIT-2026-11-20.md) records actual source tier and dependency. **Default parent/child model: Composer 2.5 Standard.** Delegation: test landed checkpoint-fork code and missing negatives, not a second fork schema. Don't interpret a task marked PLANNER-READY as permission to execute a Proposed Change, promote status or skip negative tests; novel architecture goes back to ChatGPT before a Grok exception.

**State:** In progress · 2026-11-19
**Kind:** implementation  
**Execution:** Not part of currently active Kubernetes batch. Select individually or through explicitly approved safe batch.  
**Related:** [DISTURN program](../../../designs/open/distributed-turn-poc/README.md) · [D2 data design](../../../designs/open/distributed-turn-poc/D2-SCENE-DATA-CONTRACT.md) · [Gap register](../../../designs/open/distributed-turn-poc/GAPS.md)

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

**T01 VERIFY receipt (2026-11-20):** `packages/application/test/historical-fork.test.mjs` **2/2**; `packages/application/test/scene-checkpoint.test.mjs` **4/4**; `packages/application/test/scene-checkpoint-publication.test.mjs` **3/3**; **9/9 PASS** provider-free (historical-fork + scene-checkpoint family). Positive: scene-1 sword and living king; historical read and checkpoint fork with child campaignId and remapped IDs while parent scene-2 stays on parent. Negative in suite: wrong owner, bad/missing checkpoint, later live tables; checkpoint insert/rollback/S3/publication paths. **Gaps (not asserted):** `unsupported_active_work`, `continuity_remap_required`, wrong `storyId` fork/read refusal. **NOT-RUN:** journal E2E and zero paid/outbox writes; GA historical fork (T02 → DIST03/BOOT03); T03/TURN03 cross-Pod continuation. `pnpm wiki:change-guard --mode plan --change` this packet → **ok, no findings**. Receipt does not promote Done.

## Parallel execution contract

Independent read DTO design while DATA03 writer is underway; actual fork SQL depends on DATA03. Coordinate Nest controller and Next client edits with DIST03/K8S11 through one integrator.

The Cursor orchestrator may use isolated branches/worktrees for disjoint Ready packets, not execute unselected Proposed packets. No concurrent DB migration numbering, canon-owner heading edits, publication SQL edits or shared kind resources. Integrate, verify, reconcile and archive each Change independently.

## Four-plane planned impact

| Plane | Owner and intended effect | Evidence |
| --- | --- | --- |
| Product | **Unchanged**: text-first, D&D-like DM and fully reviewable/forkable scene promise, optional applicable possessions | No invented inventory/economy rules |
| Technical | Reconcile [data persistence](../../../../docs/technical/platform/data-and-persistence.md), [fork lifecycle](../../../../docs/technical/engine/lifecycle-and-compatibility.md), [canonical files](../../../../docs/technical/storyteller/canonical-documents-and-packages.md), [context selection](../../../../docs/technical/storyteller/context-selection-and-recall.md) only where affected | Exact heading claims: current vs selected target vs demonstrated |
| Code | Scoped implementation in file owners above, with migrations only after compatibility review | Diff and regression tests |
| Related | Runbook/source maps/Change queue/dated evidence; no premature Done | Link guards, actual source checks |

## Reconciliation ledger (fill before Done)

| Authority | Target claim / no-op | Inspected source SHA and diff | Normal proof | Negative proof | Source link |
| --- | --- | --- | --- | --- | --- |
| Product/vision | Journal stays read-only for historic offers; fork is independent | Inspected `return-and-journal.md`; no product rewrite of inventory/economy | Journal query key disjoint from live snapshot | Historic `canRespond` is false | [Return and journal](../../../../docs/product/experience/return-and-journal.md) |
| Data + fork owners | Historical GET and checkpoint fork from the scene pair | `reads.ts` `readHistoricalScene`; `forks.ts` `fork` + preserved `forkCurrent` | T01: sword/king `historical-fork.test.mjs` **2/2** + checkpoint companions **7/7** | Partial: owner/bad checkpoint/live-table; **gap:** `unsupported_active_work`, `continuity_remap_required`, wrong `storyId` | [Forked continuities](../../../../docs/technical/engine/lifecycle-and-compatibility.md#forked-continuities) |
| Canonical documents/context | Branch manifest `campaignId` is the fork story id | `writeBranchManifest` in `forks.ts` | Fork manifest campaignId equals fork id in historical-fork positive | Invalid checkpoint hash / passage identity exercised; wrong `storyId` not isolated | [Inherited manifest campaign id](../../../../docs/technical/storyteller/canonical-documents-and-packages.md#inherited-manifest-campaign-id) |
| Code/test or documentation-only | Implementation + provider-free tests; packet stays open | Landed source per TASKS baseline; T01 receipt 2026-11-20 | **9/9** targeted application tests | Three fork-conflict negatives unasserted; Nest/journal not run | Nest `GET :id/scenes/:sequence` → T02/DIST03; journal key → not run |

**Closure:** packet stays **open**. T01 VERIFY records provider-free **9/9** on the historical-fork/scene-checkpoint test family only; not Done until gap negatives, T02 GA coordination, and T03/TURN03 continuation proof. Application tests are tier-1 proof, not journal E2E or Game Authority move. No auto-successor; no second fork schema under this packet.
