# Workstation observability implementation wave

Owner commission 2026-11-24, source-only. Canonical [measurement contract](../../../docs/technical/platform/workstation-observability.md); [operator runbook](../../../docs/runbooks/workstation-observability.md). Existing INF29 live verification showed capacity abort, no continuous attribution. No new live acceptance credit.

| Change | Dependency | State |
| --- | --- | --- |
| [INF44](../../changes/open/2026-11-24--inf44-persistent-workstation-monitoring/CHANGE.md) Persistent local workstation flight recorder | None; disjoint from INF29 runtime/lifecycle code | Ready |
| [INF45](../../changes/open/2026-11-24--inf45-nested-runtime-observability/CHANGE.md) Docker and Kubernetes attribution across WSL boundaries | INF44 schema/storage/collector extension landed; may implement pure runtime parser fixtures independently, integrate after INF44; no INF29 runtime code edits | Ready (dependency-gated) |
| [INF46](../../changes/open/2026-11-24--inf46-resource-operation-correlation/CHANGE.md) Persistent infrastructure operation and phase correlation | INF44 record contract; source implementation of event helper independent; edits to existing dev-startup-timing/lifecycle only after INF29 corrections integrated (no concurrent writer); INF45 not required | Ready (dependency-gated) |
| [INF47](../../changes/open/2026-11-24--inf47-historical-observability-queries/CHANGE.md) Historical incident reconstruction and acceptance | INF44/45/46 source contracts; live proof separately authorized after collectors installed | Ready (dependency-gated) |

INF44 first, no conflict with INF29. INF45 after schema/storage extension (can prepare isolated fixtures); INF46 helper after INF44, existing timing/lifecycle source edits wait for INF29 integration; INF47 joins all. Source-only no new live runtime; native host install and activation require explicit authorization, no WSL/Docker restart. No separate monitoring cluster. Host fast subsecond observed envelopes + native dbengine rollups, kernel peaks/events, bounded private process/runtime/event data. Native atop raw logging off by default due argv retention. Actual host visibility and vendor package support measured at operator proof. Existing INF38/40 priorities remain; no global queue selection change.
