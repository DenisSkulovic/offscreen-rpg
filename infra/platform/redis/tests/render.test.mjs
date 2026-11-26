import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { tmpdir } from 'node:os';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { runPlatformCommand } from '../../common/commands.mjs';
import { readPlatformProfile } from '../../common/profile.mjs';
import {
  lintRedisChart,
  prepareFaultValidatedChartCopy,
  FAULT_ONLY_REDIS_IMAGE,
  renderRedisChart,
  renderRedisChartForTarget,
} from '../config.mjs';

const redisRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const chartRoot = join(redisRoot, 'chart');

const FIXED_IMAGE =
  'docker.io/library/redis@sha256:987c376c727652f99625c7d205a1cba3cb2c53b92b0b62aade2bd48ee1593232';

const REDIS_CONF = [
  'bind 0.0.0.0',
  'protected-mode no',
  'port 6379',
  'save ""',
  'appendonly no',
  'dir /data',
  'maxmemory 32mb',
  'maxmemory-policy allkeys-lru',
].join('\n');

const CONFIG_SHA256 = createHash('sha256').update(REDIS_CONF).digest('hex');

/** @returns {{ missing: boolean, ok: boolean, stdout: string, stderr: string, status: number | null }} */
function helm(args, options = {}) {
  const probe = spawnSync('helm', ['version'], { encoding: 'utf8' });
  if (probe.error && probe.error.code === 'ENOENT') {
    return {
      missing: true,
      ok: false,
      stdout: '',
      stderr: 'helm not found',
      status: null,
    };
  }
  const result = spawnSync('helm', args, {
    encoding: 'utf8',
    cwd: chartRoot,
    ...options,
  });
  return {
    missing: false,
    ok: result.status === 0,
    stdout: result.stdout ?? '',
    stderr: result.stderr ?? '',
    status: result.status,
  };
}

function mergedValuesPath(profileId) {
  return join(chartRoot, 'profiles', `${profileId}.yaml`);
}

function renderProfile(profileId, namespace) {
  const valuesFiles = [
    join(chartRoot, 'values.yaml'),
    mergedValuesPath(profileId),
  ];
  const args = [
    'template',
    'redis',
    chartRoot,
    '--namespace',
    namespace,
    ...valuesFiles.flatMap((file) => ['-f', file]),
  ];
  const result = helm(args);
  assert.equal(
    result.missing,
    false,
    'helm must be installed for render tests',
  );
  assert.equal(result.ok, true, result.stderr);
  return parseManifestDocuments(result.stdout);
}

/** @param {string} manifest */
function parseManifestDocuments(manifest) {
  const docs = [];
  for (const chunk of manifest.split(/^---\s*$/m)) {
    const trimmed = chunk.trim();
    if (!trimmed) {
      continue;
    }
    const lines = trimmed.split('\n');
    const kind = lines
      .find((line) => line.startsWith('kind:'))
      ?.slice(6)
      .trim();
    const apiVersion = lines
      .find((line) => line.startsWith('apiVersion:'))
      ?.slice('apiVersion:'.length)
      .trim();
    const name = lines
      .find((line) => line.startsWith('  name:') || line.startsWith('name:'))
      ?.replace(/^\s*name:\s*/, '')
      .trim();
    const namespace = lines
      .find((line) => line.startsWith('  namespace:'))
      ?.replace(/^\s*namespace:\s*/, '')
      .trim();
    docs.push({
      kind,
      apiVersion,
      name,
      namespace,
      raw: trimmed,
      lines,
      manifest: trimmed,
    });
  }
  return docs;
}

function extractConfigMapConf(doc) {
  const marker = 'redis.conf: |-';
  const start = doc.manifest.indexOf(marker);
  assert.ok(start >= 0, 'redis.conf missing from ConfigMap');
  const body = doc.manifest.slice(start + marker.length).replace(/^\n/, '');
  const lines = [];
  for (const line of body.split('\n')) {
    if (line.length > 0 && !line.startsWith(' ')) {
      break;
    }
    if (line.startsWith('    ')) {
      lines.push(line.slice(4));
    }
  }
  return lines.join('\n');
}

