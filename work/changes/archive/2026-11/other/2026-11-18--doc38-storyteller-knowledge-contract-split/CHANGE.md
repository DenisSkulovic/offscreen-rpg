# DOC38 | Decouple canonical document packages from Storyteller context retrieval and memory execution

**State:** Done (2026-11-18).

## Cursor first-screen brief

**Reader job now insufficiently supported:** context-and-memory.md is about 8,483 words, with 'A concrete workspace' section about 17.3k characters and 'Agent working cycle' about 14.1k. It owns immutable package storage, campaign bootstrap, source integrity, retrieval, model/task cycle and recovery, while request-context-and-cost and operation-and-controller have neighboring authority.

**Governing present owners to read:**
- [docs/technical/storyteller/context-and-memory.md](../../../../../../docs/technical/storyteller/context-and-memory.md)
- [docs/technical/storyteller/request-context-and-cost.md](../../../../../../docs/technical/storyteller/request-context-and-cost.md)
- [docs/technical/storyteller/operation-and-controller.md](../../../../../../docs/technical/storyteller/operation-and-controller.md)
- [packages/storyteller/README.md](../../../../../../packages/storyteller/README.md)

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
| Related | changed: CREATE docs/technical/storyteller/canonical-documents-and-packages.md and CREATE docs/technical/storyteller/context-selection-and-recall.md, and retarget owned route links in docs/technical/storyteller/request-context-and-cost.md, docs/technical/storyteller/operation-and-controller.md, and packages/storyteller/README.md | docs/technical/storyteller/context-and-memory.md remains the router; historic citations keep resolving through the old headings | WIKI16 CREATE plus a semantic conservation receipt |

**Planned CREATE/RELOCATE gating:** the destination path may not exist at design time. Do not mark Ready until WIKI16's create/move plan compatibility is checked or the packet is explicitly revised to an existing-owner edit. Require an actual migration of every important inbound fragment before Done; no automatic "page count improved" acceptance.

## Acceptance and adversarial proof

**Normal:** a fresh agent answers the intended reader question from the correct owner with selected/proposed/implemented states separated, and the new page genuinely reduces detours or ambiguity. **Negative:** The new 'context' doc claims summaries may rewrite published passages, or split text loses a source revision/visibility fence.

**Owner gate:** No new retrieval algorithm or provider behavior, just authoritative document ownership and link migration.

**Verification:** exact before/after claim ledger, source-revision status where factual, full-link/anchor and reverse dependency checks, reader task trace, and independently reviewed falsifying counterexample. All actual commands/results must be recorded, not guessed. A page can be *good but not needed*: closing with a proved no-op or cancelling the proposed split is legitimate.

## Document shape | shape-ops.v1

| File | Operation | Migration | Conservation |
| --- | --- | --- | --- |
| docs/technical/storyteller/canonical-documents-and-packages.md | CREATE | unchanged | Package pin, manifest, import, document identity, publication, and the rule that a summary does not replace a published passage stay the selected contract. |
| docs/technical/storyteller/context-selection-and-recall.md | CREATE | unchanged | Ordinary one-shot source selection stays separate from conceptual future retrieval. A summary does not replace a published passage. |
| docs/technical/storyteller/context-and-memory.md | SPLIT | docs/technical/storyteller/context-and-memory.md#one-owner-per-kind-of-truth -> docs/technical/storyteller/canonical-documents-and-packages.md#one-owner-per-kind-of-truth; docs/technical/storyteller/context-and-memory.md#semantic-locality-and-context-cost -> docs/technical/storyteller/context-selection-and-recall.md#what-source-enters-this-task | Old headings remain routers. Immutable document IDs, visibility, task-version capture, publication, and no-summarization-as-truth stay. |

## Migration receipt | shape-receipt.v1

