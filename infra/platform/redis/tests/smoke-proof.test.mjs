import assert from 'node:assert/strict';
import test from 'node:test';

import { redisTargetFromProfile } from '../inventory.mjs';
import {
  CANONICAL_FLUSH_REFUSED_NAMESPACES,
  RESTART_MARKER_KEY,
  TTL_KEY,
  classifyScaleZeroOutage,
  parseExistsReply,
  parseRedisOkReply,
  parseTtlReply,
  refuseFlushallUnlessProofNamespace,
  renderClientPodManifest,
  runRedisSmokeProof,
  validateCleanupInventory,
} from '../smoke-proof.mjs';
import { parsePingReply as readinessPing } from '../readiness.mjs';

const releaseTarget = redisTargetFromProfile('release');
const PROOF_NAMESPACE =
  'offscreen-redis-proof-0123456789abcdef0123456789abcdef';
const SERVER_POD = 'redis-abc123';
const SERVER_UID = 'server-uid-1';
const CLIENT_UID = 'client-uid-1';
const DEPLOYMENT_UID = 'deploy-uid';
const SERVICE_UID = 'service-uid';
const CONFIG_UID = 'config-uid';
const NAMESPACE_UID = 'namespace-uid';
const RUN_ID_A = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
const RUN_ID_B = 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb';

/** @typedef {{
 *   ok: boolean,
 *   status: number | null,
 *   stdout: string,
 *   stderr: string,
 *   timedOut: boolean,
 *   missing?: boolean,
 * }} CmdResult */

export function ok(stdout = '', stderr = '') {
  return {
    ok: true,
    status: 0,
    stdout,
    stderr,
    timedOut: false,
    missing: false,
  };
}

function fail(status = 1, stderr = 'failed', stdout = '') {
  return {
    ok: false,
    status,
    stdout,
    stderr,
    timedOut: false,
    missing: false,
  };
}

/**
 * @param {import('../inventory.mjs').RedisInventoryTarget} target
 */