function docByKind(docs, kind) {
  const matches = docs.filter((doc) => doc.kind === kind);
  assert.equal(matches.length, 1, `expected one ${kind}`);
  return matches[0];
}

function assertFixedContract(docs, namespace, ownerKey, ownerValue) {
  assert.equal(docs.length, 3);
  const kinds = docs.map((doc) => doc.kind).sort();
  assert.deepEqual(kinds, ['ConfigMap', 'Deployment', 'Service']);

  const configMap = docByKind(docs, 'ConfigMap');
  assert.equal(configMap.name, 'redis-config');
  assert.equal(configMap.namespace, namespace);
  const conf = extractConfigMapConf(configMap);
  assert.equal(conf, REDIS_CONF);

  const deployment = docByKind(docs, 'Deployment');
  assert.equal(deployment.name, 'redis');
  assert.equal(deployment.namespace, namespace);
  assert.match(deployment.manifest, /strategy:\s*\n\s*type: Recreate/);
  assert.match(deployment.manifest, /replicas: 1/);
  assert.match(
    deployment.manifest,
    /image: .+redis@sha256:987c376c727652f99625c7d205a1cba3cb2c53b92b0b62aade2bd48ee1593232/,
  );
  assert.match(deployment.manifest, /runAsUser: 999/);
  assert.match(deployment.manifest, /runAsGroup: 1000/);
  assert.match(deployment.manifest, /automountServiceAccountToken: false/);
  assert.match(deployment.manifest, /sizeLimit: 32Mi/);
  assert.match(deployment.manifest, /periodSeconds: 2/);
  assert.match(
    deployment.manifest,
    /offscreen\.rpg\/redis-config-sha256: "?([a-f0-9]{64})"?/,
  );
  const digestMatch = deployment.manifest.match(
    /offscreen\.rpg\/redis-config-sha256: "?([a-f0-9]{64})"?/,
  );
  assert.equal(digestMatch?.[1], CONFIG_SHA256);
  assert.match(
    deployment.manifest,
    new RegExp(`${ownerKey}: "?${ownerValue}"?`),
  );
  const selectorBlock = deployment.manifest.match(
    /selector:\s*\n\s*matchLabels:\s*\n([\s\S]*?)\n\s*template:/,
  );
  assert.ok(selectorBlock, 'deployment selector.matchLabels block missing');
  assert.match(
    selectorBlock[1],
    /app\.kubernetes\.io\/name: redis\s*\n\s*app\.kubernetes\.io\/instance: redis/,
  );
  assert.doesNotMatch(selectorBlock[1], /offscreen\.(dev\/owner|rpg\/lab):/);

  const service = docByKind(docs, 'Service');
  assert.equal(service.name, 'redis');
  assert.equal(service.namespace, namespace);
  assert.match(service.manifest, /type: ClusterIP/);
  assert.match(service.manifest, /port: 6379/);
  assert.match(service.manifest, /targetPort: redis/);
}

function renderWithValuesOverlay(
  overlay,
  releaseName = 'redis',
  namespace = 'proof-ns',
) {
  const tempDir = mkdtempSync(join(tmpdir(), 'redis-render-values-'));
  const overlayPath = join(tempDir, 'overlay.yaml');
  writeFileSync(overlayPath, overlay);
  const args = [
    'template',
    releaseName,
    chartRoot,
    '--namespace',
    namespace,
    '-f',
    join(chartRoot, 'values.yaml'),
    '-f',
    join(chartRoot, 'profiles', 'release.yaml'),
    '-f',
    overlayPath,
  ];
  return helm(args);
}

const helmMissing = (() => {
  const probe = spawnSync('helm', ['version'], { encoding: 'utf8' });
  return Boolean(probe.error && probe.error.code === 'ENOENT');
})();

