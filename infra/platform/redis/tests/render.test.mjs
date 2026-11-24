import assert from 'node:assert/strict';
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
  assert.equal(String(config.data['redis.conf']).trimEnd(), REDIS_CONF);

  const deployment = byId.get('Deployment/lab-a/redis');
  assert.ok(deployment);
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

  const service = byId.get('Service/offscreen-dev-redis/redis');
  assert.ok(service);
  assert.equal(service.spec.type, 'ClusterIP');
});
