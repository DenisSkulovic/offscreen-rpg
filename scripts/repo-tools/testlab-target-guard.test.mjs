import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  verifyTestlabTarget,
  LAB_OWNED_APP_IDENTITY,
  TESTLAB_TARGET_REFUSAL_CODES,
  WRITER_EXECUTION_MODE_SCRIPTED_OFFLINE_LAB,
  OFFSCREEN_WRITER_EXECUTION_MODE_ENV,
  OFFSCREEN_WRITER_PROVIDER_MODEL_ENV,
  OFFSCREEN_WRITER_PROVIDER_POLICY_VERSION_ENV,
  OPENROUTER_API_KEY_ENV,
  WRITER_EXECUTION_MODE_PROVIDER_AUTHORIZED,
} from './testlab-target-guard.mjs';

const CLUSTER_UID = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
const DB_UID = 'dbbbbbbb-bbbb-cccc-dddd-eeeeeeeeeeee';

const SCRIPTED_ENV = Object.freeze({
  [OFFSCREEN_WRITER_EXECUTION_MODE_ENV]:
    WRITER_EXECUTION_MODE_SCRIPTED_OFFLINE_LAB,
});

function validDisposable(overrides = {}) {
  return {
    target: 'disposable',
    runtimeMode: 'test-container',
    localEnv: { ...SCRIPTED_ENV },
    ...overrides,
  };
}

function validKind(overrides = {}) {
  const id = LAB_OWNED_APP_IDENTITY;
  return {
    target: 'kind-offscreen-lab',
    operatorGrantAuthorized: true,
    cluster: {
      contextName: id.contextName,
      clusterName: id.clusterName,
      uid: CLUSTER_UID,
    },
    expectedClusterUid: CLUSTER_UID,
    dbInstance: {
      namespace: id.postgresNamespace,
      name: id.postgresClusterName,
      kind: id.postgresClusterKind,
      uid: DB_UID,
    },
    expectedDbInstanceUid: DB_UID,
    gameAuthority: {
      namespace: id.authorityNamespace,
      deploymentName: id.gameAuthorityDeployment,
      image: 'offscreen-lab-dev-workspace:dxk08-authority',
      env: { ...SCRIPTED_ENV },
    },
    gameExecutor: {
      namespace: id.workersNamespace,
      deploymentName: id.gameExecutorDeployment,
      image: 'offscreen-lab-dev-workspace:dxk08-worker',
      env: { ...SCRIPTED_ENV },
    },
    ...overrides,
  };
}

test('positive: disposable scripted test-container passes', () => {
  const result = verifyTestlabTarget(validDisposable());
  assert.equal(result.ok, true);
  assert.equal(result.target, 'disposable');
});

test('positive: kind-offscreen-lab with exact cluster and db UIDs passes', () => {
  const result = verifyTestlabTarget(validKind());
  assert.equal(result.ok, true);
  assert.equal(result.target, 'kind-offscreen-lab');
});

test('negative: db connection handle is refused before acceptance', () => {
  const result = verifyTestlabTarget(
    validKind({
      dbConnection: { query: () => {} },
    }),
  );
  assert.equal(result.ok, false);
  assert.ok(
    result.refusals.some(
      (r) => r.id === TESTLAB_TARGET_REFUSAL_CODES.DB_CONNECTION_FORBIDDEN,
    ),
  );
});

test('negative: provider-authorized mode on game-authority is refused', () => {
  const result = verifyTestlabTarget(
    validKind({
      gameAuthority: {
        ...validKind().gameAuthority,
        env: {
          [OFFSCREEN_WRITER_EXECUTION_MODE_ENV]:
            WRITER_EXECUTION_MODE_PROVIDER_AUTHORIZED,
          [OFFSCREEN_WRITER_PROVIDER_MODEL_ENV]: 'gpt-test',
          [OFFSCREEN_WRITER_PROVIDER_POLICY_VERSION_ENV]: 'v1',
        },
      },
    }),
  );
  assert.equal(result.ok, false);
  assert.ok(
    result.refusals.some(
      (r) => r.id === TESTLAB_TARGET_REFUSAL_CODES.PROVIDER_AUTHORIZED_MODE,
    ),
  );
});

