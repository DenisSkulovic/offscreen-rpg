import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  runStackPreflight,
  withStackPreflightGuard,
  verifyInfraPins,
  readInfraPinFiles,
  resourceProfileFromPins,
  CONTEXT_NAME,
  MIN_MEM_AVAILABLE_KIB,
  API_SERVER_ADDRESS,
  API_SERVER_PORT,
  NODE_IMAGE,
  NODE_COUNT,
} from './stack-preflight.mjs';

function healthyProbes(overrides = {}) {
  const pins = readInfraPinFiles();
  return {
    commandsPresent: { docker: true, kind: true, kubectl: true },
    dockerDaemonOk: true,
    currentContext: CONTEXT_NAME,
    ownedClusterExists: false,
    memAvailableKib: MIN_MEM_AVAILABLE_KIB,
    apiPort: { occupied: false, ownedByCluster: false },
    kindYamlText: pins.kindYamlText,
    libShText: pins.libShText,
    ...overrides,
  };
}

test('healthy injected probes pass and mutate runs once', () => {
  let calls = 0;
  const probes = healthyProbes({ currentContext: null });
  const guarded = withStackPreflightGuard(() => {
    calls += 1;
  }, probes);
  assert.equal(calls, 1);
  assert.equal(guarded.ok, true);
  assert.equal(guarded.mutated, true);
  assert.deepEqual(guarded.refusals, []);
  assert.deepEqual(guarded.profile, resourceProfileFromPins());
  const direct = runStackPreflight(probes);
  assert.equal(direct.ok, true);
});

test('wrong current context refuses and skips mutate', () => {
  let calls = 0;
  const result = withStackPreflightGuard(() => {
    calls += 1;
  }, healthyProbes({ currentContext: 'minikube' }));
  assert.equal(calls, 0);
  assert.equal(result.ok, false);
  assert.equal(result.mutated, false);
  assert.ok(result.refusals.some((r) => r.id === 'foreign-context'));
});

test('occupied api port from non-owned listener refuses', () => {
  let calls = 0;
  const result = withStackPreflightGuard(() => {
    calls += 1;
  }, healthyProbes({ apiPort: { occupied: true, ownedByCluster: false } }));
  assert.equal(calls, 0);
  assert.equal(result.ok, false);
  assert.ok(result.refusals.some((r) => r.id === 'api-port-conflict'));
});

test('low memory refuses before mutate', () => {
  let calls = 0;
  const result = withStackPreflightGuard(() => {
    calls += 1;
  }, healthyProbes({ memAvailableKib: MIN_MEM_AVAILABLE_KIB - 1, currentContext: null }));
  assert.equal(calls, 0);
  assert.ok(result.refusals.some((r) => r.id === 'memory-low'));
});

test('docker daemon failure refuses before mutate', () => {
  let calls = 0;
  const result = withStackPreflightGuard(() => {
    calls += 1;
  }, healthyProbes({ dockerDaemonOk: false, currentContext: null }));
  assert.equal(calls, 0);
  assert.ok(result.refusals.some((r) => r.id === 'docker-daemon'));
});

test('existing owned cluster requires owned context', () => {
  let calls = 0;
  const result = withStackPreflightGuard(() => {
    calls += 1;
  }, healthyProbes({ ownedClusterExists: true, currentContext: null }));
  assert.equal(calls, 0);
  assert.ok(result.refusals.some((r) => r.id === 'context-required'));
});

test('static pins in kind.yaml and lib.sh match lab constants', () => {
  const { kindYamlText, libShText } = readInfraPinFiles();
  assert.deepEqual(verifyInfraPins(kindYamlText, libShText), []);
  const profile = resourceProfileFromPins();
  assert.equal(profile.apiServerAddress, API_SERVER_ADDRESS);
  assert.equal(profile.apiServerPort, API_SERVER_PORT);
  assert.equal(profile.nodeCount, NODE_COUNT);
  assert.equal(profile.nodeImage, NODE_IMAGE);
});

test('verifyInfraPins rejects invalid release topology against canonical profile', () => {
  const { libShText } = readInfraPinFiles();
  const badPort = readInfraPinFiles().kindYamlText.replace(`apiServerPort: ${API_SERVER_PORT}`, 'apiServerPort: 6444');
  assert.ok(verifyInfraPins(badPort, libShText).some((refusal) => refusal.id === 'pin-drift-kind-port'));

  const badAddress = readInfraPinFiles().kindYamlText.replace(API_SERVER_ADDRESS, '127.0.0.2');
  assert.ok(verifyInfraPins(badAddress, libShText).some((refusal) => refusal.id === 'pin-drift-kind-topology'));

  const badRole = readInfraPinFiles().kindYamlText.replace('role: worker', 'role: extra-control-plane');
  assert.ok(verifyInfraPins(badRole, libShText).some((refusal) => refusal.id === 'pin-drift-kind-role'));
});