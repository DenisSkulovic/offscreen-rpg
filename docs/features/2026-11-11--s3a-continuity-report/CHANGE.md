# S3a change: distinguish continuity evidence in the existing report

**Type:** Code-bearing implementation Change (developer diagnostic tool, not a new product capability).
**Status:** Proposed for the **next coding session**, not authorized or implemented by this documentation audit. Revalidate the source and obtain the owner's go-ahead when returning to coding.
**Parent initiative:** [Vvardenfell Story-mode continuity, S3a](../2026-09-21--21-56--story-mode-vvardenfell-continuity/PLAN.md#s3a--make-the-causal-baseline-inspectable--nearest-slice).
**Technical authority:** [Canonical files and mechanical dependencies](../../technical/canonical-files.md#mechanical-continuity-dependencies--s3-design), [connected proof and corrected October memory diagnosis](../../engineering/connected-poc-proof.md#memory-reinspection--2026-10-23).

## One bounded code outcome

Make the **existing** local Story report expose an inspectable, prose-minimized distinction among (1) **proposed** note/document mutations, (2) **admitted/published** generation outcomes, (3) **retained current** note/document source identities, and (4) **selected versus actually packed** final-request evidence where those fields exist.

The goal is diagnostic attribution of a missed continuation, not automatic memory creation, new retrieval, a new trace framework, or any live model invocation.

## Source-verified starting point

The real file on November 11 is [`scripts/repo-tools/story-session-report.mjs`](../../../scripts/repo-tools/story-session-report.mjs). The old parent plan incorrectly named `tools/chamber/scripts/story-session-report.mjs`, which is absent.

The script **already** reads generation/publication/attempt state from local PostgreSQL; summarizes output `documentChanges`, note-change counts and option `contextDependencies`; inspects canonical `loadedDocuments`/`documentSelection`; records final request message shapes; and optionally reads an HTTP story snapshot. Do **not** duplicate those fields or infer unseen current-note identities. Identify the actual missing evidence by tracing the current source owner.

## Scope and exclusions

**Intended code delta:** the existing report command and only the smallest associated helper/fixture/test genuinely needed to prove the added metadata. Do not modify Storyteller task contracts, publication, retrieval, gameplay rules, SQL schema, provider budgets, or the visual Chamber. No new paid provider calls, DB resets, deployments or data mutation are permitted by this packet.

**Acceptance:**
- A generation summary differentiates *proposed* changes, *committed/published* status and *current retained* identity, where persisted evidence supports those statements. Unknown/unavailable is explicit.
- The report differentiates selected document handles from what is demonstrably in the captured final request, without treating catalogue presence as proof of packed source text.
- Default output contains safe IDs, counts, statuses and hashes, not raw private paragraphs, keys or whole model prompts.
- Existing report uses read-only local queries and never dispatches a provider; missing evidence remains labeled, never fabricated.

**Negative proof:** a proposed document change later rejected/unpublished must not be counted as a retained canonical document. A document present only in a catalogue must not be reported as packed in the final request.

## Completion evidence

Use safe source/fixture inspection and a focused provider-free verification when the owner authorizes the code session. If a real DB is needed, ask for explicit disposable/local target approval before running anything. The change is Done only when an actual code diff and corresponding verification receipt exist.

**Separate follow-on work:** the S3a provider-free note-only/document-backed restart/return scenarios, S3b required dependency final packing, S3c offer-to-accepted-work carriage, S3d materialization, S4 connected play and human acceptance. These are **not** authorized by implementing this report change.
