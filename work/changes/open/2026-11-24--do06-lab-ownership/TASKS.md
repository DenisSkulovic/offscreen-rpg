# TASKS
Serial T-IDs; parent owns shared manifests/lock/docs. Each child gets only its row plus relevant SOURCE-MAP subsection and Change-specific split instructions. No broad discovery; mismatch returns to planner. Root cwd.

## T01 | chamber, qa
- Prerequisite: stage admitted
- Anchors: `packages/contracts/src/chamber.ts`, `packages/contracts/src/qa.ts`, `packages/contracts/package.json`, `SOURCE-MAP.md`
- Edit: move chamber, qa to exact destination(s) from SOURCE-MAP, preserve symbols; apply Change-specific splits and relative imports. Rewrite listed consumers, direct manifests and exports; parent alone regenerates lockfile. Remove corresponding old export/source/test. For connected cohorts parent can divide mechanical caller edits by workspace, but no independent child design or concurrent manifest writers.
- Proof: compile affected destination(s) and reverse consumers after parent lockfile refresh; run relocated tests `chamber.test.ts`. Negative: strict schemas/hash/type checks preserved and old moved imports absent. Stop on source map mismatch, cycle, missing test emission or unexpected semantic difference.
- Receipt: changed paths, moved exports, consumer count, exact test commands/results and any blocker.

## T02 | chamber-lab, live-evaluation, memory-evaluation, creative-exploration-evaluation
- Prerequisite: T01 receipt accepted
- Anchors: `packages/contracts/src/chamber-lab.ts`, `packages/contracts/src/live-evaluation.ts`, `packages/contracts/src/memory-evaluation.ts`, `packages/contracts/package.json`, `SOURCE-MAP.md`
- Edit: move chamber-lab, live-evaluation, memory-evaluation, creative-exploration-evaluation to exact destination(s) from SOURCE-MAP, preserve symbols; apply Change-specific splits and relative imports. Rewrite listed consumers, direct manifests and exports; parent alone regenerates lockfile. Remove corresponding old export/source/test. For connected cohorts parent can divide mechanical caller edits by workspace, but no independent child design or concurrent manifest writers.
- Proof: compile affected destination(s) and reverse consumers after parent lockfile refresh; run relocated tests `chamber-lab.test.ts`. Negative: strict schemas/hash/type checks preserved and old moved imports absent. Stop on source map mismatch, cycle, missing test emission or unexpected semantic difference.
- Receipt: changed paths, moved exports, consumer count, exact test commands/results and any blocker.

## T03 | Parent acceptance and integration
- Parent only: regenerate lockfile, build reverse consumers, run PROOF.md, compare actual manifest/import DAG, update selected docs and links, complete ledger. Verify current target ancestry and integrate; archive and retire branch. No next-stage auto-run.
