import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import process from 'node:process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { parse as parseYaml } from 'yaml';
import { readPlatformProfile } from '../../common/profile.mjs';
import { runPlatformCommand } from '../../common/commands.mjs';
import {
  helmValuesArgv,
  loadArtifacts,
  loadObservabilityVariants,
  lintObservability,
  OBSERVABILITY_RELEASE_ORDER,
  renderObservabilityDocuments,
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
          if (probe?.code === 'ESRCH') rmSync(dir, { recursive: true, force: true });
        }
      }
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 100);
    }
  }
  process.on('exit', () => rmSync(dir, { recursive: true, force: true }));
}
acquireSourceTreeLock();

const observabilityRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const valuesRoot = join(observabilityRoot, 'values');
const locksRoot = join(observabilityRoot, 'locks');
const vendorRoot = join(observabilityRoot, 'vendor');
const LOCK_PATH = join(locksRoot, 'images.tsv');

const IMAGE_LOCK = readFileSync(LOCK_PATH, 'utf8');

/** @type {Record<string, { canonical: string, hex: string, repository: string }>} */
const LOCK_BY_ROLE = {};
for (const line of IMAGE_LOCK.split('\n').slice(1)) {
  const trimmed = line.trim();
  if (!trimmed) continue;
  const tab = trimmed.indexOf('\t');
  const role = trimmed.slice(0, tab);
  const canonical = trimmed.slice(tab + 1);
  const hex = canonical.split('@sha256:')[1];
  const repository = canonical.slice(0, canonical.indexOf('@sha256:'));
  LOCK_BY_ROLE[role] = { canonical, hex, repository };
}

const B07_RENDERED = Object.freeze({
  collector: `${LOCK_BY_ROLE.collector.repository}@sha256:${LOCK_BY_ROLE.collector.hex}`,
  prometheus: `${LOCK_BY_ROLE.prometheus.repository}@sha256:${LOCK_BY_ROLE.prometheus.hex}`,
  loki: `${LOCK_BY_ROLE.loki.repository}@sha256:${LOCK_BY_ROLE.loki.hex}`,
  tempo: `${LOCK_BY_ROLE.tempo.repository}:3.1.1@sha256:${LOCK_BY_ROLE.tempo.hex}`,
  grafana: `${LOCK_BY_ROLE.grafana.repository}:13.3.2-distroless@sha256:${LOCK_BY_ROLE.grafana.hex}`,
});

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

/**
 * @param {Awaited<ReturnType<typeof loadArtifacts>>['releases'][number]} release
 * @param {string} profileId
 */
function assertReleaseDescriptor(release, profileId) {
  const profile = readPlatformProfile(profileId);
  const digest = `sha256:${LOCK_BY_ROLE[release.role].hex}`;
  /** @type {string[]} */
  const expectedArgs = [];
  if (release.role === 'prometheus') {
    expectedArgs.push(
      '--set-string',
      `server.persistentVolume.storageClass=${profile.storageClass}`,
      '--set-string',
      `server.image.digest=${digest}`,
    );
  } else if (release.role === 'loki') {
    expectedArgs.push(
      '--set-string',
      `singleBinary.persistence.storageClass=${profile.storageClass}`,
      '--set-string',
      `singleBinary.image.digest=${digest}`,
    );
  } else if (release.role === 'tempo') {
    expectedArgs.push(
      '--set-string',
      `persistence.storageClassName=${profile.storageClass}`,
      '--set-string',
      `tempo.tag=3.1.1@${digest}`,
    );
  } else if (release.role === 'collector') {
    expectedArgs.push('--set-string', `image.digest=${digest}`);
  } else if (release.role === 'grafana') {
    expectedArgs.push(
      '--set-string',
      'image.tag=13.3.2-distroless',
      '--set-string',
      `image.sha=${LOCK_BY_ROLE.grafana.hex}`,
    );
  }
  assert.deepEqual(release.helmValueArgs, expectedArgs, `${release.role} argv`);
  if (release.role === 'collector' && profileId === 'dev') {
    assert.equal(release.valuesPaths.length, 2);
    assert.equal(release.valuesPaths[0], join(valuesRoot, 'collector.yaml'));
    assert.equal(
      release.valuesPaths[1],
      join(valuesRoot, 'profiles', 'dev', 'collector.yaml'),
    );
  } else {
    assert.equal(release.valuesPaths.length, 1);
    assert.equal(
      release.valuesPaths[0],
      join(valuesRoot, `${release.role}.yaml`),
    );
  }
  assert.equal(release.valuesPath, undefined);
  const pins = parseYaml(
    readFileSync(join(locksRoot, 'charts.yaml'), 'utf8'),
  ).charts;
  assert.equal(release.chartName, pins[release.role].name);
  assert.equal(release.chartVersion, pins[release.role].version);
  assert.equal(release.appVersion, pins[release.role].appVersion);
  assert.equal(
    release.expectedImage.canonicalReference,
    LOCK_BY_ROLE[release.role].canonical,
  );
  assert.equal(
    release.expectedImage.renderedReference,
    B07_RENDERED[release.role],
    `${release.role} renderedReference`,
  );
  const workloadKind =
    release.role === 'loki' || release.role === 'tempo'
      ? 'StatefulSet'
      : 'Deployment';
  const workload = release.documents.find(
    (doc) =>
      doc.kind === workloadKind && doc.metadata?.name === `obs-${release.role}`,
  );
  assert.ok(workload, `${profileId}/${release.role} workload`);
  const podSpec = workload.spec.template.spec;
  assert.equal(podSpec.containers.length, 1);
  assert.deepEqual(podSpec.initContainers ?? [], []);
  assert.deepEqual(podSpec.ephemeralContainers ?? [], []);
  assert.equal(
    podSpec.containers[0].image,
    release.expectedImage.renderedReference,
  );
}

