import assert from 'node:assert/strict';
import test from 'node:test';
import {
  ensureKindImage,
  parseCtrDigest,
  sortKindNodes,
  validateRefForProfile,
} from './kind-image-loader.mjs';

const DIGEST_A = 'sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
const DIGEST_B = 'sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb';
const RELEASE_REF = 'offscreen-lab-app-release-api:turn02';
const RELEASE_CTR = 'docker.io/library/offscreen-lab-app-release-api:turn02';

/**
 * @param {Record<string, Partial<Record<string, RunScript>>>} scripts
 */
function makeRunner(scripts) {
  /** @type {Array<{ command: string, args: string[] }>} */
  const calls = [];
  /**
   * @typedef {{ status?: number, stdout?: string, stderr?: string }} RunScript
   */

  const run = (command, args) => {
    calls.push({ command, args: [...args] });
    const key = scripts[command]?.[args.join('\0')];
    if (key) {
      return {
        status: key.status ?? 0,
        stdout: key.stdout ?? '',
        stderr: key.stderr ?? '',
        signal: null,
      };
    }
    const joined = args.join('\0');
    const prefixKey = Object.keys(scripts[command] ?? {}).find((candidate) => {
      if (candidate === 'load' && command === 'kind' && args[0] === 'load') {
        return true;
      }
      return joined.startsWith(candidate);
    });
    if (prefixKey) {
      const entry = scripts[command][prefixKey];
      return {
        status: entry?.status ?? 0,
        stdout: entry?.stdout ?? '',
        stderr: entry?.stderr ?? '',
        signal: null,
      };
    }
    return { status: 1, stdout: '', stderr: 'unmocked', signal: null };
  };

  return { run, calls };
}

function releaseNodeScripts(controlDigest, workerDigest) {
  const ctrLine = (digest) =>
    digest
      ? `${RELEASE_CTR} ${RELEASE_CTR} ${digest} \n`
      : '';
  return {
    kind: {
      'get\0nodes\0--name\0offscreen-lab\0-o\0name': {
        stdout: 'node/offscreen-lab-control-plane\nnode/offscreen-lab-worker\n',
      },
      load: { status: 0, stdout: '', stderr: '' },
    },
    docker: {
      [`image\0inspect\0--format\0{{.Id}}\0${RELEASE_REF}`]: {
        stdout: `${DIGEST_A}\n`,
      },
      'inspect\0--format\0{{index .Config.Labels "io.x-k8s.kind.cluster"}}\0offscreen-lab-control-plane':
        { stdout: 'offscreen-lab\n' },
      'inspect\0--format\0{{index .Config.Labels "io.x-k8s.kind.cluster"}}\0offscreen-lab-worker':
        { stdout: 'offscreen-lab\n' },
      'exec\0offscreen-lab-control-plane\0ctr\0-n\0k8s.io\0images\0ls': {
        stdout: ctrLine(controlDigest),
      },
      'exec\0offscreen-lab-worker\0ctr\0-n\0k8s.io\0images\0ls': {
        stdout: ctrLine(workerDigest),
      },
    },
  };
}

test('sortKindNodes orders control-plane before worker then lexical', () => {
  assert.deepEqual(
    sortKindNodes(
      ['offscreen-lab-worker', 'offscreen-lab-control-plane', 'offscreen-lab-worker-b'],
      'offscreen-lab',
    ),
    ['offscreen-lab-control-plane', 'offscreen-lab-worker', 'offscreen-lab-worker-b'],
  );
});

test('parseCtrDigest rejects duplicate rows and malformed digests', () => {
  const ref = RELEASE_CTR;
  assert.equal(parseCtrDigest(`${ref} x ${DIGEST_A}\n`, ref), DIGEST_A);
  assert.throws(
    () => parseCtrDigest(`${ref} x ${DIGEST_A}\n${ref} y ${DIGEST_B}\n`, ref),
    /ambiguous duplicate rows/,
  );
  assert.throws(
    () => parseCtrDigest(`${ref} x sha256:bad\n`, ref),
    /malformed node digest/,
  );
});

test('validateRefForProfile rejects cross-profile families', () => {
  assert.equal(validateRefForProfile('release', RELEASE_REF), RELEASE_REF);
  assert.throws(
    () => validateRefForProfile('release', 'offscreen-dev-workspace:union-0123456789abcdef'),
    /cross-profile/,
  );
  assert.throws(
    () => validateRefForProfile('dev', RELEASE_REF),
    /cross-profile/,
  );
});

test('validateRefForProfile rejects retired legacy dev workspace tags', () => {
  assert.throws(
    () => validateRefForProfile('dev', 'offscreen-lab-dev-workspace:dxk08'),
    /not accepted for dev profile/,
  );
});

test('all nodes hit reuses without kind load', () => {
  const { run, calls } = makeRunner(releaseNodeScripts(DIGEST_A, DIGEST_A));
  const receipt = ensureKindImage({
    profileId: 'release',
    ref: RELEASE_REF,
    run,
  });
  assert.equal(receipt.digest, DIGEST_A);
  assert.deepEqual(receipt.loadedNodes, []);
  assert.deepEqual(receipt.reusedNodes, [
    'offscreen-lab-control-plane',
    'offscreen-lab-worker',
  ]);
  assert.equal(
    calls.some((call) => call.command === 'kind' && call.args[0] === 'load'),
    false,
  );
});

