# Proof matrix
No proof executed by ChatGPT. Run from repo root after install; report actual exit code and counts.

| Check | Positive | Negative |
|---|---|---|
| Source identity | moved validators and literals unchanged except imports/specified splits | no widened validators, altered digest or silent alias |
| Package graph | `pnpm repo:module-graph` and `pnpm repo:module-graph:test` | no cycle, undeclared dependency or forbidden edge |
| Build | `pnpm exec turbo run build typecheck` (full at closure, or explicitly scoped reverse consumers for intermediate tasks) | no stale dist-only resolution; fresh install |
| Tests | moved tests actually emitted and run | all pre-existing negative assertions preserved |
| Docs | `pnpm wiki:change-guard --mode plan` / `--mode close` with selected packet arguments per current CLI; `pnpm wiki:health` | no new broken links; baseline failures separately recorded |
| Quality | `pnpm repo:code-quality:changed` with actual reference and `pnpm repo:code-health --base <reference> --strict-new` | no unrelated edits or new severe bands |

## Relocated test commands

## Stage-specific acceptance
Delete packages/contracts (manifest, tsconfig, README, source/test leftovers) and all active references/aliases. Replace former pure package rule in `scripts/repo-tools/module-graph.mjs` and `eslint.config.mjs` with explicit domain DAG and forbidden edges. Preserve existing pure-game and engine-to-lab restrictions. Use graph tests for type-only as well as runtime forbidden imports. Update `infra/kubernetes/lab/dev/dev-sync-paths.mjs` obsolete generated-contracts exception only after checking there are no generated successor files; dev sync discovery must cover new paths. Update `infra/kubernetes/lab/app-release/production-workspace-closure.test.mjs` Web expected story-interface, admin-interface, identity-interface, lab-interface; reject engine/db/admin/lab-support/private protocol/Redis/cache-port in Web production closure except legitimate baseline dependencies explicitly proven by planner; assert API/Authority lab exclusion and existing worker closure. `scripts/repo-tools/focused-integration.mjs` remove old build filter; keep Nest-only admin compile path and topological explicit list if avoiding Web. Update old package-specific graph test fixtures to domain names where semantic purpose unchanged, and add negative old-name import/manifest tests. Update `maintenance-coverage.test.mjs`, `ci-change-scope.test.mjs` fixture path examples to story-interface, do not weaken assertions. Check shell/Docker/config/docs references from inventory. Root pnpm lockfile has no importer or link to old workspace; no runtime/build/test import or manifest old name; historical archive/evidence text may remain immutable, active docs describe retirement, not pretend old files exist. Run frozen install, full build/typecheck, available provider-free unit suites, module graph, closure tests (pure test cases only unless isolated release build approved), dev-sync tests, lint and wiki gates. No compatibility package under another generic name.

## Stop conditions
Unexpected behavior or schema/digest change, private browser import, production graph cycle, unplanned Documents dependency or missing fixture: stop and report exact symbol/path to ChatGPT. No live provider, DB reset, or cluster operation.