test('dev profile renders frozen inventory and five digest-pinned images', () => {
  const bundle = loadArtifacts('dev', { run: helmRun });
  assert.equal(
    bundle.profile.namespaces.observability,
    'offscreen-dev-observability',
  );
  assert.equal(bundle.documents.length > 0, true);
  assert.equal(bundle.releases.length, 5);
  for (const release of bundle.releases) {
    assertReleaseDescriptor(release, 'dev');
  }
  assert.equal(bundle.expectedInventory.direct.length, 25);
  assert.equal(bundle.expectedInventory.generatedClaims.length, 2);
});

test('release profile renders frozen inventory and five digest-pinned images', () => {
  const bundle = loadArtifacts('release', { run: helmRun });
  assert.equal(
    bundle.profile.namespaces.observability,
    'offscreen-observability',
  );
  for (const release of bundle.releases) {
    assertReleaseDescriptor(release, 'release');
  }
  assert.equal(bundle.expectedInventory.direct.length, 25);
  assert.equal(bundle.expectedInventory.generatedClaims.length, 2);
});

test('renderObservabilityDocuments and lintObservability succeed for both profiles', () => {
  for (const profileId of /** @type {const} */ (['dev', 'release'])) {
    const docs = renderObservabilityDocuments(profileId, { run: helmRun });
    assert.ok(docs.length > 0);
    lintObservability(profileId, { run: helmRun });
  }
});

test('vendor archives match pins.yaml sha256', () => {
  const pins = parseYaml(
    readFileSync(join(locksRoot, 'charts.yaml'), 'utf8'),
  ).charts;
  for (const release of OBSERVABILITY_RELEASE_ORDER) {
    const pin = pins[release.role];
    const archive = join(vendorRoot, `${pin.name}-${pin.version}.tgz`);
    const actual = createHash('sha256')
      .update(readFileSync(archive))
      .digest('hex');
    assert.equal(actual, pin.sha256);
  }
});

function collectorOnlyManifest(image, namespace) {
  return `apiVersion: apps/v1
kind: Deployment
metadata:
  name: obs-collector
  namespace: ${namespace}
spec:
  replicas: 1
  template:
    spec:
      containers:
        - name: opentelemetry-collector
          image: ${image}
`;
}

test('negative: tampered first archive hash causes zero helm invocations', () => {
  const pins = parseYaml(
    readFileSync(join(locksRoot, 'charts.yaml'), 'utf8'),
  ).charts;
  const corruptPins = structuredClone(pins);
  corruptPins.prometheus = {
    ...corruptPins.prometheus,
    sha256: '0000000000000000000000000000000000000000000000000000000000000000',
  };
  let helmCalls = 0;
  const countingRun = (command, args, options) => {
    if (command === 'helm') helmCalls += 1;
    return helmRun(command, args, options);
  };
  assert.throws(
    () => loadArtifacts('dev', { run: countingRun, pins: corruptPins }),
    /archive sha256 mismatch/,
  );
  assert.equal(helmCalls, 0);
});

