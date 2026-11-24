# Local developer platform | next implementation sequence

Baseline 91bc2af40a94cdf9a95ee7db31a846d60f3abd0c. INF36 Done; INF29 is final current-flow reconciliation, not a new broad security audit. Owner selected developer usability direction. [Target](../../../docs/technical/platform/local-developer-platform.md) · [Catalog](../../../infra/verification/CAPABILITIES.md) · [Quick reference](../../../docs/runbooks/local-development-platform.md).

The following are candidate implementation slices, not commissioned executable packets. Planner must re-read current source, freeze algorithms and tests, reconcile DXK10-B instead of parallel lifecycle authority, and release each when ready.

| Slice | Outcome | Main owner / dependency |
| --- | --- | --- |
| INF29 | Current-flow source reconciliation and exact one-slot live smoke plan | existing lifecycle; live authorization separate |
| INF37 | Cluster/platform selection and convenient plan/up/status | platform-plan, kind manager; optional release services can first be selected, dev optional service profiles follow |
| INF38 | DXK10-B selective dev profiles, dependency-scoped provisioning and readiness | existing lifecycle + Tilt + chart; stop/start profile change; dependency on selected platform contracts |
| INF39 | Standard Helm values overlays, per-role replicas and measured small/default presets | workloads/render and service render; avoid bespoke schema; selected role values contract shared with INF38 |
| INF40 | Partial release profile and multi-replica flow | existing stack plan/install and INF39; apply exact role selection and current image/migration proof |
| INF41 | Data connection choices and host portability | isolated staging and local snapshot first; production diagnostic only; native macOS separate measured support, no implicit remote migration |
| INF42 | Repeatable verification entrypoint over permanent scenario IDs | reuse existing tests and proof scripts; source suite then authorized live cases; grows alongside earlier slices |

No live work authorized. First prove current full-slot workflow, fix blockers rather than enlarge framework. INF37–42 naming is a proposed planning sequence, not a global work selector or dispatch instruction. No new acceptance credit. Overall undertaking ~40%, architecture ~70%, Storyteller ~40%, distributed ~25% (subjective ±20 pp), unchanged.
