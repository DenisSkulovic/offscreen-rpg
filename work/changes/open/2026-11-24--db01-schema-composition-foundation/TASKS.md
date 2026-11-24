# DB01 | bounded Composer tasks

Base 7033f654091a4fc66c7de6b0dce37e2b8fb504c1. Ready / commissioned source-only. [Source map, algorithms and proof](SOURCE-MAP.md). One child at a time. DB01 parent integration custodian; no peer code edits. Preserve DB06 database/config and DB08 migrate/fixture paths.

## T01 | Freeze current schema identity
Read packages/db/drizzle.config.ts, packages/db/test/schema-identity.test.ts, SOURCE-MAP.md exact registry table. Capture synthetic baseline from ORIGINAL config/glob before edits, create private tools/db-migrations workspace and five explicit registry modules plus barrel, fixture and exact identity tests. Preserve Writer fingerprint using storyteller-only namespace. Run pnpm install --lockfile-only then pnpm install --frozen-lockfile in owned worktree; pnpm --filter @offscreen/db build; pnpm --filter @offscreen/db-migrations build; pnpm --filter @offscreen/db-migrations test. Stop on identity count/digest contradiction; no DDL.

## T02 | Move generator and guard stale metadata
Read original generator config, scripts/repo-tools/baseline.mjs, infra/kubernetes/lab/dev/dev-sync-paths.mjs, SOURCE-MAP.md. Implement check:schema synthetic no-DDL and fresh snapshot digest, check:history refusal and guarded generation command, move config and remove old script/devDependency, update baseline filter and warm path/tests. Regenerate local lockfile. Run check:schema (must pass), check:history (expected current stale snapshot refusal), dev-sync-paths.test.mjs, production closure and migration-byte diff. Do not run tracked generator, baseline or migrate.

## T03 | Publish neutral transaction vocabulary
Read packages/db/src/outbox.ts, src/index.ts, DB-PARALLEL frozen types. Extract Transaction type, preserve transitional old export, publish policy/error/telemetry types and compile negative type tests. No DB06 database/config or DB08 migration edits. Build/typecheck DB, focused tests, graph. Reconcile source-only evidence and metadata limitation; integrate under serialized custodian. Stop on semantic contradiction, not known snapshot metadata drift.
