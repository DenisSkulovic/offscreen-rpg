# WIKI02 | Reproducible zero-LLM wiki retrieval benchmark

**State: Done (2026-11-16).** Code-bearing documentation tooling. **Depends on WIKI01 Done**, using its actual parser/graph APIs. No paid providers, LLMs, embeddings, web, databases or external search services.
**Primary designs:** [retrieval benchmark](../../../../../designs/open/wiki-health/RETRIEVAL-BENCHMARK.md) and [graph Hopper](../../../../../designs/open/wiki-health/GRAPH-HEALTH.md#d2-the-wiki-hopper-model-free-simulated-navigation).

## Outcome

Make navigation measurable for *real questions*, not merely arbitrary link density. Implement two independent zero-model baselines:

1. **Topology**: Does a link path from the root exist to a reviewer-verified correct canonical page/heading? What is the shortest number of hops?
2. **Simulated navigation / Hopper**: Given the question and **only links visible on the page already opened**, can a deterministic and seeded-stochastic simulated reader choose its way to the correct owner without knowing the answer?
3. **Lexical search**: Could someone using a simple local keyword search find the correct canonical document among top results? Report ranked relevance, not just keyword hits.

**Implement:**
```text
pnpm wiki:bench:static
pnpm wiki:bench:static --json
pnpm wiki:bench:static --self-test
pnpm wiki:bench:static --seed 20261116
```

If WIKI01 detected graph hard errors, WIKI02 must report its results as **invalid/blocked by graph integrity**, not assert a successful retrieval benchmark on a broken graph.

## Gold cases and ethics

Create **30 frozen, genuinely useful user-language questions**, initial composition 7 accepted product, 7 selected technical, 6 source/coverage, 4 pending decisions and 6 adversarial. [Verification](VERIFICATION.md) supplies the candidate question blueprint; validate expected owner pages and headings by actually reading the post-DOC04 docs and `STATUS.md`. Explicitly record:
- Question ID, exact wording, category, entrypoint, dataset version and Git scope.
- One or more approved gold page/heading routes, relevance grade (0–3) and which ones may complement a mandatory primary owner.
- For pending proposals, both accepted-current-rule owner and actual proposed gate; open design is **never** accepted canon by itself.
- Optional critical negative claims for future agent evaluation, but do not pretend a lexical retriever proves factual truth.

Commit reproducible static case data and a reviewer-visible reference key, **but keep that key outside any later WIKI03 agent sandbox**; WIKI03 must prove it has no access to gold data, benchmark design packets or this Change. Gold can live in runner-host files because the agent evaluates a sanitized replica of the source. Do not let Cursor call a self-authored route table an independent human/agent evaluation; this is a verified static dataset, not an autonomous answer.

Every case must have version and approval owner. Document mistaken prior expected answers rather than tuning gold until numbers improve.

## A. Gold-route topology W0

For each case, compute shortest directed BFS path from permitted entrypoint to one/multiple gold headings/pages. Report success fraction, mean/median/p95 hops, unreachable IDs and actual link sequence. A path to page A while expected heading is present is acceptable if task concerns a page; exact heading coverage needs a linked anchor or discoverable heading route recorded separately. Gold is used **only for scoring**, never search/hopper decisions.

## B. Wiki Hopper W0b

At each opened page, choose from **that page's actual outgoing Markdown links**. Rank candidates by similarity between question and **visible link label, current enclosing heading, destination path slug**. **Do not inspect target body or H1, or query global graph search** before selecting the link. Never use gold owner to choose next hop. A destination's title may be read only *after* following its edge.

Implement a seeded greedy policy and stochastic top-3 selection (default 100 independent seeded runs per question, deterministic RNG and fixed version). Bound at six hops including backtracks, detect loops. Report hit@3/hit@6, unsuccessful/loop/backtrack ratios, median steps and historical/incorrect-authority detours by case. Include a random-choice baseline so success isn't a meaningless side effect of a huge root index. If a query requires product + proposal, score both separately rather than treating draft as accepted norm.

A Hopper is an inexpensive proxy for browsing, not a claim that it reasons like ChatGPT.

## C. Lexical search W1

Use a local deterministic BM25-style ranker/SQLite FTS only if suitable already in repo; no embeddings/network. Index canonical page title/H1–H3/headings/body with documented weights. Put current proposals and evidence in separate typed collections so a user can explicitly search them, but **never rank them as canonical answers** to an accepted-rule query. Completed Change archive, parked (if any), legacy evidence are excluded from the normative search corpus.

Compute Recall@1/5/10, mean reciprocal rank (MRR), nDCG@5 for graded relevance, inappropriate-authority@5, per-category breakdown and complete miss list. Record tokenizer/normalizer version. Multiple gold pages must not make Recall@5 artificially perfect when a mandatory primary owner is missing.

## D. Reports, thresholds and boundaries

Produce `wiki.static.v1` JSON under `out/wiki-health/<sha>/` with input graph snapshot SHA, dataset fingerprint and seed, questions/owners, hops, per-case ranked hits and timings measured by host. Summarize readable table and **top failures by impact**. Prefer a small deterministic artifact, not a multi-megabyte generated HTML encyclopedia.

Initial suggested Recall@5 ≥0.85, MRR ≥0.70 and Hopper hit@3 ≥0.80 are **pilot calibration targets**, not hard-coded mandatory tests. Before numbers can be used as gates, run real baseline, inspect difficult cases and freeze thresholds with justification; don't put redundant keywords or fake links into specs to farm the score.

Implement mutation tests showing the scores respond in the right direction when a gold page is disconnected, a link label becomes vague, wrong-authority bait is introduced, or the correct page disappears from lexical index. WIKI01 structural failures remain hard. WIKI02 cannot modify game source or product rules to make the score green.

**No model calls allowed, even optional.** WIKI03 is a distinct Change with its own safety authorization.

## Measured baseline

Dirty worktree on `0694760d159e331f1628c89931b7921f841df6c2`, Windows, seed `20261116`, 100 stochastic trials and 100 random trials per question. Final `pnpm wiki:bench:static --seed 20261116` exit **1** because WIKI01 still reports 5 unreachable docs pages. Status: `blocked-by-graph-integrity`. This is not a successful retrieval claim. Dataset `wiki-static-v1`, 30/30 headings found, `independentReview: false` (implementer-checked, not a separate human study). Semantic SHA-256 `686c871c42edb076949694180def24bf4c422b17114f7a3abb7354b938c895ef`. Elapsed about 7.9 s. Provider spend: no call.

| Measure | Result | Denominator |
| --- | --- | --- |
| Mandatory route success | 96.7% (29/30) | A06 fails because `AGENTS.md` has no directed path from `docs/README.md` |
| Mandatory hop median / p95 | 1 / 3 | reachable mandatory owners only |
| Recall@5 | 50% | a case scores 1 only when every mandatory owner is in the top 5 |
| MRR | 0.311 | 0 when any mandatory owner is outside the top 5 |
| nDCG@5 | 0.480 | grades 3 mandatory, 2 companion |
| Wrong-authority@5 | 0% | archive and evidence are not in the answer index |
| Hopper greedy hit | 33.3% | one navigation target per case |
| Hopper stochastic hit@3 / hit@6 | 32.3% / 33.2% | 100 seeded trials |
| Random hit@6 | 10.2% | same budget, uniform choice |

Category Recall@5: P 0.86, T 0.86, S 0.33, D 0.00, A 0.17. Pending and adversarial cases miss because the accepted page and the proposal must both appear. Pilot targets Recall@5 ≥ 0.85, MRR ≥ 0.70 and Hopper hit@3 ≥ 0.80 are **not adopted**. The search index excludes this packet, the WIKI03 packet, `work/designs/open/wiki-health/`, and `scripts/repo-tools/wiki-benchmarks/` so the question text does not rank itself.

## Reconciliation ledger

| Deliverable | Gate | State |
| --- | --- | --- |
| 30 gold cases | Real owners/negative cases validated at actual SHA | updated `scripts/repo-tools/wiki-benchmarks/static-v1.mjs`. Implementer-checked headings. Not an independent review |
| W0 graph routes | BFS path and heading success with honest denominators | updated `scripts/repo-tools/wiki-core/bench.mjs`. 29/30 |
| W0b Hopper | No target-peeking, seeded reproducibility and random baseline | updated `scripts/repo-tools/wiki-core/hopper.mjs` |
| W1 lexical | MRR/Recall/nDCG with roles correctly filtered | updated `scripts/repo-tools/wiki-core/search.mjs`. Recall@5 0.50, MRR 0.311 |
| Proof and safe output | Falsification tests, zero provider, valid reports | `pnpm wiki:bench:static --self-test` passed. No model call |
| Product pages | Do not edit canon to raise scores | unchanged |
| Agent command | One maintenance reference | updated `.agents/README.md` |
