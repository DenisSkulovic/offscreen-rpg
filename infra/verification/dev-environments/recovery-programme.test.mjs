import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import {
  API_HEALTH_LIVE_MARKER,
  API_HEALTH_RELATIVE,
  DEV_LIFECYCLE_LIVE_TOKEN,
  DEV_RECOVERY_SCENARIO_IDS,
  RECOVERY_POLL_DEADLINE_MS,
  WEB_SIGN_IN_DEFAULT_MARKER,
  WEB_SIGN_IN_RELATIVE,
  appendInvalidApiTypeScript,
  patchApiHealthLiveMarker,
  patchWebSignInMarker,
  runDevRecoveryProgramme,
  verifyApiLiveMarkerBody,
  verifyWebMarkerBody,
} from './recovery-programme.mjs';
import { pollWithDeadline, withDisposableWorktreeEdit } from './worktree-fixture.mjs';
import {
  DEV_KIND_CONTEXT,
  REQUIRED_MEM_KIB,
} from './lifecycle-programme.mjs';

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

function makeRecoveryPorts(overrides = {}) {
  const worktree = overrides.worktree ?? '/tmp/inf52-recovery';
  const slotId = overrides.slotId ?? 'dev-7';
  const registryRoot =
    overrides.registryRoot ?? mkdtempSync(join(tmpdir(), 'inf52-recovery-'));
  const files = new Map(overrides.files ?? []);
  let runtimeCount = overrides.runtimeCount ?? 1;
  let apiReady = overrides.apiReady ?? true;
  let webBody = overrides.webBody ?? '';
  let apiBody =
    overrides.apiBody ??
    JSON.stringify({ status: 'ok', verificationMarker: API_HEALTH_LIVE_MARKER });

  const restoreCalls = [];
  return {
    slotId,
    restoreCalls,
    files,
    ports: {
      registryRoot,
      sessionRoot: join(registryRoot, 'sessions'),
      getEnvironment: (_root, id) =>
        overrides.environment ??
        (id === slotId ? baseRecord(slotId, worktree) : null),
      readEnvironmentSession: () => null,
      readWorktreeBytes: async (relativePath) =>
        files.get(relativePath) ?? null,
      writeWorktreeBytes: async (relativePath, bytes) => {
        files.set(relativePath, Buffer.from(bytes));
      },
      fetchOwnedHttp: async ({ path }) => {
        if (path === '/sign-in') {
          return { status: 200, body: webBody };
        }
        return { status: 200, body: apiBody };
      },
      pollApiCompileReadiness: async () => ({
        ready: apiReady,
        reason: apiReady ? null : 'compile_error',
        runtimeCount,
      }),
      pollSharedPackageMarker: async () => ({
        generationId: 'gen-1',
        marker: overrides.sharedMarker ?? null,
      }),
      installSharedPackageHook: async () => ({ ok: true }),
      gitWorktreeState: () => ({ ok: true, head: 'abc', dirty: false }),
      readKubeContext: () => DEV_KIND_CONTEXT,
      readMemAvailableKib: () => REQUIRED_MEM_KIB + 1024,
      listActiveSlotIds: () => [],
      getDefaultEnvironment: () => null,
      runPnpm: async () => ({ code: 0 }),
      sleep: async () => {},
      now: (() => {
        let t = 0;
        return () => {
          t += 500;
          return t;
        };
      })(),
      ...overrides.portOverrides,
    },
    setApiReady(value) {
      apiReady = value;
    },
    setRuntimeCount(value) {
      runtimeCount = value;
    },
    setWebBody(value) {
      webBody = value;
    },
    setApiBody(value) {
      apiBody = value;
    },
  };
}

test('recovery scenario ids stay frozen', () => {
  assert.deepEqual(DEV_RECOVERY_SCENARIO_IDS, ['DEV-07', 'DEV-08', 'DEV-09']);
  assert.equal(RECOVERY_POLL_DEADLINE_MS, 120_000);
});

test('marker patch helpers require known anchors', () => {
  const web = patchWebSignInMarker(
    Buffer.from(`<h1>${WEB_SIGN_IN_DEFAULT_MARKER}</h1>`, 'utf8'),
    'marker-a',
  );
  assert.match(web.toString('utf8'), /marker-a/);
  const api = patchApiHealthLiveMarker(
    Buffer.from("return { status: 'ok' };", 'utf8'),
    'live-marker',
  );
  assert.match(api.toString('utf8'), /live-marker/);
  const broken = appendInvalidApiTypeScript(
    Buffer.from('export class X {}\n', 'utf8'),
  );
  assert.match(broken.toString('utf8'), /__inf52InvalidType/);
});

test('withDisposableWorktreeEdit restores on failure', async () => {
  const store = new Map([
    [WEB_SIGN_IN_RELATIVE, Buffer.from(WEB_SIGN_IN_DEFAULT_MARKER, 'utf8')],
  ]);
  await assert.rejects(
    () =>
      withDisposableWorktreeEdit({
        readBytes: async (p) => store.get(p) ?? null,
        writeBytes: async (p, b) => store.set(p, Buffer.from(b)),
        relativePath: WEB_SIGN_IN_RELATIVE,
        transform: () => {
          throw new Error('boom');
        },
      }),
    /boom/,
  );
  assert.equal(
    store.get(WEB_SIGN_IN_RELATIVE).toString('utf8'),
    WEB_SIGN_IN_DEFAULT_MARKER,
  );
});