test('negative: tampered final archive hash causes zero helm invocations', () => {
  const pins = parseYaml(
    readFileSync(join(locksRoot, 'charts.yaml'), 'utf8'),
  ).charts;
  const corruptPins = structuredClone(pins);
  corruptPins.grafana = {
    ...corruptPins.grafana,
    sha256: '0000000000000000000000000000000000000000000000000000000000000000',
  };
  let helmCalls = 0;
  const countingRun = (command, args, options) => {
    if (command === 'helm') helmCalls += 1;
    return helmRun(command, args, options);
  };
  assert.throws(
    () => loadArtifacts('dev', { run: countingRun, pins: corruptPins }),
    /archive sha256 mismatch/,
  );
  assert.equal(helmCalls, 0);
});

test('negative: wrong repository with same digest is refused', () => {
  const imageLocks = {
    ...Object.fromEntries(
      Object.entries(LOCK_BY_ROLE).map(([role, row]) => [role, row.canonical]),
    ),
    prometheus:
      'quay.io/example/prometheus@sha256:9332054523223e2ddc18d8101799d54a4a8d823b030c53216f063a6c117773cd',
  };
  assert.throws(
    () => loadArtifacts('dev', { run: helmRun, imageLocks }),
    /image lock repository mismatch/,
  );
});

test('negative: wrong rendered tag is refused', () => {
  const tagOnlyRun = (command, args, options) => {
    if (command === 'helm' && args.includes('obs-grafana')) {
      return {
        ok: true,
        status: 0,
        stdout: collectorOnlyManifest(
          `${LOCK_BY_ROLE.grafana.repository}:13.3.2@sha256:${LOCK_BY_ROLE.grafana.hex}`,
          'offscreen-dev-observability',
        )
          .replace('obs-collector', 'obs-grafana')
          .replace('opentelemetry-collector', 'grafana'),
        stderr: '',
        timedOut: false,
        missing: false,
      };
    }
    return helmRun(command, args, options);
  };
  assert.throws(
    () => loadArtifacts('dev', { run: tagOnlyRun }),
    /primary workload image reference mismatch/,
  );
});

test('negative: missing grafana distroless tag is refused', () => {
  const missingTagRun = (command, args, options) => {
    if (command === 'helm' && args.includes('obs-grafana')) {
      return {
        ok: true,
        status: 0,
        stdout: `apiVersion: apps/v1
kind: Deployment
metadata:
  name: obs-grafana
  namespace: offscreen-dev-observability
spec:
  replicas: 1
  template:
    spec:
      containers:
        - name: grafana
          image: ${LOCK_BY_ROLE.grafana.repository}@sha256:${LOCK_BY_ROLE.grafana.hex}
`,
        stderr: '',
        timedOut: false,
        missing: false,
      };
    }
    return helmRun(command, args, options);
  };
  assert.throws(
    () => loadArtifacts('dev', { run: missingTagRun }),
    /primary workload image reference mismatch/,
  );
});

test('negative: wrong prometheus digest render is refused', () => {
  const wrongDigestRun = (command, args, options) => {
    if (command === 'helm' && args.includes('obs-prometheus')) {
      return {
        ok: true,
        status: 0,
        stdout: `apiVersion: apps/v1
kind: Deployment
metadata:
  name: obs-prometheus
  namespace: offscreen-dev-observability
spec:
  replicas: 1
  template:
    spec:
      containers:
        - name: prometheus-server
          image: ${LOCK_BY_ROLE.prometheus.repository}@sha256:0000000000000000000000000000000000000000000000000000000000000000
`,
        stderr: '',
        timedOut: false,
        missing: false,
      };
    }
    return helmRun(command, args, options);
  };
  assert.throws(
    () => loadArtifacts('dev', { run: wrongDigestRun }),
    /primary workload image reference mismatch/,
  );
});

test('negative: duplicate lock role is refused', () => {
  const backup = readFileSync(LOCK_PATH);
  const duplicate = `${IMAGE_LOCK.trim()}\ncollector\t${LOCK_BY_ROLE.collector.canonical}\n`;
  try {
    writeFileSync(LOCK_PATH, duplicate);
    assert.throws(
      () => loadArtifacts('dev', { run: helmRun }),
      /duplicate image lock role/,
    );
  } finally {
    writeFileSync(LOCK_PATH, backup);
  }
});

test('negative: unknown lock role is refused', () => {
  const backup = readFileSync(LOCK_PATH);
  const unknown = `${IMAGE_LOCK.trim()}\nunknown-role\t${LOCK_BY_ROLE.collector.canonical}\n`;
  try {
    writeFileSync(LOCK_PATH, unknown);
    assert.throws(
      () => loadArtifacts('dev', { run: helmRun }),
      /image lock row count mismatch|unknown image lock role/,
    );
  } finally {
    writeFileSync(LOCK_PATH, backup);
  }
});

