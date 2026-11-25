# DB03 | Bounded Composer tasks

Base SHA d08e36d809bb53c48fef3351224994bae92b6e7c; Ready / commissioned. Target main. DB02, CACHE04 and CACHE06B source joins satisfied; no concurrently edited Story Engine/GA/Worker consumer paths. [Program](../../../undertakings/storyteller-workshop/DB-PARALLEL.md). MODEL=Composer Standard | DEPTH=PATCH. One child at a time. Parent owns lockfile, manifest integration and receipts; separate linked Change worktree. No unselected successor. Run commands from repository root. Stop on actual semantic/safety contradiction; missing live permission records NOT RUN. Receipt exact paths, command/cwd, result, baseline failures and SHA. No provider, migration-history or protected DB changes.

## T01 | Leaf and registry
Read SOURCE-MAP.md first table; packages/identity-persistence/package.json, tsconfig.json; packages/db/src/schema; tools/db-migrations/src/registry/story.ts. Create leaf, move eleven files exactly, replace registry imports, add tool dep. Keep old export keys until T03–T05 consumer rewrite (temporarily unresolved within branch; no integration). Run leaf build after pnpm install --lockfile-only then frozen install if needed. No DDL.

## T02 | Engine consumers
Read SOURCE-MAP.md consumer map, packages/story-engine/package.json, src/stories/reads.ts, src/storyteller/budget.ts. Replace six literal specifiers across this workspace source/tests, add direct dep. No logic edits. Verify zero six old strings in source/tests. Build deferred until T05.

## T03 | Runtime apps and Admin/Lab
Read SOURCE-MAP.md, manifests apps/game-authority, apps/worker, packages/admin, packages/lab-support. Apply identical mapping and direct deps to these four only. Verify old literals absent.

## T04 | Test tools and removal
Read SOURCE-MAP.md, tools/chamber/package.json, tools/api-integration/package.json, packages/db/package.json. Map test tools, add direct deps, remove six old DB export keys, update package docs. Regenerate lockfile once; affected builds, typechecks and registry proofs in T05.

## T05 | Proof and join
Run SOURCE-MAP.md proof commands; affected packages filters use --filter=@offscreen/story-persistence --filter=@offscreen/story-engine --filter=@offscreen/game-authority --filter=@offscreen/worker --filter=@offscreen/admin --filter=@offscreen/lab-support --filter=@offscreen/chamber --filter=@offscreen/api-integration --filter=@offscreen/db-migrations with dependency suffix ... where required. Distinguish pre-existing failures. Migration diff empty; no old aliases.
