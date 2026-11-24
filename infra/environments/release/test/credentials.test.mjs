import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import {
  assertApprovedLocalEnv,
  decodeSecretStringData,
  ensureReleaseCredentials,
  mismatchedFieldNames,
  parseRootDotEnv,
  reconcileTokenFields,
} from '../credentials.mjs';

const APP_NAMESPACES = ['lab-edge', 'lab-authority', 'lab-workers'];
const TOKENS = {
  'game-authority-service-token': 'a'.repeat(48),
  'game-authority-control-token': 'b'.repeat(48),
  'game-authority-executor-token': 'c'.repeat(48),
};

function writeEnv(root, lines) {
  writeFileSync(join(root, '.env'), `${lines.join('\n')}\n`, 'utf8');
}

/**
 * @param {object} options
 */
function stubPlatformRun(options) {
  const {
    gatewayLabel = 'disposable',
    namespaceLabels = {},
    backingPgUri = 'postgresql://lab/app',
    backingS3 = { 'access-key-id': 'key', 'secret-access-key': 'sek' },
    secrets = {},
    denyReads = [],
    createFails = false,
  } = options;

  /** @type {Array<{ command: string, args: string[], input?: string }>} */
  const invocations = [];
  /** @type {Map<string, { uid: string, stringData: Record<string, string> }>} */
  const createdSecrets = new Map();

  /**
   * @param {string[]} kubectlArgs
   */
  function namespacedSecretName(kubectlArgs) {
    const secretIndex = kubectlArgs.indexOf('secret');
    if (secretIndex < 0) return null;
    if (kubectlArgs[secretIndex + 1] === '-n') {
      return kubectlArgs[secretIndex + 3] ?? null;
    }
    return kubectlArgs[secretIndex + 1] ?? null;
  }

  /**
   * @param {string[]} kubectlArgs
   */
  function namespacedTarget(kubectlArgs) {
    const nsIndex = kubectlArgs.indexOf('-n');
    return nsIndex >= 0 ? (kubectlArgs[nsIndex + 1] ?? null) : null;
  }

  /**
   * @param {string} command
   * @param {string[]} args
   * @param {{ input?: string }} [opts]
   */
  function run(command, args, opts = {}) {
    invocations.push({ command, args, input: opts.input });
    if (command !== 'kubectl') {
      return { ok: false, status: 1, stdout: '', stderr: '', timedOut: false, missing: false };
    }
    const joined = args.join(' ');
    const deny = denyReads.find((rule) => rule.every((part) => joined.includes(part)));
    if (deny) {
      return { ok: false, status: 1, stdout: '', stderr: 'denied', timedOut: false, missing: false };
    }

    if (joined.includes('create namespace') && joined.includes('--dry-run=client')) {
      const name = args[args.indexOf('namespace') + 1];
      return {
        ok: true,
        status: 0,
        stdout: `apiVersion: v1\nkind: Namespace\nmetadata:\n  name: ${name}\n`,
        stderr: '',
        timedOut: false,
        missing: false,
      };
    }
    if (joined.includes(' apply ') && joined.includes('-f -')) {
      return { ok: true, status: 0, stdout: '', stderr: '', timedOut: false, missing: false };
    }
    if (joined.includes(' create ') && joined.includes('-f -')) {
      if (createFails) {
        return { ok: false, status: 1, stdout: '', stderr: '', timedOut: false, missing: false };
      }
      try {
        const body = JSON.parse(opts.input ?? '{}');
        const ns = body.metadata?.namespace;
        const name = body.metadata?.name;
        if (typeof ns === 'string' && typeof name === 'string') {
          createdSecrets.set(`${ns}/${name}`, {
            uid: `uid-created-${ns}-${name}`,
            stringData: body.stringData ?? {},
          });
        }
      } catch {
        // ignore malformed create input in negative cases
      }
      return { ok: true, status: 0, stdout: '', stderr: '', timedOut: false, missing: false };
    }

    if (args.includes('gateway') && args.includes('lab-edge') && joined.includes('get ')) {
      if (gatewayLabel === 'absent') {
        return { ok: true, status: 0, stdout: '', stderr: '', timedOut: false, missing: false };
      }
      return {
        ok: true,
        status: 0,
        stdout: JSON.stringify({
          metadata: {
            name: 'lab-edge',
            namespace: 'lab-edge',
            labels: { 'offscreen.rpg/lab': gatewayLabel },
          },
        }),
        stderr: '',
        timedOut: false,
        missing: false,
      };
    }

    if (joined.includes(' get namespace ') || (joined.includes(' get ') && args.includes('namespace'))) {
      const nameIndex = args.indexOf('namespace');
      const name = args[nameIndex + 1];
      const label = namespaceLabels[name];
      if (label === 'foreign') {
        return {
          ok: true,
          status: 0,
          stdout: JSON.stringify({
            metadata: { name, labels: { 'offscreen.rpg/lab': 'foreign' } },
          }),
          stderr: '',
          timedOut: false,
          missing: false,
        };
      }
      if (label === 'absent') {
        return { ok: true, status: 0, stdout: '', stderr: '', timedOut: false, missing: false };
      }
      return {
        ok: true,
        status: 0,
        stdout: JSON.stringify({
          metadata: {
            name,
            labels: { 'offscreen.rpg/lab': label ?? 'disposable' },
          },
        }),
        stderr: '',
        timedOut: false,
        missing: false,
      };
    }

    if (
      args.includes('lab-postgres') &&
      args.includes('lab-pg-app') &&
      args.includes('secret')
    ) {
      return {
        ok: true,
        status: 0,
        stdout: JSON.stringify({
          metadata: {
            name: 'lab-pg-app',
            namespace: 'lab-postgres',
            labels: { 'offscreen.rpg/lab': 'disposable' },
          },
          data: { uri: Buffer.from(backingPgUri).toString('base64') },
        }),
        stderr: '',
        timedOut: false,
        missing: false,
      };
    }

    if (
      args.includes('lab-objects') &&
      args.includes('object-store-s3') &&
      args.includes('secret')
    ) {
      return {
        ok: true,
        status: 0,
        stdout: JSON.stringify({
          metadata: {
            name: 'object-store-s3',
            namespace: 'lab-objects',
            labels: { 'offscreen.rpg/lab': 'disposable' },
          },
          data: {
            'access-key-id': Buffer.from(backingS3['access-key-id']).toString('base64'),
            'secret-access-key': Buffer.from(backingS3['secret-access-key']).toString('base64'),
          },
        }),
        stderr: '',
        timedOut: false,
        missing: false,
      };
    }

    for (const namespace of APP_NAMESPACES) {
      for (const secretName of ['game-db', 'game-runtime']) {
        const key = `${namespace}/${secretName}`;
        const entry = secrets[key];
        if (
          namespacedTarget(args) === namespace &&
          namespacedSecretName(args) === secretName &&
          joined.includes('-o json')
        ) {
          const created = createdSecrets.get(key);
          if (!entry && !created) {
            return { ok: true, status: 0, stdout: '', stderr: '', timedOut: false, missing: false };
          }
          if (!entry && created) {
            return {
              ok: true,
              status: 0,
              stdout: JSON.stringify({
                metadata: {
                  name: secretName,
                  namespace,
                  uid: created.uid,
                  labels: { 'offscreen.rpg/lab': 'disposable' },
                },
                stringData: created.stringData,
              }),
              stderr: '',
              timedOut: false,
              missing: false,
            };
          }
          if (entry === 'unreadable') {
            return { ok: false, status: 1, stdout: '', stderr: '', timedOut: false, missing: false };
          }
          if (entry === 'foreign') {
            return {
              ok: true,
              status: 0,
              stdout: JSON.stringify({
                metadata: {
                  name: secretName,
                  namespace,
                  uid: 'foreign',
                  labels: { 'offscreen.rpg/lab': 'foreign' },
                },
              }),
              stderr: '',
              timedOut: false,
              missing: false,
            };
          }
          const uid = entry.uid ?? `uid-${key}`;
          return {
            ok: true,
            status: 0,
            stdout: JSON.stringify({
              metadata: {
                name: secretName,
                namespace,
                uid,
                labels: { 'offscreen.rpg/lab': 'disposable' },
              },
              stringData: entry.stringData,
              data: entry.data,
            }),
            stderr: '',
            timedOut: false,
            missing: false,
          };
        }
      }
    }

    return { ok: false, status: 2, stdout: '', stderr: `unexpected: ${joined}`, timedOut: false, missing: false };
  }

  return { run, invocations };
}