test('negative: malformed lock row is refused', () => {
  const backup = readFileSync(LOCK_PATH);
  const malformed = `${IMAGE_LOCK.trim()}\ncollector ${LOCK_BY_ROLE.collector.canonical}\n`;
  try {
    writeFileSync(LOCK_PATH, malformed);
    assert.throws(
      () => loadArtifacts('dev', { run: helmRun }),
      /malformed image lock/,
    );
  } finally {
    writeFileSync(LOCK_PATH, backup);
  }
});

test('negative: extra regular container is refused', () => {
  const extraRun = (command, args, options) => {
    if (command === 'helm' && args.includes('obs-collector')) {
      const rendered = helmRun(command, args, options);
      if (!rendered.ok) return rendered;
      return {
        ...rendered,
        stdout: rendered.stdout.replace(
          'containers:',
          'containers:\n        - name: extra\n          image: example.invalid/extra@sha256:0000000000000000000000000000000000000000000000000000000000000000',
        ),
      };
    }
    return helmRun(command, args, options);
  };
  assert.throws(
    () => loadArtifacts('dev', { run: extraRun }),
    /unexpected regular container count/,
  );
});

test('negative: extra init container is refused', () => {
  const initRun = (command, args, options) => {
    if (command === 'helm' && args.includes('obs-loki')) {
      const rendered = helmRun(command, args, options);
      if (!rendered.ok) return rendered;
      return {
        ...rendered,
        stdout: rendered.stdout.replace(
          '      containers:\n        - name: loki',
          '      initContainers:\n        - name: init\n          image: example.invalid/init@sha256:0000000000000000000000000000000000000000000000000000000000000000\n      containers:\n        - name: loki',
        ),
      };
    }
    return helmRun(command, args, options);
  };
  assert.throws(
    () => loadArtifacts('dev', { run: initRun }),
    /unexpected init container/,
  );
});

test('negative: extra ephemeral container is refused', () => {
  const ephemeralRun = (command, args, options) => {
    if (command === 'helm' && args.includes('obs-tempo')) {
      const rendered = helmRun(command, args, options);
      if (!rendered.ok) return rendered;
      return {
        ...rendered,
        stdout: rendered.stdout.replace(
          '      automountServiceAccountToken: false\n      containers:',
          '      automountServiceAccountToken: false\n      ephemeralContainers:\n        - name: debug\n          image: example.invalid/debug@sha256:0000000000000000000000000000000000000000000000000000000000000000\n      containers:',
        ),
      };
    }
    return helmRun(command, args, options);
  };
  assert.throws(
    () => loadArtifacts('dev', { run: ephemeralRun }),
    /unexpected ephemeral container/,
  );
});

test('negative: wrong container name is refused', () => {
  const wrongNameRun = (command, args, options) => {
    if (command === 'helm' && args.includes('obs-collector')) {
      return {
        ok: true,
        status: 0,
        stdout: collectorOnlyManifest(
          B07_RENDERED.collector,
          'offscreen-dev-observability',
        ).replace('opentelemetry-collector', 'collector'),
        stderr: '',
        timedOut: false,
        missing: false,
      };
    }
    return helmRun(command, args, options);
  };
  assert.throws(
    () => loadArtifacts('dev', { run: wrongNameRun }),
    /primary workload container name mismatch/,
  );
});

test('negative: missing primary workload is refused', () => {
  const missingWorkloadRun = (command, args, options) => {
    if (command === 'helm' && args.includes('obs-loki')) {
      return {
        ok: true,
        status: 0,
        stdout: `apiVersion: v1
kind: ConfigMap
metadata:
  name: obs-loki
  namespace: offscreen-dev-observability
data:
  x: y
`,
        stderr: '',
        timedOut: false,
        missing: false,
      };
    }
    return helmRun(command, args, options);
  };
  assert.throws(
    () => loadArtifacts('dev', { run: missingWorkloadRun }),
    /missing primary workload/,
  );
});

test('negative: tag-only collector image is refused', () => {
  const tagOnlyRun = (command, args, options) => {
    if (command === 'helm' && args.includes('obs-collector')) {
      return {
        ok: true,
        status: 0,
        stdout: collectorOnlyManifest(
          'ghcr.io/open-telemetry/opentelemetry-collector-releases/opentelemetry-collector-contrib:0.165.0',
          'offscreen-dev-observability',
        ),
        stderr: '',
        timedOut: false,
        missing: false,
      };
    }
    return helmRun(command, args, options);
  };
  assert.throws(
    () => loadArtifacts('dev', { run: tagOnlyRun }),
    /primary workload image reference mismatch/,
  );
});

