# Capacity engineering | round 4

Proposed planning model, 2026-11-26. Source baseline main 73b3154025e94ad2f827cdb03eda4b389e19ac35. No live measurements or configuration changes. Narrow read of legacy profile values is requirements/capacity evidence, not adoption of legacy algorithms.

## Observed source configuration

| Parameter | Dev | Release |
| --- | --- | --- |
| max_connections | 100 | 20 |
| shared_buffers | 128MB | 64MB |
| work_mem | 4MB | 4MB |
| maintenance_work_mem | 32MB | 32MB |
| CPU requests/limits | 100m/500m | 100m/500m |
| Memory requests/limits | 384Mi/1Gi | 256Mi/768Mi |
| Requested storage per instance | 2Gi | 1Gi |

Sources infra/platform/postgres/chart/profiles/{development,release}.yaml. These are source values, not SHOW output. No inherited number is justified merely by existence. Release 20 cannot accommodate the configured app ceiling 16 plus Temporal and meaningful overhead. Do not infer current outage.

## Application demand

packages/db/src/config.ts default DB_POOL_MAX=5; database.ts creates one pg Pool per factory. apps/api/src/main.ts, apps/game-authority/src/bootstrap/main.ts and apps/worker/src/bootstrap/main.ts each construct one identified pool. API passes config to createApp; apps/api/src/app.ts creates story update hub, apps/api/src/modules/stories/story-update-hub.ts creates dedicated pg Client for LISTEN, serialized reconnection, normally one listener per process, not one per browser stream. Auth receives existing database. Control/executor config refuses broad SQL credentials (apps/worker/src/bootstrap/config.ts); web has no identified direct pool. Chart helper supplies DATABASE_URL to release migration job and API/authority/relay; dev DB_POOL_MAX bindings in those three roles. tools/dev-environments/src/rendering/dev-slot-app-graph.mjs binds DEV_SQL_POOL_MAX=2 from dev-sql-tenant-contract.mjs; runtime role limit 8, migration role limit 2. Release uses generic default 5 absent runtime override. These are identified source paths, not exhaustive transitive audit or live counts.

A(Pa+1)+G*Pg+R*Pr; one full dev slot 7, default release 16. Dev 1/4/8/10 active full slots: 7/28/56/70 normal configured ceilings. Parked slots do not imply open runtime sessions; verify shutdown. Migration role limit 2 per active migrating tenant is not normal demand (actual runner uses dedicated connection; verify simultaneous count). API-only profile target differs; don't assume implemented. Release scale example 2 API, 2 authority, 2 relay =32. Rollout overlap and lingering sessions must be counted independently. Dev runtime cap 8 protects one slot but may impede overlap: seven normal connections leave one, so do not assume surge rollout can reach full pools. Review lifecycle before changing role limit. Role limits are not reserved capacity.

## Temporal: missing explicit limits

Pinned chart temporal-1.8.0 templates/server-configmap.yaml and _helpers.tpl::temporal.persistence.filterConfig pass persistence configuration through, remove chart-specific keys; chart values maxConns/maxIdleConns examples commented. Our infra/platform/temporal/values.yaml and two profiles do not specify either setting. Exact server v1.32.2 common/persistence/sql/sqlplugin/postgresql/session/session.go sets MaxOpenConns and MaxIdleConns only for positive config. common/config/persistence.go validates SQL but does not populate pool limits in inspected path. Go database/sql default open ceiling unlimited, idle default currently 2. This is strong source evidence for absence of an explicit bound in this configuration; confirm effective rendered config and runtime metrics, not docker template defaults (different config path).

Main SQL factory common/persistence/sql/factory.go shares a ref-counted pool across its stores within a factory, not one per shard. Visibility factory is separate. All four service fx files frontend/history/matching/worker provide visibility manager, and common persistence modules create main-store factories. Exact instantiation multiplicity including CHASM, startup and reconnect not exhaustively proven. For planning use four main + four visibility pools as a working scenario, NOT a certified upper bound. Inspect driver/session and complete FX graph or measure actual pools before finalizing. UI/admin tools ordinarily RPC clients; schema hooks and SQL tooling separate. User count and history shard count do not directly multiply pools. Rolling overlap and reconnect may add pools.

Sources: https://github.com/temporalio/helm-charts/tree/temporal-1.8.0/charts/temporal ; https://github.com/temporalio/temporal/blob/v1.32.2/common/persistence/sql/sqlplugin/postgresql/session/session.go ; https://github.com/temporalio/temporal/blob/v1.32.2/common/persistence/sql/factory.go ; https://github.com/temporalio/temporal/blob/v1.32.2/common/persistence/visibility/factory.go ; https://github.com/temporalio/temporal/tree/v1.32.2/service ; https://pkg.go.dev/database/sql#DB.SetMaxOpenConns ; https://docs.temporal.io/references/service-configuration .

## Provisional capacity scenarios (not selected settings)

