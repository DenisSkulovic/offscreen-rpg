import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { runPlatformCommand } from '../../common/commands.mjs';
import {
  assertPlatformRenderRequest,
  documentIdentity,
  lintPlatformChart,
  renderPlatformDocuments,
} from '../../common/render.mjs';

const redisRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const chartRoot = join(redisRoot, 'chart');

const RELEASE_IMAGE = 'docker.io/library/redis:8.2.1-alpine';
const REDIS_CONF = [
  'bind 0.0.0.0',
  'protected-mode no',
  'port 6379',
  'appendonly no',
  'save ""',
  'dir /data',
  'maxmemory 32mb',
  'maxmemory-policy allkeys-lru',
].join('\n');

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

function docMap(docs) {
  /** @type {Map<string, object>} */
  const map = new Map();
  for (const doc of docs) {
    map.set(documentIdentity(doc), doc);
  }
  return map;
}

function configConfString(configMap) {
  return String(configMap.data['redis.conf']).trimEnd();
}

function configSha256(configMap) {
  return createHash('sha256').update(configConfString(configMap)).digest('hex');
}

function assertConfigDigestParity(byId, deploymentKey, configKey) {
  const config = byId.get(configKey);
  const deployment = byId.get(deploymentKey);
  assert.ok(config);
  assert.ok(deployment);
  const expected = configSha256(config);
  const annotated =
    deployment.spec.template.metadata.annotations[
      'offscreen.rpg/redis-config-sha256'
    ];
  assert.equal(annotated, expected);
}

test('lintPlatformChart succeeds for redis release', () => {
  lintPlatformChart(
    { service: 'redis', profile: 'release' },
    { chartRoot, run: helmRun },
  );
});

test('assertPlatformRenderRequest allows redis on dev profile', () => {
  assert.doesNotThrow(() => assertPlatformRenderRequest('redis', 'dev', 'all'));
});

test('release render matches disposable lab redis meaningful fields', () => {
  const docs = renderPlatformDocuments(
    { service: 'redis', profile: 'release', section: 'all' },
    { chartRoot, run: helmRun },
  );
  assert.equal(docs.length, 3);
  const byId = docMap(docs);

  const config = byId.get('ConfigMap/lab-a/redis-config');
  assert.ok(config);
  assert.equal(configConfString(config), REDIS_CONF);

  const deployment = byId.get('Deployment/lab-a/redis');
  assert.ok(deployment);
  assert.equal(deployment.spec.strategy.type, 'Recreate');
  assert.equal(deployment.spec.replicas, 1);
  const container = deployment.spec.template.spec.containers[0];
  assert.equal(container.image, RELEASE_IMAGE);
  assert.deepEqual(container.resources, {
    requests: { cpu: '20m', memory: '32Mi' },
    limits: { cpu: '500m', memory: '128Mi' },
  });
  assert.equal(
    container.livenessProbe.exec.command.join(' '),
    'redis-cli ping',
  );
  assert.equal(deployment.spec.template.spec.securityContext.runAsUser, 999);
  assert.equal(
    deployment.spec.template.spec.volumes.find((v) => v.name === 'data')
      .emptyDir.sizeLimit,
    '32Mi',
  );
  assertConfigDigestParity(
    byId,
    'Deployment/lab-a/redis',
    'ConfigMap/lab-a/redis-config',
  );

  const service = byId.get('Service/lab-a/redis');
  assert.ok(service);
  assert.equal(service.spec.type, 'ClusterIP');
  assert.equal(service.spec.ports[0].port, 6379);
  assert.equal(service.spec.ports[0].targetPort, 'redis');
});

test('development render uses offscreen-dev-redis and dev owner labels', () => {
  const docs = renderPlatformDocuments(
    { service: 'redis', profile: 'dev', section: 'all' },
    { chartRoot, run: helmRun },
  );
  assert.equal(docs.length, 3);
  const byId = docMap(docs);

  const deployment = byId.get('Deployment/offscreen-dev-redis/redis');
  assert.ok(deployment);
  assert.equal(
    deployment.metadata.labels['offscreen.dev/owner'],
    'offscreen-dev',
  );
  assert.equal(
    deployment.spec.template.metadata.labels['offscreen.dev/owner'],
    'offscreen-dev',
  );
  const container = deployment.spec.template.spec.containers[0];
  assert.equal(container.image, RELEASE_IMAGE);
  assert.deepEqual(container.resources, {
    requests: { cpu: '20m', memory: '32Mi' },
    limits: { cpu: '500m', memory: '128Mi' },
  });
  assertConfigDigestParity(
    byId,
    'Deployment/offscreen-dev-redis/redis',
    'ConfigMap/offscreen-dev-redis/redis-config',
  );

  const service = byId.get('Service/offscreen-dev-redis/redis');
  assert.ok(service);
  assert.equal(service.spec.type, 'ClusterIP');
});

