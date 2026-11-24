# DB06 | bounded Composer tasks

Base 7033f654091a4fc66c7de6b0dce37e2b8fb504c1. Ready / commissioned source-only; independent of DB01/08. [Exact algorithm and tests](EXECUTION.md). One child at a time. Own config.ts, database.ts, src/connection/**, test/config.test.ts, test/db06-*.test.ts. No manifest/root index/migration changes.

## T01 | Bounded FIFO and config
Read config.ts, database.ts, config.test.ts, EXECUTION.md config/controller sections. Implement optional managed config and admission controller with deadline/abort removal, active permit retained until actual settlement; deterministic queue tests. Root pnpm --filter @offscreen/db build && node --test packages/db/dist/test/config.test.js packages/db/dist/test/db06-admission.test.js.

## T02 | Checked-out lease and shutdown
Read database.ts, src/connection/admission.ts, existing database.integration.ts (read-only), EXECUTION.md. Implement generic managed-client seam, compose pool, bounded checkConnection response and memoized drain close; regression fake client tests. Root pnpm --filter @offscreen/db build && node --test packages/db/dist/test/config.test.js packages/db/dist/test/db06-admission.test.js packages/db/dist/test/db06-pool.test.js; typecheck. No live SQL. Send branch SHA and receipt to DB01 custodian. Do not self-start DB07.
