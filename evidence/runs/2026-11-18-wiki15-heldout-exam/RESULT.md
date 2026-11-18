# WIKI15 held-out retrieval exam

Maintainer retrieval check of the deterministic finder. Not a Chamber gameplay proof. Not a fresh-agent score. Not a human score. Not a claim that the wiki corpus is semantically correct.

**Command:** `node scripts/repo-tools/wiki-core/heldout-exam.mjs`  
**Exit:** 1  
**HEAD:** `b3113814` (`b3113814943f7a54c3a43f0b0227764c432cfa59`), dirty worktree.  
**Route schema:** `wiki.route.v2`. **Bound:** top 5, 5000 characters per gold section. **Provider spend:** no call. **Database:** not used.

Gold was frozen in `scripts/repo-tools/wiki-core/heldout-questions.mjs` before this run. Target pages were not edited to hide a miss. `scripts/repo-tools/wiki-core/route.mjs` classification rules were not changed.

## Command result

```
wiki.heldout.v1 wiki.route.v2 @ b3113814943f7a54c3a43f0b0227764c432cfa59 dirty
short b3113814  k=5  maxChars=5000
questions 18  uniqueRefs 17
pass 8  miss 10
ownerRecall@5 15/18
uniqueOwnerRecall 14/17
authorityErrors 0
negativeMisses 0
scoredAsSelected 0
falseConfidence 7
bytesOpened 46602  sectionBytes 67279  pagesRead 15  reads 18
passes: folded-invariants-nested-proposal, get-not-sse-hint, accepted-time-dependencies, unknown-charged-attempt, unknown-metering-stop, world-package-pin, no-humanoid-inventory, charter-withholds-raw-prompt
MISS raw-prompt-staff-read  false-confidence
  gold docs/technical/observability/identities-and-evidence.md#turn-evidence-capsule  proposal  indexed proposal/proposal proposed
  lead docs/technical/admin/investigation-and-privacy.md#6-sensitive-evidence-hierarchy  normative  selected=true  truncated=false
MISS turn-capsule-nested-proposal  false-confidence
  gold docs/technical/observability/identities-and-evidence.md#turn-evidence-capsule  proposal  indexed proposal/proposal proposed
  lead docs/technical/observability/identities-and-evidence.md#evidence-graph--typed-durable-historically-faithful-data  normative  selected=true  truncated=false
MISS raw-prompt-proposed-page  false-confidence
  gold docs/product/admin/ai-engineering-and-investigation.md#ai-engineering-and-investigation  proposal  indexed proposal/proposal proposed
  lead docs/technical/admin/commands-and-audit.md#1-operational-intent-is-not-a-raw-crud-mutation  normative  selected=true  truncated=true
MISS retention-unratified-grant  false-confidence
  gold docs/technical/observability/retention-and-access.md#replay-retention-and-privacy--time-travel-without-rewriting-history  proposal  indexed proposal/proposal proposed
  lead docs/technical/platform/data-and-persistence.md#changes-retention-and-deletion  normative  selected=true  truncated=true
MISS multi-day-family-proposal  false-confidence
  gold docs/product/storyteller/behavior-and-quality.md#multi-day-evaluation-family  proposal  indexed proposal/proposal proposed
  lead docs/technical/admin/commands-and-audit.md#8-negative-acceptance  normative  selected=true  truncated=false
MISS scene-direction-not-paid  false-confidence
  gold docs/technical/client/scene-direction-production.md#storyteller-art-direction--bounded-author--publication--reader-target  uncertain  indexed uncertain/uncertain not-paid-production
  lead docs/product/experience/design-system-and-expression.md#experience-acceptance  normative  selected=true  truncated=true
MISS old-notification-current-view  owner-recall
  gold docs/product/gameplay/time-and-autonomy.md#notifications-and-reliability  selected  indexed normative/ratified-product unknown
  lead docs/technical/admin/investigation-and-privacy.md#3-relationship-semantics-and-current-single-owner-source  normative  selected=true  truncated=false
MISS shared-consent-proposal  false-confidence
  gold work/designs/open/shared-play/README.md#shared-play--open-design  proposal  indexed proposal/proposal proposed
  lead docs/product/gameplay/worlds-and-characters.md#shared-play-product-target-unsettled-mechanics  normative  selected=true  truncated=false
MISS no-unadmitted-human-action  owner-recall
  gold docs/product/storyteller/behavior-and-quality.md#what-it-must-not-do  selected  indexed normative/ratified-product unknown
  lead docs/technical/engine/mechanics-and-capabilities.md#admitted-action-and-time  normative  selected=true  truncated=false
MISS green-link-not-semantic  owner-recall
  gold docs/technical/lab/chamber-and-fixtures.md#editorial-comprehension-pass  selected  indexed normative/selected-technical not-paid-production
  lead docs/product/admin/README.md#admin-product  normative  selected=true  truncated=false
No fresh-agent score and no human score. A green link index is not semantic correctness. This is not a comprehension exam of the whole corpus.
```

## How a miss was counted

A question passes only when the gold heading is in the matching lane at 5, the indexed authority matches the gold, the bounded read contains the required negative, and a proposal or uncertain gold is not led by a selected hit. `scoredAsSelected` means the gold heading itself was returned in the normative lane. That count is 0. Retention stayed proposal. The Turn Evidence Capsule stayed proposal. Scene-direction production stayed uncertain and `not-paid-production`.

False confidence means the gold stayed in the unselected lane and the finder's lead hit was still a selected heading. Those seven are misses. They are not authority errors.

## Recall misses

The finder did not place these gold headings in the top 5 of the matching lane. The pages were not edited.

- `old-notification-current-view` led with `docs/technical/admin/investigation-and-privacy.md#3-relationship-semantics-and-current-single-owner-source`.
- `no-unadmitted-human-action` led with `docs/technical/engine/mechanics-and-capabilities.md#admitted-action-and-time`.
- `green-link-not-semantic` led with `docs/product/admin/README.md#admin-product`.

Shared consent stayed a proposal at `work/designs/open/shared-play/README.md#shared-play--open-design`. The lead was the selected heading `docs/product/gameplay/worlds-and-characters.md#shared-play-product-target-unsettled-mechanics`. That is false confidence, not a promotion of the open design.

Opened text: 18 reads, 15 pages, 46602 bytes emitted, 67279 bytes in those full sections. Two questions share the Turn Evidence Capsule heading, so unique owner recall is 14/17.

Change-guard plan for this packet returned ok with no findings. Close against `b3113814` returned failed: 74 undeclared-path errors, 9 missing-dependent-disposition errors, and 243 warnings. The full checkout diff includes other in-flight files. This exam does not adopt those files.
