import assert from 'node:assert/strict';
import test from 'node:test';
import { readKindProfile, renderKindConfig, RELEASE_API_PORT, DEV_API_PORT_RANGE } from './config.mjs';
import { createKindCluster } from './lifecycle.mjs';
import {
  assessReleaseCreateInventory,
  executeReleaseClusterCreate,
} from './cli.mjs';
import {
  CLUSTER_NAME,
  CONTEXT_NAME,
  MIN_MEM_AVAILABLE_KIB,
  readInfraPinFiles,
} from '../../../../scripts/repo-tools/stack-preflight.mjs';
import { executeAuthorizedDevCluster, ensureDevCluster } from './dev-bootstrap.mjs';

const devProfile = readKindProfile('dev');
const releaseProfile = readKindProfile('release');

function healthyReleaseProbes(overrides = {}) {
  const pins = readInfraPinFiles();
  return {
    commandsPresent: { docker: true, kind: true, kubectl: true },
    dockerDaemonOk: true,
    currentContext: null,
    ownedClusterExists: false,
    kindInventoryOk: true,
    memAvailableKib: MIN_MEM_AVAILABLE_KIB,
    apiPort: { occupied: false, ownedByCluster: false },
    kindYamlText: pins.kindYamlText,
    libShText: pins.libShText,
    ...overrides,
  };
}

test('shared create uses exact cluster names for both profiles', () => {
  const devPort = DEV_API_PORT_RANGE.start;
  const calls = [];
  const dev = createKindCluster(
    {
      profile: 'dev',
      port: devPort,
      previousContext: 'kind-offscreen-release',
      config: renderKindConfig(devProfile, devPort),
    },
    {
      run(command, args, options = {}) {
        calls.push({ command, args, input: options.input ?? null });
        return { ok: true };
      },
    },
  );
  assert.equal(dev.ok, true);
  assert.deepEqual(calls[0].args, ['create', 'cluster', '--name', devProfile.clusterName, '--config', '-']);
  assert.match(calls[0].input, new RegExp(`apiServerPort: ${devPort}`));

  calls.length = 0;
  const release = createKindCluster(
    {
      profile: 'release',
      port: RELEASE_API_PORT,
      previousContext: null,
      config: renderKindConfig(releaseProfile, RELEASE_API_PORT),
    },
    {
      run(command, args) {
        calls.push({ command, args });
        return { ok: true };
      },
    },
  );
  assert.equal(release.ok, true);
  assert.deepEqual(calls[0].args, ['create', 'cluster', '--name', releaseProfile.clusterName, '--config', '-']);
});

test('failed create restores the previous context', () => {
  const calls = [];
  const result = createKindCluster(
    {
      profile: 'release',
      port: RELEASE_API_PORT,
      previousContext: 'minikube',
      config: renderKindConfig(releaseProfile, RELEASE_API_PORT),
    },
    {
      run(command, args) {
        calls.push({ command, args });
        if (command === 'kind') return { ok: false, stderr: 'boom' };
        return { ok: true };
      },
    },
  );
  assert.equal(result.ok, false);
  assert.equal(result.refusals[0].id, 'cluster-create-failed');
  assert.deepEqual(calls.at(-1).args, ['config', 'use-context', 'minikube']);
});

test('failed restore is reported without masking a create failure', () => {
  const result = createKindCluster(
    {
      profile: 'release',
      port: RELEASE_API_PORT,
      previousContext: 'minikube',
      config: renderKindConfig(releaseProfile, RELEASE_API_PORT),
    },
    {
      run(command) {
        if (command === 'kind') return { ok: false, stderr: 'boom' };
        return { ok: false, stderr: 'restore broke' };
      },
    },
  );
  assert.equal(result.ok, false);
  assert.equal(result.refusals[0].id, 'cluster-create-failed');
  assert.equal(result.refusals[1].id, 'context-restore-failed');
});

test('foreign or stale release inventory refuses without kind mutations', async () => {
  const calls = [];
  const foreign = await executeReleaseClusterCreate({
    collectProbes: async () => healthyReleaseProbes({ currentContext: 'minikube' }),
    run(command, args) {
      calls.push({ command, args });
      return { ok: true };
    },
  });
  assert.equal(foreign.ok, false);
  assert.equal(foreign.mutated, false);
  assert.ok(foreign.refusals.some((refusal) => refusal.id === 'foreign-context'));
  assert.equal(calls.length, 0);

  const existing = await executeReleaseClusterCreate({
    collectProbes: async () => healthyReleaseProbes({ ownedClusterExists: true, currentContext: CONTEXT_NAME }),
    run(command, args) {
      calls.push({ command, args });
      return { ok: true };
    },
  });
  assert.equal(existing.ok, false);
  assert.equal(existing.mutated, false);
  assert.ok(existing.refusals.some((refusal) => refusal.id === 'release-cluster-exists'));

  const inventory = assessReleaseCreateInventory({ kindInventoryOk: false, ownedClusterExists: false });
  assert.ok(inventory.some((refusal) => refusal.id === 'kind-inventory-failed'));
  assert.equal(calls.length, 0);
});

test('owned dev ensure stays a no-op without kind calls', () => {
  const readyProbe = {
    dockerAvailable: true,
    kindAvailable: true,
    memoryMiB: 4096,
    clusters: [
      { name: CLUSTER_NAME, owner: 'release', uid: 'lab' },
      { name: devProfile.clusterName, owner: 'offscreen-dev', uid: 'dev' },
    ],
    contexts: [
      { name: CONTEXT_NAME, cluster: CLUSTER_NAME, owner: 'release', uid: 'lab' },
      { name: devProfile.contextName, cluster: devProfile.clusterName, owner: 'offscreen-dev', uid: 'dev' },
    ],
    namespaces: [
      {
        cluster: devProfile.clusterName,
        name: 'offscreen-dev-system',
        owner: 'offscreen-dev',
        uid: 'ns',
      },
    ],
    listeningPorts: [RELEASE_API_PORT],
    currentContext: CONTEXT_NAME,
  };
  const plan = ensureDevCluster(readyProbe, { authorize: true });
  assert.deepEqual(plan.actions.map((action) => action.op), ['noop']);
  const calls = [];
  const result = executeAuthorizedDevCluster({
    collect: () => readyProbe,
    run(command, args) {
      calls.push({ command, args });
      return { ok: true };
    },
  });
  assert.equal(result.ok, true);
  assert.equal(result.mutated, false);
  assert.deepEqual(plan.actions, [{ op: 'noop', cluster: devProfile.clusterName }]);
  assert.equal(calls.length, 0);
});