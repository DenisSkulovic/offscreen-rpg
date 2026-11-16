# WIKI05 | Benchmark correctness and non-gaming tests

**This verification plan is not evidence of execution.** All required tests must use a fixed real Git SHA and simulated documents where needed. No live model calls.

## Mathematical truth fixtures

| Fixture | Required result |
| --- | --- |
| Two mandatory owners, owner A at rank 1, B not in top 10 | CompleteAnswer@5 = 0, macro owner Recall@5 = 0.5, standard MRR = 1.0 (first relevant A) |
| Owner A at rank 1, B at rank 4 | CompleteAnswer@5 = 1, owner Recall@5 = 1.0, standard MRR = 1.0 |
| One canonical page has 2 gold headings with grades 3 and 2 | It appears ONCE in page-level ideal ranking; if first and sole relevant page, page-level nDCG@5 = 1.0, independent of heading duplicates |
| Relevant page absent | MRR = 0, Recall@5 = 0, CompleteAnswer@5 = 0 |
| Historical document in default normative search, or in mixed adversarial corpus | Normative mode excludes it and labels authority-risk evaluation not applicable; adversarial mode visibly tests its exposure/rank |
| Proposed standing-life document in proposal-aware task | Allowed supporting hit with explicit proposed status; never accepted gameplay owner |
| Old A06 from docs root and new agent-workflow A06 from AGENTS | Preserve original versioned failure, correct new entrypoint for new protocol without adding fake docs-root links |

Use standard DCG gain definition and document it. Every reported metric has a numerator/denominator and exact query/path source. Do not call case-complete@5 “Recall” or conditional first rank “MRR”.

## Hopper real-reading fixtures

1. A 2-column question→owner Markdown table: links “Vision” and “Rules” are only distinguishable by adjacent first-column questions. Row-aware policy sees real row context and chooses correctly; label-only policy remains its documented control.
2. A graph where the Hopper clicks a bad path with 4 forward opens, backtracks twice and finally reaches goal along a 2-edge route. Total actual opens exceed 3: hit@3 MUST be false, although final route length is 2.
3. A revisited node from another branch must increment meaningful revisit/backtrack signal; a loop counter that can never increment must be eliminated or explicitly labeled “prevented revisits”.
4. Query unable to match any link: report stopped/uncertain instead of treating no-candidate as successful navigation.
5. No body/title of a destination is used before its edge is selected; instrument a forbidden target-body canary and prove zero calls.
6. Stochastic policy with same seed/question and graph emits byte-identical semantic results; changing seed can alter path without altering graph.

## Robustness and grader honesty

- Measure actual 30-case data and at least 10 **held-out paraphrase questions** approved by someone other than the implementation author; report category breakdown and per-question failure routes.
- A prohibited claim mentioned explicitly to reject it (e.g. “It is false that X”) is NOT automatically scored as accepting X.
- A historical archive linked as an example of stale evidence is NOT automatically an authority violation. A current answer relying on an archived Change as its current normative proof IS a violation.
- A correct path string copied into an answer does not establish that the agent opened it. Tool trace is authoritative for actual reads, where observable.
- With fake trace only, all scores remain labeled fake harness, not independent agent navigation validity.
- No hidden expected-answer file, real provider invocation, account spend or unsafe filesystem access.

## Closure commands

```bash
git rev-parse HEAD
pnpm wiki:health --json
pnpm wiki:bench:static --self-test
pnpm wiki:bench:static --seed 20261116 --json
pnpm wiki:bench:agent --self-test
python scripts/check_docs.py
git diff --check
```

Show v1 untouched archived results and **new** v2 results at the same frozen docs revision, then after WIKI04 docs snapshot separately. Never divide the change in a metric's numerical value between doc improvement and scorer revision without a controlled paired comparison. Confirm full terminal Change archive unchanged; no game code or provider calls.