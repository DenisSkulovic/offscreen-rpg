# Observability E2 | Infrastructure visibility

**Standing:** Open E2 Design; architecture DEFENDED by [pass 02](committee/pass-02.md) at `main` `0e731739c8a97e6e83896612acec40f89a26516f`. H01 closed; zero open Critical/High findings; four retained nonblocking Medium findings. **Owner decision (2026-11-28):** finalize the defended Design and proceed toward Change preparation; accept the selected E2-I/R/S architectural direction, subject to applicable native evidence gates. No reduced artifact scope selected, implementation commission, live mutation or paid work authorized. **Owner:** repository owner, supported by designer/planner. **Investigation baseline:** `main` `c3900da1e15bba456c71dcb799698fe2a0f7db5f`, clean frozen export 2026-11-28 (includes CLI01). **Previous review:** [pass 01](committee/pass-01.md), REVISE AND RE-DEFEND at `7451b840978b7cf11926ff4d7252d193b43459c8`. **Next decision/review:** close G1-G4 in [EVIDENCE.md](EVIDENCE.md), freeze the selected artifact inputs and review the prepared complete Change batch for readiness at the next planning session (2026-11-28 target). G5 remains construction/qualification. No third architecture committee unless new material evidence contradicts the defended architecture or a material architectural change is selected.

## Outcome

Open Grafana after normal dev observability installation or an explicit upgrade and immediately see the actual Kubernetes cluster, namespaces, every Pod (including pending, failed and completed objects), running containers, workload health, resource usage, and the health of every installed platform subsystem. Drill from overview into a node, namespace, workload or component without an agent. See absent, parked, unsupported, stale and broken telemetry rather than silently confusing them with zero load or healthy state.

E2 targets three independently reviewable capability groups: structural inventory and dashboards (E2-I), authenticated node/container resource metrics (E2-R), and fixed component domain metrics (E2-S). These are scope boundaries, not new Designs, profiles, or mandatory separate live upgrades. Join one desired dev artifact and one occupied upgrade when its selected inputs are frozen. If a gate cannot close, the owner may explicitly ratify a smaller initial artifact; absent coverage remains visibly unsupported and the outstanding group is not certified. No automatic silent fallback or runtime profile toggles.

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
| E2 | Kubernetes inventory/resource metrics, platform service metrics, provisioned operational dashboards | Architecture defended; evidence-gated execution |
| E3 | Scoped centralized operational logs with workload identity, safe content policy and correlation | Later candidate; no raw stdout capture in E2 |
| E4 | Application and Agent Core instrumentation, HTTP/SQL/Temporal causality, provider-free trace specimen | Later candidate; coordinate with durable execution design, instrument new foundations first |
| E5 | Local operational alerts, meaningful thresholds, SLOs, failure/capacity exercises | Later candidate; no alert delivery commitment in E2 |

Every workload should be visible in inventory; not every container has a meaningful domain metric or trace. Trace coverage requires actual instrumented operations and is not created by installing a dashboard. No arbitrary content/credentials or full application log enrollment. Host/WSL monitoring remains the separate workstation observability owner.

## Reading route and ownership

- [Target and architecture](TARGET.md): collection, permissions, coverage, dashboard contracts and remaining decisions.
- [Integration and acceptance](INTEGRATION.md): source anchors, occupied upgrade, ownership, execution ordering and evidence.
- [Evidence and self-defense](EVIDENCE.md): source specimens, alternatives, unresolved bounded feasibility checks and review scope.
- [Independent committee pass 01](committee/pass-01.md): historical verdict, bound to its own candidate.
- [Independent committee pass 02](committee/pass-02.md): DEFENDED; H01 independently closed on the corrected candidate.
- Existing canonical owners: [native infrastructure](../../../../docs/technical/platform/observability-native-infrastructure.md), [telemetry and diagnostics](../../../../docs/technical/observability/telemetry-and-diagnostics.md), [operator experience](../../../../docs/technical/platform/infrastructure-operator-experience.md), [observability runbook](../../../../docs/runbooks/kubernetes-observability.md).
- Predecessor: [E1 owner acceptance](../../archive/observability-developer/OWNER-ACCEPTANCE.md) and [A/V matrix](../../archive/observability-developer/ACCEPTANCE.md). Preserve historical findings and NOT RUN evidence. E2 does not retroactively certify E1.

## Delivery

Evolutionary subsystem development under AGENTS.md, not a replacement architecture. Architecture review is complete. The evidence-gated portions are not represented as ready. Resolve the few consequential feasibility gates through focused source/native evidence before affected packet dispatch; do not repeat the review of unaffected E1 mechanisms. The settled architectural direction is promoted in the existing native infrastructure contract; exact native inputs remain gated. The full proposed [Change batch](../../../changes/open/observability-infrastructure-visibility/README.md) is prepared together; its [native input register](../../../changes/open/observability-infrastructure-visibility/NATIVE-INPUTS.md) owns remaining factual closure. No separate dossier per exporter or dashboard. The active design catalog records the defended, evidence-gated standing. Reconcile permanent contracts and catalog/ledger at promotion and retirement. CLI ownership is unchanged. CLI01 has now joined main; its new `pnpm offscreen obs connect --queries` is an additional operator route, not a new upgrade authority. The complete proposed Change group is now present; independent packet readiness, native input closure and commission remain distinct. No code or runtime action in this planning artifact.
