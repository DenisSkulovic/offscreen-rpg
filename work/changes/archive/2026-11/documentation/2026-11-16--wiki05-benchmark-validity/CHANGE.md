# WIKI05 | Repair retrieval metrics, Hopper realism and agent rubric

**State: Done (2026-11-17).** Code-bearing benchmarking Change. WIKI04 graph was already 74/74. Historical v1 reports stay `wiki.static.v1`. **No live model run or provider use.** Starting code SHA: `51b21588b4a115cf7e7690c13fdcd9dee906833f`. Execution HEAD: `9fbeb8aa99a2d745c049f67c840157028c7e8b4d` plus this dirty tree.

## Why this is necessary

WIKI02 currently reports Recall@5 0.50, MRR 0.311, nDCG@5 0.480 and Hopper hit@3 ~0.323 (100 trials × 30 questions, seed 20261116) from the pre-repair wiki. These **are not valid general summaries of wiki information quality** until scoring definitions and known navigation-simulator errors are fixed. Preserve historical `wiki.static.v1 reports as v1; publish new `wiki.static.v2 with meaningful names and non-comparable-from-v1 warning.

**Source-backed defects:**

1. `scripts/repo-tools/wiki-core/bench.mjs calls an all-mandatory-in-top-k binary value `recallAt5, then sets `reciprocal=0 when even one owner is missing. The former is **CompleteAnswer@5** (valuable) and the latter is **not standard MRR**.
2. `ndcgAt maps owners by path, so two headings in one file produce duplicate ideal relevance and the final grade overwrites the first. Case P07 requires one page for two headings; a page ranker cannot return the same page twice, making page-level ideal nDCG wrong. Compute per-unique-page max (or an explicitly documented alternative) and standard gain `(2^grade - 1) / log2(rank+1), then keep a separate section retrieval test.
3. `wrongAuthorityAt5 is near-tautological: normal corpus excludes `historic/evidence before ranking. Report default *exposure* as “not evaluated / excluded by policy,” not empirical zero risk. Add a deliberately mixed/adversarial candidate-set lane with real wrong-authority retrieval and correct labeling of historic citations.
4. W0 case A06 starts at `docs/README.md while requiring `AGENTS.md; the project's graph deliberately treats AGENTS as an independent agent-workflow entry. Add entrypoint semantics (e.g. AGENTS for agent work, docs for wiki reading), preserving both old and revised case for honest comparison. **Do not add a meaningless docs-root→AGENTS link just to flip one score.**
5. `scripts/repo-tools/wiki-core/markdown.mjs records tableCell or paragraph, not **the full question+owner table row**. `scripts/repo-tools/wiki-core/hopper.mjs sees “Vision” but not the adjacent user-language “What is the game?” question. This unfairly penalizes the existing useful routing structure.
6. Hopper's `trail is the final stack after dead-end backtracking; hit@3/hit@6 and median hops use `trail.indexOf(target), not the chronological number of clicks. Forward moves increment `hops but reverse backtracks do not. The reported step distribution may understate actual browsing cost. Its loop counter is effectively unreachable because next-hop choices filter all pages already in the active trail. Distinguish actual page opens, forward choices, backtrack actions, revisit attempts, final shortest path and useful stopping.
7. `scripts/repo-tools/wiki-core/agent-score.mjs uses string inclusion for prohibited claims and treats **any** mention of `work/changes/archive/ as authoritative misuse. “An archived packet is NOT permission” would be falsely penalized. A cited file path in prose is not proof a model inspected it. This is acceptable only as **fake harness validation**, not agent-answer certification.

## A. Versioned, mathematically honest static metrics

Under `scripts/repo-tools/wiki-core/bench.mjs and its gold corpus:
- Report **CompleteAnswer@1/5/10** (all mandatory page owners found), **owner Recall@k** (actual fraction of required unique pages retrieved; macro and micro), **primary-owner Recall@k**, and **standard MRR** (1/rank first relevant page; 0 if absent, independent of whether companions all appear). Optional last-required-rank and completion reciprocal should be separately named.
- Report correct nDCG@5 with one graded relevance per **unique page**; use section-level nDCG only with a real heading-chunk index. If two mandatory headings live in one page, page retrieval can satisfy the **page** condition but may not demonstrate both headings answered. Report passage-level capability separately.
- Split source-status questions into first correct **technical owner** and required **STATUS/evidence companion** and disclose this strict dependency. Keep source-claim correctness outside lexical metrics.
- Add explicit ranked-corpus types: normative-only, proposal-aware, and adversarial mixed. The wrong-authority metric must specify **whether historic candidates were present**. Do not claim zero hallucination or correct authority without a model/answer.
- Capture the existing WIKI02 30-case v1 run unchanged and calculate a v2 rescoring against **same docs SHA and same gold** first. Then compare WIKI04 post-navigation docs separately. Do not attribute metric-version change to a wiki improvement.

## B. A Wiki Hopper that sees what users see

Enhance the AST extraction to pass a **visible table-row question**, paragraph and enclosing heading as link context. The row must be the actual containing DOM/Markdown table row, not a global search result. Hopper scores link label + row question/adjacent prose + enclosing heading + destination *path*; never inspect target document content or gold until after click. No hidden answer lookup, no paid embeddings. Include a baseline policy using only label/path and a row-aware policy, both versioned and compared at the **same wiki SHA**.

Track chronological navigation events `click/backtrack/stop/loop-prevention, real page openings, total interaction cost, and final route. Hit@3 means success by at most three **actual forward page openings** (plus report backtracks separately); hit@6 similarly. A simulator that tests 12 dead ends, backtracks, and reaches the goal at apparent path depth 2 **must not** score hit@3. Explicitly test a row where the correct link label is generic but the first-cell question is diagnostic. Keep random baseline and 100 seeded runs per question.

