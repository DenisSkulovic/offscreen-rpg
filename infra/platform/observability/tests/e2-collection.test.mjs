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
  if (!sameSet(names, ['prometheus', 'collector', 'kube-state-metrics', 'kube-state-metrics-self', 'redis-exporter'])) p.push('job-set');
  for (const j of jobs) {
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
  if (Object.keys(cfg.overlay.scrapeConfigs ?? {}).some((k) => !['kube-state-metrics', 'kube-state-metrics-self', 'redis-exporter'].includes(k))) p.push('overlay-extra-job');
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
  const docs = (overlay.extraManifests ?? []).map((m) => parseYaml(String(m).replaceAll('{{ .Release.Namespace }}', 'ns-under-test')));
  const named = docs.filter((d) => d?.metadata?.name === 'obs-redis-exporter');
  return { all: docs, deployment: named.find((d) => d.kind === 'Deployment'), service: named.find((d) => d.kind === 'Service'), count: named.length };
}

/** Exporter Deployment and Service contract frozen by OBS-E2-05 T01. */
function validateRedisManifests(overlay) {
  const p = [];
  const { all, deployment: d, service: s, count } = redisManifests(overlay);
  if (all.length !== 2 || count !== 2 || !d || !s) return ['redis-manifest-set'];
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
    if (!r.panels || !Object.keys(r.panels).length) p.push(`panels:${r.component}`);
    for (const [id, pn] of Object.entries(r.panels ?? {})) {
      if (!/^offscreen-[a-z-]+\/\d+$/.test(id) || !pn.promql || !pn.unit || !pn.interpretation) p.push(`panel:${id}`);
    }
    if (!r.jobs?.length) p.push(`jobs:${r.component}`);
    for (const jn of r.jobs ?? []) {
      const job = jobs[jn];
      if (!job) { p.push(`unknown-job:${jn}`); continue; }
      const keep = (job.metric_relabel_configs ?? []).find((m) => m.action === 'keep');
      const allowed = keep ? split(keep.regex) : [];
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
  assert.deepEqual(base.coverage.map((r) => r.component), ['kubernetes-inventory', 'kubernetes-inventory-health']);
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
