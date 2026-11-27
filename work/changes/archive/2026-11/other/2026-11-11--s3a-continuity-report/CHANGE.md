# S3a change: distinguish continuity evidence in the existing report

**2026-11-18 executable decision:** [Backlog audit and acceptance](../../../../../designs/open/backlog-convergence-2026-11-18/README.md); [bounded contract choices](../../../../../designs/open/backlog-convergence-2026-11-18/CONTRACT-DECISIONS.md); [ordered Cursor handoff](../../../../../designs/open/backlog-convergence-2026-11-18/CURSOR-HANDOFF.md). The older Proposed/Blocked/No-code declarations retained below document the historical decision; they do not prohibit the **safe scoped implementation** now selected. External paid dispatch, nondisposable DB resets, production grants and irreversible accounting changes remain disallowed. A provider-free experiment that proves no new feature is needed must close with a source-backed positive alternative, not be parked again.

**Type:** Code-bearing implementation Change (developer diagnostic tool, not a new product capability).
**State:** Done (2026-11-18). The local Story report separates proposed, published, retained, selected, and packed evidence. A missing field is unknown. No model call and no database reset.

## Planned specification and implementation delta | planned-impact.v1

| Plane | Disposition | Owner | Negative |
| --- | --- | --- | --- |
| Product | unchanged because docs/product/foundations/concepts.md#the-answer-to-what-does-the-storyteller-do already treats a report as a different task from a player turn | docs/product/foundations/concepts.md | A continuity report does not publish a passage |
| Technical | changed: docs/technical/storyteller/context-selection-and-recall.md#mechanical-continuity-dependencies--s3-design records that the local report separates the five evidence states and leaves the mechanical contract unimplemented | docs/technical/storyteller/context-selection-and-recall.md | A missing field stays unknown |
| Code | changed: scripts/repo-tools/story-session-report.mjs adds the five-state provenance from persisted fields. Negative: a proposed body is not retained, and a catalogue-only handle is not packed | scripts/repo-tools/story-session-report.mjs | The report does not dispatch a provider |
| Related | changed: work/changes/README.md records this report and leaves the rest of S3 unselected | work/changes/README.md | Queue selection is not permission to start S3b |
**Parent initiative:** [Vvardenfell Story-mode continuity, S3a](../../../../../designs/archive/legacy-initiatives-index/PARKED-2026-11-15.md#vvardenfell-story-mode-continuity).
**Technical authority:** [Canonical files and mechanical dependencies](../../../../../../docs/technical/storyteller/context-and-memory.md#mechanical-continuity-dependencies--s3-design), [connected proof and corrected October memory diagnosis](../../../../../../research/legacy-engineering/connected-poc-proof.md#memory-reinspection--2026-10-23).

## One bounded code outcome

Make the **existing** local Story report expose an inspectable, prose-minimized distinction among (1) **proposed** note/document mutations, (2) **admitted/published** generation outcomes, (3) **retained current** note/document source identities, and (4) **selected versus actually packed** final-request evidence where those fields exist.

The goal is diagnostic attribution of a missed continuation, not automatic memory creation, new retrieval, a new trace framework, or any live model invocation.

## Source-verified starting point

The historically inspected file on November 11 was [`scripts/repo-tools/story-session-report.mjs`](../../../../../../scripts/repo-tools/story-session-report.mjs). The old parent plan incorrectly named `tools/chamber/scripts/story-session-report.mjs`, which is absent.

The script **already** reads generation/publication/attempt state from local PostgreSQL; summarizes output `documentChanges`, note-change counts and option `contextDependencies`; inspects canonical `loadedDocuments`/`documentSelection`; records final request message shapes; and optionally reads an HTTP story snapshot. Do **not** duplicate those fields or infer unseen current-note identities. Identify the actual missing evidence by tracing the current source owner.

## Scope and exclusions

**Intended code delta:** the existing report command and only the smallest associated helper/fixture/test genuinely needed to prove the added metadata. Do not modify Storyteller task contracts, publication, retrieval, gameplay rules, SQL schema, provider budgets, or the visual Chamber. No new paid provider calls, DB resets, deployments or data mutation are permitted by this packet.

**Acceptance:**
- A generation summary differentiates *proposed* changes, *committed/published* status and *current retained* identity, where persisted evidence supports those statements. Unknown/unavailable is explicit.
- The report differentiates selected document handles from what is demonstrably in the captured final request, without treating catalogue presence as proof of packed source text.
- Default output contains safe IDs, counts, statuses and hashes, not raw private paragraphs, keys or whole model prompts.
- Existing report uses read-only local queries and never dispatches a provider; missing evidence remains labeled, never fabricated.

**Negative proof:** a proposed document change later rejected/unpublished must not be counted as a retained canonical document. A document present only in a catalogue must not be reported as packed in the final request.

## Verification and completion receipt

Baseline `6e8abd8381f879bc9b1d45757029c49aab6f5f6f`. Provenance fixtures: 4, 0 failures. The fixture import does not open Postgres. `pnpm story:inspect` was not executed. No model call.

## Reconciliation ledger

| Affected selected claim/heading | Authority | Target delta (changed/unchanged; reason) | Source delta & inspected SHA | Status/evidence tier | Negative proof | Map/link update or N/A |
| --- | --- | --- | --- | --- | --- | --- |
| docs/product/foundations/concepts.md#the-answer-to-what-does-the-storyteller-do | product | unchanged because a local inspection report is not a player turn | docs/product/foundations/concepts.md at 6e8abd8381f879bc9b1d45757029c49aab6f5f6f | source-observed | the report does not publish a passage | the heading stayed in place |
| docs/technical/storyteller/context-selection-and-recall.md#mechanical-continuity-dependencies--s3-design | technical | changed: the heading now says the local report separates the five evidence states and the mechanical contract stays a target | scripts/repo-tools/story-session-report.mjs dirty against 6e8abd8381f879bc9b1d45757029c49aab6f5f6f | fixture-tested | a missing field stays unknown | the heading stayed in place |
| scripts/repo-tools/story-session-report.mjs | code | changed: each generation gains a continuity view of proposed identities, publication state, the retained root, selected handles, and packed bodies | scripts/repo-tools/story-session-report.test.mjs dirty against 6e8abd8381f879bc9b1d45757029c49aab6f5f6f | fixture-tested | a proposed body is omitted and a catalogue-only handle is not packed | the report command stays read-only |

exception: work/changes/README.md because the queue line is the selection route for this packet
exception: work/changes/ledger/2026-11.md because the closed-work index records this packet
exception: work/changes/archive/2026-11/README.md because the month index lists the archived packet
exception: work/designs/README.md because the design index counts this report as finished
exception: work/designs/open/backlog-convergence-2026-11-18/README.md because the backlog map records that this report is finished
exception: work/designs/open/backlog-convergence-2026-11-18/CURSOR-HANDOFF.md because the handoff must not ask for this report again
exception: work/changes/archive/2026-11/other/2026-11-11--s3a-continuity-report/PLAN.md because the execution plan records the landed report
exception: work/designs/archive/legacy-initiatives-index/AUDIT-2026-11-11.md because the audit link now points at the archived report
exception: work/designs/archive/legacy-initiatives-index/PARKED-2026-11-15.md because the parked initiative now points at the archived report

S3b stays unselected. This packet does not start it.

**Separate follow-on work:** the S3a provider-free note-only/document-backed restart/return scenarios, S3b required dependency final packing, S3c offer-to-accepted-work carriage, S3d materialization, S4 connected play and human acceptance. These are **not** authorized by implementing this report change.
