import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CONTEXT_NAME } from './stack-preflight.mjs';
import { assessStackHealth, EXPECTED_IMPORT_ROOTS } from './stack-health.mjs';

function allRequiredDeploymentsReady() {
  return [
    { namespace: 'lab-edge', name: 'game-web', ready: true },
    { namespace: 'lab-edge', name: 'game-api', ready: true },
    { namespace: 'lab-authority', name: 'game-authority', ready: true },
    { namespace: 'lab-workers', name: 'game-control', ready: true },
    { namespace: 'lab-workers', name: 'game-executor', ready: true },
    { namespace: 'lab-workers', name: 'game-relay', ready: true },
  ];
}

/** @param {Partial<import('./stack-health.mjs').StackHealthObservation>} overrides */
function healthyObservation(overrides = {}) {
  return {
    context: CONTEXT_NAME,
    apiServerAddress: '127.0.0.1',
    nodesReady: true,
    memAvailableKib: 8_589_934,
    durations: { coldMs: 120_000, warmMs: 15_000 },
    migration: 'complete',
    deployments: allRequiredDeploymentsReady(),
    pinnedObjectPresent: true,
    importRoots: { ...EXPECTED_IMPORT_ROOTS },
    repeatStart: false,
    ...overrides,
  };
}

test('all healthy => three layers ready and ready true, dataReset false', () => {
  const result = assessStackHealth(healthyObservation());
  assert.equal(result.cluster.ready, true);
  assert.equal(result.service.ready, true);
  assert.equal(result.playable.ready, true);
  assert.equal(result.ready, true);
  assert.equal(result.dataReset, false);
  assert.equal(result.externalPort, false);
  assert.equal(result.memoryKib, 8_589_934);
  assert.equal(result.durations.coldMs, 120_000);
  assert.equal(result.durations.warmMs, 15_000);
  assert.deepEqual(result.cluster.diagnostics, []);
  assert.deepEqual(result.service.diagnostics, []);
  assert.deepEqual(result.playable.diagnostics, []);
});

test('api 0.0.0.0 => externalPort true, ready false', () => {
  const result = assessStackHealth(healthyObservation({ apiServerAddress: '0.0.0.0' }));
  assert.equal(result.externalPort, true);
  assert.equal(result.ready, false);
  assert.equal(result.cluster.ready, false);
  assert.equal(result.service.ready, false);
  assert.equal(result.playable.ready, false);
  assert.ok(result.cluster.diagnostics.some((d) => /refused/i.test(d)));
});

test('dead game-authority while migration complete and pins ok => cluster ready, service false', () => {
  const deployments = allRequiredDeploymentsReady().map((d) =>
    d.name === 'game-authority' ? { ...d, ready: false } : d,
  );
  const result = assessStackHealth(healthyObservation({ deployments }));
  assert.equal(result.cluster.ready, true);
  assert.equal(result.service.ready, false);
  assert.equal(result.playable.ready, false);
  assert.equal(result.ready, false);
  assert.ok(
    result.service.diagnostics.some(
      (d) => d.includes('game-authority') && d.includes('lab-authority'),
    ),
  );
});

test('migration failed => service false, playable false, diagnostic mentions game-migrate', () => {
  const result = assessStackHealth(healthyObservation({ migration: 'failed' }));
  assert.equal(result.service.ready, false);
  assert.equal(result.playable.ready, false);
  assert.equal(result.ready, false);
  assert.ok(result.service.diagnostics.some((d) => d.includes('game-migrate')));
});

test('missing pinned object with otherwise healthy services => service true, playable false', () => {
  const result = assessStackHealth(healthyObservation({ pinnedObjectPresent: false }));
  assert.equal(result.service.ready, true);
  assert.equal(result.playable.ready, false);
  assert.equal(result.ready, false);
  assert.equal(result.dataReset, false);
  assert.ok(result.playable.diagnostics.some((d) => /pinned/i.test(d)));
});

test('wrong world hash => playable false', () => {
  const result = assessStackHealth(
    healthyObservation({
      importRoots: { ...EXPECTED_IMPORT_ROOTS, world: '0'.repeat(64) },
    }),
  );
  assert.equal(result.service.ready, true);
  assert.equal(result.playable.ready, false);
  assert.equal(result.ready, false);
  assert.ok(result.playable.diagnostics.some((d) => /world/i.test(d)));
});

test('repeatStart true on healthy input => dataReset false and ready true', () => {
  const result = assessStackHealth(healthyObservation({ repeatStart: true }));
  assert.equal(result.dataReset, false);
  assert.equal(result.ready, true);
});

test('foreign context => cluster false and ready false', () => {
  const result = assessStackHealth(healthyObservation({ context: 'minikube' }));
  assert.equal(result.cluster.ready, false);
  assert.equal(result.ready, false);
  assert.ok(result.cluster.diagnostics.some((d) => /context/i.test(d)));
});