| Old owner | Successor | Unique claim |
| --- | --- | --- |
| docs/technical/storyteller/context-and-memory.md#document-envelope | docs/technical/storyteller/canonical-documents-and-packages.md#document-envelope | This summary does not replace that evidence or grant a reward. |
| docs/technical/storyteller/context-and-memory.md#publication-across-files-and-the-execution-ledger | docs/technical/storyteller/canonical-documents-and-packages.md#publication-across-files-and-the-execution-ledger | Never overwrite a currently published object in place. |
| docs/technical/storyteller/context-and-memory.md#recovery-inspection-and-portability | docs/technical/storyteller/canonical-documents-and-packages.md#recovery-inspection-and-portability | A secret document's title/backlink cannot leak through public search. |
| docs/technical/storyteller/context-and-memory.md#one-owner-per-kind-of-truth | docs/technical/storyteller/canonical-documents-and-packages.md#one-owner-per-kind-of-truth | Pretrained model recollection is neither source canon nor evidence. |
| docs/technical/storyteller/context-and-memory.md#campaign-bootstrap | docs/technical/storyteller/canonical-documents-and-packages.md#campaign-bootstrap | Import publishes an immutable package manifest only—it does not create a campaign or schedule an obligation. |
| docs/technical/storyteller/context-and-memory.md#the-storyteller-as-a-versioned-bundle | docs/technical/storyteller/canonical-documents-and-packages.md#the-storyteller-as-a-versioned-bundle | Capture the exact bundle revision in every task. |
| docs/technical/storyteller/context-and-memory.md#extract-summarize-and-revise-deliberately | docs/technical/storyteller/canonical-documents-and-packages.md#extract-summarize-and-revise-deliberately | revisions must not recursively summarize the last summary as the only surviving evidence. |
| docs/technical/storyteller/context-and-memory.md#semantic-locality-and-context-cost | docs/technical/storyteller/context-selection-and-recall.md#what-source-enters-this-task | A new passage or unrelated document cannot shift `d9` onto another fact or resurrect a superseded revision. |
| docs/technical/storyteller/context-and-memory.md#agent-working-cycle | docs/technical/storyteller/context-selection-and-recall.md#agent-working-cycle | Failure of optional maintenance does not undo a committed roll or cause mechanics to run again. |
| docs/technical/storyteller/context-and-memory.md#search-belongs-in-the-poc | docs/technical/storyteller/context-selection-and-recall.md#search-belongs-in-the-poc | Do not call a synthetic vector fixture demonstrated semantic recall. |
| docs/technical/storyteller/context-and-memory.md#mechanical-continuity-dependencies--s3-design | docs/technical/storyteller/context-selection-and-recall.md#mechanical-continuity-dependencies--s3-design | Narrative-choice hints and scene cues remain optional selection paths unless explicitly promoted by an owning contract |

## Reconciliation ledger | fill at execution

