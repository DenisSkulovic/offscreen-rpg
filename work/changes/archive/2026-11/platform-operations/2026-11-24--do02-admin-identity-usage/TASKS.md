# TASKS
Serial T-IDs within this Change only; other admitted Changes may execute concurrently in separate linked worktrees. Parent owns local manifests/lock and its receipt; the named integration custodian serializes shared docs and integration. See CHANGE.md and the program coordination rules. Each child gets only its row plus relevant SOURCE-MAP subsection and Change-specific split instructions. No broad discovery; mismatch returns to planner. Root cwd.

## T01 | admin
- Prerequisite: released wave A; local branch/worktree checks only (no predecessor Change or new planner approval).
- Anchors: `packages/contracts/src/admin.ts`, `packages/contracts/package.json`, `SOURCE-MAP.md`
- Edit: use the exact admin fixture and test path in CHANGE.md. Move admin to exact destination(s) from SOURCE-MAP, preserve symbols; apply Change-specific splits and relative imports. Rewrite listed consumers, direct manifests and exports; parent alone regenerates lockfile. Remove corresponding old export/source/test. For connected cohorts parent can divide mechanical caller edits by workspace, but no independent child design or concurrent manifest writers.
- Proof: compile affected destination(s) and reverse consumers after parent lockfile refresh; run relocated tests new focused fixtures described in CHANGE.md and existing relevant consumer tests. Negative: strict schemas/hash/type checks preserved and old moved imports absent. Stop on source map mismatch, cycle, missing test emission or unexpected semantic difference.
- Receipt: changed paths, moved exports, consumer count, exact test commands/results and any blocker.

## T02 | terminal-auth
- Prerequisite: T01 receipt accepted
- Anchors: `packages/contracts/src/terminal-auth.ts`, `packages/contracts/package.json`, `SOURCE-MAP.md`
- Edit: use the exact identity fixture and test path in CHANGE.md. Move terminal-auth to exact destination(s) from SOURCE-MAP, preserve symbols; apply Change-specific splits and relative imports. Rewrite listed consumers, direct manifests and exports; parent alone regenerates lockfile. Remove corresponding old export/source/test. For connected cohorts parent can divide mechanical caller edits by workspace, but no independent child design or concurrent manifest writers.
- Proof: compile affected destination(s) and reverse consumers after parent lockfile refresh; run relocated tests new focused fixtures described in CHANGE.md and existing relevant consumer tests. Negative: strict schemas/hash/type checks preserved and old moved imports absent. Stop on source map mismatch, cycle, missing test emission or unexpected semantic difference.
- Receipt: changed paths, moved exports, consumer count, exact test commands/results and any blocker.

## T03 | usage-policy
- Prerequisite: T02 receipt accepted
- Anchors: `packages/contracts/src/usage-policy.ts`, `packages/contracts/package.json`, `SOURCE-MAP.md`
- Edit: use the exact usage fixture and test path in CHANGE.md; update residual current-authority relative import and old manifest to usage-policy. Move usage-policy to exact destination(s) from SOURCE-MAP, preserve symbols; apply Change-specific splits and relative imports. Rewrite listed consumers, direct manifests and exports; parent alone regenerates lockfile. Remove corresponding old export/source/test. For connected cohorts parent can divide mechanical caller edits by workspace, but no independent child design or concurrent manifest writers.
- Proof: compile affected destination(s) and reverse consumers after parent lockfile refresh; run relocated tests new focused fixtures described in CHANGE.md and existing relevant consumer tests. Negative: strict schemas/hash/type checks preserved and old moved imports absent. Stop on source map mismatch, cycle, missing test emission or unexpected semantic difference.
- Receipt: changed paths, moved exports, consumer count, exact test commands/results and any blocker.

## T04 | Parent acceptance and integration
- Parent only: regenerate lockfile, build reverse consumers, run PROOF.md, compare actual manifest/import DAG, update selected docs and links, complete ledger. Deliver accepted branch + proof receipt to integration custodian; custodian refreshes target, reconciles owned import/manifest edits, regenerates lockfile and reruns affected proof, then archives and integrates in serialized order. Parent retires only its clean integrated worktree/branch after verified join. No next-stage auto-run.
