# REAL02 | Prove or classify the gift-to-canon-to-recall chain with existing machinery

**State:** Done (2026-11-18). The whole publication-and-restart chain is not claimed. Staging, transfer settlement, and the knowledge loader were tested. Database publication, admission restart, and the budget path were not run. **Kind:** implementation (tests/evidence only; no runtime feature launch). **Owner:** application/Storyteller correctness. **Source observed:** `main@c1d1aab9f9e9b711252a955c4f3d11c7377a7d06`. **Parent:** [REAL technical chain](../../../../../designs/open/playability-reality/TECHNICAL-CHAIN.md), [forensic fixture](../../../../../designs/open/playability-reality/REAL02-SOURCE-MAP.md).

## Cursor first-screen brief

> **Target:** Show precisely what survives an accepted item transfer and a named social promise across publication, document root, source lookup and the **final captured next task**. **Trap:** a green SA09 helper test, a document staged by itself, or a catalogue hit is **not** evidence of full published narrative recall. **Scope:** test and inspection only with existing source contracts; no new model, graph, embeddings, heuristic noun extractor, production data, and no provider inference.

## Outcome

Produce a falsifiable, provider-free chain receipt for one named gift/promise and contrasting failures, distinguishing:
1. committed exact holder transfer and admissible action;
2. source passage vs proposed document vs *published* canonical record;
3. current source selection and final task context after unrelated turns/restart;
4. absent model proposal vs invalid/misclassified proposal vs unavailable source;
5. actual behavior from intended future semantic guarantee.

A genuine successful chain test may still leave the **hardest** issue open: the model can omit the necessary `documentChanges`, since that list defaults to empty. Document that separately as a demonstrated semantic gap, not an invented production guard.

## Current source evidence and design target

- packages/game/src/effects.ts `item.transfer.v1`; packages/game/src/immediate-actions.ts `itemTransferBlocked`; same offered-choice identity rules. Only a committed transfer may change an item's holder.
- packages/storyteller/src/tasks/index.ts `documentChangeRules` prompts *optional* bounded proposals (max eight); packages/storyteller/src/tasks/document-changes.ts validates kind, authority, visibility, revision/path and optional `recallAs`.
- packages/storyteller/src/tasks/descriptive-materialization.ts `decideDescriptiveMaterialization` and fixtures are pure helpers in tests/developer harness. Source search did **not** show it invoked by normal packages/application/src/storyteller/publication.ts.
- packages/application/src/storyteller/publication.ts stages and commits source-linked documents for eligible consequence/continuation tasks and fences generation/root; packages/application/test/story-publication-documents.test.mjs proves staged store behavior. This isn't itself a full current-story pub/reentry test.
- docs/technical/storyteller/context-selection-and-recall.md says mechanical-choice document dependency sidecar is S3 design, *not landed*. Canonical catalogue/search result existence does not mean exact next prompt inclusion.

Preserve docs/product/gameplay/continuity.md#knowledge-and-perspective and #context-and-cost, docs/product/gameplay/possessions-and-exchanges if present (inspect exact headings), docs/technical/storyteller/generation-and-publication.md and docs/technical/storyteller/canonical-documents-and-packages.md. Read current owners rather than assume a stale link.

## Implementation/test slice (only provider-free)

**Step 0: trace (no code yet).** Record a single path through offer → selected action → effect → accepted work → generation result → staged document → publication → new task context; exact functions and source SHA. Distinguish `capture-materialization.ts` ENG03 context CAS from *semantic* NPC materialization.

**Step 1: reuse precise tests.** Extend the nearest existing Storyteller fixture tests and packages/application/test/story-publication-documents.test.mjs with named-gift success, failed holder or check, crowd omission, attributed rumor and stale revision. Reuse `createDescriptiveMaterializationFixtures` as one component, never claim it is wired into runtime. Prefer zero new production code. Ensure transfer test uses real game effect validation rather than assertion on a handwritten JSON receipt.

**Step 2: publication path.** Where a safe local DB harness already exists, exercise actual application publication/root update and idempotent retry in a disposable DB + local canonical store. Otherwise record "staging only" as the tested tier and exact integration blocker. Do **not** create a mock publisher named as live publication.

**Step 3: return context.** Test a next-task context selected from actual published canonical IDs, with irrelevant entries, restart, wrong identity and stale source. Assert that the **request body/context actually contains the exact allowed current version**, not just an index lead. If the missing mechanical dependency prevents this, report it and stop; S3 is not silently accepted.

**Step 4: negative semantic gap.** Produce a model-result fixture where gift + stated promise exist but documentChanges=[]. Demonstrate what source still exists and what relationship does not. Tests should check **honest classification** and intentionally preserve the gap; do not add a blanket production error that rejects all unmaterialized prose.

**Output:** compact dated source-linked evidence/inspections REAL02 receipt with table R0–R6 (from REAL02-SOURCE-MAP.md), command results, exact commit, environment, a no provider assertion, tested vs blocked, recommendation: improve prompt/selection / narrow cue / defer. Avoid a receipt that hides a missed semantic record.

## Explicit exclusions

No provider call, API bill, hosted DB, migrations, existing account mutation, auto-generation retry, second graph DB, Cognee, embedding ingestion, new general item ownership model, always-on extractor, arbitrary source context expansion, fixing documented multi-round `budget.settle` defect, or replacing normal gameplay publication. If test requires unselected product policy, stop for owner decision.

## Acceptance and discriminating negatives

