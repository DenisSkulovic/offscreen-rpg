import assert from 'node:assert/strict';
import { Buffer } from 'node:buffer';
import { execFileSync, spawnSync } from 'node:child_process';
import { createHash, X509Certificate } from 'node:crypto';
import {
  copyFileSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import process from 'node:process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';
import test from 'node:test';
import { parse as parseYaml, parseAllDocuments, stringify } from 'yaml';
import { runPlatformCommand } from '../../common/commands.mjs';
import {
  helmValuesArgv,
  loadArtifacts,
  loadObservabilityVariants,
  loadOperationalArtifactSet,
  parseHelperImageLock,
} from '../artifacts.mjs';

// render.test.mjs tampers with checked-in values files in place, and both files
// load them. Serialize the two files (separate processes under `node --test`)
// with a process-lifetime lock so neither observes the other's temporary edits.
function acquireSourceTreeLock() {
  const dir = join(tmpdir(), 'offscreen-obs-artifact-tests.lock');
  const pidFile = join(dir, 'pid');
  for (;;) {
    try {
      mkdirSync(dir);
      writeFileSync(pidFile, String(process.pid));
      break;
    } catch (error) {
      if (error?.code !== 'EEXIST') throw error;
      let owner = NaN;
      try {
        owner = Number(readFileSync(pidFile, 'utf8'));
        process.kill(owner, 0);
      } catch (probe) {
        if (probe?.code === 'ESRCH' || Number.isNaN(owner)) {
          // Stale only when the recorded owner is gone (or never wrote a pid
          // for more than a moment).
          if (probe?.code === 'ESRCH')
            rmSync(dir, { recursive: true, force: true });
        }
      }
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 100);
    }
  }
  process.on('exit', () => rmSync(dir, { recursive: true, force: true }));
}
acquireSourceTreeLock();

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const NS = 'offscreen-dev-observability';
const work = mkdtempSync(join(tmpdir(), 'e2-artifacts-'));
test.after(() => rmSync(work, { recursive: true, force: true }));

const clone = (value) => JSON.parse(JSON.stringify(value));

// ---------------------------------------------------------------- fixtures
// Test-only public certificates generated on the fly. Private keys stay in a
// temporary directory removed at exit; nothing is a production default.
function makeRoot(cn) {
  const key = join(work, `${cn}.key`);
  const crt = join(work, `${cn}.crt`);
  execFileSync(
    'openssl',
    [
      'req',
      '-x509',
      '-newkey',
      'ec',
      '-pkeyopt',
      'ec_paramgen_curve:prime256v1',
      '-nodes',
      '-keyout',
      key,
      '-out',
      crt,
      '-subj',
      `/CN=${cn}`,
      '-days',
      '30',
      '-addext',
      'basicConstraints=critical,CA:TRUE',
    ],
    { stdio: 'ignore' },
  );
  const x = new X509Certificate(readFileSync(crt));
  const lines = x.raw.toString('base64').match(/.{1,64}/g);
  return {
    caSha256: createHash('sha256').update(x.raw).digest('hex'),
    caPem: `-----BEGIN CERTIFICATE-----\n${lines.join('\n')}\n-----END CERTIFICATE-----\n`,
  };
}
function bindingFrom(body) {
  return {
    ...body,
    bindingSha256: createHash('sha256')
      .update(JSON.stringify(body))
      .digest('hex'),
  };
}
const NODES = ['offscreen-dev-control-plane', 'offscreen-dev-worker'];
const BODY = {
  schema: 1,
  contextName: 'kind-offscreen-dev',
  kubeSystemUid: 'kube-system-uid',
  baselineUid: 'baseline-uid',
  nodes: NODES.map((name, i) => ({
    name,
    nodeUid: `node-uid-${i}`,
    dockerId: String(i + 1).repeat(64),
    ...makeRoot(name),
  })),
};
const BINDING = bindingFrom(BODY);
const CA_BUNDLE = BODY.nodes.map((n) => n.caPem).join('');

function helmRun(command, args, options) {
  if (command !== 'helm') {
    return {
      ok: false,
      status: 1,
      stdout: '',
      stderr: 'unexpected command',
      timedOut: false,
      missing: false,
    };
  }
  return runPlatformCommand(command, args, options);
}

/** Real helm output per release name, captured once for fixture negatives. */
const captured = new Map();
function capturingRun(command, args, options) {
  const result = helmRun(command, args, options);
  if (command === 'helm' && args[0] === 'template') {
    captured.set(`${captured.get('__tag') ?? ''}${args[1]}`, result);
  }
  return result;
}
function cacheRun(command, args) {
  assert.equal(command, 'helm');
  const hit = captured.get(`e2:${args[1]}`);
  assert.ok(hit, `no captured render for ${args[1]}`);
  return hit;
}
/** Run with one release's output rewritten by `mutate(docs)`. */
function mutatedRun(release, mutate) {
  return (command, args) => {
    const real = cacheRun(command, args);
    if (args[1] !== release) return real;
    const docs = parseAllDocuments(real.stdout)
      .map((d) => d.toJS())
      .filter(Boolean);
    const out = mutate(docs) ?? docs;
    return { ...real, stdout: out.map((d) => stringify(d)).join('---\n') };
  };
}

captured.set('__tag', 'e2:');
const E2 = loadArtifacts('dev', {
  run: capturingRun,
  variant: 'dev-e2',
  kubeletTrust: BINDING,
});
captured.set('__tag', '');

const find = (docs, kind, name) =>
  docs.find((d) => d.kind === kind && d.metadata.name === name);
const E2_RELEASE = (name) => E2.releases.find((r) => r.name === name);

const LOCKS = parseHelperImageLock(
  readFileSync(join(root, 'locks/e2-images.tsv'), 'utf8'),
);

function expectInvalid(run, pattern, deps = {}) {
  assert.throws(
    () =>
      loadArtifacts('dev', {
        run,
        variant: 'dev-e2',
        kubeletTrust: BINDING,
        ...deps,
      }),
    pattern,
  );
}

// ------------------------------------------------------------- four renders
function directRender(release, valuesFiles, extra, namespace) {
  const out = spawnSync(
    'helm',
    [
      'template',
      release.name,
      release.chartPath,
      '--namespace',
      namespace,
      ...valuesFiles.flatMap((f) => ['-f', f]),
      ...extra,
    ],
    { encoding: 'utf8', maxBuffer: 1 << 28 },
  );
  assert.equal(out.status, 0, out.stderr);
  return parseAllDocuments(out.stdout)
    .map((d) => d.toJS())
    .filter(Boolean);
}