test('negative: missing primary workload image is refused', () => {
  const missingImageRun = (command, args, options) => {
    if (command === 'helm' && args.includes('obs-loki')) {
      return {
        ok: true,
        status: 0,
        stdout: `apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: obs-loki
  namespace: offscreen-dev-observability
spec:
  replicas: 1
  serviceName: obs-loki
  template:
    spec:
      containers:
        - name: loki
          image: ""
`,
        stderr: '',
        timedOut: false,
        missing: false,
      };
    }
    return helmRun(command, args, options);
  };
  assert.throws(
    () => loadArtifacts('dev', { run: missingImageRun }),
    /missing primary workload image/,
  );
});

test('template argv contains the shared values helper slice', () => {
  /** @type {string[][]} */
  const recorded = [];
  const recordingRun = (command, args, options) => {
    if (command === 'helm' && args[0] === 'template') recorded.push(args);
    return helmRun(command, args, options);
  };
  const bundle = loadArtifacts('dev', { run: recordingRun });
  assert.equal(recorded.length, bundle.releases.length);
  for (const [index, release] of bundle.releases.entries()) {
    const slice = helmValuesArgv(release);
    const start = recorded[index].indexOf('-f');
    assert.deepEqual(
      recorded[index].slice(start, start + slice.length),
      slice,
      release.role,
    );
  }
});

test('negative: malformed values yaml is refused', () => {
  const tempDir = mkdtempSync(join(tmpdir(), 'obs-artifact-yaml-'));
  const valuesBackup = join(valuesRoot, 'collector.yaml');
  const backup = readFileSync(valuesBackup);
  try {
    writeFileSync(
      valuesBackup,
      'apiVersion: v1\nkind: ConfigMap\nmetadata:\n  name: [unterminated\n',
    );
    assert.throws(
      () => loadArtifacts('dev', { run: helmRun }),
      /artifact-invalid/,
    );
  } finally {
    writeFileSync(valuesBackup, backup);
    rmSync(tempDir, { recursive: true, force: true });
  }
});

test('negative: missing final grafana values refuses before any template', () => {
  const valuesPath = join(valuesRoot, 'grafana.yaml');
  const backup = readFileSync(valuesPath);
  let helmCalls = 0;
  const countingRun = (command, args, options) => {
    if (command === 'helm') helmCalls += 1;
    return helmRun(command, args, options);
  };
  try {
    rmSync(valuesPath);
    assert.throws(
      () => loadArtifacts('dev', { run: countingRun }),
      /artifact-invalid/,
    );
    assert.equal(helmCalls, 0);
  } finally {
    writeFileSync(valuesPath, backup);
  }
});

test('negative: malformed final grafana values refuses before any template', () => {
  const valuesPath = join(valuesRoot, 'grafana.yaml');
  const backup = readFileSync(valuesPath);
  let helmCalls = 0;
  const countingRun = (command, args, options) => {
    if (command === 'helm') helmCalls += 1;
    return helmRun(command, args, options);
  };
  try {
    writeFileSync(valuesPath, 'metadata:\n  name: [unterminated\n');
    assert.throws(
      () => loadArtifacts('dev', { run: countingRun }),
      /artifact-invalid/,
    );
    assert.equal(helmCalls, 0);
  } finally {
    writeFileSync(valuesPath, backup);
  }
});

test('negative: missing appVersion pin causes zero templates', () => {
  const pins = parseYaml(
    readFileSync(join(locksRoot, 'charts.yaml'), 'utf8'),
  ).charts;
  const corruptPins = structuredClone(pins);
  delete corruptPins.grafana.appVersion;
  let helmCalls = 0;
  const countingRun = (command, args, options) => {
    if (command === 'helm') helmCalls += 1;
    return helmRun(command, args, options);
  };
  assert.throws(
    () => loadArtifacts('dev', { run: countingRun, pins: corruptPins }),
    /artifact-invalid/,
  );
  assert.equal(helmCalls, 0);
});

test('negative: unexpected helm hook is refused', () => {
  let hooked = false;
  const hookRun = (command, args) => {
    if (command !== 'helm') {
      return {
        ok: false,
        status: 1,
        stdout: '',
        stderr: '',
        timedOut: false,
        missing: false,
      };
    }
    if (!hooked && args.includes('obs-grafana')) {
      hooked = true;
      return {
        ok: true,
        status: 0,
        stdout: `apiVersion: v1
kind: ConfigMap
metadata:
  name: hooked
  namespace: offscreen-dev-observability
  annotations:
    helm.sh/hook: pre-install
data:
  x: y
`,
        stderr: '',
        timedOut: false,
        missing: false,
      };
    }
    return helmRun(command, args);
  };
  assert.throws(
    () => loadArtifacts('dev', { run: hookRun }),
    /unexpected helm hook/,
  );
});

