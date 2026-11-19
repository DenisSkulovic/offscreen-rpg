# ARCH03 | Branch-scoped Storyteller knowledge and scene-root architecture

**State:** Proposed (2026-11-19)  
**Kind:** documentation  
**Owner direction:** Selected product invariant: every committed scene is a historically reviewable state and a possible fork point; the Storyteller is a D&D-style DM able to maintain and retrieve complex canon without altering mechanical authority.  
**Selection:** Not selected; planning packet only. No tool, vendor, schema migration, provider spend, or code execution authorized.  
**Parent program:** [Distributed architecture laboratory](../../README.md#distributed-architecture-laboratory-new-2026-11-19)

## Outcome

Define a **falsifiable, versioned scene-knowledge contract** so game state, descriptive canon, exact source scenes and derived retrieval remain correct for arbitrarily long stories and for forks from *any* committed scene. Preserve the selected world-neutral D&D/Storyteller authority split. State what is true, whose belief it is, when it became valid, and which branch may see it. This is the deep technical design pass deferred while infrastructure work continues; the general architecture boundary is already recorded in canonical docs.

## Authority, baseline and collaborators

- **Product commitment:** [Vision, scene history](../../../../docs/product/foundations/vision.md#scene-history-and-alternate-continuities); [Memory and continuity, branch scope](../../../../docs/product/storyteller/memory-and-continuity.md#branch-scoped-knowledge--selected-long-term-invariant-2026-11-19); [D&D mechanical rules](../../../../docs/product/gameplay/rules.md).
- **Technical authorities to revise:** [Canonical documents](../../../../docs/technical/storyteller/canonical-documents-and-packages.md#scene-rooted-canon-and-fork-safe-publication--selected-target-2026-11-19), [Context selection](../../../../docs/technical/storyteller/context-selection-and-recall.md#fork-scoped-retrieval-and-task-input--selected-target-2026-11-19), [Persistence](../../../../docs/technical/platform/data-and-persistence.md#story-snapshot-and-chronology), [Fork lifecycle](../../../../docs/technical/engine/lifecycle-and-compatibility.md#forked-continuities), [Publication](../../../../docs/technical/storyteller/generation-and-publication.md).
- **Adjacent architecture:** [ARCH02](../../archive/2026-11/other/2026-11-19--arch02-service-ownership-and-event-contracts/CHANGE.md) owns *which process writes what*, event contracts and failure boundaries. ARCH03 owns the detailed *historical knowledge, version and retrieval semantics*. Resolve shared headings with one integrator.
- **Observed baseline:** Current source has immutable document storage, pinned manifests, active-scene cues and bounded selection; live mechanical state/receipts remain in SQL. Ordinary generation is mostly one-shot and sustained months-long recall is not proven. Historical passages currently do **not** contain every branchable state snapshot. Reinspect current HEAD and STATUS before proposing specific migrations.
- **Cognee research:** [HAR09 evaluation](../../../../research/agent-practice/COGNEE-EVALUATION-2026-11-17.md) rejected a tiny *coding-agent repository memory* trial, **not** the RPG Storyteller. No adoption or permanent rejection for game recall follows from that experiment. Also inspect the existing retrieval ladder rather than inventing a second vendor-architecture authority.

## Design decisions this Change must settle

1. **Scene commitment.** Precisely distinguish an in-fiction scene, published passage, game-state checkpoint and client book leaf. Define the version tuple captured at an admissible scene boundary, including committed game state, document manifest root, rule/world package pins, relevant Storyteller bundle and control revision. Quiet between-scene mechanics must remain recoverable without rewriting history.
2. **Canonical record model.** Distinguish current admitted facts, historically observed events, reported beliefs/rumors, narrative interpretation, private Storyteller possibilities, exact published source and summary. Select a durable envelope with stable IDs, provenance, visibility, branch origin and effective revision/time. Keep Markdown/JSON human-readable where appropriate; avoid one massive mutable file, one table per noun or a forced object registry.
3. **Publication.** Describe how an LLM proposes bounded descriptive document patches; application validation and mechanical admission commit source passage, accepted changes and scene root consistently. Include lost acknowledgements, stale roots, multiple publishers and a model proposal that contradicts a committed mechanical receipt.
4. **Forking.** Define how a fork at scene N inherits immutable ancestor roots, historical source and relevant state *as of N* and creates a new mutable branch namespace. Require zero leakage of parent post-N changes and sibling futures. Specify what happens to in-flight workflows, time/deadlines, story-scoped identifiers, attachments and access rights. Compare full snapshots, persistent snapshots plus deltas and versioned immutable manifests without selecting based on fashion.
5. **Context/read interface.** Specify task capture, required exact mechanical state, bounded orientation, identity links, `ask_memory`/`read_memory` facade, evidence citations, visibility/knowledge checks and branch/time filtering. No unrestricted shell/filesystem/object-store access for the model. A model output is a proposal, not a direct canonical write.
6. **Index and retrieval evolution.** Specify rebuildable lexical baseline and optional semantic/hybrid/graph comparison, source hashes, committed-root watermark, coverage and invalidation. Define the safe response when results are stale, partial, absent or contradictory. Decide when *not* to retrieve or pay for another model call.
7. **Retention, security and migration.** Protect historic manifests and source objects reachable from supported scenes/forks, reconcile deletion/erasure against shared ancestry, prevent cross-account/secret leakage, and propose a gradual migration from today's SQL/live document split without competing mutable owners.
8. **Tests/evidence.** Create a deterministic fork-scoped oracle: king alive at scene 10, killed in parent at scene 20, fork at 10, branch continuation must see alive king; include equipment transfer, rumor versus fact, hidden knowledge, updated world-library root, old/new model inputs, stale index, missing source and source restoration.

## Scope and exclusions

**Documentation Change only:** exact headings and needed cross-links in existing product/technical owners. Choose one canonical claim per owner; do not duplicate the product bible into an implementation dossier. Produce an explicit decision record or schema example only where it actually resolves a critical ambiguity.

**Exclude:** Cognee, graph/vector database or embeddings installation; coding migrations; changing implemented gameplay; full D&D rules expansion; speculative NPC/economy simulations; provider calls; retroactive publication of old drafts; rewriting an unratified game requirement.

## Positive and negative acceptance

- **Positive:** A new engineer can trace the same committed scene's mechanical checkpoint, immutable source passage, relevant canon root, named knowledge/visibility and allowed exact retrieval. They can fork at scene 10, continue both branches separately, and explain how the Storyteller sees the right versions, including without any vector/graph index. Each step has one clear storage/authority owner and a version/provenance fence.
- **Negative:** The parent learns the king died at scene 20. A fork from scene 10 MUST NOT retrieve that death as its own present canon, even after indexing both branches, rebuilding a graph or renaming the king's identity document. A recalled rumor cannot grant mechanical effects. A missing/lagging index cannot replace exact mechanical state or pretend complete evidence. A secret from another story never appears in a search snippet. A late provider task cannot publish over a newer root.
- **Closure evidence:** Before/after semantic claim map, architecture decision trade-offs, expected-vs-actual source implementation status, negative reading tests, link/heading validation, `pnpm wiki:change-guard --mode plan` and `--mode close` where applicable. Record not-run checks truthfully; source tests require a separate implementation Change.

## planned-impact.v1

| Plane | Intent | Proof |
| --- | --- | --- |
| Product | Unchanged because selected scene forking, D&D authority and sparse memory already define the promise; may clarify an ambiguous term but cannot add gameplay mechanics | Contrast with `docs/product/foundations/vision.md` and `docs/product/storyteller/memory-and-continuity.md` |
| Technical | Changed: canonical-documents-and-packages.md scene roots/publication; context-selection-and-recall.md fork-scoped reads; data-and-persistence.md state/root consistency; lifecycle-and-compatibility.md fork semantics; generation-and-publication.md revision fences | Explicit version/branch examples and false-current-source negative |
| Code | Unchanged because this is a documentation-only Change; future storage/index implementation remains separately authorized | No executable diff; compare existing code status honestly |
| Related | Changed only for necessary architecture/topology, documentation index, roadmap, runbook or Change-link coherence | Link/heading health and integrated reconciliation ledger |

## Parallel execution / integration

- **Parallel research permitted:** Read-only examination of historical snapshot/fork mechanics, document storage, and search evaluation can run beside K8S02+ infrastructure work; no shared local cluster operations.
- **Parallel writing constraint:** ARCH02 and ARCH03 touch `topology.md`, persistence, and event ownership semantics; use isolated worktrees or serialize edits to shared headings, and assign one integration owner. K8S08 must not freeze actual service/canon ownership until both contracts are reconciled.
- **No automatic selection:** The coordinator needs explicit approval for a batch. No subagent inherits authorization from this packet.

## Reconciliation ledger (fill before Done)

| Affected heading | Authority | Target delta/reason | Source SHA and diff | Evidence class | Negative proof | Link/map update |
| --- | --- | --- | --- | --- | --- | --- |
| canonical documents / scene roots | Technical | Pending | Pending | Pending | Past-root vs latest | Pending |
| context selection / fork-scoped reads | Technical | Pending | Pending | Pending | Parent future not retrieved | Pending |
| scene state/fork lifecycle | Technical | Pending | Pending | Pending | No late parent mutations | Pending |
| product vision and D&D | Product | unchanged unless owner ratifies more | Pending | Pending | No new game systems | Pending |
