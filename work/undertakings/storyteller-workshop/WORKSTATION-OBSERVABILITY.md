# Workstation observability implementation wave

**Current checkpoint:** INF44–46 archived source-only; [INF49](../../changes/archive/2026-11/platform-operations/2026-11-24--inf49-monitor-composition/CHANGE.md) composition source Done (staged install+entrypoint). [INF47](../../changes/open/2026-11-24--inf47-historical-observability-queries/CHANGE.md) Ready on emitted schema. Actual host activation separately authorized. Main target; historical wave table not current dispatch status.

Owner commission 2026-11-24, source-only. Canonical [measurement contract](../../../docs/technical/platform/workstation-observability.md); [operator runbook](../../../docs/runbooks/workstation-observability.md). Existing INF29 live verification showed capacity abort, no continuous attribution. No new live acceptance credit.

| Change | Dependency | State |
| --- | --- | --- |
| [INF44](../../changes/archive/2026-11/platform-operations/2026-11-24--inf44-persistent-workstation-monitoring/CHANGE.md) Persistent local workstation flight recorder | None; disjoint from INF29 runtime/lifecycle code | Done (source fixtures; live install NOT RUN) |
| [INF45](../../changes/archive/2026-11/platform-operations/2026-11-24--inf45-nested-runtime-observability/CHANGE.md) Docker and Kubernetes attribution across WSL boundaries | INF44 schema/storage/collector extension landed | Done (source fixtures; live nested visibility NOT RUN) |
| [INF46](../../changes/archive/2026-11/platform-operations/2026-11-24--inf46-resource-operation-correlation/CHANGE.md) Persistent infrastructure operation and phase correlation | INF44 record contract landed | Done (source fixtures; live correlation NOT RUN) |
| [INF49](../../changes/archive/2026-11/platform-operations/2026-11-24--inf49-monitor-composition/CHANGE.md) Runnable workstation monitoring composition | INF44–46 source modules | Done (source staged composition; live install NOT RUN) |
| [INF47](../../changes/open/2026-11-24--inf47-historical-observability-queries/CHANGE.md) Historical incident reconstruction and acceptance | INF49 staged source proof; live proof separately authorized after collectors installed | Ready (INF49 schema gate cleared) |

INF44, INF45, and INF46 source fixtures are Done. INF47 joins all. Source-only no new live runtime; native host install and activation require explicit authorization, no WSL/Docker restart. No separate monitoring cluster. Host fast subsecond observed envelopes + native dbengine rollups, kernel peaks/events, bounded private process/runtime/event data. Native atop raw logging off by default due argv retention. Actual host visibility and vendor package support measured at operator proof. Existing INF38/40 priorities remain; no global queue selection change.
