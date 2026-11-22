import { test } from 'node:test';
import assert from 'node:assert/strict';
import { runBareKindFunding } from './testlab-kind-cli.mjs';
import { LAB_OWNED_APP_IDENTITY } from './testlab-target-guard.mjs';

const id = LAB_OWNED_APP_IDENTITY;

function observation(overrides = {}) {
  return {
    ok: true,
    observation: {
      target: 'kind-offscreen-lab',
      cluster: { contextName: id.contextName, clusterName: id.clusterName, uid: 'cluster-uid' },
      dbInstance: {
        namespace: id.postgresNamespace,
        name: id.postgresClusterName,
        kind: id.postgresClusterKind,
        uid: 'db-uid',
      },
      primaryPod: 'lab-pg-1',
      gameAuthority: {
        namespace: id.authorityNamespace,
        deploymentName: id.gameAuthorityDeployment,
        image: 'ga:scripted',
        podImage: 'ga:scripted',
        ready: true,
        env: { OFFSCREEN_WRITER_EXECUTION_MODE: 'scripted-offline-lab' },
      },
      gameExecutor: {
        namespace: id.workersNamespace,
        deploymentName: id.gameExecutorDeployment,
        image: 'ex:scripted',
        podImage: 'ex:scripted',
        ready: true,
        env: { OFFSCREEN_WRITER_EXECUTION_MODE: 'scripted-offline-lab' },
      },
      ...overrides,
    },
  };
}

test('status returns missing-active-grant without a write flag', async () => {
  let opened = 0;
  let closed = 0;
  const receipt = await runBareKindFunding(
    'status',
    { target: 'kind-offscreen-lab', owner: 'owner-1', suite: 'turn03' },
    {
      observe: async () => observation(),
      openDatabase: async () => {
        opened += 1;
        return {
          ok: true,
          queryReadOnly: async () => ({ rows: [] }),
          grantStore: { withTransaction: async () => { throw new Error('status must not write'); } },
          close: async () => { closed += 1; },
        };
      },
    },
  );
  assert.equal(receipt.refusals[0].id, 'missing-active-grant');
  assert.equal(opened, 1);
  assert.equal(closed, 1);
});

test('ensure without pins does not open the database', async () => {
  let opened = 0;
  const receipt = await runBareKindFunding(
    'ensure',
    { target: 'kind-offscreen-lab', owner: 'owner-1', suite: 'turn03', approval: 'testlab:suite:turn03', operatorGrantAuthorized: true },
    {
      observe: async () => observation(),
      openDatabase: async () => { opened += 1; return { ok: false, id: 'should-not-open', message: 'no' }; },
    },
  );
  assert.equal(receipt.outcome, 'blocked');
  assert.equal(opened, 0);
});

test('ensure blocks when the target drifts before mutation', async () => {
  let calls = 0;
  let writes = 0;
  const receipt = await runBareKindFunding(
    'ensure',
    {
      target: 'kind-offscreen-lab',
      owner: 'owner-1',
      suite: 'turn03',
      approval: 'testlab:suite:turn03',
      operator: 'testlab:human',
      operatorGrantAuthorized: true,
      expectClusterUid: 'cluster-uid',
      expectDbUid: 'db-uid',
    },
    {
      observe: async () => {
        calls += 1;
        return observation(calls > 1 ? { cluster: { contextName: id.contextName, clusterName: id.clusterName, uid: 'other' } } : {});
      },
      openDatabase: async () => ({
        ok: true,
        grantStore: { async withTransaction() { writes += 1; } },
        close: async () => {},
      }),
    },
  );
  assert.equal(receipt.refusals[0].id, 'target-drift');
  assert.equal(writes, 0);
});
