# DB10 | Bounded Composer tasks

Base SHA d08e36d809bb53c48fef3351224994bae92b6e7c; Ready / commissioned (dependency-gated). Target main. DB03/04/05/07/09 joined; DB08 source joined. Live execution requires separately authorized disposable PostgreSQL. [Program](../../../undertakings/storyteller-workshop/DB-PARALLEL.md). MODEL=Composer Standard | DEPTH=PATCH. One child at a time. Parent owns lockfile, manifest integration and receipts; separate linked Change worktree. No unselected successor. Run commands from repository root. Stop on actual semantic/safety contradiction; missing live permission records NOT RUN. Receipt exact paths, command/cwd, result, baseline failures and SHA. No provider, migration-history or protected DB changes.

## T01 | Graph law
Read EXECUTION.md, scripts/repo-tools/module-graph.mjs, module-graph.test.mjs, eslint.config.mjs, infra/images/release/production-workspace-closure.test.mjs. Implement exact graph/closure guards and fixtures. Run node --test scripts/repo-tools/module-graph.test.mjs infra/images/release/production-workspace-closure.test.mjs; pnpm repo:module-graph. No live permission required.

## T02 | Docs and wiki classification
Read EXECUTION.md, scripts/repo-tools/wiki-core/model.mjs, packages/db/README.md, packages/story-engine/SQL-OWNERSHIP.md, docs/technical/platform/database-infrastructure.md. Correct current owner paths and realization, add existing wiki tests for each owner. Run schema and source verification, affected builds/typechecks; preserve migration bytes.

## T03 | Managed live proof harness
Read EXECUTION.md, packages/db/test/database.integration.ts, packages/db/src/transaction/execute.ts, packages/db/package.json. Add selected tests and strict loopback guard, build only without authorization. Run existing component test only on explicitly authorized exclusive disposable DB. Separate full-schema suites as specified. Record NOT RUN if unavailable; do not fabricate PASS. DB10 stays open for missing required acceptance.
