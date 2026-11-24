import assert from 'node:assert/strict';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { DEV_API_PORT_RANGE } from '../../../clusters/kind/manager/config.mjs';
import { DEV_CLUSTER_OWNER } from '../../../clusters/kind/manager/dev-bootstrap.mjs';
import { runPlatformCommand } from '../../common/commands.mjs';
import {
  DEV_REDIS_NAMESPACE,
  executeAuthorizedDevRedis,
  observeDevRedis,
  planDevRedisInstall,
} from '../dev-install.mjs';

const redisRoot = dirname(fileURLToPath(import.meta.url));
const chartRoot = join(redisRoot, '..', 'chart');
const DEV_PORT = DEV_API_PORT_RANGE.start;

function kubectlConfigJson() {
  return JSON.stringify({
    clusters: [
      {
        name: 'kind-offscreen-dev',
        cluster: { server: `https://127.0.0.1:${DEV_PORT}` },
      },
    ],
    contexts: [
      { name: 'kind-offscreen-dev', context: { cluster: 'kind-offscreen-dev' } },
    ],
    'current-context': 'kind-offscreen-dev',
  });
}

function helmRun(command, args, options) {
  if (command !== 'helm') {
    return {
      ok: false,
      status: 1,
      stdout: '',
      stderr: 'unexpected command',
      timedOut: false,
      missing: false,
    };
  }
  return runPlatformCommand(command, args, options);
}

function devTargetRun(overrides = {}) {
  /** @type {Array<[string, string[]]>} */
  const commands = [];
  return {
    commands,
    run(command, args, options = {}) {
      commands.push([command, args]);
      if (command === 'kind' && args[0] === 'get' && args[1] === 'clusters') {
        return { ok: true, stdout: 'offscreen-dev\n' };
      }
      if (command === 'kubectl' && args.join(' ').includes('config view')) {
        return { ok: true, stdout: kubectlConfigJson() };
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
      const joined = args.join(' ');
      if (
        command === 'kubectl' &&
        joined.includes('get namespace offscreen-dev-system')
      ) {
        return {
          ok: true,
          stdout: JSON.stringify({
            metadata: {
              name: 'offscreen-dev-system',
              uid: 'baseline-ns',
              labels: { 'offscreen.dev/owner': DEV_CLUSTER_OWNER },
            },
          }),
        };
      }
      if (
        overrides.namespace &&
        command === 'kubectl' &&
        joined.includes(`get namespace ${DEV_REDIS_NAMESPACE}`)
      ) {
        return {
          ok: true,
          stdout: JSON.stringify({
            metadata: {
              name: DEV_REDIS_NAMESPACE,
              labels: { 'offscreen.dev/owner': overrides.namespace.owner },
            },
          }),
        };
      }
      if (
        command === 'kubectl' &&
        joined.includes(`get namespace ${DEV_REDIS_NAMESPACE}`)
      ) {
        return { ok: true, stdout: '' };
      }
      if (
        command === 'kubectl' &&
        joined.includes('get deployment') &&
        joined.includes(' redis')
      ) {
        return { ok: true, stdout: '' };
      }
      if (
        command === 'kubectl' &&
        joined.includes('get service') &&
        joined.includes(' redis')
      ) {
        return { ok: true, stdout: '' };
      }
      if (command === 'kubectl' && joined.includes('jsonpath={.spec.type}')) {
        return { ok: true, stdout: 'ClusterIP' };
      }
      if (
        command === 'kubectl' &&
        joined.includes('rollout status deployment/redis')
      ) {
        return {
          ok: true,
          stdout: 'deployment "redis" successfully rolled out\n',
        };
      }
      if (command === 'kubectl' && joined.includes(' apply ')) {
        return { ok: true, stdout: 'configured\n' };
      }
      if (command === 'helm') {
        return helmRun(command, args, options);
      }
      return {
        ok: false,
        stderr: `unhandled ${command} ${joined}`,
        stdout: '',
      };
    },
  };
}

test('plan refuses foreign redis namespace before apply', () => {
  const observations = {
    namespace: {
      state: 'present',
      classification: 'foreign',
      object: {
        metadata: {
          name: DEV_REDIS_NAMESPACE,
          labels: { 'offscreen.dev/owner': 'foreign' },
        },
      },
    },
    deployment: { state: 'absent' },
    service: { state: 'absent' },
  };
  const plan = planDevRedisInstall(observations);
  assert.equal(plan.ok, false);
  assert.equal(plan.refusals[0]?.id, 'namespace-foreign');
});

test('executeAuthorizedDevRedis ensures dev namespace then applies rendered redis', () => {
  const harness = devTargetRun();
  const result = executeAuthorizedDevRedis({
    run: harness.run,
    renderDeps: { run: harness.run, chartRoot },
  });
  assert.equal(result.ok, true);
  const joined = harness.commands
    .map(([cmd, args]) => `${cmd} ${args.join(' ')}`)
    .join('\n');
  assert.match(joined, /--context kind-offscreen-dev/);
  assert.doesNotMatch(joined, /kind-offscreen-lab/);
  assert.doesNotMatch(joined, /install\.sh/);
  assert.match(joined, /offscreen-dev-redis/);
  assert.match(joined, /helm template/);
  assert.match(joined, /development\.yaml/);
  assert.equal(
    harness.commands.filter(
      ([cmd, args]) => cmd === 'kubectl' && args.join(' ').includes(' apply '),
    ).length,
    2,
  );
});

test('executeAuthorizedDevRedis reuses existing owned namespace', () => {
  const harness = devTargetRun({
    namespace: { owner: DEV_CLUSTER_OWNER },
  });
  const result = executeAuthorizedDevRedis({
    run: harness.run,
    renderDeps: { run: harness.run, chartRoot },
  });
  assert.equal(result.ok, true);
  assert.equal(
    result.actions.some((action) => action.op === 'reuse-namespace'),
    true,
  );
  assert.equal(
    harness.commands.filter(
      ([cmd, args]) => cmd === 'kubectl' && args.join(' ').includes(' apply '),
    ).length,
    1,
  );
});

test('observeDevRedis reads exact dev redis namespace', () => {
  const harness = devTargetRun();
  const observations = observeDevRedis({ run: harness.run });
  assert.equal(observations.namespace.state, 'absent');
  assert.equal(observations.deployment.state, 'absent');
  assert.match(
    harness.commands.map(([cmd, args]) => args.join(' ')).join('\n'),
    new RegExp(`namespace ${DEV_REDIS_NAMESPACE}`),
  );
});
