# Temporal platform | greenfield design

Status: **Proposed; owner review required; no implementation commission.**
Baseline: main 03ea79c469d03d3d85ba496c0e6bf98dede96d17, 2026-11-25.
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

Upstream evidence (reviewed 2026-11-25, moving main, not a tested release):
- https://github.com/temporalio/helm-charts : external stores, existingSecret, createDatabase/manageSchema controls.
- https://github.com/temporalio/helm-charts/blob/main/charts/temporal/values.yaml : role overrides, persistence fields, shard count, metrics, TLS.
- https://github.com/temporalio/helm-charts/blob/main/charts/temporal/templates/server-job.yaml : schema Job implementation.
- https://github.com/temporalio/helm-charts/blob/main/UPGRADING.md : chart migration considerations.
- https://docs.temporal.io/self-hosted-guide/production-checklist and https://docs.temporal.io/temporal-service/temporal-server : capacity, upgrades, immutable shard count.
- https://docs.temporal.io/self-hosted-guide/visibility : PostgreSQL visibility.

Exact release, rendered resources, hook behavior against that release and image availability remain unverified. No code may be commissioned on the strength of moving-main examples alone.

## 3. Proposed directory

```text
infra/platform/temporal/
  README.md
  chart.pin
  values.yaml
  profiles/
    development.yaml
    release.yaml
  persistence/
    databases.yaml       # only if existing PG provisioning can consume this
  install.sh            # one lifecycle entrypoint, both profiles
  readiness.mjs         # read-only adapter for existing JS callers, if needed
  tests/                # focused source-level tests
infra/verification/smoke/temporal/
  smoke.sh              # independent, deterministic live proof
  ...                   # smallest SDK fixture required
```

This is a target, not a file quota or code scaffold. No local chart templates unless evidence requires them. No parallel temporal-next folder, duplicated dev/release install engines, generic new reconciliation framework, vendored raw server manifests, generated YAML committed as a second configuration authority, or Node modules just to reproduce Helm. Use the existing environment command and subprocess conventions; if shell would merely forward to a necessary JS adapter, keep one implementation, not both. Database declaration format is conditional on the PG interface review, not a proposed new DSL.

## 4. Repository integration and actual baseline

The repository snapshot and remote main HEAD agree. Read AGENTS.md, CHATGPT.md, repository design catalog and planner standards; design lifecycle requires acceptance before canon/Change promotion.

Observed source outside excluded folder:
- infra/platform/postgres/chart/profiles/development.yaml: namespace offscreen-dev-postgres, cluster dev-pg, 2Gi storage, 100 max_connections, one instance, 384Mi request/1Gi limit.
- infra/platform/postgres/chart/profiles/release.yaml: namespace lab-postgres, cluster lab-pg, 1Gi storage, 20 max_connections, one instance, 256Mi request/768Mi limit.
- infra/platform/redis/chart/{values.yaml,profiles/,templates/}: useful baseline/profile organization, not an obligation to own vendor templates.
- infra/environments/platform-plan.mjs: corePhases routes dev Temporal to tools/dev-environments/src/adapters/dev-temporal-bootstrap-cli.mjs and release to infra/platform/temporal/install.sh; DEV_ENSURE_ENV provides explicit dev authorization. parsePlatformServiceSelection allows individual services and core/all; chart-render preflight currently applies to chart services. Preserve public selection semantics; explicitly adapt preflight to verify upstream archive and render via Helm, not local JSON-specific manifest constraints. Temporal-only selection must verify PG dependency and refuse if absent, not silently install unrelated infrastructure. Plan is read-only.
- infra/environments/{dev,release}/platform.mjs and tools/dev-environments callers are integration surfaces, not alternative Temporal owners.
- infra/verification/verify.mjs, diagnostic-live.mjs, smoke/release.sh and dev-environments/dev-temporal-tenant-trial.mjs are existing proof integration surfaces. Reconcile rather than create parallel global verifier.
- Release naming remains lab-based at least for PostgreSQL; do not rename cluster/namespace as a side effect. Confirm actual kube context, cluster UID and client service identities before implementation. No fabricated kind-offscreen-release migration.

Future source map must identify all callers of old Temporal adapters, exact namespace and endpoint bindings, verification imports, image preflight and authorization fences. This is not yet a full compatibility audit because of the explicit exclusion. Existing folder may be opened only at owner-approved migration review, never as the architecture template.

## 5. Persistence and connection budget

Reuse CNPG physical cluster per environment; dedicated databases temporal and temporal_visibility, dedicated non-superuser login(s), no CREATEDB/CREATEROLE, no access to application tenant schemas beyond unavoidable public metadata. Proposed simplest baseline: one Temporal owner/login for both stores with no application privileges; two roles are possible if future security policy requires separation. Schema DDL and runtime access share this scoped owner initially. Do not put passwords in Helm values, CLI arguments, Git, receipts or logs. Secret in Temporal workload Kubernetes namespace with existingSecret/secretKey for each store; stable credentials created once by the PG provisioning authority, never regenerated on ensure. Cross-namespace Secret transfer is explicit, narrow and owned; CNPG superuser Secret is not mounted into Temporal pods. Verify role, ownership, database and credential consistency; mismatch fails closed rather than grants privileges or rotates automatically.

