import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, chmodSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { DEV_CLUSTER_OWNER } from '../../../clusters/kind/manager/dev-bootstrap.mjs';
import { readKindProfile } from '../../../clusters/kind/manager/config.mjs';
import { captureIdentity, recheckIdentity } from '../identity.mjs';

const devKind = readKindProfile('dev');
const devPort = 24443;

function kubectlConfigJson(profileId, port) {
  const kind = readKindProfile(profileId);
  const cluster = `kind-${kind.clusterName}`;
  return JSON.stringify({
    apiVersion: 'v1',
    kind: 'Config',
    clusters: [
      {
        name: cluster,
        cluster: {
          server: `https://127.0.0.1:${port}`,
          'certificate-authority-data': 'Y2E=',
        },
      },
    ],
    contexts: [
      {
        name: kind.contextName,
        context: { cluster, user: cluster },
      },
    ],
    'current-context': kind.contextName,
    users: [
      {
        name: cluster,
        user: {
          'client-certificate-data': 'Y2VydA==',
          'client-key-data': 'a2V5',
        },
      },
    ],
  });
}

/**
 * @param {Array<{ command: string, args: string[], result: object }>} script
 */
function makeRunner(script) {
  const map = new Map(
    script.map((entry) => [
      `${entry.command}\0${entry.args.join('\0')}`,
      entry.result,
    ]),
  );
  return {
    run(command, args) {
      const hit = map.get(`${command}\0${args.join('\0')}`);
      if (!hit) {
        return {
          ok: false,
          status: 1,
          stdout: '',
          stderr: 'unexpected',
          timedOut: false,
          missing: false,
        };
      }
      return hit;
    },
  };
}

function devIdentityScript(port = devPort) {
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
        'config',
        'view',
        '--minify',
        '--raw',
        '--flatten',
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
        'offscreen-dev-system',
        '--ignore-not-found',
        '-o',
        'json',
      ],
      result: {
        ok: true,
        status: 0,
        stdout: JSON.stringify({
          metadata: {
            name: 'offscreen-dev-system',
            uid: 'dev-baseline-uid',
            labels: { 'offscreen.dev/owner': DEV_CLUSTER_OWNER },
          },
        }),
        stderr: '',
        timedOut: false,
        missing: false,
      },
    },
    {
      command: 'docker',
      args: ['context', 'show'],
      result: {
        ok: true,
        status: 0,
        stdout: 'default\n',
        stderr: '',
        timedOut: false,
        missing: false,
      },
    },
    {
      command: 'docker',
      args: [
        'context',
        'inspect',
        'default',
        '--format',
        '{{json .Endpoints.docker.Host}}',
      ],
      result: {
        ok: true,
        status: 0,
        stdout: '"unix:///var/run/docker.sock"\n',
        stderr: '',
        timedOut: false,
        missing: false,
      },
    },
    {
      command: 'docker',
      args: ['inspect', `${devKind.clusterName}-control-plane`],
      result: {
        ok: true,
        status: 0,
        stdout: JSON.stringify([
          {
            Id: 'cp-container-id',
            State: { Running: true },
            Config: {
              Labels: {
                'io.x-k8s.kind.cluster': devKind.clusterName,
                'io.x-k8s.kind.role': 'control-plane',
              },
            },
            NetworkSettings: {
              Ports: {
                '6443/tcp': [{ HostIp: '127.0.0.1', HostPort: String(port) }],
              },
            },
          },
        ]),
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
        'kube-system',
        '--ignore-not-found',
        '-o',
        'json',
      ],
      result: {
        ok: true,
        status: 0,
        stdout: JSON.stringify({ metadata: { uid: 'kube-system-uid' } }),
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
        'offscreen-dev-observability',
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
  ];
}

test('captureIdentity binds tuple and private snapshot', () => {
  let clock = 0;
  const root = mkdtempSync(join(tmpdir(), 'obs-id-test-'));
  const { run } = makeRunner(devIdentityScript());
  const identity = captureIdentity('dev', devKind.contextName, {
    run,
    now: () => clock,
    deadline: 100_000,
    snapshotRoot: root,
  });
  assert.equal(identity.contextName, devKind.contextName);
  assert.equal(identity.namespace, 'offscreen-dev-observability');
  assert.equal(identity.tuple.dockerControlPlaneId, 'cp-container-id');
  assert.equal(identity.tuple.kubeSystemUid, 'kube-system-uid');
  assert.equal(identity.tuple.baselineUid, 'dev-baseline-uid');
  assert.equal(identity.tuple.targetNamespaceUid, null);
  assert.match(identity.snapshotPath, /snapshot\.json$/);
  assert.equal(
    JSON.parse(readFileSync(identity.snapshotPath, 'utf8')).users[0].user[
      'client-key-data'
    ],
    'a2V5',
  );
  const cleanup = identity.cleanup();
  assert.equal(cleanup.ok, true);
});

test('recheckIdentity rejects changed selected context', () => {
  const root = mkdtempSync(join(tmpdir(), 'obs-id-recheck-'));
  writeFileSync(
    join(root, 'snapshot.json'),
    `${kubectlConfigJson('dev', devPort)}\n`,
    { mode: 0o600 },
  );
  chmodSync(join(root, 'snapshot.json'), 0o600);
  const identity = {
    profileId: 'dev',
    clusterName: devKind.clusterName,
    contextName: devKind.contextName,
    namespace: 'offscreen-dev-observability',
    tuple: {
      port: devPort,
      targetNamespaceUid: null,
    },
    snapshotPath: join(root, 'snapshot.json'),
    cleanup: () => ({ ok: true }),
  };
  const { run } = makeRunner([
    {
      command: 'kubectl',
      args: ['--context', devKind.contextName, 'config', 'current-context'],
      result: {
        ok: true,
        status: 0,
        stdout: 'other-context\n',
        stderr: '',
        timedOut: false,
        missing: false,
      },
    },
  ]);
  const result = recheckIdentity(identity, {
    run,
    now: () => 0,
    deadline: 30_000,
  });
  assert.equal(result.ok, false);
  assert.equal(result.reason, 'context-changed');
});

test('cleanup failure is observable on repeated cleanup error path', () => {
  let clock = 0;
  const root = mkdtempSync(join(tmpdir(), 'obs-id-cleanup-'));
  const { run } = makeRunner(devIdentityScript());
  const identity = captureIdentity('dev', devKind.contextName, {
    run,
    now: () => clock,
    deadline: 100_000,
    snapshotRoot: root,
  });
  const first = identity.cleanup();
  assert.equal(first.ok, true);
  const second = identity.cleanup();
  assert.equal(second.ok, true);
});
