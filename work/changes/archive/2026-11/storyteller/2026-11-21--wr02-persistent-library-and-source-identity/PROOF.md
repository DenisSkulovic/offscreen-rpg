# WR02 | planner proof matrix
**Evidence:** design only; no tests run by ChatGPT. **Preconditions:** disposable local storage/DB and no live data reset; benchmark reproducibly with scripted seed and captured HEAD. **Expected:** v1 fixtures byte/hash-identical after v2 introduction.

| Case | Setup/operation | Required result |
|---|---|---|
| Canonical insertion | Same 100 paths added in reverse and shuffled order | identical v2 root and index-node hashes |
| Prefix pagination | >256 mixed UTF-8 paths, page size 32 | merged pages equal sorted complete listing; cursor for different root/prefix refused |
| Secondary ID index | Diverged child ID@revision with different bytes | exact root+ID resolves correct object hash; naked ID@rev never cross-resolves |
| Batch copy-on-write | 10k paths, edit 1k one by one | unchanged subtree hashes remain identical, measured path-local IO; not whole manifest copy per edit |
| Fork pin | old scene root at 37, parent edits to 80 | child root matches 37 and excludes 80; zero per-entry copy |
| Authority | owner A exposes private object hash to B | B cannot open object unless its authorized root includes it and visibility permits |
| Stale commit | concurrent batch rooted at R0 after R1 chosen | SQL conflict, unchanged head; staged CAS inert |
| Corrupt CAS | remove child node, falsify hash or reverse index link | fail closed without fallback to latest root |
| Compatibility | legacy v1 manifest and checkpoint | same historical reads and hashes; no rewrite |
| Source overlay | two mounts conflict at same normalized path | explicit collision denial, no arbitrary last wins |

**Commands from repository root:** `pnpm --filter @offscreen/documents test`; `pnpm --filter @offscreen/application test` with disposable DB prerequisites. New benchmark command must be committed with stable seed and report node GET/PUT, total bytes, p95 read/write and environment. Target performance is structural sharing and no whole-root scan, not an invented latency threshold. **Close only after actual pass/negative receipts.**