test('negative: injected unknown imageLocks role is refused', () => {
  const imageLocks = {
    ...Object.fromEntries(
      Object.entries(LOCK_BY_ROLE).map(([role, row]) => [role, row.canonical]),
    ),
    unknown:
      'docker.io/example/unknown@sha256:0000000000000000000000000000000000000000000000000000000000000000',
  };
  assert.throws(
    () => loadArtifacts('dev', { run: helmRun, imageLocks }),
    /unknown image lock role/,
  );
});

const COLLECTOR_OVERLAY_PATH = join(
  valuesRoot,
  'profiles',
  'dev',
  'collector.yaml',
);
const COLLECTOR_MUTABLE_KINDS = new Set(['ConfigMap', 'Deployment', 'Service']);

/**
 * @param {Record<string, unknown>} doc
 * @param {string} namespace
 */
function documentIdentityKey(doc, namespace) {
  const meta =
    /** @type {{ metadata?: { name?: string, namespace?: string } }} */ (doc)
      .metadata;
  const docNs = meta?.namespace ?? namespace;
  return `${doc.apiVersion}/${doc.kind}/${docNs}/${meta?.name}`;
}

/**
 * @param {Awaited<ReturnType<typeof loadArtifacts>>} bundle
 */
function collectorRelay(bundle) {
  const release = bundle.releases.find((row) => row.role === 'collector');
  assert.ok(release);
  const configMap = release.documents.find(
    (doc) => doc.kind === 'ConfigMap' && doc.metadata?.name === 'obs-collector',
  );
  assert.ok(configMap);
  const data = /** @type {{ data?: Record<string, string> }} */ (configMap)
    .data;
  assert.ok(data?.relay);
  return parseYaml(data.relay);
}

/**
 * @param {Awaited<ReturnType<typeof loadArtifacts>>} bundle
 */
function nonCollectorDocuments(bundle) {
  return bundle.documents.filter(
    (doc) => !String(doc.metadata?.name ?? '').startsWith('obs-collector'),
  );
}

test('loadObservabilityVariants returns predecessor only for dev', () => {
  const releaseVariants = loadObservabilityVariants('release', {
    run: helmRun,
  });
  assert.ok(releaseVariants.desired);
  assert.equal(releaseVariants.predecessor, null);
  const devVariants = loadObservabilityVariants('dev', { run: helmRun });
  assert.ok(devVariants.desired);
  assert.ok(devVariants.predecessor);
});

test('dev desired collector exposes five service ports with dev otlp bindings', () => {
  const bundle = loadArtifacts('dev', { run: helmRun });
  const collector = bundle.releases.find((row) => row.role === 'collector');
  assert.ok(collector);
  const service = collector.documents.find((doc) => doc.kind === 'Service');
  assert.ok(service);
  const ports =
    /** @type {{ name?: string, port?: number, protocol?: string, appProtocol?: string }[]} */ (
      service.spec.ports
    );
  assert.equal(ports.length, 5);
  const byName = Object.fromEntries(ports.map((port) => [port.name, port]));
  assert.equal(byName['dev-otlp'].port, 4327);
  assert.equal(byName['dev-otlp'].protocol, 'TCP');
  assert.equal(byName['dev-otlp'].appProtocol, 'grpc');
  assert.equal(byName['dev-otlp-http'].port, 4328);
  assert.equal(byName['dev-otlp-http'].protocol, 'TCP');
  assert.ok(byName.metrics);
  assert.ok(byName.otlp);
  assert.ok(byName['otlp-http']);
});

