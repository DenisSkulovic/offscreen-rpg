# DATA01 | Ratify complete scene checkpoint v1 and branch inheritance contracts

**State:** Ready for design reconciliation, not selected · 2026-11-19  
**Kind:** documentation  
**Execution:** Not part of currently active Kubernetes batch. Select individually or through explicitly approved safe batch.  
**Related:** [DISTURN program](../../../designs/open/distributed-turn-poc/README.md) · [D2 data design](../../../designs/open/distributed-turn-poc/D2-SCENE-DATA-CONTRACT.md) · [Gap register](../../../designs/open/distributed-turn-poc/GAPS.md)

## Independently verifiable outcome

Perform a field-by-field source inventory of every relevant mutable game state table, decide what constitutes a scene boundary, and finalize a versioned as-of checkpoint schema and SQL selector. Explicitly model branch ancestry and manifest campaign identity.

## Preconditions / source baseline

**Dependencies:** ARCH03 reconciled or coordinate its owners, and DIST01's Game Authority writer choice; no code or running cluster required.

Inspected GitHub main 2026-11-19. `story` has the latest root, `storyPassage` preserves passage source, `storyDocumentCommit` tracks root revisions. `campaign` and other mechanics are mutable. `forks.ts` is explicitly restricted to current revision 1. `packages/documents` already has typed immutable content and both local/S3 adapters. Recheck HEAD, migrations, source symbol owners and running Cursor branches before implementation. This packet is not proof of actual complete snapshot storage.

## Exact bounded delta

Inspect packages/db/src/schema/{stories,campaign,storyteller}.ts, packages/application/src/stories/{initialization,continuation,forks,reads}.ts, and packages/documents/src/schema.ts. Classify campaign character/location/storyFacts/clock/holds, storyItem, active activities/events/obligations, settings, offers, decision/wait plan, pending operations, rolls, receipts and source passage fields into: copied snapshot, reference to immutable earlier record, quiesced/rejected state, or excluded non-game data. For every included field specify stable ID, type validator, schema version, historical read and fork-ID remapping. Set a precise state/publication consistency fence and define whether a 'scene' includes an opening or other quiet boundaries. Resolve inherited manifest roots' campaignId mismatch (a fork's story ID differs from the ancestor's documentManifestSchema.campaignId). Record alternatives and selected POC subset without dropping the long-term any-scene promise.

**Files / canonical documentation owners:** docs/technical/platform/data-and-persistence.md#story-snapshot-and-chronology; docs/technical/engine/lifecycle-and-compatibility.md#forked-continuities; docs/technical/storyteller/canonical-documents-and-packages.md#scene-rooted-canon-and-fork-safe-publication--selected-target-2026-11-19; docs/technical/README.md; no executable files.

**Scope exclusions:** No new fictional economy, universally mandatory inventory, image generation, Stripe/subscriptions, global Cognee service, production HA, unbounded source rewrite, provider spend, database reset or unsupported rule mechanics. Do not mark a placeholder field dump complete until DATA01's mutable-table inventory proves completeness.

## Normal and negative acceptance

**Required proof:** A completeness matrix lists each mutable table/column and handling rule. Explain exact scene-1 and scene-2 payloads and an unstarted/no-inventory scenario. Show old scene state/canon root reconstruction and independent fork; document timer and active-work policies without handwaving.

**Discriminating negative:** An older scene cannot inherit today's sword holder, later king death, later game clock, or a future root. Unsupported active work cannot be silently cloned. A Storyteller markdown document is not authoritative inventory data.

Provide exact source refs and commit SHAs, schema/API examples, commands, test counts, actual provider-free or cluster evidence, and any not-run test. Run source-relevant checks and `pnpm wiki:change-guard --mode plan` / `--mode close` as supported; update actual STATUS only when runtime evidence exists.

## Parallel execution contract

Source-only analysis may run in parallel with infrastructure and DIST02/DIST03. Canonical lifecycle/persistence headings must be integrated by one owner with ARCH03/DIST01.

The Cursor orchestrator may use isolated branches/worktrees for disjoint Ready packets, not execute unselected Proposed packets. No concurrent DB migration numbering, canon-owner heading edits, publication SQL edits or shared kind resources. Integrate, verify, reconcile and archive each Change independently.

## Four-plane planned impact

| Plane | Owner and intended effect | Evidence |
| --- | --- | --- |
| Product | **Unchanged**: text-first, D&D-like DM and fully reviewable/forkable scene promise, optional applicable possessions | No invented inventory/economy rules |
| Technical | Reconcile [data persistence](../../../../docs/technical/platform/data-and-persistence.md), [fork lifecycle](../../../../docs/technical/engine/lifecycle-and-compatibility.md), [canonical files](../../../../docs/technical/storyteller/canonical-documents-and-packages.md), [context selection](../../../../docs/technical/storyteller/context-selection-and-recall.md) only where affected | Exact heading claims: current vs selected target vs demonstrated |
| Code | No executable change | Diff and regression tests |
| Related | Runbook/source maps/Change queue/dated evidence; no premature Done | Link guards, actual source checks |

## Reconciliation ledger (fill before Done)

| Authority | Target claim / no-op | Inspected source SHA and diff | Normal proof | Negative proof | Source link |
| --- | --- | --- | --- | --- | --- |
| Product/vision | unchanged | Pending | Pending | Pending | Pending |
| Data + fork owners | decision ratification | Pending | Pending | Pending | Pending |
| Canonical documents/context | bounded owner changes | Pending | Pending | Pending | Pending |
| Code/test or documentation-only | no executable diff | Pending | Pending | Pending | Pending |

**Closure:** complete four-plane ledger, archive per workflow and repair inbound links. No auto-successor.
