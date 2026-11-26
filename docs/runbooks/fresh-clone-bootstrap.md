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

Fresh baseline renders now declare CNPG postInitSQL and postInitApplicationSQL to revoke PUBLIC CONNECT and TEMPORARY on postgres and the profile application database (dev or lab). Fresh execution of these hooks was verified on both profiles at 093161ae. Existing exact historical specifications remain observable without patching their initialization history; no privilege migration is performed by ordinary ensure. Before Temporal installation, its existing SQL isolation gate remains authoritative: no unrelated connection-enabled non-template database may grant PUBLIC CONNECT. Stop if that gate fails; occupied database maintenance requires separate authorization. See [Temporal maintenance guidance](kubernetes-temporal.md).

Only after both baseline ensures and the isolation prerequisite succeed, proceed with ordinary core ensure (which re-observes compatible PostgreSQL without granting maintenance authorization):

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

## Acceptance checkpoint (26 November 2026)

- Core: dev 3/3 and release 4/4 READY; combined reuse 12.315 s and 12.732 s respectively. Explicit PostgreSQL ACL maintenance was required. Dev object storage and Temporal are repaired specimens, not uninterrupted fresh acceptance. The object-storage pending receipt was manually reconciled and archived after identity review; the incomplete Temporal role/Secret were explicitly removed before successful provisioning.
- Redis: fresh install and repeated ensure passed on both profiles.
- RabbitMQ dev: at `7d69be0a`, live ordinary smoke completed in 2.837 s, with SMOKE-PUBLISHED, SMOKE-EMPTY, MGMT-OK, METRICS-OK and a separate same-run wrong-password Pod log AUTH-REFUSED 403. At `7f8296bc`, 44 focused Node tests passed and structural observation returned ready; repeat ensure reported mutation none in 1.717 s. At `7d69be0a`, 14 Python tests passed. Original installation timed out on a defective inventory observer; corrected uninterrupted fresh acceptance remains unproven.
- RabbitMQ smoke custody: at `f5615710`, 30 supervisor tests passed, all four required baseline UIDs were captured, live positive and mandatory negative proof plus UID-conditioned cleanup completed in 4.234 s. Historical fixture count remained 17. Owner dry-run demonstrated wrong UID Conflict and correct UID acceptance without deletion. Owner subsequently removed all 17 historical fixtures using UID-preconditioned deletion and verified absence; local receipts retained. Disruptive modes remain blocked from live CLI; their simulated tests are not runtime evidence. Fresh release RabbitMQ remains separately gated.
- PostgreSQL ACL policy: at `8338fa87`, 103 source tests passed, historical dev/release reuse passed in 9.325 s and 7.463 s, and all eight observed non-template database ACLs were owner-only. Fresh initialization subsequently passed at 093161ae.
- Uninterrupted cold selected-platform provisioning PASS at `093161ae04c13f0a5416e4f5dbf1fd75ac031511`: CLI tests 36/36; dev and release foundations created in 28.788s and 36.338s wall time; PostgreSQL installed in 78.377s and 76.374s. Both profiles had owner-only ACLs on postgres and dev/lab before Temporal, with zero PUBLIC CONNECT or TEMPORARY violations. Dev core 103.215s, release core 282.425s, dev Redis/RabbitMQ 135.832s, release Redis 12.958s. Exact selected status assertions passed 5/5 per profile. No intervention or source change during this successful sequence. Prior failed cold attempt exposed node convergence race, corrected before the successful reset/retry. Host dependencies and cached images retained; independent observability experiment preserved. Total elapsed of two batches 12m49s, excluding time between batches. Host memory 8.5GiB used, 11GiB available; Docker volumes 13.13GB including unrelated experiment.
- Outstanding: repeat ensure and protocol verification against fresh specimens, owned application startup/park, fresh-agent runbook experiment, unprepared-host/fresh-clone proof and remaining diagnostic hardening. Existing object-storage proof CLI live path is not wired; do not claim protocol proof from it. Legacy observability and release RabbitMQ excluded. No hosted deployment proof.

Record exact tested SHA and failures; fix the source, not only the running cluster.
