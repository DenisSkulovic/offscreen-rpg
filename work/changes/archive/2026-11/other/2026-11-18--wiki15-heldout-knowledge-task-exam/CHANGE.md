# WIKI15 | Create and actually execute a provider-free held-out wiki correctness examination

**State:** Done (2026-11-18).

## First-screen handoff for Cursor

**Why:** DOC24 Done expressly left the cross-corpus editorial comprehension test unexecuted. Existing static reachability and retrieval tests do not establish correct section authority or contract answers.

**Exact primary owners:**
- [scripts/repo-tools/wiki-core/route-self-test.mjs](../../../../../../scripts/repo-tools/wiki-core/route-self-test.mjs)
- [scripts/repo-tools/wiki-core/bench.mjs](../../../../../../scripts/repo-tools/wiki-core/bench.mjs)
- [scripts/repo-tools/wiki-core/route.mjs](../../../../../../scripts/repo-tools/wiki-core/route.mjs)
- [docs/technical/lab/chamber-and-fixtures.md](../../../../../../docs/technical/lab/chamber-and-fixtures.md)

Implement/revise **only** the designed knowledge-system outcome below. The technical/source owners above are navigation routes; verify exact exports and selected headings at current HEAD. When a source path differs, stop and repair this plan before applying a larger diff.

## Intended work

1. Freeze 15-20 task prompts and independently reviewed gold: governing heading, selected/proposed classification, current realization source, required negative and accepted 'unknown/stop' cases.
2. Measure baseline using existing deterministic find/read behavior: owner recall@K, authority errors, negative-case misses, number of pages/section bytes opened and false confidence; report observed failures.
3. Add discriminating fixtures: proposed raw prompt access, old notification vs GET, accepted-time dependencies, unknown charged attempt, world-package pin, no-humanoid assumptions, proposal for shared consent.
4. Provide real reproducible results and a report; make no claims of human/model answer correctness unless a separately approved fresh-agent trial actually happened.

Do not invent product policy, treat proposal as selected, require external services, mass rewrite the wiki, copy another registry, or automatically select another packet. A duplicate page/link/score can be worse than a missing one.

## Planned specification and implementation delta | planned-impact.v1

| Plane | Selected authority and exact change/no-op | Related documents/maps to inspect | Evidence/decision |
| --- | --- | --- | --- |
| Product | unchanged because the accepted game promises are used to key answers, never rewritten to improve retrieval scores | `docs/product/README.md` and relevant selected claims as noneditable authority | Before/after product meaning unchanged; explicit owner review for any exception |
| Technical | changed: one method sentence on docs/technical/lab/chamber-and-fixtures.md#editorial-comprehension-pass, leaving lab proof tiers intact. The sentence says the finder check is not a Chamber gameplay proof and not a comprehension exam of the whole corpus. | docs/technical/lab/chamber-and-fixtures.md#editorial-comprehension-pass | No inferred new runtime behavior; negative classification proof |
| Code | changed: provider-free runner scripts/repo-tools/wiki-core/heldout-exam.mjs and frozen gold scripts/repo-tools/wiki-core/heldout-questions.mjs. route.mjs classification was not retuned. Negative: an unratified grant or prohibited staff read scored as selected fails the question. | scripts/repo-tools/wiki-core/heldout-exam.mjs | Real focused fixtures, no provider/DB/deploy |
| Related | changed: dated result at evidence/runs/2026-11-18-wiki15-heldout-exam/RESULT.md for the actual run, question version and measured misses; no fake live agent test or alternate status registry | evidence/runs/2026-11-18-wiki15-heldout-exam/RESULT.md | Inbound link integrity, no duplicated owner, meaningful semantic review |

## Acceptance and falsification

**Normal:** a fresh agent obtains the right governing claim, correct authority status, relevant dependent and accurate source/proof boundary with bounded reading. **Negative:** A full 81/81 link index is labeled semantically correct despite misclassifying a prohibited staff read or inability to answer the shared-play policy.

**Checks and evidence:** Unit fixtures and actual deterministic run at recorded SHA, with unresolved items and false-positive retrieval cost separately reported. Record actual commands and results, input revision, skipped tests and novel unknowns. Run existing `pnpm wiki:change-guard --mode plan` and `--mode close` for the selected packet in the full checkout. A clean route or 'Done' label cannot substitute for semantic acceptance.

