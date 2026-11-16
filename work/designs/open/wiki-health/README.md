# Wiki Health | measurable knowledge-system design

**State:** **Proposed design only**, 2026-11-16. **Not a selected Change; no code authorization.** DOC04 is Done and archived. This folder does not reopen it, and it does not modify `docs/`, `STATUS.md`, the Change queue, or game/runtime source.

## Goal

Offscreen RPG documentation is an **internal wiki and epistemic foundation**, not a pile of reports. A fresh ChatGPT/Cursor/Claude/Codex reader should efficiently find (1) owner-approved product truth, (2) selected technical design, (3) current source/test evidence, and (4) unresolved proposals **without mistaking one for another**.

A good graph is necessary but not sufficient. A good answer is necessary but may hide unacceptable retrieval cost. A technically correct answer about an obsolete source state is still wrong for current implementation work. Evaluate **independently**:

1. [GRAPH-HEALTH.md](GRAPH-HEALTH.md) — entirely local mechanical wiki graph, link validation, typed cross-layer ownership, content warnings and calibration.
2. [RETRIEVAL-BENCHMARK.md](RETRIEVAL-BENCHMARK.md) — free keyword search baseline, isolated fresh-agent trials, source discrepancy verification, score and instrumentation.
3. [IMPLEMENTATION.md](IMPLEMENTATION.md) — exact CLI/API deliverables, safe phases, baselines, false-positive controls and acceptance.

## Implementation-ready Changes, in strict order

| Work unit | Implementation result | Permitted test boundary |
| --- | --- | --- |
| **[WIKI01 graph and health](../../../changes/open/2026-11-16--wiki01-markdown-graph-health/CHANGE.md)** | Markdown AST parser, typed directed graph, link/anchor validation, orphan/hop metrics, DOT/JSON output | **All provider-free**; baseline and negative parser fixtures |
| **[WIKI02 static retrieval](../../../changes/open/2026-11-16--wiki02-static-retrieval-and-hopper/CHANGE.md)** | 30 reviewed gold questions, BFS, seeded Wiki Hopper, lexical BM25-style retrieval, Recall/MRR/nDCG reports | **All provider-free**; no LLM calls at all |
| **[WIKI03 isolated agent harness](../../../changes/open/2026-11-16--wiki03-isolated-agent-evaluation/CHANGE.md)** | Host-traced fresh-session trials, redacted JSONL event adapter, external oracle and rubric, real CLI adapter behind permission | **Fake-adapter and dry-run tests only** until explicit owner-approved model, cap and sandbox |

**Order:** WIKI01 Done → WIKI02 Done → WIKI03 Done. Each is a **code-bearing Change**, not a documentation-only exercise. The owner may ask Cursor to select WIKI01 and implement in that order; current selection is still `none`. Do not implement all three as one enormous unsupervised rewrite.

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

**Implementation gate:** once DOC04 settles, have an independent owner select a bounded wiki-health Change. No dashboard or scores may be claimed from this proposal before the scripts and trials actually execute.
