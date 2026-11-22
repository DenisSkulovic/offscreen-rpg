import assert from 'node:assert/strict';
import test from 'node:test';
import { assertSlotOwnership, deriveSlotCookiePrefix, renderDevSlotAppGraph } from './dev-slot-app-graph.mjs';

const ports = { game: 3100 };

function graph(slot, extra = {}) {
  return renderDevSlotAppGraph(slot, { schemaReady: true, ports, ...extra });
}

test('dev-1 and dev-2 graphs stay in their own namespaces with distinct images', () => {
  const left = graph('dev-1');
  const right = graph('dev-2');
  assert.equal(left.namespace, 'offscreen-dev-1');
  assert.equal(right.namespace, 'offscreen-dev-2');
  assert.equal(left.images.api, 'offscreen-dev-workspace:dev-1-api');
  assert.notEqual(left.images.api, right.images.api);
  assert.match(JSON.stringify(left.documents), /access-key-id/);
  assert.equal(left.cookiePrefix, 'dev-1');
  assert.equal(deriveSlotCookiePrefix('dev-10'), 'dev-10');
  const leftText = JSON.stringify(left.documents);
  assert.equal(leftText.includes('offscreen-dev-2'), false);
  assert.equal(leftText.includes('lab-edge'), false);
  assert.match(leftText, /game-api\.offscreen-dev-1\.svc\.cluster\.local:3001/);
  assert.match(leftText, /TEMPORAL_NAMESPACE/);
  assert.equal(leftText.includes('"value":"default"'), false);
  assert.equal(leftText.includes('dev-1-mig-auth'), false);
  assert.match(leftText, /DB_POOL_MAX/);
  for (const name of ['game-api', 'game-authority', 'game-relay']) {
    const deployment = left.documents.find((item) => item.kind === 'Deployment' && item.metadata.name === name);
    const selected = deployment.spec.template.spec.containers[0].env.find((item) => item.name === 'OFFSCREEN_DOCUMENT_STORE');
    const bucket = deployment.spec.template.spec.containers[0].env.find((item) => item.name === 'OFFSCREEN_DOCUMENT_S3_BUCKET');
    const key = deployment.spec.template.spec.containers[0].env.find((item) => item.name === 'OFFSCREEN_DOCUMENT_S3_ACCESS_KEY_ID');
    const mode = deployment.spec.template.spec.containers[0].env.find((item) => item.name === 'GAME_AUTHORITY_MODE');
    assert.equal(selected.value, 's3');
    assert.equal(bucket.value, 'offscreen-dev-1');
    assert.equal(key.valueFrom.secretKeyRef.name, 'dev-1-s3');
    if (name === 'game-api') assert.equal(mode.value, 'distributed');
    if (name === 'game-authority') {
      const host = deployment.spec.template.spec.containers[0].env.find((item) => item.name === 'GAME_AUTHORITY_HOST');
      assert.equal(host.value, '0.0.0.0');
    }
  }
  const rightText = JSON.stringify(right.documents);
  assert.match(rightText, /offscreen-dev-2/);
  assert.equal(rightText.includes('offscreen-dev-1'), false);
  assert.equal(rightText.includes('dev-1-s3'), false);
});

test('dev-5 and dev-10 keep distinct ports, services and secret names', () => {
  const five = graph('dev-5', { ports: { game: 3500 } });
  const ten = graph('dev-10', { ports: { game: 3600 } });
  assert.equal(five.dbSecret, 'dev-5-run-auth');
  assert.equal(ten.s3Secret, 'dev-10-s3');
  assert.notEqual(five.appSecret, ten.appSecret);
  const fiveApi = five.documents.find((item) => item.kind === 'Deployment' && item.metadata.name === 'game-api');
  const tenApi = ten.documents.find((item) => item.kind === 'Deployment' && item.metadata.name === 'game-api');
  assert.equal(fiveApi.spec.template.spec.containers[0].env.find((item) => item.name === 'APP_ORIGIN').value, 'http://127.0.0.1:3500');
  assert.notEqual(
    fiveApi.spec.template.spec.containers[0].env.find((item) => item.name === 'APP_ORIGIN').value,
    tenApi.spec.template.spec.containers[0].env.find((item) => item.name === 'APP_ORIGIN').value,
  );
});

test('closed schema gate and foreign ownership are refused', () => {
  assert.throws(() => renderDevSlotAppGraph('dev-1', { schemaReady: false, ports }), /schema gate/);
  assert.throws(() => renderDevSlotAppGraph('slot-a', { schemaReady: true, ports }), /dev-<positive integer>/);
  const record = { slotId: 'dev-1', namespace: 'offscreen-dev-1', cluster: 'kind-offscreen-dev', resourceUids: { 'dev-1-s3': 'uid-1' } };
  assert.throws(() => assertSlotOwnership(record, {
    context: 'kind-offscreen-lab', namespace: 'offscreen-dev-1', schemaReady: true, cookiePrefix: 'dev-1',
  }), /context/);
  assert.throws(() => assertSlotOwnership(record, {
    context: 'kind-offscreen-dev', namespace: 'offscreen-dev-2', schemaReady: true, cookiePrefix: 'dev-1',
  }), /foreign-namespace/);
  assert.throws(() => assertSlotOwnership(record, {
    context: 'kind-offscreen-dev', namespace: 'offscreen-dev-1', schemaReady: true, cookiePrefix: 'dev-1',
    secretUids: { 'dev-1-s3': 'other' },
  }), /secret-uid/);
  assert.throws(() => assertSlotOwnership(record, {
    context: 'kind-offscreen-dev', namespace: 'offscreen-dev-1', schemaReady: true, cookiePrefix: 'dev-2',
  }), /cookie-prefix/);
  assert.throws(() => assertSlotOwnership(record, {
    context: 'kind-offscreen-dev', namespace: 'offscreen-dev-1', schemaReady: false, cookiePrefix: 'dev-1',
  }), /stale-schema/);
  assert.throws(() => assertSlotOwnership(record, {
    context: 'kind-offscreen-dev', namespace: 'offscreen-dev-1', schemaReady: true, cookiePrefix: 'dev-1',
    secrets: ['dev-1-mig-auth'],
  }), /admin-leak/);
  assert.throws(() => assertSlotOwnership({ ...record, namespace: 'lab-edge' }, {
    context: 'kind-offscreen-dev', namespace: 'offscreen-dev-1', schemaReady: true, cookiePrefix: 'dev-1',
  }), /owner-binding/);
});