PG owner creates databases and roles idempotently; Temporal schema Jobs initialize/upgrade vendor tables (createDatabase false, manageSchema true). Existing database owner/schema mismatch is a stop condition. No app migration tools touch these stores. Preserve database and role on Temporal stop/uninstall. Fresh initialization only on demonstrably empty owned stores. Never run fresh schema setup blindly over unknown data.

Expected CNPG endpoints (derived from naming convention, verify against Service before adoption): dev-pg-rw.offscreen-dev-postgres.svc:5432 and lab-pg-rw.lab-postgres.svc:5432. Both stores use primary, not read replica.

**Critical discovery:** release max_connections=20. Upstream example maxConns=20 per SQL store is not a viable drop-in configuration for four roles. A conservative upper envelope is sum of all per-process per-store pool ceilings + schema/ops connections + application allocations + reserved PG slots, including rollout surge. Not every role necessarily opens every pool; measure actual sessions by role and database. Proposed pilot: 2 maxConns and 1 maxIdleConns per store per server process, with one replica each (upper envelope 16 steady-state, 20 with one surge pod, excluding all other consumers). Even this does not fit current release capacity safely. Prefer explicitly raising release PG max_connections to a reviewed 100 only after resource/storage review, reserving at least 20 connections for admin/application headroom and measuring idle/load/surge behavior. Dev 100 is not automatically sufficient either. Do not silently change PG settings in the Temporal installer. Scale replicas only after admission checks using measured pools and agreed budget. Review CNPG memory and storage (1Gi release) against history growth; no production capacity claim.

## 6. Helm values and topology

Common values: four role deployments, one replica per role, SQL default and visibility stores, schema management, ClusterIP-only networking, metrics annotations, explicit resources, UI enabled, admin tools enabled initially. Profile overlays contain only differing endpoint/Secret reference and resource settings. Same chart/server versions across profiles. No public ingress, NodePort or hostPort by default. UI accessed through explicit loopback port-forward; avoid wildcard bind. Trusted workstation only: no mTLS/authorizer initially, namespaces not security boundaries. Production exposure requires TLS, authentication, authorization and network policy review. No passwords or workflow payloads in telemetry.

Pilot resource requests per server pod 100m CPU/512Mi RAM; UI/admin each 128Mi RAM as an estimate. ~2.25Gi requested per installation; 4.5Gi for both, excluding PG, schema Jobs and app workers. Actual RSS, latency, CPU and database load measured before setting limits or increasing replicas. Explicit resources also for schema Jobs. Avoid aggressive CPU throttling or OOM-prone hard limits; choose limits after measurements and preserve host admission gate. No autoscaling or PDB that makes single-replica local maintenance impossible.

Fresh-cluster shard proposal: 128 for this small local workload, rather than accepting the current upstream default 512 without discussion. This is a provisional sizing choice, not measured capacity. Shard count is immutable for initialized persistence: preserve existing count on adoption; never change it through a values edit. Compare 128 vs 512 at owner review; record selected value with DB identity before first initialization. Do not conflate history shards with pod replicas.
Proposed retention: dev 3 days, release 7 days for closed executions, explicit per namespace; validate SDK/application diagnostics needs before approval. Retention is not backup, not open-workflow timeout, and not permission to delete a namespace.

Illustrative values shape (not executable or fully validated):
```yaml
server:
  config:
    persistence:
      defaultStore: default
      visibilityStore: visibility
      numHistoryShards: 128
      datastores:
        default:
          sql:
            pluginName: postgres12
            databaseName: temporal
            connectProtocol: tcp
            createDatabase: false
            manageSchema: true
            maxConns: 2
            maxIdleConns: 1
            # profile supplies connectAddr, user, existingSecret, secretKey
        visibility:
          sql:
            pluginName: postgres12
            databaseName: temporal_visibility
            connectProtocol: tcp
            createDatabase: false
            manageSchema: true
            maxConns: 2
            maxIdleConns: 1
```
Validate driverName requirements, exact values keys, schema paths, TLS defaults, service names, resource overrides and rendered image references against the selected chart archive. Do not turn this fragment into a deployable file yet. Ensure both SQL stores actually receive credentials and schema Jobs use same database identities as server.

## 7. Lifecycle and concurrency

