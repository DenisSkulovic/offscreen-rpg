# DB05 | Bounded Composer tasks

Base SHA d08e36d809bb53c48fef3351224994bae92b6e7c; Ready / commissioned (dependency-gated). Target main. DB04 joined (includes DB03); DB01 Transaction root export remains. [Program](../../../undertakings/storyteller-workshop/DB-PARALLEL.md). MODEL=Composer Standard | DEPTH=PATCH. One child at a time. Parent owns lockfile, manifest integration and receipts; separate linked Change worktree. No unselected successor. Run commands from repository root. Stop on actual semantic/safety contradiction; missing live permission records NOT RUN. Receipt exact paths, command/cwd, result, baseline failures and SHA. No provider, migration-history or protected DB changes.

## T01 | Delivery package
Read SOURCE-MAP.md, packages/db/src/outbox.ts, outbox-relay.ts, schema/outbox.ts. Create outbox leaf, move three implementations with exact import edits. No behavior changes. Build leaf after lock regeneration.

## T02 | Engine callers
Read SOURCE-MAP.md, packages/story-engine/package.json, src/stories/continuation.ts, src/storyteller/launch-admission.ts. Apply exact mixed import split and all three literal mappings to engine source/tests; direct outbox dep. No SQL/query edits.

## T03 | Runtime and test consumers
Read SOURCE-MAP.md, apps/worker/src/outbox/relay.ts, packages/lab-support/package.json, tools/api-integration/legacy-engine-tests/ma05b-outbox-compat.test.mjs. Map worker/lab/chamber/api-integration/db-migrations groups exactly, direct deps, remove DB aliases and tool DB dependency where unused. Regenerate lockfile. Run SOURCE-MAP proof and affected builds/typechecks.
