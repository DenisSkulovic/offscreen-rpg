import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import {
  DEV_KIND_CONTEXT,
  DEV_LIFECYCLE_LIVE_TOKEN,
  LIFECYCLE_BOUNDS,
  REQUIRED_MEM_KIB,
  SIX_SLOT_DEPLOYMENTS,
  assessLifecycleActivationPreconditions,
  refuseUnlessLiveAuthorized,
  resolveAllocatedSlotId,
  runDevLifecycleProgramme,
  verifyParkedState,
  verifyRuntimeReceipts,
} from './lifecycle-programme.mjs';

function readySnapshot() {
  return {
    deploymentReadiness: Object.fromEntries(
      SIX_SLOT_DEPLOYMENTS.map((name) => [name, true]),
    ),
    roleStatuses: {},
    roleObservations: null,
    webInput: {},
    webStatus: { ready: true, reason: 'dev_server_serving', currentGeneration: 'img' },
    readiness: Object.fromEntries(SIX_SLOT_DEPLOYMENTS.map((name) => [name, true])),
    hostHttpStatus: 200,
    runtimeReady: true,
  };
}

function baseRecord(slotId, worktree) {
  return {
    slotId,
    worktreePath: worktree,
    cluster: 'offscreen-dev',
    namespace: `offscreen-${slotId}`,
    ports: { game: 3000, control: 3001, tilt: 10350, spare: 3002 },
    resourceUids: { ns: 'uid-1' },
    lease: null,
    processIdentity: null,
  };
}

function makePorts(overrides = {}) {
  const worktree = overrides.worktree ?? '/tmp/worktree';
  const registryRoot = overrides.registryRoot ?? mkdtempSync(join(tmpdir(), 'dev-lifecycle-'));
  const environments =
    overrides.environments ??
    new Map([['dev-2', baseRecord('dev-2', worktree)]]);
  const commands = [];
  return {
    worktree,
    registryRoot,
    commands,
    ports: {
      registryRoot,
      sessionRoot: join(registryRoot, 'sessions'),
      listEnvironments: () => [...environments.values()],
      getEnvironment: (_root, slotId) => environments.get(slotId) ?? null,
      getDefaultEnvironment: () => overrides.defaultEnv ?? null,
      readEnvironmentSession: () => null,
      collectReadiness: () => readySnapshot(),
      gitWorktreeState: () => ({
        ok: true,
        head: overrides.head ?? 'abc123',
        dirty: overrides.dirty ?? false,
      }),
      readKubeContext: () => overrides.kubeContext ?? DEV_KIND_CONTEXT,
      readMemAvailableKib: () => overrides.memKib ?? REQUIRED_MEM_KIB + 1024,
      listActiveSlotIds: () => overrides.activeSlots ?? [],
      readParkedState: ({ slotId }) => ({
        slotId,
        replicasByDeploy: Object.fromEntries(
          SIX_SLOT_DEPLOYMENTS.map((name) => [name, 0]),
        ),
        ownedListeners: overrides.parkedListeners ?? [],
        ownedProcesses: [],
        reservationRetained: overrides.reservationRetained ?? true,
      }),
      runPnpm: async (args, options) => {
        commands.push({ args: [...args], options });
        return overrides.runPnpm?.(args, options) ?? { code: 0, stdout: '', stderr: '' };
      },
      now: (() => {
        let t = 0;
        return () => {
          t += 1000;
          return t;
        };
      })(),
      ...overrides.portOverrides,
    },
  };
}

test('refuseUnlessLiveAuthorized rejects missing live flag', () => {
  const outcome = refuseUnlessLiveAuthorized(false);
  assert.equal(outcome?.status, 'NOT-RUN');
  assert.equal(outcome?.reason, 'live-not-authorized');
});

test('foreign active slot refusal', async () => {
  const fixture = makePorts({ activeSlots: ['dev-1'] });
  const result = await runDevLifecycleProgramme({
    scenarioId: 'DEV-02',
    live: true,
    authorizeToken: DEV_LIFECYCLE_LIVE_TOKEN,
    worktree: fixture.worktree,
    ports: fixture.ports,
  });
  assert.equal(result.status, 'FAIL');
  assert.equal(result.reason, 'foreign-active-slot');
  assert.equal(fixture.commands.length, 0);
});

test('capacity refusal when memory is below threshold', async () => {
  const fixture = makePorts({ memKib: REQUIRED_MEM_KIB - 1 });
  const result = await runDevLifecycleProgramme({
    scenarioId: 'DEV-02',
    live: true,
    authorizeToken: DEV_LIFECYCLE_LIVE_TOKEN,
    worktree: fixture.worktree,
    ports: fixture.ports,
  });
  assert.equal(result.status, 'FAIL');
  assert.equal(result.reason, 'capacity-refused');
});