test('parseRootDotEnv requires three keys and minimum auth length', () => {
  const root = mkdtempSync(join(tmpdir(), 'release-env-'));
  writeEnv(root, [
    'GITHUB_CLIENT_ID=id',
    'GITHUB_CLIENT_SECRET=sec',
    'BETTER_AUTH_SECRET=short',
  ]);
  assert.throws(() => assertApprovedLocalEnv(parseRootDotEnv(root)), /at least 32/);
  writeEnv(root, ['GITHUB_CLIENT_ID=id']);
  assert.throws(
    () => assertApprovedLocalEnv(parseRootDotEnv(root)),
    /GITHUB_CLIENT_SECRET, BETTER_AUTH_SECRET/,
  );
});

test('fresh install creates all absent secrets once', () => {
  const root = mkdtempSync(join(tmpdir(), 'release-fresh-'));
  writeEnv(root, [
    'GITHUB_CLIENT_ID=id',
    'GITHUB_CLIENT_SECRET=sec',
    `BETTER_AUTH_SECRET=${'x'.repeat(32)}`,
  ]);
  const { run, invocations } = stubPlatformRun({ secrets: {} });
  const receipt = ensureReleaseCredentials({
    repoRoot: root,
    run,
    randomToken: () => 'd'.repeat(48),
  });
  assert.equal(receipt.ok, true);
  assert.equal(receipt.mutations, 6);
  const creates = invocations.filter((item) => item.args.includes('create') && item.args.includes('-f'));
  assert.equal(creates.length, 6);
});

