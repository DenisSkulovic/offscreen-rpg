# Temporal platform | greenfield design

Status: **Proposed; owner review required; no implementation commission.**
Baseline: main 03ea79c469d03d3d85ba496c0e6bf98dede96d17, 2026-11-25. Revised after critical review of design commit da2fd059 and upstream tag temporal-1.7.0. PostgreSQL capacity tuning explicitly deferred by owner.
Next review: 2026-11-26 (or earlier with owner). Decision: accept deployment ownership, persistence and lifecycle boundaries, then settle the concrete artifact/configuration specimen.
Scope: shared local Kubernetes platform, not application workflow design. Existing infra/platform/temporal contents deliberately excluded from investigation. No live cluster inspected or changed.

## 1. Design intent

A recognizable Helm-managed Temporal installation, with a small amount of Offscreen-specific integration. The operator should understand the system by reading values and standard Kubernetes resources, not reconstructing a custom deployment engine. One installation per physical Kind cluster; four separately deployable Temporal server roles, one replica each initially. Application workers are not Temporal's internal worker service. Dev slots share the dev server, with durable distinct Temporal namespaces. Release is a production-shaped local environment, not a production HA/security claim.

```text
 application API / application workers
                | gRPC 7233
          Temporal frontend
                |
      history / matching / internal worker
                |
       CNPG primary read-write service
          |                     |
     temporal DB          visibility DB
```

Web UI is a separate optional operational client of frontend; admin tools are a CLI execution environment, not a second control plane. PostgreSQL is the sole persistence dependency. No Redis, RabbitMQ, Elasticsearch, S3 or additional operator dependency.

## 2. Deployment authority

Prefer the released upstream Temporal Helm chart (V3 generation, not a claim about chart package major version). Use native Helm release state, not helm template + kubectl apply for this component. Upstream owns workloads, services, probes, configuration rendering, schema Jobs, UI and admin tooling. Offscreen owns values, immutable artifact selection, resource budget, database provisioning, target identity, operational lifecycle and acceptance.

Alternatives:
- Own complete chart: maximum template control, but also own vendor migration hooks, membership, service configuration and future compatibility. Reject absent a demonstrated upstream defect.
- Wrapper chart/subchart: useful only if we actually need to compose additional Helm-managed resources. Avoid initially; plain values are sufficient in principle.
- Vendored upstream archive: acceptable as a reproducibility/offline distribution choice, not an editable fork.
- Temporal CLI dev server: good for SDK tests; reject as shared Kubernetes platform because it bypasses the deployment/persistence topology we want to learn and exercise.

Use published repository https://go.temporal.io/helm-charts/ . Resolve a specific chart release, fetch the archive and verify SHA-256 against the reviewed pin before applying; never install main/latest. Record compatible server, schema/admin tools and UI images, including immutable image digests where the selected chart supports them. If tag+digest rendering is unsupported, explicitly resolve the artifact strategy before acceptance; do not silently pretend tags are immutable. No new chart dependency manager or vendor Git checkout.