Do not massage labels/docs to overfit 30 public questions. After the instrument is valid, test held-out paraphrases and at least 10 questions drafted by another reviewer to measure generalization; keep both old and new score distributions.

## C. Honest agent harness grading

Keep WIKI03 default fake-only. Its substring scorer may remain a cheap sanity check but **cannot certify semantic correctness**. Add regression cases for negated prohibited claims, historical mentions that explicitly reject authority, valid citations not actually opened, and a correct answer with no citation. Use an explicit structured rubric for specific assertions and separately recorded tool-trace evidence, with manual review for ambiguous claim meaning. A model must not grade its own answer. Any hypothetical future live run requires new explicit owner approval and a proven real sandbox, not merely tests with a fake `readSnapshotFile.

Retain null for unknown token/usage fields, no inferred dollars, no model calls or repo-executed game tests. Existing WIKI01 graph remains unchanged; metric fixes must not hide its hard errors.

## D. Completion

Commands: `pnpm wiki:health, `pnpm wiki:bench:static --self-test, `pnpm wiki:bench:static --seed 20261116 --json, `pnpm wiki:bench:agent --self-test, `python scripts/check_docs.py, `git diff --check. Record **actual** JSON schema version, case numbers, baseline v1/v2 rescoring, stable seed, category scores, and known remaining limitations. Keep complete terminal Changes intact; no game source edits, live providers or deployment.

See [verification](VERIFICATION.md).

## Reconciliation ledger

| Measurement owner | Falsifiable output | State |
| --- | --- | --- |
| W1 ranking/metric math | CompleteAnswer@5 stays 0.50. Owner Recall@5 macro is 0.667 and micro is 0.622. Standard MRR is 0.492 on the pre-repair docs and 0.486 after WIKI04. Page nDCG@5 is about 0.48. v1 MRR near 0.31 is the old conditional rank, not this MRR | updated `scripts/repo-tools/wiki-core/bench.mjs` |
| Gold topology | A06 from `docs/README.md` still fails and is excluded from the docs-route mean. The same owners from `AGENTS.md` succeed. No docs-root link was added | updated |
| Hopper observable navigation | On the repaired wiki, label-only stochastic hit@3 is 0.285 and row-aware hit@3 is 0.357. A fixture with more than 3 forward opens and a final route of 2 edges fails hit@3. Table-row context is read; destination body is not | updated `hopper.mjs`, `markdown.mjs` |
| Adversarial authority index | Normative lane is `evaluated: false`. Adversarial historic-in-top5 is 0.60 on both doc snapshots | updated |
| WIKI03 scripted grader | Negated prohibited text and an archive cited as non-authority pass the substring check. Relying on an archive as current proof still fails. An unread path is unverified. `semanticCertification` is false | updated `agent-score.mjs` |
| Product and technical contracts | No gameplay or technical guarantee was edited to move a score | unchanged |
| Independent held-out questions | Not supplied. Ten paraphrases are implementer-drafted and labeled as such. CompleteAnswer@5 on those ten is 0.40 at 20 trials | unresolved |

## Paired measurements

Same 30 gold cases, seed `20261116`, 100 Hopper trials. v2 gain is `(2^grade - 1) / log2(rank + 1)` with one maximum grade per page.

| Snapshot | Graph | v1 Recall@5 | v1 MRR | v2 CompleteAnswer@5 | v2 owner Recall@5 macro | v2 MRR | v2 row hit@3 | v2 label hit@3 | Adversarial historic@5 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Clean `9fbeb8aa` docs, rescored with this scorer | blocked, 5 hard errors | 0.500 | 0.311 | 0.500 | 0.667 | 0.492 | 0.351 | 0.286 | 0.600 |
| Dirty tree after WIKI04 routes and these metric fixes | measured, 74/74 | 0.500 | 0.306 | 0.500 | 0.667 | 0.486 | 0.357 | 0.285 | 0.600 |

The MRR jump from about 0.31 to about 0.49 is the definition change. The wiki repair did not move CompleteAnswer@5. Row-aware hit@3 beats label-only on both snapshots, so that gap is the instrument reading question tables. v2 semantic SHA on the dirty tree: `61edbf00fce69bf2591cbe5866211cb451bde574308b524a7d59c90a064b2cb2`.

Commands: `pnpm wiki:health --self-test`, `pnpm wiki:bench:static --self-test`, `pnpm wiki:bench:static --seed 20261116`, `pnpm wiki:bench:agent --self-test`, `pnpm wiki:health`, `python scripts/check_docs.py`, `git diff --check`. The pre-repair rescore imported this scorer and pointed it at a detached worktree of `9fbeb8aa`, then removed that worktree. No model call and no game runtime edit.
