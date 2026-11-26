# Fresh-clone workstation bootstrap

Start here for local Kubernetes development on Windows + WSL2 (Ubuntu 24.04 x86-64). Native Linux and macOS host setup are NOT IMPLEMENTED. Source-only work does not require clusters.

Run from the clone root, one operation at a time. Stop on nonzero exit; do not delete or manually repair a partially installed platform without reviewing its actual state.

## Host and dependencies

1. Read [host prerequisites](../../infra/host/README.md).
2. Run `bash infra/host/check.sh`. If blocked, follow the WSL preparation recipe and repeat; `bash infra/host/setup.sh --install-system-packages` is an explicit privileged operation.
3. Run `pnpm install --frozen-lockfile` when dependencies are missing or changed.

## Cluster foundations

```bash
node infra/environments/infra-cli.mjs up --env dev --services none --human
node infra/environments/infra-cli.mjs up --env release --services none --human
```

Each operation creates an absent owned cluster or verifies an existing one. No service selection means no application backing services. Both paths verify identity and Ready nodes; release also checks its storage provisioner. These checks do not prove application connectivity or complete DNS/storage behavior.

## Core platform

Initial PostgreSQL creation requires explicit owner maintenance quiescence. Stop topology, tenant, Temporal and concurrent provisioning writers before authorizing either command. The local baseline lock alone does not coordinate all writers. Do not persist this authorization or use it to repair partial installation. See [PostgreSQL entrypoints and safety contract](../../infra/platform/postgres/README.md).

```bash
OFFSCREEN_POSTGRES_MAINTENANCE=authorized node infra/environments/infra-cli.mjs up --env dev --services postgres --json
OFFSCREEN_POSTGRES_MAINTENANCE=authorized node infra/environments/infra-cli.mjs up --env release --services postgres --json
```

Only after both baseline ensures succeed, proceed with ordinary core ensure (which re-observes compatible PostgreSQL without granting maintenance authorization):

```bash
node infra/environments/infra-cli.mjs up --env dev --services core --human
node infra/environments/infra-cli.mjs up --env release --services core --human
node infra/environments/infra-cli.mjs status --env dev --services core --human
node infra/environments/infra-cli.mjs status --env release --services core --human
```

Core is PostgreSQL, object storage and Temporal, plus Gateway on release. Optional services have separate selection and proof requirements. See [operator quick reference](local-development-platform.md). The plan operation previews service selection, not observed cluster creation decisions. Direct Node entrypoints avoid package-manager script dispatch side effects; existing pnpm aliases remain available.

## Verification and application

Run `pnpm infra:verify --suite diagnostic` and relevant service-specific proofs from [verification catalog](../../infra/verification/CAPABILITIES.md). Diagnostic coverage can include optional absent services; distinguish these from a failed selected service. Source and readiness checks are not protocol or workload acceptance.

Follow [owned development environment](dev-worktree-stacks.md) for local configuration and `pnpm dev`, `pnpm dev:status`, `pnpm dev:stop`. Do not copy release credentials to development or authorize paid model calls through setup. Release application build/deploy is a separate optional path in [local development](local-development.md).

Initial integrated cold acceptance is pending. Record exact tested SHA and failures; fix the source, not only the running cluster.