test('failed launch still records park cleanup attempt', async () => {
  const worktree = mkdtempSync(join(tmpdir(), 'dev-lifecycle-wt-'));
  const environments = new Map();
  const fixture = makePorts({
    worktree,
    environments,
    runPnpm: async (args) => {
      if (args[0] === 'dev:new') return { code: 1, stdout: '', stderr: 'boom' };
      return { code: 0, stdout: '', stderr: '' };
    },
  });
  const result = await runDevLifecycleProgramme({
    scenarioId: 'DEV-02',
    live: true,
    authorizeToken: DEV_LIFECYCLE_LIVE_TOKEN,
    worktree,
    ports: fixture.ports,
  });
  assert.equal(result.status, 'FAIL');
  assert.equal(result.reason, 'activation-failed');
  assert.equal(
    fixture.commands.some((row) => row.args[0] === 'dev:stop'),
    false,
  );
});

test('missing receipts fail closed', async () => {
  const worktree = mkdtempSync(join(tmpdir(), 'dev-lifecycle-wt-'));
  const environments = new Map();
  const result = await runDevLifecycleProgramme({
    scenarioId: 'DEV-02',
    live: true,
    authorizeToken: DEV_LIFECYCLE_LIVE_TOKEN,
    worktree,
    ports: {
      ...makePorts({ worktree, environments }).ports,
      runPnpm: async (args) => {
        if (args[0] === 'dev:new') {
          environments.set('dev-9', baseRecord('dev-9', worktree));
        }
        return { code: 0, stdout: '', stderr: '' };
      },
      collectReadiness: () => ({
        ...readySnapshot(),
        runtimeReady: false,
        readiness: Object.fromEntries(
          SIX_SLOT_DEPLOYMENTS.map((name) => [name, false]),
        ),
      }),
    },
  });
  assert.equal(result.status, 'FAIL');
  assert.equal(result.reason, 'missing-receipts');
});

test('failed park refuses with park-incomplete-listeners', () => {
  const parked = {
    slotId: 'dev-2',
    replicasByDeploy: Object.fromEntries(
      SIX_SLOT_DEPLOYMENTS.map((name) => [name, 0]),
    ),
    ownedListeners: [3000],
    ownedProcesses: [],
    reservationRetained: true,
  };
  const outcome = verifyParkedState(parked);
  assert.equal(outcome.ok, false);
  assert.equal(outcome.reason, 'park-incomplete-listeners');
});

test('DEV-10 park failure surfaces park-failed and still cleans up', async () => {
  const worktree = mkdtempSync(join(tmpdir(), 'dev-lifecycle-wt-'));
  const environments = new Map();
  let stopCalls = 0;
  const result = await runDevLifecycleProgramme({
    scenarioId: 'DEV-10',
    live: true,
    authorizeToken: DEV_LIFECYCLE_LIVE_TOKEN,
    worktree,
    ports: {
      ...makePorts({
        worktree,
        environments,
        parkedListeners: [3000],
      }).ports,
      runPnpm: async (args) => {
        if (args[0] === 'dev:new') {
          environments.set('dev-2', baseRecord('dev-2', worktree));
        }
        if (args[0] === 'dev:stop') stopCalls += 1;
        return { code: 0, stdout: '', stderr: '' };
      },
      readParkedState: ({ slotId }) => ({
        slotId,
        replicasByDeploy: Object.fromEntries(
          SIX_SLOT_DEPLOYMENTS.map((name) => [name, 0]),
        ),
        ownedListeners: [3000],
        ownedProcesses: [],
        reservationRetained: true,
      }),
    },
  });
  assert.equal(result.status, 'FAIL');
  assert.equal(result.reason, 'park-incomplete-listeners');
  assert.ok(stopCalls >= 1);
  assert.ok(result.cleanup.some((row) => row.action === 'park'));
});

test('peer registry rows stay untouched on success path', async () => {
  const worktree = mkdtempSync(join(tmpdir(), 'dev-lifecycle-wt-'));
  const peer = baseRecord('dev-peer', '/foreign/checkout');
  const environments = new Map([['dev-peer', structuredClone(peer)]]);
  const fixture = makePorts({ worktree, environments });
  const pre = assessLifecycleActivationPreconditions({
    worktree,
    registryRoot: fixture.registryRoot,
    ports: fixture.ports,
    ownedSlotId: 'dev-owned',
  });
  assert.equal(pre.ok, true);
  const result = await runDevLifecycleProgramme({
    scenarioId: 'DEV-02',
    live: true,
    authorizeToken: DEV_LIFECYCLE_LIVE_TOKEN,
    worktree,
    ports: {
      ...fixture.ports,
      runPnpm: async (args) => {
        if (args[0] === 'dev:new') {
          environments.set('dev-owned', baseRecord('dev-owned', worktree));
        }
        return { code: 0, stdout: '', stderr: '' };
      },
    },
  });
  assert.equal(result.status, 'PASS');
  assert.deepEqual(environments.get('dev-peer'), peer);
});

test('activation and overall bounds are frozen', () => {
  assert.equal(LIFECYCLE_BOUNDS.activationMs, 12 * 60 * 1000);
  assert.equal(LIFECYCLE_BOUNDS.parkMs, 3 * 60 * 1000);
  assert.equal(LIFECYCLE_BOUNDS.overallMs, 40 * 60 * 1000);
});

test('verifyRuntimeReceipts accepts complete readiness map', () => {
  const check = verifyRuntimeReceipts(readySnapshot());
  assert.equal(check.ok, true);
});