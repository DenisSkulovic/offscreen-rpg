import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { parse as parseYaml, stringify as stringifyYaml } from 'yaml';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => readFileSync(join(root, p), 'utf8');
const load = () => ({
  base: parseYaml(read('values/prometheus.yaml')),
  overlay: parseYaml(read('values/profiles/dev/prometheus.yaml')),
  coverage: JSON.parse(read('coverage/inventory.json')),
  lock: read('locks/e2-images.tsv'),
  redisCoverage: JSON.parse(read('coverage/redis.json')),
});
const clone = (v) => structuredClone(v);

// Frozen family/label table (NATIVE-INPUTS "G1 KSM construction freeze"). The last row is the self family.
const FROZEN = [
  ["kube_namespace_status_phase", ["namespace", "phase"]],
  ["kube_node_status_condition", ["condition", "node", "status"]],
  ["kube_node_status_capacity", ["node", "resource", "unit"]],
  ["kube_node_status_allocatable", ["node", "resource", "unit"]],
  ["kube_pod_status_phase", ["namespace", "phase", "pod", "uid"]],
  ["kube_pod_status_ready", ["condition", "namespace", "pod", "uid"]],
  ["kube_pod_status_scheduled", ["condition", "namespace", "pod", "uid"]],
  ["kube_pod_owner", ["namespace", "owner_is_controller", "owner_kind", "owner_name", "pod", "uid"]],
  ["kube_pod_container_status_ready", ["container", "namespace", "pod", "uid"]],
  ["kube_pod_container_status_restarts_total", ["container", "namespace", "pod", "uid"]],
  ["kube_pod_container_status_last_terminated_reason", ["container", "namespace", "pod", "reason", "uid"]],
  ["kube_pod_container_resource_requests", ["container", "namespace", "node", "pod", "resource", "uid", "unit"]],
  ["kube_pod_container_resource_limits", ["container", "namespace", "node", "pod", "resource", "uid", "unit"]],
  ["kube_deployment_spec_replicas", ["deployment", "namespace"]],
  ["kube_deployment_status_replicas_ready", ["deployment", "namespace"]],
  ["kube_deployment_status_replicas_available", ["deployment", "namespace"]],
  ["kube_replicaset_spec_replicas", ["namespace", "replicaset"]],
  ["kube_replicaset_status_ready_replicas", ["namespace", "replicaset"]],
  ["kube_replicaset_owner", ["namespace", "owner_is_controller", "owner_kind", "owner_name", "replicaset"]],
  ["kube_statefulset_replicas", ["namespace", "statefulset"]],
  ["kube_statefulset_status_replicas_ready", ["namespace", "statefulset"]],
  ["kube_daemonset_status_desired_number_scheduled", ["daemonset", "namespace"]],
  ["kube_daemonset_status_number_ready", ["daemonset", "namespace"]],
  ["kube_persistentvolumeclaim_status_phase", ["namespace", "persistentvolumeclaim", "phase"]],
  ["kube_persistentvolumeclaim_resource_requests_storage_bytes", ["namespace", "persistentvolumeclaim"]],
  ["kube_persistentvolumeclaim_info", ["namespace", "persistentvolumeclaim", "storageclass", "volumemode", "volumename"]],
  ["kube_persistentvolume_status_phase", ["persistentvolume", "phase"]],
  ["kube_persistentvolume_capacity_bytes", ["persistentvolume"]],
  ["kube_persistentvolume_claim_ref", ["claim_namespace", "name", "persistentvolume"]],
  ["kube_state_metrics_watch_total", ["resource", "result"]]
];
const REDIS_FAMILIES = ['redis_up', 'redis_memory_used_bytes', 'redis_keyspace_hits_total', 'redis_keyspace_misses_total', 'redis_evicted_keys_total', 'redis_connected_clients', 'redis_commands_processed_total'];
const REDIS_ARGS = ['--redis.addr=redis://redis.offscreen-dev-redis.svc:6379', '--disable-scrape-endpoint', '--config-command=-', '--disable-exporting-key-values', '--export-client-list=false', '--check-keys=', '--check-single-keys=', '--check-streams=', '--exclude-slowlog-metrics', '--exclude-commandlog-metrics'];
const REDIS_FROZEN_IMAGE = 'docker.io/oliver006/redis_exporter@sha256:d16780dcfefc6e42f48682ecc5fbd6dd3207938b1ee88f766b838436a4e27e6e';
const REDIS_PIN = /^docker\.io\/oliver006\/redis_exporter@sha256:[0-9a-f]{64}$/;
const SELF_FAMILIES = ['kube_state_metrics_watch_total', 'kube_state_metrics_list_total'];
const OBJECT_FAMILIES = FROZEN.filter(([n]) => n !== 'kube_state_metrics_watch_total').map(([n]) => n);
const OBJECT_LABELS = [...new Set(FROZEN.filter(([n]) => n !== 'kube_state_metrics_watch_total').flatMap(([, l]) => l))];
const BASE_LABELS = ['__name__', 'job', 'instance', 'cluster', 'env', 'component'];
const COLLECTORS = ['nodes', 'namespaces', 'pods', 'deployments', 'replicasets', 'statefulsets', 'daemonsets', 'jobs', 'persistentvolumeclaims', 'persistentvolumes'];
const PIN = /^registry\.k8s\.io\/kube-state-metrics\/kube-state-metrics@sha256:[0-9a-f]{64}$/;
const sameSet = (a, b) => a.length === b.length && new Set(a).size === a.length && [...a].sort().join() === [...b].sort().join();
const split = (r) => String(r).split('|');

const KUBELET_JOBS = ['kubelet-resource', 'kubelet-cadvisor'];
const KUBELET_MANIFEST_COUNT = 3;
const TRUST_SENTINEL = { binding: 'b'.repeat(64), ca: 'ca-under-test' };
/** Parse one extraManifests string; the two trust ConfigMap Helm expressions are replaced by fixed sentinels. */
function parseManifest(m) {
  const text = String(m)
    .replace(/\{\{ required "[^"]*bindingSha256[^"]*" [^}]*\}\}/, JSON.stringify(TRUST_SENTINEL.binding))
    .replace(/\{\{ required "[^"]*caPem[^"]*" [^}]*\}\}/, JSON.stringify(TRUST_SENTINEL.ca))
    .replaceAll('{{ .Release.Namespace }}', 'ns-under-test');
  return parseYaml(text);
}

/** Effective enabled scrape jobs after helm map-merge of base scrapeConfigs and the overlay. */
function mergedJobs({ base, overlay }) {
  const merged = { ...(base.scrapeConfigs ?? {}) };
  for (const [k, v] of Object.entries(overlay.scrapeConfigs ?? {})) merged[k] = { ...(merged[k] ?? {}), ...v };
  return Object.entries(merged).filter(([, v]) => v.enabled !== false).map(([k, v]) => ({ key: k, ...v, name: v.job_name || k }));
}

function jobProblems(job, { host = 'obs-kube-state-metrics', port, families, labels, sampleLimit, component }) {
  const p = [];
  const eq = (f, v) => { if (JSON.stringify(job[f]) !== JSON.stringify(v)) p.push(`${job.name}.${f}`); };
  eq('metrics_path', '/metrics');
  eq('scrape_interval', '30s');
  eq('scrape_timeout', '10s');
  eq('sample_limit', sampleLimit);
  eq('label_limit', 40);
  eq('label_name_length_limit', 128);
  eq('label_value_length_limit', 512);
  eq('target_limit', 1);
  const sc = job.static_configs;
  if (!Array.isArray(sc) || sc.length !== 1 || !sameSet(sc[0].targets ?? [], [`${host}:${port}`])) p.push(`${job.name}.targets`);
  else if (JSON.stringify(Object.keys(sc[0].labels ?? {}).sort()) !== '["cluster","component","env"]' || sc[0].labels.component !== component) p.push(`${job.name}.labels`);
  const mr = job.metric_relabel_configs ?? [];
  const keep = mr.find((r) => r.action === 'keep' && JSON.stringify(r.source_labels) === '["__name__"]');
  const lk = mr.find((r) => r.action === 'labelkeep');
  if (mr.length !== 2 || !keep || !lk) p.push(`${job.name}.metric_relabel_configs`);
  else {
    if (!sameSet(split(keep.regex), families)) p.push(`${job.name}.family-allowlist`);
    if (!sameSet(split(lk.regex), [...BASE_LABELS, ...labels])) p.push(`${job.name}.label-allowlist`);
  }
  return p;
}

