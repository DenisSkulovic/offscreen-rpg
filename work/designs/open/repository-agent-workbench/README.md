# Repository agent workbench | source-grounded, optional retrieval

**State:** design accepted for documentation and further evaluation on 2026-11-17; proposed code Changes are **not selected**. **Scope:** developer/coding agents working on this repository, never the in-game Storyteller, its memory, or gameplay infrastructure.
**Inspected baseline:** `main@8aa952ac5268f38b06cf292d50e110f7f1d3aca0` on 2026-11-17. GitHub was inspected through the connector; no clone, local build, agent benchmark, or vendor tool installation was performed.

## Decision in one screen

1. **Reuse what exists.** Agent-native code search, Git, `rg`, existing language services, `AGENTS.md` and source READMEs come first. WIKI06 already enforces Change reconciliation; WIKI07 already implements `pnpm wiki:find` and `pnpm wiki:read`, pending independent reader review. WIKI08 is proposed content-quality work. Do not fork those implementations.
2. **Report source freshness and evidence class.** Important investigations and Cursor handoffs identify the actual revision, whether a local worktree was dirty or unavailable, source/heading anchors, and whether claims are selected target, source-observed, fixture-tested, or live-observed. A GitHub connector snapshot is **not** a local worktree snapshot.
3. **No default Cognee/Serena/vector DB/graph service/extra MCP tools.** They are candidates, not automatically superior to the agent's built-ins. No daemon, Docker Compose stack, dependency or paid embedding provider is installed by this design.
4. **Evaluate before adopting.** First independently finish WIKI07 verification and WIKI08 truth checks; investigate an observed failure; run a matched retrieval study before considering an opt-in local adapter. An agent may use ordinary tools without an index when that is better.
5. **Keep the authority hierarchy.** `docs/product` = ratified product intent; `docs/technical` = selected technical contract; `STATUS.md`/source/tests = actual realization. Neither a generated graph nor an AI memory is an authority or permission source.

## Read by question

| Question | Document |
| --- | --- |
| What is the desired cross-agent operating model and what is genuinely missing? | [Target and baseline](TARGET.md) |
| Which external technologies deserve investigation, and why not install one immediately? | [Candidate assessment and sources](CANDIDATES.md) |
| How would we decide whether another tool actually improves correctness and cost? | [Evaluation and adoption gates](EVALUATION.md) |
| What bounded code work could Cursor eventually do? | [HAR01 structured source receipts](../../../changes/open/2026-11-17--har01-source-receipts/CHANGE.md) · [HAR02 comparative retrieval harness](../../../changes/open/2026-11-17--har02-retrieval-comparison/CHANGE.md) |

## Authority, dependencies and release sequence

- Canonical agent owner remains [.agents/HARNESS.md](../../../../.agents/HARNESS.md); [context economics](../../../../.agents/references/context-economics.md) and [document navigation](../../../../.agents/references/documentation-navigation-standard.md) remain binding. This design must not become a second always-on agent rule.
- [WIKI07](../../../changes/open/2026-11-16--wiki07-retrieval-by-heading/CHANGE.md) stays the selected Change. Its independent verification is the first dependency, not a task for this design to take over.
- [WIKI08](../../../changes/open/2026-11-16--wiki08-content-quality-gates/CHANGE.md) remains an independently selected future Change; it should settle content-fidelity issues before evaluating semantic retrieval improvements.
- HAR01 and HAR02 are **Proposed**, not executable merely because their packets exist. Do not change the Current change selection or launch agents, servers, models, downloads or local databases as a side effect of these documents.
- After any candidate experiment, independently review the evidence and either reject it, keep it opt-in, or author a *new* narrowly scoped integration Change. Never let a benchmark automatically authorize installation.

**Success** is fewer wrong conclusions and unnecessary file reads at the same or lower total engineering cost. Zero new tooling is a valid winning result.
