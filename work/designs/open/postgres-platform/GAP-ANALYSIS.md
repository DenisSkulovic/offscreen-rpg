# Source gap and retention map | round 7

2026-11-26. Audited integration main 73b3154025e94ad2f827cdb03eda4b389e19ac35; design target version a3674cee3e67a02a051f5df9425879a58c47edbd. No implementation mutation or live tests. Read actual chart, all core bootstrap plan/executor/observation modules, config, readiness, topology model/baseline/arguments/router and relevant owned/observation excerpts, common helpers and caller/test anchors. Tenant contracts and selected executor/Temporal excerpts in earlier rounds; detailed whole-repository import mapping, remaining tenant internals and test execution still required before implementation. This is a gap assessment, not deletion permission.

## Installation: high-value consolidation

| Source | Evidence / gap | Disposition |
| --- | --- | --- |
| chart/, operator.pin | Native two-resource render, common renderer pin overlay | Retain; update only selected profile/security settings; keep exact resource identities |
| config.mjs | dev constants duplicate chart resource numbers and hardcode context; release derives profile; consumers import exported identity constants | Retain compatibility exports until mapped, unify identity from profile + rendered declarations; remove duplicate sizing values |
| bootstrap/dev-plan.mjs::assessDevCnpg/ensureDevCnpg | Dev ownership UID and storage class, no operand image/bootstrap/size compatibility; both owned returns noop without proving operator ready. plan has hardcoded size/pool facts. | Replace shared semantic classification and plan; preserve owner fence |
| bootstrap/release-plan.mjs::classifyCluster/ensureReleaseCnpg | More complete image/storage/bootstrap identity; existing instance count preserved; repeated render; operator-matches and CRD absent branch not consistently fenced | Reuse semantic predicate ideas, not duplicate planner |
| dev-host-probe.mjs and bootstrap/release-observation.mjs | Both collect memory, context, kind, operator, namespace and CRD. Dev reads Cluster before CRD inventory; release avoids unregistered CR read. Both can fall back to ambient current-context if cluster-info fails; explicit common target verification is stronger. | One observation path using common readPlatformObject/assertPlatformTarget, CRD first; never infer authorization from ambient context |
| bootstrap/dev-execution.mjs | Reads/validates manifest even on noop; applies namespace and Cluster, retries apply up to 12 times without identity re-observation; readiness handled in outer CLI | Replace |
| bootstrap/release-execution.mjs | Conditional artifact acquisition, webhook endpoint wait, topology wait and final check; same blind apply retries; verify-operator marker not actual readiness check by itself | Preserve useful wait phases, replace duplicate execution |
| bootstrap/observation-helpers.mjs | Small common helper | Reuse only where not already supplied by common platform modules |
| install.sh, release-install.mjs | Release shell owns pin parsing, download/hash, preflight, volume/loopback guards; CLI prepare/install split and repeated target checks | Replace core with common install; retain necessary volume and local exposure guarantees and thin compatibility entrypoints |
| dev-bootstrap.mjs | Barrel only | Retire when all imports updated or retain temporary compatibility |
| cluster-readiness.mjs | Pure aligned spec/status/ready counts, Ready True, healthy phase, primary; bounded polling shared by topology | Preserve and strengthen target UID and freshness checks; no claim of current-generation semantics without CNPG status research |
| readiness.mjs | Dev-only current primary label check and local superuser SELECT 1 | Generalize scoped SQL readiness; preserve consumer adapter; prove actual writable primary and separate credential readiness |

Important: dev outer tools/dev-environments/src/adapters/dev-cnpg-bootstrap-cli.mjs::waitForDevPostgres performs extra CRD/rollout waits and SQL readiness after printing a preliminary JSON result. It downloads to predictable /tmp path with digest-based filename and returns hash of bytes; avoid predictable shared temp and verify actual bytes centrally. It blocks injected probe for ensure and requires explicit env authorization. Preserve this refusal and existing caller protocol until mapped, not two JSON success records in new public API. Cold dev query before CRD is a candidate failure, not demonstrated runtime failure.

## Topology: retain the useful core, simplify shared logic

| Source | Disposition |
| --- | --- |
| topology-cli.mjs, topology-presentation.mjs, topology/arguments.mjs | Preserve public CLI, strict flags, output/receipt compatibility. Fix minor help parsing only if needed, not redesign UX. |
| topology/model.mjs::buildInstancesCasPatch | Retain exact UID/resourceVersion/current-count test + replace count. Validate nonempty identities and bounded numeric inputs. |
| model::assessLiveClusterIdentity / assessLiveOwnedClusterIdentity | Consolidate semantic checks into shared observation; preserve baseline and owned label differences and bootstrap/storage/image identity. |
| model::renderOwnedPostgresCluster | Keep native document rendering with constrained identity override, cloned object; repeated baseline renders before/after and JSON string equality may be removable after pure render proof. |
| model::ownedPostgresNamespaceName/buildOwnedPostgresLabels/assertOwnedPostgresClusterName | Preserve ownership/name rules and endpoint identity. |
| model::assessTopologyMemoryPreflight | Keep headroom plus incremental live limit rule pending measurement. Resource presentation currently derived from expected profile rather than live spec; label declared/observed separately. Memory parser only integer Mi/Gi, refuse unsupported rather than silently misinterpret. |
| topology/observation.mjs::collectCnpgTopologyObservation/collectOwnedCnpgTopologyObservation | Repeated target, CRD, operator, pin, render and identity observations. Share core observations; keep owned namespace distinct. |
| topology/baseline.mjs::ensureCnpgTopology | Preserve explicit context, scale-down gate, healthy start, admission and CAS. Before-patch re-observation compares namespace UID and Cluster UID/RV; also assess fresh target compatibility, authorization and memory immediately before mutation. |
| topology/owned.mjs::ensureOwnedCnpgTopology | Preserve create-only namespace/cluster, fresh ownership fences, captured UID recovery receipts, no implicit cleanup. Reuse common create and resize operations instead of parallel mechanisms. |
| topology.mjs | Existing facade and dispatch, retain until caller migration. Redaction should use allowlisted fields, not assume regex/truncation protects arbitrary diagnostic secrets. |

