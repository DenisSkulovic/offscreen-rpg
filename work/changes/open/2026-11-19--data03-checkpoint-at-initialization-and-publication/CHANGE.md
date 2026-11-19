# DATA03 | Commit exact scene checkpoint with opening and continuation

**State:** Proposed · 2026-11-19  
**Kind:** implementation  
**Execution:** Not part of currently active Kubernetes batch. Select individually or through explicitly approved safe batch.  
**Related:** [DISTURN program](../../../designs/open/distributed-turn-poc/README.md) · [D2 data design](../../../designs/open/distributed-turn-poc/D2-SCENE-DATA-CONTRACT.md) · [Gap register](../../../designs/open/distributed-turn-poc/GAPS.md)

## Independently verifiable outcome

Make new committed scenes carry exact post-admission state and document root at their SQL publication point. Older scenes without checkpoints remain explicitly unsupported.

## Preconditions / source baseline

**Dependencies:** DATA02 and DATA01; DIST01 writer choice; coordinate with DIST05 Game Authority publication migration.

Inspected GitHub main 2026-11-19. `story` has the latest root, `storyPassage` preserves passage source, `storyDocumentCommit` tracks root revisions. `campaign` and other mechanics are mutable. `forks.ts` is explicitly restricted to current revision 1. `packages/documents` already has typed immutable content and both local/S3 adapters. Recheck HEAD, migrations, source symbol owners and running Cursor branches before implementation. This packet is not proof of actual complete snapshot storage.

## Exact bounded delta

Use packages/application/src/stories/{initialization,start,continuation,persistence,passage-documents}.ts to stage validated checkpoint object after constructing actual post-effect state, before short commit as needed, then insert checkpoint SQL selector atomically with storyPassage, storyDocumentCommit, items, current story root and outbox. Carefully handle staged S3 writes and SQL transaction scope; if mechanical side effects are only computed in SQL transaction, use a deterministic pre-stage + fence/recheck or a reconstructable DB-contained snapshot captured within TX with postcommit immutable finalize and a safe visibility fence. No provider or external object request under long story lock. Cursor must resolve this precise staged-objects vs transactional post-effect tension in selected contract and **stop on correctness conflict**, not simply reorder calls. Start scene 1 and later continuation code paths are both required for supported state families.

**Files / canonical documentation owners:** packages/application/src/stories/{initialization,start,continuation,persistence,passage-documents}.ts; packages/application/src/storyteller/publication.ts if selected writer migration requires it; packages/db schema/migrations only if DATA02 contract showed gaps; source tests and canonical data/publication docs.

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
| Technical | Reconcile [data persistence](../../../../docs/technical/platform/data-and-persistence.md), [fork lifecycle](../../../../docs/technical/engine/lifecycle-and-compatibility.md), [canonical files](../../../../docs/technical/storyteller/canonical-documents-and-packages.md), [context selection](../../../../docs/technical/storyteller/context-selection-and-recall.md) only where affected | Exact heading claims: current vs selected target vs demonstrated |
| Code | Scoped implementation in file owners above, with migrations only after compatibility review | Diff and regression tests |
| Related | Runbook/source maps/Change queue/dated evidence; no premature Done | Link guards, actual source checks |

## Reconciliation ledger (fill before Done)

| Authority | Target claim / no-op | Inspected source SHA and diff | Normal proof | Negative proof | Source link |
| --- | --- | --- | --- | --- | --- |
| Product/vision | unchanged | Pending | Pending | Pending | Pending |
| Data + fork owners | source-backed implementation | Pending | Pending | Pending | Pending |
| Canonical documents/context | bounded owner changes | Pending | Pending | Pending | Pending |
| Code/test or documentation-only | pending | Pending | Pending | Pending | Pending |

**Closure:** complete four-plane ledger, archive per workflow and repair inbound links. No auto-successor.
