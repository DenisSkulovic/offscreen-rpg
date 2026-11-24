import assert from 'node:assert/strict';
import test from 'node:test';
import {
  DEV_API_PORT_RANGE,
  RELEASE_API_PORT,
  readKindProfile,
} from '../../../clusters/kind/manager/config.mjs';
import {
  DEV_BASELINE_NAMESPACE,
  DEV_CLUSTER_OWNER,
} from '../../../clusters/kind/manager/dev-bootstrap.mjs';
import {
  assertPlatformTarget,
  readPlatformObject,
  runPlatformCommand,
} from '../commands.mjs';
import { readPlatformProfile } from '../profile.mjs';

const devKind = readKindProfile('dev');
const releaseKind = readKindProfile('release');
const devPort = DEV_API_PORT_RANGE.start;

const MUTATING_KUBECTL = new Set([
  'apply',
  'create',
  'delete',
  'patch',
  'replace',
  'edit',
  'scale',
  'rollout',
]);

/**
 * @param {Array<{ command: string, args: string[], result?: object }>} script
 */
function makeRunner(script) {
  /** @type {{ command: string, args: string[] }[]} */
  const calls = [];
  /** @type {Map<string, object>} */
  const keyed = new Map(
    script.map((entry) => [
      `${entry.command}\0${entry.args.join('\0')}`,
      entry.result,
    ]),
  );

  const run = (command, args) => {
    calls.push({ command, args });
    if (command === 'kubectl') {
      for (const arg of args) {
        if (MUTATING_KUBECTL.has(arg)) {
          throw new Error(`unexpected mutating kubectl command: ${arg}`);
        }
      }
      if (args.includes('current-context')) {
        throw new Error('ambient current-context lookup is forbidden');
      }
    }
    const key = `${command}\0${args.join('\0')}`;
    const scripted = keyed.get(key);
    if (scripted) return scripted;
    return {
      ok: false,
      status: 1,
      stdout: '',
      stderr: 'unscripted',
      timedOut: false,
      missing: false,
    };
  };

  return { run, calls };
}

/**
 * @param {'dev' | 'release'} profileId
 * @param {number} port
 */
function kubectlConfigJson(profileId, port) {
  const kind = readKindProfile(profileId);
  return JSON.stringify({
    clusters: [
      {
        name: kind.clusterName,
        cluster: { server: `https://127.0.0.1:${port}` },
      },
    ],
    contexts: [
      {
        name: kind.contextName,
        context: {
          cluster: kind.clusterName,
          user: `kind-${kind.clusterName}`,
        },
      },
    ],
    users: [{ name: `kind-${kind.clusterName}`, user: {} }],
  });
}

/**
 * @param {'dev' | 'release'} profileId
 * @param {number} port
 */
function devTargetScript(port = devPort) {
  return [
    {
      command: 'kind',
      args: ['get', 'clusters'],
      result: {
        ok: true,
        status: 0,
        stdout: `${devKind.clusterName}\n`,
        stderr: '',
        timedOut: false,
        missing: false,
      },
    },
    {
      command: 'kubectl',
      args: [
        '--context',
        devKind.contextName,
        'config',
        'view',
        '--minify',
        '-o',
        'json',
      ],
      result: {
        ok: true,
        status: 0,
        stdout: kubectlConfigJson('dev', port),
        stderr: '',
        timedOut: false,
        missing: false,
      },
    },
    {
      command: 'kubectl',
      args: [
        '--context',
        devKind.contextName,
        'get',
        'namespace',
        DEV_BASELINE_NAMESPACE,
        '--ignore-not-found',
        '-o',
        'json',
      ],
      result: {
        ok: true,
        status: 0,
        stdout: JSON.stringify({
          apiVersion: 'v1',
          kind: 'Namespace',
          metadata: {
            name: DEV_BASELINE_NAMESPACE,
            uid: 'dev-baseline-uid',
            labels: { 'offscreen.dev/owner': DEV_CLUSTER_OWNER },
          },
        }),
        stderr: '',
        timedOut: false,
        missing: false,
      },
    },
  ];
}

