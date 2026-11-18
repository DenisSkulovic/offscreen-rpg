# REAL02 | Prove or classify the gift-to-canon-to-recall chain with existing machinery

**State:** Ready for narrow provider-free characterization when selected; blocked on any required unsafe DB/provider environment. **Kind:** implementation (tests/evidence only; no runtime feature launch). **Owner:** application/Storyteller correctness. **Source observed:** `main@43d5ddfc068aced3825e25692ec1b2bb14259e2a`; re-inspect. **Parent:** [REAL technical chain](../../../designs/open/playability-reality/TECHNICAL-CHAIN.md), [forensic fixture](../../../designs/open/playability-reality/REAL02-SOURCE-MAP.md).

## Cursor first-screen brief

> **Target:** Show precisely what survives an accepted item transfer and a named social promise across publication, document root, source lookup and the **final captured next task**. **Trap:** a green SA09 helper test, a document staged by itself, or a catalogue hit is **not** evidence of full published narrative recall. **Scope:** test and inspection only with existing source contracts; no new model, graph, embeddings, heuristic noun extractor, production data or paid inference.

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

**Output:** compact dated source-linked evidence/inspections REAL02 receipt with table R0–R6 (from REAL02-SOURCE-MAP.md), command results, exact commit, environment, no-provider assertion, tested vs blocked, recommendation: improve prompt/selection / narrow cue / defer. Avoid a green receipt that suppresses a missed semantic record.

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
| Technical | unchanged in normative behavior; if observed code deviates, record precise divergence and propose a separate owner-reviewed correction, do not quietly rewrite it | docs/technical/storyteller/context-selection-and-recall.md; generation-and-publication.md | Tested tier, not a capability promotion |
| Code | changed: **tests only** in packages/application/test/story-publication-documents.test.mjs and nearest current Storyteller/game integration tests; executable negative classification and exact context assertions. Runtime source unchanged because goal is forensic characterization, not semantic gate rollout | packages/application/src/storyteller/publication.ts; packages/storyteller/src/tasks/descriptive-materialization.ts; packages/game/src/effects.ts | Targeted provider-free runs, no automatic paid tasks |
| Related | changed: new dated REAL02 evidence receipt **only after tests actually run**; update STATUS.md only for proven tier and source map if needed | evidence/README.md; work/changes/ledger/2026-11.md after Done | Missing-edge and source receipt explicit |

## Completion and release gate

Use the repo's own supported Node/pnpm and safe test isolation. Record exact commands/output (Node version, worktree revision). If only helper/staging tiers can be exercised, **do not mark whole-chain passed**; mark blocked for the unavailable portion or split an honestly narrow completed packet and a follow-up. Complete the four-plane reconciliation ledger for every authority; archive only the bounded verified result and update queue. Never auto-start REAL03 paid test. Stop if the current source moved beyond the inspected map or a bigger architecture change is needed.
