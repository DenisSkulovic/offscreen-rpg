import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { parse as parseYaml } from 'yaml';
import { readPlatformProfile } from '../../common/profile.mjs';
import { runPlatformCommand } from '../../common/commands.mjs';
import {
  loadArtifacts,
  lintObservability,
  OBSERVABILITY_RELEASE_ORDER,
  renderObservabilityDocuments,
} from '../artifacts.mjs';

const observabilityRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const specimensRoot = join(observabilityRoot, 'specimens');
const vendorRoot = join(observabilityRoot, 'vendor');
const LOCK_PATH = join(specimensRoot, 'image-lock-candidate.tsv');

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
    readFileSync(join(specimensRoot, 'pins.yaml'), 'utf8'),
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
    readFileSync(join(specimensRoot, 'pins.yaml'), 'utf8'),
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
    readFileSync(join(specimensRoot, 'pins.yaml'), 'utf8'),
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

test('negative: malformed values yaml is refused', () => {
  const tempDir = mkdtempSync(join(tmpdir(), 'obs-artifact-yaml-'));
  const valuesBackup = join(specimensRoot, 'collector.yaml');
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
