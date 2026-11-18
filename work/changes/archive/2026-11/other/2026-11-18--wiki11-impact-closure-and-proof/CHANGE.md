# WIKI11 | Verify planned versus actual documentation impact before a Change closes

**State:** Done (2026-11-18). **Preconditions:** WIKI09 and WIKI10 are Done. HK06 and HK07 are available. **CI routing:** HK08 keeps the maintenance workflow. This packet extends the existing close guard. **Approval:** selected for this sequence on 2026-11-18.

## Cursor first-screen brief

Read [design lifecycle and guards](../../../../../designs/open/documentation-impact-system/TARGET-ARCHITECTURE.md#3-separate-planning-and-closing-guards-reuse-existing-tools), [validation fixtures](../../../../../designs/open/documentation-impact-system/DELIVERY-AND-VALIDATION.md#mutation-fixtures-deterministic-no-provider-db-or-production-state), existing scripts/repo-tools/wiki-core/change-guard.mjs, scripts/repo-tools/wiki-core/model.mjs, HK07's actual implemented maintenance JSON, and scripts/repo-tools/brief.mjs. Revalidate exact source paths and CI dependencies on HEAD. Do not work on HK08 workflows as part of this Change.

## Outcome

An implementing agent cannot close a code-bearing Change as Done while a material product/technical or directly dependent claim **known to the maintained graph** remains without a reasoned disposition. The checker cross-examines the **planned P/T/C/D table, the actual diff and reverse dependencies**, separately. It reports unmapped/ambiguous impacts honestly and does not certify semantic correctness.

## Planned specification and implementation delta | proposed planned-impact.v1

| Plane | Intended edit / reasoned no-op | Related owners and proof |
| --- | --- | --- |
| **Product docs** | **unchanged because** this guard does not rewrite a game promise. Product headings stay inputs to the check | Owner review remains the stop when code contradicts a product rule | negative: no product rewrite |
| **Technical docs** | **unchanged because** no engine, API, or schema contract is edited by this packet. The checker adds a close obligation only | Technical text stays above code and below product intent | fixture |
| **Development docs** | **change:** .agents/rules/documentation.md, .agents/references/change-work-unit-standard.md, .agents/skills/documentation-reconciliation/SKILL.md, and .agents/skills/change-workflow/SKILL.md now require dependent disposition at close | The seven-column ledger stays the retrospective record | the same homes |
| **Code/tools** | **change:** scripts/repo-tools/wiki-core/change-guard.mjs and scripts/repo-tools/wiki-core/change-guard-self-test.mjs compare the diff with contract dependents; scripts/repo-tools/maintenance-core.mjs exposes citation edges; negative: an omitted dependent fails | scripts/repo-tools/wiki-change-guard.mjs reports shallow history. .github/workflows/maintenance.yml is not rebuilt | twelve fixtures |
| **Related docs/maps** | **unchanged because** work/changes/README.md stays the only selection route and no second scanner is added | HK08 already runs the maintenance workflow | no new workflow |

## Exact behavior

1. For each actual changed source or selected heading, derive an inspected affected-claim set: plan-declared + matched reverse impact edges + existing HK07 direct source references. Keep “inferred candidate,” “confirmed relation,” “no known route” and “manual-review required” distinct.
2. For every material selected claim, require reconciliation disposition: updated + exact new owner/heading; reviewed unchanged + **claim-specific** reason/evidence; blocked/needs owner review. A broad “docs unaffected” row cannot blanket an impact set. Multiple independent claims need separate entries.
3. Compare actual diff to intended P/T/C/D: source addition not named, canonical doc revision without authority approval, newly impacted dependent, or missing source map -> actionable failure/stop. Do not demand doc modifications just because a file is old or a code line changed.
4. Distinguish hard errors (missing planned plane for v1 Ready, undeclared changed selected contract, missing mandatory dependent disposition, invalid path) from risk warnings (unknown dependency, opaque heading diff, stale review candidate, unprovable semantic match).
5. Return explanation trace: exact changed path/heading, dependency type/line, projected candidate, disposition and proof SHA/tier. The examiner must be able to see **why** it asked to inspect a page.
6. Separate automated structural closure from independent semantic review. A passed test/report never declares that P/T/C are factually aligned; high-risk permissions, identity, time or billing changes require human or separately authorized fresh-agent review.

## Acceptance and rejection tests

- **Normal:** bounded test-only code diff with properly reasoned P/T unchanged, no missed dependent, actual negative proof and source map disposition -> close passes.
- **Negative:** technical heading change with constrained-by dependent omitted from ledger -> fail and name path#heading; adding reviewed unchanged *with concrete reason* clears it.
- **Negative:** code contradicts product and plan tries to rewrite product text to match accidental behavior -> stop for owner decision.
- **Negative:** see-also link must not create mandatory closure; an uncharted source change must report “no known relation” rather than “no risks.”
- **Negative:** dirty/shallow metadata and ambiguous heading edits produce unknown/proof-blocked where material, never false fresh. Old unselected/archived packets remain compatible.
- **Proof:** deterministic mutation suite, current wiki-core tests, sample of at least 12 seeded change scenarios, full clean HEAD/command receipts. Do not require paid provider tests.

## Explicit non-scope

No CI path filters or weekly jobs (HK08), no duplicate storage/index, no auto-generated game rules, no rule ratification, no mass historical archive editing, no real model usage without separate approval. Block selection if HK provenance shape differs materially from the assumed inputs; adjust this packet first.

## Proof

`node scripts/repo-tools/wiki-core/change-guard-self-test.mjs` exited 0 against baseline `f5c96645`. The twelve closure fixtures cover a reasoned test-only diff, an omitted dependent, a cleared dependent, a see-also link, a blanket row, a missing contract, an ambiguous heading, shallow history, a citation candidate, a Proposed diagnostic, a legacy packet, and a missing heading. Close on this worktree also reported citation-candidate and no-known-relation warnings. Those warnings are not failures. Model calls were not used. No database was opened.

## Reconciliation ledger

| Affected selected claim/heading | Authority | Target delta (changed/unchanged; reason) | Source delta & inspected SHA | Status/evidence tier | Negative proof | Map/link update or N/A |
| --- | --- | --- | --- | --- | --- | --- |
| Close comparison | development harness | changed: a planned-impact.v1 close now requires a disposition for each known contract dependent and refuses a blanket docs-unaffected row | scripts/repo-tools/wiki-core/change-guard.mjs, scripts/repo-tools/wiki-core/change-guard-self-test.mjs, scripts/repo-tools/maintenance-core.mjs, and scripts/repo-tools/wiki-change-guard.mjs at f5c96645 | fixture-tested | an omitted constrained-by dependent fails close | N/A |
| Close procedure | development harness | changed: the documentation rule, change standard, reconciliation skill, and workflow skill say the ledger must cover known dependents | .agents/rules/documentation.md, .agents/references/change-work-unit-standard.md, .agents/skills/documentation-reconciliation/SKILL.md, and .agents/skills/change-workflow/SKILL.md at f5c96645 | source-observed | a see-also link does not create a mandatory row | those files are the map |
| Pace | product | unchanged because docs/product/gameplay/time-and-autonomy.md#pace keeps the accepted-action rule. The pointer was recorded by WIKI10 and this packet does not rewrite it | docs/product/gameplay/time-and-autonomy.md at f5c96645 | source-observed | this close does not edit the pace sentence | the existing pointer |
| Visual hierarchy and ownership | product | unchanged because docs/product/experience/design-system-and-expression.md#visual-hierarchy-and-ownership keeps the same role split. The pointer was recorded by WIKI10 | docs/product/experience/design-system-and-expression.md at f5c96645 | source-observed | scene color is still not a product rule | the existing pointer |
| Permission to advance | technical | unchanged because docs/technical/engine/chronology-and-activities.md#permission-to-advance still constrains itself by Pace. This packet does not change the gate | docs/technical/engine/chronology-and-activities.md at f5c96645 | source-observed | the omitted-dependent fixture is the failure mode | the contract table |
| Ownership and CSS architecture | technical | unchanged because docs/technical/client/semantic-design-foundation.md#ownership-and-css-architecture still constrains itself by visual hierarchy. No CSS behavior was added | docs/technical/client/semantic-design-foundation.md at f5c96645 | source-observed | a scene field still cannot recolor commands | the contract table |
| Selection route | development harness | changed: the queue selects this packet after WIKI09 and WIKI10 were archived | work/changes/README.md and work/designs/open/documentation-impact-system/README.md at f5c96645 | source-observed | current change stays a single declaration | the queue is the map |

exception: .agents/references/documentation-navigation-standard.md because WIKI10 wrote the edge vocabulary and this packet does not
exception: .agents/skills/change-workflow/assets/CHANGE.md because WIKI09 added the plan table and this packet does not
exception: scripts/repo-tools/wiki-core/markdown.mjs because WIKI10 parses contract tables there and this packet does not
exception: scripts/repo-tools/wiki-core/model.mjs because WIKI10 builds the reverse index there and this packet does not
exception: scripts/repo-tools/wiki-core/self-test.mjs because WIKI10 owns those graph fixtures and this packet does not
exception: work/changes/archive/2026-11/README.md because WIKI09 and WIKI10 were listed there by their archives
exception: work/changes/archive/2026-11/other/2026-11-18--wiki09-change-impact-contract/CHANGE.md because that archived packet belongs to WIKI09
exception: work/changes/archive/2026-11/other/2026-11-18--wiki10-contract-dependency-edges/CHANGE.md because that archived packet belongs to WIKI10
exception: work/changes/ledger/2026-11.md because the earlier ledger rows were recorded with those archives
exception: work/changes/open/2026-11-18--wiki09-change-impact-contract/CHANGE.md because the open copy was moved by the WIKI09 archive
exception: work/changes/open/2026-11-18--wiki10-contract-dependency-edges/CHANGE.md because the open copy was moved by the WIKI10 archive
exception: work/designs/README.md because WIKI09 recorded design acceptance there and this packet does not
exception: work/designs/open/documentation-impact-system/DELIVERY-AND-VALIDATION.md because WIKI09 renamed the execution heading and this file only repairs that anchor