export function buildHappyProofRunner(target) {
  /** @type {Array<[string, string[]]>} */
  const commands = [];
  let scaleReplicas = 1;
  let serverPodUid = SERVER_UID;
  let serverRunId = RUN_ID_A;
  let ttlExists = true;
  let restartExists = 0;
  const deploymentRv = { value: '101' };
  const namespaceRv = { value: '9001' };

  const inventory = {
    state: 'installed',
    reason: 'compatible',
    snapshot: {},
  };

  const run = (command, args) => {
    commands.push([command, args]);
    if (command === 'helm' && args[0] === 'history') {
      return ok(JSON.stringify([{ revision: 1, status: 'deployed' }]));
    }
    if (command !== 'kubectl') {
      return fail(1, 'unexpected command');
    }

    if (args.includes('json') && args.includes('deployment')) {
      return ok(
        JSON.stringify({
          metadata: {
            uid: DEPLOYMENT_UID,
            resourceVersion: deploymentRv.value,
          },
          spec: { replicas: scaleReplicas },
          status: {
            observedGeneration: 2,
            readyReplicas: scaleReplicas,
            updatedReplicas: scaleReplicas,
            availableReplicas: scaleReplicas,
          },
        }),
      );
    }
    if (args.includes('json') && args.includes('service')) {
      return ok(
        JSON.stringify({
          metadata: { uid: SERVICE_UID, resourceVersion: '11' },
        }),
      );
    }
    if (args.includes('json') && args.includes('configmap')) {
      if (args.includes('redis-config')) {
        return ok(
          JSON.stringify({
            metadata: { uid: CONFIG_UID, resourceVersion: '12' },
          }),
        );
      }
    }
    if (args.includes('namespace') && args.includes('json')) {
      return ok(
        JSON.stringify({
          metadata: {
            uid: NAMESPACE_UID,
            resourceVersion: namespaceRv.value,
            name: target.namespace,
          },
        }),
      );
    }
    const listLabel =
      args.indexOf('-l') >= 0 ? args[args.indexOf('-l') + 1] : '';
    if (
      args.includes('pods') &&
      args.includes('json') &&
      listLabel.includes('app.kubernetes.io/name=redis')
    ) {
      if (scaleReplicas === 0) {
        return ok(JSON.stringify({ items: [] }));
      }
      return ok(
        JSON.stringify({
          items: [
            {
              metadata: { name: SERVER_POD, uid: serverPodUid },
            },
          ],
        }),
      );
    }
    if (args.includes('get') && args.includes('pods') && args.includes('app=redis-client')) {
      return ok('pod/redis-client\n');
    }
    if (
      args.includes('get') &&
      args.includes('all,configmap,secret,serviceaccount')
    ) {
      return ok(
        [
          `deployment/redis`,
          `service/redis`,
          `configmap/redis-config`,
          `pod/${SERVER_POD}`,
          `pod/redis-client`,
          `secret/sh.helm.release.v1.redis.v1`,
          `configmap/kube-root-ca.crt`,
          `serviceaccount/default`,
        ].join('\n'),
      );
    }
    if (args.includes('exec')) {
      const portIdx = args.lastIndexOf('6379');
      const redisArgs = portIdx >= 0 ? args.slice(portIdx + 1) : [];
      const sub = redisArgs[0];
      if (sub === 'PING') {
        if (scaleReplicas === 0) {
          return fail(
            1,
            'Could not connect to Redis at redis:6379: Connection refused',
            '',
          );
        }
        return ok('PONG\n');
      }
      if (sub === 'SET' && redisArgs[1] === TTL_KEY) {
        ttlExists = true;
        return ok('OK\n');
      }
      if (sub === 'GET' && redisArgs[1] === TTL_KEY) {
        return ok('proof-client-u\n');
      }
      if (sub === 'TTL' && redisArgs[1] === TTL_KEY) {
        return ok('4\n');
      }
      if (sub === 'EXISTS' && redisArgs[1] === TTL_KEY) {
        const value = ttlExists ? 1 : 0;
        if (ttlExists) {
          ttlExists = false;
        }
        return ok(`${value}\n`);
      }
      if (sub === 'EXISTS' && redisArgs[1] === RESTART_MARKER_KEY) {
        return ok(`${restartExists}\n`);
      }
      if (sub === 'SET' && redisArgs[1] === RESTART_MARKER_KEY) {
        restartExists = 1;
        return ok('OK\n');
      }
      if (sub === 'FLUSHALL') {
        return ok('OK\n');
      }
      if (sub === 'INFO') {
        return ok(
          `# Server\nredis_version:8.2.1\nrun_id:${serverRunId}\n`,
        );
      }
      return fail(1, `unexpected redis-cli ${sub}`);
    }
    return fail(1, `unexpected kubectl ${args.join(' ')}`);
  };

  const runWrite = (command, args, options = {}) => {
    commands.push([command, args]);
    if (command === 'kubectl' && args.includes('create')) {
      return ok(
        JSON.stringify({
          metadata: { uid: CLIENT_UID, name: 'redis-client' },
        }),
      );
    }
    if (command === 'kubectl' && args.includes('scale') && args.includes('--replicas=0')) {
      scaleReplicas = 0;
      deploymentRv.value = '102';
      return ok();
    }
    if (command === 'kubectl' && args.includes('scale') && args.includes('--replicas=1')) {
      scaleReplicas = 1;
      serverPodUid = 'server-uid-2';
      serverRunId = RUN_ID_B;
      restartExists = 0;
      deploymentRv.value = '103';
      return ok();
    }
    if (command === 'kubectl' && args.includes('delete') && args.includes('--raw')) {
      return ok(options.input ? '' : '');
    }
    return fail(1, 'unexpected mutation');
  };

  return { run, runWrite, commands, inventory };
}

test('renderClientPodManifest injects namespace and keeps redis container name', () => {
  const manifest = renderClientPodManifest(PROOF_NAMESPACE);
  assert.match(manifest, /namespace: offscreen-redis-proof-/);
  assert.match(manifest, /name: redis-client/);
  assert.match(manifest, /name: redis\n/);
  assert.doesNotMatch(manifest, /hostPath/);
});

test('refuseFlushallUnlessProofNamespace blocks canonical namespaces', () => {
  for (const namespace of CANONICAL_FLUSH_REFUSED_NAMESPACES) {
    const refusal = refuseFlushallUnlessProofNamespace(namespace);
    assert.equal(refusal.ok, false);
    assert.equal(refusal.reason, 'flushall-canonical-refused');
  }
  const refusal = refuseFlushallUnlessProofNamespace('lab-a');
  assert.equal(refusal.ok, false);
});