Both resize paths stop after failed patch rather than blind retry. But mutation receipt currently sets uncertain based on observed desired count; an unreadable post-failure observation or concurrent changes cannot prove no mutation. Return explicit unknown outcome, with same-UID observation only, without breaking established receipt consumers silently. Post-write readiness must fence Cluster UID, not accept same-name replacement. Existing wait helper has no UID argument. Use bounded waits, no tight spin when sleep omitted. Do not claim unknown write outcome means failure/no mutation.

## Integration seam inventory (observed anchors)

- infra/environments/platform-plan.mjs::corePhases uses dev child dev-cnpg-bootstrap-cli with OFFSCREEN_DEV_CNPG_ENSURE=authorized, release install.sh; keep external infra:plan/up/status/render semantics and service order. Read runPlatformPlan, preflight, status callers and exact lock ownership before changing child protocol. Use common runner/target instead of own spawnSync wrappers. Keep admission and release ownership baseline.
- infra/platform/common/commands.mjs::runPlatformCommand/readPlatformObject/assertPlatformTarget, common/profile.mjs, common/pins.mjs and common/render.mjs::renderPlatformDocuments/helmPlatformStdin supply actual shared boundaries. Reuse rather than create PG equivalents. Renderer pin overlay and legacy JSON stream must survive.
- tools/dev-environments/src/application/dev-shared-core-readiness.mjs imports observeDevPostgresReady; dev-slot-startup.mjs::reconcileOwnedDevSlot verifies shared core, prepares migration artifact, provisions SQL tenant, migrates, projects credential, then workloads. Preserve ordering and parking.
- tools/dev-environments/src/adapters/dev-sql-tenant-{executor,live-adapter,reconciler,status,status-cli}.mjs and rendering/{dev-sql-tenant-contract,dev-sql-tenant-grants}.mjs: common native resource/ACL operations candidates; keep slot derivation, ownership, schema gate and consumer-specific migration lifecycle. Existing baseline mutation moves only after platform bootstrap/maintenance is proven. Need inspect full adapters and actual privilege history before replacing. No implicit password regeneration.
- infra/platform/postgres/temporal-persistence/{prepare.mjs,resources.yaml}: keep dedicated policy and accepted fresh-only behavior. prepareFreshTemporalPersistence uses pinned operator/Cluster verification, native objects, psql local admin and actual auth, resourceVersion and Secret revision. Extract only proven common helpers after comparison, not rewrite whole recent Temporal implementation. Temporal installer consumer and tests must pass.
- infra/environments/release/credentials.mjs and install.sh, migration.mjs, infra/workloads/chart/templates/_helpers.tpl: release currently projects lab-pg-app owner URI into migration and runtime. Separate privilege cutover is an intentional independent behavior change, NOT necessary to consolidate baseline installer. Preserve existing endpoint and DB; separately authorize ACL/credential migration. Existing app owner remains migration candidate.
- infra/verification/dev-environments/dev-sql-tenant-{trial,migrate-trial,negative-helpers}.mjs: preserve proof and update only after actual path mapping. tools/verification/resources/postgres Docker-based verification is separate from Kind CNPG; don't rewrite it.
- Root package scripts, diagnostics, path-move assertions, old archived Changes and current canonical runbook: exact references still need exhaustive search. No deleting files until caller and test closure proven.

## Test obligations observed

infra/platform/postgres/tests/topology.test.mjs has tests for aligned topology, observed count reuse, strict flags, CAS patch, ownership, scale-down, memory, unknown patch result, bounded wait, owned create/reuse/scale and partial failure. Preserve behaviors, improve unknown outcome and UID fence tests. release-install.test.mjs tests observed >default count, no apply on reuse, missing/foreign/unreadable, pin, readiness, CRD absent/unreadable. Port to shared matrix dev/release. Existing render/readiness/Temporal/presentation tests and environment platform-plan.test.mjs / common commands/render tests remain regression gates. Source test names inspected, not executed or certified. Add fresh operator inventory partial, webhook/CRD readiness, create collision/unknown, no write on reuse, both contexts, live compatibility drift and credential-safe output cases.

## Proposed execution separation

1. Common observation/install/topology primitives and thin compatible adapters. Maintain source identities and no security/tuning behavior changes except deliberate safety corrections; native Helm render stays.
2. Explicit baseline ACL lifecycle and narrowly scoped consumer provisioning consolidation after disposable proof. Keep existing tenants and Temporal. 
3. Capacity changes (Temporal bounded pools, PostgreSQL settings) based on measurement; independent of structural consolidation.
4. Release runtime role separation with existing-data cutover and migration privilege proof. Not a hidden requirement for completing installer renewal.

These are candidate slices, not commissioned packets; convergence decides direct implementation vs bounded agent. Avoid combining security migration, database sizing and structural replacement in one opaque live operation.

## Remaining proof / scope limit

This audit supports the main structural direction, but not an exhaustive deletion list. Need exact import/reference search and complete remaining tenant/owned-topology internals before editing, determine common lock and admission behavior, inspect migration journal and privilege transactions, and verify pinned compatibility. No claims of complete source audit or test PASS. Round 8 should explicitly challenge the target and prepare bounded owner-operated read-only/disposable experiments. Do not require user terminal while at gym. 