/** Pure validator for the overlay; returns a list of problems (empty means valid). */
function validateOverlay(cfg) {
  const p = [];
  const ksm = cfg.overlay['kube-state-metrics'] ?? {};
  if (ksm.enabled !== true) p.push('ksm-not-enabled');
  if (!Array.isArray(ksm.collectors) || !sameSet(ksm.collectors, COLLECTORS)) p.push('collectors');
  for (const k of ['metricLabelsAllowlist', 'metricAnnotationsAllowList']) if (ksm[k] === undefined || ksm[k].length !== 0) p.push(`allowlist:${k}`);
  if (ksm.prometheusScrape !== false) p.push('prometheusScrape');
  const jobs = mergedJobs(cfg);
  const names = jobs.map((j) => j.name);
  if (new Set(names).size !== names.length) p.push('duplicate-job');
  const targets = jobs.flatMap((j) => (j.static_configs ?? []).flatMap((s) => s.targets ?? []));
  if (new Set(targets).size !== targets.length) p.push('duplicate-target');
  if (!sameSet(names, ['prometheus', 'collector', 'kube-state-metrics', 'kube-state-metrics-self', 'redis-exporter', ...KUBELET_JOBS])) p.push('job-set');
  for (const j of jobs) {
    if (KUBELET_JOBS.includes(j.name)) continue; // exact node-discovery shape is asserted by validateKubeletJobs
    if (j.kubernetes_sd_configs || (j.relabel_configs ?? []).some((r) => r.action === 'labelmap' || /annotation/.test(JSON.stringify(r)))) p.push(`generic-job:${j.name}`);
  }
  if (cfg.overlay.extraScrapeConfigs) p.push('extraScrapeConfigs');
  const byName = Object.fromEntries(jobs.map((j) => [j.name, j]));
  if (byName['kube-state-metrics']) p.push(...jobProblems(byName['kube-state-metrics'], { port: 8080, families: OBJECT_FAMILIES, labels: OBJECT_LABELS, sampleLimit: 20000, component: 'kubernetes-inventory' }));
  if (byName['kube-state-metrics-self']) p.push(...jobProblems(byName['kube-state-metrics-self'], { port: 8081, families: SELF_FAMILIES, labels: ['resource', 'result'], sampleLimit: 5000, component: 'kubernetes-inventory-health' }));
  if (byName['redis-exporter']) p.push(...jobProblems(byName['redis-exporter'], { host: 'obs-redis-exporter', port: 9121, families: REDIS_FAMILIES, labels: [], sampleLimit: 5000, component: 'redis' }));
  const rj = byName['redis-exporter'];
  if (rj && (rj.scheme !== 'http' || rj.honor_labels !== false || rj.relabel_configs || rj.kubernetes_sd_configs || rj.params)) p.push('redis-job-shape');
  // Existing jobs keep their base semantics.
  if (JSON.stringify(byName.collector?.static_configs) !== JSON.stringify([{ targets: ['obs-collector:8888'] }])) p.push('collector-changed');
  if (Object.keys(cfg.overlay.scrapeConfigs ?? {}).some((k) => !['kube-state-metrics', 'kube-state-metrics-self', 'redis-exporter', ...KUBELET_JOBS].includes(k))) p.push('overlay-extra-job');
  p.push(...validateKubeletJobs(cfg), ...validateKubeletServer(cfg.overlay), ...validateKubeletManifests(cfg.overlay));
  return p;
}

function validateLock(text, overlay) {
  const lines = text.split('\n').filter(Boolean);
  const p = [];
  if (lines[0] !== 'role\timmutable-reference') p.push('lock-header');
  const row = lines.slice(1).find((l) => l.startsWith('kube-state-metrics\t'));
  if (!row) return [...p, 'lock-row'];
  const ref = row.split('\t')[1];
  if (!PIN.test(ref ?? '')) return [...p, 'lock-pin'];
  const sha = overlay['kube-state-metrics']?.image?.sha;
  if (!sha || !ref.endsWith(`@${sha}`)) p.push('lock-overlay-mismatch');
  return p;
}

/** Redis exporter: lock row must be the digest pin and equal the Deployment image. Not part of validateLock to keep the KSM contract stable. */
function validateRedisLock(text, overlay) {
  const rows = text.split('\n').filter((l) => l.startsWith('redis-exporter\t'));
  if (rows.length !== 1) return ['redis-lock-row'];
  const ref = rows[0].split('\t')[1] ?? '';
  const p = [];
  if (!REDIS_PIN.test(ref) || ref !== REDIS_FROZEN_IMAGE) p.push('redis-lock-pin');
  const c = redisManifests(overlay).deployment?.spec?.template?.spec?.containers?.[0];
  if (!c || c.image !== ref) p.push('redis-lock-deployment-mismatch');
  return p;
}

function redisManifests(overlay) {
  const docs = (overlay.extraManifests ?? []).map(parseManifest);
  const named = docs.filter((d) => d?.metadata?.name === 'obs-redis-exporter');
  return { all: docs, deployment: named.find((d) => d.kind === 'Deployment'), service: named.find((d) => d.kind === 'Service'), count: named.length };
}

/** Exporter Deployment and Service contract frozen by OBS-E2-05 T01. */
function validateRedisManifests(overlay) {
  const p = [];
  const { all, deployment: d, service: s, count } = redisManifests(overlay);
  // 02/05 shape: the two exporter objects plus exactly the three OBS-E2-03 kubelet objects (validateKubeletManifests owns those).
  if (all.length !== 2 + KUBELET_MANIFEST_COUNT || count !== 2 || !d || !s) return ['redis-manifest-set'];
  if (d.metadata.namespace !== 'ns-under-test' || s.metadata.namespace !== 'ns-under-test') p.push('redis-namespace');
  const spec = d.spec?.template?.spec ?? {};
  const cs = spec.containers ?? [];
  if (cs.length !== 1 || cs[0].name !== 'redis-exporter') return [...p, 'redis-containers'];
  const c = cs[0];
  if ((spec.initContainers ?? []).length || (spec.ephemeralContainers ?? []).length) p.push('redis-extra-containers');
  if (c.image !== REDIS_FROZEN_IMAGE) p.push('redis-image-pin');
  if (JSON.stringify(c.args) !== JSON.stringify(REDIS_ARGS)) p.push('redis-args');
  if (spec.automountServiceAccountToken !== false || spec.serviceAccountName || (spec.volumes ?? []).length || (c.volumeMounts ?? []).length) p.push('redis-token-or-volume');
  if (spec.hostNetwork || spec.hostPID || spec.hostIPC || (c.ports ?? []).some((x) => x.hostPort) || JSON.stringify(spec).includes('hostPath')) p.push('redis-host-access');
  if (JSON.stringify(c.ports) !== JSON.stringify([{ name: 'metrics', containerPort: 9121, protocol: 'TCP' }])) p.push('redis-ports');
  if (c.env || c.envFrom || c.command) p.push('redis-env-command');
  if (JSON.stringify(c.resources) !== JSON.stringify({ requests: { cpu: '50m', memory: '64Mi' }, limits: { memory: '128Mi' } })) p.push('redis-resources');
  if (s.spec?.type !== 'ClusterIP' || s.spec.clusterIP || s.spec.externalIPs || s.spec.loadBalancerIP || (s.spec.ports ?? []).length !== 1 || s.spec.ports[0].port !== 9121 || s.spec.ports[0].nodePort) p.push('redis-service');
  return p;
}

// ---- OBS-E2-03: frozen kubelet jobs, trust mount and RBAC (NATIVE-INPUTS "G2 construction freeze") ----
const canon = (v) => JSON.stringify(v, (_k, x) => (x && typeof x === 'object' && !Array.isArray(x) ? Object.fromEntries(Object.entries(x).sort(([a], [b]) => (a < b ? -1 : 1))) : x));
const KUBELET_NODE_RE = '^(offscreen-dev-control-plane|offscreen-dev-worker)$';
const RESOURCE_FAMILIES = ['node_cpu_usage_seconds_total', 'node_memory_working_set_bytes', 'pod_cpu_usage_seconds_total', 'pod_memory_working_set_bytes', 'container_cpu_usage_seconds_total', 'container_memory_working_set_bytes'];
const NETWORK_FAMILIES = ['container_network_receive_bytes_total', 'container_network_transmit_bytes_total'];
// The cAdvisor job's `component` label is pinned as T02 wrote it; the coverage row component is `kubelet-cadvisor-network`
// (see receipt: G2 does not state the label value; the 02 convention is label == coverage component).
const CADVISOR_COMPONENT_LABEL = 'kubelet-cadvisor-network';
const kubeletRelabel = (component) => [
  { source_labels: ['__meta_kubernetes_node_name'], regex: KUBELET_NODE_RE, action: 'keep' },
  { source_labels: ['__meta_kubernetes_node_name'], regex: '(.*)', target_label: 'node', replacement: '$1' },
  { source_labels: ['__meta_kubernetes_node_name'], regex: '(.*)', target_label: '__address__', replacement: '$1:10250' },
  { target_label: 'cluster', replacement: 'offscreen-dev' },
  { target_label: 'env', replacement: 'dev' },
  { target_label: 'component', replacement: component },
];
const kubeletJob = (name, path, sampleLimit, component, metricRelabel) => ({
  enabled: true, job_name: name, metrics_path: path, scheme: 'https', scrape_interval: '30s', scrape_timeout: '10s',
  sample_limit: sampleLimit, label_limit: 40, label_name_length_limit: 128, label_value_length_limit: 512, target_limit: 4, honor_labels: false,
  authorization: { credentials_file: '/var/run/secrets/kubernetes.io/serviceaccount/token' },
  tls_config: { ca_file: '/etc/offscreen/kubelet-trust/ca.pem', insecure_skip_verify: false },
  kubernetes_sd_configs: [{ role: 'node' }],
  relabel_configs: kubeletRelabel(component),
  metric_relabel_configs: metricRelabel,
});
const EXPECTED_KUBELET = {
  'kubelet-resource': kubeletJob('kubelet-resource', '/metrics/resource', 5000, 'kubelet-resource', [
    { source_labels: ['__name__', 'namespace', 'pod', 'container'], separator: ';', regex: '(node_cpu_usage_seconds_total|node_memory_working_set_bytes);;;|(pod_cpu_usage_seconds_total|pod_memory_working_set_bytes);[^;]+;[^;]+;|(container_cpu_usage_seconds_total|container_memory_working_set_bytes);[^;]+;[^;]+;[^;]+', action: 'keep' },
    { source_labels: ['__name__', 'container'], separator: ';', regex: 'container_(cpu_usage_seconds_total|memory_working_set_bytes);POD', action: 'drop' },
    { regex: '__name__|job|instance|cluster|env|component|node|namespace|pod|container', action: 'labelkeep' },
  ]),
  'kubelet-cadvisor': kubeletJob('kubelet-cadvisor', '/metrics/cadvisor', 20000, CADVISOR_COMPONENT_LABEL, [
    { source_labels: ['__name__', 'container', 'namespace', 'pod', 'interface'], separator: ';', regex: 'container_network_(receive|transmit)_bytes_total;POD;[^;]+;[^;]+;[^;]+', action: 'keep' },
    { source_labels: ['interface'], regex: 'lo', action: 'drop' },
    { regex: '__name__|job|instance|cluster|env|component|node|namespace|pod|interface', action: 'labelkeep' },
  ]),
};

