# Repository agent workbench | source-grounded, optional retrieval

**State:** pivot accepted: **the agent reasons, the wiki and source maps supply evidence**. HAR01–HAR07 are historical diagnostic waves; no retrieval vendor is adopted. **Scope:** developer/coding agents working on this repository, never the in-game Storyteller, its memory, or gameplay infrastructure.
**Inspected baseline:** `main@8aa952ac5268f38b06cf292d50e110f7f1d3aca0` on 2026-11-17. GitHub was inspected through the connector; no clone, local build, agent benchmark, or vendor tool installation was performed.

## Decision in one screen

1. **Reuse what exists.** Agent-native code search, Git, `rg`, existing language services, `AGENTS.md` and source READMEs come first. WIKI06 already enforces Change reconciliation. WIKI07 is Done: `pnpm wiki:find` and `pnpm wiki:read` are the docs baseline, and its three independent reads are in the archived packet. WIKI08 is Done: `pnpm wiki:content-health` flags review candidates, and the named stale instructions were repaired. Do not fork those implementations.
2. **Report source freshness and evidence class.** Important investigations and Cursor handoffs identify the actual revision, whether a local worktree was dirty or unavailable, source/heading anchors, and whether claims are selected target, source-observed, fixture-tested, or live-observed. A GitHub connector snapshot is **not** a local worktree snapshot.
3. **Agent-native investigation is now the priority experiment.** Real coding clients already reason over their native search, language services and repository knowledge. Test whether explicitly guiding the same client to our wiki/authority maps improves its actual evidence-supported answers. [Selected decision](AGENT-NATIVE-EVALUATION.md).
4. **Keep research conclusions, retire unused scaffolding.** WIKI03/HAR08's fake-only runners never performed a real agent comparison; HAR09's Cognee graph found wrong relations and no demonstrated baseline advantage. HAR10 is selected to remove these experimental executables while preserving documented comparison methodology. Semantic architecture discovery remains a conditional future hypothesis, not a default service.
5. **Keep the authority hierarchy.** `docs/product` = ratified product intent; `docs/technical` = selected technical contract; `STATUS.md`/source/tests = actual realization. Neither a generated graph nor an AI memory is an authority or permission source.

## Read by question

| Question | Document |
| --- | --- |
| What is the desired cross-agent operating model and what is genuinely missing? | [Target and baseline](TARGET.md) |
| Which external technologies deserve investigation, and why not install one immediately? | [Candidate assessment and sources](CANDIDATES.md) |
| Can persistent graph memory recover forgotten architecture without corrupting authority? | **[Concluded Cognee trial](../../../changes/archive/2026-11/other/2026-11-17--har09-architectural-memory-pilot/CHANGE.md)** · [first-class result](../../../..//research/agent-practice/COGNEE-EVALUATION-2026-11-17.md) |
| How do we measure retrieval funnel value without adopting a vendor? | **[HAR06 decision](HAR06-DECISION.md)** · [evaluation gates](EVALUATION.md) · [HAR03 historical pilot](PILOT.md) |
| What should Cursor implement next? | **[HAR10 retirement](../../../changes/open/2026-11-17--har10-retire-retrieval-experiments/CHANGE.md)** is selected. HAR09 was [stopped without adopting Cognee](../../../changes/archive/2026-11/other/2026-11-17--har09-architectural-memory-pilot/CHANGE.md). [HAR05](../../../changes/open/2026-11-17--har05-portable-snapshot-index/CHANGE.md) remains Verifying. |

## HAR06 retrospective finding (navigation audit)

The [permanent experiment register](../../../../research/agent-practice/RETRIEVAL-EXPERIMENTS-2026-11-17.md) now owns retrospective findings. The [C1–C4 source-route audit](SOURCE-ROUTE-AUDIT-2026-11-17.md) found a decisive measurement defect: a correct source file and rejection line can be counted as missing because the grep snippet does not include the enclosing function name. HAR06 also concatenated wiki hits with lexical results rather than following wiki-to-source links, and fusion could double-count the same lexical evidence. **[HAR07 is Done](../../../changes/archive/2026-11/other/2026-11-17--har07-evidence-verified-source-navigation/CHANGE.md)** and records that repair. The clean run is diagnostic only: C4's rejection line is tied to its function, and C1–C3 still miss, with a trace for each stop. The design note itself remains a retrospective observation, not source of code truth. No vendor adoption or model run is authorized.

## Ordinary ChatGPT source transport (implemented)

For design investigations that stay inside ordinary ChatGPT, the [source snapshot runbook](../../../../docs/runbooks/chatgpt-design-snapshot.md) defines a committed-HEAD, gitignored ZIP with embedded source revision and lean/full profiles. [HAR05](../../../changes/open/2026-11-17--har05-portable-snapshot-index/CHANGE.md) adds portable source-exact headings, authority roles and omitted-link reporting using the existing wiki parser, with strict/fallback behavior. This is not a coding-agent session, semantic search, automatic remote sync, or new product authority. It is independent of HAR03 and does not reopen WIKI07/WIKI08.

## Authority, dependencies and release sequence

- Canonical agent owner remains [.agents/HARNESS.md](../../../../.agents/HARNESS.md); [context economics](../../../../.agents/references/context-economics.md) and [document navigation](../../../../.agents/references/documentation-navigation-standard.md) remain binding. This design must not become a second always-on agent rule.
- [WIKI07](../../../changes/archive/2026-11/other/2026-11-16--wiki07-retrieval-by-heading/CHANGE.md) is Done and is no longer the selected Change. Its independent reads are recorded. Do not reopen that packet to start this design.
- [WIKI08](../../../changes/archive/2026-11/other/2026-11-16--wiki08-content-quality-gates/CHANGE.md) is Done and is no longer the selected Change. It is not a blocking dependency for a source-only semantic search pilot. Misleading wiki text must not be scored as a retrieval success.
- HAR01–HAR08 are Done. HAR08 prepared the A/B comparison and kept the launch refused. The six tasks are unreviewed and the Windows sandbox is unproven. Real launches, subagents, rerankers and vendor adoption remain separately gated.
- **HAR09 is the selected Change.** It may inspect Cognee in an isolated folder. It is not permission to install hooks, run providers, download the document-memory models, or select a vendor.
- After any candidate experiment, independently review the evidence and either reject it, keep it opt-in, or author a *new* narrowly scoped integration Change. Never let a benchmark automatically authorize installation.

**Success** is fewer wrong conclusions and unnecessary file reads at the same or lower total engineering cost. Zero new tooling is a valid winning result.