test('dev desired vs predecessor differs only on collector config workload objects', () => {
  const { desired, predecessor } = loadObservabilityVariants('dev', {
    run: helmRun,
  });
  assert.ok(predecessor);
  const namespace = desired.profile.namespaces.observability;
  const desiredCollector = desired.releases.find(
    (row) => row.role === 'collector',
  );
  const predecessorCollector = predecessor.releases.find(
    (row) => row.role === 'collector',
  );
  assert.ok(desiredCollector && predecessorCollector);
  const desiredIds = new Set(
    desiredCollector.documents.map((doc) =>
      documentIdentityKey(doc, namespace),
    ),
  );
  const predecessorIds = new Set(
    predecessorCollector.documents.map((doc) =>
      documentIdentityKey(doc, namespace),
    ),
  );
  assert.deepEqual([...desiredIds].sort(), [...predecessorIds].sort());
  assert.equal(desiredIds.size, 4);
  for (const doc of desiredCollector.documents) {
    const key = documentIdentityKey(doc, namespace);
    const peer = predecessorCollector.documents.find(
      (candidate) => documentIdentityKey(candidate, namespace) === key,
    );
    assert.ok(peer, key);
    const kind = /** @type {string} */ (doc.kind);
    if (kind === 'ServiceAccount') {
      assert.deepEqual(doc, peer);
    } else if (COLLECTOR_MUTABLE_KINDS.has(kind)) {
      assert.notDeepEqual(doc, peer);
    }
  }
  assert.deepEqual(
    nonCollectorDocuments(desired),
    nonCollectorDocuments(predecessor),
  );
  assert.equal(
    desiredCollector.expectedImage.renderedReference,
    predecessorCollector.expectedImage.renderedReference,
  );
});

test('collector relay keeps base sections and adds developer lanes only on desired dev', () => {
  const { desired, predecessor } = loadObservabilityVariants('dev', {
    run: helmRun,
  });
  const desiredRelay = collectorRelay(desired);
  const predecessorRelay = collectorRelay(predecessor);
  const releaseBundle = loadArtifacts('release', { run: helmRun });
  const releaseRelay = collectorRelay(releaseBundle);
  const baseSections = ['traces', 'metrics', 'logs'];
  for (const name of baseSections) {
    assert.deepEqual(
      desiredRelay.service.pipelines[name],
      releaseRelay.service.pipelines[name],
    );
    assert.deepEqual(
      predecessorRelay.service.pipelines[name],
      releaseRelay.service.pipelines[name],
    );
  }
  assert.deepEqual(desiredRelay.receivers.otlp, releaseRelay.receivers.otlp);
  assert.equal(
    desiredRelay.receivers['otlp/developer'].protocols.grpc.endpoint,
    '0.0.0.0:4327',
  );
  assert.equal(
    desiredRelay.receivers['otlp/developer'].protocols.http.endpoint,
    '0.0.0.0:4328',
  );
  for (const signal of ['traces', 'logs', 'metrics']) {
    const pipeline = desiredRelay.service.pipelines[`${signal}/developer`];
    assert.deepEqual(pipeline.receivers, ['otlp/developer']);
    assert.deepEqual(pipeline.processors, [
      'memory_limiter',
      'filter/developer',
      'transform/developer',
      'batch',
    ]);
  }
  for (const relay of [predecessorRelay, releaseRelay]) {
    assert.equal(relay.receivers['otlp/developer'], undefined);
    assert.equal(relay.service.pipelines['traces/developer'], undefined);
    assert.equal(relay.service.pipelines['logs/developer'], undefined);
    assert.equal(relay.service.pipelines['metrics/developer'], undefined);
  }
});

test('checked-in dev overlay matches immutable generator output', () => {
  const overlayText = readFileSync(COLLECTOR_OVERLAY_PATH, 'utf8');
  const overlayDoc = parseYaml(overlayText);
  assert.equal(overlayDoc.ports['dev-otlp'].containerPort, 4327);
  assert.equal(overlayDoc.ports['dev-otlp-http'].containerPort, 4328);
  assert.equal(
    overlayDoc.alternateConfig.receivers['otlp/developer'].protocols.grpc
      .endpoint,
    '0.0.0.0:4327',
  );
});

test('release collector parity and dev predecessor base relay match', () => {
  const devPredecessor = loadArtifacts('dev', {
    run: helmRun,
    variant: 'predecessor',
  });
  const releaseBundle = loadArtifacts('release', { run: helmRun });
  const devCollector = devPredecessor.releases.find(
    (row) => row.role === 'collector',
  );
  const relCollector = releaseBundle.releases.find(
    (row) => row.role === 'collector',
  );
  assert.ok(devCollector && relCollector);
  assert.equal(devCollector.valuesPaths.length, 1);
  assert.equal(relCollector.valuesPaths.length, 1);
  assert.deepEqual(devCollector.valuesPaths, relCollector.valuesPaths);
  assert.deepEqual(
    devCollector.expectedImage.renderedReference,
    relCollector.expectedImage.renderedReference,
  );
  assert.deepEqual(
    collectorRelay(devPredecessor),
    collectorRelay(releaseBundle),
  );
});

