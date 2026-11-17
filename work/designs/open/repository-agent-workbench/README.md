# Repository agent workbench | source-grounded, optional retrieval

**State:** approved design direction: explicitly **trial natural-language retrieval** via a controlled, opt-in local experiment. HAR01, HAR02, and HAR03 are Done. HAR03 did not adopt a vendor tool. **Scope:** developer/coding agents working on this repository, never the in-game Storyteller, its memory, or gameplay infrastructure.
**Inspected baseline:** `main@8aa952ac5268f38b06cf292d50e110f7f1d3aca0` on 2026-11-17. GitHub was inspected through the connector; no clone, local build, agent benchmark, or vendor tool installation was performed.

## Decision in one screen

1. **Reuse what exists.** Agent-native code search, Git, `rg`, existing language services, `AGENTS.md` and source READMEs come first. WIKI06 already enforces Change reconciliation. WIKI07 is Done: `pnpm wiki:find` and `pnpm wiki:read` are the docs baseline, and its three independent reads are in the archived packet. WIKI08 is Done: `pnpm wiki:content-health` flags review candidates, and the named stale instructions were repaired. Do not fork those implementations.
2. **Report source freshness and evidence class.** Important investigations and Cursor handoffs identify the actual revision, whether a local worktree was dirty or unavailable, source/heading anchors, and whether claims are selected target, source-observed, fixture-tested, or live-observed. A GitHub connector snapshot is **not** a local worktree snapshot.
3. **Natural-language search is a priority experiment.** Cursor's current Instant Grep is *not* its old embedding index; Claude Code bundles ripgrep. Test code semantic retrieval (Grepai) and Markdown semantic/hybrid retrieval (QMD) separately. No global service or MCP tool is required until the experiment succeeds.
4. **Try before adopting.** Do not wait for an imagined crisis before prototyping. A pinned-tree, zero-paid-model CLI pilot may proceed as a separately selected developer tooling Change. WIKI07 is the docs baseline; WIKI08 content audit proceeds independently. Measure retrieved-source accuracy **and** whether an agent uses it beneficially.
5. **Keep the authority hierarchy.** `docs/product` = ratified product intent; `docs/technical` = selected technical contract; `STATUS.md`/source/tests = actual realization. Neither a generated graph nor an AI memory is an authority or permission source.

## Read by question

| Question | Document |
| --- | --- |
| What is the desired cross-agent operating model and what is genuinely missing? | [Target and baseline](TARGET.md) |
| Which external technologies deserve investigation, and why not install one immediately? | [Candidate assessment and sources](CANDIDATES.md) |
| How do we measure retrieval funnel value without adopting a vendor? | **[HAR06 decision](HAR06-DECISION.md)** · [evaluation gates](EVALUATION.md) · [HAR03 historical pilot](PILOT.md) |
| What should Cursor implement next? | [HAR06 retrieval funnel](../../../changes/archive/2026-11/other/2026-11-17--har06-retrieval-funnel/CHANGE.md) is Done and diagnostic. Previous: [HAR01](../../../changes/archive/2026-11/other/2026-11-17--har01-source-receipts/CHANGE.md) · [HAR02](../../../changes/archive/2026-11/other/2026-11-17--har02-retrieval-comparison/CHANGE.md) · [HAR03](../../../changes/archive/2026-11/other/2026-11-17--har03-semantic-retrieval-pilot/CHANGE.md) |

## HAR06 retrospective finding (navigation audit)

The [C1–C4 source-route audit](SOURCE-ROUTE-AUDIT-2026-11-17.md) found a decisive measurement defect: a correct source file and rejection line can be counted as missing because the grep snippet does not include the enclosing function name. HAR06 also concatenated wiki hits with lexical results rather than following wiki-to-source links, and fusion could double-count the same lexical evidence. **No new tool adoption or code-changing Change is selected by this design note.** Fix file-candidate/symbol verification and test genuine source-map traversal before interpreting another search benchmark.

## Ordinary ChatGPT source transport (implemented)

For design investigations that stay inside ordinary ChatGPT, the [source snapshot runbook](../../../../docs/runbooks/chatgpt-design-snapshot.md) defines a committed-HEAD, gitignored ZIP with embedded source revision and lean/full profiles. [HAR05](../../../changes/open/2026-11-17--har05-portable-snapshot-index/CHANGE.md) adds portable source-exact headings, authority roles and omitted-link reporting using the existing wiki parser, with strict/fallback behavior. This is not a coding-agent session, semantic search, automatic remote sync, or new product authority. It is independent of HAR03 and does not reopen WIKI07/WIKI08.

## Authority, dependencies and release sequence

- Canonical agent owner remains [.agents/HARNESS.md](../../../../.agents/HARNESS.md); [context economics](../../../../.agents/references/context-economics.md) and [document navigation](../../../../.agents/references/documentation-navigation-standard.md) remain binding. This design must not become a second always-on agent rule.
- [WIKI07](../../../changes/archive/2026-11/other/2026-11-16--wiki07-retrieval-by-heading/CHANGE.md) is Done and is no longer the selected Change. Its independent reads are recorded. Do not reopen that packet to start this design.
- [WIKI08](../../../changes/archive/2026-11/other/2026-11-16--wiki08-content-quality-gates/CHANGE.md) is Done and is no longer the selected Change. It is not a blocking dependency for a source-only semantic search pilot. Misleading wiki text must not be scored as a retrieval success.
- HAR01, HAR02, HAR03, and HAR06 are Done. HAR06 recorded a diagnostic funnel and did not adopt a vendor. No Change is selected. A real-agent or reranker trial requires separate permission.
- After any candidate experiment, independently review the evidence and either reject it, keep it opt-in, or author a *new* narrowly scoped integration Change. Never let a benchmark automatically authorize installation.

**Success** is fewer wrong conclusions and unnecessary file reads at the same or lower total engineering cost. Zero new tooling is a valid winning result.