- **Normal:** true holder/receipt and one source-linked canonical relationship document can survive actual tested boundaries, including exact allowed source in a subsequent context if environment supports that tier.
- **Negative:** failed holder must not be rendered as actual gift; rumor must remain attributed; an absent proposal is **not** called durable relationship; stale revision/private doc cannot be sourced; duplicate publish cannot duplicate item effects; missing required memory must produce an explicit gap/hold, never fabricated "recall".
- **No greenwashing:** a test that only verifies parsed Zod fields must be reported as schema proof, not semantic reliability.

## Planned specification and implementation delta | planned-impact.v1

| Plane | Selected authority and exact change/no-op | Related documents/maps to inspect | Evidence/decision |
| --- | --- | --- | --- |
| Product | unchanged because no new gameplay semantic policy is selected | docs/product/gameplay/continuity.md; actions-and-commitments.md | Existing identity/gift/rumor principle retained |
| Technical | unchanged because this packet records observed behavior and does not rewrite the selected recall or publication contract | docs/technical/storyteller/context-selection-and-recall.md; docs/technical/storyteller/generation-and-publication.md | Tested tier, not a capability promotion |
| Code | changed: **tests only** in packages/application/test/story-publication-documents.test.mjs and nearest current Storyteller/game integration tests; executable negative classification and exact context assertions. Runtime source unchanged because goal is forensic characterization, not semantic gate rollout | packages/application/src/storyteller/publication.ts; packages/storyteller/src/tasks/descriptive-materialization.ts; packages/game/src/effects.ts | Targeted provider-free runs, no automatic paid tasks |
| Related | changed: new dated REAL02 evidence receipt **only after tests actually run**; update STATUS.md only for proven tier and source map if needed | evidence/README.md; work/changes/ledger/2026-11.md after Done | Missing-edge and source receipt explicit |

## Completion and release gate

Use the repo's own supported Node/pnpm and safe test isolation. Record exact commands/output (Node version, worktree revision). If only helper/staging tiers can be exercised, do not mark the whole chain complete; mark blocked for the unavailable portion or split an honestly narrow completed packet and a follow-up. Complete the four-plane reconciliation ledger for every authority; archive only the bounded verified result and update queue. Never auto-start REAL03. Stop if the current source moved beyond the inspected map or a bigger architecture change is needed.

## Reconciliation ledger

| Affected selected claim/heading | Authority | Target delta (changed/unchanged; reason) | Source delta & inspected SHA | Status/evidence tier | Negative proof | Map/link update or N/A |
| --- | --- | --- | --- | --- | --- | --- |
| docs/product/gameplay/continuity.md#possessions-and-exchanges | product | unchanged because a failed holder still does not become a successful gift in the selected rule | packages/application/src/campaign/action-execution-transition.ts at c1d1aab9 | fixture-tested | a roll of 1 returns no world effect, and a wrong holder interrupts | the heading stayed in place |
| docs/product/gameplay/continuity.md#knowledge-and-perspective | product | unchanged because an attributed rumor is still not world fact | packages/application/test/story-publication-documents.test.mjs at c1d1aab9 | fixture-tested | the beacon rumor is stored as attributed lore | the heading stayed in place |
| docs/product/gameplay/continuity.md#context-and-cost | product | unchanged because this packet does not select a new recall or spend rule | docs/product/gameplay/continuity.md at c1d1aab9 | source-observed | empty document changes do not invent a relationship | the heading stayed in place |
| docs/technical/storyteller/context-selection-and-recall.md#mechanical-continuity-dependencies--s3-design | technical | unchanged because mechanical document dependencies remain a design and were not implemented | packages/application/src/storyteller/canonical-knowledge.ts at c1d1aab9 | fixture-tested | nine later identities leave the favor unloaded until its id is requested | the heading stayed in place |
| docs/technical/storyteller/generation-and-publication.md#what-publication-is-allowed-to-do | technical | unchanged because publication was not given a new semantic refusal | packages/application/src/storyteller/publication.ts at c1d1aab9 | source-observed | the stager stores a favor the failed transfer did not authorize | the heading stayed in place |
| packages/application/test/story-publication-documents.test.mjs | code | changed: the gift chain is classified at the transfer, staging, and loader seams | packages/application/test/story-publication-documents.test.mjs at c1d1aab9 | fixture-tested | a failed check stages no relationship, and a private possibility is still loaded | evidence/inspections/2026-11-18-real02-gift-recall/README.md |
| STATUS.md | related | changed: the status note names the tested seams and the unrun database publication | no runtime source edited; baseline c1d1aab9 | fixture-tested | the note does not call this a played recall | the queue records the packet |

exception: evidence/inspections/2026-11-18-real02-gift-recall/README.md because the dated inspection is the receipt for the tests that ran
exception: work/changes/README.md because the queue line is the selection route for this packet
exception: work/changes/ledger/2026-11.md because the closed-work index records this packet
exception: evidence/README.md because the inspection index points at the dated REAL02 receipt
exception: work/designs/open/playability-reality/README.md because the program sequence now points at the archived REAL02 packet
exception: work/changes/archive/2026-11/README.md because the month index lists the archived packet

## Receipt

Node v24.19.0. `node --test test/story-publication-documents.test.mjs` reported 6 passed. `node --test test/item-transfer-transition.test.mjs` reported 4 passed. No model call. `publishStorytellerResult` was not executed. The private-text load and the favor-after-failure store are recorded gaps, not new production refusals.