test('stdinOverlay override sizes, CPU limits, and config digest tracks redis.conf only', () => {
  const baseOverlay = {
    redis: { maxmemoryMiB: 64, evictionPolicy: 'allkeys-lru' },
    resources: {
      requests: { cpuMilli: 20, memoryMiB: 32 },
      limits: { cpuMilli: 1000, memoryMiB: 256 },
    },
  };
  const docs = renderPlatformDocuments(
    { service: 'redis', profile: 'release', section: 'all' },
    { chartRoot, run: helmRun, stdinOverlay: baseOverlay },
  );
  const byId = docMap(docs);
  const config = byId.get('ConfigMap/lab-a/redis-config');
  const deployment = byId.get('Deployment/lab-a/redis');
  assert.ok(config);
  assert.ok(deployment);
  assert.equal(configConfString(config).includes('maxmemory 64mb'), true);
  const digest = configSha256(config);
  assert.equal(
    deployment.spec.template.metadata.annotations[
      'offscreen.rpg/redis-config-sha256'
    ],
    digest,
  );
  assert.deepEqual(deployment.spec.template.spec.containers[0].resources, {
    requests: { cpu: '20m', memory: '32Mi' },
    limits: { cpu: '1000m', memory: '256Mi' },
  });

  const cpuOnly = renderPlatformDocuments(
    { service: 'redis', profile: 'release', section: 'all' },
    {
      chartRoot,
      run: helmRun,
      stdinOverlay: {
        ...baseOverlay,
        resources: {
          requests: { cpuMilli: 100, memoryMiB: 32 },
          limits: { cpuMilli: 2000, memoryMiB: 256 },
        },
      },
    },
  );
  const cpuById = docMap(cpuOnly);
  const cpuConfig = cpuById.get('ConfigMap/lab-a/redis-config');
  const cpuDeployment = cpuById.get('Deployment/lab-a/redis');
  assert.equal(configConfString(cpuConfig), configConfString(config));
  assert.equal(configSha256(cpuConfig), digest);
  assert.equal(
    cpuDeployment.spec.template.metadata.annotations[
      'offscreen.rpg/redis-config-sha256'
    ],
    digest,
  );
  assert.deepEqual(cpuDeployment.spec.template.spec.containers[0].resources, {
    requests: { cpu: '100m', memory: '32Mi' },
    limits: { cpu: '2000m', memory: '256Mi' },
  });
});

test('changing eviction policy changes config digest', () => {
  const docs = renderPlatformDocuments(
    { service: 'redis', profile: 'release', section: 'all' },
    {
      chartRoot,
      run: helmRun,
      stdinOverlay: {
        redis: { maxmemoryMiB: 32, evictionPolicy: 'allkeys-lfu' },
      },
    },
  );
  const byId = docMap(docs);
  const config = byId.get('ConfigMap/lab-a/redis-config');
  const deployment = byId.get('Deployment/lab-a/redis');
  const digest = configSha256(config);
  assert.notEqual(digest, configSha256({ data: { 'redis.conf': REDIS_CONF } }));
  assert.equal(
    deployment.spec.template.metadata.annotations[
      'offscreen.rpg/redis-config-sha256'
    ],
    digest,
  );
});

for (const [label, overlay, pattern] of [
  [
    'unsupported redis.evictionPolicy enum',
    { redis: { evictionPolicy: 'volatile-lru' } },
    /evictionPolicy|ENUM/,
  ],
  [
    'zero memory limit fails schema',
    { resources: { limits: { memoryMiB: 0 } } },
    /memoryMiB|minimum|helm template failed/,
  ],
  [
    'string memory fails schema',
    { resources: { limits: { memoryMiB: '128' } } },
    /memoryMiB|integer|helm template failed/,
  ],
  [
    'maxmemory above half memory limit fails validate',
    {
      redis: { maxmemoryMiB: 200 },
      resources: { limits: { memoryMiB: 128 } },
    },
    /maxmemoryMiB must be <= floor/,
  ],
  [
    'request cpu above limit fails validate',
    {
      resources: {
        requests: { cpuMilli: 600 },
        limits: { cpuMilli: 500 },
      },
    },
    /requests\.cpuMilli must be <=/,
  ],
  [
    'release wrong namespace fails validate',
    { namespace: 'wrong-ns' },
    /release profile requires namespace lab-a/,
  ],
  [
    'extra top-level field fails schema',
    { unexpectedField: true },
    /additionalProperties|helm template failed/,
  ],
]) {
  test(`negative: ${label}`, () => {
    assert.throws(
      () =>
        renderPlatformDocuments(
          { service: 'redis', profile: 'release', section: 'all' },
          { chartRoot, run: helmRun, stdinOverlay: overlay },
        ),
      pattern,
    );
  });
}
