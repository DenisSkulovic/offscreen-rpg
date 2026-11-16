# Wiki Health | measurable knowledge-system design

**State:** Design, 2026-11-16. WIKI01 has implemented the graph command. WIKI02 and WIKI03 are separate Changes. This folder does not reopen DOC04. The first graph run is a measurement, not a cleaned score: see the WIKI01 baseline. Do not add links only to raise reachability.

## Goal

Offscreen RPG documentation is an **internal wiki and epistemic foundation**, not a pile of reports. A fresh ChatGPT/Cursor/Claude/Codex reader should efficiently find (1) owner-approved product truth, (2) selected technical design, (3) current source/test evidence, and (4) unresolved proposals **without mistaking one for another**.

A good graph is necessary but not sufficient. A good answer is necessary but may hide unacceptable retrieval cost. A technically correct answer about an obsolete source state is still wrong for current implementation work. Evaluate **independently**:

1. [GRAPH-HEALTH.md](GRAPH-HEALTH.md) — entirely local mechanical wiki graph, link validation, typed cross-layer ownership, content warnings and calibration.
2. [RETRIEVAL-BENCHMARK.md](RETRIEVAL-BENCHMARK.md) — free keyword search baseline, isolated fresh-agent trials, source discrepancy verification, score and instrumentation.
3. [IMPLEMENTATION.md](IMPLEMENTATION.md) — exact CLI/API deliverables, safe phases, baselines, false-positive controls and acceptance.

## Implementation-ready Changes, in strict order

| Work unit | Implementation result | Permitted test boundary |
| --- | --- | --- |
| **[WIKI01 graph and health](../../../changes/archive/2026-11/other/2026-11-16--wiki01-markdown-graph-health/CHANGE.md)** | Markdown AST parser, typed directed graph, link/anchor validation, orphan/hop metrics, DOT/JSON output | **Done.** Provider-free. First baseline recorded; five docs pages remain unreachable |
| **[WIKI02 static retrieval](../../../changes/archive/2026-11/other/2026-11-16--wiki02-static-retrieval-and-hopper/CHANGE.md)** | 30 reviewed gold questions, BFS, seeded Wiki Hopper, lexical BM25-style retrieval, Recall/MRR/nDCG reports | **Done.** Provider-free. First run blocked by graph errors; Recall@5 0.50 |
| **[WIKI03 isolated agent harness](../../../changes/archive/2026-11/other/2026-11-16--wiki03-isolated-agent-evaluation/CHANGE.md)** | Host-traced fresh-session trials, redacted JSONL event adapter, external oracle and rubric | **Done as a fake harness.** No live agent benchmark |

**Order:** WIKI01, WIKI02, and WIKI03 are Done. The owner authorized that sequence on 2026-11-16. Do not treat reachability misses or the static scores as permission to spam links. WIKI03 did not run a live agent.

The detailed target contracts below remain the design source; implementation receipts must not turn their hypothetical threshold examples into fake measured results.

## Principles worth defending

- **No arbitrary “one health number.”** Show structural integrity, retrieval efficiency, answer correctness and source fidelity as a four-axis scorecard. Hard security/approval mistakes fail regardless of speed.
- **Wiki graph = current knowledge only.** Terminal `work/changes/archive/` is permanently retained, but its historical links or impressive node count are not evidence of present wiki connectivity. Parked/expired material is deliberately not normative.
- **Every rule is measured against its purpose.** Routers naturally have high outbound degree, a precise source spec may have few links, and a code map has other responsibilities.
- **Baseline first, threshold second.** Initial suggested thresholds are hypotheses to tune from the post-DOC04 graph, a frozen query corpus and manually reviewed known-good pages. Do not “fix” numbers by spam-linking irrelevant pages.
- **Independent runs are real isolation.** A new model tool session, read-only repo snapshot, no reused chat context, no visible gold answers, and actual tool traces per question. A subagent inside a shared context is not isolation unless its memory/config and trace prove it.
- **Benchmark cost is opt-in.** Static graph and lexical retrieval use no model/provider. Agent trials can incur charges or account usage and must not be launched by a Change without explicit owner approval and cap.
- **Do not create a second documentation archive.** Generated graphs and raw traces live under a gitignored local results path; only deliberately selected, compact reproducibility receipts are committed to evidence.

## Success, in terms of the user's work

When asked “Does an unattended character advance time?”, a fresh agent can locate the *accepted* gameplay rule and the GM07 proposed boundary, without mistaking Chamber's timed fixture for general policy. When asked “Is SSE implemented?”, it locates the selected client contract, source symbol and current proof tier, without trusting an old `research/legacy-` assertion. Both should be faster and less error-prone than navigating the raw repo.

**Implementation gate:** WIKI01 has executed `pnpm wiki:health`. Hypothetical thresholds in this folder are not measured results. Retrieval and agent figures stay unknown until those Changes run.