test('readPlatformProfile accepts dev and release with frozen fields', () => {
  const dev = readPlatformProfile('dev');
  assert.equal(dev.id, 'dev');
  assert.equal(dev.clusterName, devKind.clusterName);
  assert.equal(dev.contextName, devKind.contextName);
  assert.equal(dev.storageClass, 'standard');
  assert.equal(dev.ownerLabel, 'offscreen.dev');
  assert.equal(dev.ownerValue, DEV_CLUSTER_OWNER);
  assert.deepEqual(dev.namespaces, {
    postgres: 'offscreen-dev-postgres',
    temporal: 'offscreen-dev-temporal',
    objectStorage: 'offscreen-dev-objects',
  });

  const release = readPlatformProfile('release');
  assert.equal(release.storageClass, 'local-path');
  assert.equal(release.ownerLabel, 'offscreen.rpg');
  assert.equal(release.ownerValue, 'disposable');
  assert.deepEqual(release.namespaces, {
    postgres: 'lab-postgres',
    temporal: 'lab-temporal',
    objectStorage: 'lab-objects',
  });
});

test('readPlatformProfile rejects unknown profile ids', () => {
  assert.throws(
    () => readPlatformProfile('staging'),
    /unsupported platform profile/,
  );
});

test('readPlatformObject reports absent on successful empty stdout', () => {
  const { run } = makeRunner([
    {
      command: 'kubectl',
      args: [
        '--context',
        devKind.contextName,
        'get',
        'secret',
        '-n',
        'offscreen-dev-postgres',
        'missing',
        '--ignore-not-found',
        '-o',
        'json',
      ],
      result: {
        ok: true,
        status: 0,
        stdout: '\n',
        stderr: '',
        timedOut: false,
        missing: false,
      },
    },
  ]);
  const result = readPlatformObject(
    {
      profileId: 'dev',
      resource: 'secret',
      name: 'missing',
      namespace: 'offscreen-dev-postgres',
    },
    { run },
  );
  assert.deepEqual(result, { state: 'absent' });
});

test('readPlatformObject reports present object with identity checks', () => {
  const body = {
    apiVersion: 'v1',
    kind: 'Namespace',
    metadata: {
      name: 'lab-postgres',
      labels: { 'offscreen.rpg/lab': 'disposable' },
    },
  };
  const { run } = makeRunner([
    {
      command: 'kubectl',
      args: [
        '--context',
        releaseKind.contextName,
        'get',
        'namespace',
        'lab-postgres',
        '--ignore-not-found',
        '-o',
        'json',
      ],
      result: {
        ok: true,
        status: 0,
        stdout: JSON.stringify(body),
        stderr: '',
        timedOut: false,
        missing: false,
      },
    },
  ]);
  const result = readPlatformObject(
    { profileId: 'release', resource: 'namespace', name: 'lab-postgres' },
    { run },
  );
  assert.equal(result.state, 'present');
  assert.deepEqual(result.object, body);
});

test('readPlatformObject unreadable on permission failure timeout and malformed output', () => {
  const permission = makeRunner([
    {
      command: 'kubectl',
      args: [
        '--context',
        devKind.contextName,
        'get',
        'secret',
        '-n',
        'offscreen-dev-postgres',
        'db',
        '--ignore-not-found',
        '-o',
        'json',
      ],
      result: {
        ok: false,
        status: 1,
        stdout: '',
        stderr: 'Forbidden',
        timedOut: false,
        missing: false,
      },
    },
  ]).run;
  assert.deepEqual(
    readPlatformObject(
      {
        profileId: 'dev',
        resource: 'secret',
        name: 'db',
        namespace: 'offscreen-dev-postgres',
      },
      { run: permission },
    ),
    { state: 'unreadable', reason: 'kubectl get failed' },
  );

  const timeout = makeRunner([
    {
      command: 'kubectl',
      args: [
        '--context',
        devKind.contextName,
        'get',
        'secret',
        '-n',
        'offscreen-dev-postgres',
        'db',
        '--ignore-not-found',
        '-o',
        'json',
      ],
      result: {
        ok: false,
        status: null,
        stdout: '',
        stderr: '',
        timedOut: true,
        missing: false,
      },
    },
  ]).run;
  assert.deepEqual(
    readPlatformObject(
      {
        profileId: 'dev',
        resource: 'secret',
        name: 'db',
        namespace: 'offscreen-dev-postgres',
      },
      { run: timeout },
    ),
    { state: 'unreadable', reason: 'kubectl timed out' },
  );

  const malformed = makeRunner([
    {
      command: 'kubectl',
      args: [
        '--context',
        devKind.contextName,
        'get',
        'secret',
        '-n',
        'offscreen-dev-postgres',
        'db',
        '--ignore-not-found',
        '-o',
        'json',
      ],
      result: {
        ok: true,
        status: 0,
        stdout: '{not json',
        stderr: '',
        timedOut: false,
        missing: false,
      },
    },
  ]).run;
  assert.deepEqual(
    readPlatformObject(
      {
        profileId: 'dev',
        resource: 'secret',
        name: 'db',
        namespace: 'offscreen-dev-postgres',
      },
      { run: malformed },
    ),
    { state: 'unreadable', reason: 'malformed json' },
  );
});

