# TASKS
Serial T-IDs; parent owns shared manifests/lock/docs. Each child gets only its row plus relevant SOURCE-MAP subsection and Change-specific split instructions. No broad discovery; mismatch returns to planner. Root cwd.

## T01 | Remove workspace and stale wiring
- Anchors: `packages/contracts/package.json`, `scripts/repo-tools/focused-integration.mjs`, `infra/kubernetes/lab/dev/dev-sync-paths.mjs`, `pnpm-lock.yaml`, `SOURCE-MAP.md`.
- Edit: delete empty old workspace and obsolete filter/exceptions; clean manifest/lock/active docs references per CHANGE. Parent regenerates lock. Negative: old package resolution fails after clean install.
- Proof: frozen install and full workspace build/typecheck; old name absent from executable source and manifests.

## T02 | Enforce final domain DAG
- Requires T01. Anchors: `scripts/repo-tools/module-graph.mjs`, `scripts/repo-tools/module-graph.test.mjs`, `eslint.config.mjs`, `infra/kubernetes/lab/app-release/production-workspace-closure.test.mjs`, `CHANGE.md`.
- Implement explicit package owner/edge checks and Web/server negative tests per CHANGE; preserve baseline restrictions. Update fixture names in maintenance/CI tests. Proof: graph test, graph report, closure pure tests, lint. Negative: inject Web→private protocol, leaf→engine and engine→lab edge and assert rejection; reject old import even type-only. No build closure test requiring live cluster.

## T03 | Parent acceptance and integration
- Parent only: regenerate lockfile, build reverse consumers, run PROOF.md, compare actual manifest/import DAG, update selected docs and links, complete ledger. Verify current target ancestry and integrate; archive and retire branch. No next-stage auto-run.
