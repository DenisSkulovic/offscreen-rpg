import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readInfraPinFiles, CONTEXT_NAME, MIN_MEM_AVAILABLE_KIB } from './stack-preflight.mjs';
import { EXPECTED_IMPORT_ROOTS } from './stack-health.mjs';
import {
  deploymentsFromListJson,
  migrationFromJobJson,
  nodesReadyFromListJson,
  readLiveStatusObservation,
  reportStackStatus,
  runPlannedCommand,
} from './stack.mjs';

function healthyProbes(overrides = {}) {
  const pins = readInfraPinFiles();
  return {
    commandsPresent: { docker: true, kind: true, kubectl: true },
    dockerDaemonOk: true,
    currentContext: CONTEXT_NAME,
    ownedClusterExists: true,
    memAvailableKib: MIN_MEM_AVAILABLE_KIB,
    apiPort: { occupied: true, ownedByCluster: true },
    kindYamlText: pins.kindYamlText,
    libShText: pins.libShText,
    ...overrides,
  };
}

function healthyObservation(overrides = {}) {
  return {
    context: CONTEXT_NAME,
    apiServerAddress: '127.0.0.1',
    nodesReady: true,
    memAvailableKib: MIN_MEM_AVAILABLE_KIB,
    durations: {},
    migration: 'complete',
    deployments: [
      { namespace: 'lab-edge', name: 'game-web', ready: true },
      { namespace: 'lab-edge', name: 'game-api', ready: true },
      { namespace: 'lab-authority', name: 'game-authority', ready: true },
      { namespace: 'lab-workers', name: 'game-control', ready: true },
      { namespace: 'lab-workers', name: 'game-executor', ready: true },
      { namespace: 'lab-workers', name: 'game-relay', ready: true },
    ],
    pinnedObjectPresent: true,
    importRoots: { ...EXPECTED_IMPORT_ROOTS },
    repeatStart: false,
    ...overrides,
  };
}

test('foreign context does not call the runner', () => {
  let calls = 0;
  const result = runPlannedCommand(
    'up',
    {
      probes: healthyProbes({ currentContext: 'minikube' }),
      observation: { clusterPresent: false, migration: 'absent', importRoots: null },
    },
    () => {
      calls += 1;
      return { status: 0 };
    },
  );
  assert.equal(calls, 0);
  assert.equal(result.ran.length, 0);
  assert.equal(result.exitCode, 1);
});

test('warm up runs only install.sh and stops when it fails', () => {
  /** @type {string[][]} */
  const ran = [];
  const result = runPlannedCommand(
    'up',
    {
      probes: healthyProbes(),
      observation: { clusterPresent: true, migration: 'complete', importRoots: { ...EXPECTED_IMPORT_ROOTS } },
    },
    (argv) => {
      ran.push(argv);
      return { status: 1, stderr: 'migration failed' };
    },
  );
  assert.deepEqual(ran, [['bash', 'infra/kubernetes/lab/app-release/install.sh']]);
  assert.equal(result.ok, false);
  assert.equal(result.messages[0], 'migration failed');
  assert.equal(result.ran.some((argv) => argv.join(' ').includes('volume')), false);
});

test('reset without confirmation does not call down.sh', () => {
  let calls = 0;
  const result = runPlannedCommand(
    'reset',
    {
      probes: healthyProbes(),
      observation: { clusterPresent: true, migration: 'complete', importRoots: null },
    },
    () => {
      calls += 1;
      return { status: 0 };
    },
  );
  assert.equal(calls, 0);
  assert.match(result.messages[0], /kind-offscreen-lab/);
});

test('unchecked fixture does not claim the pinned object is missing', () => {
  const report = reportStackStatus(healthyObservation({ pinnedObjectPresent: false, importRoots: null }), {
    fixtureChecked: false,
  });
  assert.equal(report.service.ready, true);
  assert.equal(report.ready, false);
  assert.equal(report.dataReset, false);
  assert.equal(report.playable.diagnostics.some((line) => line.includes('Pinned fixture object is missing')), false);
  assert.match(report.playable.diagnostics[0], /not read/);
});

test('kubectl snapshots parse migration, nodes, and deployments', () => {
  assert.equal(migrationFromJobJson(JSON.stringify({ status: { succeeded: 1 } })), 'complete');
  assert.equal(migrationFromJobJson(JSON.stringify({ status: { failed: 1 } })), 'failed');
  assert.equal(nodesReadyFromListJson(JSON.stringify({ items: [] })), false);
  assert.equal(
    nodesReadyFromListJson(
      JSON.stringify({ items: [{ status: { conditions: [{ type: 'Ready', status: 'True' }] } }] }),
    ),
    true,
  );
  const deployments = deploymentsFromListJson(
    'lab-edge',
    JSON.stringify({ items: [{ metadata: { name: 'game-api' }, status: { replicas: 1, readyReplicas: 0 } }] }),
  );
  assert.equal(deployments[0].ready, false);
});

test('live status reader issues only get commands', () => {
  /** @type {string[][]} */
  const argvLog = [];
  const observation = readLiveStatusObservation((argv) => {
    argvLog.push(argv);
    if (argv.includes('nodes')) {
      return {
        status: 0,
        stdout: JSON.stringify({ items: [{ status: { conditions: [{ type: 'Ready', status: 'True' }] } }] }),
      };
    }
    if (argv.includes('job')) {
      return { status: 0, stdout: JSON.stringify({ metadata: { name: 'game-migrate' }, status: { succeeded: 1 } }) };
    }
    return { status: 0, stdout: JSON.stringify({ items: [] }) };
  });
  assert.equal(observation.nodesReady, true);
  assert.equal(observation.migration, 'complete');
  assert.equal(
    argvLog.every((argv) => argv[0] === 'kubectl' && argv.includes('get') && !argv.includes('delete')),
    true,
  );
});