test('actual Helm render of dev-e1-base, dev-e1-developer and release-e1 equals independent baseline render', () => {
  const sets = [
    ['dev', 'dev-e1-base'],
    ['dev', 'dev-e1-developer'],
    ['release', 'release-e1'],
  ];
  for (const [profileId, artifactId] of sets) {
    const bundle = loadArtifacts(profileId, { variant: artifactId });
    assert.equal(bundle.artifactId, artifactId);
    assert.equal(bundle.kubeletTrust, undefined);
    assert.equal(bundle.kubeletTrustBindingSha256, undefined);
    for (const release of bundle.releases) {
      const baseline = directRender(
        release,
        release.valuesPaths,
        release.helmValueArgs,
        bundle.profile.namespaces.observability,
      );
      const actual = bundle.documents.filter((d) =>
        release.documents.includes(d),
      );
      assert.deepEqual(actual, baseline, `${artifactId}/${release.name}`);
      // Historical bundles never carry E2 argv or E2 values overlays.
      assert.ok(
        !release.helmValueArgs.some((a) =>
          /offscreenKubeletTrust|extraObjects|offscreenDashboardFiles|dashboardsConfigMaps/.test(
            a,
          ),
        ),
      );
      assert.ok(
        !release.valuesPaths.some(
          (p) =>
            p.includes('profiles/dev/prometheus') ||
            p.includes('profiles/dev/grafana'),
        ),
      );
    }
  }
});

test('actual Helm render of dev-e2 yields the exact selected bundle', () => {
  assert.equal(E2.artifactId, 'dev-e2');
  assert.equal(E2.kubeletTrustBindingSha256, BINDING.bindingSha256);
  assert.deepEqual(E2.kubeletTrust, BINDING);
  assert.ok(Object.isFrozen(E2.kubeletTrust));
  assert.deepEqual(
    E2.releases.map((r) => r.name),
    ['obs-prometheus', 'obs-loki', 'obs-tempo', 'obs-collector', 'obs-grafana'],
  );
  // Ordered base + dev overlay for P and G, collector overlay unchanged, others base only.
  const rel = (name) =>
    E2_RELEASE(name).valuesPaths.map((p) =>
      p.slice(join(root, 'values').length + 1),
    );
  assert.deepEqual(rel('obs-prometheus'), [
    'prometheus.yaml',
    'profiles/dev/prometheus.yaml',
  ]);
  assert.deepEqual(rel('obs-grafana'), [
    'grafana.yaml',
    'profiles/dev/grafana.yaml',
  ]);
  assert.deepEqual(rel('obs-collector'), [
    'collector.yaml',
    'profiles/dev/collector.yaml',
  ]);
  assert.deepEqual(rel('obs-loki'), ['loki.yaml']);
  assert.deepEqual(rel('obs-tempo'), ['tempo.yaml']);
});

test('E2 allowed delta against dev-e1-developer is exactly the selected objects', () => {
  const developer = loadObservabilityVariants('dev').desired;
  const ident = (d) =>
    `${d.apiVersion}|${d.kind}|${d.metadata.namespace ?? ''}|${d.metadata.name}`;
  for (const name of ['obs-loki', 'obs-tempo', 'obs-collector']) {
    assert.deepEqual(
      E2_RELEASE(name).documents,
      developer.releases.find((r) => r.name === name).documents,
      `${name} unchanged`,
    );
  }
  const added = (name) => {
    const before = new Set(
      developer.releases.find((r) => r.name === name).documents.map(ident),
    );
    return E2_RELEASE(name)
      .documents.map(ident)
      .filter((i) => !before.has(i))
      .sort();
  };
  assert.deepEqual(
    added('obs-prometheus'),
    [
      `apps/v1|Deployment|${NS}|obs-kube-state-metrics`,
      `apps/v1|Deployment|${NS}|obs-redis-exporter`,
      `rbac.authorization.k8s.io/v1|ClusterRole||obs-kube-state-metrics`,
      `rbac.authorization.k8s.io/v1|ClusterRole||obs-prometheus-kubelet`,
      `rbac.authorization.k8s.io/v1|ClusterRoleBinding||obs-kube-state-metrics`,
      `rbac.authorization.k8s.io/v1|ClusterRoleBinding||obs-prometheus-kubelet`,
      `v1|ConfigMap|${NS}|obs-kubelet-trust`,
      `v1|Service|${NS}|obs-kube-state-metrics`,
      `v1|Service|${NS}|obs-redis-exporter`,
      `v1|ServiceAccount|${NS}|obs-kube-state-metrics`,
    ].sort(),
  );
  assert.deepEqual(added('obs-grafana'), [
    `v1|ConfigMap|${NS}|obs-grafana-dashboards-offscreen`,
  ]);

  // Preserved base chart/archive pins and persistence.
  for (const r of E2.releases) {
    const dev = developer.releases.find((x) => x.name === r.name);
    assert.deepEqual(
      [r.chartPath, r.chartName, r.chartVersion, r.appVersion, r.sha256],
      [
        dev.chartPath,
        dev.chartName,
        dev.chartVersion,
        dev.appVersion,
        dev.sha256,
      ],
    );
  }
  const pvc = (b) =>
    find(
      b.releases.find((r) => r.name === 'obs-prometheus').documents,
      'PersistentVolumeClaim',
      'obs-prometheus',
    );
  assert.deepEqual(pvc(E2), pvc(developer));
  for (const name of ['obs-loki', 'obs-tempo']) {
    assert.deepEqual(
      E2_RELEASE(name).documents.filter((d) => d.kind === 'StatefulSet'),
      developer.releases
        .find((r) => r.name === name)
        .documents.filter((d) => d.kind === 'StatefulSet'),
    );
  }
  // Stable Grafana datasource/credential configuration.
  const g = (b) => b.releases.find((r) => r.name === 'obs-grafana').documents;
  assert.equal(
    find(g(E2), 'ConfigMap', 'obs-grafana').data['datasources.yaml'],
    find(g(developer), 'ConfigMap', 'obs-grafana').data['datasources.yaml'],
  );
  const adminRef = (docs) =>
    JSON.stringify(
      find(
        docs,
        'Deployment',
        'obs-grafana',
      ).spec.template.spec.containers[0].env.filter((e) =>
        /ADMIN/.test(e.name),
      ),
    );
  assert.equal(adminRef(g(E2)), adminRef(g(developer)));
});