const helmPinned = (() => {
  if (helmMissing) {
    return false;
  }
  const probe = spawnSync('helm', ['version', '--short'], { encoding: 'utf8' });
  const short = (probe.stdout ?? '').trim().split(/\r?\n/)[0] ?? '';
  return short.startsWith('v3.22.1');
})();

const FIXED_RESOURCES = {
  requests: { cpuMilli: 20, memoryMiB: 32 },
  limits: { cpuMilli: 500, memoryMiB: 128 },
};

/**
 * @param {string[]} calls
 */
function recordingHelmRun(calls) {
  return (command, args, options) => {
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
    calls.push(args);
    return runPlatformCommand(command, args, options);
  };
}

function assertHelmTemplateArgv(args, profileId, namespace) {
  assert.equal(args[0], 'template');
  assert.equal(args[1], 'redis');
  assert.match(args[2], /offscreen-redis-chart-/);
  assert.notEqual(args[2], chartRoot);
  assert.equal(args[3], '--namespace');
  assert.equal(args[4], namespace);
  assert.equal(args[5], '-f');
  assert.match(args[6], /values\.yaml$/);
  assert.equal(args[7], '-f');
  const profileFile = profileId === 'dev' ? 'development.yaml' : 'release.yaml';
  assert.match(args[8], new RegExp(`profiles/${profileFile}$`));
}

function assertHelmLintArgv(args, profileId, namespace) {
  assert.equal(args[0], 'lint');
  assert.match(args[1], /offscreen-redis-chart-/);
  assert.notEqual(args[1], chartRoot);
  assert.equal(args[2], '-f');
  assert.match(args[3], /values\.yaml$/);
  assert.equal(args[4], '-f');
  const profileFile = profileId === 'dev' ? 'development.yaml' : 'release.yaml';
  assert.match(args[5], new RegExp(`profiles/${profileFile}$`));
  assert.equal(args[6], '--namespace');
  assert.equal(args[7], namespace);
}

function assertRenderedObjects(rendered, namespace, ownerKey, ownerValue) {
  assert.equal(rendered.configMap.kind, 'ConfigMap');
  assert.equal(rendered.configMap.metadata.name, 'redis-config');
  assert.equal(rendered.configMap.metadata.namespace, namespace);
  assert.equal(rendered.deployment.kind, 'Deployment');
  assert.equal(rendered.deployment.metadata.name, 'redis');
  assert.equal(rendered.deployment.metadata.namespace, namespace);
  assert.equal(rendered.service.kind, 'Service');
  assert.equal(rendered.service.metadata.name, 'redis');
  assert.equal(rendered.service.metadata.namespace, namespace);
  assert.deepEqual(rendered.values.image, FIXED_IMAGE);
  assert.deepEqual(rendered.values.redis, {
    maxmemoryMiB: 32,
    evictionPolicy: 'allkeys-lru',
  });
  assert.deepEqual(rendered.values.resources, FIXED_RESOURCES);
  assert.deepEqual(rendered.values.owner, { key: ownerKey, value: ownerValue });
  assert.equal(rendered.deployment.metadata.labels[ownerKey], ownerValue);
}

test(
  'helm lint succeeds for development and release profiles',
  { skip: helmMissing },
  () => {
    for (const profileId of ['development', 'release']) {
      const result = helm([
        'lint',
        chartRoot,
        '-f',
        join(chartRoot, 'values.yaml'),
        '-f',
        mergedValuesPath(profileId),
      ]);
      assert.equal(result.ok, true, `lint ${profileId}: ${result.stderr}`);
    }
  },
);

test(
  'release profile renders three native documents with fixed contract',
  {
    skip: helmMissing,
  },
  () => {
    const docs = renderProfile('release', 'lab-a');
    assertFixedContract(docs, 'lab-a', 'offscreen.rpg/lab', 'disposable');
  },
);

test(
  'development profile renders owner labels and Release.Namespace',
  {
    skip: helmMissing,
  },
  () => {
    const docs = renderProfile('development', 'offscreen-dev-redis');
    assertFixedContract(
      docs,
      'offscreen-dev-redis',
      'offscreen.dev/owner',
      'offscreen-dev',
    );
  },
);

