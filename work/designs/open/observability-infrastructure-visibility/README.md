# Observability E2 | Infrastructure visibility

**Standing:** Open evolutionary design, proposed for owner review; not an implementation commission. **Owner:** repository owner, supported by designer. **Baseline:** `main` `f686b80d273a8f784d8121c50ac3d9017f35cdfa`, clean frozen export 2026-11-28. **Next review:** next owner design session (2026-11-28 target). **Next decision:** accept the bounded E2 target and resolve the narrow endpoint/pin/permission feasibility gates in [TARGET.md](TARGET.md) before releasing affected Changes. No live mutation or paid work authorized. Concurrent CLI changes are not in the baseline.

## Outcome

Open Grafana after normal dev observability installation or an explicit upgrade and immediately see the actual Kubernetes cluster, namespaces, every Pod (including pending, failed and completed objects), running containers, workload health, resource usage, and the health of every installed platform subsystem. Drill from overview into a node, namespace, workload or component without an agent. See absent, parked, unsupported, stale and broken telemetry rather than silently confusing them with zero load or healthy state.

Preserve the existing five native Helm releases and their data, pinned images, privacy boundaries, scope, custody and standard developer operations. Use Prometheus for scraping, native Kubernetes and vendor metrics, Grafana provisioned dashboards, and the existing OTel/Loki/Tempo lanes unchanged. Do not create a second monitoring stack, Prometheus Operator, custom metrics database, or web UI. This is production-style visibility on a local trusted Kind cluster, not a claim of production security, availability or capacity.

## Evidence at kickoff

Owner supplied live terminal observations on 2026-11-28 (not independently reproduced, no run SHA attached):

- `kind-offscreen-dev`: both nodes Ready (Kubernetes v1.37.0); 32 Pod objects listed: 31 Running and one Completed synthetic probe. Includes kube-system, cert-manager, CNPG and RabbitMQ operators, local-path storage, PostgreSQL, SeaweedFS, Redis, RabbitMQ, six Temporal pods and all five observability components. No active application slot shown. Restarts after the recent node recovery are visible in `kubectl` but not yet in Grafana.
- Eight Helm releases deployed: object-store, obs-collector (revision 2), obs-grafana, obs-loki, obs-prometheus, obs-tempo, redis, temporal (the other seven at revision 1). No release-cluster live evidence in this observation.
- `pnpm obs:connect --queries` reports loopback ports Grafana 13000, Prometheus 19090, Loki 13100, Tempo 13200 and developer OTLP 14317/14318. Prometheus query `count by (job) (up)` returns exactly one `collector` and one `prometheus` series. This counts discovered targets, not successful scrapes; it does not establish that every target has `up=1`.
- Source `infra/platform/observability/values/prometheus.yaml` explicitly disables Kubernetes discovery, kube-state-metrics and node-exporter; Grafana values provision three datasources but no operational dashboards. Missing coverage is an intentional predecessor limit, not evidence of a malfunction.

## Evolution boundaries

| Evolution | Outcome | Standing |
| --- | --- | --- |
| E1 | Local five-release stack and restricted synthetic/developer telemetry | Owner-accepted foundation; comprehensive native qualification remains outstanding |
| E2 | Kubernetes inventory/resource metrics, platform service metrics, provisioned operational dashboards | Current proposal |
| E3 | Scoped centralized operational logs with workload identity, safe content policy and correlation | Later candidate; no raw stdout capture in E2 |
| E4 | Application and Agent Core instrumentation, HTTP/SQL/Temporal causality, provider-free trace specimen | Later candidate; coordinate with durable execution design, instrument new foundations first |
| E5 | Local operational alerts, meaningful thresholds, SLOs, failure/capacity exercises | Later candidate; no alert delivery commitment in E2 |

Every workload should be visible in inventory; not every container has a meaningful domain metric or trace. Trace coverage requires actual instrumented operations and is not created by installing a dashboard. No arbitrary content/credentials or full application log enrollment. Host/WSL monitoring remains the separate workstation observability owner.

## Reading route and ownership

- [Target and architecture](TARGET.md): collection, permissions, coverage, dashboard contracts and remaining decisions.
- [Integration and acceptance](INTEGRATION.md): source anchors, occupied upgrade, ownership, execution ordering and evidence.
- Existing canonical owners: [native infrastructure](../../../../docs/technical/platform/observability-native-infrastructure.md), [telemetry and diagnostics](../../../../docs/technical/observability/telemetry-and-diagnostics.md), [operator experience](../../../../docs/technical/platform/infrastructure-operator-experience.md), [observability runbook](../../../../docs/runbooks/kubernetes-observability.md).
- Predecessor: [E1 owner acceptance](../../archive/observability-developer/OWNER-ACCEPTANCE.md) and [A/V matrix](../../archive/observability-developer/ACCEPTANCE.md). Preserve historical findings and NOT RUN evidence. E2 does not retroactively certify E1.

## Delivery

Evolutionary subsystem development under AGENTS.md, not a replacement architecture. Resolve the few consequential feasibility gates through focused source/native evidence and review only changed permissions and occupied transition. Then promote accepted meaning to the existing canonical owners and prepare the full bounded Change batch together; do not spawn a dossier for each exporter or dashboard. Existing shared catalogs/CLI are deliberately untouched in this design-only handoff; reconcile the design catalog at integration, avoiding the concurrent CLI commission. No Changes, code or runtime actions in this artifact.
