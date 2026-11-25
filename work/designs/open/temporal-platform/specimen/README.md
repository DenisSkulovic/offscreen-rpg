# Proposed Temporal Helm configuration specimen

Design only; not part of runtime infrastructure. Do not install. Tagged upstream source reviewed at [temporal-1.8.0](https://github.com/temporalio/helm-charts/tree/temporal-1.8.0), release commit 01210ac0212049d8f66cf0c249665a031b6852b8. Chart 1.8.0 defaults: server/admin-tools 1.32.2, UI 2.56.1. Explicit tag@index-digest overrides in values.yaml based on observed registry indexes; all three pins confirmed by dev render with equivalent overlay.

Files:
- chart.pin: published version, URL and SHA-256 from upstream gh-pages index. Archive checksum verified OK.
- values.yaml: shared configuration; proposed fresh topology and credential names.
- profiles/: only actual endpoint differences. No cluster or Kubernetes namespace duplicated.

Design decisions: fullnameOverride temporal provides predictable service names for a fresh release; adoption must preserve existing names or explicitly migrate callers. One proposed role temporal and one Secret temporal-db with password key, shared by two owned databases; these names are not assertions about current runtime credentials. No secret values here. PostgreSQL tuning deferred. Four core roles inherited enabled from chart defaults; one replica each. Native frontend gRPC readiness, no custom liveness. No internal frontend, namespace setup, ingress or ServiceMonitor. Schema hook retries reduced from upstream 100 to 1 and Job deadline set to 240s, provisional local fail-fast bounds below proposed Helm 5m timeout. Resource requests are unmeasured initial values; no new limits or pool tuning.

## Render evidence

Baseline owner terminal renders observed for both profiles, release lint passed; development lint result not retained. See [FINDINGS.md](../FINDINGS.md). Pinned development lint and render passed with equivalent overlay; diff showed only ten image substitutions. Pinned release render not run; render exact committed files in final regression. No live installation.

When the archive is available, verify published index digest against downloaded bytes and record URL and SHA-256. Then use only local, non-mutating Helm commands from this folder:
```sh
helm pull temporal --repo https://go.temporal.io/helm-charts/ --version 1.8.0 --destination /tmp
printf '%s  %s\n' e65b454d620129f3d7da2c16611a7f754e2d89b20b7a135dc5f0916a062f3a9e /tmp/temporal-1.8.0.tgz | sha256sum -c -
helm lint /tmp/temporal-1.8.0.tgz -f values.yaml -f profiles/development.yaml
helm lint /tmp/temporal-1.8.0.tgz -f values.yaml -f profiles/release.yaml
helm template temporal /tmp/temporal-1.8.0.tgz --namespace offscreen-dev-temporal -f values.yaml -f profiles/development.yaml > /tmp/temporal-dev-render.yaml
helm template temporal /tmp/temporal-1.8.0.tgz --namespace lab-temporal -f values.yaml -f profiles/release.yaml > /tmp/temporal-release-render.yaml
```
Compare published digest before treating these outputs as evidence. No kube context, kubectl apply, Helm install or secrets required. Review output against [HELM.md](../HELM.md) and [source-derived resource inventory](RESOURCE-INVENTORY.md). Confirm probe service and SQL credential wiring, schema hooks, no bundled databases, no namespace setup or public ingress. Record rendered names and counts only after actual execution.