test('DEV-07 fixture passes when owned markers are served', async () => {
  const marker = `${WEB_SIGN_IN_DEFAULT_MARKER}-inf52-dev-7`;
  const fixture = makeRecoveryPorts({
    files: new Map([
      [
        WEB_SIGN_IN_RELATIVE,
        Buffer.from(`<h1>${WEB_SIGN_IN_DEFAULT_MARKER}</h1>`, 'utf8'),
      ],
      [
        API_HEALTH_RELATIVE,
        Buffer.from("return { status: 'ok' };", 'utf8'),
      ],
    ]),
    webBody: `<main>${marker}</main>`,
  });

  const result = await runDevRecoveryProgramme({
    scenarioId: 'DEV-07',
    live: true,
    authorizeToken: DEV_LIFECYCLE_LIVE_TOKEN,
    worktree: '/tmp/inf52-recovery',
    ownedSlotId: 'dev-7',
    ports: fixture.ports,
  });
  assert.equal(result.status, 'PASS');
  assert.equal(
    fixture.files.get(WEB_SIGN_IN_RELATIVE).toString('utf8').includes(marker),
    false,
  );
});

test('DEV-07 marker mismatch fails closed', async () => {
  const fixture = makeRecoveryPorts({
    files: new Map([
      [
        WEB_SIGN_IN_RELATIVE,
        Buffer.from(`<h1>${WEB_SIGN_IN_DEFAULT_MARKER}</h1>`, 'utf8'),
      ],
      [
        API_HEALTH_RELATIVE,
        Buffer.from("return { status: 'ok' };", 'utf8'),
      ],
    ]),
    webBody: '<main>wrong-marker</main>',
  });

  const result = await runDevRecoveryProgramme({
    scenarioId: 'DEV-07',
    live: true,
    authorizeToken: DEV_LIFECYCLE_LIVE_TOKEN,
    worktree: '/tmp/inf52-recovery',
    ownedSlotId: 'dev-7',
    ports: fixture.ports,
  });
  assert.equal(result.status, 'FAIL');
  assert.equal(result.reason, 'poll-timeout');
});

test('DEV-09 requires compile not ready without duplicate runtime', async () => {
  const fixture = makeRecoveryPorts({
    files: new Map([
      [API_HEALTH_RELATIVE, Buffer.from('export class Api {}\n', 'utf8')],
    ]),
  });
  fixture.setApiReady(false);
  fixture.setRuntimeCount(0);

  let polls = 0;
  const ports = {
    ...fixture.ports,
    pollApiCompileReadiness: async () => {
      polls += 1;
      if (polls === 1) {
        return { ready: false, reason: 'compile_error', runtimeCount: 1 };
      }
      return { ready: true, reason: null, runtimeCount: 1 };
    },
  };

  const result = await runDevRecoveryProgramme({
    scenarioId: 'DEV-09',
    live: true,
    authorizeToken: DEV_LIFECYCLE_LIVE_TOKEN,
    worktree: '/tmp/inf52-recovery',
    ownedSlotId: 'dev-7',
    ports,
  });
  assert.equal(result.status, 'PASS');
  assert.ok(polls >= 2);
});

test('DEV-09 false readiness keeps polling until timeout', async () => {
  const fixture = makeRecoveryPorts({
    files: new Map([
      [API_HEALTH_RELATIVE, Buffer.from('export class Api {}\n', 'utf8')],
    ]),
  });
  fixture.setApiReady(false);

  const result = await runDevRecoveryProgramme({
    scenarioId: 'DEV-09',
    live: true,
    authorizeToken: DEV_LIFECYCLE_LIVE_TOKEN,
    worktree: '/tmp/inf52-recovery',
    ownedSlotId: 'dev-7',
    ports: fixture.ports,
  });
  assert.equal(result.status, 'FAIL');
  assert.equal(result.reason, 'poll-timeout');
});

test('verifyWebMarkerBody and verifyApiLiveMarkerBody discriminate', () => {
  assert.equal(verifyWebMarkerBody('hello marker', 'marker'), true);
  assert.equal(verifyWebMarkerBody('hello', 'marker'), false);
  assert.equal(
    verifyApiLiveMarkerBody(
      JSON.stringify({ verificationMarker: API_HEALTH_LIVE_MARKER }),
      API_HEALTH_LIVE_MARKER,
    ),
    true,
  );
  assert.equal(
    verifyApiLiveMarkerBody(JSON.stringify({ status: 'ok' }), API_HEALTH_LIVE_MARKER),
    false,
  );
});

test('DEV-08 fixture requires shared package marker in health response', async () => {
  const fixture = makeRecoveryPorts({
    sharedMarker: 'inf52-shared-package-marker',
    apiBody: JSON.stringify({
      status: 'ok',
      sharedPackageMarker: 'inf52-shared-package-marker',
    }),
    files: new Map(),
  });

  const result = await runDevRecoveryProgramme({
    scenarioId: 'DEV-08',
    live: true,
    authorizeToken: DEV_LIFECYCLE_LIVE_TOKEN,
    worktree: '/tmp/inf52-recovery',
    ownedSlotId: 'dev-7',
    ports: fixture.ports,
  });
  assert.equal(result.status, 'PASS');
});

test('pollWithDeadline rejects sleep-only success', async () => {
  let attempts = 0;
  const polled = await pollWithDeadline(
    1_000,
    (() => {
      let t = 0;
      return () => {
        t += 200;
        return t;
      };
    })(),
    100,
    async () => {
      attempts += 1;
      return { done: false };
    },
    async () => {},
  );
  assert.equal(polled.ok, false);
  assert.equal(polled.reason, 'poll-timeout');
  assert.ok(attempts > 1);
});