## Reconciliation ledger (fill only after real execution)

| Affected selected claim/heading | Authority | Target delta (changed/unchanged; reason) | Source delta & inspected SHA | Status/evidence tier | Negative proof | Map/link update or N/A |
| --- | --- | --- | --- | --- | --- | --- |
| scripts/repo-tools/wiki-core/heldout-exam.mjs | development tooling | changed: new provider-free exam over the existing finder and reader, with gold frozen in scripts/repo-tools/wiki-core/heldout-questions.mjs | scripts/repo-tools/wiki-core/heldout-exam.mjs at b3113814 dirty. Exit 1. pass 8, miss 10, ownerRecall@5 15/18, authorityErrors 0, negativeMisses 0, scoredAsSelected 0, falseConfidence 7, bytesOpened 46602. Command result below. | fixture-tested retrieval measurement; not a corpus comprehension pass | A prohibited staff read or an unratified grant scored as selected fails the question. scoredAsSelected was 0. | No product route was rewritten. |
| scripts/repo-tools/wiki-core/route.mjs | development tooling | unchanged: wiki.route.v2 section-local classification stayed as WIKI12 left it, so this exam could not raise a score by relabeling authority | scripts/repo-tools/wiki-core/route.mjs inspected at b3113814; this change did not edit it | recorded measurement only | The Turn Evidence Capsule stayed proposal inside the selected evidence-graph page. Scene-direction production stayed uncertain and not-paid-production. | No classification rule was rewritten. |
| docs/technical/lab/chamber-and-fixtures.md#editorial-comprehension-pass | technical | changed: one sentence says the finder check is a maintainer retrieval check, not a Chamber gameplay proof and not a comprehension exam of the whole corpus. Proof tiers stay as written. | docs/technical/lab/chamber-and-fixtures.md#editorial-comprehension-pass at b3113814 | source-observed heading after that sentence was added | The note does not turn a link-index check into semantic agreement, and it does not authorize a gameplay proof. | The heading stayed on the Chamber page. |
| docs/product/README.md | product | unchanged: accepted game promises stayed the answer key and were not rewritten to improve retrieval scores | no source behavior changed; product pages were not edited at b3113814 | recorded measurement only | An unratified shared-consent note was not promoted into a selected product rule. | No product map was rewritten. |
| evidence/runs/2026-11-18-wiki15-heldout-exam/RESULT.md | evidence | changed: dated record of this run only. No fresh-agent score and no human score were added. | evidence/runs/2026-11-18-wiki15-heldout-exam/RESULT.md copied from the command at b3113814 | fixture-tested command transcript | A green link index is not semantic correctness. Retention stayed proposal. | The result is not a second status registry. |

### Command result

`node scripts/repo-tools/wiki-core/heldout-exam.mjs` exited 1 at short SHA `b3113814` (`b3113814943f7a54c3a43f0b0227764c432cfa59`), dirty worktree. Provider spend: no call. Database: not used.

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

Recall misses, left as misses: `old-notification-current-view`, `no-unadmitted-human-action`, `green-link-not-semantic`. Seven other misses are false confidence: the gold stayed proposal or uncertain, and the lead hit was a different selected heading. Shared consent stayed proposal. The selected lead was `docs/product/gameplay/worlds-and-characters.md#shared-play-product-target-unsettled-mechanics`.

`pnpm wiki:change-guard --mode plan --change work/changes/archive/2026-11/other/2026-11-18--wiki15-heldout-knowledge-task-exam` returned ok with no findings. `pnpm wiki:change-guard --mode close --change work/changes/archive/2026-11/other/2026-11-18--wiki15-heldout-knowledge-task-exam --base b3113814` returned failed: 74 undeclared-path errors, 9 missing-dependent-disposition errors, and 243 warnings. The full checkout diff includes other in-flight files. This packet does not adopt those files.

**Stop rules:** any need to enlarge source or product authority, use paid provider, migrate DB, or claim new permissions requires a separate owner decision. No self-authorization and no automatic next packet.
