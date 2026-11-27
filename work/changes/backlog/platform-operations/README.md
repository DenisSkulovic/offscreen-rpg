# platform operations | proposed Changes

[INF48 storage lifecycle](2026-11-24--inf48-storage-lifecycle/CHANGE.md) — Proposed; no automatic deletion authorization.

[Backlog index](../README.md) · [Open Changes](../../README.md)

| Change | Proposed outcome |
| --- | --- |
| [DATAOPS01](2026-11-22--dataops01-cross-store-backup-restore-and-retention/CHANGE.md) | cross store backup restore and retention |
| [DBOPS01](2026-11-22--dbops01-safe-schema-migrations-and-release-compatibility/CHANGE.md) | safe schema migrations and release compatibility |
| [DBOPS02](2026-11-22--dbops02-postgres-operational-health-and-performance/CHANGE.md) | postgres operational health and performance |
| [LOAD01](2026-11-22--load01-scripted-multiuser-load-and-autoscaling/CHANGE.md) | scripted multiuser load and autoscaling |
| [SCALE01](2026-11-22--scale01-replicated-application-runtime/CHANGE.md) | replicated application runtime |
| [SCALE02](2026-11-22--scale02-stateful-data-and-workflow-ha/CHANGE.md) | stateful data and workflow ha |
| [SIM01](2026-11-22--sim01-realistic-zero-cost-provider-simulator/CHANGE.md) | realistic zero cost provider simulator |
| [SQL01](2026-11-22--sql01-transaction-and-lease-source-audit/CHANGE.md) | transaction and lease source audit |

These are future work, not today's execution queue. Reconcile source/owner/acceptance before moving any proposal to `open/`.

DXK09 superseded; remaining acceptance is in the permanent capability catalog.

## Deferred earlier Changes (also in this category)

- [2026-11-19--turn04-opt-in-real-provider-confirmation](../../backlog/platform-operations/2026-11-19--turn04-opt-in-real-provider-confirmation/CHANGE.md): previous open packet, not selected; needs source/readiness reconciliation before promotion
- [2026-11-15--obs04-finite-action-transition-evidence](../../backlog/platform-operations/2026-11-15--obs04-finite-action-transition-evidence/CHANGE.md): previous open packet, not selected; needs source/readiness reconciliation before promotion

## Deferred INF architecture redesign (planned 2026-11-23)



## Demand-driven development lifecycle (staged 2026-11-23)



- LIB05 generic object-storage boundary is Done in [archive](../../archive/2026-11/platform-operations/2026-11-23--lib05-generic-object-storage-boundary/CHANGE.md).

INF01–INF05 promoted to [open Changes](../../open/README.md); [selected execution plan](../../../undertakings/storyteller-workshop/INF-PARALLEL.md).

- [INF38 selective application profiles](2026-11-24--inf38-selective-dev-profiles/CHANGE.md): deferred, selected design retained; no current commission. Refresh when selective activation is needed.

- [VER04 database transaction, migration and recovery programme](2026-11-25--ver04-db-transaction-migration-recovery-programme/CHANGE.md): deferred; owns transferred DB10 proof, no current commission. Refresh current DB/runtime and resource contracts when selected for dedicated reliability verification.

- [VER05 replicated PostgreSQL topology verification](2026-11-25--ver05-db-replicated-topology-programme/CHANGE.md): deferred; VER04 source prerequisite and native PostgreSQL provisioning refresh required before owner-selected promotion. No current commission.

- [VER07 cache mechanism, load and fault acceptance](2026-11-25--ver07-cache-mechanism-programme/CHANGE.md): deferred; all runtime acceptance oracles preserved, no current commission. Refresh cache APIs and resource contracts before owner-selected promotion.

- [VER08 SQL-origin cache and Story snapshot acceptance](2026-11-25--ver08-cache-sql-origin-programme/CHANGE.md): deferred; all security/correctness proof retained, no current commission. VER07 source prerequisite and current consumer/resource refresh required before owner-selected promotion.

- [K8S10 distributed fault and load harness](2026-11-19--k8s10-distributed-fault-and-load-harness/CHANGE.md): deferred; existing implementation and receipts retained; fresh TURN03 PASS, current release ownership and owner-selected refreshed plan required. No commission or live mutation permission.

## Developer observability recovery (proposed)

- [OBS-D02 Frozen target identity](2026-11-27--obs-d02-target-identity/CHANGE.md): prepared candidate; planner gates and independent readiness pending.
- [OBS-D03 Bounded operation custody](2026-11-27--obs-d03-operation-custody/CHANGE.md): prepared candidate; planner gates and independent readiness pending.
- [OBS-D04 Developer topology and exact classifier](2026-11-27--obs-d04-collector-topology/CHANGE.md): prepared candidate; planner gates and independent readiness pending.
