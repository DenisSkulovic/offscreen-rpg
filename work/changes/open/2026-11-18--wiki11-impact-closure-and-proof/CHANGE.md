# WIKI11 | Verify planned versus actual documentation impact before a Change closes

**State:** Proposed, not selected. **Preconditions:** WIKI09 + WIKI10 Done; HK06/HK07 inventory and provenance actually available. **CI routing:** HK08 owns integration, WIKI11 only exposes stable checks/report inputs. **Approval:** owner decides when to select.

## Cursor first-screen brief

Read [design lifecycle and guards](../../../designs/open/documentation-impact-system/TARGET-ARCHITECTURE.md#3-separate-planning-and-closing-guards-reuse-existing-tools), [validation fixtures](../../../designs/open/documentation-impact-system/DELIVERY-AND-VALIDATION.md#mutation-fixtures-deterministic-no-provider-db-or-production-state), existing scripts/repo-tools/wiki-core/change-guard.mjs, scripts/repo-tools/wiki-core/model.mjs, HK07's actual implemented maintenance JSON, and scripts/repo-tools/brief.mjs. Revalidate exact source paths and CI dependencies on HEAD. Do not work on HK08 workflows as part of this Change.

## Outcome

An implementing agent cannot close a code-bearing Change as Done while a material product/technical or directly dependent claim **known to the maintained graph** remains without a reasoned disposition. The checker cross-examines the **planned P/T/C/D table, the actual diff and reverse dependencies**, separately. It reports unmapped/ambiguous impacts honestly and does not certify semantic correctness.

## Planned specification and implementation delta | proposed planned-impact.v1

| Plane | Intended edit / reasoned no-op | Related owners and proof |
| --- | --- | --- |
| **Product docs** | **unchanged:** no modification to the game's promises; this is a developer tooling gate. Product headings are *inputs* to the check; the checker must never automatically rewrite product intent | Product selected-vs-proposal distinction and owner review on conflict |
| **Technical docs** | **unchanged game contracts:** no engine/API/schema changes; checker adds a development validation obligation only | Technical authority stays stronger than code realization, weaker than product intent |
| **Development docs** | **change:** revise existing close procedure and Change standard to require actual impact closure/disposition and independent review when warranted; preserve 7-column ledger | .agents/skills/documentation-reconciliation/SKILL.md, .agents/rules/documentation.md, Change workflow template |
| **Code/tools** | **change:** join existing wiki typed reverse graph, HK07 changed source/reference candidates, exact diff and CHANGE.md plan+ledger; add fixture tests and structured diagnostics | scripts/repo-tools/wiki-core/change-guard.mjs and self-test, existing HK maintenance reporter integration point; do not duplicate scanner |
| **Dependent docs/maps** | **review:** change queue and docs/README.md route only if new command/route warrants; source-adjacent maps only when actual ownership shifts | Existing HK08 orchestration consumes warning/error outputs |

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

## Reconciliation ledger | fill only after execution

| Affected selected claim/heading | Authority | Target delta (changed/unchanged; reason) | Source delta & inspected SHA | Status/evidence tier | Negative proof | Map/link update or N/A |
| --- | --- | --- | --- | --- | --- | --- |
| Developer Change-close guarantee | development harness/tooling | changed: actual impact coverage and disposition checks; game product/technical contracts unchanged because no runtime logic is touched | pending executed paths + SHA | not run | omitted-dependent fixture | pending |