test('E2 inventory, helper workloads, locks and owned RBAC are exact', () => {
  const ksm = find(E2.documents, 'Deployment', 'obs-kube-state-metrics');
  const redis = find(E2.documents, 'Deployment', 'obs-redis-exporter');
  const ksmRef = LOCKS['kube-state-metrics'];
  const redisRef = LOCKS['redis-exporter'];
  assert.match(
    ksmRef,
    /^registry\.k8s\.io\/kube-state-metrics\/kube-state-metrics@sha256:01171220c7c0/,
  );
  assert.match(
    redisRef,
    /^docker\.io\/oliver006\/redis_exporter@sha256:d16780dcfefc/,
  );
  assert.deepEqual(
    ksm.spec.template.spec.containers.map((c) => [c.name, c.image]),
    [
      [
        'kube-state-metrics',
        `${ksmRef.split('@')[0]}:v2.20.0@${ksmRef.split('@')[1]}`,
      ],
    ],
  );
  assert.deepEqual(
    redis.spec.template.spec.containers.map((c) => [c.name, c.image]),
    [['redis-exporter', redisRef]],
  );
  const wl = E2_RELEASE('obs-prometheus').expectedWorkloads;
  assert.deepEqual(Object.keys(wl).sort(), [
    `namespaced/${NS}/Deployment/obs-kube-state-metrics`,
    `namespaced/${NS}/Deployment/obs-prometheus`,
    `namespaced/${NS}/Deployment/obs-redis-exporter`,
  ]);
  assert.equal(
    wl[`namespaced/${NS}/Deployment/obs-redis-exporter`][0].canonicalReference,
    redisRef,
  );
  assert.equal(
    wl[`namespaced/${NS}/Deployment/obs-kube-state-metrics`][0]
      .canonicalReference,
    ksmRef,
  );
  for (const r of E2.releases) {
    const keys = Object.keys(r.expectedWorkloads);
    assert.ok(keys.length >= 1);
    for (const c of Object.values(r.expectedWorkloads).flat()) {
      assert.deepEqual(Object.keys(c).sort(), [
        'canonicalReference',
        'name',
        'renderedReference',
      ]);
    }
  }
  for (const r of E2.releases) {
    assert.equal(
      r.expectedImage.containerName,
      Object.values(r.expectedWorkloads)[0][0].name,
    );
  }

  const rules = (name) =>
    find(E2.documents, 'ClusterRole', name)
      .rules.map((x) => `${x.apiGroups}|${x.resources}|${x.verbs}`)
      .sort();
  assert.deepEqual(
    rules('obs-prometheus-kubelet'),
    [
      '|nodes,get,list,watch'.replace('|nodes,', '|nodes|'),
      '|nodes/metrics|get',
      '|pods|get,list,watch',
    ].sort(),
  );
  assert.deepEqual(
    rules('obs-kube-state-metrics'),
    [
      'apps|daemonsets|list,watch',
      'apps|deployments|list,watch',
      'apps|replicasets|list,watch',
      'apps|statefulsets|list,watch',
      'batch|jobs|list,watch',
      '|namespaces|list,watch',
      '|nodes|list,watch',
      '|persistentvolumeclaims|list,watch',
      '|persistentvolumes|list,watch',
      '|pods|list,watch',
    ].sort(),
  );
  assert.equal(E2.documents.filter((d) => d.kind === 'ClusterRole').length, 2);
  assert.equal(
    E2.documents.filter((d) => /Role$/.test(d.kind) && d.metadata.namespace)
      .length,
    0,
  );
  // no public exposure / host access
  for (const d of E2.documents) {
    assert.ok(
      !['Ingress', 'HTTPRoute', 'Gateway', 'Route', 'NetworkPolicy'].includes(
        d.kind,
      ),
    );
    if (d.kind === 'Service')
      assert.ok(!d.spec.type || d.spec.type === 'ClusterIP', d.metadata.name);
  }
  // static E2 identities frozen separately from the render
  const inv = JSON.parse(
    readFileSync(join(root, 'expected-inventory.json'), 'utf8'),
  );
  assert.deepEqual(E2.expectedInventory, inv['dev-e2']);
  const dev = inv.dev;
  assert.deepEqual(inv['dev-e2'].generatedClaims, dev.generatedClaims);
  assert.equal(inv['dev-e2'].direct.length, dev.direct.length + 11);
  assert.ok(
    inv['dev-e2'].direct
      .filter((r) => r[2] === '')
      .every((r) => /^ClusterRole(Binding)?$/.test(r[1])),
  );
});

test('trust ConfigMap, Prometheus mount and G2 argv are exact', () => {
  const cm = find(E2.documents, 'ConfigMap', 'obs-kubelet-trust');
  assert.equal(cm.immutable, true);
  assert.equal(cm.data['ca.pem'], CA_BUNDLE);
  assert.deepEqual(Object.keys(cm.data), ['ca.pem']);
  assert.equal(
    cm.metadata.annotations['offscreen.dev/kubelet-trust-binding-sha256'],
    BINDING.bindingSha256,
  );
  const p = E2_RELEASE('obs-prometheus');
  const trustArgs = p.helmValueArgs.filter(
    (a, i) => p.helmValueArgs[i - 1] === '--set-json',
  );
  assert.deepEqual(trustArgs, [
    `offscreenKubeletTrust=${JSON.stringify({ bindingSha256: BINDING.bindingSha256, caPem: CA_BUNDLE })}`,
  ]);
  // Exactly one --set-json on P, none on other roles except Grafana's fixed template.
  assert.equal(p.helmValueArgs.filter((a) => a === '--set-json').length, 1);
  for (const name of ['obs-loki', 'obs-tempo', 'obs-collector']) {
    assert.ok(!E2_RELEASE(name).helmValueArgs.includes('--set-json'));
  }
  const dep = find(p.documents, 'Deployment', 'obs-prometheus').spec.template
    .spec;
  const vol = dep.volumes.find(
    (v) => v.configMap?.name === 'obs-kubelet-trust',
  );
  const trustMounts = dep.containers[0].volumeMounts.filter(
    (m) => m.name === vol.name,
  );
  assert.equal(trustMounts.length, 1);
  assert.equal(trustMounts[0].mountPath, '/etc/offscreen/kubelet-trust');
  assert.equal(trustMounts[0].readOnly, true);
  assert.ok(!trustMounts[0].subPath);
  const config = parseYaml(
    find(p.documents, 'ConfigMap', 'obs-prometheus').data['prometheus.yml'],
  );
  for (const job of config.scrape_configs.filter((j) =>
    /^kubelet-/.test(j.job_name),
  )) {
    assert.equal(job.tls_config.ca_file, '/etc/offscreen/kubelet-trust/ca.pem');
    assert.equal(job.tls_config.insecure_skip_verify, false);
  }
});

