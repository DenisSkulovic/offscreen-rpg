# Temporal replacement (isolated source implementation)

This folder is deliberately disconnected from the existing infrastructure CLI. It is not a second permanent platform. It becomes canonical only after isolated live proof and an authorized cutover.

## Implemented

- One compact server, ordinary Kubernetes resources, no custom Helm chart.
- Explicit local dev/release profiles using separate -next namespaces and temporal_next databases on CNPG's writable Service.
- Pinned server/admin images and exact vendor schema versions (execution 1.19, visibility 1.14; Temporal v1.32.2 schema/postgresql/v12/version.go).
- Nonmutating manifest plan and deployment status; explicit ensure requiring pre-existing owned namespace and compatible schemas.
- Bounded SQL inspection Jobs and vendor initialization Job builders (initialization is NOT exposed as a command yet).
- Source tests.

Run from repository root:

```sh
node --test infra/platform/temporal-next/tests/compact.test.mjs
node infra/platform/temporal-next/cli.mjs dev plan
```

Do not run ensure against an unprepared environment. The namespace and credentials must be provisioned by the PostgreSQL/platform owner. No Secret values are generated or read by this code. Local credentials must use the ASCII alphabet accepted by the startup script. Plain SQL and unauthenticated Temporal are local-only; no hosted use.

## Outstanding before activation

PostgreSQL-owned database/role provisioning, authenticated schema-operation exclusion and explicit initialization command, confirmation of actual image startup and gRPC health behavior, namespace administration, metrics integration, pinned upstream distributed topology, live restart/failover proof, consumer migration and existing-history migration. Current status does not assert persistence or end-to-end workflow health. Exact version detection alone does not establish complete schema integrity. Existing legacy code/data remain untouched.

No automatic migration, deletion, schema upgrade or adoption. No live acceptance claimed.
