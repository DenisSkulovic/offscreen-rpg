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

const rabbitmqRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const chartRoot = join(rabbitmqRoot, 'chart');

const BROKER_IMAGE = 'docker.io/library/rabbitmq:4.3.4-management';

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

test('lintPlatformChart succeeds for rabbitmq release', () => {
  lintPlatformChart(
    { service: 'rabbitmq', profile: 'release' },
    { chartRoot, run: helmRun },
  );
});

test('assertPlatformRenderRequest refuses rabbitmq on dev profile', () => {
  assert.throws(
    () => assertPlatformRenderRequest('rabbitmq', 'dev', 'namespace'),
    /release-only/,
  );
});

test('release namespace render matches disposable messaging namespace', () => {
  const docs = renderPlatformDocuments(
    { service: 'rabbitmq', profile: 'release', section: 'namespace' },
    { chartRoot, run: helmRun },
  );
  assert.equal(docs.length, 1);
  assert.equal(docs[0].kind, 'Namespace');
  assert.equal(docs[0].metadata.name, 'messaging');
  assert.deepEqual(docs[0].metadata.labels, {
    'offscreen.rpg/lab': 'disposable',
  });
});

test('release broker render matches lab-broker identity storage image resources', () => {
  const docs = renderPlatformDocuments(
    { service: 'rabbitmq', profile: 'release', section: 'broker' },
    { chartRoot, run: helmRun },
  );
  assert.equal(docs.length, 1);
  const broker = docs[0];
  assert.equal(broker.kind, 'RabbitmqCluster');
  assert.equal(broker.metadata.name, 'lab-broker');
  assert.equal(broker.metadata.namespace, 'messaging');
  assert.equal(broker.spec.replicas, 1);
  assert.equal(broker.spec.image, BROKER_IMAGE);
  assert.equal(broker.spec.delayStartSeconds, 5);
  assert.deepEqual(broker.spec.service, { type: 'ClusterIP' });
  assert.deepEqual(broker.spec.persistence, {
    storageClassName: 'local-path',
    storage: '1Gi',
  });
  assert.deepEqual(broker.spec.resources, {
    requests: { cpu: '200m', memory: '1Gi' },
    limits: { cpu: '500m', memory: '1Gi' },
  });
  assert.deepEqual(broker.spec.secretBackend, {
    externalSecret: { name: 'lab-broker-user' },
  });
  assert.match(
    broker.spec.rabbitmq.additionalConfig,
    /default_queue_type = classic/,
  );
  assert.match(
    broker.spec.rabbitmq.additionalConfig,
    /loopback_users\.guest = true/,
  );
  const container =
    broker.spec.override.statefulSet.spec.template.spec.containers[0];
  assert.equal(container.name, 'rabbitmq');
  assert.deepEqual(container.volumeMounts, [
    {
      mountPath: '/etc/rabbitmq/definitions.json',
      subPath: 'definitions.json',
      name: 'definitions',
    },
  ]);
  const volumes = broker.spec.override.statefulSet.spec.template.spec.volumes;
  assert.deepEqual(volumes, [
    {
      name: 'definitions',
      configMap: { name: 'lab-broker-definitions' },
    },
  ]);
});

test('release all render emits namespace and broker only', () => {
  const docs = renderPlatformDocuments(
    { service: 'rabbitmq', profile: 'release', section: 'all' },
    { chartRoot, run: helmRun },
  );
  assert.equal(docs.length, 2);
  const byId = docMap(docs);
  assert.ok(byId.get('Namespace/-/messaging'));
  assert.ok(byId.get('RabbitmqCluster/messaging/lab-broker'));
});
