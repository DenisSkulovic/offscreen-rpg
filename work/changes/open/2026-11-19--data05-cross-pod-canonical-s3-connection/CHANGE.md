# DATA05 | Prove existing S3DocumentStore is shared across independently deployed Pods

**State:** Proposed · 2026-11-19  
**Kind:** implementation  
**Execution:** Not part of currently active Kubernetes batch. Select individually or through explicitly approved safe batch.  
**Related:** [DISTURN program](../../../designs/open/distributed-turn-poc/README.md) · [D2 data design](../../../designs/open/distributed-turn-poc/D2-SCENE-DATA-CONTRACT.md) · [Gap register](../../../designs/open/distributed-turn-poc/GAPS.md)

## Independently verifiable outcome

Weld existing canonical object-store adapter to Kubernetes app roles without designing a new document store or defaulting to Pod-local filesystem.

## Preconditions / source baseline

**Dependencies:** K8S05 S3-compatible runtime and K8S01; can work in parallel with DATA01/DATA02 except shared storage adapter files.

Inspected GitHub main 2026-11-19. `story` has the latest root, `storyPassage` preserves passage source, `storyDocumentCommit` tracks root revisions. `campaign` and other mechanics are mutable. `forks.ts` is explicitly restricted to current revision 1. `packages/documents` already has typed immutable content and both local/S3 adapters. Recheck HEAD, migrations, source symbol owners and running Cursor branches before implementation. This packet is not proof of actual complete snapshot storage.

## Exact bounded delta

Use packages/documents/src/{s3-store,document-store-config}.ts existing OFFSCREEN_DOCUMENT_STORE=s3 settings and app bootstrap wiring in apps/api/src and apps/worker/src. Add only necessary Kubernetes Secret/config and startup/missing-bucket checks for Nest, Game Authority and Storyteller reader with least privilege. Choose one bucket/prefix/region/endpoint and exact service DNS from K8S05; no public browser access and no committed credentials. Write a stable object+manifest from permitted writer Pod and read same verified hash from separately running reader Pod; restart each, verify historical hash, wrong key/denied read, missing bucket, absence of local fallback. If GA/Storyteller entrypoints not built, test with explicit isolated verification jobs and mark real integration pending.

**Files / canonical documentation owners:** infra/kubernetes/lab/ S3 wiring and probe job, packages/documents/src/document-store-config.ts only if required, app startup config in apps/api or future GA/Storyteller bootstrap, docs/runbooks and docs/technical/platform/data-and-persistence.md#selected-document-store.

**Scope exclusions:** No new fictional economy, universally mandatory inventory, image generation, Stripe/subscriptions, global Cognee service, production HA, unbounded source rewrite, provider spend, database reset or unsupported rule mechanics. Do not mark a placeholder field dump complete until DATA01's mutable-table inventory proves completeness.

## Normal and negative acceptance

**Required proof:** Fresh cluster with object store; write/read exact 64hex hash from two distinct workloads, restart, compare SHA, fail closed on bad creds/missing object; no cross-story prefix traversal. Record actual endpoint and storage persistence limitations.

**Discriminating negative:** No writable Pod-local docs directory as a second authority; no silent fallback from failed S3 to local; no model direct shell/bucket credentials.

Provide exact source refs and commit SHAs, schema/API examples, commands, test counts, actual provider-free or cluster evidence, and any not-run test. Run source-relevant checks and `pnpm wiki:change-guard --mode plan` / `--mode close` as supported; update actual STATUS only when runtime evidence exists.

## Parallel execution contract

Prepare env/config and proof scripts concurrently with DATA01/02 and DIST02/03; serialize actual shared cluster and overlapping S3 adapter changes. Dependencies only on storage infrastructure for final proof.

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
