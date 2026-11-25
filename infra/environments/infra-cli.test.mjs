import assert from 'node:assert/strict';
import { execPath } from 'node:process';
import test from 'node:test';
import {
  DEV_CLUSTER_CLI,
  RELEASE_CLUSTER_UP,
  buildInfraCliHelp,
  buildInfraEnsurePreview,
  dispatchInfraCli,
  inventoryKindClusters,
  observeSelectedServiceState,
  parseInfraCliArgs,
  runInfraCliArgv,
  runInfraStatus,
  runInfraUp,
} from './infra-cli.mjs';
import {
  DEV_API_PORT_RANGE,
  RELEASE_API_PORT,
} from '../clusters/kind/manager/config.mjs';
import { DEV_CLUSTER_OWNER } from '../clusters/kind/manager/dev-bootstrap.mjs';
import { allowedNamespacesForService } from '../platform/common/render.mjs';

const DEV_PORT = DEV_API_PORT_RANGE.start;

function kubectlConfigJson(profile, port) {
  const clusterName =
    profile === 'dev' ? 'kind-offscreen-dev' : 'kind-offscreen-release';
  const contextName =
    profile === 'dev' ? 'kind-offscreen-dev' : 'kind-offscreen-release';
  return JSON.stringify({
    clusters: [
      { name: clusterName, cluster: { server: `https://127.0.0.1:${port}` } },
    ],
    contexts: [{ name: contextName, context: { cluster: clusterName } }],
    'current-context': contextName,
  });
}

function helmOk(command, args) {
  if (command !== 'helm') {
    return null;
  }
  if (args[0] === 'version') {
    return { ok: true, stdout: 'v3.22.1\n', stderr: '' };
  }
  if (args[0] === 'template' || args[0] === 'lint') {
    const chartPath = args[1] ?? args[2] ?? '';
    let service = 'postgres';
    let profileId = 'dev';
    if (
      chartPath.includes('/platform/redis/') ||
      chartPath.includes('/redis/chart')
    ) {
      service = 'redis';
      profileId = chartPath.includes('development.yaml') ? 'dev' : 'release';
    } else if (chartPath.includes('/temporal/')) {
      service = 'temporal';
      profileId = 'release';
    } else if (chartPath.includes('/object-storage/')) {
      service = 'object-storage';
      profileId = 'dev';
    }
    const namespaces = [...allowedNamespacesForService(service, profileId)];
    const stdout = namespaces
      .map((name) => JSON.stringify({ kind: 'Namespace', metadata: { name } }))
      .concat(
        JSON.stringify({
          kind: 'ConfigMap',
          metadata: { name: `${service}-config`, namespace: namespaces[0] },
        }),
      )
      .join('\n');
    return { ok: true, stdout: `${stdout}\n`, stderr: '' };
  }
  return { ok: true, stdout: '', stderr: '' };
}

function devWarmRun(clusterPresent = true) {
  return (command, args) => {
    const helm = helmOk(command, args);
    if (helm) {
      return helm;
    }
    if (command === 'kind' && args[0] === 'get') {
      return {
        ok: true,
        stdout: clusterPresent ? 'offscreen-dev\n' : '',
      };
    }
    if (command === 'kubectl' && args.includes('config')) {
      return { ok: true, stdout: kubectlConfigJson('dev', DEV_PORT) };
    }
    if (command === 'kubectl' && args.includes('offscreen-dev-system')) {
      return {
        ok: true,
        stdout: JSON.stringify({
          metadata: {
            name: 'offscreen-dev-system',
            uid: 'ns-uid',
            labels: { 'offscreen.dev/owner': DEV_CLUSTER_OWNER },
          },
        }),
      };
    }
    if (command === 'kubectl' && args.includes('nodes')) {
      return {
        ok: true,
        stdout: JSON.stringify({
          items: [
            {
              status: {
                conditions: [{ type: 'Ready', status: 'True' }],
              },
            },
          ],
        }),
      };
    }
    return { ok: true, stdout: '', stderr: '' };
  };
}

