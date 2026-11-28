import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
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
  nativeCoverage: JSON.parse(read('coverage/native-services.json')),
  seaweedfsCoverage: JSON.parse(read('coverage/seaweedfs.json')),
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
const NATIVE_POD_JOBS = ['postgres-cnpg', 'temporal-server'];
const NATIVE_STATIC_JOBS = ['rabbitmq', 'loki', 'tempo', 'grafana', 'seaweedfs'];
const NATIVE_JOBS = [...NATIVE_POD_JOBS, ...NATIVE_STATIC_JOBS];
const LEGACY_JOBS = ['prometheus', 'collector'];
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
  if (!sameSet(names, ['prometheus', 'collector', 'kube-state-metrics', 'kube-state-metrics-self', 'redis-exporter', ...KUBELET_JOBS, ...NATIVE_JOBS])) p.push('job-set');
  for (const j of jobs) {
    if (KUBELET_JOBS.includes(j.name)) continue; // exact node-discovery shape is asserted by validateKubeletJobs
    if (NATIVE_POD_JOBS.includes(j.name)) continue; // exact Pod-discovery shape is asserted by validateNativeJobs
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
  if (Object.keys(cfg.overlay.scrapeConfigs ?? {}).some((k) => !['kube-state-metrics', 'kube-state-metrics-self', 'redis-exporter', ...KUBELET_JOBS, ...NATIVE_JOBS].includes(k))) p.push('overlay-extra-job');
  p.push(...validateKubeletJobs(cfg), ...validateKubeletServer(cfg.overlay), ...validateKubeletManifests(cfg.overlay), ...validateNativeJobs(cfg));
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
    // OBS-E2-03 node rules plus OBS-E2-04 Pod discovery (exactly get/list/watch on pods; no pods/exec, proxy, Secrets or mutation).
    rules: [{ apiGroups: [''], resources: ['nodes'], verbs: ['get', 'list', 'watch'] }, { apiGroups: [''], resources: ['nodes/metrics'], verbs: ['get'] }, { apiGroups: [''], resources: ['pods'], verbs: ['get', 'list', 'watch'] }],
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
    // Inventory-only and not-applicable rows (OBS-E2-04) may carry an empty selector; enabled rows must name one.
    if (!r.workloadSelector || typeof r.workloadSelector !== 'object' || (r.coverage === 'enabled' && !Object.keys(r.workloadSelector).length)) p.push(`selector:${r.component}`);
    if (!['enabled', 'inventory-only', 'not-applicable'].includes(r.coverage)) p.push(`coverage:${r.component}`);
    if (r.coverage !== 'enabled' && !r.reason) p.push(`reason:${r.component}`);
    if (!r.panels || (r.coverage === 'enabled' && !Object.keys(r.panels).length)) p.push(`panels:${r.component}`);
    for (const [id, pn] of Object.entries(r.panels ?? {})) {
      if (!/^offscreen-[a-z-]+\/\d+$/.test(id) || !pn.promql || !pn.unit || !pn.interpretation) p.push(`panel:${id}`);
    }
    if (!Array.isArray(r.jobs) || (r.coverage === 'enabled' && !r.jobs.length)) p.push(`jobs:${r.component}`);
    // A row that is not enabled collects nothing: no families or panels may be claimed for it unless it names a job (kubelet network row).
    if (r.coverage !== 'enabled' && !(r.jobs ?? []).length && ((r.requiredFamilies ?? []).length || Object.keys(r.panels ?? {}).length)) p.push(`inventory-only-claims:${r.component}`);
    for (const jn of r.jobs ?? []) {
      const job = jobs[jn];
      if (!job) { p.push(`unknown-job:${jn}`); continue; }
      const keep = (job.metric_relabel_configs ?? []).find((m) => m.action === 'keep');
      // The legacy `prometheus` and `collector` jobs keep base semantics and have no family allowlist; native equality is asserted by validateNativeCoverage.
      if (!keep && LEGACY_JOBS.includes(jn)) continue;
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

// ---- OBS-E2-04: frozen native service jobs, Pod discovery, RBAC and coverage (NATIVE-SERVICE-CANDIDATE.json, owner-ratified 2026-11-28) ----
// The candidate's newScrapePolicies, copied as the frozen expectation. When the planner's candidate file is still present it must agree exactly.
const NATIVE_POLICY = {
  "postgres-cnpg": {"families":["cnpg_pg_database_size_bytes","cnpg_pg_stat_database_xact_commit","cnpg_pg_stat_database_xact_rollback","cnpg_pg_stat_database_deadlocks","cnpg_pg_stat_database_blks_hit","cnpg_pg_stat_database_blks_read","cnpg_pg_stat_database_temp_bytes","cnpg_pg_stat_database_temp_files","cnpg_backends_total","cnpg_backends_max_tx_duration_seconds","cnpg_pg_settings_setting","cnpg_collector_up","cnpg_backends_waiting_total","cnpg_collector_last_collection_error","cnpg_last_error","cnpg_last_update_timestamp","cnpg_collector_replica_mode","cnpg_pg_replication_in_recovery","cnpg_pg_replication_is_wal_receiver_up","cnpg_pg_replication_lag","cnpg_pg_replication_streaming_replicas"],"retainedLabels":["__name__","job","instance","cluster","env","component","namespace","pod","datname","application_name","usename","state","name","exported_cluster"],"valueFilters":[{"source_labels":["__name__","datname","application_name","usename","state","name","exported_cluster"],"separator":";","regex":"(cnpg_pg_database_size_bytes|cnpg_pg_stat_database_xact_commit|cnpg_pg_stat_database_xact_rollback|cnpg_pg_stat_database_deadlocks|cnpg_pg_stat_database_blks_hit|cnpg_pg_stat_database_blks_read|cnpg_pg_stat_database_temp_bytes|cnpg_pg_stat_database_temp_files);(postgres|dev|temporal|temporal_visibility|dev_[1-9][0-9]*);;;;;|(cnpg_backends_total|cnpg_backends_max_tx_duration_seconds);(postgres|dev|temporal|temporal_visibility|dev_[1-9][0-9]*);(|cnpg_metrics_exporter);(postgres|dev|temporal|cnpg_metrics_exporter|dev_[1-9][0-9]*_(mig|run));(active|idle|idle in transaction|idle in transaction \\(aborted\\)|fastpath function call|disabled);;|cnpg_pg_settings_setting;;;;;max_connections;|cnpg_collector_up;;;;;;dev-pg|(cnpg_backends_waiting_total|cnpg_collector_last_collection_error|cnpg_last_error|cnpg_last_update_timestamp|cnpg_collector_replica_mode|cnpg_pg_replication_in_recovery|cnpg_pg_replication_is_wal_receiver_up|cnpg_pg_replication_lag|cnpg_pg_replication_streaming_replicas);;;;;;","action":"keep"}],"target":{"kind":"pod","namespace":"offscreen-dev-postgres","labels":{"cnpg.io/cluster":"dev-pg","app.kubernetes.io/name":"postgresql"},"container":"postgres","portName":"metrics","port":9187}},
  "temporal-server": {"families":["service_requests","service_error_with_type","persistence_requests","persistence_sql_in_use","service_latency_bucket","service_latency_count","service_latency_sum","persistence_latency_bucket","persistence_latency_count","persistence_latency_sum"],"retainedLabels":["__name__","job","instance","cluster","env","component","namespace","pod","role","exported_namespace","operation","service_name","type","db_kind","error_type","le"],"valueFilters":[{"source_labels":["__name__","exported_namespace"],"separator":";","regex":"(service_requests|service_error_with_type|persistence_requests|service_latency_bucket|service_latency_count|service_latency_sum|persistence_latency_bucket|persistence_latency_count|persistence_latency_sum);(system|_unknown_)|persistence_sql_in_use;","action":"keep"}],"target":{"kind":"pod","namespace":"offscreen-dev-temporal","labels":{"app.kubernetes.io/instance":"temporal","app.kubernetes.io/name":"temporal","app.kubernetes.io/component":["frontend","history","matching","worker"]},"containerByRole":{"frontend":"temporal-frontend","history":"temporal-history","matching":"temporal-matching","worker":"temporal-worker"},"portName":"metrics","port":9090}},
  "rabbitmq": {"families":["rabbitmq_queue_messages","rabbitmq_queue_messages_ready","rabbitmq_queue_messages_unacked","rabbitmq_connections","rabbitmq_queue_messages_published_total","rabbitmq_queue_messages_delivered_total","rabbitmq_queue_messages_acked_total","rabbitmq_alarms_free_disk_space_watermark","rabbitmq_alarms_memory_used_watermark","rabbitmq_process_resident_memory_bytes","rabbitmq_process_open_fds","rabbitmq_process_max_fds"],"retainedLabels":["__name__","job","instance","cluster","env","component","namespace"],"valueFilters":[],"target":{"kind":"static","address":"rabbitmq.offscreen-dev-rabbitmq.svc:15692","namespace":"offscreen-dev-rabbitmq"}},
  "loki": {"families":["loki_ingester_memory_chunks","loki_ingester_flush_queue_length","loki_ingester_chunks_flush_failures_total","loki_ingester_wal_bytes_in_use"],"retainedLabels":["__name__","job","instance","cluster","env","component","namespace"],"valueFilters":[],"target":{"kind":"static","address":"obs-loki.offscreen-dev-observability.svc:3100","namespace":"offscreen-dev-observability"}},
  "tempo": {"families":["tempo_distributor_traces_per_batch_count","tempo_distributor_traces_per_batch_sum"],"retainedLabels":["__name__","job","instance","cluster","env","component","namespace"],"valueFilters":[],"target":{"kind":"static","address":"obs-tempo.offscreen-dev-observability.svc:3200","namespace":"offscreen-dev-observability"}},
  "grafana": {"families":["grafana_http_request_in_flight","grafana_api_response_status_total"],"retainedLabels":["__name__","job","instance","cluster","env","component","namespace","code"],"valueFilters":[{"source_labels":["__name__","code"],"separator":";","regex":"grafana_http_request_in_flight;|grafana_api_response_status_total;[1-5][0-9][0-9]","action":"keep"}],"target":{"kind":"static","address":"obs-grafana.offscreen-dev-observability.svc:80","namespace":"offscreen-dev-observability"}},
  "seaweedfs": {"families":["SeaweedFS_master_is_leader","SeaweedFS_s3_in_flight_upload_bytes","SeaweedFS_s3_in_flight_upload_count","SeaweedFS_volumeServer_max_volumes","SeaweedFS_volumeServer_file_read_failures","SeaweedFS_volumeServer_file_write_failures","SeaweedFS_volumeServer_storage_io_error_total","SeaweedFS_s3_in_flight_requests","SeaweedFS_volumeServer_volumes","SeaweedFS_volumeServer_read_only_volumes","SeaweedFS_filer_request_total","SeaweedFS_volumeServer_request_total","SeaweedFS_s3_request_total","SeaweedFS_volumeServer_request_seconds_bucket","SeaweedFS_volumeServer_request_seconds_count","SeaweedFS_volumeServer_request_seconds_sum","SeaweedFS_s3_request_seconds_bucket","SeaweedFS_s3_request_seconds_count","SeaweedFS_s3_request_seconds_sum"],"retainedLabels":["__name__","job","instance","cluster","env","component","namespace","type","code","le","bucket","collection"],"valueFilters":[{"source_labels":["__name__","bucket","collection"],"separator":";","regex":"(SeaweedFS_master_is_leader|SeaweedFS_s3_in_flight_upload_bytes|SeaweedFS_s3_in_flight_upload_count|SeaweedFS_volumeServer_max_volumes|SeaweedFS_volumeServer_file_read_failures|SeaweedFS_volumeServer_file_write_failures|SeaweedFS_volumeServer_storage_io_error_total|SeaweedFS_s3_in_flight_requests|SeaweedFS_volumeServer_volumes|SeaweedFS_volumeServer_read_only_volumes|SeaweedFS_filer_request_total|SeaweedFS_volumeServer_request_total|SeaweedFS_s3_request_total|SeaweedFS_volumeServer_request_seconds_bucket|SeaweedFS_volumeServer_request_seconds_count|SeaweedFS_volumeServer_request_seconds_sum|SeaweedFS_s3_request_seconds_bucket|SeaweedFS_s3_request_seconds_count|SeaweedFS_s3_request_seconds_sum);;","action":"keep"}],"target":{"kind":"static","address":"object-store.offscreen-dev-objects.svc:9327","namespace":"offscreen-dev-objects"}},
};
const COMMON_JOB = { enabled: true, metrics_path: '/metrics', scheme: 'http', scrape_interval: '30s', scrape_timeout: '10s', sample_limit: 5000, label_limit: 40, label_name_length_limit: 128, label_value_length_limit: 512, target_limit: 100, honor_labels: false };
const NATIVE_COMPONENT = { 'postgres-cnpg': 'postgres', 'temporal-server': 'temporal', rabbitmq: 'rabbitmq', loki: 'loki', tempo: 'tempo', grafana: 'grafana', seaweedfs: 'seaweedfs' };
const podLabel = (k) => `__meta_kubernetes_pod_label_${k.replace(/[^A-Za-z0-9]/g, '_')}`;
const nativeMetricRelabel = (pol) => [
  { source_labels: ['__name__'], regex: pol.families.join('|'), action: 'keep' },
  ...pol.valueFilters.map((f) => ({ source_labels: f.source_labels, separator: f.separator, regex: f.regex, action: f.action })),
  { regex: pol.retainedLabels.join('|'), action: 'labelkeep' },
];
const podTail = (ns, component, role) => [
  { target_label: 'cluster', replacement: 'offscreen-dev' },
  { target_label: 'env', replacement: 'dev' },
  { target_label: 'component', replacement: component },
  { target_label: 'namespace', replacement: ns },
  { source_labels: ['__meta_kubernetes_pod_name'], target_label: 'pod' },
  ...(role ? [{ source_labels: [podLabel('app.kubernetes.io/component')], target_label: 'role' }] : []),
];
const podHead = (ns) => ({ kubernetes_sd_configs: [{ role: 'pod', namespaces: { names: [ns] } }], first: { source_labels: ['__meta_kubernetes_namespace'], regex: ns, action: 'keep' } });
function expectedNativeJob(name) {
  const pol = NATIVE_POLICY[name];
  const base = { ...COMMON_JOB, job_name: name };
  if (pol.target.kind === 'static') {
    return { ...base, static_configs: [{ targets: [pol.target.address], labels: { cluster: 'offscreen-dev', env: 'dev', component: NATIVE_COMPONENT[name], namespace: pol.target.namespace } }], metric_relabel_configs: nativeMetricRelabel(pol) };
  }
  const t = pol.target;
  const head = podHead(t.namespace);
  const identity = name === 'postgres-cnpg'
    ? { source_labels: [podLabel('cnpg.io/cluster'), podLabel('app.kubernetes.io/name'), '__meta_kubernetes_pod_container_name', '__meta_kubernetes_pod_container_port_name', '__meta_kubernetes_pod_container_port_number'], separator: ';', regex: [t.labels['cnpg.io/cluster'], t.labels['app.kubernetes.io/name'], t.container, t.portName, t.port].join(';'), action: 'keep' }
    : { source_labels: [podLabel('app.kubernetes.io/instance'), podLabel('app.kubernetes.io/name'), podLabel('app.kubernetes.io/component'), '__meta_kubernetes_pod_container_name', '__meta_kubernetes_pod_container_port_name', '__meta_kubernetes_pod_container_port_number'], separator: ';', regex: `temporal;temporal;(${Object.entries(t.containerByRole).map(([r, c]) => `${r};${c}`).join('|')});${t.portName};${t.port}`, action: 'keep' };
  return { ...base, kubernetes_sd_configs: head.kubernetes_sd_configs, relabel_configs: [head.first, identity, ...podTail(t.namespace, NATIVE_COMPONENT[name], name === 'temporal-server')], metric_relabel_configs: nativeMetricRelabel(pol) };
}

/** Exact equality of the seven native jobs plus the structural rules that must hold even if the frozen policy itself were edited. */
function validateNativeJobs(cfg) {
  const p = [];
  const jobs = Object.fromEntries(mergedJobs(cfg).map((j) => [j.name, j]));
  for (const name of NATIVE_JOBS) {
    const j = jobs[name];
    if (!j) { p.push(`${name}.missing`); continue; }
    if (cfg.overlay.scrapeConfigs?.[name] === undefined) p.push(`${name}.not-in-overlay`);
    if (canon(cfg.overlay.scrapeConfigs?.[name]) !== canon(expectedNativeJob(name))) p.push(`${name}.frozen-shape`);
    if (j.honor_labels !== false) p.push(`${name}.honor-labels`);
    if (j.authorization || j.tls_config || j.basic_auth || j.bearer_token || j.bearer_token_file || j.proxy_url || j.params || j.follow_redirects) p.push(`${name}.credentials-or-proxy`);
    const rel = j.relabel_configs ?? [];
    if (rel.some((r) => r.action === 'labelmap' || /annotation|__meta_kubernetes_(?!namespace|pod_name|pod_label_|pod_container_)|__address__|__metrics_path__|__scheme__|__param_/.test(JSON.stringify(r)))) p.push(`${name}.arbitrary-metadata`);
    const mr = j.metric_relabel_configs ?? [];
    if (JSON.stringify(mr[0]?.source_labels) !== '["__name__"]' || mr[0]?.action !== 'keep' || mr.at(-1)?.action !== 'labelkeep' || mr.slice(1, -1).some((r) => r.action !== 'keep')) p.push(`${name}.relabel-order`);
    if (/\.\*|\.\+/.test(mr[0]?.regex ?? '')) p.push(`${name}.broad-family`);
  }
  for (const name of NATIVE_POD_JOBS) {
    const j = jobs[name];
    if (!j) continue;
    if (canon(j.kubernetes_sd_configs?.map((s) => s.role)) !== canon(['pod']) || j.static_configs) p.push(`${name}.discovery`);
  }
  for (const name of NATIVE_STATIC_JOBS) {
    const j = jobs[name];
    if (j && (j.kubernetes_sd_configs || j.relabel_configs)) p.push(`${name}.discovery`);
  }
  // No target may be the S3 endpoint, and no static address may be duplicated.
  const addrs = mergedJobs(cfg).flatMap((j) => (j.static_configs ?? []).flatMap((s) => s.targets ?? []));
  if (addrs.some((a) => /:8333$/.test(a))) p.push('s3-endpoint-scraped');
  return p;
}

/**
 * Minimal Prometheus relabel evaluator for the rule kinds used here: keep/drop, replace (single label, `$1` replacement) and labelkeep.
 * Regexes are fully anchored as in Prometheus. Returns the resulting label set or null when the sample/target is dropped.
 */
function relabel(rules, input) {
  let ls = { ...input };
  for (const r of rules) {
    const val = (r.source_labels ?? []).map((l) => ls[l] ?? '').join(r.separator ?? ';');
    const re = new RegExp(`^(?:${r.regex ?? '(.*)'})$`);
    const action = r.action ?? 'replace';
    if (action === 'keep') { if (!re.test(val)) return null; }
    else if (action === 'drop') { if (re.test(val)) return null; }
    else if (action === 'labelkeep') ls = Object.fromEntries(Object.entries(ls).filter(([k]) => re.test(k)));
    else if (action === 'replace') {
      const m = re.exec(val);
      if (m) ls[r.target_label] = (r.replacement ?? '$1').replace(/\$(\d)/g, (_x, n) => m[Number(n)] ?? '');
    } else throw new Error(`unsupported action ${action}`);
  }
  return ls;
}
const nativeMetricRules = (cfg, job) => mergedJobs(cfg).find((j) => j.name === job).metric_relabel_configs;
const nativeTargetRules = (cfg, job) => mergedJobs(cfg).find((j) => j.name === job).relabel_configs;
/** Samples with the same family that become identical after projection collide in Prometheus; return those collisions. */
function projectedCollisions(rules, samples) {
  const seen = new Map();
  const dup = [];
  for (const s of samples) {
    const out = relabel(rules, s);
    if (!out) continue;
    const key = canon(out);
    if (seen.has(key)) dup.push(key); else seen.set(key, true);
  }
  return dup;
}

const COVERAGE_COMPONENTS_ENABLED = ['postgres', 'temporal', 'rabbitmq', 'loki', 'tempo', 'grafana', 'prometheus', 'collector'];
const COVERAGE_INVENTORY_ONLY = ['kubernetes-control-plane', 'cnpg-operator', 'rabbitmq-operator', 'cert-manager', 'local-path'];
const coverageSources = (c) => [...c.coverage, ...c.redisCoverage, ...c.nativeCoverage, ...c.seaweedfsCoverage];

/** Native and SeaweedFS coverage rows: exact component set, explicit non-enabled dispositions, one disposition per job, job/coverage family equality and panel semantics. */
function validateNativeCoverage(c) {
  const p = [];
  const native = c.nativeCoverage;
  const sea = c.seaweedfsCoverage;
  p.push(...validateCoverage(native, c).map((x) => `native:${x}`), ...validateCoverage(sea, c).map((x) => `seaweedfs:${x}`));
  if (!Array.isArray(native) || !Array.isArray(sea)) return [...p, 'native-not-array'];
  if (!sameSet(native.map((r) => r.component), [...COVERAGE_COMPONENTS_ENABLED, ...COVERAGE_INVENTORY_ONLY, 'traefik'])) p.push('native-component-set');
  if (sea.length !== 1 || sea[0].component !== 'seaweedfs') return [...p, 'seaweedfs-row-set'];
  const all = coverageSources(c);
  const comps = all.map((r) => r.component);
  if (new Set(comps).size !== comps.length) p.push('coverage-component-not-unique');
  const ids = all.flatMap((r) => Object.keys(r.panels));
  if (new Set(ids).size !== ids.length) p.push('panel-id-not-unique');
  const jobOwners = all.filter((r) => r.coverage === 'enabled').flatMap((r) => r.jobs.map((j) => [j, r.component]));
  const jobNames = jobOwners.map(([j]) => j);
  if (new Set(jobNames).size !== jobNames.length) p.push('job-has-two-coverage-rows');
  for (const r of [...native, ...sea]) {
    if (r.coverage === 'enabled') {
      if (r.reason !== '' || !r.jobs.length || !Object.keys(r.workloadSelector).length || r.namespace === null) p.push(`enabled-shape:${r.component}`);
      const ps = Object.entries(r.panels);
      ps.forEach(([id, pn], i) => {
        const q = pn.promql;
        const job = r.jobs[0];
        if (!r.jobs.some((jn) => q.includes(`job="${jn}"`))) p.push(`panel-job:${id}`);
        if (!q.includes('<= 90')) p.push(`panel-freshness:${id}`);
        if (/\bor\b|\bunless\b|vector\(/.test(q)) p.push(`panel-default-fill:${id}`);
        if (/rate\(/.test(q) && !/\[(5m|10m|15m)\]/.test(q)) p.push(`panel-rate-window:${id}`);
        // The first panel is scrape state only; every other panel needs a current successful scrape (exporter/endpoint up is not backend health).
        if (i === 0 && (!/^up\{job="[a-z-]+"\} and /.test(q) || q.replace(/up\{job="[a-z-]+"\}/g, '').match(/[a-zA-Z_]+_[a-z_]+\{/))) p.push(`panel-scrape-state-mixed:${id}`);
        if (i > 0 && !q.includes(`up{job="${job}"} == 1`)) p.push(`panel-needs-scrape-up:${id}`);
      });
    } else {
      if (r.jobs.length || r.requiredFamilies.length || Object.keys(r.panels).length || !r.reason) p.push(`nonenabled-claims:${r.component}`);
      if (!JSON.stringify(r.jobs) === '[]') p.push(`nonenabled-jobs:${r.component}`);
    }
  }
  const byComp = Object.fromEntries(native.map((r) => [r.component, r]));
  for (const comp of COVERAGE_INVENTORY_ONLY) if (byComp[comp]?.coverage !== 'inventory-only') p.push(`not-inventory-only:${comp}`);
  if (byComp.traefik?.coverage !== 'not-applicable' || byComp.traefik.namespace !== null) p.push('traefik-not-applicable');
  // Each job's family keep equals its coverage row's requiredFamilies for the seven new jobs; SeaweedFS exactly one row on the metrics port, not S3.
  for (const [job, comp] of jobOwners) {
    if (!NATIVE_JOBS.includes(job)) continue;
    const row = all.find((r) => r.component === comp);
    const keep = nativeMetricRules(c, job)?.[0];
    if (!keep || !sameSet(split(keep.regex), row.requiredFamilies)) p.push(`job-families-equal-coverage:${job}`);
    if (comp !== NATIVE_COMPONENT[job]) p.push(`job-component:${job}`);
    if (row.namespace !== NATIVE_POLICY[job].target.namespace) p.push(`job-namespace:${job}`);
  }
  if (sea[0].coverage !== 'enabled' || canon(sea[0].jobs) !== canon(['seaweedfs']) || sea[0].namespace !== 'offscreen-dev-objects') p.push('seaweedfs-identity');
  if (canon(sea[0].workloadSelector) !== canon({ app: 'object-store' })) p.push('seaweedfs-selector');
  return p;
}

const CANDIDATE = join(root, '../../../work/changes/open/observability-infrastructure-visibility/NATIVE-SERVICE-CANDIDATE.json');
const candidate = existsSync(CANDIDATE) ? JSON.parse(readFileSync(CANDIDATE, 'utf8')) : null;

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
  'duplicate pod rule': (x) => { const i = kubeletManifestIndex(x, 'ClusterRole'); x.overlay.extraManifests[i] += '  - apiGroups: [""]\n    resources: [pods]\n    verbs: [get, list, watch]\n'; },
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

// ---- OBS-E2-04 T04: native enrollment boundaries ----
const njob = (x, name) => x.overlay.scrapeConfigs[name];
const cnpgPod = (o = {}) => ({ __meta_kubernetes_namespace: 'offscreen-dev-postgres', [podLabel('cnpg.io/cluster')]: 'dev-pg', [podLabel('app.kubernetes.io/name')]: 'postgresql', __meta_kubernetes_pod_name: 'dev-pg-1', __meta_kubernetes_pod_container_name: 'postgres', __meta_kubernetes_pod_container_port_name: 'metrics', __meta_kubernetes_pod_container_port_number: '9187', __address__: '10.0.0.5:9187', ...o });
const temporalPod = (role, container, o = {}) => ({ __meta_kubernetes_namespace: 'offscreen-dev-temporal', [podLabel('app.kubernetes.io/instance')]: 'temporal', [podLabel('app.kubernetes.io/name')]: 'temporal', [podLabel('app.kubernetes.io/component')]: role, __meta_kubernetes_pod_name: `temporal-${role}-0`, __meta_kubernetes_pod_container_name: container, __meta_kubernetes_pod_container_port_name: 'metrics', __meta_kubernetes_pod_container_port_number: '9090', __address__: '10.0.0.6:9090', ...o });

test('native: the exact twelve-job set, enabled rows reference existing jobs and no job is duplicated', () => {
  assert.deepEqual(validateOverlay(base), []);
  assert.deepEqual(validateNativeJobs(base), []);
  assert.deepEqual(mergedJobs(base).map((j) => j.name).sort(), ['collector', 'grafana', 'kube-state-metrics', 'kube-state-metrics-self', 'kubelet-cadvisor', 'kubelet-resource', 'loki', 'postgres-cnpg', 'prometheus', 'rabbitmq', 'redis-exporter', 'seaweedfs', 'tempo', 'temporal-server']);
  assert.equal(base.overlay.extraManifests.length, 5, 'no new workload or RBAC owner: only the pods rule is added to the existing ClusterRole');
  for (const n of NATIVE_JOBS) {
    const j = njob(base, n);
    assert.deepEqual([j.metrics_path, j.scheme, j.scrape_interval, j.scrape_timeout, j.sample_limit, j.target_limit, j.label_limit, j.label_name_length_limit, j.label_value_length_limit, j.honor_labels], ['/metrics', 'http', '30s', '10s', 5000, 100, 40, 128, 512, false], n);
  }
});

test('native: static job targets are the fixed internal Service endpoints; SeaweedFS is the metrics port, never S3', () => {
  const targets = Object.fromEntries(NATIVE_STATIC_JOBS.map((n) => [n, njob(base, n).static_configs]));
  assert.deepEqual(targets.rabbitmq[0].targets, ['rabbitmq.offscreen-dev-rabbitmq.svc:15692']);
  assert.deepEqual(targets.loki[0].targets, ['obs-loki.offscreen-dev-observability.svc:3100']);
  assert.deepEqual(targets.tempo[0].targets, ['obs-tempo.offscreen-dev-observability.svc:3200']);
  assert.deepEqual(targets.grafana[0].targets, ['obs-grafana.offscreen-dev-observability.svc:80']);
  assert.deepEqual(targets.seaweedfs, [{ targets: ['object-store.offscreen-dev-objects.svc:9327'], labels: { cluster: 'offscreen-dev', env: 'dev', component: 'seaweedfs', namespace: 'offscreen-dev-objects' } }]);
  assert.ok(!mergedJobs(base).flatMap((j) => (j.static_configs ?? []).flatMap((s) => s.targets ?? [])).some((a) => /:8333$/.test(a)));
  assert.equal(JSON.stringify(base.overlay).includes('8333'), false);
});

test('native: legacy prometheus and collector jobs and every predecessor job are untouched', () => {
  const jobs = Object.fromEntries(mergedJobs(base).map((j) => [j.name, j]));
  assert.deepEqual(jobs.collector.static_configs, [{ targets: ['obs-collector:8888'] }]);
  assert.equal(jobs.prometheus.scrape_interval, undefined);
  assert.equal(jobs.collector.scrape_interval, undefined);
  assert.deepEqual(validateKubeletJobs(base), []);
  assert.deepEqual(validateRedisManifests(base.overlay), []);
});

test('native: Pod discovery is namespace-bound, label/container/port-bound and ignores annotations and readiness', () => {
  const rules = nativeTargetRules(base, 'postgres-cnpg');
  const ok = relabel(rules, cnpgPod());
  assert.equal(ok.namespace, 'offscreen-dev-postgres');
  assert.equal(ok.pod, 'dev-pg-1');
  assert.equal(ok.component, 'postgres');
  assert.equal(ok.cluster, 'offscreen-dev');
  assert.equal(ok.__address__, '10.0.0.5:9187');
  for (const [why, o] of Object.entries({
    'unrelated namespace': { __meta_kubernetes_namespace: 'offscreen-dev-temporal' },
    'other CNPG cluster': { [podLabel('cnpg.io/cluster')]: 'other-pg' },
    'wrong app label': { [podLabel('app.kubernetes.io/name')]: 'pgbouncer' },
    'wrong container': { __meta_kubernetes_pod_container_name: 'bootstrap' },
    'wrong port number': { __meta_kubernetes_pod_container_port_number: '5432' },
    'wrong port name': { __meta_kubernetes_pod_container_port_name: 'postgresql' },
  })) assert.equal(relabel(rules, cnpgPod(o)), null, why);
  // An arbitrary scrape annotation never redirects the target or admits a pod that lacks the exact labels.
  const annotated = cnpgPod({ __meta_kubernetes_pod_annotation_prometheus_io_port: '1234', __meta_kubernetes_pod_annotation_prometheus_io_scrape: 'true', [podLabel('cnpg.io/cluster')]: 'other-pg' });
  assert.equal(relabel(rules, annotated), null);
  assert.equal(relabel(rules, cnpgPod({ __meta_kubernetes_pod_annotation_prometheus_io_port: '1234' })).__address__, '10.0.0.5:9187');
  assert.ok(!JSON.stringify(rules).includes('annotation') && !JSON.stringify(rules).includes('ready') && !JSON.stringify(rules).includes('phase'));
});

test('native: Temporal admits exactly the four role/container pairs and records the role', () => {
  const rules = nativeTargetRules(base, 'temporal-server');
  for (const [role, c] of [['frontend', 'temporal-frontend'], ['history', 'temporal-history'], ['matching', 'temporal-matching'], ['worker', 'temporal-worker']]) {
    const r = relabel(rules, temporalPod(role, c));
    assert.equal(r.role, role);
    assert.equal(r.namespace, 'offscreen-dev-temporal');
    assert.equal(r.component, 'temporal');
  }
  for (const [why, pod] of Object.entries({
    'role/container mismatch': temporalPod('frontend', 'temporal-history'),
    'unknown role': temporalPod('admintools', 'temporal-admintools'),
    'web role': temporalPod('web', 'temporal-web'),
    'wrong namespace': temporalPod('frontend', 'temporal-frontend', { __meta_kubernetes_namespace: 'offscreen-dev-postgres' }),
    'wrong instance': temporalPod('frontend', 'temporal-frontend', { [podLabel('app.kubernetes.io/instance')]: 'other' }),
    'wrong port': temporalPod('frontend', 'temporal-frontend', { __meta_kubernetes_pod_container_port_number: '7233' }),
  })) assert.equal(relabel(rules, pod), null, why);
});

test('native: CNPG metric admission keeps only dev databases/roles, bounded settings and the dev-pg collector row', () => {
  const m = nativeMetricRules(base, 'postgres-cnpg');
  const s = (o) => ({ job: 'postgres-cnpg', instance: '10.0.0.5:9187', cluster: 'offscreen-dev', env: 'dev', component: 'postgres', namespace: 'offscreen-dev-postgres', pod: 'dev-pg-1', ...o });
  const admitted = [
    s({ __name__: 'cnpg_pg_database_size_bytes', datname: 'dev_3' }),
    s({ __name__: 'cnpg_pg_database_size_bytes', datname: 'temporal_visibility' }),
    s({ __name__: 'cnpg_pg_stat_database_xact_commit', datname: 'postgres' }),
    s({ __name__: 'cnpg_backends_total', datname: 'dev_2', application_name: 'cnpg_metrics_exporter', usename: 'cnpg_metrics_exporter', state: 'idle in transaction (aborted)' }),
    s({ __name__: 'cnpg_backends_total', datname: 'temporal', application_name: '', usename: 'dev_1_run', state: 'active' }),
    s({ __name__: 'cnpg_pg_settings_setting', name: 'max_connections' }),
    s({ __name__: 'cnpg_collector_up', exported_cluster: 'dev-pg' }),
    s({ __name__: 'cnpg_last_error' }),
    s({ __name__: 'cnpg_pg_replication_lag' }),
  ];
  for (const x of admitted) assert.ok(relabel(m, x), canon(x));
  const rejected = [
    s({ __name__: 'cnpg_pg_database_size_bytes', datname: 'customer_db' }),
    s({ __name__: 'cnpg_pg_database_size_bytes', datname: 'dev_0' }),
    s({ __name__: 'cnpg_backends_total', datname: 'dev_1', application_name: 'psql', usename: 'dev_1_run', state: 'active' }),
    s({ __name__: 'cnpg_backends_total', datname: 'dev_1', application_name: '', usename: 'alice', state: 'active' }),
    s({ __name__: 'cnpg_backends_total', datname: 'dev_1', application_name: '', usename: 'dev_1_run', state: 'unexpected' }),
    s({ __name__: 'cnpg_pg_settings_setting', name: 'shared_buffers' }),
    s({ __name__: 'cnpg_collector_up', exported_cluster: 'other-pg' }),
    s({ __name__: 'cnpg_pg_stat_statements_calls', datname: 'dev_1' }),
    s({ __name__: 'cnpg_pg_stat_activity_count' }),
  ];
  for (const x of rejected) assert.equal(relabel(m, x), null, canon(x));
  const out = relabel(m, s({ __name__: 'cnpg_collector_up', exported_cluster: 'dev-pg', extra_label: 'x', cluster: 'offscreen-dev' }));
  assert.equal(out.extra_label, undefined);
  assert.equal(out.cluster, 'offscreen-dev');
  assert.equal(out.exported_cluster, 'dev-pg');
});

test('native: Temporal admits only the system and unknown internal namespaces; sql_in_use has none', () => {
  const m = nativeMetricRules(base, 'temporal-server');
  const s = (o) => ({ job: 'temporal-server', instance: '10.0.0.6:9090', cluster: 'offscreen-dev', env: 'dev', component: 'temporal', namespace: 'offscreen-dev-temporal', pod: 'temporal-frontend-0', role: 'frontend', ...o });
  assert.ok(relabel(m, s({ __name__: 'service_requests', exported_namespace: 'system', operation: 'StartWorkflowExecution', service_name: 'frontend' })));
  assert.ok(relabel(m, s({ __name__: 'persistence_latency_bucket', exported_namespace: '_unknown_', operation: 'x', le: '0.5' })));
  assert.ok(relabel(m, s({ __name__: 'persistence_sql_in_use', db_kind: 'sql' })));
  assert.equal(relabel(m, s({ __name__: 'service_requests', exported_namespace: 'offscreen-app' })), null);
  assert.equal(relabel(m, s({ __name__: 'service_requests', exported_namespace: '' })), null);
  assert.equal(relabel(m, s({ __name__: 'persistence_sql_in_use', exported_namespace: 'offscreen-app' })), null);
  assert.equal(relabel(m, s({ __name__: 'workflow_completed', exported_namespace: 'system' })), null, 'SDK/workflow families are not inferred');
  const kept = relabel(m, s({ __name__: 'service_requests', exported_namespace: 'system', workflow_type: 'x', task_queue: 'y' }));
  assert.equal(kept.workflow_type, undefined);
  assert.equal(kept.task_queue, undefined);
  assert.equal(kept.namespace, 'offscreen-dev-temporal');
  assert.equal(kept.exported_namespace, 'system');
});

test('native: SeaweedFS rejects any nonempty bucket or collection before labelkeep and Grafana keeps only numeric status codes', () => {
  const sm = nativeMetricRules(base, 'seaweedfs');
  const s = (o) => ({ job: 'seaweedfs', instance: 'object-store.offscreen-dev-objects.svc:9327', cluster: 'offscreen-dev', env: 'dev', component: 'seaweedfs', namespace: 'offscreen-dev-objects', ...o });
  assert.ok(relabel(sm, s({ __name__: 'SeaweedFS_volumeServer_volumes', type: 'volume' })));
  assert.ok(relabel(sm, s({ __name__: 'SeaweedFS_s3_request_total', type: 'GET', code: '200' })));
  assert.equal(relabel(sm, s({ __name__: 'SeaweedFS_volumeServer_volumes', bucket: 'customer-bucket' })), null);
  assert.equal(relabel(sm, s({ __name__: 'SeaweedFS_volumeServer_volumes', collection: 'default' })), null);
  assert.equal(relabel(sm, s({ __name__: 'SeaweedFS_volumeServer_volumes', bucket: 'b', collection: 'c' })), null);
  assert.equal(relabel(sm, s({ __name__: 'SeaweedFS_master_replica_placement_mismatch' })), null);
  const gm = nativeMetricRules(base, 'grafana');
  const g = (o) => ({ job: 'grafana', instance: 'obs-grafana.offscreen-dev-observability.svc:80', cluster: 'offscreen-dev', env: 'dev', component: 'grafana', namespace: 'offscreen-dev-observability', ...o });
  assert.ok(relabel(gm, g({ __name__: 'grafana_api_response_status_total', code: '200' })));
  assert.ok(relabel(gm, g({ __name__: 'grafana_api_response_status_total', code: '503' })));
  assert.ok(relabel(gm, g({ __name__: 'grafana_http_request_in_flight' })));
  assert.equal(relabel(gm, g({ __name__: 'grafana_api_response_status_total', code: 'unknown' })), null);
  assert.equal(relabel(gm, g({ __name__: 'grafana_api_response_status_total', code: '' })), null);
  assert.equal(relabel(gm, g({ __name__: 'grafana_api_response_status_total', code: '600' })), null);
  assert.equal(relabel(gm, g({ __name__: 'grafana_http_request_in_flight', code: '200' })), null);
  assert.equal(relabel(gm, g({ __name__: 'grafana_stat_totals_dashboards' })), null);
});

test('native: representative projections never collide; a deliberately colliding pair is detected', () => {
  const gm = nativeMetricRules(base, 'grafana');
  const g = (o) => ({ job: 'grafana', instance: 'i', cluster: 'offscreen-dev', env: 'dev', component: 'grafana', namespace: 'offscreen-dev-observability', __name__: 'grafana_api_response_status_total', ...o });
  assert.deepEqual(projectedCollisions(gm, [g({ code: '200', method: 'GET' }), g({ code: '500', method: 'GET' }), g({ code: '404', method: 'POST' })]), []);
  assert.equal(projectedCollisions(gm, [g({ code: '200', method: 'GET' }), g({ code: '200', method: 'POST' })]).length, 1, 'dropped label would merge two series');
  const tm = nativeMetricRules(base, 'temporal-server');
  const t = (o) => ({ job: 'temporal-server', instance: 'i', cluster: 'offscreen-dev', env: 'dev', component: 'temporal', namespace: 'offscreen-dev-temporal', pod: 'p', role: 'history', __name__: 'service_requests', exported_namespace: 'system', ...o });
  assert.deepEqual(projectedCollisions(tm, [t({ operation: 'a', service_name: 'history' }), t({ operation: 'b', service_name: 'history' }), t({ operation: 'a', service_name: 'history', pod: 'q' }), t({ operation: 'a', exported_namespace: '_unknown_', service_name: 'history' })]), []);
  assert.equal(projectedCollisions(tm, [t({ operation: 'a', task_queue: 'x' }), t({ operation: 'a', task_queue: 'y' })]).length, 1);
  const pm = nativeMetricRules(base, 'postgres-cnpg');
  const c = (o) => ({ job: 'postgres-cnpg', instance: 'i', cluster: 'offscreen-dev', env: 'dev', component: 'postgres', namespace: 'offscreen-dev-postgres', pod: 'dev-pg-1', __name__: 'cnpg_pg_database_size_bytes', ...o });
  assert.deepEqual(projectedCollisions(pm, [c({ datname: 'dev_1' }), c({ datname: 'dev_2' }), c({ datname: 'dev_1', pod: 'dev-pg-2' })]), []);
  // The native `cluster` label must stay distinct from the target `cluster` label through exported_cluster.
  const up = (x) => relabel(pm, c({ __name__: 'cnpg_collector_up', exported_cluster: x }));
  assert.equal(up('dev-pg').cluster, 'offscreen-dev');
  assert.equal(up('dev-pg').exported_cluster, 'dev-pg');
});

test('native: the pods ClusterRole rule is exactly get/list/watch on pods, with nodes rules and binding preserved', () => {
  assert.deepEqual(validateKubeletManifests(base.overlay), []);
  const cr = base.overlay.extraManifests.map(parseManifest).find((d) => d.kind === 'ClusterRole');
  assert.deepEqual(cr.rules, [
    { apiGroups: [''], resources: ['nodes'], verbs: ['get', 'list', 'watch'] },
    { apiGroups: [''], resources: ['nodes/metrics'], verbs: ['get'] },
    { apiGroups: [''], resources: ['pods'], verbs: ['get', 'list', 'watch'] },
  ]);
  const flat = JSON.stringify(cr.rules);
  for (const bad of ['pods/exec', 'pods/proxy', 'pods/log', 'secrets', 'configmaps', '"*"', 'create', 'update', 'patch', 'delete']) assert.ok(!flat.includes(bad), bad);
});

test('native coverage: exact rows, explicit inventory-only/not-applicable dispositions and job/family equality', () => {
  assert.deepEqual(validateNativeCoverage(base), []);
  assert.deepEqual(base.nativeCoverage.map((r) => r.component), ['postgres', 'temporal', 'rabbitmq', 'loki', 'tempo', 'grafana', 'prometheus', 'collector', 'kubernetes-control-plane', 'cnpg-operator', 'rabbitmq-operator', 'cert-manager', 'local-path', 'traefik']);
  for (const r of base.nativeCoverage.filter((x) => x.coverage !== 'enabled')) {
    assert.deepEqual([r.jobs, r.requiredFamilies, r.panels], [[], [], {}], r.component);
    assert.ok(r.reason.length > 0, r.component);
  }
  assert.equal(base.nativeCoverage.find((r) => r.component === 'traefik').coverage, 'not-applicable');
  assert.equal(base.seaweedfsCoverage.length, 1);
  assert.equal(base.seaweedfsCoverage[0].coverage, 'enabled');
  assert.deepEqual(validateCoverage(base.coverage, base), []);
  assert.deepEqual(validateRedisCoverage(base.redisCoverage, base), []);
});

test('native coverage: arrays equal the planner-frozen candidate when it is present', { skip: candidate ? false : 'NATIVE-SERVICE-CANDIDATE.json is retired with the Design; the coverage files are then the sole owner' }, () => {
  assert.deepEqual(base.nativeCoverage, candidate.nativeServices);
  assert.deepEqual(base.seaweedfsCoverage, candidate.seaweedfs);
  assert.deepEqual(NATIVE_POLICY, Object.fromEntries(Object.entries(candidate.newScrapePolicies).map(([k, v]) => [k, { families: v.families, retainedLabels: v.retainedLabels, valueFilters: v.valueFilters, target: v.target }])));
  assert.deepEqual(candidate.existingJobsUnchanged, LEGACY_JOBS);
});

const NATIVE_JOB_NEGATIVES = {
  'duplicate job name': (x) => { x.overlay.scrapeConfigs.dup = { enabled: true, job_name: 'loki', static_configs: [{ targets: ['other:1'] }] }; },
  'duplicate target': (x) => { x.overlay.scrapeConfigs.tempo.static_configs[0].targets = ['obs-loki.offscreen-dev-observability.svc:3100']; },
  'unapproved extra job': (x) => { x.overlay.scrapeConfigs.alertmanager = { enabled: true, static_configs: [{ targets: ['am:9093'] }] }; },
  'job removed (postgres)': (x) => { delete x.overlay.scrapeConfigs['postgres-cnpg']; },
  'job removed (seaweedfs)': (x) => { delete x.overlay.scrapeConfigs.seaweedfs; },
  'seaweedfs S3 endpoint': (x) => { njob(x, 'seaweedfs').static_configs[0].targets = ['object-store.offscreen-dev-objects.svc:8333']; },
  'seaweedfs wrong port': (x) => { njob(x, 'seaweedfs').static_configs[0].targets = ['object-store.offscreen-dev-objects.svc:9328']; },
  'seaweedfs second target': (x) => { njob(x, 'seaweedfs').static_configs[0].targets.push('object-store.offscreen-dev-objects.svc:8333'); },
  'seaweedfs bucket filter removed': (x) => { njob(x, 'seaweedfs').metric_relabel_configs.splice(1, 1); },
  'seaweedfs bucket allowed': (x) => { njob(x, 'seaweedfs').metric_relabel_configs[1].regex = njob(x, 'seaweedfs').metric_relabel_configs[1].regex.replace(/;;$/, ';.*;.*'); },
  'rabbitmq wrong port': (x) => { njob(x, 'rabbitmq').static_configs[0].targets = ['rabbitmq.offscreen-dev-rabbitmq.svc:15672']; },
  'rabbitmq per-object family': (x) => { njob(x, 'rabbitmq').metric_relabel_configs[0].regex += '|rabbitmq_detailed_queue_messages'; },
  'rabbitmq blanket family': (x) => { njob(x, 'rabbitmq').metric_relabel_configs[0].regex = 'rabbitmq_.*'; },
  'loki wildcard family': (x) => { njob(x, 'loki').metric_relabel_configs[0].regex = 'loki_.*'; },
  'tempo extra label': (x) => { njob(x, 'tempo').metric_relabel_configs[1].regex += '|tenant'; },
  'grafana status filter removed': (x) => { njob(x, 'grafana').metric_relabel_configs.splice(1, 1); },
  'grafana status filter widened': (x) => { njob(x, 'grafana').metric_relabel_configs[1].regex = 'grafana_http_request_in_flight;|grafana_api_response_status_total;.*'; },
  'label keep removed': (x) => { njob(x, 'grafana').metric_relabel_configs.pop(); },
  'honor_labels true (loki)': (x) => { njob(x, 'loki').honor_labels = true; },
  'honor_labels removed (cnpg)': (x) => { delete njob(x, 'postgres-cnpg').honor_labels; },
  'sample limit raised': (x) => { njob(x, 'rabbitmq').sample_limit = 20000; },
  'target limit removed': (x) => { delete njob(x, 'loki').target_limit; },
  'interval changed': (x) => { njob(x, 'tempo').scrape_interval = '15s'; },
  'https scheme': (x) => { njob(x, 'grafana').scheme = 'https'; },
  'other metrics path': (x) => { njob(x, 'loki').metrics_path = '/loki/api/v1/push'; },
  'credentials added': (x) => { njob(x, 'grafana').basic_auth = { username: 'admin', password: 'x' }; },
  'bearer token file added': (x) => { njob(x, 'tempo').authorization = { credentials_file: '/var/run/secrets/kubernetes.io/serviceaccount/token' }; },
  'cnpg other namespace': (x) => { njob(x, 'postgres-cnpg').kubernetes_sd_configs[0].namespaces.names = ['offscreen-dev-temporal']; },
  'cnpg all namespaces': (x) => { delete njob(x, 'postgres-cnpg').kubernetes_sd_configs[0].namespaces; },
  'cnpg endpoints role': (x) => { njob(x, 'postgres-cnpg').kubernetes_sd_configs[0].role = 'endpoints'; },
  'cnpg wrong port': (x) => { njob(x, 'postgres-cnpg').relabel_configs[1].regex = 'dev-pg;postgresql;postgres;metrics;5432'; },
  'cnpg label match widened': (x) => { njob(x, 'postgres-cnpg').relabel_configs[1].regex = '.*;postgresql;postgres;metrics;9187'; },
  'cnpg namespace keep removed': (x) => { njob(x, 'postgres-cnpg').relabel_configs.splice(0, 1); },
  'cnpg annotation port': (x) => { njob(x, 'postgres-cnpg').relabel_configs.push({ source_labels: ['__address__', '__meta_kubernetes_pod_annotation_prometheus_io_port'], regex: '([^:]+)(?::\\d+)?;(\\d+)', replacement: '$1:$2', target_label: '__address__' }); },
  'cnpg annotation scrape keep': (x) => { njob(x, 'postgres-cnpg').relabel_configs.push({ source_labels: ['__meta_kubernetes_pod_annotation_prometheus_io_scrape'], regex: 'true', action: 'keep' }); },
  'cnpg labelmap': (x) => { njob(x, 'postgres-cnpg').relabel_configs.push({ action: 'labelmap', regex: '__meta_kubernetes_pod_label_(.+)' }); },
  'cnpg readiness filter': (x) => { njob(x, 'postgres-cnpg').relabel_configs.push({ source_labels: ['__meta_kubernetes_pod_ready'], regex: 'true', action: 'keep' }); },
  'cnpg value filter removed': (x) => { njob(x, 'postgres-cnpg').metric_relabel_configs.splice(1, 1); },
  'cnpg datname widened': (x) => { njob(x, 'postgres-cnpg').metric_relabel_configs[1].regex = njob(x, 'postgres-cnpg').metric_relabel_configs[1].regex.replace('(postgres|dev|temporal|temporal_visibility|dev_[1-9][0-9]*)', '.+'); },
  'cnpg exported_cluster dropped': (x) => { njob(x, 'postgres-cnpg').metric_relabel_configs[2].regex = njob(x, 'postgres-cnpg').metric_relabel_configs[2].regex.replace('|exported_cluster', ''); },
  'cnpg query text family': (x) => { njob(x, 'postgres-cnpg').metric_relabel_configs[0].regex += '|cnpg_pg_stat_statements_calls'; },
  'temporal role/container widened': (x) => { njob(x, 'temporal-server').relabel_configs[1].regex = 'temporal;temporal;(frontend|history|matching|worker);.*;metrics;9090'; },
  'temporal role removed': (x) => { njob(x, 'temporal-server').relabel_configs.pop(); },
  'temporal web role admitted': (x) => { njob(x, 'temporal-server').relabel_configs[1].regex = njob(x, 'temporal-server').relabel_configs[1].regex.replace('(frontend;', '(web;temporal-web|frontend;'); },
  'temporal namespace filter widened': (x) => { njob(x, 'temporal-server').metric_relabel_configs[1].regex = njob(x, 'temporal-server').metric_relabel_configs[1].regex.replace(';(system|_unknown_)', ';.+'); },
  'temporal wildcard family': (x) => { njob(x, 'temporal-server').metric_relabel_configs[0].regex = 'service_.*|persistence_.*'; },
  'temporal exported_namespace dropped': (x) => { njob(x, 'temporal-server').metric_relabel_configs.at(-1).regex = njob(x, 'temporal-server').metric_relabel_configs.at(-1).regex.replace('|exported_namespace', ''); },
  'temporal static target': (x) => { njob(x, 'temporal-server').static_configs = [{ targets: ['temporal-frontend.offscreen-dev-temporal.svc:9090'] }]; },
};
for (const [name, fn] of Object.entries(NATIVE_JOB_NEGATIVES)) {
  test(`negative: native job ${name} is rejected`, () => {
    const x = mutate(fn);
    // A removed or retargeted job leaves coverage dangling; either validator may be the one that flags it.
    assert.ok(validateOverlay(x).length > 0 || validateNativeCoverage(x).length > 0);
  });
}

const NATIVE_RBAC_NEGATIVES = {
  'pods rule removed': (r) => r.splice(2, 1),
  'pods verbs widened': (r) => { r[2].verbs.push('delete'); },
  'pods create': (r) => { r[2].verbs = ['get', 'list', 'watch', 'create']; },
  'pods/exec': (r) => { r[2].resources.push('pods/exec'); },
  'pods/proxy': (r) => { r[2].resources.push('pods/proxy'); },
  'secrets': (r) => { r[2].resources.push('secrets'); },
  'wildcard resource': (r) => { r[2].resources = ['*']; },
  'wildcard verb': (r) => { r[2].verbs = ['*']; },
  'second pods rule': (r) => r.push({ apiGroups: [''], resources: ['pods'], verbs: ['get'] }),
  'nodes/metrics widened': (r) => { r[1].verbs.push('create'); },
  'nodes rule removed': (r) => r.splice(0, 1),
  'extra API group': (r) => r.push({ apiGroups: ['apps'], resources: ['deployments'], verbs: ['get'] }),
};
for (const [name, fn] of Object.entries(NATIVE_RBAC_NEGATIVES)) {
  test(`negative: native RBAC ${name} is rejected`, () => {
    const x = mutate((y) => {
      const i = kubeletManifestIndex(y, 'ClusterRole');
      const d = parseManifest(y.overlay.extraManifests[i]);
      fn(d.rules);
      d.metadata.namespace = undefined;
      y.overlay.extraManifests[i] = stringifyYaml(d);
    });
    assert.notDeepEqual(validateKubeletManifests(x.overlay), []);
  });
}

const NATIVE_COVERAGE_NEGATIVES = {
  'native row dropped (grafana)': (c) => { c.nativeCoverage.splice(5, 1); },
  'seaweedfs row dropped': (c) => { c.seaweedfsCoverage.pop(); },
  'seaweedfs duplicated': (c) => { c.seaweedfsCoverage.push(clone(c.seaweedfsCoverage[0])); },
  'seaweedfs in native array duplicates component': (c) => { c.nativeCoverage.push(clone(c.seaweedfsCoverage[0])); },
  'seaweedfs disabled silently': (c) => { c.seaweedfsCoverage[0].coverage = 'inventory-only'; c.seaweedfsCoverage[0].reason = 'x'; },
  'seaweedfs silent omission (no reason)': (c) => { c.seaweedfsCoverage[0].coverage = 'inventory-only'; c.seaweedfsCoverage[0].reason = ''; },
  'seaweedfs family not collected': (c) => { c.seaweedfsCoverage[0].requiredFamilies.push('SeaweedFS_master_replica_placement_mismatch'); },
  'seaweedfs family dropped from coverage': (c) => { c.seaweedfsCoverage[0].requiredFamilies.pop(); },
  'seaweedfs wrong job': (c) => { c.seaweedfsCoverage[0].jobs = ['seaweed']; },
  'seaweedfs wrong namespace': (c) => { c.seaweedfsCoverage[0].namespace = 'offscreen-dev-storage'; },
  'seaweedfs selector changed': (c) => { c.seaweedfsCoverage[0].workloadSelector = { app: 's3' }; },
  'inventory-only promoted to enabled': (c) => { c.nativeCoverage[8].coverage = 'enabled'; c.nativeCoverage[8].reason = ''; },
  'inventory-only given a job': (c) => { c.nativeCoverage[9].jobs = ['loki']; },
  'inventory-only given a panel': (c) => { c.nativeCoverage[10].panels['offscreen-observability/899'] = { promql: 'up{job="loki"} and (time() - timestamp(up{job="loki"}) <= 90)', unit: 'none', interpretation: 'x' }; },
  'inventory-only reason removed': (c) => { c.nativeCoverage[11].reason = ''; },
  'inventory-only row dropped (cert-manager)': (c) => { c.nativeCoverage.splice(11, 1); },
  'traefik no longer not-applicable': (c) => { c.nativeCoverage[13].coverage = 'inventory-only'; },
  'traefik row dropped': (c) => { c.nativeCoverage.pop(); },
  'unknown extra component': (c) => { c.nativeCoverage.push({ component: 'alertmanager', namespace: 'x', workloadSelector: {}, jobs: [], requiredFamilies: [], panels: {}, coverage: 'inventory-only', reason: 'x' }); },
  'extra field': (c) => { c.nativeCoverage[0].labelMap = {}; },
  'missing field': (c) => { delete c.nativeCoverage[0].reason; },
  'two rows own one job': (c) => { c.nativeCoverage[3].jobs = ['rabbitmq']; },
  'family not collected (loki)': (c) => { c.nativeCoverage[3].requiredFamilies.push('loki_request_duration_seconds'); },
  'family dropped (rabbitmq)': (c) => { c.nativeCoverage[2].requiredFamilies.pop(); },
  'unknown job (temporal)': (c) => { c.nativeCoverage[1].jobs = ['temporal']; },
  'panel id collides across sources': (c) => { c.nativeCoverage[2].panels['offscreen-messaging-cache/701'] = clone(c.nativeCoverage[2].panels['offscreen-messaging-cache/710']); },
  'panel id duplicates seaweedfs panel': (c) => { c.nativeCoverage[3].panels['offscreen-storage/610'] = clone(c.nativeCoverage[3].panels['offscreen-observability/810']); },
  'scrape-state panel reads backend family': (c) => { c.nativeCoverage[3].panels['offscreen-observability/810'].promql = 'loki_ingester_memory_chunks{job="loki"} and (time() - timestamp(loki_ingester_memory_chunks{job="loki"}) <= 90)'; },
  'backend panel ignores scrape up': (c) => { c.nativeCoverage[0].panels['offscreen-postgres/402'].promql = 'cnpg_collector_up{job="postgres-cnpg"} and (time() - timestamp(cnpg_collector_up{job="postgres-cnpg"}) <= 90)'; },
  'panel staleness bound removed': (c) => { c.nativeCoverage[1].panels['offscreen-temporal/502'].promql = c.nativeCoverage[1].panels['offscreen-temporal/502'].promql.replaceAll('<= 90', '<= 99999'); },
  'panel zero default': (c) => { c.nativeCoverage[2].panels['offscreen-messaging-cache/711'].promql += ' or vector(0)'; },
  'panel on wrong job': (c) => { c.nativeCoverage[4].panels['offscreen-observability/821'].promql = c.nativeCoverage[4].panels['offscreen-observability/821'].promql.replaceAll('job="tempo"', 'job="loki"'); },
  'enabled row without panels': (c) => { c.nativeCoverage[5].panels = {}; },
  'enabled row empty selector': (c) => { c.nativeCoverage[0].workloadSelector = {}; },
  'enabled row with reason': (c) => { c.nativeCoverage[0].reason = 'nope'; },
};
for (const [name, fn] of Object.entries(NATIVE_COVERAGE_NEGATIVES)) {
  test(`negative: native coverage ${name} is rejected`, () => {
    const x = mutate(fn);
    assert.notDeepEqual(validateNativeCoverage(x), []);
  });
}

test('native: no service-owner workload, credential or host exposure is introduced by the overlay', () => {
  const docs = base.overlay.extraManifests.map(parseManifest);
  assert.deepEqual(docs.map((d) => `${d.kind}/${d.metadata.name}`).sort(), ['ClusterRole/obs-prometheus-kubelet', 'ClusterRoleBinding/obs-prometheus-kubelet', 'ConfigMap/obs-kubelet-trust', 'Deployment/obs-redis-exporter', 'Service/obs-redis-exporter']);
  const text = JSON.stringify(NATIVE_JOBS.map((n) => njob(base, n)));
  for (const bad of ['password', 'secret', 'token', 'credentials', 'insecure', 'hostPort', 'proxy']) assert.ok(!text.toLowerCase().includes(bad.toLowerCase()), bad);
});
