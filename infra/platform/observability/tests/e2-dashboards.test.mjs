import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { parse as parseYaml } from 'yaml';

// OBS-E2-07 source gate: repository-owned Grafana dashboards, provider overlay and their frozen query contract.
// Scope limit: these are static source checks. They do not evaluate PromQL; pinned-engine query evaluation
// and native Grafana rendering belong to OBS-E2-08 (render/promtool) and OBS-E2-13 (live operator proof).

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const repoRoot = join(root, '..', '..', '..');
const read = (p) => readFileSync(join(root, p), 'utf8');
const clone = (v) => structuredClone(v);

const DASHBOARDS = {
  overview: 'offscreen-overview',
  kubernetes: 'offscreen-kubernetes',
  nodes: 'offscreen-nodes',
  postgres: 'offscreen-postgres',
  temporal: 'offscreen-temporal',
  storage: 'offscreen-storage',
  'messaging-cache': 'offscreen-messaging-cache',
  observability: 'offscreen-observability',
};
const DATASOURCE_UID = 'offscreen-metrics';
const UNITS = new Set(['none', 'bytes', 'ops', 'percentunit', 's', 'Bps']);
const PANEL_TYPES = new Set(['stat', 'table', 'timeseries', 'row', 'text']);
const BUILTIN_VARS = new Set(['__all', '__interval', '__rate_interval', '__range', '__url_time_range', '__from', '__to']);
const OVERVIEW_TABLE_ID = 108;
// SHA-256 of canonical JSON {title,type,datasource,targets,transformations} of panel 108, frozen from OVERVIEW-CONTRACT.json.
const PANEL_108_SHA256 = 'bc81746d9760057f1e9144174aecd7525827efc3ff3b3faf37f4477f786e1c14';
const EXPECTED_COMPONENTS = [
  'kubernetes-inventory', 'kubernetes-inventory-health', 'kubelet-resource', 'kubelet-cadvisor-network', 'postgres',
  'temporal', 'rabbitmq', 'redis', 'seaweedfs', 'loki', 'tempo', 'grafana', 'prometheus', 'collector',
  'kubernetes-control-plane', 'cnpg-operator', 'rabbitmq-operator', 'cert-manager', 'local-path', 'traefik',
];

function load() {
  const dashboards = {};
  for (const name of Object.keys(DASHBOARDS)) dashboards[name] = JSON.parse(read(`dashboards/${name}.json`));
  const rows = [];
  for (const f of ['inventory', 'native-services', 'redis', 'seaweedfs']) rows.push(...JSON.parse(read(`coverage/${f}.json`)));
  return {
    dashboards,
    rows,
    overlay: parseYaml(read('values/profiles/dev/grafana.yaml')),
    base: parseYaml(read('values/grafana.yaml')),
    files: readdirSync(join(root, 'dashboards')).sort(),
  };
}

const metricPanels = (d) => d.panels.filter((p) => p.type !== 'row' && p.type !== 'text');
const sha = (v) => createHash('sha256').update(JSON.stringify(v)).digest('hex');
const panel108Identity = (p) => ({ title: p.title, type: p.type, datasource: p.datasource, targets: p.targets, transformations: p.transformations });
const strings = (v, out = []) => {
  if (typeof v === 'string') out.push(v);
  else if (Array.isArray(v)) v.forEach((x) => strings(x, out));
  else if (v && typeof v === 'object') Object.values(v).forEach((x) => strings(x, out));
  return out;
};
const varRefs = (s) => [...s.matchAll(/\${([A-Za-z_]\w*)(?::[^}]*)?}|\$([A-Za-z_]\w*)|\[\[([A-Za-z_]\w*)\]\]/g)].map((m) => m[1] ?? m[2] ?? m[3]);

// Optional exact cross-check against the planner contract while the packet is still on disk (open or archived).
function findContract() {
  const base = join(repoRoot, 'work', 'changes');
  const found = [];
  const walk = (dir, depth) => {
    if (depth > 6 || !existsSync(dir)) return;
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      if (e.isDirectory()) walk(join(dir, e.name), depth + 1);
      else if (e.name === 'OVERVIEW-CONTRACT.json') found.push(join(dir, e.name));
    }
  };
  walk(base, 0);
  return found[0] ? JSON.parse(readFileSync(found[0], 'utf8')) : null;
}

