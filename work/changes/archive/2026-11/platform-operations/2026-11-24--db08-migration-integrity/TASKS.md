# DB08 | bounded Composer tasks

Base 7033f654091a4fc66c7de6b0dce37e2b8fb504c1. Ready / commissioned source implementation; live proof separately permission-gated. Independent of DB01/06. [Exact pinned driver, algorithm and proof](EXECUTION.md). One child at a time.

## T01 | Strict migration journal and applied prefix
Read packages/db/src/migrate.ts, packages/db/migrations/meta/_journal.json, test/fixtures/migrations/meta/_journal.json, EXECUTION.md. Implement src/migrations/journal.ts and test/db08-journal.test.ts exactly. Root pnpm --filter @offscreen/db build && node --test packages/db/dist/test/db08-journal.test.js.

## T02 | Dedicated runner and real fixture correction
Read migrate.ts, migrate-cli.ts, test/database.integration.ts, EXECUTION.md. Implement src/migrations/runner.ts, compose pinned Drizzle seam and pg operations in migrate.ts, test/db08-runner.test.ts. Fix rollback fixture prefix and add tamper/unknown-ledger integration cases without executing them against ambient SQL. Root pnpm --filter @offscreen/db build && node --test packages/db/dist/test/db08-journal.test.js packages/db/dist/test/db08-runner.test.js; typecheck. No live SQL until explicitly authorized owned fixture. Send source SHA and receipt to DB01 custodian; keep DB08 open if live NOT-RUN. No retry or migration history edit.