test('readPlatformObject unreadable on wrong object identity', () => {
  const { run } = makeRunner([
    {
      command: 'kubectl',
      args: [
        '--context',
        devKind.contextName,
        'get',
        'secret',
        '-n',
        'offscreen-dev-postgres',
        'db',
        '--ignore-not-found',
        '-o',
        'json',
      ],
      result: {
        ok: true,
        status: 0,
        stdout: JSON.stringify({
          metadata: { name: 'other', namespace: 'offscreen-dev-postgres' },
        }),
        stderr: '',
        timedOut: false,
        missing: false,
      },
    },
  ]);
  const result = readPlatformObject(
    {
      profileId: 'dev',
      resource: 'secret',
      name: 'db',
      namespace: 'offscreen-dev-postgres',
    },
    { run },
  );
  assert.deepEqual(result, { state: 'unreadable', reason: 'name mismatch' });
});

test('assertPlatformTarget accepts healthy dev and release targets', () => {
  const devRunner = makeRunner(devTargetScript());
  const dev = assertPlatformTarget('dev', { run: devRunner.run });
  assert.equal(dev.ok, true);
  assert.equal(dev.port, devPort);

  const releaseRunner = makeRunner([
    {
      command: 'kind',
      args: ['get', 'clusters'],
      result: {
        ok: true,
        status: 0,
        stdout: `${releaseKind.clusterName}\n`,
        stderr: '',
        timedOut: false,
        missing: false,
      },
    },
    {
      command: 'kubectl',
      args: [
        '--context',
        releaseKind.contextName,
        'config',
        'view',
        '--minify',
        '-o',
        'json',
      ],
      result: {
        ok: true,
        status: 0,
        stdout: kubectlConfigJson('release', RELEASE_API_PORT),
        stderr: '',
        timedOut: false,
        missing: false,
      },
    },
    {
      command: 'kubectl',
      args: [
        '--context',
        releaseKind.contextName,
        'get',
        'namespace',
        'lab-postgres',
        '--ignore-not-found',
        '-o',
        'json',
      ],
      result: {
        ok: true,
        status: 0,
        stdout: JSON.stringify({
          metadata: {
            name: 'lab-postgres',
            labels: { 'offscreen.rpg/lab': 'disposable' },
          },
        }),
        stderr: '',
        timedOut: false,
        missing: false,
      },
    },
  ]);
  const release = assertPlatformTarget('release', { run: releaseRunner.run });
  assert.equal(release.ok, true);
  assert.equal(release.port, RELEASE_API_PORT);
});

