# Documentation and discovery maintenance

**Owns:** authority, semantic quality and maintenance of repository documentation. [Navigation standard](../references/documentation-navigation-standard.md) owns retrieval structure; [repository geography](../../REPOSITORY-STRUCTURE.md) owns placement/retirement; [submission standard](../references/planning-artifact-quality.md) owns Design/Change quality and scale.

## Documentation is the product bible — non-negotiable

Product docs own intended behavior, rights and acceptance. Technical docs translate these into owned contracts, identity, authority, failure/retry, concurrency and cost guarantees. Code/tests/evidence describe realization, not product authority. A green suite with materially stale permanent owners is not successful delivery.

### Admission: ratified target versus realization

Promote owner-accepted meaning into its canonical heading, even before code exists; distinguish selected future from implemented/proven. Unratified ideas stay in Design. Path placement alone grants no authority. For a settled defect, cite the accepted contract, repair code, reconcile actual realization and affected maps/STATUS/evidence. Do not rewrite unchanged product intent just to announce a passing test. If implementation contradicts authority, return exact file/symbol, conflict and negative case to owner/planner.

### Hard failure modes (including editorial Changes)

Reject stale or contradictory permanent authority, silent policy changes to match code, lost unique constraints during restructuring, and Done without required impact reconciliation. A documentation-only Change must preserve intended meaning or explicitly ratify changed meaning; link checks alone cannot establish correctness. Required proof that is NOT RUN cannot be called PASS or Done; any extended-assurance deferral follows [acceptance policy](../../WORKFLOW.md#9-verification-review-and-the-next-loop).

### Documentation impact review is mandatory for every material Change

Follow [work-unit admission and proof](../references/change-work-unit-standard.md#documentation-only-change-admission-and-proof) and [reconciliation skill](../skills/documentation-reconciliation/SKILL.md). Before Ready use planned-impact.v1 Product/Technical/Code/Related dispositions; each changed row names owner, each unchanged row gives concrete reason. Documentation kind has Code unchanged and semantic negative. New selected behavior/architecture/authority is promoted before implementation commission; settled fixes need no manufactured doc rewrite. Before closure reconcile actual diff and all known dependent claims in existing ledger, update affected owners and status. Scope to affected headings; no full wiki rewrite.

## Source-adjacent retrieval maps: required when ownership is complex

For complex/high-traffic code, maintain nearest README with current source vs selected target, source-inspected revision/date, 2–5 useful starting symbols/paths and contract/test links; include meaningful risk or counterexample. Use [L0–L4 retrieval](../references/documentation-navigation-standard.md#2026-11-12-explicit-layered-retrieval-contract-for-cheap-coding-agents) for long documents and narrow reads. Update map when owner, route, public export, schema/status, async/retry or authority boundary changes. No rewrite for irrelevant local rename, no universal file banners.

Knowledge-coverage review flags new public API route, exported contract, persisted entity, content package kind or command authority using Git change inventory. Record exact source path and disposition: already owned heading, add section, new authoritative owner, proposed design, task guide, or reasoned documented no-op (include `because` and admission reason on same line). Unlinked public endpoint remains review needed. Candidate is not canon; internal helpers with known owner need no new page.

Use [navigation checks](../references/documentation-navigation-standard.md#maintenance-without-documentation-theater) when moving headings/paths. A valid link does not prove the referenced symbol or guarantee remains correct.

## Editorial craft and semantic clarity

Every paragraph contributes a distinct claim, rationale, exception, example or evidence. Define terms and units; place authority, exceptions and consequential ordering next to the rule. Must/must not express binding behavior; may expresses permitted choice, not live authorization; should is recommendation. Modal or quantity changes that alter selected meaning need ratification. Date measured results; distinguish illustrative thresholds and proposed settings.

Product prose explains player/operator promise, agency, consequences and unacceptable surprise. Technical prose explains exact guarantee, why it exists, owned state/identity/revision and normal/diagnostic negative trace when complexity warrants. Link exact governing headings. Preserve essential nuance and counterexamples; delete generic slogans, repeated disclaimers, invented detail and obsolete instructions. Review whether a fresh reader could infer wrong behavior. Do not force every section into a template.

## One explanation, several useful levels

| Changed information | Maintained owner |
| --- | --- |
| Product purpose, behavior and rights | Existing product heading; root README only if orientation changes |
| Technical contract, domain/state authority | Existing technical heading, constrained by product |
| Actual capability or test outcome | STATUS and dated evidence with revision, environment and limits |
| Current work | QUEUE, selected CHANGE/TASK and optional current checkpoint |
| Code location or cross-file route | Nearest source map; link contract |
| Non-obvious local invariant | Comment beside governing code |
| Repeated operating mistake | Existing agent rule or skill; one policy owner |
| Human decision, alternatives and handoff | Session history; promote enduring meaning separately |

Find existing owner before creating one. Summaries are useful for distinct questions; copied contracts create drift. Update impacted links and known dependency rows. Active plans/specs are current statements, not amendment diaries. Keep real historical results and unique rationale with immutable provenance; see [retirement gate](../../REPOSITORY-STRUCTURE.md#promotion-and-deletion-gate).

At closure complete the existing affected-claim ledger: heading, changed/unchanged reason, inspected source/SHA, evidence tier, negative proof, map update. Guard verifies structural completeness and known dependencies, not semantic truth. [Reconciliation](../skills/documentation-reconciliation/SKILL.md) applies to changed/drifted owners only. Undertaking OVERVIEW is required when applicable; [workflow](../../WORKFLOW.md#3-undertaking-group-a-real-transformation) owns its progress and cadence.

## Keep the entry cheap

Root README gives short orientation; STATUS Orientation describes demonstrated reality; ROADMAP prioritizes; QUEUE alone selects global work. [Work taxonomy](../../work/WORK-TAXONOMY.md) defines valid selection. Use repo:brief and --checkpoint when resuming/disoriented; --json reports actual local SHA/branch/dirty paths and selection. No helper grants permission. Legacy initiative docs are historical.

Keep orientation around 200 words and current checkpoint around 300 as review signals, not rigid caps. repo:docs-health reports Change PLAN checkpoint size. [Submission scale](../references/planning-artifact-quality.md#4-submission-scale-and-measurement) governs entire Change/Design. A coherent permanent contract can be long if owned and selectively navigable. Do not fragment files to game sizes.

## Daily session continuity

Follow [session minutes](session-minutes.md): meaningful working-day entries use Europe/Vilnius date, actual decisions, alternatives, exclusions and observed results; update session index. History may record chronological corrections, unlike current normative instructions. Minutes are neither contract nor commission.

## Fresh-context discovery

Follow [mechanical retrieval](../references/documentation-navigation-standard.md#mechanical-retrieval-protocol-including-windows). Name uncertainty, locate exact file/heading/symbol, narrow output, expand only to immediate caller or relevant failure path. If output truncates, retrieve missing range; no claim unseen text was inspected.

Distinguish designed, source-inspected, fixture-exercised, live-observed and human-accepted. Date monetary/runtime observations. In diagnosis separate proposal, committed state, selected evidence and final consumer input; saved response is not publication, omitted context is not deleted history, empty delta is not empty state. State observation, inferred cause and falsifying counterexample. Preserve private raw run artifacts appropriately; never commit secrets or player payloads.

For substantial navigation changes walk representative routes: product recap, next coding slice, failure/spend and unrelated domain. Link health does not certify clarity or semantic coverage. Documentation alone cannot repair confused code ownership.
