# TASKS
Serial T-IDs within this Change only; other admitted Changes may execute concurrently in separate linked worktrees. Parent owns local manifests/lock and its receipt; the named integration custodian serializes shared docs and integration. See CHANGE.md and the program coordination rules. Each child gets only its row plus relevant SOURCE-MAP subsection and Change-specific split instructions. No broad discovery; mismatch returns to planner. Root cwd.

## T01 | read-cache
- Prerequisite: released wave A; local branch/worktree checks only (no predecessor Change or new planner approval).
- Anchors: `packages/contracts/src/read-cache.ts`, `packages/contracts/package.json`, `SOURCE-MAP.md`
- Edit: move read-cache to exact destination(s) from SOURCE-MAP, preserve symbols; apply Change-specific splits and relative imports. Rewrite listed consumers, direct manifests and exports; parent alone regenerates lockfile. Remove corresponding old export/source/test. For connected cohorts parent can divide mechanical caller edits by workspace, but no independent child design or concurrent manifest writers.
- Exact test destination: `packages/cache-port/test/read-cache.test.ts`; retain existing import `../src/read-cache`. Preserve all compile-time negative assertions.
- Proof: compile affected destination(s) and reverse consumers after parent lockfile refresh; run relocated tests `read-cache.test.ts`. Negative: strict schemas/hash/type checks preserved and old moved imports absent. Stop on source map mismatch, cycle, missing test emission or unexpected semantic difference.
- Receipt: changed paths, moved exports, consumer count, exact test commands/results and any blocker.

## T02 | Parent acceptance and integration
- Parent only: regenerate lockfile, build reverse consumers, run PROOF.md, compare actual manifest/import DAG, update selected docs and links, complete ledger. Deliver accepted branch + proof receipt to integration custodian; custodian refreshes target, reconciles owned import/manifest edits, regenerates lockfile and reruns affected proof, then archives and integrates in serialized order. Parent retires only its clean integrated worktree/branch after verified join. No next-stage auto-run.
