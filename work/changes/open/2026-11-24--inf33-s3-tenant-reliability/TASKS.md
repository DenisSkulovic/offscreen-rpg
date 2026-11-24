# INF33 route

- T01 Read/create without accidental credential replacement — tools/dev-environments/src/adapters/dev-s3-tenant-live-adapter.mjs::secret/storeSecret/bucket/user; tools/dev-environments/src/adapters/dev-s3-tenant.mjs::ensureDevS3Tenant; tools/dev-environments/test/dev-s3-tenant-live-adapter.test.mjs. Exact edits and negative proof in EXECUTION.md section T01.
- T02 Honest lightweight readiness — tools/dev-environments/src/adapters/dev-s3-tenant.mjs::ensureDevS3Tenant; tools/dev-environments/src/adapters/dev-s3-tenant-live-adapter.mjs::access; tools/dev-environments/test/dev-s3-tenant.test.mjs; infra/verification/dev-environments. Exact edits and negative proof in EXECUTION.md section T02.

Sequential tasks; dependency INF28 Done.
