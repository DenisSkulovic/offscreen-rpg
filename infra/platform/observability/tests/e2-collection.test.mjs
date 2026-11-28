import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { parse as parseYaml } from 'yaml';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => readFileSync(join(root, p), 'utf8');
const load = () => ({
  base: parseYaml(read('values/prometheus.yaml')),
  overlay: parseYaml(read('values/profiles/dev/prometheus.yaml')),
  coverage: JSON.parse(read('coverage/inventory.json')),
  lock: read('locks/e2-images.tsv'),
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

function jobProblems(job, { port, families, labels, sampleLimit, component }) {
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
  if (!Array.isArray(sc) || sc.length !== 1 || !sameSet(sc[0].targets ?? [], [`obs-kube-state-metrics:${port}`])) p.push(`${job.name}.targets`);
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
  if (!sameSet(names, ['prometheus', 'collector', 'kube-state-metrics', 'kube-state-metrics-self'])) p.push('job-set');
  for (const j of jobs) {
    if (j.kubernetes_sd_configs || (j.relabel_configs ?? []).some((r) => r.action === 'labelmap' || /annotation/.test(JSON.stringify(r)))) p.push(`generic-job:${j.name}`);
  }
  if (cfg.overlay.extraScrapeConfigs) p.push('extraScrapeConfigs');
  const byName = Object.fromEntries(jobs.map((j) => [j.name, j]));
  if (byName['kube-state-metrics']) p.push(...jobProblems(byName['kube-state-metrics'], { port: 8080, families: OBJECT_FAMILIES, labels: OBJECT_LABELS, sampleLimit: 20000, component: 'kubernetes-inventory' }));
  if (byName['kube-state-metrics-self']) p.push(...jobProblems(byName['kube-state-metrics-self'], { port: 8081, families: SELF_FAMILIES, labels: ['resource', 'result'], sampleLimit: 5000, component: 'kubernetes-inventory-health' }));
  // Existing jobs keep their base semantics.
  if (JSON.stringify(byName.collector?.static_configs) !== JSON.stringify([{ targets: ['obs-collector:8888'] }])) p.push('collector-changed');
  if (Object.keys(cfg.overlay.scrapeConfigs ?? {}).some((k) => !['kube-state-metrics', 'kube-state-metrics-self'].includes(k))) p.push('overlay-extra-job');
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
      if (!/^offscreen-[a-z]+\/\d+$/.test(id) || !pn.promql || !pn.unit || !pn.interpretation) p.push(`panel:${id}`);
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
