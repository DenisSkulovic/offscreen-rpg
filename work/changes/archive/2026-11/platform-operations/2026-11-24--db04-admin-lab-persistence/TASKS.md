# DB04 | Bounded Composer tasks

Base SHA d08e36d809bb53c48fef3351224994bae92b6e7c; Ready / commissioned (dependency-gated). Target main. DB03 joined; DB05 not concurrent. [Program](../../../undertakings/storyteller-workshop/DB-PARALLEL.md). MODEL=Composer Standard | DEPTH=PATCH. One child at a time. Parent owns lockfile, manifest integration and receipts; separate linked Change worktree. No unselected successor. Run commands from repository root. Stop on actual semantic/safety contradiction; missing live permission records NOT RUN. Receipt exact paths, command/cwd, result, baseline failures and SHA. No provider, migration-history or protected DB changes.

## T01 | Admin
Read SOURCE-MAP.md, packages/db/src/schema/admin.ts, packages/admin/package.json, packages/admin/test/admin-session.test.mjs. Move declaration and map seven exact consumers; add explicit export and tool dep; remove DB admin alias. Run affected build and admin tests after lock update.

## T02 | QA and DB identity dependency
Read SOURCE-MAP.md, packages/db/src/schema/qa.ts, packages/lab-support/src/qa-journeys.ts, packages/lab-support/package.json. Move declaration, exact two consumers, explicit export and deps; remove DB QA alias and DB identity dep after zero imports. Regenerate lockfile; run SOURCE-MAP proof.
