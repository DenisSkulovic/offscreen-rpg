# ARCH03 | Branch-scoped Storyteller knowledge and scene-root architecture

**State:** Done (2026-11-19)  
**Kind:** documentation  
**Owner direction:** Selected product invariant: every committed scene is a historically reviewable state and a possible fork point; the Storyteller is a D&D-style DM able to maintain and retrieve complex canon without altering mechanical authority.  
**Selection:** Authorized documentation Change. No application code, no migration, no provider call, and no index installation. No intended code diff.  
**Parent program:** [Distributed architecture laboratory](../../../../README.md#distributed-architecture-laboratory-new-2026-11-19)

## Outcome

Define a **falsifiable, versioned scene-knowledge contract** so game state, descriptive canon, exact source scenes and derived retrieval remain correct for arbitrarily long stories and for forks from *any* committed scene. Preserve the selected world-neutral D&D/Storyteller authority split. State what is true, whose belief it is, when it became valid, and which branch may see it. That contract now lives on the technical headings named below. The general architecture boundary was already recorded before this Change.

## Authority, baseline and collaborators

- **Product commitment:** [Vision, scene history](../../../../../../docs/product/foundations/vision.md#scene-history-and-alternate-continuities); [Memory and continuity, branch scope](../../../../../../docs/product/storyteller/memory-and-continuity.md#branch-scoped-knowledge--selected-long-term-invariant-2026-11-19); [D&D mechanical rules](../../../../../../docs/product/gameplay/rules.md).
- **Technical authorities to revise:** [Canonical documents](../../../../../../docs/technical/storyteller/canonical-documents-and-packages.md#scene-rooted-canon-and-fork-safe-publication--selected-target-2026-11-19), [Context selection](../../../../../../docs/technical/storyteller/context-selection-and-recall.md#fork-scoped-retrieval-and-task-input--selected-target-2026-11-19), [Persistence](../../../../../../docs/technical/platform/data-and-persistence.md#story-snapshot-and-chronology), [Fork lifecycle](../../../../../../docs/technical/engine/lifecycle-and-compatibility.md#forked-continuities), [Publication](../../../../../../docs/technical/storyteller/generation-and-publication.md).
- **Adjacent architecture:** [ARCH02](../2026-11-19--arch02-service-ownership-and-event-contracts/CHANGE.md) owns *which process writes what*, event contracts and failure boundaries. ARCH03 owns the detailed *historical knowledge, version and retrieval semantics*. Resolve shared headings with one integrator.
- **Observed baseline:** Current source has immutable document storage, pinned manifests, active-scene cues and bounded selection; live mechanical state/receipts remain in SQL. Ordinary generation is mostly one-shot and sustained months-long recall is not proven. Historical passages currently do **not** contain every branchable state snapshot. Reinspect current HEAD and STATUS before proposing specific migrations.
- **Cognee research:** [HAR09 evaluation](../../../../../../research/agent-practice/COGNEE-EVALUATION-2026-11-17.md) rejected a tiny *coding-agent repository memory* trial, **not** the RPG Storyteller. No adoption or permanent rejection for game recall follows from that experiment. Also inspect the existing retrieval ladder rather than inventing a second vendor-architecture authority.

**Parallel design companion:** [ARCH05](../../../../open/2026-11-19--arch05-storyteller-harness-and-context-packs/CHANGE.md) owns role recipes, pre-injected context, intent-level tools and model-turn efficiency. ARCH03 owns branch-safe source/version semantics and scene-root reconstruction. They may be researched concurrently, but avoid creating two authoritative specifications for the same retrieval/privacy guarantee.

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

## Planned specification and implementation delta

planned-impact.v1

| Plane | Intent | Proof |
| --- | --- | --- |
| Product | unchanged: selected scene forking and the D&D authority split already define the promise, and this Change adds no gameplay mechanic | docs/product/foundations/vision.md#scene-history-and-alternate-continuities and docs/product/storyteller/memory-and-continuity.md#branch-scoped-knowledge--selected-long-term-invariant-2026-11-19 |
| Technical | changed: the scene-knowledge contract now lives on the named headings | docs/technical/storyteller/canonical-documents-and-packages.md#scene-rooted-canon-and-fork-safe-publication--selected-target-2026-11-19 and docs/technical/storyteller/context-selection-and-recall.md#fork-scoped-retrieval-and-task-input--selected-target-2026-11-19 and docs/technical/storyteller/generation-and-publication.md#scene-publication-fence and docs/technical/platform/data-and-persistence.md#story-snapshot-and-chronology and docs/technical/engine/lifecycle-and-compatibility.md#forked-continuities |
| Code | unchanged: documentation only, with no intended code diff, no migration, and no provider call | No executable diff against baseline 7ce99f6f |
| Related | unchanged: topology, delivery, the roadmap, the changes index, and the ledger stay outside this Change | Those files were not edited |

## Semantic claim map

Before this Change, the scene-root and fork-retrieval headings deferred branch, visibility, and index rules to this packet. Persistence required a checkpoint/root pair and left the read contract unnamed. Lifecycle required a future checkpoint and said historical forking was unimplemented. Publication refused a stale capture and did not yet say how the pair is bound.

After this Change, those headings state the contract. A scene, a published passage, a game-state checkpoint, and a book leaf are different records. A claim says what is asserted, whose belief it is, when it became valid, and which branch may see it. A fork from any committed scene uses that scene's checkpoint and canon root together and must not inherit later parent or sibling facts. Search indexes, Cognee, and vector stores are rebuildable aids. This Change does not install them. The current journal and the current-only fork do not implement historical reconstruction. Product pages and application code stay as they were.

## Parallel execution / integration

- **Parallel research permitted:** Read-only examination of historical snapshot/fork mechanics, document storage, and search evaluation can run beside infrastructure work; no shared local cluster operations.
- **Parallel writing constraint:** ARCH02 already merged the process-ownership table. This execution does not edit topology or the delivery page. RabbitMQ edits in another worktree stay untouched.
- **No automatic selection:** The coordinator needs explicit approval for a batch. No subagent inherits authorization from this packet. ARCH05 remains a later candidate and was not started.

## Checks

`pnpm wiki:change-guard --mode plan` returned ok with no findings. `pnpm wiki:change-guard --mode close --base 7ce99f6f` returned ok, with citation warnings only. No provider call was performed. `python3 scripts/check_docs.py` before archive reported two problems outside this Change: `ROADMAP.md:13` and the ARCH04 packet link to a missing k8s09 packet. After the packet moved, the same command also reports links that still name the old open packet. Those links sit in files this Change was forbidden to edit: `ROADMAP.md`, `work/changes/README.md`, the k8s08 packet, `docs/technical/platform/topology.md`, `docs/technical/platform/execution-and-delivery.md`, and the proposed-schemas heading in `docs/technical/platform/data-and-persistence.md`. Source tests were not executed. This Change has no intended code diff.

## Reconciliation ledger

| Affected selected claim/heading | Authority | Target delta and reason | Source delta and inspected SHA | Status/evidence tier | Negative proof | Map/link update |
| --- | --- | --- | --- | --- | --- | --- |
| docs/technical/storyteller/canonical-documents-and-packages.md#scene-rooted-canon-and-fork-safe-publication--selected-target-2026-11-19 | technical | changed: the heading now distinguishes a scene, a passage, a checkpoint, and a book leaf, and it states the four questions for a claim | no source behavior changed; baseline 7ce99f6f | reviewed | a later parent fact is not this branch's present canon | heading kept; the quick route now points here |
| docs/technical/storyteller/context-selection-and-recall.md#fork-scoped-retrieval-and-task-input--selected-target-2026-11-19 | technical | changed: the heading now captures the pair, states the fork oracle, and treats indexes as rebuildable aids | no source behavior changed; baseline 7ce99f6f | reviewed | indexing both branches must not show the parent's later death as the fork's present | heading kept; the quick route now includes it |
| docs/technical/storyteller/generation-and-publication.md#scene-publication-fence | technical | changed: the new heading binds passage, descriptive changes, admitted effects, and canon root in one engine fence | no source behavior changed; baseline 7ce99f6f | reviewed | a late provider task cannot publish over a newer root | new heading on the existing publication page |
| docs/technical/platform/data-and-persistence.md#story-snapshot-and-chronology | technical | changed: the knowledge-root text requires the checkpoint and canon root together and says historical reconstruction is not implemented | no source behavior changed; inspected packages/application/src/stories/forks.ts and packages/application/src/stories/reads.ts at 7ce99f6f | source-observed | the history read returns passage prose, not an older checkpoint | heading kept; other headings in this file were not edited |
| docs/technical/engine/lifecycle-and-compatibility.md#forked-continuities | technical | changed: a fork uses that scene's checkpoint and canon root together, while the current fork remains revision 1 only | no source behavior changed; inspected packages/application/src/stories/forks.ts at 7ce99f6f | source-observed | a fork at an older revision is refused rather than mixing old prose with newer mechanics | heading kept |
| docs/product/foundations/vision.md#scene-history-and-alternate-continuities | product | unchanged: the selected any-scene fork promise already existed and this Change adds no gameplay mechanic | no source behavior changed; baseline 7ce99f6f | reviewed | the page still does not claim the current journal reconstructs historical state | no product edit |
| docs/product/storyteller/memory-and-continuity.md#branch-scoped-knowledge--selected-long-term-invariant-2026-11-19 | product | unchanged: branch-scoped knowledge and the split between truth, belief, history, and possibility stay the product rule | no source behavior changed; baseline 7ce99f6f | reviewed | a rumor still cannot become a mechanical effect from this page | no product edit |
| docs/product/gameplay/rules.md#authority-split | product | unchanged: the engine still validates rolls and prose still cannot transfer an item | no source behavior changed; baseline 7ce99f6f | reviewed | the Storyteller still must not override a committed die | no product edit |
| docs/technical/platform/topology.md#proposed-service-ownership | technical | unchanged: the merged ownership table stays in place and this Change does not edit that file | no source behavior changed; baseline 7ce99f6f | reviewed | the Storyteller still does not commit the checkpoint or the canon root | file left untouched |
| docs/technical/platform/execution-and-delivery.md#commands-business-events-and-workflows | technical | unchanged: another worktree owns this file and the engine remains the checkpoint boundary | no source behavior changed; baseline 7ce99f6f | reviewed | a broker delivery is still not historical reconstruction | file left untouched |
| docs/technical/platform/http-api-and-client-contracts.md#service-calls-are-not-player-routes | technical | unchanged: player routes and command identity were not revised | no source behavior changed; baseline 7ce99f6f | reviewed | an HTTP replay still does not apply a committed effect again | file left untouched |
| docs/technical/platform/security-and-trust-boundaries.md#boundary-map | technical | unchanged: the document-store contract and the trust map were not revised | no source behavior changed; baseline 7ce99f6f | reviewed | admit still does not become a public or cross-story reveal | file left untouched |