test('one stale worker loads only that node', () => {
  const workerCtr = { stdout: '' };
  const scripts = releaseNodeScripts(DIGEST_A, null);
  scripts.docker['exec\0offscreen-lab-worker\0ctr\0-n\0k8s.io\0images\0ls'] = workerCtr;
  const { run, calls } = makeRunner(scripts);
  const trackingRun = (command, args) => {
    if (command === 'kind' && args[0] === 'load') {
      workerCtr.stdout = `${RELEASE_CTR} ${RELEASE_CTR} ${DIGEST_A} \n`;
    }
    return run(command, args);
  };
  const receipt = ensureKindImage({
    profileId: 'release',
    ref: RELEASE_REF,
    run: trackingRun,
  });
  assert.deepEqual(receipt.loadedNodes, ['offscreen-lab-worker']);
  assert.deepEqual(receipt.reusedNodes, ['offscreen-lab-control-plane']);
  assert.equal(
    calls.filter((call) => call.command === 'kind' && call.args[0] === 'load').length,
    1,
  );
});

test('missing worker in inventory refuses before mutation', () => {
  const { run, calls } = makeRunner({
    kind: {
      'get\0nodes\0--name\0offscreen-lab\0-o\0name': {
        stdout: 'node/offscreen-lab-control-plane\n',
      },
      load: { status: 0 },
    },
    docker: {
      [`image\0inspect\0--format\0{{.Id}}\0${RELEASE_REF}`]: {
        stdout: `${DIGEST_A}\n`,
      },
    },
  });
  assert.throws(
    () =>
      ensureKindImage({
        profileId: 'release',
        ref: RELEASE_REF,
        run,
      }),
    /node count/,
  );
  assert.equal(
    calls.some((call) => call.command === 'kind' && call.args[0] === 'load'),
    false,
  );
});

test('post-load mismatch refuses without receipt', () => {
  const scripts = releaseNodeScripts(DIGEST_A, null);
  const { run, calls } = makeRunner(scripts);
  const trackingRun = (command, args) => {
    const result = run(command, args);
    if (command === 'kind' && args[0] === 'load') {
      scripts.docker['exec\0offscreen-lab-worker\0ctr\0-n\0k8s.io\0images\0ls'] = {
        stdout: `${RELEASE_CTR} ${RELEASE_CTR} ${DIGEST_B} \n`,
      };
    }
    return result;
  };
  assert.throws(
    () =>
      ensureKindImage({
        profileId: 'release',
        ref: RELEASE_REF,
        run: trackingRun,
      }),
    /post-load-mismatch/,
  );
  assert.equal(calls.some((call) => call.command === 'kind'), true);
});

test('changed host digest before load refuses', () => {
  let hostReads = 0;
  const workerCtr = { stdout: '' };
  const scripts = releaseNodeScripts(DIGEST_A, null);
  scripts.docker['exec\0offscreen-lab-worker\0ctr\0-n\0k8s.io\0images\0ls'] = workerCtr;
  const { run, calls } = makeRunner(scripts);
  const trackingRun = (command, args) => {
    if (command === 'docker' && args[0] === 'image' && args[1] === 'inspect') {
      hostReads += 1;
      if (hostReads === 2) {
        return { status: 0, stdout: `${DIGEST_B}\n`, stderr: '', signal: null };
      }
    }
    return run(command, args);
  };
  assert.throws(
    () =>
      ensureKindImage({
        profileId: 'release',
        ref: RELEASE_REF,
        run: trackingRun,
      }),
    /host image digest changed before load/,
  );
  assert.equal(
    calls.some((call) => call.command === 'kind' && call.args[0] === 'load'),
    false,
  );
});

test('malformed expected digest refuses', () => {
  const { run } = makeRunner(releaseNodeScripts(DIGEST_A, DIGEST_A));
  assert.throws(
    () =>
      ensureKindImage({
        profileId: 'release',
        ref: RELEASE_REF,
        expectedDigest: 'sha256:bad',
        run,
      }),
    /malformed expected digest/,
  );
});

test('failed docker inspect refuses before load', () => {
  const scripts = releaseNodeScripts(DIGEST_A, DIGEST_A);
  scripts.docker['exec\0offscreen-lab-worker\0ctr\0-n\0k8s.io\0images\0ls'] = {
    status: 1,
  };
  const { run, calls } = makeRunner(scripts);
  assert.throws(
    () =>
      ensureKindImage({
        profileId: 'release',
        ref: RELEASE_REF,
        run,
      }),
    /node image inspect failed/,
  );
  assert.equal(
    calls.some((call) => call.command === 'kind' && call.args[0] === 'load'),
    false,
  );
});

test('foreign docker label refuses before load', () => {
  const scripts = releaseNodeScripts(DIGEST_A, DIGEST_A);
  scripts.docker[
    'inspect\0--format\0{{index .Config.Labels "io.x-k8s.kind.cluster"}}\0offscreen-lab-worker'
  ] = { stdout: 'other-cluster\n' };
  const { run, calls } = makeRunner(scripts);
  assert.throws(
    () =>
      ensureKindImage({
        profileId: 'release',
        ref: RELEASE_REF,
        run,
      }),
    /foreign cluster label/,
  );
  assert.equal(
    calls.some((call) => call.command === 'kind' && call.args[0] === 'load'),
    false,
  );
});