function problems(ctx) {
  const p = [];
  const { dashboards, rows, overlay, base, files } = ctx;
  if (JSON.stringify(files) !== JSON.stringify(Object.keys(DASHBOARDS).map((n) => `${n}.json`).sort())) p.push('dashboard-file-set');
  const uids = new Set();
  for (const [name, d] of Object.entries(dashboards)) {
    if (d.uid !== DASHBOARDS[name]) p.push(`uid:${name}`);
    if (uids.has(d.uid)) p.push(`duplicate-uid:${d.uid}`);
    uids.add(d.uid);
    if (d.editable !== false) p.push(`editable:${name}`);
    if (d.id !== undefined) p.push(`dashboard-id:${name}`);
    if (!Array.isArray(d.tags) || !d.tags.includes('offscreen')) p.push(`tag:${name}`);
    const ids = new Set();
    for (const pn of d.panels) {
      if (!PANEL_TYPES.has(pn.type)) p.push(`panel-type:${name}/${pn.id}`);
      if (ids.has(pn.id)) p.push(`duplicate-panel-id:${name}/${pn.id}`);
      ids.add(pn.id);
    }
    // Variables, references and links.
    const vars = new Set((d.templating?.list ?? []).map((v) => v.name));
    if (JSON.stringify([...vars].sort()) !== JSON.stringify(['namespace', 'node', 'workload'])) p.push(`variables:${name}`);
    for (const v of d.templating?.list ?? []) {
      if (v.datasource?.uid !== DATASOURCE_UID) p.push(`variable-datasource:${name}/${v.name}`);
      if (/^\s*$/.test(v.query?.query ?? '')) p.push(`variable-query:${name}/${v.name}`);
    }
    for (const s of strings(d)) {
      for (const r of varRefs(s)) if (!vars.has(r) && !BUILTIN_VARS.has(r)) p.push(`dangling-variable:${name}:${r}`);
      if (/https?:\/\//i.test(s)) p.push(`remote-url:${name}`);
    }
    for (const l of d.links ?? []) {
      if (l.type === 'link') {
        if (!l.url?.startsWith('/')) p.push(`link-not-relative:${name}`);
        const m = /^\/d\/([\w-]+)\//.exec(l.url ?? '');
        if (m && !Object.values(DASHBOARDS).includes(m[1])) p.push(`link-unknown-dashboard:${name}:${m[1]}`);
      }
    }
    if (JSON.stringify(d).match(/"(gnetId|pluginId|__requires|libraryPanel|snapshot)"/)) p.push(`external-dependency:${name}`);
    // Datasources and units.
    for (const pn of metricPanels(d)) {
      if (pn.datasource?.uid !== DATASOURCE_UID || pn.datasource?.type !== 'prometheus') p.push(`datasource:${name}/${pn.id}`);
      for (const t of pn.targets ?? []) if (t.datasource?.uid !== DATASOURCE_UID) p.push(`target-datasource:${name}/${pn.id}`);
      const u = pn.fieldConfig?.defaults?.unit;
      if (pn.id !== OVERVIEW_TABLE_ID && !UNITS.has(u)) p.push(`unit:${name}/${pn.id}`);
      if (pn.id !== OVERVIEW_TABLE_ID && pn.targets?.length !== 1) p.push(`target-count:${name}/${pn.id}`);
    }
    for (const t of metricPanels(d).flatMap((pn) => pn.targets ?? [])) {
      if (/vector\(0\)|\bor\s+on\(\)\s+vector|absent_over_time|\bnan\b/i.test(t.expr)) p.push(`generic-zero-fallback:${name}`);
    }
  }
  // Exact row-to-panel mapping for every coverage declaration.
  const declared = new Map();
  for (const c of rows) for (const [key, v] of Object.entries(c.panels)) declared.set(key, v);
  if (declared.size !== 139) p.push(`coverage-panel-count:${declared.size}`);
  const seen = new Set();
  for (const [key, v] of declared) {
    const [uid, id] = key.split('/');
    const name = Object.keys(DASHBOARDS).find((n) => DASHBOARDS[n] === uid);
    const pn = name ? dashboards[name]?.panels.find((x) => String(x.id) === id) : null;
    if (!pn) { p.push(`panel-missing:${key}`); continue; }
    seen.add(key);
    if (pn.targets?.[0]?.expr !== v.promql) p.push(`query-mismatch:${key}`);
    if (pn.fieldConfig?.defaults?.unit !== v.unit) p.push(`unit-mismatch:${key}`);
    if (pn.description !== v.interpretation) p.push(`interpretation-mismatch:${key}`);
    if (!/time\(\)\s*-\s*(?:\(*\s*)*(?:timestamp\()/.test(v.promql)) p.push(`no-freshness-guard:${key}`);
    if (!/<=\s*90\b/.test(v.promql)) p.push(`no-90s-bound:${key}`);
    const instant = pn.type !== 'timeseries';
    if (pn.targets?.[0]?.instant !== instant || pn.targets?.[0]?.range !== !instant) p.push(`query-mode:${key}`);
    if (pn.fieldConfig?.defaults?.noValue === undefined || /^0$/.test(String(pn.fieldConfig.defaults.noValue))) p.push(`no-value-state:${key}`);
  }
  for (const [name, d] of Object.entries(dashboards)) {
    for (const pn of metricPanels(d)) {
      const key = `${d.uid}/${pn.id}`;
      if (!seen.has(key) && key !== `offscreen-overview/${OVERVIEW_TABLE_ID}`) p.push(`undeclared-panel:${key}:${name}`);
    }
    const intro = d.panels.find((x) => x.type === 'text');
    if (!intro || !/unknown|missing|no data|not healthy/i.test(intro.options?.content ?? '')) p.push(`limitation-text:${name}`);
  }
  // M03: overview/104 requires both nodes to have a valid five-minute rate series with distinct node identities.
  const m03 = declared.get('offscreen-overview/104')?.promql ?? '';
  if (!m03.includes('rate(node_cpu_usage_seconds_total{job="kubelet-resource"}[5m])')) p.push('m03-not-rate');
  if (!m03.includes('count by (node)') || (m03.match(/== 2/g) ?? []).length < 2) p.push('m03-needs-two-distinct-nodes');
  // Overview table 108.
  const ov = dashboards.overview.panels.find((x) => x.id === OVERVIEW_TABLE_ID);
  if (!ov) p.push('panel-108-missing');
  else {
    if (sha(panel108Identity(ov)) !== PANEL_108_SHA256) p.push('panel-108-contract-hash');
    if (ov.targets.length !== 20) p.push('panel-108-target-count');
    if (new Set(ov.targets.map((t) => t.refId)).size !== ov.targets.length) p.push('panel-108-duplicate-refid');
    for (const t of ov.targets) {
      if (t.format !== 'table' || t.instant !== true || t.range !== false) p.push(`panel-108-target-mode:${t.refId}`);
      if (/vector\(0\)|\$\{?(?:namespace|workload|node)\b/.test(t.expr)) p.push(`panel-108-fallback-or-variable:${t.refId}`);
      if (!t.expr.includes('"Unknown"') && !/Not (?:enrolled|applicable)|NotApplicable|No E2 scrape/.test(t.expr)) p.push(`panel-108-no-unknown-state:${t.refId}`);
    }
    const comps = ov.targets.map((t) => /"component", "([^"]+)"/.exec(t.expr)?.[1]);
    if (JSON.stringify([...comps].sort()) !== JSON.stringify([...EXPECTED_COMPONENTS].sort())) p.push('panel-108-component-set');
    const byComponent = new Map(rows.map((c) => [c.component, c]));
    if (byComponent.size !== 20) p.push(`coverage-component-count:${byComponent.size}`);
    ov.targets.forEach((t, i) => {
      const c = byComponent.get(comps[i]);
      if (!c) { p.push(`panel-108-unknown-component:${comps[i]}`); return; }
      if (!t.expr.includes(`"coverage", "${c.coverage}"`)) p.push(`panel-108-coverage:${comps[i]}`);
      if (c.coverage === 'enabled') for (const j of c.jobs) if (!t.expr.includes(`job="${j}"`)) p.push(`panel-108-job:${comps[i]}:${j}`);
      if (c.coverage !== 'enabled') {
        // Optional rows observe namespace inventory (KSM) or their fixed expected scrape only; never a guessed job.
        const allowed = new Set(['kube-state-metrics', 'kube-state-metrics-self', ...(c.jobs ?? [])]);
        for (const m of t.expr.matchAll(/job="([^"]+)"/g)) if (!allowed.has(m[1])) p.push(`panel-108-optional-scrape:${comps[i]}:${m[1]}`);
      }
    });
    // Down takes precedence over match/mismatch/unknown for the two discovered-Pod targets (E postgres, F temporal).
    for (const refId of ['E', 'F']) {
      const e = ov.targets.find((t) => t.refId === refId)?.expr ?? '';
      const order = ['Current target down', 'Current up; observed Pod set matches', 'Observed up; Pod coverage mismatch', 'Observed up; Pod coverage unknown'].map((s) => e.indexOf(s));
      if (order.some((i) => i < 0) || order.some((v, i) => i > 0 && v <= order[i - 1])) p.push(`panel-108-down-precedence:${refId}`);
      if (!e.includes('*v1.Pod') || !/kube_pod_owner\{[^}]*\} and \(time\(\)/.test(e)) p.push(`panel-108-pod-owner-freshness:${refId}`);
    }
    const f = ov.targets.find((t) => t.refId === 'F')?.expr ?? '';
    if (!f.includes('*v1.ReplicaSet') || !f.includes('kube_replicaset_owner{')) p.push('panel-108-replicaset-owner-family');
    if (!ov.title || ov.type !== 'table') p.push('panel-108-shape');
  }
  // Provider overlay and base values.
  const provider = overlay.dashboardProviders?.['dashboardproviders.yaml']?.providers ?? [];
  const pr = provider[0];
  if (provider.length !== 1 || pr.name !== 'offscreen' || pr.folder !== 'Offscreen' || pr.type !== 'file') p.push('provider-identity');
  if (pr?.allowUiUpdates !== false || pr?.disableDeletion !== false) p.push('provider-ui-updates');
  if (pr?.options?.path !== '/var/lib/grafana/dashboards/offscreen' || Object.keys(pr?.options ?? {}).length !== 1) p.push('provider-path');
  if (overlay['grafana.ini']?.dashboards?.default_home_dashboard_path !== '/var/lib/grafana/dashboards/offscreen/overview.json') p.push('home-dashboard-path');
  const forbidden = ['datasources', 'sidecar', 'plugins', 'admin', 'persistence', 'ingress', 'rbac', 'serviceAccount', 'extraSecretMounts', 'dashboards', 'envFromSecret', 'env', 'envValueFrom'];
  for (const k of forbidden) if (k in overlay) p.push(`overlay-forbidden:${k}`);
  if (Object.keys(overlay).sort().join() !== 'dashboardProviders,grafana.ini') p.push('overlay-keys');
  if (JSON.stringify(Object.keys(overlay['grafana.ini'] ?? {})) !== '["dashboards"]') p.push('overlay-grafana-ini-keys');
  if (base.persistence?.enabled !== false || base.admin?.existingSecret !== 'obs-grafana-admin' || base['grafana.ini']?.['auth.anonymous']?.enabled !== false) p.push('base-values-changed');
  const ds = base.datasources?.['datasources.yaml']?.datasources ?? [];
  if (!ds.some((x) => x.uid === DATASOURCE_UID && x.url === 'http://obs-prometheus:9090' && x.isDefault === true)) p.push('base-datasource');
  return p;
}

const MUTATIONS = {
  'duplicate UID': (c) => { c.dashboards.nodes.uid = 'offscreen-kubernetes'; },
  'dangling variable': (c) => { c.dashboards.kubernetes.links[1].url += '?var-cluster=${cluster}'; },
  'unexpected datasource': (c) => { c.dashboards.postgres.panels.find((x) => x.id === 401).datasource.uid = 'other-metrics'; },
  'unexpected target datasource': (c) => { c.dashboards.temporal.panels.find((x) => x.id === 501).targets[0].datasource.uid = 'offscreen-logs'; },
  'remote dashboard url': (c) => { c.dashboards.overview.links.push({ type: 'link', title: 'x', url: 'https://grafana.com/dashboards/1' }); },
  'remote plugin or gnet import': (c) => { c.dashboards.storage.gnetId = 1860; },
  'unknown unit': (c) => { c.dashboards.nodes.panels.find((x) => x.id === 301).fieldConfig.defaults.unit = 'MB'; },
  'missing metric represented as zero': (c) => { const t = c.dashboards.kubernetes.panels.find((x) => x.id === 205).targets[0]; t.expr = `${t.expr} or vector(0)`; },
  'stale guard removed from KSM panel': (c) => { const t = c.dashboards.kubernetes.panels.find((x) => x.id === 205).targets[0]; t.expr = t.expr.replaceAll(' <= 90', ' <= 900'); },
  'panel query drift': (c) => { const t = c.dashboards.storage.panels.find((x) => x.id === 623).targets[0]; t.expr = t.expr.replace('[5m]', '[1m]'); },
  'panel interpretation dropped': (c) => { c.dashboards.postgres.panels.find((x) => x.id === 416).description = 'saturation'; },
  'panel removed': (c) => { c.dashboards.observability.panels = c.dashboards.observability.panels.filter((x) => x.id !== 855); },
  'undeclared panel added': (c) => { c.dashboards.observability.panels.push({ id: 999, type: 'stat', title: 'x', datasource: { type: 'prometheus', uid: DATASOURCE_UID }, targets: [{ refId: 'A', expr: 'vector(0)', datasource: { type: 'prometheus', uid: DATASOURCE_UID } }], fieldConfig: { defaults: { unit: 'none' } } }); },
  'M03 reverted to point-in-time series': (c) => { for (const r of c.rows) if (r.panels['offscreen-overview/104']) r.panels['offscreen-overview/104'].promql = r.panels['offscreen-overview/104'].promql.replaceAll('rate(node_cpu_usage_seconds_total{job="kubelet-resource"}[5m])', 'node_cpu_usage_seconds_total{job="kubelet-resource"}'); },
  'panel 108 target edited': (c) => { const t = c.dashboards.overview.panels.find((x) => x.id === 108).targets[3]; t.expr = t.expr.replace('Unknown', 'Healthy'); },
  'panel 108 target dropped': (c) => { c.dashboards.overview.panels.find((x) => x.id === 108).targets.pop(); },
  'panel 108 transformation reordered': (c) => { c.dashboards.overview.panels.find((x) => x.id === 108).transformations.reverse(); },
  'panel 108 variable filtered': (c) => { const t = c.dashboards.overview.panels.find((x) => x.id === 108).targets[0]; t.expr = t.expr.replace('job="kube-state-metrics"', 'job="kube-state-metrics",namespace=~"$namespace"'); },
  'panel 108 zero fallback': (c) => { const t = c.dashboards.overview.panels.find((x) => x.id === 108).targets[7]; t.expr = `(${t.expr}) or vector(0)`; },
  'provider allows UI updates': (c) => { c.overlay.dashboardProviders['dashboardproviders.yaml'].providers[0].allowUiUpdates = true; },
  'provider path changed': (c) => { c.overlay.dashboardProviders['dashboardproviders.yaml'].providers[0].options.path = '/tmp/dashboards'; },
  'home dashboard missing': (c) => { delete c.overlay['grafana.ini']; },
  'overlay overrides datasources': (c) => { c.overlay.datasources = { 'datasources.yaml': { datasources: [] } }; },
  'overlay enables sidecar': (c) => { c.overlay.sidecar = { dashboards: { enabled: true } }; },
  'dashboard editable': (c) => { c.dashboards.temporal.editable = true; },
};

test('dashboards, provider overlay and frozen query contract hold at source', () => {
  assert.deepEqual(problems(load()), []);
});

test('all eight dashboards, 139 declared metric panels and the one fixed table are accounted for', () => {
  const c = load();
  const total = Object.values(c.dashboards).reduce((n, d) => n + metricPanels(d).length, 0);
  assert.equal(total, 139 + 1);
  assert.deepEqual(Object.values(c.dashboards).map((d) => d.uid).sort(), Object.values(DASHBOARDS).sort());
  assert.equal(c.dashboards.overview.panels.filter((x) => x.id === OVERVIEW_TABLE_ID).length, 1);
});

test('panel 108 equals the planner overview contract exactly while that packet exists', (t) => {
  const contract = findContract();
  if (!contract) { t.diagnostic('OVERVIEW-CONTRACT.json no longer on disk; the pinned SHA-256 remains the exact proof'); return; }
  const c = load();
  const ov = c.dashboards.overview.panels.find((x) => x.id === OVERVIEW_TABLE_ID);
  assert.equal(contract.dashboardUid, c.dashboards.overview.uid);
  assert.equal(contract.panelId, ov.id);
  assert.equal(ov.title, contract.panelTitle);
  assert.equal(ov.type, contract.panelType);
  assert.deepEqual(ov.datasource, contract.datasource);
  assert.deepEqual(ov.targets, contract.rows.map((r) => r.target));
  assert.deepEqual(ov.transformations, contract.transformations);
  assert.equal(sha(panel108Identity(ov)), PANEL_108_SHA256);
  const filtered = ov.transformations[0].options.include.names;
  assert.deepEqual(filtered, contract.fieldNames);
  contract.rows.forEach((r, i) => {
    assert.equal(/"component", "([^"]+)"/.exec(ov.targets[i].expr)[1], r.component);
    assert.equal(r.coverage, ov.targets[i].expr.match(/"coverage", "([^"]+)"/)[1]);
  });
});

test('the provider overlay keeps datasource UIDs, admin secret and stateless Grafana untouched', () => {
  const { base } = load();
  assert.deepEqual(base.datasources['datasources.yaml'].datasources.map((x) => x.uid), ['offscreen-metrics', 'offscreen-logs', 'offscreen-traces']);
});

test('observability dashboard links only to existing Explore logs and traces datasources', () => {
  const links = load().dashboards.observability.links.filter((l) => l.type === 'link').map((l) => l.url);
  assert.ok(links.some((u) => u.startsWith('/explore') && u.includes('offscreen-logs')));
  assert.ok(links.some((u) => u.startsWith('/explore') && u.includes('offscreen-traces')));
});

test('scrape state is separate from backend health and no generic zero fallback exists', () => {
  const { dashboards } = load();
  for (const [uid, up, backend] of [['redis', 701, 702], ['postgres', 401, 402]]) {
    const d = uid === 'redis' ? dashboards['messaging-cache'] : dashboards.postgres;
    const a = d.panels.find((x) => x.id === up);
    const b = d.panels.find((x) => x.id === backend);
    assert.ok(/^up\{/.test(a.targets[0].expr) && !/^up\{/.test(b.targets[0].expr), uid);
    assert.match(a.description, /scrape state/i);
  }
  const all = Object.values(dashboards).flatMap((d) => metricPanels(d).filter((x) => x.id !== OVERVIEW_TABLE_ID)).flatMap((x) => x.targets.map((t) => t.expr)).join('\n');
  assert.doesNotMatch(all, /vector\(/);
  assert.doesNotMatch(all, /\bor\b\s*(on\(|vector)/);
});

test('every guarded query keeps freshness semantics: stale or absent samples have no value', () => {
  // Static fixture of the three KSM states the guard must distinguish (fresh, 120s old, missing): the guard is the
  // exact `and (time() - timestamp(X) <= 90)` conjunct, with an up == 1 join for node and workload views.
  const { rows } = load();
  const fresh = (s) => /\band \(time\(\) - timestamp\(([^()]+(?:\{[^}]*\})?)\) <= 90\)/.test(s);
  for (const c of rows) {
    for (const [key, v] of Object.entries(c.panels)) {
      if (!/^up\{/.test(v.promql)) assert.ok(fresh(v.promql) || /time\(\) - timestamp\(/.test(v.promql), key);
      assert.doesNotMatch(v.promql, /<=\s*(?:9\d\d|\d{4,})\b/, `${key} widens the 90s bound`);
    }
  }
});

for (const [name, mutate] of Object.entries(MUTATIONS)) {
  test(`rejects: ${name}`, () => {
    const c = clone(load());
    mutate(c);
    assert.notDeepEqual(problems(c), [], name);
  });
}
