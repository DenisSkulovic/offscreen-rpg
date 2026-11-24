# DBOPS02 | PostgreSQL routine operations, capacity and query health

**State: PROPOSED / NOT CURSOR-READY.** Separate from [SQL01 domain transaction audit](../2026-11-22--sql01-transaction-and-lease-source-audit/CHANGE.md), [DBOPS01 migration safety](../2026-11-22--dbops01-safe-schema-migrations-and-release-compatibility/CHANGE.md) and [SCALE02 database HA](../2026-11-22--scale02-stateful-data-and-workflow-ha/CHANGE.md).

**Coordination:** [DB redesign](../../../../undertakings/storyteller-workshop/DB-PARALLEL.md) owns bounded pool/transaction runtime and application telemetry (DB06/07/09). DBOPS02 retains PostgreSQL operational measurements, capacity, slow plans, maintenance and operator runbook; consume those primitives, do not rebuild them.

## Outcome
Create a human-readable operational profile for running a growing PostgreSQL service with valuable story, account and finance data. Know what normal looks like, when it is becoming unhealthy, and how to intervene **without corrupting financial or canonical data**.

Cover: pool sizing across N API/GA/Worker replicas, connection exhaustion and optional connection pooler; slow statements and `EXPLAIN (ANALYZE, BUFFERS)` on **safe disposable data**, query/index selection, planner statistics, transactions open too long, deadlocks, row/advisory-lock waits, outbox/lease table bloat, PostgreSQL VACUUM/autovacuum and transaction-ID wraparound risk, WAL growth/checkpoints, disk/PVC capacity, replication lag, IOPS/CPU/RAM, table/index size, hot spot growth, partition/retention trade-offs, update/delete churn and statistics visibility. Build minimum safe redacted dashboards/queries and a concise operator runbook with thresholds based on measurements rather than arbitrary constants. Note invasive procedures (REINDEX CONCURRENTLY, VACUUM FULL, CLUSTER, table rewrite) are **not** routine button presses.

## Proof
In a disposable realistic dataset with distinct owners/stories, demonstrate baseline metrics, a deliberately slow/locking query, detection and safe diagnosis, connection pool saturation and queue/lease backlog under SIM01/LOAD01 load, plus recovery without hidden data loss. Report per-role DB pool budget and query-plan evidence at representative table sizes. Use only necessary indexes supported by measured plans; no speculative 40-index schema patch. Ownership/permissions for `pg_stat_statements`, statistics and admin-only views must be explicit; redact customer SQL values.

## Scope/gate
Read current `packages/db/src/database.ts` pool settings, outbox/Story Engine query owners, Postgres/Kubernetes manifests and actual observability telemetry. Source audit then decide which operational scripts/metrics are missing. Don't move SQL into repositories, install an arbitrary monitoring stack, or claim production capacity from 100 local users. No protected DB maintenance, paid model or cluster change authorized.
