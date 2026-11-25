# Temporal infrastructure | selected first wave

Baseline 4cba2d3974db34ac47b3834b81ded9f5b6f60b56. Main. Owner commissioned source changes 2026-11-25. No live permission. Existing combined server and embedded PG remain unchanged until a separately reviewed migration. No progress credit.

## Wave A (parallel source; serialized joins)
- [INF61 Helm chart decomposition](../../changes/archive/2026-11/platform-operations/2026-11-25--inf61-temporal-chart-ownership/CHANGE.md): Done (source); render 6/6; live NOT-RUN.
- [INF62 Honest bootstrap SQL gates](../../changes/archive/2026-11/platform-operations/2026-11-25--inf62-temporal-bootstrap-verification/CHANGE.md): Done (source); release/dev SQL existence gates; focused 49/49 with schema-policy; live NOT-RUN.
- [INF63 Reject unidentified resource ownership](../../changes/archive/2026-11/platform-operations/2026-11-25--inf63-temporal-explicit-ownership/CHANGE.md): Done (source; live NOT-RUN). `classifyTemporalResource` no longer treats uid-only as owned.

Wave A source closed. INF64–69 remain planner-held. No global queue change. Live Temporal/SQL acceptance NOT-RUN.

## Architecture decisions
- PostgreSQL platform owns clusters, replication, primary endpoint, database/role provisioning, backup. Temporal owns vendor schema lifecycle and server configuration. Shared CNPG local default target, dedicated CNPG or external managed SQL hosted options, not yet activated. Stable writable DNS endpoint; never discover primary Pods or route writes to replicas. Keep existing data until explicit verified migration. Both history and visibility stores must be compatible; successful Job is not authority. Schema verification in INF62 is intentionally only existence, not version compatibility.
- Compact singleton local server remains appropriate. Hosted independent frontend/history/matching/internal-worker roles, pinned upstream chart preferred subject to compatibility evaluation. No blind chart rewrite or production-sized local deployment. History shard count is immutable per existing persistence identity. Preserve dev namespace tenants and API endpoints.
- Reconciliation must fail closed on ambiguous ownership, unreadable status, incompatible schema, credential failure and target identity. Status/plan read-only, explicit mutation permission, bounded operation, honest partial receipts. No auto reset or destructive repair. Runtime PG unavailability must recover via stable endpoint and server connection handling, not a reinstall. Distinguish server process health, dependency readiness and workflow end-to-end proof.

## Subsequent Changes (planner-held, not commissioned)
| Candidate | Dependency | Exact unresolved planner decision |
|---|---|---|
| INF64 persistence configuration / CNPG provisioning | A | Select concrete database/role provision contract, secret reference/TLS, existing PG migration and cutover fencing; inspect CNPG bootstrap owners and every SQL probe caller before release |
| INF65 schema lifecycle | INF64 | Pin vendor schema versions/compatibility for server 1.32.2; define empty/partial/restored schema state and upgrade lock, recovery and downgrade refusal |
| INF66 topology and deployment | INF64–65 | Evaluate pinned upstream chart against JSON-line renderer, compact mode and role discovery; freeze resources/config and shard identity contract |
| INF67 shared installer/reconciliation | INF65–66 | Map dev/release callers, readiness, status/plan, CAS/ownership, namespace Jobs and install.sh assumptions; freeze exact shared APIs |
| INF68 operator/metrics | INF66–67 | Decide namespace retention, authenticated admin access, metrics scrape ownership and failure indicators |
| INF69 verification | INF64–68 | Owned isolated DB and Temporal resources, explicit live gates, workflow recovery through restart and PG failover, schema restore proof; integrate existing verification programme rather than manual Cursor repetition |

Do not dispatch these candidates as investigation tasks. ChatGPT must resolve and author executable packets. Preserve legacy PVCs, Secrets, namespaces and database histories until migration evidence. No app workflow changes. No production readiness claim.

## Corrective wave (after post-implementation audit at d622ec7e25200b03ab75cb3fa87e2f67506b40a1)

- [INF70](../../changes/archive/2026-11/platform-operations/2026-11-25--inf70-temporal-sql-authentication/CHANGE.md): Done (source); three SQL builders map `POSTGRES_PASSWORD`→`PGPASSWORD` with `psql -w` and positional database/query; focused 28/28; live auth NOT-RUN.
- [INF71](../../changes/archive/2026-11/platform-operations/2026-11-25--inf71-temporal-execution-refusals/CHANGE.md): Done (source); release/dev executors fail closed on refused plans and readiness/SQL/secret gate errors; focused 58/58 with INF70 suite; live execution NOT-RUN.

INF61–63 remain archived, but their receipts do not establish runtime readiness. INF62's TCP probe omitted libpq password mapping. INF67 must replace partial pending-Job success, full resource inventory/ownership (including namespace Job, Services and ConfigMaps), and duplicated reconciliation. INF64–65 retire legacy SQL probes after migration contract; INF66 evaluates upstream chart before any more template restructuring. All INF64–69 remain planner-held, now dependent on corrective wave where relevant. No additional completion credit.
