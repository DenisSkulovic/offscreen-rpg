# WIKI05 | Execution checkpoint

**State:** Done (2026-11-17). WIKI04 was archived first. WIKI03 stayed fake-only. No model pilot was run.

1. P0: Freeze a baseline revision with WIKI02 v1 outputs and the original 30 case/gold owner set. Review metric semantics and source.
2. P1: Implement correct standard page-level Recall@k, MRR and nDCG plus separately named CompleteAnswer@k and proposal/STATUS compound success. Version schema v2; preserve v1 reports.
3. P2: Fix parser link context to include visible question-table rows, current paragraph, enclosing headings. Run strict label/path policy and row-aware policy as separate baselines.
4. P3: Fix chronological Hopper visit/backtrack accounting, measurable hit@k, impossible-loop counter and wrong-authority exposure lane. Record actual visits, not final stack depth.
5. P4: Add grader false-positive fixtures for negation, archived-but-rejected citations, source string without tool read; do not claim semantic agent correctness from regex.
6. P5: Run numeric counterexamples and held-out paraphrases. Rescore the same doc SHA with v1/v2 (metric-change effect), then separate before/after doc snapshot (wiki effect).
7. P6: Check zero model/provider spend, no runtime code edits, protected full archive intact. Close only with tests, actual results and limitations.

**No target chasing:** if row-aware Hopper remains weak, report the missed question paths. Do not turn canonical prose into keyword spam.
