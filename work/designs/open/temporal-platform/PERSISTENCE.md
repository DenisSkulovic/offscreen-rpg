# Persistence and namespace boundaries

Proposed design only. No PostgreSQL tuning or new provisioning framework.

Reuse CNPG physical cluster per environment; dedicated databases temporal and temporal_visibility, dedicated non-superuser login(s), no CREATEDB/CREATEROLE, no access to application tenant schemas beyond unavoidable public metadata. Proposed simplest baseline: one Temporal owner/login for both stores with no application privileges; two roles are possible if future security policy requires separation. Schema DDL and runtime access share this scoped owner initially. Do not put passwords in Helm values, CLI arguments, Git, receipts or logs. Secret in Temporal workload Kubernetes namespace with existingSecret/secretKey for each store; stable credentials created once by the PG provisioning authority, never regenerated on ensure. Cross-namespace Secret transfer is explicit, narrow and owned; CNPG superuser Secret is not mounted into Temporal pods. Verify role, ownership, database and credential consistency; mismatch fails closed rather than grants privileges or rotates automatically.

PG owner creates databases and roles idempotently; Temporal schema Jobs initialize/upgrade vendor tables (createDatabase false, manageSchema true). Existing database owner/schema mismatch is a stop condition. No app migration tools touch these stores. Preserve database and role on Temporal stop/uninstall. Fresh initialization only on demonstrably empty owned stores. Never run fresh schema setup blindly over unknown data.

Expected CNPG endpoints (derived from naming convention, verify against Service before adoption): dev-pg-rw.offscreen-dev-postgres.svc:5432 and lab-pg-rw.lab-postgres.svc:5432. Both stores use primary, not read replica.

PostgreSQL capacity, storage and pool tuning are deferred by owner. Do not create a PG sizing workstream, admission algorithm or arbitrary pool reduction here. Record the ordinary dependency precondition (reachable compatible database with sufficient capacity). A failure is diagnosed as such, never silently remedied by changing PostgreSQL. Exact role provisioning interface and Secret transfer remain a narrow integration decision.

## Temporal namespaces and client contract

Kubernetes namespace groups server resources; Temporal namespace groups executions; dev reservation identity determines durable namespace binding. App clients use frontend service DNS and port 7233 plus explicit Temporal namespace, never default fallback. Dev environment lifecycle ensures namespace after shared service ready and before app workers; release environment ensures stable app namespace. Idempotent describe/create/describe: if already exists verify intended identity and retention; race AlreadyExists re-observe; mismatch refuses. No automatic namespace deletion, retention alteration or reuse for another environment. Preserve existing app address/namespace contracts on adoption. UI/admin access is operational only and not an application authorization system.

## File responsibility

No persistence/ folder in Temporal. Helm values reference existing databases and credentials. The existing PostgreSQL authority must provide the two databases, scoped role and stable Secret; the chart owns schema initialization/upgrades, not database creation. Environment tenant lifecycle owns application namespace registration. Exact provisioning API and existing identity adoption are unresolved; no fake interface or executable SQL is proposed.
