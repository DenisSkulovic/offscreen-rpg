# Helm artifacts and configuration

Proposed design only. Owns chart.pin, values.yaml and profiles/. See [overview](README.md).

## Artifact: chart.pin

Prefer the released upstream Temporal Helm chart (V3 generation, not a claim about chart package major version). Use native Helm release state, not helm template + kubectl apply for this component. Upstream owns workloads, services, probes, configuration rendering, schema Jobs, UI and admin tooling. Offscreen owns values, reviewed artifact selection, resource budget, database provisioning, target identity, operational lifecycle and acceptance.

Alternatives:
- Own complete chart: maximum template control, but also own vendor migration hooks, membership, service configuration and future compatibility. Reject absent a demonstrated upstream defect.
- Wrapper chart/subchart: useful only if we actually need to compose additional Helm-managed resources. Avoid initially; plain values are sufficient in principle.
- Vendored upstream archive: acceptable as a reproducibility/offline distribution choice, not an editable fork.
- Temporal CLI dev server: good for SDK tests; reject as shared Kubernetes platform because it bypasses the deployment/persistence topology we want to learn and exercise.

Use published repository https://go.temporal.io/helm-charts/ . Resolve a specific chart release, fetch the archive and verify SHA-256 against the reviewed pin before applying; never install main/latest. Record compatible server, schema/admin tools and UI images, including immutable image digests where the selected chart supports them. If tag+digest rendering is unsupported, explicitly resolve the artifact strategy before acceptance; do not silently pretend tags are immutable. No new chart dependency manager or vendor Git checkout. Reuse infra/platform/common/pins.mjs parsePins and verifyManifestBytes with CHART_VERSION, CHART_URL, CHART_SHA256; no new parser. Keep explicit server/UI/admin tag@index-digest in values, not duplicated in chart.pin. Observed registry digests recorded in FINDINGS.md. Chart checksum verifies package bytes, not registry image bytes.