| Affected selected claim/heading | Authority | Target delta (changed/unchanged; reason) | Source delta & inspected SHA | Status/evidence tier | Negative proof | Map/link update or N/A |
| --- | --- | --- | --- | --- | --- | --- |
| docs/technical/storyteller/context-and-memory.md#who-owns-which-promise | technical | changed: the promise table now routes package authority and task selection to the two successor pages, and the old headings remain routers | no source behavior changed; git SHA b3113814 | documentation-only; selected meaning preserved | A document revised after the admitted snapshot does not become current truth, and a lossy summary does not replace the original source identity. | Owned route links repaired. Unrepaired inbound links are listed after this ledger. The content-package authoring link stays on this page. |
| docs/technical/storyteller/canonical-documents-and-packages.md#one-owner-per-kind-of-truth | technical | changed: the ownership table, package pins, import, document envelope, publication, and summary rule moved here once | no source behavior changed; git SHA b3113814 | documentation-only; selected meaning preserved | A summary does not replace a published passage, and a secret title must not leak through public search. | Successor of the canon headings. docs/technical/README.md was not edited. |
| docs/technical/storyteller/canonical-documents-and-packages.md#publication-across-files-and-the-execution-ledger | technical | changed: content-addressed publication and the revision fence moved here once | no source behavior changed; git SHA b3113814 | documentation-only; selected meaning preserved | A staged object is not story evidence, and a published object is not overwritten in place. | Same heading remains as a router on the old page. |
| docs/technical/storyteller/canonical-documents-and-packages.md#campaign-bootstrap | technical | changed: start import, instantiation, and private future material moved here once | no source behavior changed; git SHA b3113814 | documentation-only; selected meaning preserved | Import still publishes a package manifest only and does not schedule an obligation. | The authoring guide was not edited. Its old anchors still resolve. |
| docs/technical/storyteller/context-selection-and-recall.md#what-source-enters-this-task | technical | changed: ordinary one-shot capture, pins, handles, and the revision-resolution rule moved here | no source behavior changed; git SHA b3113814 | documentation-only; selected meaning preserved | The page must not say a summary may rewrite a published passage. A later revision does not become truth for an already admitted task. | request-context-and-cost.md and operation-and-controller.md now link here. Provider budget stays on the cost page. |
| docs/technical/storyteller/context-selection-and-recall.md#search-belongs-in-the-poc | technical | changed: search and embeddings moved here and are marked conceptual future retrieval, separate from ordinary one-shot execution | no source behavior changed; git SHA b3113814 | documentation-only; selected meaning preserved | A synthetic vector fixture is still not demonstrated semantic recall. | Old heading on context-and-memory.md routes here. |
| docs/technical/storyteller/context-selection-and-recall.md#mechanical-continuity-dependencies--s3-design | technical | changed: the mechanical-dependency contract moved here and remains a future implementation contract | no source behavior changed; git SHA b3113814 | documentation-only; selected meaning preserved | Narrative-choice hints do not silently acquire stronger semantics, and this section is not current behavior. | operation-and-controller.md links here for the unimplemented mechanical carriage. |
| docs/technical/storyteller/request-context-and-cost.md#what-this-page-owns | technical | changed: the ownership sentence now sends source selection to the selection page; packing, caches, and spending envelopes stay here | no source behavior changed; git SHA b3113814 | documentation-only; selected meaning preserved | A budget figure on this page is not permission to change canon or to treat a summary as a published passage. | Link-only edit plus the ownership sentence that had to move. |
| docs/technical/storyteller/operation-and-controller.md#context-and-continuity | technical | unchanged: passage and note bounds stay in this section; one route link was added | no source behavior changed; git SHA b3113814 | documentation-only; selected meaning preserved | Passage loading in this section does not import a package or set a provider budget. | Link added to what-source-enters-this-task. The loop text was not moved. |
| packages/storyteller/README.md#context-and-memory | technical route | changed: the package route now names the selection page and the canonical-documents page | no source behavior changed; git SHA b3113814 | documentation-only; selected meaning preserved | The package guide does not become the owner of publication or of provider spending. | Route links only. The old storyteller page remains linked as the heading router. |
| docs/product/gameplay/continuity.md | product | unchanged: this Change does not edit player promises or authorization boundaries | no source behavior changed; git SHA b3113814 | documentation-only; product text not rewritten | A readable document view still cannot change an execution-ledger quantity. | Product pages were left untouched. Their links still hit the router. |

## Unrepaired inbound links

These files were outside this Change's file list, or another agent owns them. Each link still resolves, because the old headings remain on `docs/technical/storyteller/context-and-memory.md`. They were not retargeted to the successor headings.

- `docs/runbooks/content-package-authoring.md` links `#reusable-world-libraries-and-campaign-overlays`, `#reusable-rule-libraries`, `#campaign-bootstrap`, `#publication-across-files-and-the-execution-ledger`, and `#one-owner-per-kind-of-truth`. The new authoring guide and `docs/runbooks/README.md` were not edited. The question-route link from the storyteller page to that guide remains.
- `docs/technical/README.md` still answers "where does narrative canon live?" with `storyteller/context-and-memory.md`, and "what enters one request, and what does it cost?" with `storyteller/request-context-and-cost.md`.
- `docs/technical/platform/data-and-persistence.md` still links the canonical-file contract at `context-and-memory.md`.
- `docs/product/storyteller/memory-and-continuity.md` and `docs/product/gameplay/continuity.md` still link `context-and-memory.md`.
- `packages/application/README.md` and `packages/db/README.md` still link `context-and-memory.md`.
- `work/designs/open/canon-invention-policy/FEATURE.md` still links `#reusable-world-libraries-and-campaign-overlays`.
- `work/changes/open/2026-11-11--s3a-continuity-report/CHANGE.md` still links `#mechanical-continuity-dependencies--s3-design`.

## Claims refused

Provider budgets, cache accounting, token envelopes, and the development allowance stayed in `docs/technical/storyteller/request-context-and-cost.md`. The operation loop, tool protocol, and passage/note fence stayed in `docs/technical/storyteller/operation-and-controller.md`. "Recall over many days" stayed on the cost page; only a route link was added. No product rule, retrieval algorithm, or provider behavior was added.

## Checks

`git rev-parse --short HEAD` returned `b3113814`. No executable file was modified. Code is unchanged.

No automatic next packet. Stop at any new product policy, staff permission, legal retention rule, provider spend or incompatible source owner that requires an independent decision.
