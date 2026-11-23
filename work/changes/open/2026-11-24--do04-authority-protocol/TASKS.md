# TASKS
Serial T-IDs; parent owns shared manifests/lock/docs. Each child gets only its row plus relevant SOURCE-MAP subsection and Change-specific split instructions. No broad discovery; mismatch returns to planner. Root cwd.

## T01 | game-authority, storyteller-task-custody, writer-round-private-custody, writer-scene-round-control
- Prerequisite: stage admitted
- Anchors: `packages/contracts/src/game-authority.ts`, `packages/contracts/src/storyteller-task-custody.ts`, `packages/contracts/src/writer-round-private-custody.ts`, `packages/contracts/package.json`, `SOURCE-MAP.md`
- Edit: move game-authority, storyteller-task-custody, writer-round-private-custody, writer-scene-round-control to exact destination(s) from SOURCE-MAP, preserve symbols; apply Change-specific splits and relative imports. Rewrite listed consumers, direct manifests and exports; parent alone regenerates lockfile. Remove corresponding old export/source/test. For connected cohorts parent can divide mechanical caller edits by workspace, but no independent child design or concurrent manifest writers.
- Proof: compile affected destination(s) and reverse consumers after parent lockfile refresh; run relocated tests `game-authority.test.ts`, `storyteller-task-custody.test.ts`, `writer-round-private-custody.test.ts`, `writer-scene-round-control.test.ts`. Negative: strict schemas/hash/type checks preserved and old moved imports absent. Stop on source map mismatch, cycle, missing test emission or unexpected semantic difference.
- Receipt: changed paths, moved exports, consumer count, exact test commands/results and any blocker.

## T02 | Parent acceptance and integration
- Parent only: regenerate lockfile, build reverse consumers, run PROOF.md, compare actual manifest/import DAG, update selected docs and links, complete ledger. Verify current target ancestry and integrate; archive and retire branch. No next-stage auto-run.
