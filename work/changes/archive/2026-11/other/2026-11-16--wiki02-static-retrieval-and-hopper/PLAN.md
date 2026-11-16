# WIKI02 | Execution checkpoint

Change: [CHANGE.md](CHANGE.md).
State: Done (2026-11-16).

## Current checkpoint

- Done. Thirty heading-checked questions, BFS routes, seeded Hopper, and BM25 ranking are implemented. No model call.
- `pnpm wiki:bench:static --self-test` passed. The real run on dirty `0694760d159e331f1628c89931b7921f841df6c2` exited 1: graph integrity still has five unreachable docs pages, so the benchmark status is blocked. Recall@5 is 0.50 and Hopper hit@3 is 0.323. Those pilot targets are not gates.
- Next work is WIKI03's fake harness only. Do not edit product pages to lift these scores.