test('validateCleanupInventory refuses unexpected object', () => {
  const allowed = validateCleanupInventory([
    'deployment/redis',
    'service/redis',
    'configmap/redis-config',
    'pod/redis-client',
    'pod/redis-abc',
    'secret/sh.helm.release.v1.redis.v1',
    'configmap/kube-root-ca.crt',
    'serviceaccount/default',
  ]);
  assert.equal(allowed.ok, true);

  const blocked = validateCleanupInventory([
    'deployment/redis',
    'configmap/foreign',
  ]);
  assert.equal(blocked.ok, false);
  assert.equal(blocked.reason, 'unexpected-inventory');
});

test('false PONG does not count as recovery', () => {
  const parsed = readinessPing('OK');
  assert.equal(parsed.ok, false);
});

test('API exec failure is not classified as scale-zero outage', () => {
  const kind = classifyScaleZeroOutage(fail(1, 'exec failed'), '');
  assert.equal(kind.kind, 'api-exec-failure');
});

test('transport refusal is classified as scale-zero outage', () => {
  const kind = classifyScaleZeroOutage(
    fail(1, 'Could not connect to Redis at redis:6379: Connection refused', ''),
    '',
  );
  assert.equal(kind.kind, 'transport-outage');
});

test('unknown scale result leaves proof refused', async () => {
  const target = { ...releaseTarget, namespace: PROOF_NAMESPACE };
  const { run, runWrite: happyWrite, inventory } = buildHappyProofRunner(target);
  const runWrite = (command, args, options) => {
    if (command === 'kubectl' && args.includes('scale') && args.includes('--replicas=0')) {
      return { ok: false, status: null, stdout: '', stderr: '', timedOut: false };
    }
    return happyWrite(command, args, options);
  };
  const receipt = await runRedisSmokeProof(target, 'release', {
    run,
    runWrite,
    remainingMs: () => 600_000,
    observeInventory: () => inventory,
  });
  assert.equal(receipt.ok, false);
  assert.equal(receipt.detail, 'proof-scale-down-unclear');
});

test('parseTtlReply enforces integer 1..4', () => {
  assert.equal(parseTtlReply('4\n').ok, true);
  assert.equal(parseTtlReply('0\n').ok, false);
  assert.equal(parseTtlReply('ERR\n').ok, false);
});

test('parseExistsReply treats Redis error as failure', () => {
  assert.equal(parseExistsReply('ERR foo\n').ok, false);
});

test('parseRedisOkReply rejects embedded ERR', () => {
  assert.equal(parseRedisOkReply('ERR\n').ok, false);
});

test('runRedisSmokeProof happy path records scale and namespace delete', async () => {
  const target = { ...releaseTarget, namespace: PROOF_NAMESPACE };
  const { run, runWrite, commands, inventory } = buildHappyProofRunner(target);

  const receipt = await runRedisSmokeProof(target, 'release', {
    run,
    runWrite,
    remainingMs: () => 600_000,
    observeInventory: () => inventory,
  });

  assert.equal(receipt.ok, true);
  assert.equal(receipt.runIds.before, RUN_ID_A);
  assert.equal(receipt.runIds.after, RUN_ID_B);

  const scaleDown = commands.find(
    ([, args]) => args.includes('scale') && args.includes('--replicas=0'),
  );
  const deleteNs = commands.find(
    ([, args]) => args.includes('delete') && args.includes('--raw'),
  );
  assert.ok(scaleDown);
  assert.ok(deleteNs);
});

test('unexpected inventory blocks namespace delete', async () => {
  const target = { ...releaseTarget, namespace: PROOF_NAMESPACE };
  const { run, runWrite, inventory } = buildHappyProofRunner(target);
  const runWithForeign = (command, args) => {
    if (
      args.includes('get') &&
      args.includes('all,configmap,secret,serviceaccount')
    ) {
      return ok('deployment/redis\nconfigmap/foreign\n');
    }
    return run(command, args);
  };
  const receipt = await runRedisSmokeProof(target, 'release', {
    run: runWithForeign,
    runWrite,
    remainingMs: () => 600_000,
    observeInventory: () => inventory,
  });
  assert.equal(receipt.ok, false);
  assert.equal(receipt.detail, 'unexpected-inventory');
});