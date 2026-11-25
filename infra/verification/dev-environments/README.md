# Dev tenant verification trials

Live, operator-authorized scripts that exercise scoped SQL and S3 tenants against a running `kind-offscreen-dev` stack. These scripts are **not** imported by ordinary `pnpm dev` startup.

## What ordinary startup does *not* prove

`tools/dev-environments/src/adapters/dev-s3-tenant.mjs::ensureDevS3Tenant` checks that the shared object-store binding is present, lists the slot bucket and IAM identity, and reads the slot Kubernetes Secret. It may create a missing bucket or provision a missing scoped identity and store credentials. It does **not** perform authenticated cross-tenant S3 requests on every launch. A successful ensure therefore reports `accessEvidence: 'not-exercised'` when the live adapter defers scope proof.

Injected fakes may still supply explicit access-check results; those remain enforced.

## Optional later proof for S3 write scope

When a disposable dev object store is already running and you explicitly want signed HTTP evidence that each slot can write only its own bucket, run:

```bash
node infra/verification/dev-environments/dev-s3-tenant-trial.mjs
```

That trial provisions or reuses `dev-1` and `dev-2`, port-forwards the S3 gateway, and records cross-tenant PUT/GET/DELETE matrix results. It is optional acceptance evidence, not a prerequisite for source-only work or cold slot reconciliation.

Related trials in this directory: `dev-sql-tenant-trial.mjs`, `dev-sql-tenant-migrate-trial.mjs`.

The fixed-slot Temporal trial was retired with the native Helm replacement. Source namespace tests are now in `infra/platform/temporal/tests/`; a separate uniquely owned live workflow fixture remains NOT RUN.