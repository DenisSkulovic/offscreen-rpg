# DATA06 | Deliver branch- and checkpoint-pinned Storyteller context with bounded exact tools

**State:** Proposed · 2026-11-19  
**Kind:** implementation  
**Execution:** Not part of currently active Kubernetes batch. Select individually or through explicitly approved safe batch.  
**Related:** [DISTURN program](../../../designs/open/distributed-turn-poc/README.md) · [D2 data design](../../../designs/open/distributed-turn-poc/D2-SCENE-DATA-CONTRACT.md) · [Gap register](../../../designs/open/distributed-turn-poc/GAPS.md)

## Independently verifiable outcome

A remote Storyteller task receives exact mechanical state, current effective canon and relevant evidence from its own branch without fetching latest global revisions or requiring Cognee.

## Preconditions / source baseline

**Dependencies:** ARCH03 and ARCH05 detailed contracts, DATA03 checkpoint, DATA04 branch ancestry or a verified compatible test scope; DIST05 execution worker split.

Inspected GitHub main 2026-11-19. `story` has the latest root, `storyPassage` preserves passage source, `storyDocumentCommit` tracks root revisions. `campaign` and other mechanics are mutable. `forks.ts` is explicitly restricted to current revision 1. `packages/documents` already has typed immutable content and both local/S3 adapters. Recheck HEAD, migrations, source symbol owners and running Cursor branches before implementation. This packet is not proof of actual complete snapshot storage.

## Exact bounded delta

In packages/application/src/storyteller/{context-capture,execution} and packages/storyteller/src/tasks/{memory-exploration,document-changes}, add deterministic context-pack composer for captured (storyId,passageId,checkpointHash,canonRootHash,actor visibility) and a bounded memory facade on existing ask_memory/read_memory, no arbitrary model-visible filesystem. Resolve current identity/relationship/thread versions through pinned documentManifest entries, rank orientation and exact source handles, validate all returned evidence against branch root and actor knowledge, cap tokens/bytes/rounds and preserve unknown/partial markers. Wire to separate Storyteller worker through least-privilege read capability. Compare with existing one-shot behavior and do not add graph/vector/Cognee prerequisite.

**Files / canonical documentation owners:** packages/storyteller/src/tasks/{memory-exploration,document-changes}*, packages/application/src/storyteller/{context-capture,execution}*, packages/documents/src/schema.ts only if compatible versioned fields required; ARCH03/ARCH05 technical owners, tests.

**Scope exclusions:** No new fictional economy, universally mandatory inventory, image generation, Stripe/subscriptions, global Cognee service, production HA, unbounded source rewrite, provider spend, database reset or unsupported rule mechanics. Do not mark a placeholder field dump complete until DATA01's mutable-table inventory proves completeness.

## Normal and negative acceptance

**Required proof:** King alive at scene1/dead at parent scene2/fork from scene1: context and ask_memory return only branch-valid identity + source; source passage read via stable handle; missing/stale index falls back to exact manifest or explicit partial, never wrong; microbe no inventory; measured token and tool-call baseline.

**Discriminating negative:** Never leak future parent/sibling fact or private possibility; no silently changing SQL items from canonical prose; no extra paid research rounds unless budget/role recipe permits.

Provide exact source refs and commit SHAs, schema/API examples, commands, test counts, actual provider-free or cluster evidence, and any not-run test. Run source-relevant checks and `pnpm wiki:change-guard --mode plan` / `--mode close` as supported; update actual STATUS only when runtime evidence exists.

## Parallel execution contract

Read-only role/context planning can overlap DATA01–05. Executable tests await fork/scene pins; writing storyteller execution files must be coordinated with DIST05.

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
