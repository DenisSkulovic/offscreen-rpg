# Canonical campaign files and the Storyteller workspace

**Role:** this page is a navigation hub for Storyteller knowledge, not a second specification. It owns no promise, schema or revision rule: a route here never rewrites a manifest identity (including an inherited manifest's campaign id), never makes a search index or snippet source truth, and never gives a second owner a competing authority. Where this page and an owner disagree, the owner wins. The authoritative owners are [canonical documents and packages](canonical-documents-and-packages.md), [context selection and recall](context-selection-and-recall.md), [operation and controller](operation-and-controller.md), [prompts and tools](prompts-and-tools.md), and [versioned settings](versioned-settings.md).

**Quick route by question:** [who owns the promise](#who-owns-which-promise) · [library, shelf and workdesk terms](canonical-documents-and-packages.md#library-shelf-and-workdesk-vocabulary--target-lib01) · [what source enters this task](context-selection-and-recall.md#what-source-enters-this-task) · [package pins and import](canonical-documents-and-packages.md#campaign-bootstrap) · [publication and content-addressed storage](canonical-documents-and-packages.md#publication-across-files-and-the-execution-ledger) · [a summary does not replace a passage](canonical-documents-and-packages.md#extract-summarize-and-revise-deliberately) · [provider budget, a different question](request-context-and-cost.md#budget-accounting) · [author a content package](../../runbooks/content-package-authoring.md). This page is the route. The contracts moved once, and the headings below remain so existing anchors still resolve.

**Selected versus realized.** The selected promises (pinned roots, exact identity, derived-only summaries and indexes, fork-safe visibility) live in the owners above. The realized prototype is summarized once, in [Canonical documents and packages](canonical-documents-and-packages.md#selected-requirements-and-current-realization) and [Context selection and recall](context-selection-and-recall.md); implemented package behavior is [packages/storyteller](../../../packages/storyteller/README.md) and demonstrated coverage is [progress](../../../STATUS.md). The [2026-11 engine-model inspection](../../../evidence/inspections/doc01-retained-observations/engineering/engine-model.md) is dated evidence, not an owner. Remaining storage and memory gaps are historical proposals ([canonical storage](../../../work/designs/archive/legacy-initiatives-index/PARKED-2026-11-15.md#canonical-campaign-storage), [memory/recall](../../../work/designs/archive/legacy-initiatives-index/PARKED-2026-11-15.md#storyteller-memory-and-situated-recall)), not current authority. There are no chapters: see [concepts](../../product/foundations/concepts.md).

## Who owns which promise

Each promise has exactly one owner. The headings after this table are retained only so older anchors resolve; each is a one-line route, and the owner holds the text.

| Promise | Owner |
| --- | --- |
| Document revision, canon provenance, published-passage identity | [Canonical documents and packages](canonical-documents-and-packages.md) |
| Package pin, manifest, import, start | [Campaign bootstrap](canonical-documents-and-packages.md#campaign-bootstrap), [world libraries](canonical-documents-and-packages.md#reusable-world-libraries-and-campaign-overlays), [rule libraries](canonical-documents-and-packages.md#reusable-rule-libraries) |
| What source enters this task | [What source enters this task](context-selection-and-recall.md#what-source-enters-this-task) |
| Bounded task context and omission | [Build context for a specific decision](request-context-and-cost.md#build-context-for-a-specific-decision) |
| Effective spending | [Usage policy](../platform/spending-and-entitlements.md); figures on the request page are not that entitlement |
| Summaries | Derived only: [Extract, summarize and revise deliberately](canonical-documents-and-packages.md#extract-summarize-and-revise-deliberately) |
| Search and embeddings | Evaluation scope, not demonstrated recall: [Search belongs in the POC](context-selection-and-recall.md#search-belongs-in-the-poc) |
| Operation loop | [Operation and controller](./operation-and-controller.md); this route selects no second agent |

Normal: an admitted task captures the source revision it may use, and publication checks that identity. Negative: a document revised after that snapshot does not become current truth for the already-admitted task; a lossy summary does not replace the original source identity; a private possibility stays noncanonical until publication admits it ([Six kinds of record](../../product/gameplay/continuity.md#six-kinds-of-record)).

## Product commitment

Moved to [Product commitment](canonical-documents-and-packages.md#product-commitment).

## One owner per kind of truth

Moved to [One owner per kind of truth](canonical-documents-and-packages.md#one-owner-per-kind-of-truth).

## Reusable world libraries and campaign overlays

Moved to [Reusable world libraries and campaign overlays](canonical-documents-and-packages.md#reusable-world-libraries-and-campaign-overlays). Authoring a checked-in package is [the content-package guide](../../runbooks/content-package-authoring.md), which does not own the contract.

## Reusable rule libraries

Moved to [Reusable rule libraries](canonical-documents-and-packages.md#reusable-rule-libraries); which sections enter a task is [What source enters this task](context-selection-and-recall.md#what-source-enters-this-task).

## A concrete workspace

Moved to [A concrete workspace](canonical-documents-and-packages.md#a-concrete-workspace).

### Campaign bootstrap

Moved to [Campaign bootstrap](canonical-documents-and-packages.md#campaign-bootstrap).

### Semantic locality and context cost

Moved to [Semantic locality and context cost](context-selection-and-recall.md#semantic-locality-and-context-cost) (read selection) and [What source enters this task](context-selection-and-recall.md#what-source-enters-this-task) (one-shot capture). Provider budget is [Request context and cost](request-context-and-cost.md).

### Document envelope

Moved to [Document envelope](canonical-documents-and-packages.md#document-envelope).

## The Storyteller as a versioned bundle

Moved to [The Storyteller as a versioned bundle](canonical-documents-and-packages.md#the-storyteller-as-a-versioned-bundle).

## Agent working cycle

Split: publication constraints are [Descriptive changes and the revision fence](canonical-documents-and-packages.md#descriptive-changes-and-the-revision-fence); the read cycle is [Agent working cycle](context-selection-and-recall.md#agent-working-cycle); cost is [bounded work](./request-context-and-cost.md#bounded-work-not-an-open-ended-agent).

## Mechanical continuity dependencies — S3 design

Moved to [Mechanical continuity dependencies — S3 design](context-selection-and-recall.md#mechanical-continuity-dependencies--s3-design); next implementation contract, not current behavior.

## Extract, summarize and revise deliberately

Moved to [Extract, summarize and revise deliberately](canonical-documents-and-packages.md#extract-summarize-and-revise-deliberately).

## Search belongs in the POC

Moved to [Search belongs in the POC](context-selection-and-recall.md#search-belongs-in-the-poc); conceptual future retrieval, not ordinary one-shot execution.

## Publication across files and the execution ledger

Moved to [Publication across files and the execution ledger](canonical-documents-and-packages.md#publication-across-files-and-the-execution-ledger).

## Recovery, inspection and portability

Moved to [Recovery, inspection and portability](canonical-documents-and-packages.md#recovery-inspection-and-portability).

## Concrete acceptance flows

Moved to [Concrete acceptance flows](context-selection-and-recall.md#concrete-acceptance-flows).

## Research informing the contract

Split: [storage](canonical-documents-and-packages.md#research-informing-storage) and [retrieval](context-selection-and-recall.md#research-informing-retrieval); neither selects a vendor or proves recall quality.
