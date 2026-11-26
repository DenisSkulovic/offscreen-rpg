# Target architecture | round 3

**Proposed, not commissioned.** Independent target; no detailed audit of replaceable PG implementation. Design decisions below are planner recommendations for workshop convergence, not ratification or live permission.

## 1. One platform, different contexts and consumers

One CNPG operator per Kubernetes context; ordinarily one shared CNPG Cluster per context, with additional independent clusters for deliberately scoped experiments. Dev and release differ in purpose, identity, workload and capacity configuration, not database management algorithms. A tenant is a database and scoped role set inside a cluster, not a separate PostgreSQL instance, replica or Kubernetes cluster. Physical replicas copy the entire PostgreSQL cluster, including its databases. Independent experimental clusters have their own data and storage; they are not shards. 

| Existing identity to preserve | Development | Release |
| --- | --- | --- |
| Context | kind-offscreen-dev | kind-offscreen-release |
| PG namespace | offscreen-dev-postgres | lab-postgres |
| Shared Cluster | dev-pg | lab-pg |
| RW endpoint | dev-pg-rw.offscreen-dev-postgres.svc:5432 | lab-pg-rw.lab-postgres.svc:5432 |
| Application bootstrap identities | dev / dev (confirm during source gap audit) | lab / lab (documented) |
| Consumers | isolated durable dev-N databases and role sets; Temporal | release application and Temporal; optionally explicit additional tenants |

Historical runtime names are compatibility constraints, not design naming precedent. Do not rename/recreate Cluster, namespace, PVC, database, role, credentials, or rebind consumers as part of source renewal. Exact bootstrap identity, live UID, labels, image, storage and ownership are to be verified before migration. No assumption of current live state. Stable native RW service routes writes; preserve existing R/RO services until caller audit. CNPG owns replication, promotion, services, Pods, PVCs and internal certificates. No hosted HA or backup guarantee from local replicas.

## 2. Deployment mechanisms