test(
  'namespace comes from Release.Namespace only',
  { skip: helmMissing },
  () => {
    const distinct = 'offscreen-redis-proof-namespace-check';
    const docs = renderProfile('release', distinct);
    for (const doc of docs) {
      assert.equal(doc.namespace, distinct);
    }
  },
);

test(
  'negative: extra top-level values key rejected by schema',
  {
    skip: helmMissing,
  },
  () => {
    const result = renderWithValuesOverlay('unexpectedField: true\n');
    assert.equal(result.ok, false);
    assert.match(
      `${result.stderr}\n${result.stdout}`,
      /additionalProperties|schema|values don't meet the specifications/i,
    );
  },
);

test(
  'negative: incompatible resource limits rejected by schema',
  {
    skip: helmMissing,
  },
  () => {
    const result = renderWithValuesOverlay(
      [
        'resources:',
        '  limits:',
        '    cpuMilli: 500',
        '    memoryMiB: 64',
      ].join('\n'),
    );
    assert.equal(result.ok, false);
    assert.match(
      `${result.stderr}\n${result.stdout}`,
      /memoryMiB|const|schema|values don't meet the specifications/i,
    );
  },
);

test(
  'negative: non-redis release name refused by chart',
  {
    skip: helmMissing,
  },
  () => {
    const result = helm([
      'template',
      'not-redis',
      chartRoot,
      '--namespace',
      'lab-a',
      '-f',
      join(chartRoot, 'values.yaml'),
      '-f',
      join(chartRoot, 'profiles', 'release.yaml'),
    ]);
    assert.equal(result.ok, false);
    assert.match(
      `${result.stderr}\n${result.stdout}`,
      /release name must be redis/,
    );
  },
);

test(
  'negative: wrong eviction policy rejected by schema',
  {
    skip: helmMissing,
  },
  () => {
    const result = renderWithValuesOverlay(
      ['redis:', '  maxmemoryMiB: 32', '  evictionPolicy: allkeys-lfu'].join(
        '\n',
      ),
    );
    assert.equal(result.ok, false);
    assert.match(
      `${result.stderr}\n${result.stdout}`,
      /evictionPolicy|const|schema|values don't meet the specifications/i,
    );
  },
);

test('node-only: expected config checksum matches frozen readback', () => {
  assert.equal(
    CONFIG_SHA256,
    '8394281eba10d4aed07a2ee7b4b46863864917a1a180468470039875560664c1',
  );
  assert.equal(
    FIXED_IMAGE.includes(
      '987c376c727652f99625c7d205a1cba3cb2c53b92b0b62aade2bd48ee1593232',
    ),
    true,
  );
});

test(
  'lintRedisChart uses copied chart and profile namespace argv',
  {
    skip: helmMissing || !helmPinned,
  },
  () => {
    const calls = [];
    const run = recordingHelmRun(calls);
    const profile = readPlatformProfile('dev');
    const result = lintRedisChart('dev', { run });
    assert.equal(result.ok, true);
    assert.equal(calls.length, 2);
    assert.deepEqual(calls[0], ['version', '--short']);
    assertHelmLintArgv(calls[1], 'dev', profile.namespaces.redis);
  },
);

test(
  'renderRedisChartForTarget renders distinct proof namespace',
  {
    skip: helmMissing || !helmPinned,
  },
  () => {
    const calls = [];
    const run = recordingHelmRun(calls);
    const distinct = 'offscreen-redis-proof-target-render';
    const rendered = renderRedisChartForTarget(
      'dev',
      { namespace: distinct },
      run,
    );
    assertRenderedObjects(
      rendered,
      distinct,
      'offscreen.dev/owner',
      'offscreen-dev',
    );
    assert.equal(calls.length, 3);
    assertHelmLintArgv(calls[1], 'dev', distinct);
    assertHelmTemplateArgv(calls[2], 'dev', distinct);
  },
);

