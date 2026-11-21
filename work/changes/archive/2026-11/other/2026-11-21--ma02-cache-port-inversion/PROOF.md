# MA02 | proof
Positive: `pnpm --filter @offscreen/contracts build`, `pnpm --filter @offscreen/application typecheck`, `pnpm --filter @offscreen/cache build`, `pnpm --filter @offscreen/api typecheck`; old and new subpaths expose compatible `ReadCache`, disabled implementation unchanged. Negative: cache never bypasses permission by returning a hit, redis absent remains fail-open **only for acceleration** (not security), malformed value path unchanged; manifest has no reverse app dependency; no compile/export resolution errors. Format/lint touched files. No Redis server/provider needed. Only check green commands actually run.

**Contract partition decision (2026-11-21):** Contracts exports only `ReadCacheWrite`, `ReadCache` and `disabledReadCache`; Application retains `CacheIncident` and `ReadCacheOptions`, re-exporting the three neutral symbols. Run the new focused contracts test including an explicit type-level negative for missing TTL/maxBytes; verify `@offscreen/application/cache` public compatibility. No runtime Redis behavior should change.

## Independent G0–G7 planner-readiness audit (2026-11-21)

**Target:** `undertaking/storyteller-workshop` remote HEAD at time of audit was documentation-only after `dac6b69813b52ecb1f202158791deaa3b7ea89d7`; actual source/structural cache symbols and contracts manifest inspected. **Verdict: READY WITH EXPLICIT LIMITS**, first dispatch T01. The parent must compare current branch/worktree and named symbols before editing; ChatGPT did not run builds/DB or inspect unpushed local worktrees.

| Gate | Planner result | Diagnostic basis |
| --- | --- | --- |
| G0 branch/authority | PASS, local worktree recheck due | selected cache port inversion, Undertaking target, no provider |
| G1 source | PASS for scoped edit | `application/cache/read-cache.ts`, cache adapter/index, contracts manifest + tsconfig, app/API manifest |
| G2 frozen decisions | PASS | only ReadCacheWrite, ReadCache, disabledReadCache move; incident/options remain App |
| G3 child dry-run | PASS T01–T03 | exact owners, symbols and test paths, no caller discovery |
| G4 parent dispatch | PASS | T01 after worktree guard; no architecture preflight |
| G5 DAG/parallel | PASS | T01→T02→T03, intentionally serial; T02 needs contract export |
| G6 discriminating proof | PASS as **plan**, NOT RUN as execution | disabled get, type bounds, old public alias and graph negative |
| G7 cost/closure | PASS | targeted builds/graph, archive/squash/push; no global suites |

**Limits:** no test results here and no proof of local pnpm store/worktree cleanliness. If named APIs have drifted, return exact mismatch to ChatGPT, not an open investigation. Do not infer cache authorization correctness from a green module graph.
