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
