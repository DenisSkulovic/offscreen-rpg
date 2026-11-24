import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  DEV_CONTEXT_NAME,
  KNOWN_MIGRATION_JOB,
  RELEASE_ACCEPTANCE_PLAN_STAGES,
  parseReleaseImageSelection,
  findUnknownReleaseImages,
  runReleaseAcceptancePreflightSmoke,
} from './release-acceptance-preflight.mjs';
import {
  API_IMAGE,
  CLUSTER_NAME,
  CONTEXT_NAME,
  WEB_IMAGE,
  WORKER_IMAGE,
} from './turn03/preflight.mjs';

const PINNED_SHA = 'bc562b77663472c8cccdd1bb68f79a00bddb619a';

/**
 * @param {{
 *   dirty?: boolean,
 *   currentContext?: string,
 *   contexts?: string,
 *   oauthLines?: string[] | null,
 *   invokeInstall?: boolean,
 * }} [opts]
 */
function makeHarness(opts = {}) {
  /** @type {Array<{ cmd: string, args: string[] }>} */
  const invocations = [];
  /** @type {Array<{ cmd: string, args: string[] }>} */
  const spawns = [];

  const oauthLines =
    opts.oauthLines === undefined
      ? [
          'GITHUB_CLIENT_ID=gh-client',
          'GITHUB_CLIENT_SECRET=gh-secret',
          'BETTER_AUTH_SECRET=abcdefghijklmnopqrstuvwxyz012345',
        ]
      : opts.oauthLines;

  const run = (cmd, args) => {
    invocations.push({ cmd, args });
    if (cmd === 'git' && args[0] === '-C' && args[2] === 'rev-parse') {
      return { status: 0, stdout: `${PINNED_SHA}\n`, stderr: '' };
    }
    if (cmd === 'git' && args.includes('status') && args.includes('--porcelain')) {
      const dirty = opts.dirty === true;
      return {
        status: 0,
        stdout: dirty ? ' M apps/api/src/main.ts\n' : '',
        stderr: '',
      };
    }
    if (cmd === 'kubectl' && args[0] === 'config' && args[1] === 'current-context') {
      return {
        status: 0,
        stdout: `${opts.currentContext ?? CONTEXT_NAME}\n`,
        stderr: '',
      };
    }
    if (cmd === 'kubectl' && args[0] === 'config' && args[1] === 'get-contexts') {
      return {
        status: 0,
        stdout: `${opts.contexts ?? CONTEXT_NAME}\n`,
        stderr: '',
      };
    }
    if (cmd === 'kind' && args[0] === 'get' && args[1] === 'clusters') {
      return { status: 0, stdout: `${CLUSTER_NAME}\n`, stderr: '' };
    }
    if (cmd === 'kubectl' && args[0] === '--context') {
      return { status: 0, stdout: 'ok\n', stderr: '' };
    }
    if (cmd === 'git' && args[0] === 'rev-parse') {
      return { status: 0, stdout: `${PINNED_SHA}\n`, stderr: '' };
    }
    if (cmd === 'docker' && args[0] === 'image' && args[1] === 'inspect') {
      return { status: 0, stdout: '[]\n', stderr: '' };
    }
    return { status: 0, stdout: '', stderr: '' };
  };

  const spawnSync = (cmd, args, _options) => {
    spawns.push({ cmd, args });
    if (opts.invokeInstall) {
      return { status: 0, stdout: 'applied\n', stderr: '' };
    }
    throw new Error('unexpected spawn during read-only preflight smoke');
  };

  const dockerInspect = (image) => `digest:${image}`;

  const runPreflight = async (preflightOptions) => {
    const { runTurn03Preflight } = await import(
      './turn03/preflight.mjs'
    );
    return runTurn03Preflight({
      ...preflightOptions,
      run,
      dockerInspect,
      repoRoot: '/fake/repo',
      readEnvFile: () => (oauthLines == null ? null : oauthLines.join('\n')),
    });
  };

  return { run, spawnSync, runPreflight, invocations, spawns, oauthLines };
}

