# Wiki Health | measurable knowledge-system design

**State:** **Proposed design only**, 2026-11-16. **Not a selected Change; no code authorization.** DOC04 is Done and archived. This folder does not reopen it, and it does not modify `docs/`, `STATUS.md`, the Change queue, or game/runtime source.

## Goal

Offscreen RPG documentation is an **internal wiki and epistemic foundation**, not a pile of reports. A fresh ChatGPT/Cursor/Claude/Codex reader should efficiently find (1) owner-approved product truth, (2) selected technical design, (3) current source/test evidence, and (4) unresolved proposals **without mistaking one for another**.

A good graph is necessary but not sufficient. A good answer is necessary but may hide unacceptable retrieval cost. A technically correct answer about an obsolete source state is still wrong for current implementation work. Evaluate **independently**:

1. [GRAPH-HEALTH.md](GRAPH-HEALTH.md) — entirely local mechanical wiki graph, link validation, typed cross-layer ownership, content warnings and calibration.
2. [RETRIEVAL-BENCHMARK.md](RETRIEVAL-BENCHMARK.md) — free keyword search baseline, isolated fresh-agent trials, source discrepancy verification, score and instrumentation.
3. [IMPLEMENTATION.md](IMPLEMENTATION.md) — exact CLI/API deliverables, safe phases, baselines, false-positive controls and acceptance.

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