Assume one main and one visibility pool per service, four services, candidate main max 8 and visibility max 4 -> 48 Temporal open connections. These are experimental knobs, not performance recommendations. 4+2 ->24; 12+6 ->72. Evaluate lower bounds under representative workflows and visibility queries, acquisition wait, latency, persistence errors and recovery. Explicit positive idle limit <= open limit; don't use zero assuming it disables idle in this plugin. Avoid copying docker sample 20 into both stores. All clients direct RW initially; transaction pooler is incompatible with LISTEN and session advisory migration locks unless deliberately routed separately.

| Scenario | App normal ceiling | Temporal illustrative ceiling | Combined before overhead |
| --- | ---: | ---: | ---: |
| Dev one | 7 | 48 | 55 |
| Dev four | 28 | 48 | 76 |
| Dev eight | 56 | 48 | 104 |
| Dev ten | 70 | 48 | 118 |
| Release default | 16 | 48 | 64 |
| Release doubled SQL workloads | 32 | 48 | 80 |

C ordinary = app + Temporal + simultaneous migration + ordinary admin/monitor + deployment overlap/reconnect + explicit headroom. max_connections >= C ordinary + reserved_connections + superuser_reserved_connections. PostgreSQL replication has separately configured max_wal_senders; account sender resource costs and admission behavior rather than blindly double-counting as ordinary client slots. Use actual SHOW settings. No claim that 100 is sufficient for four dev slots at peak; 118 before overhead for ten exceeds it. No claim all pools saturate simultaneously. Candidate target must state supported simultaneous workload and overlap, not merely all registered tenants. Independent clusters have independent connection ceilings and separate memory costs; replicas do not increase primary write slots. Need role-specific attribution via application_name where feasible, no sensitive query text.

## Memory, CPU and storage

PostgreSQL 18 docs https://www.postgresql.org/docs/18/runtime-config-resource.html and https://www.postgresql.org/docs/18/runtime-config-connection.html ; CNPG 1.30 https://cloudnative-pg.io/docs/1.30/resource_management/ and https://cloudnative-pg.io/docs/1.30/postgresql_conf/ . shared_buffers allocated shared; work_mem is per sort/hash operation, hash_mem_multiplier and parallel workers can amplify, not a fixed per-connection allocation. Backend private memory, maintenance/autovacuum workers, WAL, shared structures, cache and operator/instance manager count in cgroup usage. Model memory as shared + private sessions + concurrent query operations + maintenance + other overhead/cache, not max_connections * work_mem alone. Do not sum backend RSS (shared pages repeated). Measure cgroup current/peak/events and PSS where feasible. CNPG recommends Guaranteed QoS (equal CPU/memory requests/limits) but local tradeoff CPU throttling vs host contention needs evidence. Existing 500m CPU ceiling may be unnecessary bottleneck; do not select replacement yet. Storage request is not proof of disk quota for local-path; measure actual filesystem capacity, WAL and retained data. Preserve live PVC identity, no shrink. Separate replica costs per instance and host headroom. Existing host 4GiB headroom rule remains until evidence/owner decision; WSL/Docker boundaries differ, no current measured capacity. Source-only workstation monitoring contract docs/technical/platform/workstation-observability.md provides existing evidence path, no new collector needed by default.

## Proposed measurement gate

When owner is at terminal, read-only explicitly fenced context and primary selection first; collect both clusters' Cluster specs/status, resource limits, effective pg_settings (max_connections, reserved_connections, superuser_reserved_connections, max_wal_senders, shared_buffers, work_mem, hash_mem_multiplier, maintenance_work_mem, autovacuum_work_mem, autovacuum_max_workers, max_parallel_workers_per_gather, max_worker_processes), grouped pg_stat_activity by database/role/backend_type/state (no query text), actual pool metrics and effective Temporal config fields only (never print entire config or Secrets), node allocatable, cgroup usage/peak/events and disk usage. Compare idle platform, one full stack, representative workflow/visibility activity, four stacks if authorized, then controlled rollout/restart and migration overlap. No paid LLM calls required; disposable deterministic workflow fixture. Repeat sampling over workload interval, not one snapshot. Stop on pressure, saturation, unexpected data/identity or unavailable measurement; don't silently increase WSL cap. Exact commands later with actual paths and owner permission. This is proposed evidence sequence, not executed.

## Decision

Reject arbitrary release 20 and implicit unbounded Temporal pools as target. Select explicit finite consumer pool budgets and workload-derived server capacity, preserving direct session semantics. Provisional trial 8/4 per Temporal pool is a hypothesis only, neither selected config nor required minimum; exact pool multiplicity and performance remain gated. No new memory, CPU, storage or server connection numbers frozen. Cross-component Temporal values adjustment likely needed; treat it as explicit reviewed dependency, not accidental PostgreSQL scope creep. Next round: tenant lifecycle and ACL policy, preserving identities and role semantics. Capacity model can be refined in parallel with specimens and owner experiments.
