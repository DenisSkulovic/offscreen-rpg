# Canonical campaign files and the Storyteller workspace

**Quick route by question:** [who owns the promise](#who-owns-which-promise) · [what source enters this task](context-selection-and-recall.md#what-source-enters-this-task) · [package pins and import](canonical-documents-and-packages.md#campaign-bootstrap) · [publication and content-addressed storage](canonical-documents-and-packages.md#publication-across-files-and-the-execution-ledger) · [a summary does not replace a passage](canonical-documents-and-packages.md#extract-summarize-and-revise-deliberately) · [provider budget, a different question](request-context-and-cost.md#budget-accounting) · [author a content package](../../runbooks/content-package-authoring.md). This page is the route. The contracts moved once, and the headings below remain so existing anchors still resolve.

Status: mixed implementation and target contract. Immutable local storage, descriptive admission, canonical narrative passages, pinned package import/Start, narrative-choice document hints, active-scene recall cues, exact world/rule sections and bounded multi-round exploration are implemented. Ordinary admissions can select rule topics and narrative dependencies; ordinary gameplay still defaults to one-shot tasks with tools disabled. Mechanical choices lack explicit document dependencies, selected bodies can be omitted during packing, and sustained recall remains unproved. PostgreSQL still owns live mechanical state/receipts; the structured-document ownership in [One owner per kind of truth](canonical-documents-and-packages.md#one-owner-per-kind-of-truth) is a migration target. Use [packages/storyteller](../../../packages/storyteller/README.md) for the implemented package and [progress](../../../STATUS.md) for evidence. The [2026-11 engine-model inspection](../../../evidence/inspections/doc01-retained-observations/engineering/engine-model.md) is dated evidence, not the current owner. [Canonical storage](../../../work/designs/open/legacy-initiatives-index/PARKED-2026-11-15.md#canonical-campaign-storage) and [memory/recall](../../../work/designs/open/legacy-initiatives-index/PARKED-2026-11-15.md#storyteller-memory-and-situated-recall) own remaining work. Read [concepts](../../product/foundations/concepts.md): there are no chapters. Package, pin, manifest, import, and publication authority: [Canonical documents and packages](canonical-documents-and-packages.md). What a task reads, including ordinary one-shot selection and separately marked future retrieval: [Context selection and recall](context-selection-and-recall.md).

## Who owns which promise

The contracts moved to two owners. These headings remain as the route.

| Promise | Owner |
| --- | --- |
| Document revision and canon provenance | [Canonical documents and packages](canonical-documents-and-packages.md). A published passage and its revision stay the source identity. |
| Package pin, manifest, import, and start | [Campaign bootstrap](canonical-documents-and-packages.md#campaign-bootstrap), [world libraries](canonical-documents-and-packages.md#reusable-world-libraries-and-campaign-overlays), and [rule libraries](canonical-documents-and-packages.md#reusable-rule-libraries). |
| What source enters this task | [What source enters this task](context-selection-and-recall.md#what-source-enters-this-task). |
| Bounded task context and omission | [Build context for a specific decision](request-context-and-cost.md#build-context-for-a-specific-decision). |
| Effective spending | [Usage policy](../platform/spending-and-entitlements.md). Figures on the request page are not that entitlement. |
| Retrieval and summaries | Summaries are derived. A lossy summary does not replace the original source. The rule is [Extract, summarize and revise deliberately](canonical-documents-and-packages.md#extract-summarize-and-revise-deliberately). Search and embeddings in [Search belongs in the POC](context-selection-and-recall.md#search-belongs-in-the-poc) stay an evaluation scope. A synthetic vector fixture is not demonstrated semantic recall. |
| Operation loop | [Operation and controller](./operation-and-controller.md). This route does not select a second agent. |

Normal: an admitted task captures the source revision it may use. Publication checks that identity. Negative: a document revised after that snapshot does not become current truth for the already-admitted task. A lossy summary does not replace the original source identity. A private possibility stays noncanonical until publication admits it. See [Six kinds of record](../../product/gameplay/continuity.md#six-kinds-of-record).

## Product commitment

Moved. The portable-library commitment is [Product commitment](canonical-documents-and-packages.md#product-commitment).

## One owner per kind of truth

Moved. The ownership table is [One owner per kind of truth](canonical-documents-and-packages.md#one-owner-per-kind-of-truth). A summary remains derived. Pretrained model recollection is neither source canon nor evidence.

## Reusable world libraries and campaign overlays

Moved. Pinning, overlays, invention ceilings, and import are [Reusable world libraries and campaign overlays](canonical-documents-and-packages.md#reusable-world-libraries-and-campaign-overlays). Updating a reusable library does not silently rewrite an existing campaign or in-flight task. Authoring steps for a checked-in package are [the content-package guide](../../runbooks/content-package-authoring.md), which does not own this contract.

## Reusable rule libraries

Moved. Rule-package identity and the manifest are [Reusable rule libraries](canonical-documents-and-packages.md#reusable-rule-libraries). A richer read does not change canonical authority. Which sections enter a task is [What source enters this task](context-selection-and-recall.md#what-source-enters-this-task).

## A concrete workspace

Moved. Illustrative paths, stable document IDs, and the manifest are [A concrete workspace](canonical-documents-and-packages.md#a-concrete-workspace). A stable document ID survives renaming.

### Campaign bootstrap

Moved. Start import, instantiation, obligations, and private future material are [Campaign bootstrap](canonical-documents-and-packages.md#campaign-bootstrap). Import publishes an immutable package manifest only. It does not create a campaign or schedule an obligation.

### Semantic locality and context cost

The read-selection contract moved. Ordinary one-shot capture, pins, and handle resolution are [What source enters this task](context-selection-and-recall.md#what-source-enters-this-task). Document-boundary design is [Semantic locality and context cost](context-selection-and-recall.md#semantic-locality-and-context-cost). A richer context budget does not grant a different truth. Provider budget is [Request context and cost](request-context-and-cost.md), not this heading.

### Document envelope

Moved. Document IDs, visibility, authority, and the memory-segment example are [Document envelope](canonical-documents-and-packages.md#document-envelope). This summary does not replace that evidence or grant a reward.

## The Storyteller as a versioned bundle

Moved. Task-version capture of the creative bundle is [The Storyteller as a versioned bundle](canonical-documents-and-packages.md#the-storyteller-as-a-versioned-bundle). Capture the exact bundle revision in every task. Changing a shared bundle cannot alter a task already captured.

## Agent working cycle

Split. Publication and descriptive-change constraints are [Descriptive changes and the revision fence](canonical-documents-and-packages.md#descriptive-changes-and-the-revision-fence). The read cycle is [Agent working cycle](context-selection-and-recall.md#agent-working-cycle). The loop owner remains [operation and controller](./operation-and-controller.md). This heading does not select a second agent. Cost remains [the bounded-cost contract](./request-context-and-cost.md#bounded-work-not-an-open-ended-agent). Old versions remain evidence and are never rewritten.

## Mechanical continuity dependencies — S3 design

Moved. This section is the next implementation contract, not current behavior: [Mechanical continuity dependencies — S3 design](context-selection-and-recall.md#mechanical-continuity-dependencies--s3-design). Narrative-choice hints do not silently acquire stronger semantics here.

## Extract, summarize and revise deliberately

Moved. [Extract, summarize and revise deliberately](canonical-documents-and-packages.md#extract-summarize-and-revise-deliberately). Preserve original published passages. Revisions must not recursively summarize the last summary as the only surviving evidence. A summary does not replace or rewrite a published passage.

## Search belongs in the POC

Moved, and marked as conceptual future retrieval rather than ordinary one-shot execution: [Search belongs in the POC](context-selection-and-recall.md#search-belongs-in-the-poc). Do not call a synthetic vector fixture demonstrated semantic recall.

## Publication across files and the execution ledger

Moved. Immutable objects, the manifest root, and the publication transaction are [Publication across files and the execution ledger](canonical-documents-and-packages.md#publication-across-files-and-the-execution-ledger). Never overwrite a currently published object in place. A staged but unpublished document is never story evidence.

## Recovery, inspection and portability

Moved. Export, deletion, and the visibility fence are [Recovery, inspection and portability](canonical-documents-and-packages.md#recovery-inspection-and-portability). A secret document's title or backlink cannot leak through public search. Authorization is checked again on read even for a pinned task.

## Concrete acceptance flows

Moved. Recall acceptance, including the harbor credit negative, is [Concrete acceptance flows](context-selection-and-recall.md#concrete-acceptance-flows). A summary cannot claim four credits before completion, and that line does not let a summary rewrite the passage.

## Research informing the contract

Split. Storage consistency notes are [Research informing storage](canonical-documents-and-packages.md#research-informing-storage). Retrieval research is [Research informing retrieval](context-selection-and-recall.md#research-informing-retrieval). Neither list selects a vendor or proves recall quality.
