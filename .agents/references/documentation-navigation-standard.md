# Documentation as a coding-agent knowledge interface

**Owns:** selective retrieval, page structure, typed dependency edges and navigation checks. [Documentation rule](../rules/documentation.md) owns authority/semantic maintenance; [geography](../../REPOSITORY-STRUCTURE.md) owns folder lifecycle; [submission standard](planning-artifact-quality.md) owns planning artifact budgets. No automatic preload.

## The ideal: specification before archaeology

Identify question → current authority → precise owner/heading → actual source or proof only where needed. Understand intended behavior and critical exceptions before changing code. Reconcile when approved meaning or observed implementation changes. Optimize total accepted engineering cost, not document length alone; a coherent 60 KiB contract with precise sections can beat a missing spec and thirty source reads.

## One authoritative home per kind of knowledge

[Repository geography](../../REPOSITORY-STRUCTURE.md#3-root-and-permanent-document-zones) gives the complete placement map. Product owns intent; technical owns correctness guarantees; source maps locate actual implementation; STATUS/evidence record observed results; Design owns unresolved choices; Change owns bounded execution; research/history preserve rationale and findings. Topic indexes route, not create a fourth authority layer. Never infer realization or permission from a selected heading, or ratification from its directory.

## Retrieval-quality page structure

- Unique descriptive H1, meaningful stable H2/H3, short ownership/status opening. No universal frontmatter or giant copied TOC.
- Long page: concise question-to-heading route with direct anchors. Keep exception, failure, identity and ordering beside controlling contract.
- Link exact governing headings with reason; repeat critical local warning only when necessary. Split by owner, audience, revision cadence or semantic boundary, not arbitrary bytes.
- Distinguish selected, source-inspected, fixture-tested, live-observed and human-accepted; include date/SHA when needed.

Adapt [Diátaxis](https://diataxis.fr/) as information-design principle, not mandatory folder trees. [Google heading](https://developers.google.com/style/headings) and [cross-reference guidance](https://developers.google.com/style/cross-references) provide useful craft references.

## Minimal route topology

README → [docs router](../../docs/README.md) → product or [technical owner](../../docs/technical/README.md) → exact heading → named source/test as needed. For selected implementation begin from CHANGE/TASKS rather than browsing wiki. Historical snapshot manifests are not current routes. An agent should not open every router in sequence.

## Contract dependencies

A heading named `Contract dependencies` defines binding review edges, not see-also. Row on dependent page points to governing heading; relation is `depends-on`, `constrained-by`, or `co-change`. Technical claim can be constrained by product; product is not governed by technical page. Ordinary see-also/evidence/example links create no review obligation. Empty reverse lookup means no known route, not proof of safety. Include affected known dependents in Change reconciliation.

## Maintenance without documentation theater

Use [semantic maintenance](../rules/documentation.md) and [reconciliation](../skills/documentation-reconciliation/SKILL.md) on affected owners. Navigation-only changes preserve approved meaning and repair inbound anchors. Preserve unique proof/decisions before authorized retirement.

- `python scripts/check_docs.py`: Markdown paths/headings, including nested source READMEs under apps/packages/tools and open Designs. Terminal Change archive outside scan.
- `pnpm wiki:health`: maintained graph, broken paths/anchors and directed reachability of docs pages from docs/README.md. No terminal Change archive. A graph pass is not semantic proof.
- `pnpm wiki:content-health` and [repository maintenance](repository-maintenance.md): review signals, not automatic rewriting.

Optional high-impact product promotion uses `## Claim impact | claim-impact.v1`: claim, disposition, evidence. Allowed dispositions: promoted, illustrative, parked, source-observed, selected-experience, rejected. Promoted needs local Markdown evidence route; Cognee cannot be promoted. Checker does not scan ordinary prose or decide whether a product rule is good. No extra ledger solely for style.

## 2026-11-12: explicit layered retrieval contract for cheap coding agents

| Layer | Answers | Read |
| --- | --- | --- |
| L0 | Safety, authority, where to start | Root AGENTS and applicable client rule |
| L1 | Outcome, owner, one negative and expansion route | Selected Change front door/card or scoped task |
| L2 | Current symbol, input/output/side effect | Nearest source README |
| L3 | Selected contract, lifecycle, failure semantics | Exact technical/product heading |
| L4 | Actual implementation and observed evidence | Named source/test/authorized command |

Stop when question is answered; not every layer is mandatory. L1/L2 summarize and route, L3 owns guarantees, L4 establishes realization. A critical local warning may repeat; full contract may not.

### First-screen requirement for long/high-traffic files

First ~10–20 lines: ownership, most consequential fact/risk, current source vs selected future, 2–5 exact starting paths/symbols/heading anchors, when to expand, provenance if relevant. Source map supplies actual code route and counterexample; long contract supplies question-to-heading route; Change supplies selected outcome/acceptance; skill frontmatter describes actual trigger. Do not impose identical templates.

### Source files and preambles: selective, not a banner tax

No repetitive TypeScript banners. Comment beside surprising invariants (GET must not redispatch a charged attempt; intentional version tie), not obvious syntax. A 3–6-line top comment only if complex module responsibility/trap is otherwise difficult to discover. Maps in nearest README.

### Mechanical retrieval protocol, including Windows

- Known route: `pnpm wiki:read path#heading`. Unknown question: `pnpm wiki:find` (five headings), then exact wiki:read. Open STATUS or source for realization questions. Use known Change/map before global search.
- `wiki.route.v2` authority is section-local: explicit status/self-label wins, else inherit settled parent. Mention of another proposal does not downgrade a selected heading; nested proposal stays unselected; "not implemented" does not make selected target proposed. Uncertain/proposal/status hit retains path#heading, index SHA and dirty bit; not gameplay authority or spend permission. Portable index preserves authority/lane.
- Use `rg --files`, first ~20 lines and `rg -n '^#{1,4} ' <exact-doc>`, then matching range. PowerShell: `Get-Content <path> -TotalCount 20`, then `Get-Content <path> | Select-Object -Skip N -First M`. `rg -n -C 5 'SymbolName' <specific-files>` for code; add immediate callers/tests for actual seam.
- Read only relevant ranges, split large output batches and retrieve missing ranges on truncation. No whole-wiki preload, historical minutes by default, or professional manuals when selected task already settles decision. Escalate real contradiction.
- Do not add semantic-search service, mega-index or universal banners just for retrieval; justify any new tooling by measured need and separate authority.

### Freshness and maintenance: small, triggered updates

Update nearest map and incoming links when owner, public export/wire response/status, identity/retry or module boundary changes; no rewrite for local rename. Source-inspected revision/date is not runtime claim. Update canonical contract only for approved change; evidence goes to receipt, not every map. A map often fits 1–2 pages; five mandatory maps before useful code is a routing smell. [Documentation rule](../rules/documentation.md#source-adjacent-retrieval-maps-required-when-ownership-is-complex) owns trigger and knowledge coverage.

### Retrieval drills before claiming savings

For a substantial retrieval redesign, compare fresh read-only contexts on React story state, Start/command failure, Nest SSE/commit and unrelated gameplay source question, or equivalent current representative routes. Record correct owner, necessary headings/source, actual reads, wrong detours, clarifications, tokens if exposed and accepted result. Compare equivalent fixed tasks/revisions. No invented byte-to-token savings. Ordinary link repair needs only relevant navigation checks.

## Current audit against this ideal

Historical 11–12 November audits and their measurements are retained in [the preceding revision](https://github.com/DenisSkulovic/offscreen-rpg/blob/3a1a16629bba7b8f817c4f934107593dd057d65d/.agents/references/documentation-navigation-standard.md#current-audit-against-this-ideal). They are not a current census. For new audit measure actual HEAD, classify semantic ownership and follow representative routes; inspect source/STATUS for consequential truth claims. Do not treat a structural pass as proof of SQL, storage, gameplay or runtime behavior.