test(
  'renderRedisChart returns objects, merged values, and exact helm argv',
  {
    skip: helmMissing || !helmPinned,
  },
  () => {
    for (const [profileId, ownerKey, ownerValue] of [
      ['dev', 'offscreen.dev/owner', 'offscreen-dev'],
      ['release', 'offscreen.rpg/lab', 'disposable'],
    ]) {
      const calls = [];
      const run = recordingHelmRun(calls);
      const profile = readPlatformProfile(profileId);
      const namespace = profile.namespaces.redis;
      const rendered = renderRedisChart(profileId, { run });
      assertRenderedObjects(rendered, namespace, ownerKey, ownerValue);
      assert.equal(calls.length, 3);
      assert.deepEqual(calls[0], ['version', '--short']);
      assertHelmLintArgv(calls[1], profileId, namespace);
      assertHelmTemplateArgv(calls[2], profileId, namespace);
    }
  },
);

test('negative: renderRedisChart refuses unsupported helm version', () => {
  const run = (command, args) => {
    if (command === 'helm' && args[0] === 'version') {
      return {
        ok: true,
        status: 0,
        stdout: 'v3.23.0+gabc\n',
        stderr: '',
        timedOut: false,
        missing: false,
      };
    }
    throw new Error(`unexpected command: ${command} ${args.join(' ')}`);
  };
  assert.throws(
    () => renderRedisChart('dev', { run }),
    /unsupported helm version: v3\.23\.0/,
  );
});

test('negative: renderRedisChart refuses malformed helm template stdout', () => {
  const run = (command, args) => {
    if (command === 'helm' && args[0] === 'version') {
      return {
        ok: true,
        status: 0,
        stdout: 'v3.22.1+gabc\n',
        stderr: '',
        timedOut: false,
        missing: false,
      };
    }
    if (command === 'helm' && args[0] === 'lint') {
      return {
        ok: true,
        status: 0,
        stdout: 'ok\n',
        stderr: '',
        timedOut: false,
        missing: false,
      };
    }
    if (command === 'helm' && args[0] === 'template') {
      return {
        ok: true,
        status: 0,
        stdout: 'kind: ConfigMap\nmetadata: [broken\n',
        stderr: '',
        timedOut: false,
        missing: false,
      };
    }
    throw new Error(`unexpected command: ${command} ${args.join(' ')}`);
  };
  assert.throws(
    () => renderRedisChart('release', { run }),
    /malformed helm template output/,
  );
});

test('negative: lintRedisChart refuses HELM_DRIVER override in runner env', () => {
  const previous = process.env.HELM_DRIVER;
  process.env.HELM_DRIVER = 'configmap';
  try {
    assert.throws(
      () => lintRedisChart('dev', { run: recordingHelmRun([]) }),
      /redis helm runner env refused: HELM_DRIVER/,
    );
  } finally {
    if (previous === undefined) {
      delete process.env.HELM_DRIVER;
    } else {
      process.env.HELM_DRIVER = previous;
    }
  }
});

test('real Helm validates isolated fault chart while production rejects zero digest', () => {
  const namespace = 'offscreen-redis-proof-0123456789abcdef0123456789abcdef';
  for (const profile of ['dev', 'release']) {
    const fault = prepareFaultValidatedChartCopy(runPlatformCommand, profile, namespace);
    try {
      const result = helm(['template', 'redis', fault.chartRoot, '--namespace', namespace,
        '-f', join(fault.chartRoot, 'values.yaml'), '-f', join(fault.chartRoot, 'profiles', profile === 'dev' ? 'development.yaml' : 'release.yaml')]);
      assert.equal(result.ok, true, result.stderr || result.stdout);
      assert.ok(result.stdout.includes(FAULT_ONLY_REDIS_IMAGE));
    } finally { fault.dispose(); }
  }
  assert.equal(renderWithValuesOverlay('image: ' + FAULT_ONLY_REDIS_IMAGE + '\n').ok, false);
});