Existing top-level platform CLI remains owner of command routing, target admission and structured receipts. One Temporal lifecycle implementation:
1. Plan: report target, profile, pin, dependencies and intended phases, zero mutations or secret output.
2. Ensure: verify explicit authorized context plus cluster identity, dependency readiness, artifact integrity, memory and PG capacity. Serialize shared Temporal changes across worktrees using existing host-wide coordination if available; otherwise design a single cluster/service-scoped lock before implementation. Never use a checkout-local lock to protect a shared release. Lock covers inspection through readiness and failure receipt. No parallel Helm upgrades.
3. Read-only inspect release, schema compatibility, identities and health. Missing fresh release: provision prerequisites then helm upgrade --install with explicit context, namespace, verified local archive, common values then profile, bounded --wait and --wait-for-jobs. Pre-install schema hooks require namespace and referenced Secrets to exist first. Verify exact hook order.
4. Healthy same desired configuration: no Helm upgrade, schema Job, rollout or credential rewrite. Compare actual pinned artifact/config and release health, not merely release existence. Same-version drift: explicit reconcile only for reviewed safe owned changes; refuse unknown ownership and incompatible immutable state. Version/schema change is an explicit maintenance operation, never an implicit app startup side effect.
5. Verify deployments, frontend gRPC health, persistence/visibility and applicable namespace readiness. Return structured result to parent; never claim ready based only on pod status.
6. Stop/park dev slot: environment owner stops app workers, preserves namespace, state and shared platform. Platform stop/uninstall is separately authorized; preserve persistence and Secrets. No automatic cleanup of failed installs, schema rollback, force replace, namespace deletion or PVC deletion. Keep diagnostic evidence.

Helm failure: collect bounded status, pod events, Job status/logs with redaction. Distinguish failed/pending release, schema failure, capacity pressure, unhealthy server. Refuse concurrent or unknown in-progress operations; no automatic retry loop. Forward repair or rollback is an explicit decision informed by schema compatibility. A Helm rollback cannot undo DB migrations. Never use --atomic/--rollback-on-failure blindly. On ambiguous command timeout re-observe before any subsequent mutation.

Upgrade: verify supported sequential server minor path and schema prerequisites, backup both stores with consistent recovery procedure, record versions, ensure sufficient headroom, run chart schema lifecycle, roll services, prove health and existing workflow continuation. Application workflow compatibility remains separate. Restore drill before promising recoverability; both stores need coherent recovery, not independently chosen arbitrary snapshots.

## 8. Namespace and client contract

Kubernetes namespace groups server resources; Temporal namespace groups executions; dev reservation identity determines durable namespace binding. App clients use frontend service DNS and port 7233 plus explicit Temporal namespace, never default fallback. Dev environment lifecycle ensures namespace after shared service ready and before app workers; release environment ensures stable app namespace. Idempotent describe/create/describe: if already exists verify intended identity and retention; race AlreadyExists re-observe; mismatch refuses. No automatic namespace deletion, retention alteration or reuse for another environment. Preserve existing app address/namespace contracts on adoption. UI/admin access is operational only and not an application authorization system.

## 9. Independent verification

Static/source tests: pin parser and archive checksum refusal; both profiles render with exact selected archive; inspect YAML for four deployments, services, correct image refs, no bundled DB, no leaked Secrets, schema hooks and correct DB references, no public listeners; context mismatch and missing PG/Secret refuse before Helm; healthy no-op; version drift refuses normal ensure; timeout and failed Job never reported ready; simultaneous ensure serialized; profile selection and parent receipt compatibility. Use existing node:test style where needed, Helm lint/template where supported. No new test framework.

Live proof (separately authorized, use existing infra verification runner and owned resources):
- Observe explicit cluster UID, CNPG readiness and schema versions; frontend health and service connectivity from app network.
- Deterministic SDK workflow with activity, timer and signal; unique fixture ID/namespace, no LLM/game/paid calls. Assert result and history; list completed workflow via visibility with bounded eventual-consistency wait.
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
| C persistence | planner traces existing PG role/database authority and credential flow; approve pool budget, storage and any PG adjustment |
| D identity/adoption | separately authorized inspection of old folder and live resources; map chart ownership, versions, schema, shards, endpoints, namespaces, credentials and in-flight workflows; choose adoption or explicit clean reset/migration; no destructive default |
| E operational contract | approve retention, shard count for fresh DB, security assumptions, lock, diagnostics and restart permissions |
| F approval | reconcile accepted design to existing technical/runbook owners, then decide implementation method and only then prepare bounded Changes |

Retirement: once accepted and canon reconciled, record disposition and links in design ledger after review/cooling-off; if deferred, date the next review. No implementation or Change opened, no live proof claimed.

## 11. Self-review

Biggest risk is not Helm syntax: it is adopting an unknown existing state while changing its owner, schema or immutable shard count. Second is database resource starvation from default pools. Third is two competing installers invoked by dev startup and platform CLI. The design explicitly separates these hazards from declarative deployment. Remaining unverified items are concrete blockers to implementation approval, not delegated discovery work. Keep the implementation small by deleting redundant authorities only after proving replacement ownership and preserving data.
