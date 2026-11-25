# Persistence and namespace boundaries

Proposed design only. No PostgreSQL tuning or new provisioning framework.

Reuse CNPG physical cluster per environment; dedicated databases temporal and temporal_visibility, dedicated non-superuser login(s), no CREATEDB/CREATEROLE, no access to application tenant schemas beyond unavoidable public metadata. Proposed simplest baseline: one Temporal owner/login for both stores with no application privileges; two roles are possible if future security policy requires separation. Schema DDL and runtime access share this scoped owner initially. Do not put passwords in Helm values, CLI arguments, Git, receipts or logs. Secret in Temporal workload Kubernetes namespace with existingSecret/secretKey for each store; stable credentials created once by the PG provisioning authority, never regenerated on ensure. Cross-namespace Secret transfer is explicit, narrow and owned; CNPG superuser Secret is not mounted into Temporal pods. Verify role, ownership, database and credential consistency; mismatch fails closed rather than grants privileges or rotates automatically.

PG owner creates databases and roles idempotently; Temporal schema Jobs initialize/upgrade vendor tables (createDatabase false, manageSchema true). Existing database owner/schema mismatch is a stop condition. No app migration tools touch these stores. Preserve database and role on Temporal stop/uninstall. Fresh initialization only on demonstrably empty owned stores. Never run fresh schema setup blindly over unknown data.

Expected CNPG endpoints (derived from naming convention, verify against Service before adoption): dev-pg-rw.offscreen-dev-postgres.svc:5432 and lab-pg-rw.lab-postgres.svc:5432. Both stores use primary, not read replica.

PostgreSQL capacity, storage and pool tuning are deferred by owner. Do not create a PG sizing workstream, admission algorithm or arbitrary pool reduction here. Record the ordinary dependency precondition (reachable compatible database with sufficient capacity). A failure is diagnosed as such, never silently remedied by changing PostgreSQL. Exact role provisioning interface and Secret transfer remain a narrow integration decision.

## Temporal namespaces and client contract

Kubernetes namespace groups server resources; Temporal namespace groups executions; dev reservation identity determines durable namespace binding. App clients use frontend service DNS and port 7233 plus explicit Temporal namespace. Dev slots never fall back to default. The existing release workload profile explicitly selects default; preserve that release identity unless an approved migration changes it, and explicitly verify/provision it if absent. Dev environment lifecycle ensures namespace after shared service ready and before app workers; release environment ensures stable app namespace. Idempotent describe/create/describe: if already exists verify intended identity and retention; race AlreadyExists re-observe; mismatch refuses. No automatic namespace deletion, retention alteration or reuse for another environment. Preserve existing app address/namespace contracts on adoption. UI/admin access is operational only and not an application authorization system.

## File responsibility

No persistence/ folder in Temporal. Helm values reference existing databases and credentials. The existing PostgreSQL authority must provide the two databases, scoped role and stable Secret; the chart owns schema initialization/upgrades, not database creation. Environment tenant lifecycle owns application namespace registration. The concrete candidate is the existing CNPG DatabaseRole and Database CR pattern, described below. Existing identity adoption remains unresolved; no executable SQL or implementation is proposed.

## Narrow database provisioning design (not PostgreSQL tuning)

Source evidence: original snapshot 03ea79c469d0, tools/dev-environments/src/adapters/dev-sql-tenant-live-adapter.mjs createSecrets(), applyClosedDatabase(), readCatalog() and waitFor(). It already uses kubernetes.io/basic-auth Secrets, DatabaseRole and Database CRs, retained reclaim policies, database catalog verification and restricted SQL vocabulary. This is a proven source pattern, not a generic platform database provisioning API; its slot ownership and connection limits are inappropriate for shared Temporal. Do not import this dev-only adapter from the Temporal installer or reuse its application-specific grants.

Candidate shared PostgreSQL-owned declaration for each cluster (fresh identities only):

| Resource | Namespace | Identity / purpose |
| --- | --- | --- |
| Secret | profile.namespaces.postgres | temporal-db, type kubernetes.io/basic-auth, username temporal, generated password once, CNPG reload label |
| DatabaseRole | same PG namespace | temporal; cluster from existing PG profile; login true; no superuser, createdb, createrole, replication, bypassrls, membership; retain policy; passwordSecret references temporal-db |
| Database | same PG namespace | temporal, owner temporal, retain policy |
| Database | same PG namespace | temporal-visibility (K8s resource), SQL name temporal_visibility, owner temporal, retain policy |
| Secret | profile.namespaces.temporal | temporal-db, projection of username/password from the source Secret; independently owned, never Helm-generated |

Use declared CRs and CNPG reconciliation, not ad hoc CREATE DATABASE/ROLE SQL or a Temporal-owned database. PostgreSQL provisioning owns creation and catalog/ACL verification; do not expose app databases through PUBLIC privileges, and restrict PUBLIC access on these two databases. Follow existing closed-before-grants pattern where applicable, only open intended databases after roles/ACLs verified. Do not change unrelated database ACLs without separate review. Source credential is authoritative: projection copies values through stdin, never logs, no automatic regeneration or silent rotation, foreign or inconsistent existing Secret refuses. Existing credentials must be preserved on adoption; fresh naming is not a claim about current state.

Do not make this into a new database subsystem. The intended integration is a small PG-owned provisioning action with two declarative CRs, one role CR and credential preparation, followed by Helm. Existing PostgreSQL platform has no verified generic shared-role entrypoint, so exact path/call boundary and live CNPG CR compatibility remain to be settled during narrow integration review. Temporal install calls or requires the authorized PG preparation result; it never runs superuser SQL itself. The owner explicitly deferred PG capacity, storage, connection limits and tuning. No changes to those settings are proposed.