/** Exactly the two frozen kubelet jobs: fixed node filter and DNS address, SA-token auth, file CA, bounded labels, no generic discovery. */
function validateKubeletJobs(cfg) {
  const p = [];
  const jobs = Object.fromEntries(mergedJobs(cfg).map((j) => [j.name, j]));
  for (const name of KUBELET_JOBS) {
    const j = jobs[name];
    if (!j) { p.push(`${name}.missing`); continue; }
    if (cfg.overlay.scrapeConfigs?.[name] === undefined) p.push(`${name}.not-in-overlay`);
    if (j.tls_config?.insecure_skip_verify !== false) p.push(`${name}.insecure`);
    if (j.tls_config?.ca_file !== '/etc/offscreen/kubelet-trust/ca.pem' || j.tls_config?.ca || j.tls_config?.ca_ref || j.tls_config?.cert_file) p.push(`${name}.ca-reference`);
    if (j.scheme !== 'https') p.push(`${name}.scheme`);
    if (j.proxy_url || j.proxy_from_environment || j.proxy_connect_header || j.follow_redirects || j.static_configs || j.params) p.push(`${name}.proxy-or-target`);
    const rel = j.relabel_configs ?? [];
    if (rel.some((r) => r.action === 'labelmap' || /annotation|label_|pod|service|proxy/.test(JSON.stringify(r)))) p.push(`${name}.arbitrary-metadata`);
    if (rel[0]?.regex !== KUBELET_NODE_RE || JSON.stringify(rel[0]?.source_labels) !== '["__meta_kubernetes_node_name"]') p.push(`${name}.node-filter`);
    if (rel[2]?.target_label !== '__address__' || rel[2]?.replacement !== '$1:10250') p.push(`${name}.address`);
    if (j.metrics_path !== EXPECTED_KUBELET[name].metrics_path) p.push(`${name}.path`);
    if (canon(cfg.overlay.scrapeConfigs?.[name]) !== canon(EXPECTED_KUBELET[name])) p.push(`${name}.frozen-shape`);
  }
  // Each cAdvisor/resource family has exactly one aggregation owner: CPU/RAM only from the resource job, network only from cAdvisor.
  const keepOf = (n) => (jobs[n]?.metric_relabel_configs ?? []).find((m) => m.action === 'keep')?.regex ?? '';
  const res = keepOf('kubelet-resource');
  const cad = keepOf('kubelet-cadvisor');
  if (/cpu|memory|working_set/.test(cad)) p.push('duplicate-cpu-ram-source');
  if (/network/.test(res)) p.push('network-in-resource-job');
  return p;
}

/** Dedicated Prometheus SA: token mount enabled; trust ConfigMap mounted read-only at the fixed path; nothing else under server. */
function validateKubeletServer(overlay) {
  const p = [];
  if (canon(overlay.server) !== canon({ automountServiceAccountToken: true, extraConfigmapMounts: [{ name: 'kubelet-trust', configMap: 'obs-kubelet-trust', mountPath: '/etc/offscreen/kubelet-trust', subPath: '', readOnly: true }] })) p.push('kubelet-server-mount');
  if (canon(overlay.serviceAccounts) !== canon({ server: { create: true, name: 'obs-prometheus' } })) p.push('kubelet-service-account');
  return p;
}

