import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import {
  APPLICATION_PROFILES,
  DEV_LIFECYCLE_LIVE_TOKEN,
  DEV_SELECTIVE_SCENARIO_IDS,
  SELECTIVE_PROFILE_BLOCKED_REASON,
  probeSelectiveProfileCliSupport,
  resolveSelectiveProfilesForScenario,
  runDevSelectiveProfileProgramme,
  verifyInactiveReplicasZero,
  verifyProfileHostReadiness,
  verifySelectiveProfileRuntime,
} from './selective-profile-programme.mjs';
import { DEV_KIND_CONTEXT, REQUIRED_MEM_KIB, SIX_SLOT_DEPLOYMENTS } from './lifecycle-programme.mjs';

function refusal(message) {
  const error = new Error(message);
  error.id = 'invalid-arguments';
  return error;
}

function unsupportedCli() {
  return () => {
    throw refusal('Unknown argument: --profile');
  };
}

function supportedCli(profile) {
  return (argv) => ({
    command: argv.includes('new') ? 'new' : 'up',
    instance: argv.includes('--instance')
      ? argv[argv.indexOf('--instance') + 1]
      : null,
    profile,
  });
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

function profileReadiness(profileName) {
  const profile = APPLICATION_PROFILES[profileName];
  return {
    runtimeReady: true,
    readiness: Object.fromEntries(
      SIX_SLOT_DEPLOYMENTS.map((name) => [
        name,
        profile.activeRoles.includes(name),
      ]),
    ),
    hostHttpStatus: profile.hostEndpoint === 'web' ? 200 : null,
  };
}

function replicaMap(profileName) {
  const profile = APPLICATION_PROFILES[profileName];
  return Object.fromEntries(
    SIX_SLOT_DEPLOYMENTS.map((name) => [
      name,
      profile.inactiveRoles.includes(name) ? 0 : 1,
    ]),
  );
}

function makeSelectivePorts(overrides = {}) {
  const worktree = overrides.worktree ?? '/tmp/inf52-selective';
  const slotId = overrides.slotId ?? 'dev-4';
  const registryRoot =
    overrides.registryRoot ?? mkdtempSync(join(tmpdir(), 'inf52-selective-'));
  const record = baseRecord(slotId, worktree);
  const commands = [];
  return {
    worktree,
    slotId,
    commands,
    ports: {
      registryRoot,
      sessionRoot: join(registryRoot, 'sessions'),
      listEnvironments: () => [record],
      getEnvironment: () => record,
      getDefaultEnvironment: () => null,
      readEnvironmentSession: () => null,
      collectReadiness: () =>
        profileReadiness(overrides.profileName ?? 'api'),
      gitWorktreeState: () => ({ ok: true, head: 'abc', dirty: false }),
      readKubeContext: () => DEV_KIND_CONTEXT,
      readMemAvailableKib: () => REQUIRED_MEM_KIB + 2048,
      listActiveSlotIds: () => [],
      readParkedState: ({ slotId: id }) => ({
        slotId: id,
        replicasByDeploy: replicaMap(overrides.profileName ?? 'api'),
        ownedListeners: [],
        ownedProcesses: [],
        reservationRetained: true,
      }),
      runPnpm: async (args) => {
        commands.push([...args]);
        return overrides.runPnpm?.(args) ?? { code: 0, stdout: '', stderr: '' };
      },
      now: () => Date.now(),
      probeCliProfileSupport:
        overrides.probeCliProfileSupport ??
        (() =>
          probeSelectiveProfileCliSupport(
            overrides.parseCliArgs ?? unsupportedCli(),
          )),
      parseCliArgs: overrides.parseCliArgs ?? unsupportedCli(),
      readReplicaCounts: () => replicaMap(overrides.profileName ?? 'api'),
      fetchOwnedHttp: async ({ mode }) => {
        if (mode === 'api') {
          return { status: 200, body: JSON.stringify({ status: 'ok' }) };
        }
        return { status: 200, body: '<html />' };
      },
      readTemporalIdentity: async () => null,
      listTemporalNamespaces: async () => [],
      ...overrides.portExtras,
    },
  };
}

test('probeSelectiveProfileCliSupport fails closed without INF38 CLI', () => {
  const outcome = probeSelectiveProfileCliSupport(unsupportedCli());
  assert.equal(outcome.supported, false);
  assert.equal(outcome.reason, SELECTIVE_PROFILE_BLOCKED_REASON);
});

test('unsupported CLI yields BLOCKED selective-profiles-unimplemented', async () => {
  const fixture = makeSelectivePorts();
  const result = await runDevSelectiveProfileProgramme({
    scenarioId: 'DEV-04',
    live: true,
    authorizeToken: DEV_LIFECYCLE_LIVE_TOKEN,
    worktree: fixture.worktree,
    ownedSlotId: fixture.slotId,
    ports: fixture.ports,
  });
  assert.equal(result.status, 'BLOCKED');
  assert.equal(result.reason, SELECTIVE_PROFILE_BLOCKED_REASON);
  assert.equal(fixture.commands.length, 0);
});

test('live-not-authorized when token missing', async () => {
  const fixture = makeSelectivePorts({
    parseCliArgs: supportedCli('api'),
    probeCliProfileSupport: () => ({ supported: true }),
  });
  const result = await runDevSelectiveProfileProgramme({
    scenarioId: 'DEV-04',
    live: true,
    authorizeToken: 'wrong-token',
    worktree: fixture.worktree,
    ownedSlotId: fixture.slotId,
    ports: fixture.ports,
  });
  assert.equal(result.status, 'NOT-RUN');
  assert.equal(result.reason, 'live-not-authorized');
});

test('api profile asserts inactive replicas zero and API ready', async () => {
  const fixture = makeSelectivePorts({
    profileName: 'api',
    parseCliArgs: supportedCli('api'),
    probeCliProfileSupport: () => ({ supported: true }),
  });
  const result = await runDevSelectiveProfileProgramme({
    scenarioId: 'DEV-04',
    live: true,
    authorizeToken: DEV_LIFECYCLE_LIVE_TOKEN,
    worktree: fixture.worktree,
    ownedSlotId: fixture.slotId,
    ports: fixture.ports,
  });
  assert.equal(result.status, 'PASS');
  assert.deepEqual(resolveSelectiveProfilesForScenario('DEV-04'), ['api']);
  assert.ok(
    fixture.commands.some(
      (row) => row[0] === 'dev' && row.includes('--profile') && row.includes('api'),
    ),
  );
});

test('web profile readiness discrimination rejects worker replicas', () => {
  const replicas = {
    ...replicaMap('web'),
    'game-executor': 1,
  };
  const check = verifySelectiveProfileRuntime({
    readiness: profileReadiness('web'),
    replicasByDeploy: replicas,
    profileName: 'web',
    hostHttp: { status: 200, body: 'ok' },
  });
  assert.equal(check.ok, false);
  assert.equal(check.reason, 'inactive-replicas-nonzero');
});

test('verifyInactiveReplicasZero passes for expected profile shape', () => {
  const ok = verifyInactiveReplicasZero(
    replicaMap('api'),
    APPLICATION_PROFILES.api.inactiveRoles,
  );
  assert.equal(ok.ok, true);
  const fail = verifyInactiveReplicasZero(
    { ...replicaMap('api'), 'game-web': 1 },
    ['game-web'],
  );
  assert.equal(fail.ok, false);
});

test('verifyProfileHostReadiness requires API JSON status ok', () => {
  assert.equal(
    verifyProfileHostReadiness(
      { status: 200, body: JSON.stringify({ status: 'ok' }) },
      'api',
    ).ok,
    true,
  );
  assert.equal(
    verifyProfileHostReadiness({ status: 503, body: '' }, 'api').reason,
    'api-ready-http-failed',
  );
});

test('DEV-14 sequences stop/profile change with retained slot identity', async () => {
  const fixture = makeSelectivePorts({
    profileName: 'web',
    parseCliArgs: supportedCli('web'),
    probeCliProfileSupport: () => ({ supported: true }),
  });
  let launchIndex = 0;
  const baseRunPnpm = fixture.ports.runPnpm;
  fixture.ports.runPnpm = async (args) => {
    if (args[0] === 'dev' && args.includes('--profile')) {
      launchIndex += 1;
    }
    return baseRunPnpm(args);
  };
  fixture.ports.collectReadiness = () =>
    profileReadiness(launchIndex <= 1 ? 'api' : 'web');
  fixture.ports.readReplicaCounts = () =>
    replicaMap(launchIndex <= 1 ? 'api' : 'web');
  const result = await runDevSelectiveProfileProgramme({
    scenarioId: 'DEV-14',
    live: true,
    authorizeToken: DEV_LIFECYCLE_LIVE_TOKEN,
    worktree: fixture.worktree,
    ownedSlotId: fixture.slotId,
    ports: fixture.ports,
  });
  assert.equal(result.status, 'PASS');
  assert.ok(fixture.commands.filter((row) => row[0] === 'dev').length >= 2);
});

test('DEV-12 remains NOT-RUN without explicit mixed-slot authorization', async () => {
  const fixture = makeSelectivePorts({
    parseCliArgs: supportedCli('full'),
    probeCliProfileSupport: () => ({ supported: true }),
  });
  const result = await runDevSelectiveProfileProgramme({
    scenarioId: 'DEV-12',
    live: true,
    authorizeToken: DEV_LIFECYCLE_LIVE_TOKEN,
    worktree: fixture.worktree,
    ownedSlotId: fixture.slotId,
    ports: fixture.ports,
  });
  assert.equal(result.status, 'NOT-RUN');
  assert.equal(result.reason, 'mixed-slot-not-authorized');
});

test('scenario ids remain independent from lifecycle scenarios', () => {
  assert.deepEqual(DEV_SELECTIVE_SCENARIO_IDS, ['DEV-04', 'DEV-05', 'DEV-14']);
});