// ------------------------------------------------------------ dashboards (M07)
const ASSET_DIR = join(root, 'dashboards');
const ASSET_FILES = readdirSync(ASSET_DIR).sort();
const independentDigest = (pairs) =>
  createHash('sha256').update(JSON.stringify(pairs), 'utf8').digest('hex');
const assetPairs = () =>
  ASSET_FILES.map((f) => [f, readFileSync(join(ASSET_DIR, f), 'utf8')]);

test('Grafana local-file descriptor argv and rendered dashboard files are exact', () => {
  assert.deepEqual(ASSET_FILES, [
    'kubernetes.json',
    'messaging-cache.json',
    'nodes.json',
    'observability.json',
    'overview.json',
    'postgres.json',
    'storage.json',
    'temporal.json',
  ]);
  const g = E2_RELEASE('obs-grafana');
  const tail = g.helmValueArgs.slice(
    g.helmValueArgs.indexOf(
      'dashboardsConfigMaps.offscreen=obs-grafana-dashboards-offscreen',
    ) - 1,
  );
  assert.equal(tail[0], '--set-string');
  assert.equal(tail[2], '--set-json');
  assert.match(
    tail[3],
    /^extraObjects=\["apiVersion: v1\\nkind: ConfigMap\\nmetadata:\\n/,
  );
  const extra = JSON.parse(tail[3].slice('extraObjects='.length));
  assert.equal(extra.length, 1);
  assert.ok(
    extra[0].includes(
      '{{ toYaml .Values.offscreenDashboardFiles | nindent 2 }}',
    ),
  );
  assert.ok(
    !extra[0].includes('"dashboard'),
    'no dashboard JSON inside the template',
  );
  const setFiles = tail.slice(4, 4 + 16);
  assert.deepEqual(
    setFiles,
    ASSET_FILES.flatMap((f) => [
      '--set-file',
      `offscreenDashboardFiles.${f.replace('.json', '')}\\.json=${join(ASSET_DIR, f)}`,
    ]),
  );
  assert.deepEqual(tail.slice(20), [
    '--set-string',
    `podAnnotations.checksum/offscreen-dashboard-files=${independentDigest(assetPairs())}`,
  ]);
  assert.ok(
    !g.helmValueArgs.some((a) => a.startsWith('dashboards.')),
    'never populate .Values.dashboards',
  );
  // render/install/upgrade consume the one argv authority
  const argv = helmValuesArgv(g);
  assert.deepEqual(argv.slice(-tail.length), tail);

  const cm = find(g.documents, 'ConfigMap', 'obs-grafana-dashboards-offscreen');
  assert.deepEqual(Object.keys(cm.data).sort(), ASSET_FILES);
  for (const f of ASSET_FILES) {
    assert.equal(
      cm.data[f],
      readFileSync(join(ASSET_DIR, f), 'utf8'),
      `${f} byte-for-byte`,
    );
  }
  assert.equal(cm.metadata.namespace, NS);
  assert.equal(cm.metadata.labels['dashboard-provider'], 'offscreen');
  assert.equal(cm.metadata.labels['app.kubernetes.io/instance'], 'obs-grafana');

  const pod = find(g.documents, 'Deployment', 'obs-grafana').spec.template;
  assert.equal(pod.spec.initContainers, undefined);
  assert.equal(pod.spec.ephemeralContainers, undefined);
  assert.equal(pod.spec.containers.length, 1);
  const vol = pod.spec.volumes.filter(
    (v) => v.configMap?.name === 'obs-grafana-dashboards-offscreen',
  );
  assert.deepEqual(vol, [
    {
      name: 'dashboards-offscreen',
      configMap: { name: 'obs-grafana-dashboards-offscreen' },
    },
  ]);
  assert.deepEqual(
    pod.spec.containers[0].volumeMounts.filter(
      (m) => m.name === 'dashboards-offscreen',
    ),
    [
      {
        name: 'dashboards-offscreen',
        mountPath: '/var/lib/grafana/dashboards/offscreen',
      },
    ],
  );
  assert.equal(
    pod.metadata.annotations['checksum/offscreen-dashboard-files'],
    independentDigest(assetPairs()),
  );
  assert.ok(
    pod.metadata.annotations['checksum/config'],
    'existing chart checksum retained',
  );
  assert.ok(
    !Object.keys(find(g.documents, 'ConfigMap', 'obs-grafana').data).some((k) =>
      /download/.test(k),
    ),
  );
  // provider, home path and datasource config unchanged from the 07 overlay
  const gc = find(g.documents, 'ConfigMap', 'obs-grafana').data;
  const providers = parseYaml(gc['dashboardproviders.yaml']);
  assert.equal(
    providers.providers[0].options.path,
    '/var/lib/grafana/dashboards/offscreen',
  );
  assert.equal(providers.providers[0].allowUiUpdates, false);
  assert.match(
    gc['grafana.ini'],
    /default_home_dashboard_path = \/var\/lib\/grafana\/dashboards\/offscreen\/overview\.json/,
  );
  assert.equal(E2.dashboardFilesSha256, independentDigest(assetPairs()));
});

// A literal Grafana-style placeholder must never be interpreted by the chart's single tpl call.
const PLACEHOLDER = ' {{ .Release.Name }} {{- include "x" . }}';
test('rollout digest changes for a changed input byte and placeholders stay literal (isolated fixture)', () => {
  const g = E2_RELEASE('obs-grafana');
  const dir = mkdtempSync(join(work, 'dash-'));
  const argsFor = (digest, tamper) => {
    const args = [];
    for (const f of ASSET_FILES) {
      const dest = join(dir, f);
      copyFileSync(join(ASSET_DIR, f), dest);
      if (tamper && f === 'nodes.json')
        writeFileSync(dest, `${readFileSync(dest, 'utf8')}${PLACEHOLDER}`);
    }
    const mapped = g.helmValueArgs.map((a) => {
      if (a.startsWith('offscreenDashboardFiles.')) {
        const [key] = a.split('=');
        return `${key}=${join(dir, key.split('.')[1].replace('\\', '') + '.json')}`;
      }
      if (a.startsWith('podAnnotations.checksum/offscreen-dashboard-files='))
        return `podAnnotations.checksum/offscreen-dashboard-files=${digest}`;
      return a;
    });
    return args.concat(mapped);
  };
  const render = (digest, tamper) => {
    const out = spawnSync(
      'helm',
      [
        'template',
        'obs-grafana',
        g.chartPath,
        '--namespace',
        NS,
        ...g.valuesPaths.flatMap((p) => ['-f', p]),
        ...argsFor(digest, tamper),
      ],
      { encoding: 'utf8', maxBuffer: 1 << 28 },
    );
    assert.equal(out.status, 0, out.stderr);
    return parseAllDocuments(out.stdout)
      .map((d) => d.toJS())
      .filter(Boolean);
  };
  const same = render(independentDigest(assetPairs()), false);
  assert.deepEqual(same, g.documents, 'same input gives the same render');
  const pairs = assetPairs();
  pairs[2][1] += PLACEHOLDER;
  const changed = render(independentDigest(pairs), true);
  const ann = (docs) =>
    find(docs, 'Deployment', 'obs-grafana').spec.template.metadata.annotations[
      'checksum/offscreen-dashboard-files'
    ];
  assert.notEqual(ann(changed), ann(g.documents));
  assert.equal(
    find(changed, 'ConfigMap', 'obs-grafana-dashboards-offscreen').data[
      'nodes.json'
    ],
    pairs[2][1],
  );
});

function measure(release) {
  const dry = spawnSync(
    'helm',
    [
      'install',
      release.name,
      release.chartPath,
      '--namespace',
      NS,
      '--dry-run=client',
      '-o',
      'json',
      ...helmValuesArgv(release),
    ],
    { encoding: 'utf8', maxBuffer: 1 << 28 },
  );
  assert.equal(dry.status, 0, dry.stderr);
  // Helm stores base64(gzip(json(release))) in the release Secret, which the
  // API then base64-encodes again on the wire.
  const encoded = Buffer.from(
    gzipSync(Buffer.from(dry.stdout, 'utf8')),
  ).toString('base64');
  return {
    releaseJsonBytes: Buffer.byteLength(dry.stdout),
    helmEncodedBytes: encoded.length,
    secretDataBytes: Buffer.from(encoded).toString('base64').length,
  };
}

test('rendered dashboard ConfigMap and encoded Helm release storage fit Kubernetes limits (M07)', (t) => {
  const MIB = 1024 * 1024;
  const cm = find(
    E2_RELEASE('obs-grafana').documents,
    'ConfigMap',
    'obs-grafana-dashboards-offscreen',
  );
  const dataBytes = Object.values(cm.data).reduce(
    (n, v) => n + Buffer.byteLength(v),
    0,
  );
  const objectBytes = Buffer.byteLength(JSON.stringify(cm));
  assert.ok(dataBytes < MIB && objectBytes < MIB);
  const storage = Object.fromEntries(
    E2.releases.map((r) => [r.name, measure(r)]),
  );
  for (const [name, m] of Object.entries(storage)) {
    assert.ok(
      m.secretDataBytes < MIB,
      `${name} release storage Secret ${m.secretDataBytes}`,
    );
  }
  const report = {
    configMapDataBytes: dataBytes,
    configMapObjectBytes: objectBytes,
    limitBytes: MIB,
    releaseStorage: storage,
  };
  t.diagnostic(`E2-08 capacity ${JSON.stringify(report)}`);
});

// ---------------------------------------------------- operational selection
test('loadOperationalArtifactSet selects exact desired and admissible bundles', () => {
  const set = loadOperationalArtifactSet('dev', { kubeletTrust: BINDING });
  assert.equal(set.desired.artifactId, 'dev-e2');
  assert.equal(set.desiredArtifactId, 'dev-e2');
  assert.equal(set.desiredUnavailableReason, null);
  assert.deepEqual(
    set.admissible.map((a) => a.artifactId),
    ['dev-e1-base', 'dev-e1-developer', 'dev-e2'],
  );

  let reads = 0;
  const viaReader = loadOperationalArtifactSet('dev', {
    readKubeletTrust: () => {
      reads += 1;
      return BINDING;
    },
  });
  assert.equal(reads, 1);
  assert.equal(
    viaReader.desired.kubeletTrustBindingSha256,
    BINDING.bindingSha256,
  );

  for (const deps of [
    {},
    {
      readKubeletTrust: () => {
        throw Object.assign(new Error('kubelet-trust-unavailable'), {
          code: 'kubelet-trust-unavailable',
        });
      },
    },
  ]) {
    const none = loadOperationalArtifactSet('dev', deps);
    assert.equal(none.desired, null);
    assert.equal(none.desiredArtifactId, 'dev-e2');
    assert.equal(none.desiredUnavailableReason, 'kubelet-trust-unavailable');
    assert.deepEqual(
      none.admissible.map((a) => a.artifactId),
      ['dev-e1-base', 'dev-e1-developer'],
    );
    assert.equal(
      none.staticInventory.direct.filter((r) => r[3] === 'obs-kubelet-trust')
        .length,
      1,
    );
    assert.ok(
      none.admissible.every((a) => a.artifactId !== 'dev-e2'),
      'no E2 or E1 fallback as desired',
    );
  }
  assert.throws(
    () =>
      loadOperationalArtifactSet('dev', {
        readKubeletTrust: () => {
          throw new Error('boom');
        },
      }),
    /boom/,
  );
  const rel = loadOperationalArtifactSet('release');
  assert.deepEqual(
    rel.admissible.map((a) => a.artifactId),
    ['release-e1'],
  );
  assert.equal(rel.desired.artifactId, 'release-e1');
  assert.equal(rel.desiredUnavailableReason, null);
  assert.throws(
    () => loadOperationalArtifactSet('release', { kubeletTrust: BINDING }),
    /artifact-invalid/,
  );
  assert.throws(
    () => loadOperationalArtifactSet('lab'),
    /unsupported platform profile/,
  );
});

test('negative: E2 selection, trust and historical-input misuse refuse before any template', () => {
  let calls = 0;
  const counting = (...a) => {
    calls += 1;
    return helmRun(...a);
  };
  assert.throws(
    () =>
      loadArtifacts('release', {
        run: counting,
        variant: 'dev-e2',
        kubeletTrust: BINDING,
      }),
    /artifact-invalid/,
  );
  assert.throws(
    () => loadArtifacts('dev', { run: counting, variant: 'dev-e2' }),
    /kubelet-trust-unavailable/,
  );
  assert.throws(
    () =>
      loadArtifacts('dev', {
        run: counting,
        variant: 'dev-e2',
        kubeletTrust: null,
      }),
    /kubelet-trust-unavailable/,
  );
  for (const variant of [
    'dev-e1-base',
    'dev-e1-developer',
    'desired',
    'predecessor',
  ]) {
    assert.throws(
      () =>
        loadArtifacts('dev', { run: counting, variant, kubeletTrust: BINDING }),
      /e2 inputs supplied/,
    );
  }
  assert.throws(
    () => loadArtifacts('release', { run: counting, kubeletTrust: BINDING }),
    /e2 inputs supplied/,
  );
  assert.equal(calls, 0);
});

test('negative: malformed, drifted or non-canonical trust bindings refuse before any template', () => {
  let calls = 0;
  const counting = (...a) => {
    calls += 1;
    return helmRun(...a);
  };
  const clone = () => JSON.parse(JSON.stringify(BODY));
  const rebind = (mutate) => {
    const b = clone();
    mutate(b);
    return bindingFrom(b);
  };
  const cases = {
    'wrong digest': { ...BINDING, bindingSha256: 'f'.repeat(64) },
    'extra key': { ...BINDING, extra: 1 },
    'schema 2': rebind((b) => {
      b.schema = 2;
    }),
    'one node': rebind((b) => {
      b.nodes.pop();
    }),
    'node order': rebind((b) => {
      b.nodes.reverse();
    }),
    'duplicate dockerId': rebind((b) => {
      b.nodes[1].dockerId = b.nodes[0].dockerId;
    }),
    'duplicate nodeUid': rebind((b) => {
      b.nodes[1].nodeUid = b.nodes[0].nodeUid;
    }),
    'root digest mismatch': rebind((b) => {
      b.nodes[0].caSha256 = '0'.repeat(64);
    }),
    'non-canonical pem': rebind((b) => {
      b.nodes[0].caPem = b.nodes[0].caPem.replace(/\n$/, '');
    }),
    'crlf pem': rebind((b) => {
      b.nodes[0].caPem = b.nodes[0].caPem.replace(/\n/g, '\r\n');
    }),
    'not a certificate': rebind((b) => {
      b.nodes[0].caPem =
        '-----BEGIN CERTIFICATE-----\nAAAA\n-----END CERTIFICATE-----\n';
    }),
    'two certificates in one pem': rebind((b) => {
      b.nodes[0].caPem += b.nodes[0].caPem;
    }),
    'empty identity': rebind((b) => {
      b.kubeSystemUid = '';
    }),
    array: [],
    string: 'ca',
  };
  for (const [label, kubeletTrust] of Object.entries(cases)) {
    assert.throws(
      () =>
        loadArtifacts('dev', {
          run: counting,
          variant: 'dev-e2',
          kubeletTrust,
        }),
      /artifact-invalid/,
      label,
    );
  }
  assert.equal(calls, 0);
});

test('negative: helper lock must hold exactly one frozen row per selected helper', () => {
  const [ksm, redis] = readFileSync(join(root, 'locks/e2-images.tsv'), 'utf8')
    .trim()
    .split('\n')
    .slice(1);
  const H = 'role\timmutable-reference';
  assert.throws(
    () => parseHelperImageLock(`${H}\n${ksm}\n`),
    /missing helper lock role|row count/,
  );
  assert.throws(
    () => parseHelperImageLock(`${H}\n${ksm}\n${ksm}\n${redis}\n`),
    /duplicate helper lock role/,
  );
  assert.throws(
    () =>
      parseHelperImageLock(
        `${H}\n${ksm}\n${redis}\nloki\tdocker.io/grafana/loki@sha256:${'a'.repeat(64)}\n`,
      ),
    /unknown helper lock role/,
  );
  assert.throws(
    () =>
      parseHelperImageLock(
        `${H}\n${ksm}\nredis-exporter\tdocker.io/other/redis_exporter@sha256:${'a'.repeat(64)}\n`,
      ),
    /repository mismatch/,
  );
  assert.throws(
    () =>
      parseHelperImageLock(
        `${H}\n${ksm}\nredis-exporter\tdocker.io/oliver006/redis_exporter:latest\n`,
      ),
    /digest/,
  );
  assert.throws(
    () => parseHelperImageLock(`bad\n${ksm}\n${redis}\n`),
    /header/,
  );
  assert.deepEqual(
    Object.keys(parseHelperImageLock(`${H}\n${ksm}\n${redis}\n`)),
    ['kube-state-metrics', 'redis-exporter'],
  );
  for (const helperImageLocks of [
    { 'kube-state-metrics': LOCKS['kube-state-metrics'] },
    { ...LOCKS, extra: LOCKS['redis-exporter'] },
    {
      ...LOCKS,
      'redis-exporter': `docker.io/other/redis_exporter@sha256:${'a'.repeat(64)}`,
    },
  ]) {
    expectInvalid(cacheRun, /helper lock/, { helperImageLocks });
  }
  // a different digest than the rendered overlay is a workload mismatch
  expectInvalid(cacheRun, /workload image reference mismatch/, {
    helperImageLocks: {
      ...LOCKS,
      'redis-exporter': `docker.io/oliver006/redis_exporter@sha256:${'b'.repeat(64)}`,
    },
  });
});

// ---------------------------------------------------------- render negatives
const mainContainer = (docs, name) =>
  find(docs, 'Deployment', name).spec.template.spec;

test('negative: workload membership, containers and digests', () => {
  const cases = [
    [
      'obs-prometheus',
      /unexpected regular container count/,
      (d) => {
        mainContainer(d, 'obs-redis-exporter').containers.push({
          name: 'x',
          image: 'x',
        });
      },
    ],
    [
      'obs-prometheus',
      /unexpected init container/,
      (d) => {
        mainContainer(d, 'obs-kube-state-metrics').initContainers = [
          { name: 'i', image: 'i' },
        ];
      },
    ],
    [
      'obs-prometheus',
      /unexpected ephemeral container/,
      (d) => {
        mainContainer(d, 'obs-redis-exporter').ephemeralContainers = [
          { name: 'e', image: 'e' },
        ];
      },
    ],
    [
      'obs-prometheus',
      /workload image reference mismatch/,
      (d) => {
        mainContainer(d, 'obs-redis-exporter').containers[0].image =
          `docker.io/oliver006/redis_exporter@sha256:${'c'.repeat(64)}`;
      },
    ],
    [
      'obs-prometheus',
      /workload image reference mismatch/,
      (d) => {
        mainContainer(d, 'obs-kube-state-metrics').containers[0].image =
          LOCKS['kube-state-metrics'];
      },
    ],
    [
      'obs-prometheus',
      /workload container name mismatch/,
      (d) => {
        mainContainer(d, 'obs-redis-exporter').containers[0].name = 'other';
      },
    ],
    [
      'obs-prometheus',
      /unexpected workload/,
      (d) => {
        d.push({
          apiVersion: 'apps/v1',
          kind: 'DaemonSet',
          metadata: { name: 'x', namespace: NS },
          spec: { template: { spec: { containers: [] } } },
        });
      },
    ],
    [
      'obs-prometheus',
      /missing declared workload/,
      (d) =>
        d.filter(
          (x) =>
            !(
              x.kind === 'Deployment' &&
              x.metadata.name === 'obs-redis-exporter'
            ),
        ),
    ],
    [
      'obs-prometheus',
      /unexpected host namespace access/,
      (d) => {
        mainContainer(d, 'obs-kube-state-metrics').hostNetwork = true;
      },
    ],
    [
      'obs-prometheus',
      /unexpected host path volume/,
      (d) => {
        (mainContainer(d, 'obs-prometheus').volumes ??= []).push({
          name: 'h',
          hostPath: { path: '/' },
        });
      },
    ],
    [
      'obs-loki',
      /unexpected workload/,
      (d) => {
        d.push({
          apiVersion: 'batch/v1',
          kind: 'Job',
          metadata: { name: 'j', namespace: NS },
          spec: {
            template: { spec: { containers: [{ name: 'j', image: 'j' }] } },
          },
        });
      },
    ],
    [
      'obs-grafana',
      /unexpected init container/,
      (d) => {
        mainContainer(d, 'obs-grafana').initContainers = [
          {
            name: 'download-dashboards',
            image: 'docker.io/curlimages/curl:8.23.0',
          },
        ];
      },
    ],
    [
      'obs-grafana',
      /unexpected dashboard download script/,
      (d) => {
        find(d, 'ConfigMap', 'obs-grafana').data['download_dashboards.sh'] =
          '#!/bin/sh';
      },
    ],
  ];
  for (const [release, pattern, mutate] of cases) {
    expectInvalid(mutatedRun(release, mutate), pattern);
  }
});

test('negative: owned RBAC, trust ConfigMap and inventory identities', () => {
  const role = (d, n) => find(d, 'ClusterRole', n);
  const binding = (d, n) => find(d, 'ClusterRoleBinding', n);
  const cases = [
    [
      /unexpected cluster role rules for obs-prometheus-kubelet/,
      (d) => {
        role(d, 'obs-prometheus-kubelet').rules.push({
          apiGroups: [''],
          resources: ['secrets'],
          verbs: ['get'],
        });
      },
    ],
    [
      /unexpected cluster role rules for obs-prometheus-kubelet/,
      (d) => {
        role(d, 'obs-prometheus-kubelet').rules[0].verbs.push('delete');
      },
    ],
    [
      /unexpected cluster role rules for obs-prometheus-kubelet/,
      (d) => {
        role(d, 'obs-prometheus-kubelet').rules[1].resources = ['nodes/proxy'];
      },
    ],
    [
      /unexpected cluster role rules for obs-kube-state-metrics/,
      (d) => {
        role(d, 'obs-kube-state-metrics').rules[0].verbs = ['*'];
      },
    ],
    [
      /unexpected cluster role rule shape/,
      (d) => {
        role(d, 'obs-kube-state-metrics').rules[0].resourceNames = ['x'];
      },
    ],
    [
      /unexpected cluster rbac set/,
      (d) => {
        d.push({
          apiVersion: 'rbac.authorization.k8s.io/v1',
          kind: 'ClusterRole',
          metadata: { name: 'extra' },
          rules: [],
        });
      },
    ],
    [
      /unexpected cluster rbac set/,
      (d) =>
        d.filter(
          (x) =>
            !(
              x.kind === 'ClusterRoleBinding' &&
              x.metadata.name === 'obs-kube-state-metrics'
            ),
        ),
    ],
    [
      /unexpected cluster role binding subjects for obs-prometheus-kubelet/,
      (d) => {
        binding(d, 'obs-prometheus-kubelet').subjects.push({
          kind: 'ServiceAccount',
          name: 'default',
          namespace: NS,
        });
      },
    ],
    [
      /unexpected cluster role binding subjects for obs-prometheus-kubelet/,
      (d) => {
        binding(d, 'obs-prometheus-kubelet').subjects[0].namespace =
          'kube-system';
      },
    ],
    [
      /unexpected cluster role binding subjects for obs-kube-state-metrics/,
      (d) => {
        binding(d, 'obs-kube-state-metrics').subjects[0].name =
          'obs-prometheus';
      },
    ],
    [
      /unexpected cluster role binding roleRef/,
      (d) => {
        binding(d, 'obs-prometheus-kubelet').roleRef.name = 'cluster-admin';
      },
    ],
    [
      /cluster-scoped manifest carries a namespace/,
      (d) => {
        role(d, 'obs-prometheus-kubelet').metadata.namespace = NS;
      },
    ],
    [
      /trust configmap content mismatch/,
      (d) => {
        find(d, 'ConfigMap', 'obs-kubelet-trust').data['ca.pem'] += 'x';
      },
    ],
    [
      /trust configmap content mismatch/,
      (d) => {
        find(d, 'ConfigMap', 'obs-kubelet-trust').data.extra = 'x';
      },
    ],
    [
      /trust configmap content mismatch/,
      (d) => {
        delete find(d, 'ConfigMap', 'obs-kubelet-trust').immutable;
      },
    ],
    [
      /trust configmap content mismatch/,
      (d) => {
        find(d, 'ConfigMap', 'obs-kubelet-trust').metadata.annotations[
          'offscreen.dev/kubelet-trust-binding-sha256'
        ] = 'e'.repeat(64);
      },
    ],
    [
      /trust configmap content mismatch/,
      (d) => {
        find(d, 'ConfigMap', 'obs-kubelet-trust').metadata.labels[
          'offscreen.dev/owner'
        ] = 'someone';
      },
    ],
    [
      /trust mount mismatch/,
      (d) => {
        mainContainer(d, 'obs-prometheus').containers[0].volumeMounts.find(
          (m) => m.mountPath === '/etc/offscreen/kubelet-trust',
        ).readOnly = false;
      },
    ],
    [
      /trust mount mismatch/,
      (d) => {
        mainContainer(d, 'obs-prometheus').containers[0].volumeMounts =
          mainContainer(d, 'obs-prometheus').containers[0].volumeMounts.filter(
            (m) => m.mountPath !== '/etc/offscreen/kubelet-trust',
          );
      },
    ],
    [
      /unexpected manifest namespace/,
      (d) => {
        find(d, 'Service', 'obs-redis-exporter').metadata.namespace = 'other';
      },
    ],
    [
      /duplicate manifest identity/,
      (d) => {
        d.push(clone(find(d, 'Service', 'obs-redis-exporter')));
      },
    ],
    [
      /inventory mismatch/,
      (d) => {
        find(d, 'Service', 'obs-redis-exporter').apiVersion = 'v2';
      },
    ],
    [
      /inventory mismatch/,
      (d) => {
        d.push({
          apiVersion: 'v1',
          kind: 'ServiceAccount',
          metadata: { name: 'extra', namespace: NS },
        });
      },
    ],
    [
      /unexpected manifest kind/,
      (d) => {
        d.push({
          apiVersion: 'v1',
          kind: 'Secret',
          metadata: { name: 'extra', namespace: NS },
        });
      },
    ],
  ];
  for (const [pattern, mutate] of cases) {
    expectInvalid(mutatedRun('obs-prometheus', mutate), pattern);
  }
  // cluster-scoped objects are refused on every other release
  expectInvalid(
    mutatedRun('obs-loki', (d) => {
      d.push({
        apiVersion: 'rbac.authorization.k8s.io/v1',
        kind: 'ClusterRole',
        metadata: { name: 'x' },
        rules: [],
      });
    }),
    /unexpected cluster-scoped object/,
  );
});

test('negative: dashboard ConfigMap identity, data, mount and rollout digest', () => {
  const cm = (d) => find(d, 'ConfigMap', 'obs-grafana-dashboards-offscreen');
  const dep = (d) => find(d, 'Deployment', 'obs-grafana');
  const cases = [
    [
      /dashboard content mismatch for overview\.json/,
      (d) => {
        cm(d).data['overview.json'] += '\n';
      },
    ],
    [
      /dashboard content mismatch for nodes\.json/,
      (d) => {
        cm(d).data['nodes.json'] = JSON.stringify(
          JSON.parse(cm(d).data['nodes.json']),
        );
      },
    ],
    [
      /dashboard configmap data keys mismatch/,
      (d) => {
        delete cm(d).data['temporal.json'];
      },
    ],
    [
      /dashboard configmap data keys mismatch/,
      (d) => {
        cm(d).data['extra.json'] = '{}';
      },
    ],
    [
      /dashboard configmap data keys mismatch/,
      (d) => {
        cm(d).data['overview'] = cm(d).data['overview.json'];
        delete cm(d).data['overview.json'];
      },
    ],
    [
      /unexpected manifest namespace/,
      (d) => {
        cm(d).metadata.namespace = 'other';
      },
    ],
    [
      /dashboard configmap labels mismatch/,
      (d) => {
        cm(d).metadata.labels['app.kubernetes.io/instance'] = 'obs-other';
      },
    ],
    [
      /dashboard configmap labels mismatch/,
      (d) => {
        delete cm(d).metadata.labels['dashboard-provider'];
      },
    ],
    [
      /dashboard configmap binary data/,
      (d) => {
        cm(d).binaryData = { 'x.json': 'e30=' };
      },
    ],
    [/dashboard configmap count mismatch/, (d) => d.filter((x) => x !== cm(d))],
    [
      /dashboard configmap count mismatch/,
      (d) => {
        const c = clone(cm(d));
        c.metadata.name = 'obs-grafana-dashboards-offscreen';
        d.push(c);
      },
    ],
    [
      /dashboard mount mismatch/,
      (d) => {
        dep(d).spec.template.spec.containers[0].volumeMounts.find(
          (m) => m.name === 'dashboards-offscreen',
        ).mountPath = '/var/lib/grafana/dashboards/default';
      },
    ],
    [
      /dashboard mount mismatch/,
      (d) => {
        dep(d).spec.template.spec.containers[0].volumeMounts.find(
          (m) => m.name === 'dashboards-offscreen',
        ).subPath = 'overview.json';
      },
    ],
    [
      /dashboard mount mismatch/,
      (d) => {
        dep(d).spec.template.spec.volumes.find(
          (v) => v.name === 'dashboards-offscreen',
        ).configMap.name = 'other';
      },
    ],
    [
      /dashboard rollout digest mismatch/,
      (d) => {
        dep(d).spec.template.metadata.annotations[
          'checksum/offscreen-dashboard-files'
        ] = '0'.repeat(64);
      },
    ],
    [
      /dashboard rollout digest mismatch/,
      (d) => {
        delete dep(d).spec.template.metadata.annotations[
          'checksum/offscreen-dashboard-files'
        ];
      },
    ],
  ];
  for (const [pattern, mutate] of cases) {
    expectInvalid(mutatedRun('obs-grafana', mutate), pattern);
  }
});

test('negative: primary image, digest and container identity still fail artifact validation', () => {
  const lokiSts = (d) => find(d, 'StatefulSet', 'obs-loki').spec.template.spec;
  expectInvalid(
    mutatedRun('obs-loki', (d) => {
      lokiSts(d).containers[0].image =
        `docker.io/grafana/loki@sha256:${'d'.repeat(64)}`;
    }),
    /primary workload image reference mismatch/,
  );
  expectInvalid(
    mutatedRun('obs-loki', (d) => {
      lokiSts(d).containers.push({ name: 'sidecar', image: 'x' });
    }),
    /unexpected regular container count/,
  );
  expectInvalid(
    mutatedRun('obs-prometheus', (d) => {
      mainContainer(d, 'obs-prometheus').containers[0].image =
        LOCKS['redis-exporter'];
    }),
    /primary workload image reference mismatch/,
  );
  expectInvalid(
    mutatedRun('obs-grafana', (d) => {
      mainContainer(d, 'obs-grafana').containers[0].image =
        'docker.io/grafana/grafana:latest';
    }),
    /primary workload image reference mismatch/,
  );
  expectInvalid(
    mutatedRun('obs-grafana', (d) => {
      find(d, 'Secret', 'x');
      d.push({
        apiVersion: 'v1',
        kind: 'Secret',
        metadata: { name: 'obs-grafana-admin', namespace: NS },
      });
    }),
    /grafana admin secret/,
  );
});
