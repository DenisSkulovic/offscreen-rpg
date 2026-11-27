import assert from 'node:assert/strict';
import { Buffer } from 'node:buffer';
import { createHash } from 'node:crypto';
import { lstatSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import process from 'node:process';
import test from 'node:test';
import {
  readKindProfile,
  RELEASE_API_PORT,
} from '../../../clusters/kind/manager/config.mjs';
import {
  DEV_BASELINE_NAMESPACE,
  DEV_CLUSTER_OWNER,
} from '../../../clusters/kind/manager/dev-bootstrap.mjs';
import {
  captureIdentity,
  recheckIdentity,
  runObservabilityReadCommand,
} from '../identity.mjs';

const devKind = readKindProfile('dev');
const releaseKind = readKindProfile('release');
const devPort = 24_443;

const CA_BYTES = Buffer.from('dev-cluster-ca-material');
const CERT_BYTES = Buffer.from('client-cert-material');
const KEY_BYTES = Buffer.from('client-key-material');
const CA_B64 = CA_BYTES.toString('base64');
const CERT_B64 = CERT_BYTES.toString('base64');
const KEY_B64 = KEY_BYTES.toString('base64');
const CA_SHA256 = createHash('sha256').update(CA_BYTES).digest('hex');

/**
 * @param {'dev' | 'release'} profileId
 * @param {number} port
 * @param {{ corruptCa?: boolean, missingUserRef?: boolean }} [opts]
 */
function kubectlConfigJson(profileId, port, opts = {}) {
  const kind = readKindProfile(profileId);
  const cluster = `kind-${kind.clusterName}`;
  const caData = opts.corruptCa ? 'Y2E' : CA_B64;
  const userRef = opts.missingUserRef ? 'missing-user' : cluster;
  return JSON.stringify({
    apiVersion: 'v1',
    kind: 'Config',
    'current-context': kind.contextName,
    clusters: [
      {
        name: cluster,
        cluster: {
          server: `https://127.0.0.1:${port}`,
          'certificate-authority-data': caData,
        },
      },
    ],
    contexts: [
      {
        name: kind.contextName,
        context: { cluster, user: userRef },
      },
    ],
    users: opts.missingUserRef
      ? [
          {
            name: cluster,
            user: {
              'client-certificate-data': CERT_B64,
              'client-key-data': KEY_B64,
            },
          },
        ]
      : [
          {
            name: cluster,
            user: {
              'client-certificate-data': CERT_B64,
              'client-key-data': KEY_B64,
            },
          },
        ],
  });
}

/**
 * @param {Array<{
 *   command: string,
 *   args?: string[],
 *   matchArgs?: (args: string[]) => boolean,
 *   result: object | ((ctx: { command: string, args: string[], options: object }) => object)
 * }>} script
 */
function makeTraceRunner(script) {
  return {
    /**
     * @param {string} command
     * @param {string[]} args
     */
    run(command, args, options = {}) {
      for (const entry of script) {
        if (entry.command !== command) {
          continue;
        }
        if (entry.matchArgs && !entry.matchArgs(args)) {
          continue;
        }
        if (entry.args && entry.args.join('\0') !== args.join('\0')) {
          continue;
        }
        return typeof entry.result === 'function'
          ? entry.result({ command, args, options })
          : entry.result;
      }
      return {
        ok: false,
        status: 1,
        stdout: '',
        stderr: `unexpected ${command} ${args.join(' ')}`,
        timedOut: false,
        missing: false,
      };
    },
  };
}

/**
 * @param {'dev' | 'release'} profileId
 * @param {number} port
 * @param {string} snapshotPath
 * @param {{ targetPresent?: boolean }} [opts]
 */
function identityScript(profileId, port, snapshotPath, opts = {}) {
  const kind = readKindProfile(profileId);
  const rawConfig = kubectlConfigJson(profileId, port);
  const kindYaml = rawConfig;
  const baseline =
    profileId === 'dev' ? DEV_BASELINE_NAMESPACE : 'offscreen-release-system';
  const baselineOwnerKey =
    profileId === 'dev' ? 'offscreen.dev/owner' : 'offscreen.rpg/lab';
  const baselineOwner = profileId === 'dev' ? DEV_CLUSTER_OWNER : 'disposable';
  const targetNs =
    profileId === 'dev'
      ? 'offscreen-dev-observability'
      : 'offscreen-observability';

  return [
    {
      command: 'kubectl',
      args: ['config', 'current-context'],
      result: {
        ok: true,
        status: 0,
        stdout: `${kind.contextName}\n`,
        stderr: '',
        timedOut: false,
        missing: false,
      },
    },
    {
      command: 'kind',
      args: ['get', 'clusters'],
      result: {
        ok: true,
        status: 0,
        stdout: `${kind.clusterName}\n`,
        stderr: '',
        timedOut: false,
        missing: false,
      },
    },
    {
      command: 'kubectl',
      args: [
        '--context',
        kind.contextName,
        'config',
        'view',
        '--minify',
        '-o',
        'json',
      ],
      result: {
        ok: true,
        status: 0,
        stdout: rawConfig,
        stderr: '',
        timedOut: false,
        missing: false,
      },
    },
    {
      command: 'kubectl',
      args: [
        '--context',
        kind.contextName,
        'get',
        'namespace',
        baseline,
        '--ignore-not-found',
        '-o',
        'json',
      ],
      result: {
        ok: true,
        status: 0,
        stdout: JSON.stringify({
          kind: 'Namespace',
          metadata: {
            name: baseline,
            uid: `${profileId}-baseline-uid`,
            labels: { [baselineOwnerKey]: baselineOwner },
          },
          status: { phase: 'Active' },
        }),
        stderr: '',
        timedOut: false,
        missing: false,
      },
    },
    {
      command: 'kubectl',
      args: [
        '--context',
        kind.contextName,
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
        stdout: rawConfig,
        stderr: '',
        timedOut: false,
        missing: false,
      },
    },
    {
      command: 'kind',
      args: ['get', 'kubeconfig', '--name', kind.clusterName],
      result: {
        ok: true,
        status: 0,
        stdout: kindYaml,
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
        stdout: `${profileId}-ctx\n`,
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
        `${profileId}-ctx`,
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
      args: ['inspect', `${kind.clusterName}-control-plane`],
      result: {
        ok: true,
        status: 0,
        stdout: JSON.stringify([
          {
            Id: `${profileId}-cp-id`,
            State: { Running: true },
            Config: {
              Labels: {
                'io.x-k8s.kind.cluster': kind.clusterName,
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
      matchArgs: (args) =>
        args.includes('--kubeconfig') &&
        args.includes(snapshotPath) &&
        args.includes('kube-system'),
      result: {
        ok: true,
        status: 0,
        stdout: JSON.stringify({
          kind: 'Namespace',
          metadata: { name: 'kube-system', uid: 'kube-system-uid' },
          status: { phase: 'Active' },
        }),
        stderr: '',
        timedOut: false,
        missing: false,
      },
    },
    {
      command: 'kubectl',
      matchArgs: (args) =>
        args.includes('--kubeconfig') &&
        args.includes(snapshotPath) &&
        args.includes(baseline),
      result: {
        ok: true,
        status: 0,
        stdout: JSON.stringify({
          kind: 'Namespace',
          metadata: {
            name: baseline,
            uid: `${profileId}-baseline-uid`,
            labels: { [baselineOwnerKey]: baselineOwner },
          },
          status: { phase: 'Active' },
        }),
        stderr: '',
        timedOut: false,
        missing: false,
      },
    },
    {
      command: 'kubectl',
      matchArgs: (args) =>
        args.includes('--kubeconfig') &&
        args.includes(snapshotPath) &&
        args.includes(targetNs),
      result: opts.targetPresent
        ? {
            ok: true,
            status: 0,
            stdout: JSON.stringify({
              kind: 'Namespace',
              metadata: {
                name: targetNs,
                uid: 'target-ns-uid',
              },
              status: { phase: 'Active' },
            }),
            stderr: '',
            timedOut: false,
            missing: false,
          }
        : {
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

function recheckScriptFromCapture(identity) {
  const raw = readFileSync(identity.snapshotPath, 'utf8');
  const kindYaml = raw;
  return [
    {
      command: 'kubectl',
      args: ['config', 'current-context'],
      result: {
        ok: true,
        status: 0,
        stdout: `${identity.contextName}\n`,
        stderr: '',
        timedOut: false,
        missing: false,
      },
    },
    {
      command: 'kubectl',
      args: [
        '--context',
        identity.contextName,
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
        stdout: raw,
        stderr: '',
        timedOut: false,
        missing: false,
      },
    },
    {
      command: 'kind',
      args: ['get', 'kubeconfig', '--name', identity.clusterName],
      result: {
        ok: true,
        status: 0,
        stdout: kindYaml,
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
        stdout: `${identity.tuple.dockerContext}\n`,
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
        identity.tuple.dockerContext,
        '--format',
        '{{json .Endpoints.docker.Host}}',
      ],
      result: {
        ok: true,
        status: 0,
        stdout: JSON.stringify(identity.tuple.dockerEndpointHost),
        stderr: '',
        timedOut: false,
        missing: false,
      },
    },
    {
      command: 'docker',
      args: ['inspect', `${identity.clusterName}-control-plane`],
      result: {
        ok: true,
        status: 0,
        stdout: JSON.stringify([
          {
            Id: identity.tuple.dockerControlPlaneId,
            State: { Running: true },
            Config: {
              Labels: {
                'io.x-k8s.kind.cluster': identity.clusterName,
                'io.x-k8s.kind.role': 'control-plane',
              },
            },
            NetworkSettings: {
              Ports: {
                '6443/tcp': [
                  {
                    HostIp: '127.0.0.1',
                    HostPort: String(identity.tuple.port),
                  },
                ],
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
      matchArgs: (args) =>
        args.includes(identity.snapshotPath) && args.includes('kube-system'),
      result: {
        ok: true,
        status: 0,
        stdout: JSON.stringify({
          kind: 'Namespace',
          metadata: {
            name: 'kube-system',
            uid: identity.tuple.kubeSystemUid,
          },
          status: { phase: 'Active' },
        }),
        stderr: '',
        timedOut: false,
        missing: false,
      },
    },
    {
      command: 'kubectl',
      matchArgs: (args) =>
        args.includes(identity.snapshotPath) &&
        args.includes(
          identity.profileId === 'dev'
            ? DEV_BASELINE_NAMESPACE
            : 'offscreen-release-system',
        ),
      result: {
        ok: true,
        status: 0,
        stdout: JSON.stringify({
          kind: 'Namespace',
          metadata: {
            name:
              identity.profileId === 'dev'
                ? DEV_BASELINE_NAMESPACE
                : 'offscreen-release-system',
            uid: identity.tuple.baselineUid,
            labels:
              identity.profileId === 'dev'
                ? { 'offscreen.dev/owner': DEV_CLUSTER_OWNER }
                : { 'offscreen.rpg/lab': 'disposable' },
          },
          status: { phase: 'Active' },
        }),
        stderr: '',
        timedOut: false,
        missing: false,
      },
    },
    {
      command: 'kubectl',
      matchArgs: (args) =>
        args.includes(identity.snapshotPath) &&
        args.includes(identity.namespace),
      result:
        identity.tuple.targetNamespaceUid == null
          ? {
              ok: true,
              status: 0,
              stdout: '',
              stderr: '',
              timedOut: false,
              missing: false,
            }
          : {
              ok: true,
              status: 0,
              stdout: JSON.stringify({
                kind: 'Namespace',
                metadata: {
                  name: identity.namespace,
                  uid: identity.tuple.targetNamespaceUid,
                },
                status: { phase: 'Active' },
              }),
              stderr: '',
              timedOut: false,
              missing: false,
            },
    },
  ];
}

test('captureIdentity binds full tuple and private snapshot', () => {
  const root = mkdtempSync(join(tmpdir(), 'obs-id-test-'));
  const snapshotPath = join(root, 'snapshot.json');
  const { run } = makeTraceRunner(identityScript('dev', devPort, snapshotPath));
  const identity = captureIdentity('dev', devKind.contextName, {
    run,
    now: () => 0,
    deadline: 100_000,
    snapshotRoot: root,
  });
  assert.equal(identity.tuple.caSha256, CA_SHA256);
  assert.equal(identity.tuple.dockerContext, 'dev-ctx');
  assert.equal(identity.tuple.dockerControlPlaneId, 'dev-cp-id');
  assert.equal(identity.tuple.targetNamespaceUid, null);
  const stat = lstatSync(identity.snapshotPath);
  assert.equal(stat.mode & 0o777, 0o600);
  assert.equal(identity.snapshotSha256.length, 64);
  const cleanup = identity.cleanup();
  assert.equal(cleanup.ok, true);
});

test('captureIdentity release profile', () => {
  const root = mkdtempSync(join(tmpdir(), 'obs-id-release-'));
  const snapshotPath = join(root, 'snapshot.json');
  const { run } = makeTraceRunner(
    identityScript('release', RELEASE_API_PORT, snapshotPath),
  );
  const identity = captureIdentity('release', releaseKind.contextName, {
    run,
    now: () => 0,
    deadline: 100_000,
    snapshotRoot: root,
  });
  assert.equal(identity.tuple.port, RELEASE_API_PORT);
  identity.cleanup();
});

test('captureIdentity rejects env override', () => {
  const previous = process.env.KUBECONFIG;
  process.env.KUBECONFIG = '/tmp/evil';
  try {
    assert.throws(
      () =>
        captureIdentity('dev', devKind.contextName, {
          run: () => ({
            ok: true,
            status: 0,
            stdout: '',
            stderr: '',
            timedOut: false,
            missing: false,
          }),
        }),
      /refused env: KUBECONFIG/,
    );
  } finally {
    if (previous === undefined) {
      delete process.env.KUBECONFIG;
    } else {
      process.env.KUBECONFIG = previous;
    }
  }
});

test('captureIdentity rejects noncanonical CA', () => {
  const root = mkdtempSync(join(tmpdir(), 'obs-id-ca-'));
  const snapshotPath = join(root, 'snapshot.json');
  const script = identityScript('dev', devPort, snapshotPath);
  const rawIdx = script.findIndex(
    (e) =>
      e.command === 'kubectl' &&
      e.args?.includes('--flatten') &&
      e.args?.includes('--raw'),
  );
  script[rawIdx].result.stdout = kubectlConfigJson('dev', devPort, {
    corruptCa: true,
  });
  const { run } = makeTraceRunner(script);
  assert.throws(
    () =>
      captureIdentity('dev', devKind.contextName, {
        run,
        now: () => 0,
        deadline: 100_000,
        snapshotRoot: root,
      }),
    /noncanonical certificate-authority-data base64/,
  );
});

test('captureIdentity rejects missing user reference', () => {
  const root = mkdtempSync(join(tmpdir(), 'obs-id-user-'));
  const snapshotPath = join(root, 'snapshot.json');
  const script = identityScript('dev', devPort, snapshotPath);
  for (const entry of script) {
    if (
      entry.command === 'kubectl' &&
      entry.args?.includes('--raw') &&
      entry.args?.includes('--flatten')
    ) {
      entry.result.stdout = kubectlConfigJson('dev', devPort, {
        missingUserRef: true,
      });
    }
    if (
      entry.command === 'kubectl' &&
      entry.args?.includes('--minify') &&
      !entry.args?.includes('--raw')
    ) {
      entry.result.stdout = kubectlConfigJson('dev', devPort, {
        missingUserRef: true,
      });
    }
  }
  const { run } = makeTraceRunner(script);
  assert.throws(
    () =>
      captureIdentity('dev', devKind.contextName, {
        run,
        now: () => 0,
        deadline: 100_000,
        snapshotRoot: root,
      }),
    /referenced cluster or user missing/,
  );
});

test('captureIdentity refuses expired deadline before launch', () => {
  const root = mkdtempSync(join(tmpdir(), 'obs-id-deadline-'));
  const snapshotPath = join(root, 'snapshot.json');
  const { run } = makeTraceRunner(identityScript('dev', devPort, snapshotPath));
  assert.throws(
    () =>
      captureIdentity('dev', devKind.contextName, {
        run,
        now: () => 50_000,
        deadline: 50_000,
        snapshotRoot: root,
      }),
    /preflight deadline/,
  );
});

test('captureIdentity late success fails under fake clock', () => {
  const root = mkdtempSync(join(tmpdir(), 'obs-id-late-'));
  const snapshotPath = join(root, 'snapshot.json');
  let ticks = 0;
  const now = () => {
    ticks += 1;
    if (ticks <= 2) {
      return 0;
    }
    return 200_000;
  };
  const script = identityScript('dev', devPort, snapshotPath);
  const { run } = makeTraceRunner(script);
  assert.throws(
    () =>
      captureIdentity('dev', devKind.contextName, {
        run,
        now,
        deadline: 100_000,
        snapshotRoot: root,
      }),
    /timeout/,
  );
});

test('recheckIdentity succeeds for capture-produced identity', () => {
  const root = mkdtempSync(join(tmpdir(), 'obs-id-recheck-ok-'));
  const snapshotPath = join(root, 'snapshot.json');
  const { run: captureRun } = makeTraceRunner(
    identityScript('dev', devPort, snapshotPath),
  );
  const identity = captureIdentity('dev', devKind.contextName, {
    run: captureRun,
    now: () => 0,
    deadline: 100_000,
    snapshotRoot: root,
  });
  const { run: recheckRun } = makeTraceRunner(
    recheckScriptFromCapture(identity),
  );
  const result = recheckIdentity(identity, {
    run: recheckRun,
    now: () => 0,
    deadline: 100_000,
    expectedNamespaceUid: identity.tuple.targetNamespaceUid,
  });
  assert.equal(result.ok, true);
  identity.cleanup();
});

test('recheckIdentity rejects changed selected context', () => {
  const root = mkdtempSync(join(tmpdir(), 'obs-id-recheck-ctx-'));
  const snapshotPath = join(root, 'snapshot.json');
  const { run: captureRun } = makeTraceRunner(
    identityScript('dev', devPort, snapshotPath),
  );
  const identity = captureIdentity('dev', devKind.contextName, {
    run: captureRun,
    now: () => 0,
    deadline: 100_000,
    snapshotRoot: root,
  });
  const script = recheckScriptFromCapture(identity);
  script[0].result.stdout = 'other-context\n';
  const { run } = makeTraceRunner(script);
  const result = recheckIdentity(identity, {
    run,
    now: () => 0,
    deadline: 50_000,
  });
  assert.equal(result.ok, false);
  assert.equal(result.reason, 'context-changed');
  identity.cleanup();
});

test('recheckIdentity rejects snapshot tamper', () => {
  const root = mkdtempSync(join(tmpdir(), 'obs-id-recheck-snap-'));
  const snapshotPath = join(root, 'snapshot.json');
  const { run: captureRun } = makeTraceRunner(
    identityScript('dev', devPort, snapshotPath),
  );
  const identity = captureIdentity('dev', devKind.contextName, {
    run: captureRun,
    now: () => 0,
    deadline: 100_000,
    snapshotRoot: root,
  });
  writeFileSync(identity.snapshotPath, '{"tampered":true}\n', { mode: 0o600 });
  const { run } = makeTraceRunner(recheckScriptFromCapture(identity));
  const result = recheckIdentity(identity, {
    run,
    now: () => 0,
    deadline: 50_000,
  });
  assert.equal(result.ok, false);
  assert.equal(result.reason, 'snapshot-hash');
  identity.cleanup();
});

test('cleanup is idempotent and owner-only', () => {
  const root = mkdtempSync(join(tmpdir(), 'obs-id-cleanup-'));
  const snapshotPath = join(root, 'snapshot.json');
  const { run } = makeTraceRunner(identityScript('dev', devPort, snapshotPath));
  const identity = captureIdentity('dev', devKind.contextName, {
    run,
    now: () => 0,
    deadline: 100_000,
    snapshotRoot: root,
  });
  const first = identity.cleanup();
  assert.equal(first.ok, true);
  const second = identity.cleanup();
  assert.equal(second.ok, true);
  assert.throws(() => readFileSync(snapshotPath));
});

test('runObservabilityReadCommand missing executable', () => {
  const result = runObservabilityReadCommand('offscreen-missing-binary-xyz', [
    'noop',
  ]);
  assert.equal(result.ok, false);
  assert.equal(result.missing, true);
});

test('runObservabilityReadCommand invalid timeout throws', () => {
  assert.throws(
    () =>
      runObservabilityReadCommand(process.execPath, ['-e', '0'], {
        timeoutMs: 0,
      }),
    /invalid observability read timeout/,
  );
  assert.throws(
    () =>
      runObservabilityReadCommand(process.execPath, ['-e', '0'], {
        timeoutMs: 120_000,
      }),
    /invalid observability read timeout/,
  );
});

test('runObservabilityReadCommand SIGKILL on hang', () => {
  const result = runObservabilityReadCommand(
    process.execPath,
    ['-e', "process.on('SIGTERM',()=>{}); setInterval(()=>{},1000)"],
    { timeoutMs: 300 },
  );
  assert.equal(result.ok, false);
  assert.equal(result.timedOut, true);
});
