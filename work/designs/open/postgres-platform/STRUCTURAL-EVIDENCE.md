# Structural evidence register | next defense

2026-11-26. No live cluster access, kubectl or Helm here. Container DNS could not resolve github.com; web asset fetch disabled; release metadata available from prior designer. No source test suite run. Proposed experiments below are NOT RUN unless explicitly recorded.

## Observations

- Recursive tree at 4ad78067 truncated=false. Main de2d42f9 only methodology/index changes since source 73b31540. GitHub code search incomplete_results=true despite known references; no exhaustive closure.
- Actual platform-plan.mjs::defaultPlatformRunner ordinary timeout 600000; cluster-readiness.mjs readiness 600000 alone; dev adapter also CRD180s/rollout240s/SQL480s. Both existing executors retry Cluster apply up to 12 times. Release shell runs Node without exec and wraps volume/loopback guard. Source findings, not observed runtime failure.
- Existing dev registry lock inherits fd 3 into flock. Sandbox Linux Node v22.16.0, util-linux flock 2.41.5: opened private temp file a+, flock -w 1 -x 3 with stdio fd; spawnSync Node child with fd at index 3. Competing flock exit 1 while parent+child alive; parent SIGKILL, competitor exit 1 while child alive; child SIGKILL, competitor exit 0. Separate direct child timeout 350ms killSignal SIGKILL: status null, signal SIGKILL, error ETIMEDOUT, elapsed 415ms including startup; competitor exit 0 afterwards. Actual primitive experiment, not target kubectl/Node24.19/WSL/API proof.
- Tagged [CNPG defaulting](https://github.com/cloudnative-pg/cloudnative-pg/blob/v1.30.2/api/v1/cluster_defaults.go), [webhook](https://github.com/cloudnative-pg/cloudnative-pg/blob/v1.30.2/internal/webhook/v1/cluster_webhook.go), [default kustomization](https://github.com/cloudnative-pg/cloudnative-pg/blob/v1.30.2/config/default/kustomization.yaml), [API 1.30](https://cloudnative-pg.io/docs/1.30/cloudnative-pg.v1/), [SSA](https://kubernetes.io/docs/reference/using-api/server-side-apply/), [flock(2)](https://man7.org/linux/man-pages/man2/flock.2.html), read 2026-11-26. Defaults include config-dependent PG parameters, monitoring, plugins, replication slots and probes; source evidence not runtime proof.

## E1: exact artifact inventory (read-only, no cluster)

In design checkout with existing root dependencies, private temp dir; official pinned URL and hash only.

```bash
set -euo pipefail
work="$(mktemp -d)"
trap 'rm -rf "$work"' EXIT
pin=infra/platform/postgres/operator.pin
url="$(sed -n 's/^CNPG_URL=//p' "$pin")"
sha="$(sed -n 's/^CNPG_SHA256=//p' "$pin")"
curl -fL --max-time 120 --output "$work/operator.yaml" "$url"
printf '%s  %s\n' "$sha" "$work/operator.yaml" | sha256sum -c -
node --input-type=module - "$work/operator.yaml" <<'NODE'
import { readFileSync } from 'node:fs';
import { parseAllDocuments } from 'yaml';
const scopes = new Map([
  ['v1/Namespace', false], ['v1/ServiceAccount', true],
  ['v1/ConfigMap', true], ['v1/Service', true],
  ['apps/v1/Deployment', true],
  ['rbac.authorization.k8s.io/v1/ClusterRole', false],
  ['rbac.authorization.k8s.io/v1/ClusterRoleBinding', false],
  ['apiextensions.k8s.io/v1/CustomResourceDefinition', false],
  ['admissionregistration.k8s.io/v1/MutatingWebhookConfiguration', false],
  ['admissionregistration.k8s.io/v1/ValidatingWebhookConfiguration', false],
]);
const ids = new Set();
for (const doc of parseAllDocuments(readFileSync(process.argv[2], 'utf8'))) {
  if (doc.errors.length || doc.warnings.length) throw Error('invalid YAML');
  const x = doc.toJS();
  if (x == null) continue;
  const kind = x.apiVersion + '/' + x.kind;
  if (!scopes.has(kind)) throw Error('unexpected kind: ' + kind);
  const ns = x.metadata?.namespace ?? '';
  if ((scopes.get(kind) && ns !== 'cnpg-system') ||
      (!scopes.get(kind) && ns !== '') ||
      !x.metadata?.name) throw Error('bad identity/scope');
  const id = [kind, ns || '(cluster)', x.metadata.name].join(' ');
  if (ids.has(id)) throw Error('duplicate identity: ' + id);
  ids.add(id);
  if (x.kind === 'Deployment' &&
      !x.spec?.template?.spec?.containers?.some(c =>
        c.image === 'ghcr.io/cloudnative-pg/cloudnative-pg:1.30.2'))
    throw Error('operator image mismatch');
}
if (!ids.size) throw Error('empty inventory');
console.log([...ids].sort().join('\n'));
console.log('inventory count:', ids.size);
NODE
```

Hash and exact GVK/ns/name list resolve source-derived 26-doc hypothesis. Unexpected kind or mismatch blocks policy. No need to paste 1.3MB; capture verified bytes later before implementation.

## E2: target custody (non-cluster)

Actual repo Node, flock, kubectl. Private empty kubeconfig, HTTP fixture bound 127.0.0.1 ephemeral port, hold GET response. Worker opens lock, flock fd3, direct spawnSync kubectl --kubeconfig <private-empty-config> --server=http://127.0.0.1:<port> --request-timeout=5s get --raw=/custody with fd3, bounded timeout/SIGKILL. Fixture records request arrival; parent tests nonblocking competing flock, kills only fixture worker, competitor must still refuse while actual kubectl lives. Release response, competitor succeeds after child exits. Repeat direct timeout, lock-wait exhaustion and outer parent kill. Verify child identity and fd via /proc; cleanup only fixture-owned processes/temp/socket; bound all waits. No cluster credentials, mutation or ambient context. If kubectl closes fd, redesign custody, do not assert lock covers orphan. Test PostgreSQL-only outer timeout/killSignal and release exec path with fake runner. Record actual versions/results. No real executable proof here.

## E3: native operation/defaulting (separate disposable authorization)

Do not run on existing dev/release. Separately authorized disposable Kind context matching supported node/API version, exact artifact/profile. Capture trusted admission dry-run Cluster and actual fresh GET spec; exact operator config, CRD/defaults, approved normalized typed fixture; no secrets. Identify API/CNPG defaults, dynamic CA/Service allocations, actual primary Pod owner relation and RW EndpointSlice. Verify local writable SQL predicate; not tenant auth proof.

Discriminating matrix: fresh all absent → SSA once then create-only baseline, ready same UIDs; healthy reuse → zero persistent writes/live count preserved; partial CRD/RBAC/Deployment → refuse ordinary ensure, explicit reviewed missing-only recovery preserves present UIDs/fields; foreign RBAC/webhook/CRD/image/unreadable → no writes; create collision/lost response → stop, no retry; same-name UID replacement/primary change → no stale ready; extra HBA/superuser/plugin/sidecar → refuse; equivalent quantities and count drift → reuse; guard/lock/outer/inner timeout → nonzero and truthful unknown. Fault injection with controlled runner/API fixture first. No destruction of existing Cluster. Report version mismatch without silent upgrade.

## E4: tracked caller/receipt closure (read-only)

Use immutable source SHA, no checkout switch:

```bash
git grep -n -E 'dev-bootstrap\.mjs|dev-host-probe\.mjs|release-install\.mjs|bootstrap/(dev-plan|release-plan|dev-execution|release-execution|release-observation|observation-helpers)\.mjs|cluster-readiness\.mjs|dev-cnpg-bootstrap-cli\.mjs|platform/postgres/install\.sh' 73b3154025e94ad2f827cdb03eda4b389e19ac35 --
git grep -n -E 'collectDevCnpgProbe|collectReleaseCnpgProbe|executeAuthorized(Dev|Release)Cnpg|ensure(Dev|Release)Cnpg|observeDevPostgresReady|waitForCnpgClusterReadiness|apply-namespace|apply-cluster|verify-operator|operator-manifest-sha-mismatch|OFFSCREEN_DEV_CNPG_ENSURE|OFFSCREEN_DEV_CNPG_PROBE' 73b3154025e94ad2f827cdb03eda4b389e19ac35 --
```

Review executable callers versus historical docs; exact path/symbol/test/receipt mapping including dynamic paths. No retirement or silent action contract change. After later implementation focused tests, parsed render parity, no writes on reuse, unknown/UID fence, root CLI, tenant/Temporal regressions. All NOT RUN.

## Owner terminal workshop receipts | 2026-11-26

Owner executed commands in WSL main checkout; no checkout switch or persistent Kubernetes mutation. Node 24.19.0, kubectl 1.37.2, Kustomize 5.8.1, Helm 3.22.1, flock 2.39.3. These observations supersede earlier NOT RUN statements only for the specific experiments below.

- E1: official v1.30.2 release download 1267 KiB, SHA256 matched pin ea4cc355b394e10661d30c6b409cefb19029dd973bccb76b1ed8c789985bc68c. YAML parsed without duplicate identities: 26 objects, 11 CRDs (backups, clusterimagecatalogs, clusters, databaseroles, databases, failoverquorums, imagecatalogs, poolers, publications, scheduledbackups, subscriptions, all postgresql.cnpg.io), 7 ClusterRoles (cnpg-manager, cnpg-{database,publication,subscription}-{editor,viewer}-role), ClusterRoleBinding cnpg-manager-rolebinding, cnpg-mutating-webhook-configuration and cnpg-validating-webhook-configuration, Namespace cnpg-system, Deployment cnpg-controller-manager, ConfigMap cnpg-default-monitoring, Service cnpg-webhook-service, ServiceAccount cnpg-manager; last four namespaced cnpg-system. Exact inventory and hash PASS; owner parser did not separately inspect manifest image or explicitly assert scope table; vendor bytes not committed yet.
- E2: actual kubectl GET /custody to temporary loopback HTTP server, private empty kubeconfig, inherited lock fd3 via Node spawnSync, flock -x -w 2 3. Held request; competing flock before worker SIGKILL=1, after SIGKILL=1, after HTTP response=0. Core custody observed on target host. /proc inspection, lock-wait exhaustion, inner deadline, outer deadline and release exec path remain NOT RUN. Does not establish server-side request cancellation.
- E3 existing dev/release observations: both operator Deployment image ghcr.io/cloudnative-pg/cloudnative-pg:1.30.2. dev-pg offscreen-dev-postgres 1/1 Ready, generation 1; lab-pg lab-postgres 2/2 Ready, generation 2. Current primary names dev-pg-1 and lab-pg-1. Both EndpointSlices ready=true, serving=true, terminating=false, exact Pod namespace/name/UID targetRef; later GET Pod UID matched, controller ownerReference Cluster name and UID matched live Cluster, Running and Ready=True. Namespace UIDs available. Local postgres container psql -X -U postgres -d postgres -v ON_ERROR_STOP=1 -Atc "SELECT NOT pg_is_in_recovery() AND current_setting('transaction_read_only') = 'off';" returned t both. Individual predicates observed, not atomic observation or revalidation proof.
- E3 admission: owner current checkout renderer node infra/platform/common/cli.mjs render postgres {dev,release} cluster piped to kubectl create --dry-run=client -o json, jq rename metadata.name to design-admission-probe, kubectl create --dry-run=server -o json on explicit respective context. Sorted .spec compared to live GET .spec. Dev empty diff; release sole difference instances desired 1/live 2. Strong support for trusted full typed normalized reference with explicit topology exception; not independent trusted clean fixture, frozen baseline parity, full operator object comparison, fresh install, failure/recovery or negative drift proof. No persistent writes.
- E4 owner git grep both original patterns plus platform/postgres|DEV_CNPG_|RELEASE_CNPG_ on immutable 73b3154025e94ad2f827cdb03eda4b389e19ac35. Executable families identified: infra/environments/{infra-cli,platform-plan,release/credentials}.mjs; infra/platform/postgres/{dev-bootstrap,dev-host-probe,release-install,readiness,cluster-readiness,config,topology,topology-cli}.mjs, topology/{baseline,model,observation,owned}.mjs and temporal-persistence/prepare.mjs; tools/dev-environments/src/adapters/{dev-cnpg-bootstrap-cli,dev-slot-migrate,dev-sql-catalog-probe,dev-sql-tenant-executor,dev-sql-tenant-live-adapter,dev-sql-tenant-status}.mjs, application/dev-shared-core-readiness.mjs, rendering/{dev-slot-app-graph,dev-slot-project,dev-sql-tenant-contract}.mjs; package.json infra:postgres; infra/verification/{diagnostic,verify}.mjs and smoke/postgres/smoke.sh; source/test/volume-guard.test.mjs and scripts/repo-tools/infra-layout.test.mjs. Tests include postgres readiness/render/release-install/topology/temporal-persistence, environment platform-plan/infra-cli, dev-environments dev-cnpg-bootstrap/dev-slot-project. Runbook docs/runbooks/kubernetes-postgres.md needs updated install/recovery contracts. Preserve paths, constants, authorization env, injected probe test-only behavior, topology and tenant interfaces; old apply-namespace/apply-cluster action assertions require intentional migration to create semantics, not misleading action receipts. Catalog probe line 29 and live tenant adapter line 38 default/hardcode dev-pg-1: separate tenant/topology issue, do not expand bootstrap scope. Tracked search complete for these patterns, detailed receipt/export mapping and dynamic-path closure still require designer reconciliation. No implementation or tests run.

Next gate: separately authorized isolated disposable Kind proof, with memory admission and private kubeconfig, then remaining deadline and exact migration mapping. No independent committee submission yet.

## Disposable laboratory and deadline receipts | 2026-11-26

Owner authorized and created separate Kind offscreen-pg-design-proof with private kubeconfig, existing kindest/node:v1.37.0. Before: 12 GiB available, swap unused; after: 11 GiB available, swap unused. One control-plane Ready, Kubernetes 1.37.0, standard default rancher.io/local-path storage, WaitForFirstConsumer, no volume expansion. Existing dev/release untouched.

- Clean native installation: pinned artifact hash OK; namespace and CNPG CRDs initially absent (not exhaustive preflight); one kubectl apply --server-side -f artifact returned 26 server-side-applied receipts in 585ms, no force or retry. Cluster CRD Established, Deployment rolled out, webhook EndpointSlice port 9443 populated, operator 1/1 Running with zero restarts. Total command 17s. Used kubectl default SSA manager, not final application manager. Native viability observed, not implementation proof.
- Missing-only recovery: snapshot all 26 manifest objects (kind/name/ns/UID/resourceVersion), delete only disposable cnpg-publication-viewer-role, inventory 25, extract exactly one matching ClusterRole doc from pinned bytes and kubectl create it. Inventory 26; only role UID/RV changed (568 to 873); other 25 unchanged, operator remains available with same Pod and zero restarts. Establishes this RBAC specimen only; arbitrary CRD/Deployment/webhook recovery not verified and must not be silently automated.
- Fresh dev: current checkout renderer emitted Namespace and Cluster; native create Namespace; server dry-run create captured .spec; native create Cluster; Ready in 55.672s; actual sorted spec exactly equals dry-run; one healthy primary, 2Gi Bound standard PVC, RW endpoint port 5432, local writable SQL t; 11 GiB available. No retry or apply of durable resource.
- Collision: second native create Namespace and Cluster each returned AlreadyExists; before/after Cluster UID/generation/spec diff empty. Namespace UID not separately snapshotted. Inventory 26. Native collision behavior observed, not ambiguous transport outcome proof.
- Trusted reference: dev full admitted spec pasted by owner; release dry-run on same pinned operator after create release Namespace, diff exactly eight scalar fields (database, owner, max_connections, shared_buffers, memory request/limit, storage size/class). See admission-dev.json and admission-release.json in this dossier, transcription of owner outputs; release reconstructed from exact diff. Current checkout renderer not proven equal to frozen baseline yet; release no actual Cluster created (local-path class absent in lab). Fixtures are evidence specimens, not approved implementation policy yet.
- Challenges via server dry-run only: instances=2 differs only count; enableSuperuserAccess=true visible; pg_hba=["host all all 0.0.0.0/0 trust"] visible, accepted by CNPG; memory limit 1024Mi normalized to 1Gi (empty diff). Expected comparator verdicts compatible/refuse/refuse/compatible; comparator NOT implemented or tested. No insecure Cluster persisted.
- E2 target deadline: private empty kubeconfig and hanging loopback HTTP server, actual Node24.19/kubectl1.37.2/flock2.39.3. Competing flock -w 1 returned 1 after 1002ms; direct kubectl timeout 1500ms with SIGKILL returned status null, signal SIGKILL, error ETIMEDOUT, elapsed 1505ms; after closing owner fd competing flock -n returned 0. Together with prior parent-kill receipt establishes primitive custody/deadline behavior. Outer actual runner/exec trampoline composition and unknown API outcome still unimplemented, not proven.
- Remaining: exact operator normalized per-kind comparison reference, missing-only recovery scope, frozen render parity, final export/receipt/test mapping and deadline composition design; then self-defense. Negative cases for future implementation must remain explicit acceptance gates. Disposable cluster still exists awaiting owner cleanup. No production code edits or existing-cluster mutations.

## Final operator semantic snapshot | 2026-11-26

Owner recreated operator-only disposable Kind proof (47s command), verified original artifact, native SSA once, rollout successful, captured 26 full objects per proof/dev/release. Uploaded archive 746390 bytes inspected directly. Python safe YAML/JSON parse and recursive typed diff: exact artifact digest matches pin, 26 identities each, 23/26 exact after top-level status and five server metadata keys removed; remaining three differ only 9 certificate values and two Service IP leaves per environment. All 33 CRDs Established/NamesAccepted, all three Deployment Available, no termination. All 9 certificate bundles per environment decode to same single leaf certificate (CA=false), exact webhook DNS SAN; validity windows recorded in OPERATOR-COMPATIBILITY.md. Vendor-to-clean diff only explicit default/controller additions recorded there. No actual comparator or composed runner executed. No raw live inventory committed. Existing clusters read only. Proof cluster exists awaiting explicit owner cleanup.
