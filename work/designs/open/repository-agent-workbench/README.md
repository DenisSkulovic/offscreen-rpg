# Repository agent workbench | source-grounded, optional retrieval

**State:** approved design direction: explicitly **trial natural-language retrieval** via a controlled, opt-in local experiment. HAR02/HAR03 code work remains **Proposed, not selected** until the owner schedules it. **Scope:** developer/coding agents working on this repository, never the in-game Storyteller, its memory, or gameplay infrastructure.
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
| How would we decide whether another tool actually improves correctness and cost? | [Evaluation and adoption gates](EVALUATION.md) · [16-case semantic pilot](PILOT.md) |
| What bounded code work could Cursor eventually do? | [HAR01 structured source receipts](../../../changes/open/2026-11-17--har01-source-receipts/CHANGE.md) · [HAR02 comparative retrieval harness](../../../changes/open/2026-11-17--har02-retrieval-comparison/CHANGE.md) · [HAR03 local semantic pilot](../../../changes/open/2026-11-17--har03-semantic-retrieval-pilot/CHANGE.md) |

## Ordinary ChatGPT source transport (implemented)

For design investigations that stay inside ordinary ChatGPT, the [source snapshot runbook](../../../../docs/runbooks/chatgpt-design-snapshot.md) defines a committed-HEAD, gitignored ZIP with embedded source revision and lean/full profiles. This is not a coding-agent session, semantic search, automatic remote sync, or new product authority. It is independent of HAR01–03's proposals and does not change the selected WIKI07 work.

## Authority, dependencies and release sequence

- Canonical agent owner remains [.agents/HARNESS.md](../../../../.agents/HARNESS.md); [context economics](../../../../.agents/references/context-economics.md) and [document navigation](../../../../.agents/references/documentation-navigation-standard.md) remain binding. This design must not become a second always-on agent rule.
- [WIKI07](../../../changes/archive/2026-11/other/2026-11-16--wiki07-retrieval-by-heading/CHANGE.md) is Done and is no longer the selected Change. Its independent reads are recorded. Do not reopen that packet to start this design.
- [WIKI08](../../../changes/archive/2026-11/other/2026-11-16--wiki08-content-quality-gates/CHANGE.md) is Done and is no longer the selected Change. It is not a blocking dependency for a source-only semantic search pilot. Misleading wiki text must not be scored as a retrieval success.
- HAR01, HAR02 and HAR03 are **Proposed**, not executable merely because their packets exist. No Change is selected. An owner-selected isolated HAR03 prototype should explicitly provision/pin local tools without altering the default dev environment; real paid-agent trials have a separate authorization gate.
- After any candidate experiment, independently review the evidence and either reject it, keep it opt-in, or author a *new* narrowly scoped integration Change. Never let a benchmark automatically authorize installation.

**Success** is fewer wrong conclusions and unnecessary file reads at the same or lower total engineering cost. Zero new tooling is a valid winning result.