**Proposed choice:** keep checksum-pinned upstream manifest for operator installation, native CNPG Cluster/Database/DatabaseRole objects for data-plane declarations. Operator install and Cluster configuration are separate concerns. The existing operator installation method preserves controller identity and avoids unnecessary Helm ownership migration. [Tagged upstream installation](https://github.com/cloudnative-pg/cloudnative-pg/blob/v1.30.2/docs/src/installation_upgrade.md) explicitly supports server-side apply and uses cnpg-controller-manager in cnpg-system; Helm default Deployment identity differs. Operator updates may roll all managed clusters; no implicit update. Verify actual artifact contents, ownership and image digest before finalizing.

Round 6 refinement: provisionally retain the small existing Helm rendering chart (not a Helm release), after inspecting its two-resource output and dynamic experiment/integration needs. See [specimens](SPECIMENS.md). Original alternatives considered:

| Mechanism | Disposition |
| --- | --- |
| Two explicit native Cluster YAML files | Leading option if common spec is short; transparent, inspectable, no rendering dependency |
| Native base and Kustomize overlays | Candidate if real shared configuration plus distinct environment overrides justifies extra composition; kubectl already includes Kustomize |
| Upstream cluster Helm chart | Valid if it adds useful proven functionality beyond expressing Cluster fields; not currently necessary |
| Existing custom Helm chart | Not architectural default; evaluate after target based on required dynamic topology/render compatibility |
| General JS/YAML generator or custom controller | Reject as default; only narrowly scoped dynamic name/namespace/owner/instance rendering for owned experiments is justified |

Avoid a second config language. Choose declaration format after seeing representative full YAML, overlay and experiment shape. Common machinery does not require deduplicating every repeated YAML line. Preserve exact pins in one source of truth: do not duplicate image tag/digest across profiles or introduce a large templating engine just to substitute one value. Specimen round must resolve this tradeoff. No new dependency until justified.

## 3. Responsibilities

| Owner | Owns | Does not own |
| --- | --- | --- |
| Kind cluster manager | Context/host identity, storage provisioner and Kubernetes lifecycle | PostgreSQL cluster topology or data |
| Environment composition | Select backing services, explicit authorization and order, shared admission/lock policy | PostgreSQL-specific manifests or SQL grants |
| PostgreSQL platform | Operator install, Cluster declarations, observation, explicit topology/config operations, database/role resource provisioning and SQL ACL primitive where native API lacks it | Application schema migration or dev reservation lifecycle |
| CNPG | Reconciliation of Cluster/Database/DatabaseRole, generated services/instance storage and credential integration | Offscreen tenant identity or access policy |
| Dev/release environment owner | Tenant identity, requested DB/role policy, consumer credentials projection, migration sequencing, park/retention | Reimplementing PG reconciliation |
| Temporal platform | Requests exactly its two stores/role, consumes projected Secret, vendor schema initialization | CNPG install or role implementation |
| Domain persistence / migrations | App schema, DML and migration permissions, schema history | Operator, Cluster and credential rotation |

Generic primitives must earn reuse from at least two real consumers. A common database provisioning capability may serve dev/release/Temporal, but their privilege shapes differ; do not collapse into a universal tenant policy or DSL. Preserve Temporal's proven preparation contract pending tenant review; don't move working code simply for symmetry. Consumer-specific credential projection belongs to destination authority; narrow interface and exact call ownership later.

## 4. Reconciliation is native, operations are explicit

A desired manifest is the reference for creation and deliberate configuration change, **not authorization for ordinary startup to overwrite durable state**. Baseline instance count is a creation default; a live count explicitly changed by owner remains effective on normal ensure. Distinguish baseline declared fields, operator defaults/managed fields and authorized operational settings. Do not compare raw YAML byte equality. Define critical semantic compatibility fields and allowed drift explicitly in specimen and integration review; do not silently ignore mismatched image, storage/bootstrap identity or security policy. Explicit operations may change authorized fields; ordinary ensure observes/refuses, not repairs.

| Operation | Mutating behavior |
| --- | --- |
| Render / plan | None. Plan records expected target and whether observations are included; no readiness claim from render. |
| Status | None. Read actual target, classify absence/unreadable/conflict/pending/ready; return useful diagnostics and redacted receipts. |
| Ensure operator | If confirmed absent and authorized: verify upstream bytes then install using native mechanism. Compatible existing installation: observe only. Partial/foreign/version mismatch: refuse; no force apply or upgrade. Exact inventory and partial recovery contract outstanding. |
| Ensure shared Cluster | After operator API/webhook readiness and admission: create only absent owned Namespace/Cluster; reuse compatible existing Cluster including explicit instance count; wait bounded for CNPG. No automatic reconfigure. |
| Ensure independent Cluster | Same creation/observation mechanics; explicit experiment ownership, separate namespace and distinct identity; no rebinding baseline workloads. |
| Set instances | Explicit scoped topology authorization, read healthy existing object, capacity check for increase, explicit scale-down permission, conditional JSON Patch of spec.instances only, wait bounded. Preserve UID; unknown write/conflict returns for re-observation rather than blind retry. |
| Configuration change / upgrade / restore / cleanup | Separate reviewed operation, not part of ordinary ensure; don't build general upgrade/repair framework now. |
| Tenant request | Separate scoped operation after shared cluster ready; exact credential/ACL sequencing round 5. Parking never invokes delete. |

For creation use native create-only semantics where a name collision must refuse. Upstream operator manifest includes cluster-scoped resources and multi-object apply isn't atomic: verify ownership/inventory first and treat partial results honestly. SSA is not an ownership proof and must not auto-adopt foreign data-plane resources or force conflicts; use ordinary native server-side apply only for the explicitly authorized verified operator installation after preflight. Kubernetes conditional JSON patch with UID/resourceVersion tests fences explicit topology writes; existing contract requires both. Status/readiness should distinguish API failures from NotFound, CNPG convergence from SQL reachability and actual workload authentication. Never invent a successful status when evidence incomplete. Avoid a second long-running reconciler or bespoke retry scheduler.

## 5. Security and durability boundaries

Do not enable remote superuser password access merely to ease provisioning. CNPG defaults enableSuperuserAccess=false; privileged SQL, if unavoidable for pinned ACL gaps, should use existing explicitly authorized local administrative path with exact target and redacted outputs. No Secret bytes in Git, argv or logs; no rotation by ensure. Actual credential generation, SQL ACL order, replication role CONNECT requirements and system DB policy are deferred to tenant round. Do not revoke permissions broadly or use bootstrap SQL on an already initialized database. Native postInitSQL is a candidate for fresh-only baseline hardening, not an existing-cluster migration mechanism.

All PostgreSQL data-plane resources are retained by default; deleting a Cluster or Kind cluster can still destroy data. CNPG owns instance PVC lifecycle and may delete retired replica storage. Separate proof for pod replacement, multi-instance failover, backup/restore and cold installation. Local multi-instance topology on one workstation is not independent failure domains. No implicit destructive cleanup or hosted security claims.

## 6. Constraints carried into next rounds

- No connection or resource numbers selected yet. Determine actual pool ceilings per process and per Temporal service/store; inspect CNPG-generated settings and memory constraints, reserve capacity, then propose measured configuration.
- No unconditional PgBouncer; evaluate only if demand demonstrates need and client semantics permit it.
- No final file tree, exported functions or implementation Change. Design the operations and consumer contract before decomposition.
- Existing shared operational command compatibility is required unless a mapped explicit owner decision changes it. Audit actual source/callers in round 7, not now.
- Separate runtime proof and owner authorization still required. Current known operator/Kubernetes version support mismatch in historical runbook is a compatibility question for proof, not evidence of failure or permission to upgrade.
- No need to restructure unrelated DB package, schemas, cache or whole infrastructure.

## 7. Research sources and review

[Tagged Cluster API v1.30.2](https://github.com/cloudnative-pg/cloudnative-pg/blob/v1.30.2/api/v1/cluster_types.go), blob bca1c7046d2f8bf1413214cca7a55ad09850c155, confirms instances minimum/default 1, image tag@digest support, bootstrap, resources, superuser default false, observed instance counts, primary and conditions. Does not establish exact live status predicates; review later.
[Tagged installation](https://github.com/cloudnative-pg/cloudnative-pg/blob/v1.30.2/docs/src/installation_upgrade.md), blob 07afe1d637f9e1393e166b210d3e86db31a7ff22, establishes installation methods and upgrade consequences.
[Tagged service management](https://github.com/cloudnative-pg/cloudnative-pg/blob/v1.30.2/docs/src/service_management.md), blob 364ad22850108329986bb9163a97f1185bfc9cc9, confirms native RW/R/RO ClusterIP services and mandatory RW.
[Kubernetes Kustomize](https://kubernetes.io/docs/tasks/manage-kubernetes-objects/kustomization/), [API concurrency](https://kubernetes.io/docs/reference/using-api/api-concepts/), [server-side apply](https://kubernetes.io/docs/reference/using-api/server-side-apply/), [CNPG 1.30 security](https://cloudnative-pg.io/docs/1.30/security/), [CNPG 1.30 failover](https://cloudnative-pg.io/docs/1.30/failover/). Read 2026-11-26. These are source/design evidence, not runtime experiments.

Round 3 self-critique: native declarative configuration alone does not resolve intentional live topology drift or resource ownership; explicitly separate startup from mutation and preserve operational fences. Eliminating MJS file count is not a target criterion. A simple implementation with a few meaningful modules may be right, but compare concrete responsibilities and old source later. No independent reviewer or local command proof this round.