function releaseWarmRun(clusterPresent = true) {
  return (command, args) => {
    const helm = helmOk(command, args);
    if (helm) {
      return helm;
    }
    if (command === 'kind' && args[0] === 'get') {
      return {
        ok: true,
        stdout: clusterPresent ? 'offscreen-release\n' : '',
      };
    }
    if (command === 'kubectl' && args.includes('config')) {
      return {
        ok: true,
        stdout: kubectlConfigJson('release', RELEASE_API_PORT),
      };
    }
    if (command === 'kubectl' && args.includes('offscreen-release-system')) {
      return {
        ok: true,
        stdout: JSON.stringify({
          metadata: {
            name: 'offscreen-release-system',
            uid: 'release-baseline-uid',
            labels: { 'offscreen.rpg/lab': 'disposable' },
          },
        }),
      };
    }
    if (command === 'kubectl' && args.includes('nodes')) {
      return {
        ok: true,
        stdout: JSON.stringify({
          items: [
            {
              status: {
                conditions: [{ type: 'Ready', status: 'True' }],
              },
            },
          ],
        }),
      };
    }
    if (command === 'kubectl' && args.includes('local-path-provisioner')) {
      return {
        ok: true,
        stdout: JSON.stringify({
          metadata: {
            name: 'local-path-provisioner',
            namespace: 'local-path-storage',
          },
          status: {
            conditions: [{ type: 'Available', status: 'True' }],
          },
        }),
      };
    }
    return { ok: true, stdout: '', stderr: '' };
  };
}

test('parseInfraCliArgs rejects unknown commands, missing env, and positionals', () => {
  assert.equal(parseInfraCliArgs(['bootstrap']).ok, false);
  assert.equal(parseInfraCliArgs(['plan']).ok, false);
  assert.equal(parseInfraCliArgs(['plan', 'dev']).ok, false);
  assert.equal(parseInfraCliArgs(['plan', '--env', 'dev', 'extra']).ok, false);
  assert.equal(parseInfraCliArgs(['plan', '--env', 'staging']).ok, false);
});

test('parseInfraCliArgs rejects duplicate, conflicting, and invalid format flags', () => {
  assert.equal(
    parseInfraCliArgs(['plan', '--env', 'dev', '--env', 'release']).message,
    'duplicate option: --env',
  );
  assert.equal(
    parseInfraCliArgs([
      'status',
      '--env',
      'dev',
      '--services',
      'core',
      '--services',
      'none',
    ]).message,
    'duplicate option: --services',
  );
  assert.match(
    parseInfraCliArgs(['plan', '--env', 'dev', '--human', '--json']).message,
    /conflicting options/,
  );
  assert.equal(
    parseInfraCliArgs(['plan', '--env', 'dev', '--no-color']).message,
    '--no-color requires --human',
  );
  assert.equal(
    parseInfraCliArgs(['plan', '--env', 'dev', '--human', '--human']).ok,
    false,
  );
  assert.equal(parseInfraCliArgs(['--help']).ok, true);
  assert.equal(parseInfraCliArgs(['plan', '--help']).ok, true);
});

test('buildInfraCliHelp is static and needs no host access', () => {
  const text = buildInfraCliHelp('plan');
  assert.match(text, /plan\s+read-only/);
  assert.match(text, /up\s+may create cluster/);
  assert.match(text, /--human/);
  assert.match(text, /--json/);
  assert.match(text, /focused: plan/);
});

