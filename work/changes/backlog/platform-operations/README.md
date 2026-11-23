# platform operations | proposed Changes

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

**Promoted:** [DXK09 isolated parallel development stacks](../../open/2026-11-22--dxk09-isolated-parallel-development-stacks/CHANGE.md) now lives in open as a planner-held next-days Change. Do not treat the stale old packet link as executable.

## Deferred earlier Changes (also in this category)

- [2026-11-19--turn04-opt-in-real-provider-confirmation](../../backlog/platform-operations/2026-11-19--turn04-opt-in-real-provider-confirmation/CHANGE.md): previous open packet, not selected; needs source/readiness reconciliation before promotion
- [2026-11-15--obs04-finite-action-transition-evidence](../../backlog/platform-operations/2026-11-15--obs04-finite-action-transition-evidence/CHANGE.md): previous open packet, not selected; needs source/readiness reconciliation before promotion

## Deferred INF architecture redesign (planned 2026-11-23)

[Program, evidence, target ownership and dependency plan](INFRA-RESTRUCTURE-PLAN.md). Source snapshot `314f1ef1`; **all five Proposed and not executable**. Preserve DXK09 and HR-wave priority.

- [INF01](2026-11-23--inf01-infra-ownership-map/CHANGE.md): Infrastructure ownership and operational entrypoint atlas
- [INF02](2026-11-23--inf02-dev-environment-manager-boundary/CHANGE.md): One-way dev environment manager boundary
- [INF03](2026-11-23--inf03-application-workload-layout/CHANGE.md): Workload definitions and environment overlay ownership
- [INF04](2026-11-23--inf04-image-and-tilt-ownership/CHANGE.md): Image build and live-update ownership cleanup
- [INF05](2026-11-23--inf05-platform-and-verification-separation/CHANGE.md): Shared platform services and verification tooling separation

## Demand-driven development lifecycle (proposed 2026-11-23)

- [DXK10](2026-11-23--dxk10-demand-driven-dev-lifecycle/CHANGE.md): separate Change/worktree, environment reservation/attachment, tenant provisioning, workload-profile activation, parking and safe release. Planner-held pending live DXK09 reconciliation; no concurrent lifecycle-code implementation while DXK09 is active. Not an automatic HR01–HR03 blocker.
