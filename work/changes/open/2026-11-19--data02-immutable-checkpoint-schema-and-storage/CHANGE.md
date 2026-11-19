# DATA02 | Typed immutable checkpoint objects with SQL selector and atomic insert

**State:** Proposed · 2026-11-19  
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

## Reconciliation ledger (fill before Done)

| Authority | Target claim / no-op | Inspected source SHA and diff | Normal proof | Negative proof | Source link |
| --- | --- | --- | --- | --- | --- |
| Product/vision | unchanged | Pending | Pending | Pending | Pending |
| Data + fork owners | source-backed implementation | Pending | Pending | Pending | Pending |
| Canonical documents/context | bounded owner changes | Pending | Pending | Pending | Pending |
| Code/test or documentation-only | pending | Pending | Pending | Pending | Pending |

**Closure:** complete four-plane ledger, archive per workflow and repair inbound links. No auto-successor.
