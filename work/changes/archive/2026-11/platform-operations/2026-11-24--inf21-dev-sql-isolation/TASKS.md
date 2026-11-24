# INF21 dispatch

Sequential T-IDs; first T01. Dependency: INF20. One child at a time.

- T01: Separate expected catalog from write authorization. Read tools/dev-environments/src/adapters/dev-sql-tenant-executor.mjs::executeDevSqlTenants; tools/dev-environments/src/adapters/dev-sql-tenant-live-adapter.mjs; tools/dev-environments/test/dev-sql-tenant-executor.test.mjs; tools/dev-environments/src/application/dev-slot-startup.mjs::ensureSql. Exact implementation and proof in [EXECUTION](EXECUTION.md#t01-separate-expected-catalog-from-write-authorization).
- T02: Use canonical migration runner and actual port. Read tools/dev-environments/src/adapters/dev-slot-migrate.mjs; packages/db/src/migrate.ts; packages/db/src/migrations/journal.ts; tools/dev-environments/src/application/dev-slot-startup.mjs. Exact implementation and proof in [EXECUTION](EXECUTION.md#t02-use-canonical-migration-runner-and-actual-port).
- T03: One migration gate. Read tools/dev-environments/src/rendering/dev-slot-project.mjs::projectDevSlot; tools/dev-environments/src/application/dev-slot-startup.mjs::reconcileDevSlot; tools/dev-environments/src/rendering/dev-sql-tenant-grants.mjs; tools/dev-environments/test/dev-slot-project.test.mjs. Exact implementation and proof in [EXECUTION](EXECUTION.md#t03-one-migration-gate).