Original upstream reference specimen: **chart 1.7.0**, tag [temporal-1.7.0](https://github.com/temporalio/helm-charts/tree/temporal-1.7.0), Chart.yaml appVersion 1.32.0. Reviewed tagged Chart.yaml, values.yaml, values/values.postgresql.yaml, server-job.yaml, server-deployment.yaml, server-service.yaml and _helpers.tpl directly. Default images are temporalio/server:1.32.0, temporalio/admin-tools:1.32.0 and temporalio/ui:2.54.1. This was the initial candidate. The current candidate is chart 1.8.0, server/admin-tools 1.32.2, UI 2.56.1, after reviewing the tagged source and release comparison. See the [specimen pin](specimen/chart.pin) and [resource inventory](specimen/RESOURCE-INVENTORY.md). No existing installation upgrade is approved.

Tagged templates confirm the schema job runs pre-install/pre-upgrade, with before-hook-creation and hook-succeeded deletion policy, and uses the admin-tools image. SQL schema management runs setup-schema then update-schema for each selected store. Server and schema job image refs are constructed as repository:tag, not a separate digest field. Therefore do not invent a digest value or an image rewriting pipeline. Use tag@sha256:index digest directly in the three image.tag values. Owner terminal verified all ten image references render correctly in dev, including hooks. No separate image pin file, post-renderer or rewrite. Actual Kind pulls remain untested. The published pin and checksum have now been retrieved from upstream gh-pages/index.yaml. Archive checksum verified and both baseline profiles rendered in owner WSL. All three combined tag+digest overrides confirmed in dev; final pinned release render not run; no live execution.

The upstream chart is preferable because it actually provides the required mechanisms, not because it has an official label. See [upstream migration notes](https://github.com/temporalio/helm-charts/blob/temporal-1.8.0/UPGRADING.md) and [Temporal self-hosted documentation](https://docs.temporal.io/self-hosted-guide).

The file contains CHART_VERSION, CHART_URL and CHART_SHA256 only; no secret, environment, mutable cache location or duplicate image registry. The published URL and checksum are filled in. Verify actual bytes before use; acquire into a private temporary directory and remove it on exit. No persistent cache in the baseline. Do not add a local chart or post-renderer.

## Common configuration: values.yaml

Common values: four role deployments, one replica per role, SQL default and visibility stores, schema management, ClusterIP-only networking, metrics annotations, explicit resources, UI enabled, admin tools enabled initially. For this baseline profile overlays contain exactly the two SQL endpoint leaves; other differences require a deliberate design revision. Same chart/server versions across profiles. Set server.replicaCount: 1 once; no redundant per-role values unless changed. The web UI is useful for learning; the persistent admin-tools Deployment is not a workflow runtime dependency but is required by the chosen CLI-based tenant and health operations. Keep initially because existing CLI-based tenant and health integrations need a place to execute; reconsider after concrete consumer audit. Do not add a second on-demand admin Job mechanism. No public ingress, NodePort or hostPort by default. UI accessed through explicit loopback port-forward; avoid wildcard bind. Trusted workstation only: no mTLS/authorizer initially, namespaces not security boundaries. Production exposure requires TLS, authentication, authorization and network policy review. No passwords or workflow payloads in telemetry.

Pilot resource requests per server pod 100m CPU/512Mi RAM; UI/admin each 128Mi RAM as an estimate. ~2.25Gi requested per installation; 4.5Gi for both, excluding PG, schema Jobs and app workers. Actual RSS, latency, CPU and database load measured before setting limits or increasing replicas. Explicit resources also for schema Jobs. Avoid aggressive CPU throttling or OOM-prone hard limits; choose limits after measurements and preserve host admission gate. No autoscaling or PDB that makes single-replica local maintenance impossible.

Fresh installation: retain upstream 512 history shards rather than invent 128 without evidence; preserve initialized shard count on adoption. Namespace retention belongs to existing environment/tenant policy, not shared server values. Do not change existing retention in this work.

Configuration specimen (baseline rendered, not approved for installation; common values supply user and existing Secret; profile supplies database addresses):
```yaml
server:
  config:
    persistence:
      defaultStore: default
      visibilityStore: visibility
      numHistoryShards: 512
      datastores:
        default:
          sql:
            pluginName: postgres12
            databaseName: temporal
            connectProtocol: tcp
            createDatabase: false
            manageSchema: true
            # common specimen supplies user and existingSecret; profile supplies connectAddr
        visibility:
          sql:
            pluginName: postgres12
            databaseName: temporal_visibility
            connectProtocol: tcp
            createDatabase: false
            manageSchema: true
```
The upstream PostgreSQL example omits driverName; do not add an unnecessary field until rendering verifies a need. Tagged values confirm server.replicaCount, per-role overrides, server.resources, web.resources, admintools.resources, schema.resources, server.config.namespaces.create (false), frontend ClusterIP, metrics annotations and optional frontend gRPC probe. Set server.config.logLevel to info for ordinary operation instead of inheriting debug,info. No ServiceMonitor until existing collector requires it. Use native frontend gRPC probe (plaintext local setup), rather than relying exclusively on default TCP probe. Validate exact render, including all role services, headless membership services, generated config/dynamic-config/shim objects and schema hook. Admin tools is a persistent operational Deployment in this chart, not required for workflow execution; enable initially to make the CLI readily available, but never conflate its readiness with frontend readiness. The actual design-only configuration is in specimen/values.yaml; this fragment is explanatory, not a second source of truth. Ensure both SQL stores actually receive credentials and schema Jobs use same database identities as server.

## Profiles: profiles/development.yaml and profiles/release.yaml

Both overlays have the same minimal shape: override server.config.persistence.datastores.default.sql.connectAddr and visibility.sql.connectAddr, only. User/Secret naming is common in the current specimen; any future additional override requires revisiting the narrow comparison contract. Dev address is dev-pg-rw.offscreen-dev-postgres.svc:5432; release is lab-pg-rw.lab-postgres.svc:5432 (verify service). Do not duplicate replica counts, images, shard count, resource policy or log level. Kubernetes context and namespace are not Helm values; the existing platform profile owns them. Shared role and Secret naming remains subject to [persistence contract](PERSISTENCE.md). No credentials in these files.

## Render review checklist

Obtain and verify archive; helm lint and template both overlays; enumerate actual object names/kinds, four server Deployments, membership Services, frontend, UI/admin, generated configuration and schema hooks. Inspect hook dependencies, image references, resource requests, Secret references, SQL settings, namespace creation disabled, and internal-only listeners. Preserve output as design evidence only, not a second manifest source. Baseline renders and final pinned dev render observed; pinned release render remains a regression check. See [FINDINGS.md](FINDINGS.md). See [rendered resource inventory](specimen/RESOURCE-INVENTORY.md).