describe('DXK09 T06a release acceptance preflight smoke (read-only)', () => {
  it('dry-run plan classifies stages and TURN03 gates without mutating install', async () => {
    const harness = makeHarness();

    const result = await runReleaseAcceptancePreflightSmoke({
      run: harness.run,
      spawnSync: harness.spawnSync,
      runPreflight: harness.runPreflight,
      repoRoot: '/fake/repo',
    });

    assert.equal(result.mode, 'read-only-plan');
    assert.equal(result.refused, false);
    assert.equal(result.contextName, CONTEXT_NAME);
    assert.equal(result.installSpawned, false);
    assert.equal(harness.spawns.length, 0);

    assert.equal(result.stages.length, RELEASE_ACCEPTANCE_PLAN_STAGES.length);
    const preflightStage = result.stages.find((s) => s.id === 'turn03-lab-preflight');
    assert.ok(preflightStage);
    assert.ok(['classified', 'planned', 'not-run'].includes(preflightStage.classification));

    const faultStage = result.stages.find((s) => s.id === 'recovery-fault-suite');
    assert.equal(faultStage?.classification, 'not-run');
    assert.equal(faultStage?.linkedGates['recovery-negative-matrix'], 'NOT-RUN');
    assert.equal(result.turn03.gateIds.length, 8);
    assert.ok(result.plannedCommands.some((line) => line.includes(CONTEXT_NAME)));
    assert.equal(result.mentionsDevTilt, false);

    const planBlob = result.plannedCommands.join('\n');
    assert.ok(!/stop.*tilt|tilt\s+down|kind-offscreen-dev/i.test(planBlob));
    assert.ok(!planBlob.includes(DEV_CONTEXT_NAME));
  });

  it('dirty source refuses read-only release acceptance', async () => {
    const harness = makeHarness({ dirty: true });

    const result = await runReleaseAcceptancePreflightSmoke({
      run: harness.run,
      spawnSync: harness.spawnSync,
      runPreflight: harness.runPreflight,
      repoRoot: '/fake/repo',
    });

    assert.equal(result.refused, true);
    assert.equal(result.mode, 'read-only-refused');
    assert.match(result.refusalReasons.join('; '), /dirty/i);
    assert.equal(harness.spawns.length, 0);
  });

  it('release identity mismatch refuses before install planning executes', async () => {
    const harness = makeHarness();

    const result = await runReleaseAcceptancePreflightSmoke({
      run: harness.run,
      spawnSync: harness.spawnSync,
      runPreflight: harness.runPreflight,
      repoRoot: '/fake/repo',
      expectedSourceSha: 'deadbeefdeadbeefdeadbeefdeadbeefdeadbeef',
    });

    assert.equal(result.refused, true);
    assert.match(result.refusalReasons.join('; '), /SHA mismatch/i);
    assert.equal(harness.spawns.length, 0);
  });

  it('plan names kind-offscreen-lab and never references stopping dev Tilt', async () => {
    const harness = makeHarness();

    const result = await runReleaseAcceptancePreflightSmoke({
      run: harness.run,
      spawnSync: harness.spawnSync,
      runPreflight: harness.runPreflight,
      repoRoot: '/fake/repo',
    });

    const serialized = JSON.stringify(result);
    assert.ok(serialized.includes('kind-offscreen-lab'));
    assert.equal(result.mentionsDevTilt, false);
    assert.ok(!/stop\s+dev\s+tilt/i.test(serialized));
    assert.equal(result.devContextExcluded, DEV_CONTEXT_NAME);
  });

  it('missing oauth env returns read-only refusal and does not spawn install.sh', async () => {
    const harness = makeHarness({
      oauthLines: ['GITHUB_CLIENT_ID=', 'BETTER_AUTH_SECRET=short'],
    });

    const result = await runReleaseAcceptancePreflightSmoke({
      run: harness.run,
      spawnSync: harness.spawnSync,
      runPreflight: harness.runPreflight,
      repoRoot: '/fake/repo',
    });

    assert.equal(result.refused, true);
    assert.match(result.refusalReasons.join('; '), /OAuth/i);
    assert.equal(harness.spawns.length, 0);

    const authGate = result.turn03.gates.find((g) => g.id === 'auth-ssr');
    assert.equal(authGate?.status, 'BLOCKED');
  });

  it('foreign kubectl context returns read-only refusal without install.sh', async () => {
    const harness = makeHarness({ currentContext: 'minikube' });

    const result = await runReleaseAcceptancePreflightSmoke({
      run: harness.run,
      spawnSync: harness.spawnSync,
      runPreflight: harness.runPreflight,
      repoRoot: '/fake/repo',
    });

    assert.equal(result.refused, true);
    assert.match(result.refusalReasons.join('; '), /foreign kubectl context/i);
    assert.equal(harness.spawns.length, 0);
  });

  it('unknown migration job returns read-only refusal without install.sh', async () => {
    const harness = makeHarness();

    const result = await runReleaseAcceptancePreflightSmoke({
      run: harness.run,
      spawnSync: harness.spawnSync,
      runPreflight: harness.runPreflight,
      repoRoot: '/fake/repo',
      migrationJob: 'game-migrate-legacy',
    });

    assert.equal(result.refused, true);
    assert.match(result.refusalReasons.join('; '), /unknown migration job/i);
    assert.equal(result.identity.migrationJob, 'game-migrate-legacy');
    assert.notEqual(result.identity.migrationJob, KNOWN_MIGRATION_JOB);
    assert.equal(harness.spawns.length, 0);
  });

  it('unknown release image selection is refused read-only', async () => {
    assert.deepEqual(findUnknownReleaseImages(['web', 'bogus']), ['bogus']);
    assert.deepEqual(parseReleaseImageSelection('web,worker'), ['web', 'worker']);

    const harness = makeHarness();
    const result = await runReleaseAcceptancePreflightSmoke({
      run: harness.run,
      spawnSync: harness.spawnSync,
      runPreflight: harness.runPreflight,
      repoRoot: '/fake/repo',
      releaseImages: 'web,bogus',
    });

    assert.equal(result.refused, true);
    assert.match(result.refusalReasons.join('; '), /unknown release image/i);
    assert.equal(harness.spawns.length, 0);
  });

  it('pinned image digest mismatch refuses without spawning install.sh', async () => {
    const harness = makeHarness();

    const result = await runReleaseAcceptancePreflightSmoke({
      run: harness.run,
      spawnSync: harness.spawnSync,
      runPreflight: harness.runPreflight,
      repoRoot: '/fake/repo',
      expectedImageDigests: {
        [API_IMAGE]: 'sha256:expected-api',
        [WEB_IMAGE]: 'sha256:expected-web',
        [WORKER_IMAGE]: 'sha256:expected-worker',
      },
    });

    assert.equal(result.refused, true);
    assert.match(result.refusalReasons.join('; '), /digest mismatch/i);
    assert.equal(harness.spawns.length, 0);
  });
});