test('default and explicit --json stdout stay equivalent', () => {
  /** @type {string[]} */
  const defaultOut = [];
  /** @type {string[]} */
  const jsonOut = [];
  const argv = ['plan', '--env', 'dev', '--services', 'none'];
  const io = (buffer) => ({
    write: (chunk) => buffer.push(chunk),
    writeError: () => {},
  });
  const baseline = runInfraCliArgv(argv, { io: io(defaultOut) });
  const explicit = runInfraCliArgv([...argv, '--json'], { io: io(jsonOut) });
  assert.equal(baseline.exitCode, 0);
  assert.equal(explicit.exitCode, 0);
  assert.equal(defaultOut.join(''), jsonOut.join(''));
  assert.doesNotMatch(defaultOut.join(''), /\x1b\[[0-9;]*m/);
});

test('--help exits zero without runner', () => {
  /** @type {string[]} */
  const out = [];
  let runnerCalled = false;
  const result = runInfraCliArgv(['status', '--help'], {
    io: {
      write: (chunk) => out.push(chunk),
      writeError: () => {},
    },
    runner: () => {
      runnerCalled = true;
      return { ok: true, status: 0 };
    },
    run: () => {
      throw new Error('run should not be called for help');
    },
  });
  assert.equal(result.exitCode, 0);
  assert.equal(runnerCalled, false);
  assert.match(out.join(''), /read-only vs mutating/);
});

test('human status for dev and release avoids ANSI on stdout', () => {
  /** @type {string[]} */
  const out = [];
  runInfraCliArgv(
    ['status', '--env', 'dev', '--services', 'postgres', '--human'],
    {
      io: {
        write: (chunk) => out.push(chunk),
        writeError: () => {},
      },
      run: devWarmRun(false),
    },
  );
  const devText = out.join('');
  assert.match(devText, /env: dev/);
  assert.match(devText, /cluster: ABSENT/);
  assert.equal(/\x1b\[[0-9;]*m/.test(devText), false);

  out.length = 0;
  runInfraCliArgv(
    ['status', '--env', 'release', '--services', 'postgres', '--human'],
    {
      io: {
        write: (chunk) => out.push(chunk),
        writeError: () => {},
      },
      run: releaseWarmRun(false),
    },
  );
  const releaseText = out.join('');
  assert.match(releaseText, /env: release/);
  assert.match(releaseText, /cluster: ABSENT/);
  assert.equal(/\x1b\[[0-9;]*m/.test(releaseText), false);
});

test('human refusal uses formatter stdout without dispatch stderr', () => {
  /** @type {string[]} */
  const stdout = [];
  /** @type {string[]} */
  const stderr = [];
  const human = runInfraCliArgv(
    ['plan', '--env', 'dev', '--services', 'rabbitmq', '--human'],
    {
      io: {
        write: (chunk) => stdout.push(chunk),
        writeError: (chunk) => stderr.push(chunk),
      },
    },
  );
  assert.equal(human.exitCode, 2);
  assert.equal(stderr.join(''), '');
  assert.match(stdout.join(''), /result: REFUSED/);

  stdout.length = 0;
  stderr.length = 0;
  const json = runInfraCliArgv(
    ['plan', '--env', 'dev', '--services', 'rabbitmq'],
    {
      io: {
        write: (chunk) => stdout.push(chunk),
        writeError: (chunk) => stderr.push(chunk),
      },
    },
  );
  assert.equal(json.exitCode, 2);
  assert.ok(stderr.join('').length > 0);
  assert.match(stdout.join(''), /"ok":false/);
});

test('plan preview reports ensure phases without invoking a runner', () => {
  /** @type {unknown[]} */
  const calls = [];
  const preview = buildInfraEnsurePreview({
    profileId: 'dev',
    services: 'core',
  });
  assert.equal(preview.ok, true);
  assert.equal(preview.contextName, 'kind-offscreen-dev');
  assert.deepEqual(preview.selectedServices, [
    'postgres',
    'object-storage',
    'temporal',
  ]);
  assert.equal(preview.preflight.length > 0, true);
  assert.equal(preview.phases.length, 3);

  const dispatched = dispatchInfraCli(
    {
      ok: true,
      command: 'plan',
      profileId: 'dev',
      services: 'core',
    },
    {
      runner: (...args) => {
        calls.push(args);
        return { ok: true, status: 0 };
      },
    },
  );
  assert.equal(dispatched.exitCode, 0);
  assert.equal(calls.length, 0);
});

test('malformed args leave run and runner untouched', () => {
  const runCalls = [];
  const runnerCalls = [];
  const result = dispatchInfraCli(
    parseInfraCliArgs(['up', '--env', 'dev', 'oops']),
    {
      run: () => {
        runCalls.push(1);
        return { ok: true, stdout: '' };
      },
      runner: () => {
        runnerCalls.push(1);
        return { ok: true, status: 0 };
      },
    },
  );
  assert.equal(result.exitCode, 2);
  assert.equal(runCalls.length, 0);
  assert.equal(runnerCalls.length, 0);
});

test('up cold dev path invokes dev-cli ensure when cluster is absent', () => {
  /** @type {string[][]} */
  const runnerCalls = [];
  const result = runInfraUp({
    profileId: 'dev',
    services: 'none',
    run: () => ({ ok: true, stdout: '' }),
    runner: (argv) => {
      runnerCalls.push(argv);
      return { ok: true, status: 0 };
    },
  });
  assert.equal(result.ok, true);
  assert.deepEqual(runnerCalls, [[execPath, DEV_CLUSTER_CLI, 'ensure']]);
});

test('up warm dev path verifies cluster without recreate', () => {
  /** @type {string[][]} */
  const runnerCalls = [];
  const result = runInfraUp({
    profileId: 'dev',
    services: 'none',
    run: devWarmRun(true),
    runner: (argv) => {
      runnerCalls.push(argv);
      return { ok: true, status: 0 };
    },
  });
  assert.equal(result.ok, true);
  assert.deepEqual(result.selectedServices, []);
  assert.deepEqual(result.ran, ['cluster-verify']);
  assert.equal(runnerCalls.length, 0);
});

test('up cold release path invokes up.sh when cluster is absent', () => {
  /** @type {string[][]} */
  const runnerCalls = [];
  const result = runInfraUp({
    profileId: 'release',
    services: 'none',
    run: () => ({ ok: true, stdout: '' }),
    runner: (argv) => {
      runnerCalls.push(argv);
      return { ok: true, status: 0 };
    },
  });
  assert.equal(result.ok, true);
  assert.deepEqual(runnerCalls, [['bash', RELEASE_CLUSTER_UP]]);
});

test('up warm release with services skips up.sh', () => {
  /** @type {string[][]} */
  const runnerCalls = [];
  const result = runInfraUp({
    profileId: 'release',
    services: 'none',
    run: releaseWarmRun(true),
    runner: (argv) => {
      runnerCalls.push(argv);
      return { ok: true, status: 0 };
    },
  });
  assert.equal(result.ok, true);
  assert.equal(
    runnerCalls.some((argv) => argv[1] === RELEASE_CLUSTER_UP),
    false,
  );
  assert.deepEqual(result.ran, ['cluster-verify']);
});

test('up cluster ensure failure stops before platform calls', () => {
  /** @type {string[][]} */
  const runnerCalls = [];
  const result = runInfraUp({
    profileId: 'dev',
    services: 'core',
    run: () => ({ ok: true, stdout: '' }),
    runner: (argv) => {
      runnerCalls.push(argv);
      if (argv.includes(DEV_CLUSTER_CLI)) {
        return { ok: false, status: 1, stderr: 'injected cluster failure' };
      }
      return { ok: true, status: 0 };
    },
  });
  assert.equal(result.ok, false);
  assert.equal(result.phase, 'cluster-ensure');
  assert.equal(
    runnerCalls.some((argv) => argv.includes('dev-cnpg-bootstrap-cli.mjs')),
    false,
  );
});

test('status performs read-only kind and kubectl observation', () => {
  /** @type {Array<[string, string[]]>} */
  const commands = [];
  const run = (command, args) => {
    commands.push([command, args]);
    if (command === 'kind') {
      return { ok: true, stdout: 'offscreen-dev\n' };
    }
    if (command === 'kubectl' && args.includes('config')) {
      return { ok: true, stdout: kubectlConfigJson('dev', DEV_PORT) };
    }
    if (command === 'kubectl' && args.includes('offscreen-dev-system')) {
      return {
        ok: true,
        stdout: JSON.stringify({
          metadata: {
            name: 'offscreen-dev-system',
            uid: 'ns-uid',
            labels: { 'offscreen.dev/owner': DEV_CLUSTER_OWNER },
          },
        }),
      };
    }
    if (command === 'kubectl' && args.includes('offscreen-dev-postgres')) {
      return { ok: true, stdout: '' };
    }
    if (command === 'kubectl' && args.includes('cluster.postgresql.cnpg.io')) {
      return { ok: true, stdout: '' };
    }
    return { ok: true, stdout: '', stderr: '' };
  };

  const result = runInfraStatus({
    profileId: 'dev',
    services: 'postgres',
    run,
  });
  assert.equal(result.ok, true);
  assert.equal(result.cluster, 'present');
  assert.equal(result.services.postgres.state, 'not-installed');
  const joined = commands
    .map(([cmd, args]) => `${cmd} ${args.join(' ')}`)
    .join('\n');
  assert.equal(/\bapply\b/i.test(joined), false);
  assert.equal(/\bcreate\b/i.test(joined), false);
  assert.equal(/\bdelete\b/i.test(joined), false);
  assert.equal(/helm upgrade/i.test(joined), false);
});

test('status reports dev redis absent when deployment and service are missing', () => {
  const run = (command, args) => {
    const warm = devWarmRun(true)(command, args);
    if (
      command === 'kubectl' &&
      args.join(' ').includes('offscreen-dev-redis')
    ) {
      return { ok: true, stdout: '' };
    }
    return warm;
  };
  const result = runInfraStatus({
    profileId: 'dev',
    services: 'redis',
    run,
  });
  assert.equal(result.ok, true);
  assert.equal(result.services.redis.state, 'not-installed');
});

test('inventoryKindClusters requires exact kind success', () => {
  const unreadable = inventoryKindClusters(() => ({
    ok: false,
    stderr: 'kind missing',
  }));
  assert.equal(unreadable.ok, false);
  assert.equal(unreadable.state, 'unreadable');
});

test('invalid plan selection exits 2', () => {
  const preview = buildInfraEnsurePreview({
    profileId: 'dev',
    services: 'rabbitmq',
  });
  assert.equal(preview.ok, false);
  assert.equal(preview.exitCode, 2);
});

test('release postgres status uses topology alignment, not Ready alone', () => {
  const clusterMeta = { name: 'lab-pg', namespace: 'lab-postgres' };
  const healthy = JSON.stringify({
    metadata: clusterMeta,
    spec: { instances: 4 },
    status: {
      instances: 4,
      readyInstances: 4,
      phase: 'Cluster in healthy state',
      conditions: [{ type: 'Ready', status: 'True' }],
      currentPrimary: 'lab-pg-1',
    },
  });
  const stale = JSON.stringify({
    metadata: clusterMeta,
    spec: { instances: 1 },
    status: {
      instances: 1,
      readyInstances: 0,
      phase: 'Cluster in healthy state',
      conditions: [{ type: 'Ready', status: 'True' }],
      currentPrimary: 'lab-pg-1',
    },
  });
  const run = (command, args) => {
    assert.equal(command, 'kubectl');
    if (
      args.includes('cluster.postgresql.cnpg.io') &&
      args.includes('lab-pg')
    ) {
      return { ok: true, stdout: healthy };
    }
    return { ok: true, stdout: '' };
  };
  const installed = observeSelectedServiceState('release', 'postgres', { run });
  assert.equal(installed.state, 'installed');

  const notReady = observeSelectedServiceState('release', 'postgres', {
    run: (command, args) => {
      if (
        args.includes('cluster.postgresql.cnpg.io') &&
        args.includes('lab-pg')
      ) {
        return { ok: true, stdout: stale };
      }
      return { ok: true, stdout: '' };
    },
  });
  assert.equal(notReady.state, 'not-ready');
  assert.match(notReady.detail ?? '', /readyInstances/);
});

test('release Temporal readiness verifies persisted schema and health when bootstrap Job is absent', () => {
  const calls = [];
  const run = (command, args) => {
    calls.push(args);
    assert.equal(command, 'kubectl');
    assert.equal(args[1], 'kind-offscreen-release');
    if (args.includes('exec')) {
      if (args.includes('deploy/temporal-admin'))
        return { ok: true, stdout: 'SERVING\n' };
      assert.ok(
        args.some((arg) => arg.includes('default_transaction_read_only=on')),
      );
      return { ok: true, stdout: 't\n' };
    }
    if (args.includes('job')) return { ok: true, stdout: '' };
    const name = args[6];
    assert.ok(
      ['temporal-server', 'temporal-postgres', 'temporal-admin'].includes(name),
    );
    return {
      ok: true,
      stdout: JSON.stringify({
        metadata: {
          name,
          namespace: 'lab-temporal',
          labels: { 'offscreen.rpg/lab': 'disposable' },
        },
        spec: { replicas: 1 },
        status: { availableReplicas: 1 },
      }),
    };
  };
  const observed = observeSelectedServiceState('release', 'temporal', { run });
  assert.equal(observed.state, 'installed');
  assert.ok(calls.some((args) => args.includes('temporal_visibility')));
  assert.equal(
    observeSelectedServiceState('release', 'temporal', {
      run: (command, args) =>
        args.includes('temporal_visibility')
          ? { ok: true, stdout: 'f\n' }
          : run(command, args),
    }).state,
    'not-ready',
  );
  assert.equal(
    observeSelectedServiceState('release', 'temporal', {
      run: (command, args) =>
        args.includes('deploy/temporal-admin')
          ? { ok: true, stdout: 'NOT_SERVING\n' }
          : run(command, args),
    }).state,
    'not-ready',
  );
  assert.equal(
    observeSelectedServiceState('release', 'temporal', {
      run: (command, args) =>
        args.includes('job')
          ? {
              ok: true,
              stdout: JSON.stringify({
                metadata: {
                  name: 'temporal-schema',
                  namespace: 'lab-temporal',
                },
                status: { conditions: [{ type: 'Failed', status: 'True' }] },
              }),
            }
          : run(command, args),
    }).state,
    'not-ready',
  );
});

test('release RabbitMQ absent CRD is not-installed, permission failure remains unreadable', () => {
  const run = (command, args) => {
    assert.equal(command, 'kubectl');
    assert.deepEqual(args, [
      '--context',
      'kind-offscreen-release',
      'get',
      'customresourcedefinition',
      'rabbitmqclusters.rabbitmq.com',
      '--ignore-not-found',
      '-o',
      'json',
    ]);
    return { ok: true, stdout: '' };
  };
  assert.equal(
    observeSelectedServiceState('release', 'rabbitmq', { run }).state,
    'not-installed',
  );
  assert.equal(
    observeSelectedServiceState('release', 'rabbitmq', {
      run: () => ({ ok: false, stdout: '', stderr: 'Forbidden' }),
    }).state,
    'unreadable',
  );
});