test('negative: mixed provider pin on executor is refused', () => {
  const result = verifyTestlabTarget(
    validKind({
      gameExecutor: {
        ...validKind().gameExecutor,
        env: {
          ...SCRIPTED_ENV,
          [OFFSCREEN_WRITER_PROVIDER_MODEL_ENV]: 'only-model',
        },
      },
    }),
  );
  assert.equal(result.ok, false);
  assert.ok(
    result.refusals.some(
      (r) => r.id === TESTLAB_TARGET_REFUSAL_CODES.PROVIDER_PIN_PRESENT,
    ),
  );
  assert.ok(
    result.refusals.some(
      (r) => r.id === TESTLAB_TARGET_REFUSAL_CODES.MIXED_PROVIDER_PIN,
    ),
  );
});

test('negative: openrouter key presence on disposable is refused', () => {
  const result = verifyTestlabTarget(
    validDisposable({
      localEnv: {
        ...SCRIPTED_ENV,
        [OPENROUTER_API_KEY_ENV]: 'secret-not-printed',
      },
    }),
  );
  assert.equal(result.ok, false);
  const refusal = result.refusals.find(
    (r) => r.id === TESTLAB_TARGET_REFUSAL_CODES.OPENROUTER_KEY_PRESENT,
  );
  assert.ok(refusal);
  assert.equal(refusal.message.includes('secret-not-printed'), false);
});

test('negative: wrong cluster context is refused', () => {
  const result = verifyTestlabTarget(
    validKind({
      cluster: {
        ...validKind().cluster,
        contextName: 'minikube',
      },
    }),
  );
  assert.equal(result.ok, false);
  assert.ok(
    result.refusals.some(
      (r) => r.id === TESTLAB_TARGET_REFUSAL_CODES.WRONG_CLUSTER_CONTEXT,
    ),
  );
});

test('negative: cluster UID mismatch is refused', () => {
  const result = verifyTestlabTarget(
    validKind({
      expectedClusterUid: 'other-uid',
    }),
  );
  assert.equal(result.ok, false);
  assert.ok(
    result.refusals.some(
      (r) => r.id === TESTLAB_TARGET_REFUSAL_CODES.WRONG_CLUSTER_UID,
    ),
  );
});

test('negative: DATABASE_URL without dbInstance is ambiguous', () => {
  const result = verifyTestlabTarget(
    validKind({
      databaseUrl: 'postgresql://offscreen:local@localhost:5432/lab',
      dbInstance: null,
    }),
  );
  assert.equal(result.ok, false);
  assert.ok(
    result.refusals.some(
      (r) => r.id === TESTLAB_TARGET_REFUSAL_CODES.AMBIGUOUS_DB,
    ),
  );
});

test('read intent accepts a complete kind observation without the operator grant flag', () => {
  const result = verifyTestlabTarget(
    validKind({ operatorGrantAuthorized: false, expectedClusterUid: undefined, expectedDbInstanceUid: undefined }),
    { intent: 'read' },
  );
  assert.equal(result.ok, true);
});

test('negative: envFrom on a kind workload is refused', () => {
  const result = verifyTestlabTarget(
    validKind({
      gameExecutor: { ...validKind().gameExecutor, envFrom: true },
    }),
  );
  assert.equal(result.ok, false);
  assert.ok(result.refusals.some((r) => r.id === TESTLAB_TARGET_REFUSAL_CODES.ENV_FROM_AMBIGUOUS));
});

test('negative: missing operator grant on kind target is refused', () => {
  const result = verifyTestlabTarget(
    validKind({
      operatorGrantAuthorized: false,
    }),
  );
  assert.equal(result.ok, false);
  assert.ok(
    result.refusals.some(
      (r) => r.id === TESTLAB_TARGET_REFUSAL_CODES.OPERATOR_GRANT_REQUIRED,
    ),
  );
});