Upstream reference specimen: **chart 1.7.0**, tag [temporal-1.7.0](https://github.com/temporalio/helm-charts/tree/temporal-1.7.0), Chart.yaml appVersion 1.32.0. Reviewed tagged Chart.yaml, values.yaml, values/values.postgresql.yaml, server-job.yaml, server-deployment.yaml, server-service.yaml and _helpers.tpl directly. Default images are temporalio/server:1.32.0, temporalio/admin-tools:1.32.0 and temporalio/ui:2.54.1. This is a concrete candidate, not a claim it is the newest or an approved upgrade from current deployment.

Tagged templates confirm the schema job runs pre-install/pre-upgrade, with before-hook-creation and hook-succeeded deletion policy, and uses the admin-tools image. SQL schema management runs setup-schema then update-schema for each selected store. Server and schema job image refs are constructed as repository:tag, not a separate digest field. Therefore do not invent a digest value or an image rewriting pipeline. First inspect the existing shared image distribution/pinning mechanism; use versioned tags with reviewed digest evidence initially if necessary, explicitly documenting that runtime immutability is not enforced by the chart. The final pin and exact package checksum require fetching the released archive. Tagged source was inspected; archive rendering and live execution have not been performed.

The upstream chart is preferable because it actually provides the required mechanisms, not because it has an official label. See [upstream migration notes](https://github.com/temporalio/helm-charts/blob/temporal-1.7.0/UPGRADING.md) and [Temporal self-hosted documentation](https://docs.temporal.io/self-hosted-guide).

## 3. Proposed directory

```text
infra/platform/temporal/
  README.md
  chart.pin
  values.yaml
  profiles/
    development.yaml
    release.yaml
  install.mjs          # single shared operational adapter
  tests/
    install.test.mjs
infra/verification/       # existing runner owns live checks
```

No local chart, persistence DSL, separate shell installer, parallel bootstrap engine, or preemptive readiness module. The repository already has JS orchestration; one small JS adapter is less machinery than a shell/JS boundary. Helm does the deployment; JS passes explicit arguments through existing command utilities and performs the few Offscreen-specific prerequisite checks. Readiness may be an exported function in the same module until an actual separate consumer justifies extraction. This is a proposed minimum, not a file quota. Existing PG authority provides databases and Secret; no new database provisioning framework. If both profiles are identical, omit unnecessary overlays until genuine differences arise. Keep the release name and workload namespace explicit in the caller/profile contract, not a duplicate config registry.

A human can always inspect and operate Helm directly with the documented commands. No special Offscreen CLI for scaling Temporal, no topology model or custom presenter. Values edits plus an explicit ensure/upgrade operation are sufficient.

## 4. Repository integration and actual baseline

The uploaded snapshot is the original design baseline; subsequent main commits contain this design and its index. Read AGENTS.md, CHATGPT.md, repository design catalog and planner standards; design lifecycle requires acceptance before canon/Change promotion.

Observed source outside excluded folder:
- infra/platform/postgres/chart/profiles/development.yaml: namespace offscreen-dev-postgres, cluster dev-pg, 2Gi storage, 100 max_connections, one instance, 384Mi request/1Gi limit.
- infra/platform/postgres/chart/profiles/release.yaml: namespace lab-postgres, cluster lab-pg, 1Gi storage, 20 max_connections, one instance, 256Mi request/768Mi limit.
- infra/platform/redis/chart/{values.yaml,profiles/,templates/}: useful baseline/profile organization, not an obligation to own vendor templates.
- infra/environments/platform-plan.mjs: corePhases routes dev Temporal to tools/dev-environments/src/adapters/dev-temporal-bootstrap-cli.mjs and release to infra/platform/temporal/install.sh; DEV_ENSURE_ENV provides explicit dev authorization. parsePlatformServiceSelection allows individual services and core/all; chart-render preflight currently applies to chart services. Preserve public selection semantics; explicitly adapt preflight to verify upstream archive and render via Helm, not local JSON-specific manifest constraints. Temporal-only selection must verify PG dependency and refuse if absent, not silently install unrelated infrastructure. Plan is read-only.
- infra/environments/{dev,release}/platform.mjs and tools/dev-environments callers are integration surfaces, not alternative Temporal owners.
- infra/verification/verify.mjs, diagnostic-live.mjs, smoke/release.sh and dev-environments/dev-temporal-tenant-trial.mjs are existing proof integration surfaces. Reconcile rather than create parallel global verifier.
- Release naming remains lab-based at least for PostgreSQL; do not rename cluster/namespace as a side effect. PostgreSQL README confirms context kind-offscreen-release and legacy resource names lab-postgres/lab-pg. Preserve these distinct identities; verify live target before mutation.

Future source map must identify all callers of old Temporal adapters, exact namespace and endpoint bindings, verification imports, image preflight and authorization fences. This is not yet a full compatibility audit because of the explicit exclusion. Existing folder may be opened only at owner-approved migration review, never as the architecture template.

## 5. Persistence contract (PostgreSQL tuning deferred)

Reuse CNPG physical cluster per environment; dedicated databases temporal and temporal_visibility, dedicated non-superuser login(s), no CREATEDB/CREATEROLE, no access to application tenant schemas beyond unavoidable public metadata. Proposed simplest baseline: one Temporal owner/login for both stores with no application privileges; two roles are possible if future security policy requires separation. Schema DDL and runtime access share this scoped owner initially. Do not put passwords in Helm values, CLI arguments, Git, receipts or logs. Secret in Temporal workload Kubernetes namespace with existingSecret/secretKey for each store; stable credentials created once by the PG provisioning authority, never regenerated on ensure. Cross-namespace Secret transfer is explicit, narrow and owned; CNPG superuser Secret is not mounted into Temporal pods. Verify role, ownership, database and credential consistency; mismatch fails closed rather than grants privileges or rotates automatically.

PG owner creates databases and roles idempotently; Temporal schema Jobs initialize/upgrade vendor tables (createDatabase false, manageSchema true). Existing database owner/schema mismatch is a stop condition. No app migration tools touch these stores. Preserve database and role on Temporal stop/uninstall. Fresh initialization only on demonstrably empty owned stores. Never run fresh schema setup blindly over unknown data.

Expected CNPG endpoints (derived from naming convention, verify against Service before adoption): dev-pg-rw.offscreen-dev-postgres.svc:5432 and lab-pg-rw.lab-postgres.svc:5432. Both stores use primary, not read replica.

PostgreSQL capacity, storage and pool tuning are deferred by owner. Do not create a PG sizing workstream, admission algorithm or arbitrary pool reduction here. Record the ordinary dependency precondition (reachable compatible database with sufficient capacity). A failure is diagnosed as such, never silently remedied by changing PostgreSQL. Exact role provisioning interface and Secret transfer remain a narrow integration decision.

## 6. Helm values and topology

Common values: four role deployments, one replica per role, SQL default and visibility stores, schema management, ClusterIP-only networking, metrics annotations, explicit resources, UI enabled, admin tools enabled initially. Profile overlays contain only differing endpoint/Secret reference and resource settings. Same chart/server versions across profiles. No public ingress, NodePort or hostPort by default. UI accessed through explicit loopback port-forward; avoid wildcard bind. Trusted workstation only: no mTLS/authorizer initially, namespaces not security boundaries. Production exposure requires TLS, authentication, authorization and network policy review. No passwords or workflow payloads in telemetry.

Pilot resource requests per server pod 100m CPU/512Mi RAM; UI/admin each 128Mi RAM as an estimate. ~2.25Gi requested per installation; 4.5Gi for both, excluding PG, schema Jobs and app workers. Actual RSS, latency, CPU and database load measured before setting limits or increasing replicas. Explicit resources also for schema Jobs. Avoid aggressive CPU throttling or OOM-prone hard limits; choose limits after measurements and preserve host admission gate. No autoscaling or PDB that makes single-replica local maintenance impossible.

Fresh installation: retain upstream 512 history shards rather than invent 128 without evidence; preserve initialized shard count on adoption. Namespace retention belongs to existing environment/tenant policy, not shared server values. Do not change existing retention in this work.

Tagged-source configuration specimen (not rendered or deployable yet; profile supplies database address, user and existing Secret):
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
            driverName: postgres12
            databaseName: temporal
            connectProtocol: tcp
            createDatabase: false
            manageSchema: true
            # profile supplies connectAddr, user, existingSecret, secretKey
        visibility:
          sql:
            pluginName: postgres12
            driverName: postgres12
            databaseName: temporal_visibility
            connectProtocol: tcp
            createDatabase: false
            manageSchema: true
```
Tagged values confirm server.replicaCount, per-role overrides, server.resources, web.resources, admintools.resources, schema.resources, server.config.namespaces.create (false), frontend ClusterIP, metrics annotations and optional frontend gRPC probe. Set server.config.logLevel to info for ordinary operation instead of inheriting debug,info. No ServiceMonitor until existing collector requires it. Use native frontend gRPC probe (plaintext local setup), rather than relying exclusively on default TCP probe. Validate exact render, including all role services, headless membership services, generated config/dynamic-config/shim objects and schema hook. Admin tools is a persistent operational Deployment in this chart, not required for workflow execution; enable initially to make the CLI readily available, but never conflate its readiness with frontend readiness. Do not turn this fragment into a deployable file yet. Ensure both SQL stores actually receive credentials and schema Jobs use same database identities as server.

## 7. Minimal operational lifecycle

Do not implement a competing Kubernetes reconciler. Existing environment CLI owns target authorization, memory gate, progress and dependency ordering. Both callers converge on one adapter. Helm owns release revisions and object lifecycle. The adapter checks the explicit target, ready PostgreSQL and pre-provisioned credentials, then delegates.

- Plan: report intended profile, release, namespace and chart pin; no Kubernetes mutations or downloads.
- Status: helm status plus Kubernetes rollout and frontend health observations. Read-only.
- Ordinary startup: if owned release is present, healthy and same declared version, use it; do not rerun upgrade hooks for each slot. If not present, install only against explicitly prepared fresh/approved persistence. If version or values changed, report that explicit platform ensure is required. Do not build a live-object drift engine.
- Explicit platform ensure: standard helm upgrade --install against the verified chart archive, explicit context and namespace, values then profile, --wait --wait-for-jobs --timeout 10m (initial bound). Namespace and Secret must exist before pre-install hooks. No --reuse-values; use declared values. If no changes, avoid needless upgrade; compare Helm recorded chart and supplied values, not every rendered Kubernetes object. For an actual version change, require explicit schema-compatible maintenance approval.
- Reuse existing coordination for shared install if available. Otherwise use a single machine-local lock covering this cluster/release operation, only when multiple callers can mutate; do not invent a lease framework. Helm itself refuses overlapping pending release operations, but that is not a substitute for protecting prerequisite creation.
- Health: deployment rollout plus frontend gRPC check (CLI command from admin tools or existing verification path). A successful TCP probe does not establish service readiness. Functional workflow checks are independent, not startup gates.
- Stop/park: environment owner stops only its app workloads. Shared platform remains. Explicit uninstall is an operator operation and preserves DB and separately owned Secrets. No automatic destructive recovery.

On failure, report Helm status and bounded relevant Job/pod diagnostics, preserve state. No recursive retries, automatic rollback or broad garbage collection. Schema hook can run on any Helm upgrade; an ordinary scale/config edit therefore also needs awareness of this behavior. Do not create a second schema runner to avoid it. Helm rollback does not reverse SQL migrations. Version upgrades require supported upgrade sequence and schema compatibility, backup/recovery plan and separate authorization; detailed production disaster recovery is not part of local baseline implementation.

Human operation should be intelligible as:
```sh
helm upgrade --install temporal ./temporal-1.7.0.tgz \
  --kube-context "$CONTEXT" --namespace "$NAMESPACE" \
  -f values.yaml -f "profiles/$PROFILE.yaml" \
  --wait --wait-for-jobs --timeout 10m
```
Illustrative command assumes prerequisites, approved artifact and verified ownership. Not a command to execute on today's cluster.

## 8. Namespace and client contract

Kubernetes namespace groups server resources; Temporal namespace groups executions; dev reservation identity determines durable namespace binding. App clients use frontend service DNS and port 7233 plus explicit Temporal namespace, never default fallback. Dev environment lifecycle ensures namespace after shared service ready and before app workers; release environment ensures stable app namespace. Idempotent describe/create/describe: if already exists verify intended identity and retention; race AlreadyExists re-observe; mismatch refuses. No automatic namespace deletion, retention alteration or reuse for another environment. Preserve existing app address/namespace contracts on adoption. UI/admin access is operational only and not an application authorization system.

## 9. Independent verification

Initial acceptance/source tests: archive checksum refusal; both profiles render with exact selected archive; inspect YAML for four deployments, services, correct image refs, no bundled DB, no leaked Secrets, schema hooks and correct DB references, no public listeners; context mismatch and missing PG/Secret refuse before Helm; healthy no-op; version drift refuses normal ensure; timeout and failed Job never reported ready; simultaneous ensure serialized; profile selection and parent receipt compatibility. Use existing node:test style where needed, Helm lint/template where supported. No new test framework.

Initial live acceptance (separately authorized, use existing infra verification runner and owned resources):
- Observe explicit cluster UID, CNPG readiness and schema versions; frontend health and service connectivity from app network.
- Deterministic SDK workflow with activity, timer and signal; unique fixture ID/namespace, no LLM/game/paid calls. Assert result and history; list completed workflow via visibility with bounded eventual-consistency wait.
\nAdvanced resilience experiments (not startup gates or prerequisites to basic install acceptance):
- Pause fixture worker, observe outstanding task, restart it, assert same workflow/run resumes; activity attempts are not guaranteed exactly once, fixture effect idempotent.
- Authorized server restart while workflow waits, then signal and complete same run; assert durable history. Do not restart shared platform with foreign workloads without permission.
- Repeated ensure preserves release revision, pod identities, database/namespace identities, credentials and existing execution history. Verify denied target has no mutations.
- Record peak RSS, requests, CPU, PG sessions and disk, elapsed duration, image/chart pins and redacted failures. Separate PASS/FAIL/NOT-RUN; no source-only evidence masquerading as live proof.

## 10. Review and migration gates

This document deliberately stops before implementation. Proposed choices need owner review, not a Cursor instruction to investigate.

| Gate | Decision / evidence required |
| --- | --- |
| A architecture | owner accepts upstream native Helm, topology and responsibility boundaries |
| B artifact specimen | planner selects immutable chart + images, obtains archive, renders both profiles and reviews exact hooks, services and config; verify available Helm version |
| C persistence | planner traces existing PG role/database authority and credential flow; settle narrow connectivity and Secret ownership contract; PG tuning deferred |
| D identity/adoption | separately authorized inspection of old folder and live resources; map chart ownership, versions, schema, shards, endpoints, namespaces, credentials and in-flight workflows; choose adoption or explicit clean reset/migration; no destructive default |
| E operational contract | confirm existing namespace policy, upstream shard default, security assumptions and ordinary Helm operation |
| F approval | reconcile accepted design to existing technical/runbook owners, then decide implementation method and only then prepare bounded Changes |

Retirement: once accepted and canon reconciled, record disposition and links in design ledger after review/cooling-off; if deferred, date the next review. No implementation or Change opened, no live proof claimed.

## 11. Critical review disposition

First design over-specified custom lifecycle, invented a conditional database DSL, proposed two operational languages, and selected arbitrary retention and shard/pool sizing. These are corrected above. The main architecture survives: upstream chart, existing PG, separate server roles, one shared instance per cluster. Concrete candidate chart now source-reviewed. Keep the main design readable; do not turn each operational safeguard into a new module or framework.

Unresolved before implementation: released archive checksum and actual Helm rendering; existing shared image pin/distribution compatibility; narrow PG database and Secret authority; existing deployment adoption and client identity (deliberately not inspected); exact current caller/coordination mapping. These require planner evidence, not Cursor research assignments. No live operations, no code Changes, no inspection of the excluded Temporal directory. Next review with owner remains architecture and configuration specimen, not migration authorization.
