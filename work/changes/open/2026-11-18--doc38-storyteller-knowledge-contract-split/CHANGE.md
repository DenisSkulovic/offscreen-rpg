# DOC38 | Decouple canonical document packages from Storyteller context retrieval and memory execution

**State:** Proposed (unselected). **Kind:** documentation. **Ordering:** after WIKI16 and DOC26; use exact source boundary review. **Audit basis:** clean committed `781c2fc`; [gaps](../../../designs/open/wiki-discovery-coverage/COVERAGE-GAPS.md), [architecture](../../../designs/open/wiki-discovery-coverage/TARGET-ARCHITECTURE.md), [editorial standard](../../../designs/open/documentation-editorial-audit/EDITORIAL-STANDARD.md). Baseline is not implementation permission.

## Cursor first-screen brief

**Reader job now insufficiently supported:** context-and-memory.md is about 8,483 words, with 'A concrete workspace' section about 17.3k characters and 'Agent working cycle' about 14.1k. It owns immutable package storage, campaign bootstrap, source integrity, retrieval, model/task cycle and recovery, while request-context-and-cost and operation-and-controller have neighboring authority.

**Governing present owners to read:**
- [docs/technical/storyteller/context-and-memory.md](../../../../docs/technical/storyteller/context-and-memory.md)
- [docs/technical/storyteller/request-context-and-cost.md](../../../../docs/technical/storyteller/request-context-and-cost.md)
- [docs/technical/storyteller/operation-and-controller.md](../../../../docs/technical/storyteller/operation-and-controller.md)
- [packages/storyteller/README.md](../../../../packages/storyteller/README.md)

**Proposed newly created/relocated owner:** `docs/technical/storyteller/canonical-documents-and-packages.md (conditional) and docs/technical/storyteller/context-selection-and-recall.md (conditional)`. This is a hypothesis to validate, not a required arbitrary addition. Content with unratified decisions belongs under `work/designs/open/`, not silently selected `docs/product/`.

## Planned editorial change

1. Produce an exact owner/section migration map before writing. Separate canonical source/pinning/manifest/import authority from read-selection, memory/retrieval/operation responsibility. Decide whether each genuinely needs a new page or a refined section in an existing selected owner.
2. For any real split, move unique content once, preserve immutable document IDs, source visibility, private/public evidence, task-version capture, publication/CAS and no-summarization-as-truth. Mark conceptual future retrieval separately from ordinary one-shot execution.
3. Repair all inbound anchors including source READMEs, product/gameplay links, research and selected Change references in full repository. Retain a short original router only if it serves a distinct entrypoint; avoid duplicated full spec.
4. Benchmark the common task: 'what source enters this task' -> precise heading within bounded reads, with wrong-route negative for provider budget or canon changes.

Before editing, compare actual source tree, the selected meaning of exact headings, all incoming links and current dirty state. If the reader question is already answered at one precise stable owner, **record reviewed no-op** and improve the route instead of adding a redundant document.

## Planned specification and implementation delta | planned-impact.v1

| Plane | Selected authority and exact change/no-op | Related documents/maps to inspect | Evidence/decision |
| --- | --- | --- | --- |
| Product | unchanged because this technical/runbook editorial Change preserves current player promises and authorization boundaries | Selected product owners above; exact Proposed/Blocked boundary | Human ratification required before any new game, permission or legal rule |
| Technical | changed: restructure existing docs/technical/storyteller/context-and-memory.md claim ownership with any verified successor pages, no runtime contract revisions | docs/technical/storyteller/context-and-memory.md, docs/technical/storyteller/request-context-and-cost.md, docs/technical/storyteller/operation-and-controller.md; preserve selected vs realized status | Source/fixture/contract proof never invented |
| Code | unchanged because this is a documentation-only Change: **no application source, tests, schema, migrations or executable tool modification** is allowed | Source files are read-only evidence; runbooks may cite commands only after safety review | Negative: any executable diff blocks Done |
| Related | changed: planned CREATE or conditional SPLIT/relocation `docs/technical/storyteller/canonical-documents-and-packages.md (conditional) and docs/technical/storyteller/context-selection-and-recall.md (conditional)` plus exact inbound route updates if adopted; otherwise unchanged because existing owner suffices after review | `docs/README.md`, product/technical/runbook routes and all real incoming path#heading edges; historic citations retained | WIKI16 declared-CREATE/migration compatibility and semantic conservation receipt |

**Planned CREATE/RELOCATE gating:** the destination path may not exist at design time. Do not mark Ready until WIKI16's create/move plan compatibility is checked or the packet is explicitly revised to an existing-owner edit. Require an actual migration of every important inbound fragment before Done; no automatic "page count improved" acceptance.

## Acceptance and adversarial proof

**Normal:** a fresh agent answers the intended reader question from the correct owner with selected/proposed/implemented states separated, and the new page genuinely reduces detours or ambiguity. **Negative:** The new 'context' doc claims summaries may rewrite published passages, or split text loses a source revision/visibility fence.

**Owner gate:** No new retrieval algorithm or provider behavior, just authoritative document ownership and link migration.

**Verification:** exact before/after claim ledger, source-revision status where factual, full-link/anchor and reverse dependency checks, reader task trace, and independently reviewed falsifying counterexample. All actual commands/results must be recorded, not guessed. A page can be *good but not needed*: closing with a proved no-op or cancelling the proposed split is legitimate.

## Reconciliation ledger | fill at execution

| Affected selected claim/heading | Authority | Target delta (changed/unchanged; reason) | Source delta & inspected SHA | Status/evidence tier | Negative proof | Map/link update or N/A |
| --- | --- | --- | --- | --- | --- | --- |
| `docs/technical/storyteller/context-and-memory.md` selected claim after owner inspection | product/technical/proposed as applicable | pending exact claim/decision and candidate created/split path | no source behavior changed; doc SHA pending | not run: Proposed | The new 'context' doc claims summaries may rewrite published passages, or split text loses a source revision/visibility fence. | pending inbound/fragment map |

No automatic next packet. Stop at any new product policy, staff permission, legal retention rule, provider spend or incompatible source owner that requires an independent decision.
