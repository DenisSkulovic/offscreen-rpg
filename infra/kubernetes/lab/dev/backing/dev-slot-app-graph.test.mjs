import assert from 'node:assert/strict';
import test from 'node:test';
import { spawnSync } from 'node:child_process';
import { assertSlotOwnership, deriveSlotCookiePrefix, DEV_POD_RUNTIME_RECEIPT_DIR, renderDevSlotAppGraph, renderTiltDeploymentDocuments, renderTiltDeploymentYaml } from './dev-slot-app-graph.mjs';

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
    if (name === 'game-api') {
      assert.equal(mode.value, 'distributed');
      const host = deployment.spec.template.spec.containers[0].env.find((item) => item.name === 'API_HOST');
      assert.equal(host.value, '0.0.0.0');
      const command = deployment.spec.template.spec.containers[0].command.join(' ');
      assert.match(command, /dev-pod-compile-watch.mjs api dist\/src\/main.js/);
      const watched = deployment.spec.template.spec.containers[0].env.find((item) => item.name === 'OFFSCREEN_DEV_WATCHED_COMPILATION');
      assert.equal(watched.value, '1');
    }
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

test('tilt deployments are declarative and match startup before image substitution', () => {
  const env = { OFFSCREEN_DEV_SLOT: 'dev-5', OFFSCREEN_DEV_NAMESPACE: 'offscreen-dev-5', OFFSCREEN_DEV_GAME_PORT: '13116' };
  const tilt = renderTiltDeploymentDocuments(env);
  const startup = renderDevSlotAppGraph('dev-5', { schemaReady: true, ports: { game: 13116 } }).documents
    .filter((item) => item.kind === 'Deployment');
  assert.deepEqual(tilt, startup);
  assert.equal(tilt.length, 6);
  const yaml = renderTiltDeploymentYaml(env);
  for (const field of ['resourceVersion', 'uid:', 'managedFields', 'status:', 'deployment.kubernetes.io/revision']) {
    assert.equal(yaml.includes(field), false, field);
  }
  for (const document of tilt) {
    assert.equal(document.metadata.namespace, 'offscreen-dev-5');
    assert.equal(document.spec.template.spec.automountServiceAccountToken, false);
    assert.match(document.spec.template.spec.containers[0].image, /^offscreen-dev-workspace:dev-5-/);
  }
  const api = tilt.find((item) => item.metadata.name === 'game-api');
  const watched = api.spec.template.spec.containers[0].env.find((item) => item.name === 'OFFSCREEN_DEV_WATCHED_COMPILATION');
  assert.equal(watched.value, '1');
  assert.deepEqual(api.spec.template.spec.containers[0].command, ['node', 'dev-pod-compile-watch.mjs', 'api', 'dist/src/main.js']);
  const other = renderTiltDeploymentDocuments({ ...env, OFFSCREEN_DEV_SLOT: 'dev-6', OFFSCREEN_DEV_NAMESPACE: 'offscreen-dev-6' });
  assert.equal(other.some((item) => item.metadata.namespace !== 'offscreen-dev-6'), false);
  assert.throws(() => renderTiltDeploymentDocuments({ ...env, OFFSCREEN_DEV_NAMESPACE: 'offscreen-dev-6' }), /offscreen-dev-6 is not offscreen-dev-5/);
  assert.throws(() => renderTiltDeploymentDocuments({ OFFSCREEN_DEV_NAMESPACE: 'offscreen-dev-5', OFFSCREEN_DEV_GAME_PORT: '13116' }), /slot/);
  assert.throws(() => renderTiltDeploymentDocuments({ ...env, OFFSCREEN_DEV_GAME_PORT: '' }), /OFFSCREEN_DEV_GAME_PORT is required/);
});

test('tilt deployment route does not invoke kubectl', () => {
  const result = spawnSync(process.execPath, ['infra/kubernetes/lab/dev/backing/dev-slot-app-graph.mjs', '--tilt-deployments'], {
    cwd: new URL('../../../../../', import.meta.url),
    env: { ...process.env, OFFSCREEN_DEV_SLOT: 'dev-5', OFFSCREEN_DEV_NAMESPACE: 'offscreen-dev-5', OFFSCREEN_DEV_GAME_PORT: '13116' },
    encoding: 'utf8',
  });
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /^---\napiVersion: "apps\/v1"/);
  assert.equal(result.stdout.includes('resourceVersion'), false);
  assert.equal(result.stdout.includes('kind: Namespace'), false);
  assert.equal(result.stdout.includes('kind: Secret'), false);
  assert.match(result.stdout, /\/tmp\/offscreen-dev-runtime/);
  assert.equal(result.stdout.includes('/app/.offscreen-dev-runtime'), false);
});

test('every workload writes receipts under the pod tmp root', () => {
  const documents = graph('dev-5').documents.filter((item) => item.kind === 'Deployment');
  assert.equal(documents.length, 6);
  for (const item of documents) {
    const selected = item.spec.template.spec.containers[0].env.find((entry) => entry.name === 'OFFSCREEN_DEV_RUNTIME_RECEIPT_DIR');
    assert.equal(selected.value, DEV_POD_RUNTIME_RECEIPT_DIR);
  }
});
