# Delivery and validation | From navigable wiki to impact-aware wiki

**Status:** Proposed delivery plan. Not a selected Change. This document limits the scope of the three [proposed packets](README.md#execution-route-all-proposed-none-selected) and their evidence.

## Existing work to retain and not duplicate

- **HK02** repairs Change/document workflow triggers and open Change link traversal. It goes first.
- **HK06** creates tracked artifact inventory and lifecycle guards.
- **HK07** creates causal Git provenance and reverse source-reference candidates. WIKI11 reuses that report rather than creating competing source tracking.
- **HK08** attaches deterministic failures and visible warnings to push/PR/weekly review/brief. It must integrate the contract graph once delivered.
- Existing WIKI01–08 graph, retrieval and content-health scripts continue their own jobs; no fake blended “wiki quality” score.

## Implementation sequence

| Stage | Packet | Output | Gate to proceed |
| --- | --- | --- | --- |
| 0 | Existing HK02 | Docs/Changes CI trigger and checker path coverage | Full checkout verifies Change-only trigger; baseline honest |
| 1 | WIKI09 | Versioned three-plane plan section, template/skill, plan-mode lint + synthetic fixtures | Existing legacy packets still parse; new Ready packet without P/T/C/D plan fails; reasoned test-only no-op succeeds |
| 2 | WIKI10 | Typed heading-level relationships, parser, reverse index, limited real crosslinks in accepted high-risk docs | Broken anchor/type fails; ordinary see-also does not trigger; zero changes to normative game behavior |
| 3 | HK06 + HK07 | Existing inventory and Git provenance | Honest unknowns, shallow/dirty handling, bounded report |
| 4 | WIKI11 | Join planned claims, actual diffs and discovered document/source dependents; close gate; HK08 integration contract | Failure injection catches unreviewed dependent, does not demand gratuitous edits |
| 5 | HK08 integration | Existing CI/brief/weekly feedback routes consume signals | Change-only, docs-only and code+docs fixtures demonstrate expected triggers and exit codes |

**Coverage wave after parser proof:** WIKI10 intentionally seeds only two selected neighborhoods (time and reader/scene semantics). [The contract-neighborhood catalog](CONTRACT-NEIGHBORHOODS.md) records further proposed semantic relations. A focused *documentation-only* reconciliation wave covers confirmed remaining selected neighborhoods (mechanics, Storyteller authority, spending) without inventing an executable Change; proposed Admin/retention/read contracts must await ratification. WIKI11 can validate graph/close mechanics with A/D and report B/C/E/F/G as uncharted; it cannot claim whole-wiki dependency recall until the later content audit is completed and measured.

WIKI09–11 do **not** automatically become Ready from this design's existence. Owner can accept all, part or reject; Cursor selects one only after current HEAD, dependencies and permitted scope are checked.

## Baseline and migration

- **Prospective enforcement:** version explicit schema (suggested “planned-impact.v1”) and require it for newly Ready packets after adoption. Existing open ready packets are flagged “legacy-impact-plan: review at selection,” **not silently failed on a pre-existing CI baseline**. Upgrade each when actually selected, before code changes.
- **No mass archive editing.** Archived historical packets remain true to their period, even if lacking this new schema. The close guard continues legacy mode where appropriate.
- **No automatic normative edits.** Any seeded dependencies in product/technical docs require heading inspection and must not change substantive product/technical meaning; if a necessary new selected rule is discovered, seek owner ratification separately.
- Maintain a short exception reason when a specific dependency cannot be established. Expiring targeted waivers for objective parser failures are acceptable during migration; “all legacy pages” blanket waivers and implicit clean bills are not.
- Keep the current Change queue unselected throughout this design commit.

## Mutation fixtures (deterministic; no provider, DB or production state)

1. **Missing plane:** remove product row from a new Ready packet; plan guard fails. Restore with specific “unchanged because…” and real owner/heading; passes.
2. **Empty technical reason:** “N/A / docs updated / no changes” fails; specific unchanged wire/retry-contract reason passes.
3. **Underplanned implementation:** actual diff touches additional contract heading/source map; close produces undeclared/new-impact warning or failure depending scope.
4. **Dependent surprise:** change heading B with a typed constrained-by dependent A; if A has no review disposition, closure fails. Explicit reviewed-unchanged with evidence passes.
5. **Historical citation:** a link from an accepted contract to completed Change history remains informational, not a live dependency.
6. **False linkage:** See Also, example and ordinary references do not cause blocking dependency expansion.
7. **Cycle/fanout:** A <-> B co-change deduplicates; a high-fanout node is bounded and reported as review debt, never silently green or stuck in infinite traversal.
8. **Unknown link:** deliberate absent dependency produces an honest “unmapped boundary” diagnostic; model must not infer “no impacted pages.”
9. **Proposal collision:** a proposed document edge cannot ratify its target nor be used to close a selected product requirement.
10. **Source changed later:** Git SHA provenance survives doc checks; dirty/shallow checkout yields unknown, not fresh.
11. **Good no-op:** source-only test enforcing a ratified invariant leaves product/technical wording unchanged with reasons and negative fixture; completion is allowed.
12. **Wrong repair direction:** source contradicts product; a proposed rewrite to make product match source is blocked for independent owner review.

## Evaluation of usefulness, not vanity metrics

Measure on a frozen revision with a **held-out 12–20 change scenarios** across the six coupling families in TARGET-ARCHITECTURE.md (clock, storyteller authority, staff permissions, appearance/publication, spending and observability). For each scenario, independently author an answer key of required affected claims and *innocent unrelated* claims. Compare before/after using same source/test snapshot:

- **Critical dependent recall:** all expected governing/downstream claims found within bounded review route; list misses by exact path#heading. Target zero critical misses in chosen audited scenarios, not universal zero drift.
- **False-positive review burden:** extra unrelated documents opened and minutes/steps wasted; report count and median/p95. A system that demands reading every page to achieve recall has failed.
- **Plan completeness:** fraction of new Ready packets with meaningful P/T/C/D dispositions and independent correct owner/negative case; do not equate a filled table with correctness.
- **Close contradiction rate:** planted spec-vs-code and docs-vs-docs conflicts caught; classify mechanical vs reviewer-only findings.
- **Agent proof:** when authorized, fresh-agent tasks using same model, tools and SHA; report actual file opens, tokens if known, negative-case success, stopped-on-unknown rates and scope creep. No invented costs or claims from fake agent harness.

Keep the old 74/74 reachability and retrieval benchmarks, but report the new *impact-coverage* evidence as a separate axis. A green reachability number plus poor affected-claim recall is an unhealthy wiki.

## Exit conditions

One Change is Done only after: reviewed planned P/T/C/D dispositions, actual linked heading/source diff, complete reconciled affected-claim ledger, negative proof, repaired relevant routes/source maps, no unresolved consequential contradiction and honest limitation/unknown report. Evidence must show actual commands/revision and tests performed. No “docs completed” declaration substitutes for this.

This program can be retired when tools, documentation, fixtures and validated sample outcomes live with their proper canonical owners. Do not leave this proposal as a competing rule after acceptance; link from the historical disposition only.