/** Trust ConfigMap (data via two required+quote scalars, never tpl'd, no committed PEM) and the narrow node-only ClusterRole and binding. */
function validateKubeletManifests(overlay) {
  const p = [];
  const raw = overlay.extraManifests ?? [];
  const docs = raw.map((m, i) => ({ m: String(m), d: parseManifest(m), i }));
  const kub = docs.filter(({ d }) => ['obs-kubelet-trust', 'obs-prometheus-kubelet'].includes(d?.metadata?.name));
  if (kub.length !== KUBELET_MANIFEST_COUNT) return ['kubelet-manifest-set'];
  const find = (kind) => kub.filter(({ d }) => d.kind === kind);
  const [cm, cr, crb] = [find('ConfigMap'), find('ClusterRole'), find('ClusterRoleBinding')];
  if (cm.length !== 1 || cr.length !== 1 || crb.length !== 1) return ['kubelet-manifest-set'];
  const eq = (code, a, b) => { if (canon(a) !== canon(b)) p.push(code); };
  eq('kubelet-trust-configmap', cm[0].d, {
    apiVersion: 'v1', kind: 'ConfigMap',
    metadata: { name: 'obs-kubelet-trust', namespace: 'ns-under-test', labels: { 'offscreen.dev/owner': 'offscreen-dev' }, annotations: { 'offscreen.dev/kubelet-trust-binding-sha256': TRUST_SENTINEL.binding } },
    immutable: true, data: { 'ca.pem': TRUST_SENTINEL.ca },
  });
  const t = cm[0].m;
  if ((t.match(/\{\{\s*required /g) ?? []).length !== 2 || (t.match(/\| quote/g) ?? []).length !== 2 || /\btpl\b|BEGIN CERTIFICATE|\.Files|lookup/.test(t)) p.push('kubelet-trust-template');
  eq('kubelet-clusterrole', cr[0].d, {
    apiVersion: 'rbac.authorization.k8s.io/v1', kind: 'ClusterRole', metadata: { name: 'obs-prometheus-kubelet' },
    rules: [{ apiGroups: [''], resources: ['nodes'], verbs: ['get', 'list', 'watch'] }, { apiGroups: [''], resources: ['nodes/metrics'], verbs: ['get'] }],
  });
  eq('kubelet-clusterrolebinding', crb[0].d, {
    apiVersion: 'rbac.authorization.k8s.io/v1', kind: 'ClusterRoleBinding', metadata: { name: 'obs-prometheus-kubelet' },
    roleRef: { apiGroup: 'rbac.authorization.k8s.io', kind: 'ClusterRole', name: 'obs-prometheus-kubelet' },
    subjects: [{ kind: 'ServiceAccount', name: 'obs-prometheus', namespace: 'ns-under-test' }],
  });
  return p;
}

/** Coverage rows for the kubelet jobs: families must be kept by the job; the network row is inventory-only with no panel. */
function validateKubeletCoverage(rows, cfg) {
  const p = [];
  const res = rows.filter((r) => r.component === 'kubelet-resource');
  const net = rows.filter((r) => r.component === 'kubelet-cadvisor-network');
  if (res.length !== 1 || net.length !== 1) return ['kubelet-coverage-rows'];
  const [r] = res;
  const [n] = net;
  const nodeSel = { nodeNames: ['offscreen-dev-control-plane', 'offscreen-dev-worker'] };
  for (const row of [r, n]) if (canon(row.workloadSelector) !== canon(nodeSel) || row.namespace !== null) p.push(`kubelet-selector:${row.component}`);
  if (canon(r.jobs) !== canon(['kubelet-resource']) || r.coverage !== 'enabled' || r.reason !== '') p.push('kubelet-resource-identity');
  if (!sameSet(r.requiredFamilies, RESOURCE_FAMILIES)) p.push('kubelet-resource-families');
  const keep = mergedJobs(cfg).find((j) => j.name === 'kubelet-resource')?.metric_relabel_configs?.find((m) => m.action === 'keep');
  const kept = String(keep?.regex ?? '').match(/[a-z_]+_(?:total|bytes)/g) ?? [];
  if (!sameSet([...new Set(kept)], RESOURCE_FAMILIES)) p.push('kubelet-resource-job-families-equal-coverage');
  const ids = Object.keys(r.panels);
  if (ids.length !== 12 || new Set(ids).size !== 12) p.push('kubelet-panel-count');
  const queries = Object.values(r.panels).map((x) => x.promql);
  if (new Set(queries).size !== queries.length) p.push('kubelet-duplicate-panel-query');
  const allIds = rows.flatMap((x) => Object.keys(x.panels));
  if (new Set(allIds).size !== allIds.length) p.push('panel-id-not-unique');
  for (const [id, x] of Object.entries(r.panels)) {
    const q = x.promql;
    if (!q.includes('job="kubelet-resource"') || /container_network|job="kubelet-cadvisor"/.test(q)) p.push(`kubelet-panel-source:${id}`);
    if (!q.includes('<= 90')) p.push(`kubelet-panel-freshness:${id}`);
    if (!q.includes('up{job="kubelet-resource"} == 1')) p.push(`kubelet-panel-up-gate:${id}`);
    if (/\bor\b|\bunless\b|vector\(/.test(q)) p.push(`kubelet-panel-default-fill:${id}`);
    if (/rate\(/.test(q) && !q.includes('[5m]')) p.push(`kubelet-panel-rate-window:${id}`);
  }
  // Cluster and namespace totals require both current node targets.
  for (const id of ['offscreen-overview/104', 'offscreen-overview/105', 'offscreen-overview/106', 'offscreen-overview/107']) if (!r.panels[id]?.promql.includes('== 2')) p.push(`kubelet-total-needs-both-nodes:${id}`);
  // Network: conditional only, no positive domain coverage.
  if (canon(n.jobs) !== canon(['kubelet-cadvisor']) || n.coverage !== 'inventory-only' || !n.reason || n.requiredFamilies.length !== 0 || Object.keys(n.panels).length !== 0) p.push('kubelet-network-not-conditional');
  const cad = mergedJobs(cfg).find((j) => j.name === 'kubelet-cadvisor')?.metric_relabel_configs?.find((m) => m.action === 'keep')?.regex ?? '';
  if (!NETWORK_FAMILIES.every((f) => new RegExp(`^${cad.split(';')[0]}$`).test(f))) p.push('kubelet-network-families');
  return p;
}

const FIELDS = ['component', 'namespace', 'workloadSelector', 'jobs', 'requiredFamilies', 'panels', 'coverage', 'reason'];
function validateCoverage(rows, cfg) {
  const p = [];
  if (!Array.isArray(rows) || !rows.length) return ['coverage-empty'];
  const comps = rows.map((r) => r.component);
  if (new Set(comps).size !== comps.length) p.push('coverage-duplicate');
  const jobs = Object.fromEntries(mergedJobs(cfg).map((j) => [j.name, j]));
  for (const r of rows) {
    if (JSON.stringify(Object.keys(r).sort()) !== JSON.stringify([...FIELDS].sort())) p.push(`schema:${r.component}`);
    if (typeof r.component !== 'string' || !r.component) p.push('component');
    if (!(r.namespace === null || typeof r.namespace === 'string')) p.push(`namespace:${r.component}`);
    if (!r.workloadSelector || typeof r.workloadSelector !== 'object' || !Object.keys(r.workloadSelector).length) p.push(`selector:${r.component}`);
    if (!['enabled', 'inventory-only', 'not-applicable'].includes(r.coverage)) p.push(`coverage:${r.component}`);
    if (r.coverage !== 'enabled' && !r.reason) p.push(`reason:${r.component}`);
    if (!r.panels || (r.coverage === 'enabled' && !Object.keys(r.panels).length)) p.push(`panels:${r.component}`);
    for (const [id, pn] of Object.entries(r.panels ?? {})) {
      if (!/^offscreen-[a-z-]+\/\d+$/.test(id) || !pn.promql || !pn.unit || !pn.interpretation) p.push(`panel:${id}`);
    }
    if (!r.jobs?.length) p.push(`jobs:${r.component}`);
    for (const jn of r.jobs ?? []) {
      const job = jobs[jn];
      if (!job) { p.push(`unknown-job:${jn}`); continue; }
      const keep = (job.metric_relabel_configs ?? []).find((m) => m.action === 'keep');
      const allowed = keep ? (KUBELET_JOBS.includes(jn) ? (String(keep.regex).match(/[a-z_]+_(?:total|bytes)/g) ?? []) : split(keep.regex)) : [];
      for (const f of r.requiredFamilies ?? []) if (!allowed.includes(f)) p.push(`family-not-allowed:${jn}:${f}`);
    }
  }
  return p;
}

const PANEL_IDS = [701, 702, 703, 704, 705, 706, 707, 708, 709].map((n) => `offscreen-messaging-cache/${n}`);
const UP_OK = 'up{job="redis-exporter"} == 1';
const REDIS_OK = 'redis_up{job="redis-exporter"} == 1';
/** Redis coverage: frozen fields plus the frozen panel semantics (scrape state vs backend state, undefined ratio). */
function validateRedisCoverage(rows, cfg) {
  const p = validateCoverage(rows, cfg);
  if (!Array.isArray(rows) || rows.length !== 1) return [...p, 'redis-row-count'];
  const r = rows[0];
  if (r.component !== 'redis' || r.namespace !== 'offscreen-dev-redis' || r.coverage !== 'enabled' || r.reason !== '') p.push('redis-identity');
  if (JSON.stringify(r.workloadSelector) !== JSON.stringify({ 'app.kubernetes.io/name': 'redis', 'app.kubernetes.io/instance': 'redis' })) p.push('redis-selector');
  if (JSON.stringify(r.jobs) !== '["redis-exporter"]') p.push('redis-jobs');
  if (!sameSet(r.requiredFamilies ?? [], REDIS_FAMILIES)) p.push('redis-families');
  const keep = mergedJobs(cfg).find((j) => j.name === 'redis-exporter')?.metric_relabel_configs?.find((m) => m.action === 'keep');
  if (!keep || !sameSet(split(keep.regex), r.requiredFamilies ?? [])) p.push('redis-job-families-equal-coverage');
  if (!sameSet(Object.keys(r.panels ?? {}), PANEL_IDS)) return [...p, 'redis-panel-ids'];
  const q = (n) => r.panels[`offscreen-messaging-cache/${n}`].promql;
  if (!q(701).includes('up{job="redis-exporter"}') || q(701).includes('redis_up')) p.push('panel-701-scrape');
  if (!q(702).startsWith('redis_up{job="redis-exporter"} and on(job,instance)') || !q(702).includes(UP_OK)) p.push('panel-702-backend-needs-scrape');
  for (let n = 703; n <= 709; n++) {
    if (!q(n).includes(`(${UP_OK})`) || !q(n).includes(`(${REDIS_OK})`)) p.push(`panel-${n}-requires-redis-up`);
    if (!q(n).includes('<= 90')) p.push(`panel-${n}-freshness`);
  }
  if (!q(706).includes('> 0')) p.push('panel-706-undefined-ratio');
  if (/\bor\b|\bunless\b|vector\(/.test(Object.values(r.panels).map((x) => x.promql).join(' '))) p.push('panel-default-fill');
  const units = { 701: 'none', 702: 'none', 703: 'bytes', 704: 'ops', 705: 'ops', 706: 'percentunit', 707: 'ops', 708: 'none', 709: 'ops' };
  for (const [n, u] of Object.entries(units)) if (r.panels[`offscreen-messaging-cache/${n}`].unit !== u) p.push(`panel-${n}-unit`);
  return p;
}

const mutate = (fn) => { const c = load(); const x = clone(c); fn(x); return x; };
const base = load();

test('overlay parses and satisfies the frozen collection contract', () => {
  assert.deepEqual(validateOverlay(base), []);
  assert.deepEqual(validateLock(base.lock, base.overlay), []);
  assert.deepEqual(validateCoverage(base.coverage, base), []);
});

test('two KSM jobs: exact targets, intervals, limits, allowlists', () => {
  const jobs = Object.fromEntries(mergedJobs(base).map((j) => [j.name, j]));
  const o = jobs['kube-state-metrics'];
  const s = jobs['kube-state-metrics-self'];
  assert.deepEqual(o.static_configs[0].targets, ['obs-kube-state-metrics:8080']);
  assert.deepEqual(s.static_configs[0].targets, ['obs-kube-state-metrics:8081']);
  for (const j of [o, s]) {
    assert.equal(j.scrape_interval, '30s');
    assert.equal(j.scrape_timeout, '10s');
    assert.equal(j.label_limit, 40);
    assert.equal(j.label_name_length_limit, 128);
    assert.equal(j.label_value_length_limit, 512);
    assert.equal(j.target_limit, 1);
    assert.equal(j.metrics_path, '/metrics');
  }
  assert.equal(o.sample_limit, 20000);
  assert.equal(s.sample_limit, 5000);
  assert.ok(split(s.metric_relabel_configs[0].regex).includes('kube_state_metrics_list_total'));
  assert.equal(OBJECT_FAMILIES.length, 29);
});

test('existing prometheus and collector jobs keep base semantics (not rescheduled by a global change)', () => {
  assert.equal(base.overlay.global, undefined);
  assert.equal(base.overlay.serverFiles, undefined);
  const jobs = Object.fromEntries(mergedJobs(base).map((j) => [j.name, j]));
  assert.equal(jobs.prometheus.scrape_interval, undefined);
  assert.equal(jobs.collector.scrape_interval, undefined);
});

test('collectors are exactly the ten selected', () => {
  assert.deepEqual([...base.overlay['kube-state-metrics'].collectors].sort(), [...COLLECTORS].sort());
});

test('coverage rows are unique, schema-valid and cross-reference the allowlists', () => {
  assert.deepEqual(base.coverage.map((r) => r.component), ['kubernetes-inventory', 'kubernetes-inventory-health', 'kubelet-resource', 'kubelet-cadvisor-network']);
  assert.deepEqual(validateCoverage(base.coverage, base), []);
});

const NEGATIVES = {
  'unknown collector': (x) => x.overlay['kube-state-metrics'].collectors.push('nonexistentthings'),
  'secrets collector': (x) => x.overlay['kube-state-metrics'].collectors.push('secrets'),
  'configmaps collector': (x) => x.overlay['kube-state-metrics'].collectors.push('configmaps'),
  'missing collector': (x) => x.overlay['kube-state-metrics'].collectors.pop(),
  'copied label allowlist': (x) => { x.overlay['kube-state-metrics'].metricLabelsAllowlist = ['pods=[app]']; },
  'copied annotation allowlist': (x) => { x.overlay['kube-state-metrics'].metricAnnotationsAllowList = ['pods=[*]']; },
  'kubernetes_sd job': (x) => { x.overlay.scrapeConfigs['kubernetes-pods'] = { enabled: true, kubernetes_sd_configs: [{ role: 'pod' }] }; },
  'labelmap relabel': (x) => { x.overlay.scrapeConfigs['kube-state-metrics'].relabel_configs = [{ action: 'labelmap', regex: '__meta_kubernetes_pod_label_(.+)' }]; },
  'annotation relabel': (x) => { x.overlay.scrapeConfigs['kube-state-metrics'].relabel_configs = [{ source_labels: ['__meta_kubernetes_pod_annotation_prometheus_io_scrape'], action: 'keep', regex: 'true' }]; },
  'base generic job enabled': (x) => { x.overlay.scrapeConfigs['kubernetes-nodes'] = { enabled: true }; },
  'duplicate job name': (x) => { x.overlay.scrapeConfigs.dup = { enabled: true, job_name: 'kube-state-metrics', static_configs: [{ targets: ['other:1'] }] }; },
  'duplicate target': (x) => { x.overlay.scrapeConfigs['kube-state-metrics-self'].static_configs[0].targets = ['obs-kube-state-metrics:8080']; },
  'wrong interval': (x) => { x.overlay.scrapeConfigs['kube-state-metrics'].scrape_interval = '1m'; },
  'wrong sample limit': (x) => { x.overlay.scrapeConfigs['kube-state-metrics'].sample_limit = 0; },
  'extra family allowed': (x) => { x.overlay.scrapeConfigs['kube-state-metrics'].metric_relabel_configs[0].regex += '|kube_pod_info'; },
  'extra label allowed': (x) => { x.overlay.scrapeConfigs['kube-state-metrics'].metric_relabel_configs[1].regex += '|image_id'; },
  'list_total dropped from self': (x) => { x.overlay.scrapeConfigs['kube-state-metrics-self'].metric_relabel_configs[0].regex = 'kube_state_metrics_watch_total'; },
  'existing collector changed': (x) => { x.overlay.scrapeConfigs.collector = { static_configs: [{ targets: ['elsewhere:1'] }] }; },
  'global interval rewrite': (x) => { x.overlay.extraScrapeConfigs = '- job_name: x'; },
};
for (const [name, fn] of Object.entries(NEGATIVES)) {
  test(`negative: ${name} fails validateOverlay`, () => {
    assert.notDeepEqual(validateOverlay(mutate(fn)), []);
  });
}

test('negative: malformed or mismatched pin fails validateLock', () => {
  for (const bad of [
    base.lock.replace(/[0-9a-f]{64}/, 'abc'),
    base.lock.replace('@sha256:', ':'),
    base.lock.replace('role\timmutable-reference', 'role\treference'),
    base.lock.replace(/kube-state-metrics\t/, 'other\t'),
    base.lock.replace(/[0-9a-f]{64}/, '0'.repeat(64)),
  ]) assert.notDeepEqual(validateLock(bad, base.overlay), []);
});

test('negative: coverage rows that break uniqueness, schema or cross-reference fail', () => {
  const cases = [
    (r) => r.push(clone(r[0])),
    (r) => { delete r[0].reason; },
    (r) => { r[0].extra = 1; },
    (r) => { r[0].jobs = ['no-such-job']; },
    (r) => { r[0].requiredFamilies.push('kube_pod_info'); },
    (r) => { r[0].coverage = 'inventory-only'; r[0].reason = ''; },
    (r) => { r[0].coverage = 'bogus'; },
    (r) => { r[0].panels = {}; },
  ];
  for (const fn of cases) {
    const rows = clone(base.coverage);
    fn(rows);
    assert.notDeepEqual(validateCoverage(rows, base), []);
  }
});

// ---- OBS-E2-05 T02: Redis exporter job, manifests, lock and coverage ----
const redisJob = () => mergedJobs(base).find((j) => j.name === 'redis-exporter');

test('redis-exporter job: fixed target, cadence, limits, exact families', () => {
  const j = redisJob();
  assert.deepEqual(j.static_configs, [{ targets: ['obs-redis-exporter:9121'], labels: { cluster: 'offscreen-dev', env: 'dev', component: 'redis' } }]);
  assert.equal(j.scheme, 'http');
  assert.equal(j.metrics_path, '/metrics');
  assert.equal(j.scrape_interval, '30s');
  assert.equal(j.scrape_timeout, '10s');
  assert.equal(j.sample_limit, 5000);
  assert.equal(j.target_limit, 1);
  assert.ok(sameSet(split(j.metric_relabel_configs[0].regex), REDIS_FAMILIES));
  assert.ok(sameSet(split(j.metric_relabel_configs[1].regex), BASE_LABELS));
  assert.deepEqual(validateOverlay(base), []);
});

test('redis exporter manifests, lock row and coverage satisfy the frozen contract', () => {
  assert.deepEqual(validateRedisManifests(base.overlay), []);
  assert.deepEqual(validateRedisLock(base.lock, base.overlay), []);
  assert.deepEqual(validateRedisCoverage(base.redisCoverage, base), []);
  assert.ok(base.lock.includes('redis-exporter\tdocker.io/oliver006/redis_exporter@sha256:d16780dcfefc6e42f48682ecc5fbd6dd3207938b1ee88f766b838436a4e27e6e'));
});

test('redis coverage: components unique across all coverage sources', () => {
  const comps = [...base.coverage, ...base.redisCoverage].map((r) => r.component);
  assert.equal(new Set(comps).size, comps.length);
});

const REDIS_JOB_NEGATIVES = {
  'dynamic target (kubernetes_sd)': (x) => { x.overlay.scrapeConfigs['redis-exporter'].kubernetes_sd_configs = [{ role: 'service' }]; },
  'other target': (x) => { x.overlay.scrapeConfigs['redis-exporter'].static_configs[0].targets = ['redis.offscreen-dev-redis.svc:6379']; },
  'second target': (x) => { x.overlay.scrapeConfigs['redis-exporter'].static_configs[0].targets.push('other:9121'); },
  'target via params': (x) => { x.overlay.scrapeConfigs['redis-exporter'].params = { target: ['redis://x:6379'] }; },
  'scrape endpoint path': (x) => { x.overlay.scrapeConfigs['redis-exporter'].metrics_path = '/scrape'; },
  'https scheme': (x) => { x.overlay.scrapeConfigs['redis-exporter'].scheme = 'https'; },
  'blanket redis_.* regex': (x) => { x.overlay.scrapeConfigs['redis-exporter'].metric_relabel_configs[0].regex = 'redis_.*'; },
  'extra family': (x) => { x.overlay.scrapeConfigs['redis-exporter'].metric_relabel_configs[0].regex += '|redis_commands_total'; },
  'missing family': (x) => { x.overlay.scrapeConfigs['redis-exporter'].metric_relabel_configs[0].regex = REDIS_FAMILIES.slice(1).join('|'); },
  'extra label key': (x) => { x.overlay.scrapeConfigs['redis-exporter'].metric_relabel_configs[1].regex += '|cmd'; },
  'label keep removed': (x) => { x.overlay.scrapeConfigs['redis-exporter'].metric_relabel_configs.pop(); },
  'sample limit raised': (x) => { x.overlay.scrapeConfigs['redis-exporter'].sample_limit = 20000; },
  'interval changed': (x) => { x.overlay.scrapeConfigs['redis-exporter'].scrape_interval = '15s'; },
  'target limit removed': (x) => { delete x.overlay.scrapeConfigs['redis-exporter'].target_limit; },
  'duplicate job name': (x) => { x.overlay.scrapeConfigs.dup = { enabled: true, job_name: 'redis-exporter', static_configs: [{ targets: ['other:1'] }] }; },
  'duplicate target': (x) => { x.overlay.scrapeConfigs.dup = { enabled: true, job_name: 'dup', static_configs: [{ targets: ['obs-redis-exporter:9121'] }] }; },
  'job removed': (x) => { delete x.overlay.scrapeConfigs['redis-exporter']; },
};
for (const [name, fn] of Object.entries(REDIS_JOB_NEGATIVES)) {
  test(`negative: redis job ${name} is rejected`, () => {
    const x = mutate(fn);
    // A removed job leaves coverage dangling; both validators must flag it.
    assert.ok(validateOverlay(x).length > 0 || validateRedisCoverage(x.redisCoverage, x).length > 0);
  });
}

const swapManifest = (x, kind, fn) => {
  x.overlay.extraManifests = x.overlay.extraManifests.map((m) => {
    if (!new RegExp(`^kind: ${kind}$`, 'm').test(m.replace(/^ {0,4}/gm, ''))) return m;
    return fn(m);
  });
};
const swapObj = (x, kind, fn) => swapManifest(x, kind, (m) => {
  const d = parseYaml(m.replaceAll('{{ .Release.Namespace }}', 'ns-under-test'));
  fn(d);
  return stringifyYaml(d);
});
const MANIFEST_NEGATIVES = {
  'check-keys with value': (x) => swapManifest(x, 'Deployment', (m) => m.replace('--check-keys=\n', '--check-keys=foo\n')),
  'extra --script flag': (x) => swapObj(x, 'Deployment', (d) => d.spec.template.spec.containers[0].args.push('--script=/x.lua')),
  'scrape endpoint enabled': (x) => swapManifest(x, 'Deployment', (m) => m.replace(/ *- --disable-scrape-endpoint\n/, '')),
  'slowlog exclusion removed': (x) => swapManifest(x, 'Deployment', (m) => m.replace(/ *- --exclude-slowlog-metrics\n/, '')),
  'client list exported': (x) => swapManifest(x, 'Deployment', (m) => m.replace('--export-client-list=false', '--export-client-list=true')),
  'other redis address': (x) => swapManifest(x, 'Deployment', (m) => m.replace('redis.offscreen-dev-redis.svc:6379', 'other.example:6379')),
  'unpinned tag': (x) => swapManifest(x, 'Deployment', (m) => m.replace(/redis_exporter@sha256:[0-9a-f]{64}/, 'redis_exporter:v1.97.0')),
  'v1.93.0 image': (x) => swapManifest(x, 'Deployment', (m) => m.replace(/redis_exporter@sha256:[0-9a-f]{64}/, 'redis_exporter:v1.93.0')),
  'v1.93.0 digest': (x) => swapManifest(x, 'Deployment', (m) => m.replace(/redis_exporter@sha256:[0-9a-f]{64}/, 'redis_exporter@sha256:eb2b1e93b654fc21bf508e45ec3d17ca55d22db66c6b826750cecc92c0c21e42')),
  'token automounted': (x) => swapManifest(x, 'Deployment', (m) => m.replace('automountServiceAccountToken: false', 'automountServiceAccountToken: true')),
  'hostNetwork': (x) => swapObj(x, 'Deployment', (d) => { d.spec.template.spec.hostNetwork = true; }),
  'hostPort': (x) => swapObj(x, 'Deployment', (d) => { d.spec.template.spec.containers[0].ports[0].hostPort = 9121; }),
  'hostPath volume': (x) => swapObj(x, 'Deployment', (d) => { d.spec.template.spec.volumes = [{ name: 'h', hostPath: { path: '/' } }]; }),
  'sidecar': (x) => swapObj(x, 'Deployment', (d) => { d.spec.template.spec.containers.push({ name: 'side', image: 'busybox@sha256:' + '0'.repeat(64) }); }),
  'no memory limit': (x) => swapManifest(x, 'Deployment', (m) => m.replace('limits: {memory: 128Mi}', 'limits: {}')),
  'service NodePort': (x) => swapManifest(x, 'Service', (m) => m.replace('type: ClusterIP', 'type: NodePort')),
  'service LoadBalancer': (x) => swapManifest(x, 'Service', (m) => m.replace('type: ClusterIP', 'type: LoadBalancer')),
  'service other port': (x) => swapManifest(x, 'Service', (m) => m.replace('port: 9121', 'port: 9122')),
  'service removed': (x) => { x.overlay.extraManifests = x.overlay.extraManifests.filter((m) => !/kind: Service/.test(m)); },
  'extra manifest': (x) => { x.overlay.extraManifests.push('apiVersion: v1\nkind: ConfigMap\nmetadata:\n  name: x\n'); },
};
for (const [name, fn] of Object.entries(MANIFEST_NEGATIVES)) {
  test(`negative: redis manifest ${name} is rejected`, () => {
    assert.notDeepEqual(validateRedisManifests(mutate(fn).overlay), []);
  });
}

test('negative: redis lock row must be the digest pin equal to the Deployment image', () => {
  for (const bad of [
    base.lock.replace(/(redis_exporter)@sha256:[0-9a-f]{64}/, '$1:v1.97.0'),
    base.lock.replace(/(redis_exporter)@sha256:[0-9a-f]{64}/, '$1@sha256:eb2b1e93b654fc21bf508e45ec3d17ca55d22db66c6b826750cecc92c0c21e42'),
    base.lock.replace(/(redis_exporter)@sha256:[0-9a-f]{64}/, '$1:v1.93.0'),
    base.lock.replace(/redis-exporter\t.*\n?/, ''),
    base.lock + 'redis-exporter\tdocker.io/oliver006/redis_exporter@sha256:' + '1'.repeat(64) + '\n',
  ]) assert.notDeepEqual(validateRedisLock(bad, base.overlay), []);
});

const REDIS_COVERAGE_NEGATIVES = {
  'duplicate component': (r) => r.push(clone(r[0])),
  'extra field': (r) => { r[0].labelMap = {}; },
  'missing panel 709': (r) => { delete r[0].panels['offscreen-messaging-cache/709']; },
  'extra panel': (r) => { r[0].panels['offscreen-messaging-cache/710'] = clone(r[0].panels['offscreen-messaging-cache/709']); },
  'family not collected': (r) => { r[0].requiredFamilies.push('redis_slowlog_length'); },
  'family dropped from coverage': (r) => { r[0].requiredFamilies.pop(); },
  'unknown job': (r) => { r[0].jobs = ['redis']; },
  'backend panel ignores redis_up==1': (r) => { r[0].panels['offscreen-messaging-cache/703'].promql = r[0].panels['offscreen-messaging-cache/703'].promql.replaceAll('redis_up{job="redis-exporter"} == 1', 'redis_up{job="redis-exporter"} >= 0'); },
  'backend panel ignores scrape up': (r) => { r[0].panels['offscreen-messaging-cache/708'].promql = 'redis_connected_clients{job="redis-exporter"}'; },
  'rate panel without redis_up gate': (r) => { r[0].panels['offscreen-messaging-cache/709'].promql = 'rate(redis_commands_processed_total{job="redis-exporter"}[5m])'; },
  'scrape panel mixes redis_up': (r) => { r[0].panels['offscreen-messaging-cache/701'].promql = 'redis_up{job="redis-exporter"}'; },
  'backend panel equals scrape panel': (r) => { r[0].panels['offscreen-messaging-cache/702'].promql = r[0].panels['offscreen-messaging-cache/701'].promql; },
  'hit ratio defaults to zero': (r) => { r[0].panels['offscreen-messaging-cache/706'].promql += ' or vector(0)'; },
  'hit ratio denominator guard removed': (r) => { r[0].panels['offscreen-messaging-cache/706'].promql = r[0].panels['offscreen-messaging-cache/706'].promql.replace(' > 0', ''); },
  'staleness bound removed': (r) => { r[0].panels['offscreen-messaging-cache/705'].promql = r[0].panels['offscreen-messaging-cache/705'].promql.replaceAll('<= 90', '<= 99999'); },
  'wrong unit': (r) => { r[0].panels['offscreen-messaging-cache/703'].unit = 'none'; },
  'coverage downgraded silently': (r) => { r[0].coverage = 'inventory-only'; r[0].reason = ''; },
};
for (const [name, fn] of Object.entries(REDIS_COVERAGE_NEGATIVES)) {
  test(`negative: redis coverage ${name} is rejected`, () => {
    const rows = clone(base.redisCoverage);
    fn(rows);
    assert.notDeepEqual(validateRedisCoverage(rows, base), []);
  });
}

// ---- OBS-E2-03 T03: kubelet jobs, trust mount, RBAC and resource coverage ----
const kubeletRows = (c) => c.coverage.filter((r) => r.component.startsWith('kubelet-'));
const sc = (x, job) => x.overlay.scrapeConfigs[job];
const kubeletManifestIndex = (x, kind) => x.overlay.extraManifests.findIndex((m) => new RegExp(`^ *kind: ${kind}$`, 'm').test(m) && /obs-(kubelet-trust|prometheus-kubelet)/.test(m));

test('kubelet: frozen jobs, mount, SA token, trust ConfigMap and RBAC satisfy the contract', () => {
  assert.deepEqual(validateKubeletJobs(base), []);
  assert.deepEqual(validateKubeletServer(base.overlay), []);
  assert.deepEqual(validateKubeletManifests(base.overlay), []);
  assert.deepEqual(validateOverlay(base), []);
  assert.deepEqual(validateRedisManifests(base.overlay), []);
  assert.equal(base.overlay.extraManifests.length, 5);
});

test('kubelet: both jobs use fixed HTTPS DNS targets, SA token file, file CA, node filter and bounded limits', () => {
  for (const [name, path, limit] of [['kubelet-resource', '/metrics/resource', 5000], ['kubelet-cadvisor', '/metrics/cadvisor', 20000]]) {
    const j = sc(base, name);
    assert.equal(j.scheme, 'https');
    assert.equal(j.metrics_path, path);
    assert.equal(j.sample_limit, limit);
    assert.equal(j.target_limit, 4);
    assert.deepEqual([j.scrape_interval, j.scrape_timeout, j.label_limit, j.label_name_length_limit, j.label_value_length_limit], ['30s', '10s', 40, 128, 512]);
    assert.deepEqual(j.authorization, { credentials_file: '/var/run/secrets/kubernetes.io/serviceaccount/token' });
    assert.deepEqual(j.tls_config, { ca_file: '/etc/offscreen/kubelet-trust/ca.pem', insecure_skip_verify: false });
    assert.deepEqual(j.kubernetes_sd_configs, [{ role: 'node' }]);
    assert.equal(j.static_configs, undefined);
    assert.equal(j.relabel_configs[0].regex, KUBELET_NODE_RE);
    assert.equal(j.relabel_configs[2].replacement, '$1:10250');
    assert.ok(!j.relabel_configs.some((r) => r.action === 'labelmap'));
    assert.ok(!JSON.stringify(j).includes('proxy'));
    // bounded labels: the final labelkeep carries no raw container id/name/image
    const lk = j.metric_relabel_configs.at(-1);
    assert.equal(lk.action, 'labelkeep');
    assert.ok(!/\b(id|image|name|uid)\b/.test(lk.regex.replace('__name__', '')));
  }
});

test('kubelet: CPU/RAM has one source (resource job); cAdvisor keeps only conditional network counters', () => {
  const resKeep = sc(base, 'kubelet-resource').metric_relabel_configs[0].regex;
  const cadKeep = sc(base, 'kubelet-cadvisor').metric_relabel_configs[0].regex;
  assert.deepEqual([...new Set(resKeep.match(/[a-z_]+_(?:total|bytes)/g))].sort(), [...RESOURCE_FAMILIES].sort());
  assert.ok(!/network/.test(resKeep));
  assert.ok(/^container_network_\(receive\|transmit\)_bytes_total;POD;/.test(cadKeep));
  assert.ok(!/cpu|memory|working_set/.test(cadKeep));
  assert.equal(sc(base, 'kubelet-cadvisor').metric_relabel_configs[1].regex, 'lo');
  assert.ok(sc(base, 'kubelet-resource').metric_relabel_configs[1].regex.endsWith(';POD'));
  const kubeletJobsEnabled = mergedJobs(base).filter((j) => /kubelet|cadvisor|node/.test(j.name)).map((j) => j.name).sort();
  assert.deepEqual(kubeletJobsEnabled, ['kubelet-cadvisor', 'kubelet-resource']);
});

test('kubelet coverage: two exact rows, unique panels, resource-only sources, network inventory-only without panel', () => {
  assert.equal(base.coverage.length, 4);
  assert.deepEqual(validateKubeletCoverage(base.coverage, base), []);
  assert.deepEqual(validateCoverage(base.coverage, base), []);
  const res = base.coverage.find((r) => r.component === 'kubelet-resource');
  assert.equal(Object.keys(res.panels).length, 12);
  assert.ok(Object.keys(res.panels).every((id) => /^offscreen-(overview|nodes|kubernetes)\/\d+$/.test(id)));
  const net = base.coverage.find((r) => r.component === 'kubelet-cadvisor-network');
  assert.equal(net.coverage, 'inventory-only');
  assert.deepEqual(net.panels, {});
  assert.deepEqual(net.requiredFamilies, []);
  assert.ok(!JSON.stringify(base.coverage).includes('container_network'));
  const allIds = base.coverage.flatMap((r) => Object.keys(r.panels));
  assert.equal(new Set(allIds).size, allIds.length);
  const comps = [...base.coverage, ...base.redisCoverage].map((r) => r.component);
  assert.equal(new Set(comps).size, comps.length);
});

const KUBELET_JOB_NEGATIVES = {
  'wrong job name': (x) => { x.overlay.scrapeConfigs['kubelet-resource'].job_name = 'kubelet'; },
  'wrong address replacement': (x) => { sc(x, 'kubelet-resource').relabel_configs[2].replacement = '$1:10255'; },
  'raw node address (no DNS)': (x) => { sc(x, 'kubelet-cadvisor').relabel_configs[2].replacement = '10.0.0.1:10250'; },
  'node filter widened': (x) => { sc(x, 'kubelet-resource').relabel_configs[0].regex = '.*'; },
  'node filter removed': (x) => { sc(x, 'kubelet-resource').relabel_configs.shift(); },
  'wrong CA reference': (x) => { sc(x, 'kubelet-resource').tls_config.ca_file = '/var/run/secrets/kubernetes.io/serviceaccount/ca.crt'; },
  'inline CA instead of file': (x) => { delete sc(x, 'kubelet-resource').tls_config.ca_file; sc(x, 'kubelet-resource').tls_config.ca = 'x'; },
  'insecure_skip_verify': (x) => { sc(x, 'kubelet-cadvisor').tls_config.insecure_skip_verify = true; },
  'insecure flag removed': (x) => { delete sc(x, 'kubelet-cadvisor').tls_config.insecure_skip_verify; },
  'plain http': (x) => { sc(x, 'kubelet-resource').scheme = 'http'; },
  'proxy_url': (x) => { sc(x, 'kubelet-resource').proxy_url = 'http://proxy:3128'; },
  'apiserver nodes/proxy path': (x) => { sc(x, 'kubelet-resource').metrics_path = '/api/v1/nodes/n/proxy/metrics/resource'; },
  'arbitrary path': (x) => { sc(x, 'kubelet-resource').metrics_path = '/metrics'; },
  'bearer token inline': (x) => { sc(x, 'kubelet-resource').authorization = { credentials: 'abc' }; },
  'wrong token file': (x) => { sc(x, 'kubelet-resource').authorization.credentials_file = '/tmp/token'; },
  'arbitrary family (resource)': (x) => { sc(x, 'kubelet-resource').metric_relabel_configs[0].regex += '|container_fs_usage_bytes'; },
  'arbitrary family (cadvisor)': (x) => { sc(x, 'kubelet-cadvisor').metric_relabel_configs[0].regex = 'container_.*'; },
  'cpu in cadvisor (duplicate aggregation)': (x) => { sc(x, 'kubelet-cadvisor').metric_relabel_configs[0].regex = 'container_(cpu_usage_seconds_total|network_receive_bytes_total);POD;[^;]+;[^;]+;[^;]+'; },
  'cadvisor job also enables resource families': (x) => { sc(x, 'kubelet-cadvisor').metric_relabel_configs[0].regex = sc(x, 'kubelet-resource').metric_relabel_configs[0].regex; },
  'third kubelet-like job duplicating CPU': (x) => { x.overlay.scrapeConfigs['kubelet-resource-2'] = { ...clone(sc(x, 'kubelet-resource')), job_name: 'kubelet-resource-2' }; },
  'generic labelmap': (x) => { sc(x, 'kubelet-resource').relabel_configs.push({ action: 'labelmap', regex: '__meta_kubernetes_node_label_(.+)' }); },
  'arbitrary metadata label': (x) => { sc(x, 'kubelet-cadvisor').relabel_configs.push({ source_labels: ['__meta_kubernetes_node_annotation_x'], target_label: 'x' }); },
  'static target added': (x) => { sc(x, 'kubelet-resource').static_configs = [{ targets: ['10.0.0.1:10250'] }]; },
  'pod discovery role': (x) => { sc(x, 'kubelet-resource').kubernetes_sd_configs = [{ role: 'pod' }]; },
  'label allowlist widened': (x) => { sc(x, 'kubelet-resource').metric_relabel_configs[2].regex += '|id|image|name'; },
  'label keep removed': (x) => { sc(x, 'kubelet-cadvisor').metric_relabel_configs.pop(); },
  'lo not dropped': (x) => { sc(x, 'kubelet-cadvisor').metric_relabel_configs[1].regex = 'none'; },
  'POD container not excluded': (x) => { sc(x, 'kubelet-resource').metric_relabel_configs.splice(1, 1); },
  'sample limit raised': (x) => { sc(x, 'kubelet-cadvisor').sample_limit = 100000; },
  'target limit raised': (x) => { sc(x, 'kubelet-resource').target_limit = 40; },
  'interval changed': (x) => { sc(x, 'kubelet-resource').scrape_interval = '15s'; },
  'honor_labels': (x) => { sc(x, 'kubelet-resource').honor_labels = true; },
  'job removed': (x) => { delete x.overlay.scrapeConfigs['kubelet-cadvisor']; },
};
for (const [name, fn] of Object.entries(KUBELET_JOB_NEGATIVES)) {
  test(`negative: kubelet job ${name} is rejected`, () => {
    const x = mutate(fn);
    assert.notDeepEqual(validateOverlay(x), []);
  });
}

const KUBELET_MOUNT_RBAC_NEGATIVES = {
  'token automount disabled': (x) => { x.overlay.server.automountServiceAccountToken = false; },
  'token automount removed': (x) => { delete x.overlay.server.automountServiceAccountToken; },
  'mount writable': (x) => { x.overlay.server.extraConfigmapMounts[0].readOnly = false; },
  'mount other ConfigMap': (x) => { x.overlay.server.extraConfigmapMounts[0].configMap = 'obs-prometheus'; },
  'mount other path': (x) => { x.overlay.server.extraConfigmapMounts[0].mountPath = '/etc/config'; },
  'second mount': (x) => { x.overlay.server.extraConfigmapMounts.push({ name: 'x', configMap: 'x', mountPath: '/x', readOnly: true }); },
  'other server key': (x) => { x.overlay.server.extraSecretMounts = []; },
  'other service account': (x) => { x.overlay.serviceAccounts.server.name = 'default'; },
  'nodes/proxy added': (x) => { x.overlay.extraManifests[kubeletManifestIndex(x, 'ClusterRole')] = x.overlay.extraManifests[kubeletManifestIndex(x, 'ClusterRole')].replace('resources: [nodes/metrics]', 'resources: [nodes/metrics, nodes/proxy]'); },
  'nodes/metrics verbs widened': (x) => { const i = kubeletManifestIndex(x, 'ClusterRole'); x.overlay.extraManifests[i] = x.overlay.extraManifests[i].replace('verbs: [get]', 'verbs: [get, create]'); },
  'pod permission added': (x) => { const i = kubeletManifestIndex(x, 'ClusterRole'); x.overlay.extraManifests[i] += '  - apiGroups: [""]\n    resources: [pods]\n    verbs: [get, list, watch]\n'; },
  'wildcard resource': (x) => { const i = kubeletManifestIndex(x, 'ClusterRole'); x.overlay.extraManifests[i] = x.overlay.extraManifests[i].replace('resources: [nodes]', 'resources: ["*"]'); },
  'binding to other subject': (x) => { const i = kubeletManifestIndex(x, 'ClusterRoleBinding'); x.overlay.extraManifests[i] = x.overlay.extraManifests[i].replace('name: obs-prometheus\n', 'name: default\n'); },
  'binding to cluster-admin': (x) => { const i = kubeletManifestIndex(x, 'ClusterRoleBinding'); x.overlay.extraManifests[i] = x.overlay.extraManifests[i].replace('name: obs-prometheus-kubelet\nsubjects', 'name: cluster-admin\nsubjects'); },
  'ClusterRole removed': (x) => { x.overlay.extraManifests.splice(kubeletManifestIndex(x, 'ClusterRole'), 1); },
  'trust ConfigMap not immutable': (x) => { const i = kubeletManifestIndex(x, 'ConfigMap'); x.overlay.extraManifests[i] = x.overlay.extraManifests[i].replace('immutable: true', 'immutable: false'); },
  'trust ConfigMap other name': (x) => { const i = kubeletManifestIndex(x, 'ConfigMap'); x.overlay.extraManifests[i] = x.overlay.extraManifests[i].replace('name: obs-kubelet-trust', 'name: obs-kubelet-trust-x'); },
  'trust ConfigMap owner label removed': (x) => { const i = kubeletManifestIndex(x, 'ConfigMap'); x.overlay.extraManifests[i] = x.overlay.extraManifests[i].replace('offscreen.dev/owner: offscreen-dev', 'offscreen.dev/owner: other'); },
  'trust ConfigMap extra data key': (x) => { const i = kubeletManifestIndex(x, 'ConfigMap'); x.overlay.extraManifests[i] += '  extra.pem: x\n'; },
  'trust ConfigMap committed PEM': (x) => { const i = kubeletManifestIndex(x, 'ConfigMap'); x.overlay.extraManifests[i] = x.overlay.extraManifests[i].replace(/ca\.pem: .*/, 'ca.pem: "-----BEGIN CERTIFICATE-----"'); },
  'trust ConfigMap CA not required': (x) => { const i = kubeletManifestIndex(x, 'ConfigMap'); x.overlay.extraManifests[i] = x.overlay.extraManifests[i].replace(/ca\.pem: .*/, 'ca.pem: {{ .Values.offscreenKubeletTrust.caPem | quote }}'); },
  'trust ConfigMap tpl on input': (x) => { const i = kubeletManifestIndex(x, 'ConfigMap'); x.overlay.extraManifests[i] = x.overlay.extraManifests[i].replace(/(ca\.pem: \{\{ required "[^"]*" )/, '$1(tpl '); },
  'extra manifest beyond frozen set': (x) => { x.overlay.extraManifests.push('apiVersion: v1\nkind: ConfigMap\nmetadata:\n  name: x\n'); },
};
for (const [name, fn] of Object.entries(KUBELET_MOUNT_RBAC_NEGATIVES)) {
  test(`negative: kubelet mount/SA/RBAC/ConfigMap ${name} is rejected`, () => {
    const x = mutate(fn);
    assert.ok(validateOverlay(x).length > 0 || validateRedisManifests(x.overlay).length > 0);
  });
}

test('negative: redis manifest set no longer accepts a bare two-manifest shape or a missing kubelet manifest', () => {
  const x = mutate((y) => { y.overlay.extraManifests = y.overlay.extraManifests.slice(0, 2); });
  assert.notDeepEqual(validateRedisManifests(x.overlay), []);
  assert.notDeepEqual(validateKubeletManifests(x.overlay), []);
});

const KUBELET_COVERAGE_NEGATIVES = {
  'resource row dropped': (r) => { r.splice(2, 1); },
  'network row dropped': (r) => { r.pop(); },
  'duplicate resource row': (r) => r.push(clone(r[2])),
  'network panel added (positive coverage)': (r) => { r[3].panels['offscreen-nodes/312'] = { promql: 'container_network_receive_bytes_total{job="kubelet-cadvisor"}', unit: 'Bps', interpretation: 'x' }; },
  'network promoted to enabled': (r) => { r[3].coverage = 'enabled'; r[3].reason = ''; },
  'network family claimed required': (r) => { r[3].requiredFamilies = [...NETWORK_FAMILIES]; },
  'resource panel sourced from cadvisor': (r) => { const id = 'offscreen-nodes/306'; r[2].panels[id].promql = r[2].panels[id].promql.replaceAll('kubelet-resource', 'kubelet-cadvisor'); },
  'duplicate panel query (duplicate aggregation)': (r) => { r[2].panels['offscreen-nodes/310'].promql = r[2].panels['offscreen-nodes/306'].promql; },
  'panel id collides with another row': (r) => { r[2].panels['offscreen-messaging-cache/701'] = r[2].panels['offscreen-nodes/306']; delete r[2].panels['offscreen-nodes/306']; r[0].panels['offscreen-messaging-cache/701'] = clone(r[2].panels['offscreen-messaging-cache/701']); },
  'staleness bound removed': (r) => { r[2].panels['offscreen-nodes/307'].promql = r[2].panels['offscreen-nodes/307'].promql.replaceAll('<= 90', '<= 99999'); },
  'cluster total no longer needs both nodes': (r) => { r[2].panels['offscreen-overview/104'].promql = r[2].panels['offscreen-overview/104'].promql.replaceAll('== 2', '>= 1'); },
  'absent-to-zero fallback': (r) => { r[2].panels['offscreen-overview/105'].promql += ' or vector(0)'; },
  'family not kept by the job': (r) => { r[2].requiredFamilies.push('container_fs_usage_bytes'); },
  'family dropped from coverage': (r) => { r[2].requiredFamilies.pop(); },
  'wrong node selector': (r) => { r[2].workloadSelector = { nodeNames: ['offscreen-dev-worker'] }; },
  'unknown job': (r) => { r[2].jobs = ['kubelet']; },
};
for (const [name, fn] of Object.entries(KUBELET_COVERAGE_NEGATIVES)) {
  test(`negative: kubelet coverage ${name} is rejected`, () => {
    const rows = clone(base.coverage);
    fn(rows);
    assert.ok(validateKubeletCoverage(rows, base).length > 0 || validateCoverage(rows, base).length > 0);
  });
}

test('negative: a cAdvisor row cannot contribute a CPU/RAM family to coverage', () => {
  const x = mutate((y) => { y.coverage[3].requiredFamilies = ['container_cpu_usage_seconds_total']; y.coverage[3].jobs = ['kubelet-cadvisor']; });
  assert.notDeepEqual(validateKubeletCoverage(x.coverage, x).concat(validateCoverage(x.coverage, x)), []);
});

test('kubeletRows helper covers exactly the two frozen rows', () => {
  assert.deepEqual(kubeletRows(base).map((r) => r.component), ['kubelet-resource', 'kubelet-cadvisor-network']);
});
