# Proposed Temporal Helm configuration specimen

Design only; not part of runtime infrastructure. Do not install. Tagged upstream source reviewed at [temporal-1.7.0](https://github.com/temporalio/helm-charts/tree/temporal-1.7.0), release commit ab89869a913207bd191e60a90193512bd9adcb80. Chart 1.7.0 defaults: server/admin-tools 1.32.0, UI 2.54.1. Inherit image tags from the pinned package; no duplicate version declarations. Registry image digest enforcement remains unresolved.

Files:
- chart.pin: candidate version; URL and checksum deliberately UNVERIFIED.
- values.yaml: shared configuration; proposed fresh topology and credential names.
- profiles/: only actual endpoint differences. No cluster or Kubernetes namespace duplicated.

Design decisions: fullnameOverride temporal provides predictable service names for a fresh release; adoption must preserve existing names or explicitly migrate callers. One proposed role temporal and one Secret temporal-db with password key, shared by two owned databases; these names are not assertions about current runtime credentials. No secret values here. PostgreSQL tuning deferred. Four core roles inherited enabled from chart defaults; one replica each. Native frontend gRPC readiness, no custom liveness. No internal frontend, namespace setup, ingress or ServiceMonitor. Schema hook retries reduced from upstream 100 to 1 and Job deadline set to 240s, provisional local fail-fast bounds below proposed Helm 5m timeout. Resource requests are unmeasured initial values; no new limits or pool tuning.

## Render evidence

NOT RUN: sandbox has no helm executable and cannot resolve go.temporal.io; web index fetch rejects YAML content type. Upstream release existence and tagged configuration/template source inspected. No archive bytes, checksum or rendered resource counts verified. Do not interpret expected names as observed render.

When the archive is available, verify published index digest against downloaded bytes and record URL and SHA-256. Then use only local, non-mutating Helm commands from this folder:
```sh
helm pull temporal --repo https://go.temporal.io/helm-charts/ --version 1.7.0 --destination /tmp
sha256sum /tmp/temporal-1.7.0.tgz
helm lint /tmp/temporal-1.7.0.tgz -f values.yaml -f profiles/development.yaml
helm lint /tmp/temporal-1.7.0.tgz -f values.yaml -f profiles/release.yaml
helm template temporal /tmp/temporal-1.7.0.tgz --namespace offscreen-dev-temporal -f values.yaml -f profiles/development.yaml > /tmp/temporal-dev-render.yaml
helm template temporal /tmp/temporal-1.7.0.tgz --namespace lab-temporal -f values.yaml -f profiles/release.yaml > /tmp/temporal-release-render.yaml
```
Compare published digest before treating these outputs as evidence. No kube context, kubectl apply, Helm install or secrets required. Review output against [HELM.md](../HELM.md). Confirm probe service and SQL credential wiring, schema hooks, no bundled databases, no namespace setup or public ingress. Record rendered names and counts only after actual execution.