test('partial consistent reuse creates only missing projections', () => {
  const root = mkdtempSync(join(tmpdir(), 'release-partial-'));
  writeEnv(root, [
    'GITHUB_CLIENT_ID=id',
    'GITHUB_CLIENT_SECRET=sec',
    `BETTER_AUTH_SECRET=${'y'.repeat(32)}`,
  ]);
  const runtime = {
    'access-key-id': 'key',
    'secret-access-key': 'sek',
    'better-auth-secret': 'y'.repeat(32),
    'github-client-id': 'id',
    'github-client-secret': 'sec',
    ...TOKENS,
  };
  const { run, invocations } = stubPlatformRun({
    secrets: {
      'lab-edge/game-db': { data: { uri: Buffer.from('postgresql://lab/app').toString('base64') } },
      'lab-edge/game-runtime': { stringData: runtime },
      'lab-authority/game-runtime': { stringData: runtime },
    },
  });
  const receipt = ensureReleaseCredentials({ repoRoot: root, run });
  assert.equal(receipt.mutations, 3);
  const creates = invocations.filter((item) => item.args.includes('create') && item.args.includes('-f'));
  assert.equal(creates.length, 3);
});

test('conflicting tokens refuse with zero kubectl creates', () => {
  const root = mkdtempSync(join(tmpdir(), 'release-conflict-'));
  writeEnv(root, [
    'GITHUB_CLIENT_ID=id',
    'GITHUB_CLIENT_SECRET=sec',
    `BETTER_AUTH_SECRET=${'z'.repeat(32)}`,
  ]);
  const runtimeA = {
    'access-key-id': 'key',
    'secret-access-key': 'sek',
    'better-auth-secret': 'z'.repeat(32),
    'github-client-id': 'id',
    'github-client-secret': 'sec',
    ...TOKENS,
  };
  const runtimeB = {
    ...runtimeA,
    'game-authority-service-token': 'f'.repeat(48),
  };
  const { run, invocations } = stubPlatformRun({
    secrets: {
      'lab-edge/game-runtime': { stringData: runtimeA },
      'lab-workers/game-runtime': { stringData: runtimeB },
    },
  });
  assert.throws(
    () => ensureReleaseCredentials({ repoRoot: root, run }),
    /game-authority-service-token/,
  );
  assert.equal(
    invocations.some((item) => item.args.includes('create') && item.args.includes('-f')),
    false,
  );
});

test('denied secret read refuses with zero mutations', () => {
  const root = mkdtempSync(join(tmpdir(), 'release-denied-'));
  writeEnv(root, [
    'GITHUB_CLIENT_ID=id',
    'GITHUB_CLIENT_SECRET=sec',
    `BETTER_AUTH_SECRET=${'a'.repeat(32)}`,
  ]);
  const { run, invocations } = stubPlatformRun({
    secrets: {},
    denyReads: [['get', 'secret', 'game-db']],
  });
  assert.throws(() => ensureReleaseCredentials({ repoRoot: root, run }), /unreadable/);
  assert.equal(
    invocations.some((item) => item.args.includes('create') && item.args.includes('-f')),
    false,
  );
});

test('database uri drift refuses before create', () => {
  const root = mkdtempSync(join(tmpdir(), 'release-drift-'));
  writeEnv(root, [
    'GITHUB_CLIENT_ID=id',
    'GITHUB_CLIENT_SECRET=sec',
    `BETTER_AUTH_SECRET=${'b'.repeat(32)}`,
  ]);
  const { run, invocations } = stubPlatformRun({
    secrets: {
      'lab-edge/game-db': {
        data: { uri: Buffer.from('postgresql://wrong/db').toString('base64') },
      },
    },
  });
  assert.throws(() => ensureReleaseCredentials({ repoRoot: root, run }), /uri/);
  assert.equal(
    invocations.some((item) => item.args.includes('create') && item.args.includes('-f')),
    false,
  );
});

test('reconcileTokenFields and decodeSecretStringData', () => {
  const decoded = decodeSecretStringData({
    data: { uri: Buffer.from('postgresql://x').toString('base64') },
    stringData: { note: 'n' },
  });
  assert.equal(decoded.uri, 'postgresql://x');
  assert.equal(decoded.note, 'n');
  const chosen = reconcileTokenFields(
    [{ 'game-authority-service-token': TOKENS['game-authority-service-token'] }, null],
    ['game-authority-service-token'],
  );
  assert.equal(chosen['game-authority-service-token'], TOKENS['game-authority-service-token']);
  assert.throws(
    () =>
      reconcileTokenFields(
        [
          { 'game-authority-control-token': 'a'.repeat(48) },
          { 'game-authority-control-token': 'b'.repeat(48) },
        ],
        ['game-authority-control-token'],
      ),
    /game-authority-control-token/,
  );
});

test('mismatchedFieldNames reports oauth drift without values', () => {
  const names = mismatchedFieldNames(
    { 'github-client-id': 'old' },
    { 'github-client-id': 'new' },
    ['github-client-id'],
  );
  assert.deepEqual(names, ['github-client-id']);
});