test('negative: unknown artifact variant is refused', () => {
  assert.throws(
    () =>
      loadArtifacts('dev', {
        run: helmRun,
        variant: /** @type {'desired'} */ (/** @type {unknown} */ ('legacy')),
      }),
    /unknown artifact variant/,
  );
});

test('negative: release predecessor variant is refused before template', () => {
  let helmCalls = 0;
  const countingRun = (command, args, options) => {
    if (command === 'helm') helmCalls += 1;
    return helmRun(command, args, options);
  };
  assert.throws(
    () =>
      loadArtifacts('release', {
        run: countingRun,
        variant: 'predecessor',
      }),
    /release predecessor refused/,
  );
  assert.equal(helmCalls, 0);
});

test('negative: malformed dev overlay refuses before template', () => {
  const backup = readFileSync(COLLECTOR_OVERLAY_PATH);
  let helmCalls = 0;
  const countingRun = (command, args, options) => {
    if (command === 'helm') helmCalls += 1;
    return helmRun(command, args, options);
  };
  try {
    writeFileSync(COLLECTOR_OVERLAY_PATH, 'metadata:\n  name: [broken\n');
    assert.throws(
      () => loadArtifacts('dev', { run: countingRun }),
      /artifact-invalid/,
    );
    assert.equal(helmCalls, 0);
  } finally {
    writeFileSync(COLLECTOR_OVERLAY_PATH, backup);
  }
});

test('negative: missing dev overlay refuses before template', () => {
  const backup = readFileSync(COLLECTOR_OVERLAY_PATH);
  let helmCalls = 0;
  const countingRun = (command, args, options) => {
    if (command === 'helm') helmCalls += 1;
    return helmRun(command, args, options);
  };
  try {
    rmSync(COLLECTOR_OVERLAY_PATH);
    assert.throws(
      () => loadArtifacts('dev', { run: countingRun }),
      /artifact-invalid/,
    );
    assert.equal(helmCalls, 0);
  } finally {
    writeFileSync(COLLECTOR_OVERLAY_PATH, backup);
  }
});

test('named E1 artifact IDs load and match their historical alias renders', () => {
  const cases = [
    ['dev', 'dev-e1-developer', 'desired'],
    ['dev', 'dev-e1-base', 'predecessor'],
    ['release', 'release-e1', 'desired'],
  ];
  for (const [profileId, artifactId, alias] of cases) {
    const named = loadArtifacts(profileId, { run: helmRun, variant: artifactId });
    const legacy = loadArtifacts(profileId, { run: helmRun, variant: alias });
    assert.equal(named.artifactId, artifactId);
    assert.equal(legacy.artifactId, artifactId);
    assert.deepEqual(named.documents, legacy.documents);
    assert.deepEqual(named.releases, legacy.releases);
  }
  const variants = loadObservabilityVariants('dev', { run: helmRun });
  assert.equal(variants.desired.artifactId, 'dev-e1-developer');
  assert.equal(variants.predecessor.artifactId, 'dev-e1-base');
  assert.equal(loadArtifacts('dev', { run: helmRun }).artifactId, 'dev-e1-developer');
  assert.equal(
    loadObservabilityVariants('release', { run: helmRun }).desired.artifactId,
    'release-e1',
  );
});

test('named dev base vs developer differs only in the collector release', () => {
  const base = loadArtifacts('dev', { run: helmRun, variant: 'dev-e1-base' });
  const developer = loadArtifacts('dev', {
    run: helmRun,
    variant: 'dev-e1-developer',
  });
  for (let i = 0; i < base.releases.length; i += 1) {
    const same =
      JSON.stringify(base.releases[i].documents) ===
      JSON.stringify(developer.releases[i].documents);
    assert.equal(same, base.releases[i].role !== 'collector');
  }
});

test('negative: unknown, cross-profile and trustless dev-e2 artifact IDs reject before any template', () => {
  for (const [profileId, variant] of [
    ['dev', 'nope'],
    ['dev', 'release-e1'],
    ['release', 'dev-e1-developer'],
    ['release', 'dev-e1-base'],
    ['dev', 'dev-e2'],
    ['release', 'dev-e2'],
  ]) {
    let helmCalls = 0;
    const countingRun = (command, args, options) => {
      if (command === 'helm') helmCalls += 1;
      return helmRun(command, args, options);
    };
    assert.throws(
      () => loadArtifacts(profileId, { run: countingRun, variant }),
      /artifact-invalid/,
      `${profileId}/${variant}`,
    );
    assert.equal(helmCalls, 0);
  }
});