test('assertPlatformTarget rejects wrong profile context loopback port and missing dev owner', () => {
  assert.throws(
    () => readPlatformProfile('prod'),
    /unsupported platform profile/,
  );

  const missingCluster = makeRunner([
    {
      command: 'kind',
      args: ['get', 'clusters'],
      result: {
        ok: true,
        status: 0,
        stdout: 'other-cluster\n',
        stderr: '',
        timedOut: false,
        missing: false,
      },
    },
  ]);
  assert.throws(
    () => assertPlatformTarget('dev', { run: missingCluster.run }),
    /not found/,
  );

  const wrongContext = makeRunner([
    {
      command: 'kind',
      args: ['get', 'clusters'],
      result: {
        ok: true,
        status: 0,
        stdout: `${devKind.clusterName}\n`,
        stderr: '',
        timedOut: false,
        missing: false,
      },
    },
    {
      command: 'kubectl',
      args: [
        '--context',
        devKind.contextName,
        'config',
        'view',
        '--minify',
        '-o',
        'json',
      ],
      result: {
        ok: true,
        status: 0,
        stdout: JSON.stringify({
          clusters: [
            {
              name: 'foreign-cluster',
              cluster: { server: `https://127.0.0.1:${devPort}` },
            },
          ],
          contexts: [
            {
              name: devKind.contextName,
              context: {
                cluster: 'foreign-cluster',
                user: `kind-${devKind.clusterName}`,
              },
            },
          ],
        }),
        stderr: '',
        timedOut: false,
        missing: false,
      },
    },
  ]);
  assert.throws(
    () => assertPlatformTarget('dev', { run: wrongContext.run }),
    /cluster mismatch/,
  );

  const devReleasePort = makeRunner(devTargetScript(RELEASE_API_PORT));
  assert.throws(
    () => assertPlatformTarget('dev', { run: devReleasePort.run }),
    /must not use release loopback port/,
  );

  const releaseWrongPort = makeRunner([
    {
      command: 'kind',
      args: ['get', 'clusters'],
      result: {
        ok: true,
        status: 0,
        stdout: `${releaseKind.clusterName}\n`,
        stderr: '',
        timedOut: false,
        missing: false,
      },
    },
    {
      command: 'kubectl',
      args: [
        '--context',
        releaseKind.contextName,
        'config',
        'view',
        '--minify',
        '-o',
        'json',
      ],
      result: {
        ok: true,
        status: 0,
        stdout: kubectlConfigJson('release', DEV_API_PORT_RANGE.start),
        stderr: '',
        timedOut: false,
        missing: false,
      },
    },
  ]);
  assert.throws(
    () => assertPlatformTarget('release', { run: releaseWrongPort.run }),
    /requires loopback port 6443/,
  );

  const missingOwnerRunner = makeRunner([
    {
      command: 'kind',
      args: ['get', 'clusters'],
      result: {
        ok: true,
        status: 0,
        stdout: `${devKind.clusterName}\n`,
        stderr: '',
        timedOut: false,
        missing: false,
      },
    },
    {
      command: 'kubectl',
      args: [
        '--context',
        devKind.contextName,
        'config',
        'view',
        '--minify',
        '-o',
        'json',
      ],
      result: {
        ok: true,
        status: 0,
        stdout: kubectlConfigJson('dev', devPort),
        stderr: '',
        timedOut: false,
        missing: false,
      },
    },
    {
      command: 'kubectl',
      args: [
        '--context',
        devKind.contextName,
        'get',
        'namespace',
        DEV_BASELINE_NAMESPACE,
        '--ignore-not-found',
        '-o',
        'json',
      ],
      result: {
        ok: true,
        status: 0,
        stdout: JSON.stringify({
          metadata: { name: DEV_BASELINE_NAMESPACE, uid: 'uid', labels: {} },
        }),
        stderr: '',
        timedOut: false,
        missing: false,
      },
    },
  ]);
  assert.throws(
    () => assertPlatformTarget('dev', { run: missingOwnerRunner.run }),
    /owner or uid missing/,
  );
});

test('fake runner records zero kubectl mutations during assert and read flows', () => {
  const devRunner = makeRunner(devTargetScript());
  assertPlatformTarget('dev', { run: devRunner.run });
  for (const call of devRunner.calls) {
    if (call.command === 'kubectl') {
      const verbIndex =
        call.args.indexOf('config') >= 0
          ? call.args.indexOf('config')
          : call.args.indexOf('get');
      const verb = verbIndex >= 0 ? call.args[verbIndex] : null;
      assert.ok(
        verb === 'get' || verb === 'config',
        `unexpected kubectl verb ${verb}`,
      );
      assert.equal(call.args.includes('--context'), true);
    }
    if (call.command === 'kind') {
      assert.deepEqual(call.args, ['get', 'clusters']);
    }
  }

  const readRunner = makeRunner([
    {
      command: 'kubectl',
      args: [
        '--context',
        releaseKind.contextName,
        'get',
        'namespace',
        'lab-postgres',
        '--ignore-not-found',
        '-o',
        'json',
      ],
      result: {
        ok: true,
        status: 0,
        stdout: '',
        stderr: '',
        timedOut: false,
        missing: false,
      },
    },
  ]);
  readPlatformObject(
    { profileId: 'release', resource: 'namespace', name: 'lab-postgres' },
    { run: readRunner.run },
  );
  assert.equal(readRunner.calls.length, 1);
  assert.equal(readRunner.calls[0].command, 'kubectl');
  assert.equal(MUTATING_KUBECTL.has(readRunner.calls[0].args[1] ?? ''), false);
});

test('runPlatformCommand exposes status and missing semantics', () => {
  const missing = runPlatformCommand('definitely-missing-binary-inf09', [
    'noop',
  ]);
  assert.equal(missing.ok, false);
  assert.equal(missing.missing, true);
});
