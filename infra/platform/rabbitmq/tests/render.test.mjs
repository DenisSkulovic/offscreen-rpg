import assert from 'node:assert/strict';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { runPlatformCommand } from '../../common/commands.mjs';
import { readPlatformProfile } from '../../common/profile.mjs';
import {
  assertPlatformRenderRequest,
  documentIdentity,
  lintPlatformChart,
  renderPlatformDocuments,
} from '../../common/render.mjs';
import { BROKER_IMAGE_PIN } from '../vendor-bundles.mjs';

const rabbitmqRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const chartRoot = join(rabbitmqRoot, 'chart');

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

/** @param {'dev' | 'release'} profile */
function expectedNamespace(profile) {
  return readPlatformProfile(profile).namespaces.rabbitmq;
}

/** @param {'dev' | 'release'} profile */
function expectedOwnerLabels(profile) {
  if (profile === 'dev') {
    return {
      'offscreen.dev/owner': 'offscreen-dev',
      'offscreen.rpg/rabbitmq-design': 'native-v1',
    };
  }
  return {
    'offscreen.rpg/lab': 'disposable',
    'offscreen.rpg/rabbitmq-design': 'native-v1',
  };
}

/** @param {'dev' | 'release'} profile */
function expectedStorageClass(profile) {
  return profile === 'dev' ? 'standard' : 'local-path';
}

/** @param {'dev' | 'release'} profile */
function assertBrokerDocument(broker, profile) {
  const namespace = expectedNamespace(profile);
  assert.equal(broker.kind, 'RabbitmqCluster');
  assert.equal(broker.metadata.name, 'rabbitmq');
  assert.equal(broker.metadata.namespace, namespace);
  assert.deepEqual(broker.metadata.labels, expectedOwnerLabels(profile));
  assert.equal(broker.spec.replicas, 1);
  assert.equal(broker.spec.image, BROKER_IMAGE_PIN);
  assert.deepEqual(broker.spec.service, { type: 'ClusterIP' });
  assert.deepEqual(broker.spec.persistence, {
    storageClassName: expectedStorageClass(profile),
    storage: '5Gi',
  });
  assert.deepEqual(broker.spec.resources, {
    requests: { cpu: '200m', memory: '1Gi' },
    limits: { cpu: '500m', memory: '1Gi' },
  });
  assert.equal(broker.spec.secretBackend, undefined);
  assert.equal(broker.spec.rabbitmq, undefined);
  assert.equal(broker.spec.override, undefined);
}

for (const profile of /** @type {const} */ (['dev', 'release'])) {
  test(`lintPlatformChart succeeds for rabbitmq ${profile}`, () => {
    lintPlatformChart(
      { service: 'rabbitmq', profile },
      { chartRoot, run: helmRun },
    );
  });

  test(`${profile} namespace render matches native namespace identity and labels`, () => {
    const docs = renderPlatformDocuments(
      { service: 'rabbitmq', profile, section: 'namespace' },
      { chartRoot, run: helmRun },
    );
    assert.equal(docs.length, 1);
    const namespace = docs[0];
    const name = expectedNamespace(profile);
    assert.equal(namespace.kind, 'Namespace');
    assert.equal(namespace.metadata.name, name);
    assert.deepEqual(namespace.metadata.labels, expectedOwnerLabels(profile));
  });

  test(`${profile} broker render matches native broker spec`, () => {
    const docs = renderPlatformDocuments(
      { service: 'rabbitmq', profile, section: 'broker' },
      { chartRoot, run: helmRun },
    );
    assert.equal(docs.length, 1);
    assertBrokerDocument(docs[0], profile);
  });

  test(`${profile} all render emits namespace and broker only`, () => {
    const docs = renderPlatformDocuments(
      { service: 'rabbitmq', profile, section: 'all' },
      { chartRoot, run: helmRun },
    );
    assert.equal(docs.length, 2);
    const byId = docMap(docs);
    const namespace = expectedNamespace(profile);
    assert.ok(byId.get(`Namespace/-/${namespace}`));
    assert.ok(byId.get(`RabbitmqCluster/${namespace}/rabbitmq`));
  });
}

test('assertPlatformRenderRequest allows rabbitmq on dev profile', () => {
  assert.doesNotThrow(() =>
    assertPlatformRenderRequest('rabbitmq', 'dev', 'namespace'),
  );
});

test('unsupported rabbitmq section is refused by renderer guard', () => {
  assert.throws(
    () => assertPlatformRenderRequest('rabbitmq', 'dev', 'cluster'),
    /unsupported section/,
  );
});
