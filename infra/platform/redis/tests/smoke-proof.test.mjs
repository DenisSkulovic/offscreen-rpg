import assert from 'node:assert/strict';
import test from 'node:test';

import { redisTargetFromProfile } from '../inventory.mjs';
import {
  CANONICAL_FLUSH_REFUSED_NAMESPACES,
  FLUSH_SENTINEL_KEY,
  RESTART_MARKER_KEY,
  TTL_KEY,
  classifyScaleZeroOutage,
  parseExistsReply,
  parseRedisOkReply,
  parseTtlReply,
  proofNonceLabelKey,
  refuseFlushallUnlessProofNamespace,
  renderClientPodManifest,
  runRedisSmokeProof,
  runVerifiedSmokeNamespaceCleanup,
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
const PROOF_NONCE = '0123456789abcdef0123456789abcdef';
const SERVER_POD_IP = '10.0.0.5';
const RS_UID = 'rs-uid-1';
const CONTAINER_ID_A = 'docker://hash-a';
const CONTAINER_ID_B = 'docker://hash-b';

/**
 * @param {import('../inventory.mjs').RedisInventoryTarget} target
 * @param {ReturnType<typeof buildHappyProofRunner>} runner
 */
function proofDeps(target, runner) {
  return {
    run: runner.run,
    runWrite: runner.runWrite,
    remainingMs: () => 600_000,
    observeInventory: () => runner.inventory,
    namespaceIdentity: { uid: NAMESPACE_UID },
    proofNonce: PROOF_NONCE,
  };
}

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
  let serverContainerId = CONTAINER_ID_A;
  let ttlExists = true;
  let restartExists = 0;
  let flushSentinelExists = false;
  let namespaceAbsent = false;
  const deploymentRv = { value: '101' };
  const namespaceRv = { value: '9001' };

  const inventory = {
    state: 'installed',
    reason: 'compatible',
    snapshot: {},
  };

  const inventoryByType = {
    'deployments.apps': [`deployment.apps/redis`],
    services: ['service/redis'],
    configmaps: ['configmap/redis-config', 'configmap/kube-root-ca.crt'],
    pods: [`pod/${SERVER_POD}`, 'pod/redis-client'],
    'replicasets.apps': ['replicaset.apps/redis-abc'],
    secrets: ['secret/sh.helm.release.v1.redis.v1'],
    serviceaccounts: ['serviceaccount/default'],
  };

  const namespaceJson = () =>
    JSON.stringify({
      metadata: {
        uid: NAMESPACE_UID,
        resourceVersion: namespaceRv.value,
        name: target.namespace,
        labels: { [proofNonceLabelKey('release')]: PROOF_NONCE },
      },
    });

  const serverPodJson = () =>
    JSON.stringify({
      metadata: {
        name: SERVER_POD,
        uid: serverPodUid,
        ownerReferences: [
          { kind: 'ReplicaSet', uid: RS_UID, controller: true },
        ],
      },
      status: {
        podIP: SERVER_POD_IP,
        conditions: [{ type: 'Ready', status: 'True' }],
        containerStatuses: [{ name: 'redis', containerID: serverContainerId }],
      },
    });

  const respondRedisExec = (redisArgs) => {
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
    if (sub === 'SET' && redisArgs[1] === FLUSH_SENTINEL_KEY) {
      flushSentinelExists = true;
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
    if (sub === 'EXISTS' && redisArgs[1] === FLUSH_SENTINEL_KEY) {
      return ok(`${flushSentinelExists ? 1 : 0}\n`);
    }
    if (sub === 'EXISTS' && redisArgs[1] === RESTART_MARKER_KEY) {
      return ok(`${restartExists}\n`);
    }
    if (sub === 'SET' && redisArgs[1] === RESTART_MARKER_KEY) {
      restartExists = 1;
      return ok('OK\n');
    }
    if (sub === 'FLUSHALL') {
      flushSentinelExists = false;
      return ok('OK\n');
    }
    if (sub === 'INFO') {
      return ok(`# Server\nredis_version:8.2.1\nrun_id:${serverRunId}\n`);
    }
    return fail(1, `unexpected redis-cli ${sub}`);
  };

  const run = (command, args) => {
    commands.push([command, args]);
    if (command === 'helm' && args[0] === 'history') {
      return ok(JSON.stringify([{ revision: 1, status: 'deployed' }]));
    }
    if (command !== 'kubectl') {
      return fail(1, 'unexpected command');
    }

    if (args.includes('api-resources')) {
      return ok(`${Object.keys(inventoryByType).join('\n')}\n`);
    }

    const getIdx = args.indexOf('get');
    const getType = getIdx >= 0 ? args[getIdx + 1] : '';
    if (getIdx >= 0 && args.includes('name') && !args.includes('-l')) {
      const lines = inventoryByType[getType];
      if (lines) {
        return ok(`${lines.join('\n')}\n`);
      }
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
    if (
      args.includes('json') &&
      args.includes('configmap') &&
      args.includes('redis-config')
    ) {
      return ok(
        JSON.stringify({
          metadata: { uid: CONFIG_UID, resourceVersion: '12' },
        }),
      );
    }
    if (args.includes('replicasets.apps') && args.includes('json')) {
      return ok(
        JSON.stringify({
          items: [
            {
              metadata: {
                uid: RS_UID,
                ownerReferences: [
                  {
                    kind: 'Deployment',
                    uid: DEPLOYMENT_UID,
                    controller: true,
                  },
                ],
              },
            },
          ],
        }),
      );
    }
    if (args.includes('namespace') && args.includes('json')) {
      if (args.includes('--ignore-not-found') && namespaceAbsent) {
        return ok('');
      }
      return ok(namespaceJson());
    }
    if (args.includes('endpointslices.discovery.k8s.io') && args.includes('json')) {
      return ok(JSON.stringify({
        apiVersion: 'v1', kind: 'List',
        items: [{
          apiVersion: 'discovery.k8s.io/v1', kind: 'EndpointSlice',
          metadata: { namespace: target.namespace, labels: { 'kubernetes.io/service-name': 'redis' } },
          addressType: 'IPv4',
          ports: scaleReplicas === 0 ? null : [{ name: 'redis', port: 6379, protocol: 'TCP' }],
          endpoints: scaleReplicas === 0 ? null : [{ addresses: [SERVER_POD_IP], conditions: { ready: true, serving: true, terminating: false },
            targetRef: { kind: 'Pod', namespace: target.namespace, uid: serverPodUid } }],
        }],
      }));
    }
    if (
      args.includes('json') &&
      args.includes('pod') &&
      args.includes(SERVER_POD)
    ) {
      return ok(serverPodJson());
    }
    if (
      args.includes('json') &&
      args.includes('pod') &&
      args.includes('redis-client')
    ) {
      return ok(
        JSON.stringify({
          metadata: { uid: CLIENT_UID, name: 'redis-client' },
          status: { conditions: [{ type: 'Ready', status: 'True' }] },
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
          items: [{ metadata: { name: SERVER_POD, uid: serverPodUid } }],
        }),
      );
    }
    if (args.includes('get') && args.includes('pods') && args.includes('-l')) {
      const labelIdx = args.indexOf('-l');
      if (args[labelIdx + 1] === 'app=redis-client') {
        return ok('pod/redis-client\n');
      }
    }
    if (args.includes('exec')) {
      const portIdx = args.lastIndexOf('6379');
      const redisArgs = portIdx >= 0 ? args.slice(portIdx + 1) : [];
      return respondRedisExec(redisArgs);
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
    if (command === 'kubectl' && args.includes('exec')) {
      const portIdx = args.lastIndexOf('6379');
      const redisArgs = portIdx >= 0 ? args.slice(portIdx + 1) : [];
      return respondRedisExec(redisArgs);
    }
    if (
      command === 'kubectl' &&
      args.includes('scale') &&
      args.includes('--replicas=0')
    ) {
      scaleReplicas = 0;
      deploymentRv.value = '102';
      return ok();
    }
    if (
      command === 'kubectl' &&
      args.includes('scale') &&
      args.includes('--replicas=1')
    ) {
      scaleReplicas = 1;
      serverPodUid = 'server-uid-2';
      serverRunId = RUN_ID_B;
      serverContainerId = CONTAINER_ID_B;
      restartExists = 0;
      deploymentRv.value = '103';
      return ok();
    }
    if (
      command === 'kubectl' &&
      args.includes('delete') &&
      args.includes('--raw')
    ) {
      namespaceAbsent = true;
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
    'deployment.apps/redis',
    'service/redis',
    'configmap/redis-config',
    'pod/redis-client',
    'pod/redis-abc',
    'replicaset.apps/redis-abc',
    'endpointslice.discovery.k8s.io/redis-abc',
    'secret/sh.helm.release.v1.redis.v1',
    'configmap/kube-root-ca.crt',
    'serviceaccount/default',
  ]);
  assert.equal(allowed.ok, true);

  const blocked = validateCleanupInventory([
    'deployment.apps/redis',
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
  const kind = classifyScaleZeroOutage(
    { ...fail(1, 'timed out'), timedOut: true },
    '',
  );
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
  const {
    run,
    runWrite: happyWrite,
    inventory,
  } = buildHappyProofRunner(target);
  const runWrite = (command, args, options) => {
    if (
      command === 'kubectl' &&
      args.includes('scale') &&
      args.includes('--replicas=0')
    ) {
      return {
        ok: false,
        status: null,
        stdout: '',
        stderr: '',
        timedOut: false,
      };
    }
    return happyWrite(command, args, options);
  };
  const receipt = await runRedisSmokeProof(target, 'release', {
    ...proofDeps(target, { run, runWrite, inventory }),
    runWrite,
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

  const receipt = await runRedisSmokeProof(
    target,
    'release',
    proofDeps(target, { run, runWrite, inventory }),
  );

  assert.equal(receipt.ok, true);
  assert.equal(receipt.runIds.before, RUN_ID_A);
  assert.equal(receipt.runIds.after, RUN_ID_B);
  assert.equal(receipt.receipt?.baselineMetadata?.namespaceUid, NAMESPACE_UID);

  const scaleDown = commands.find(
    ([, args]) => args.includes('scale') && args.includes('--replicas=0'),
  );
  const deleteNs = commands.find(
    ([, args]) => args.includes('delete') && args.includes('--raw'),
  );
  assert.ok(scaleDown);
  assert.ok(deleteNs);
  assert.ok(commands.some(([, args]) => args.includes('api-resources')));
  assert.ok(
    commands.some(
      ([, args]) =>
        args.includes('deployments.apps') &&
        args.includes('-o') &&
        args.includes('name'),
    ),
  );
  assert.ok(deleteNs);
});

test('unexpected inventory blocks namespace delete', async () => {
  const target = { ...releaseTarget, namespace: PROOF_NAMESPACE };
  const { run, runWrite, inventory } = buildHappyProofRunner(target);
  const runWithForeign = (command, args) => {
    const getIdx = args.indexOf('get');
    const getType = getIdx >= 0 ? args[getIdx + 1] : '';
    if (getType === 'configmaps' && args.includes('name')) {
      return ok('configmap/foreign\n');
    }
    return run(command, args);
  };
  const receipt = await runRedisSmokeProof(target, 'release', {
    ...proofDeps(target, { run: runWithForeign, runWrite, inventory }),
    run: runWithForeign,
  });
  assert.equal(receipt.ok, false);
  assert.equal(receipt.detail, 'unexpected-inventory');
});

test('recreated namespace UID mismatch refuses', async () => {
  const target = { ...releaseTarget, namespace: PROOF_NAMESPACE };
  const runner = buildHappyProofRunner(target);
  const run = (command, args) => {
    if (args.includes('namespace') && args.includes('json')) {
      return ok(
        JSON.stringify({
          metadata: {
            uid: 'wrong-uid',
            resourceVersion: '1',
            labels: { [proofNonceLabelKey('release')]: PROOF_NONCE },
          },
        }),
      );
    }
    return runner.run(command, args);
  };
  const receipt = await runRedisSmokeProof(target, 'release', {
    ...proofDeps(target, runner),
    run,
  });
  assert.equal(receipt.ok, false);
  assert.equal(receipt.detail, 'namespace-uid-recreated');
});

test('foreign descendant refuses cleanup inventory', async () => {
  const target = { ...releaseTarget, namespace: PROOF_NAMESPACE };
  const runner = buildHappyProofRunner(target);
  const run = (command, args) => {
    const getIdx = args.indexOf('get');
    const getType = getIdx >= 0 ? args[getIdx + 1] : '';
    if (getType === 'deployments.apps' && args.includes('name')) {
      return ok('deployment.apps/redis\ndeployment.apps/foreign\n');
    }
    return runner.run(command, args);
  };
  const receipt = await runRedisSmokeProof(target, 'release', {
    ...proofDeps(target, runner),
    run,
  });
  assert.equal(receipt.ok, false);
  assert.equal(receipt.detail, 'unexpected-inventory');
});

test('api-resources discovery uses qualified resource names', async () => {
  const target = { ...releaseTarget, namespace: PROOF_NAMESPACE };
  const runner = buildHappyProofRunner(target);
  const receipt = await runRedisSmokeProof(
    target,
    'release',
    proofDeps(target, runner),
  );
  assert.equal(receipt.ok, true);
  assert.ok(runner.commands.some(([, args]) => args.includes('api-resources')));
  assert.ok(
    runner.commands.some(
      ([, args]) =>
        args.includes('deployments.apps') &&
        args.includes('-o') &&
        args.includes('name'),
    ),
  );
});

test('zero endpoints is distinct from endpoints API failure', async () => {
  const target = { ...releaseTarget, namespace: PROOF_NAMESPACE };
  const runner = buildHappyProofRunner(target);
  const { run: happyRun, runWrite } = runner;
  const run = (command, args) => {
    if (
      args.includes('endpointslices.discovery.k8s.io') &&
      args.includes('json')
    ) {
      return fail(1, 'API unavailable');
    }
    return happyRun(command, args);
  };
  const receipt = await runRedisSmokeProof(target, 'release', {
    ...proofDeps(target, runner),
    run,
    runWrite,
  });
  assert.equal(receipt.ok, false);
  assert.equal(receipt.detail, 'endpoints-api-failure');
});

test('delete request uses DeleteOptions preconditions', async () => {
  const target = { ...releaseTarget, namespace: PROOF_NAMESPACE };
  const runner = buildHappyProofRunner(target);
  /** @type {string | undefined} */
  let deleteInput;
  const runWrite = (command, args, options = {}) => {
    if (
      command === 'kubectl' &&
      args.includes('delete') &&
      args.includes('--raw')
    ) {
      deleteInput = options.input;
    }
    return runner.runWrite(command, args, options);
  };
  const receipt = await runRedisSmokeProof(target, 'release', {
    ...proofDeps(target, runner),
    runWrite,
  });
  assert.equal(receipt.ok, true);
  const body = JSON.parse(String(deleteInput).trim());
  assert.equal(body.kind, 'DeleteOptions');
  assert.equal(body.preconditions.uid, NAMESPACE_UID);
  assert.equal(typeof body.preconditions.resourceVersion, 'string');
});

test('uncertainty retains receipt when absence unreadable', async () => {
  const target = { ...releaseTarget, namespace: PROOF_NAMESPACE };
  const runner = buildHappyProofRunner(target);
  const { run: happyRun, runWrite: happyWrite } = runner;
  const run = (command, args) => {
    if (args.includes('--ignore-not-found') && args.includes('namespace')) {
      return fail(1, 'transient API error');
    }
    return happyRun(command, args);
  };
  const receipt = await runRedisSmokeProof(target, 'release', {
    ...proofDeps(target, runner),
    run,
    runWrite: happyWrite,
  });
  assert.equal(receipt.ok, false);
  assert.equal(receipt.retainReceipt, true);
});

test('runVerifiedSmokeNamespaceCleanup deletes proof namespace with preconditions', async () => {
  const target = { ...releaseTarget, namespace: PROOF_NAMESPACE };
  const runner = buildHappyProofRunner(target);
  /** @type {string | undefined} */
  let deleteInput;
  let namespaceDeleted = false;
  const run = (command, args) => {
    if (
      namespaceDeleted &&
      args.includes('namespace') &&
      args.includes('--ignore-not-found')
    ) {
      return ok('');
    }
    return runner.run(command, args);
  };
  const runWrite = async (command, args, options) => {
    if (command === 'kubectl' && args.includes('--raw')) {
      deleteInput = options?.input;
      namespaceDeleted = true;
      return ok('');
    }
    return runner.runWrite(command, args, options);
  };
  runner.inventory.state = 'installed';
  const cleanup = await runVerifiedSmokeNamespaceCleanup(target, 'release', {
    run,
    runWrite,
    remainingMs: () => 600_000,
    namespaceIdentity: { uid: NAMESPACE_UID },
    proofNonce: PROOF_NONCE,
  });
  assert.equal(cleanup.ok, true);
  const body = JSON.parse(String(deleteInput).trim());
  assert.equal(body.preconditions.uid, NAMESPACE_UID);
});

test('cleanup recognizes native Endpoints and event aliases but refuses foreign Endpoints', () => {
  assert.equal(validateCleanupInventory([
    'endpoints/redis',
    'event.events.k8s.io/redis.123',
    'event/redis.123',
  ]).ok, true);
  assert.equal(validateCleanupInventory(['endpoints/foreign']).ok, false);
});

test('cleanup permits only the exact successful core Endpoints warning', async () => {
  const target = { ...releaseTarget, namespace: PROOF_NAMESPACE };
  const warning = 'Warning: v1 Endpoints is deprecated in v1.33+; use discovery.k8s.io/v1 EndpointSlice';
  for (const [resource, stderr, success, expected] of [
    ['endpoints', warning, true, true],
    ['endpoints', warning + '\nWarning: other', true, false],
    ['endpoints', warning, false, false],
    ['services', warning, true, false],
  ]) {
    const runner = buildHappyProofRunner(target);
    let deleted = false;
    const result = await runVerifiedSmokeNamespaceCleanup(target, 'release', {
      run: (command, args) => {
        if (args.includes('api-resources')) return ok(resource + '\n');
        if (args.includes('get') && args.includes(resource)) {
          return { ...ok('endpoints/redis\n'), ok: success, stderr };
        }
        if (deleted && args.includes('--ignore-not-found')) return ok('');
        return runner.run(command, args);
      },
      runWrite: async () => {
        deleted = true;
        return ok('');
      },
      remainingMs: () => 600_000,
      namespaceIdentity: { uid: NAMESPACE_UID },
      proofNonce: PROOF_NONCE,
    });
    assert.equal(result.ok, expected, JSON.stringify(result));
    assert.equal(deleted, expected);
  }
});

test('client startup polls same UID and timeout absence is never success', async () => {
  const target = { ...releaseTarget, namespace: PROOF_NAMESPACE };
  const runner = buildHappyProofRunner(target);
  let reads = 0;
  const result = await runRedisSmokeProof(target, 'release', {
    ...proofDeps(target, runner),
    run: (command, args) => {
      if (args.includes('get') && args.includes('pod') && args.includes('redis-client') && ++reads === 1) {
        return ok(JSON.stringify({ metadata: { uid: CLIENT_UID }, status: { conditions: [] } }));
      }
      if (args.includes('namespace') && args.includes('--ignore-not-found')) {
        return { ...fail(1, ''), timedOut: true, status: null };
      }
      return runner.run(command, args);
    },
  });
  assert.ok(reads >= 2);
  assert.equal(result.ok, false);
  assert.equal(result.retainReceipt, true);
  assert.equal(result.detail, 'namespace-absent-unreadable');
});

test('malformed null endpoint slice with non-null ports refuses before scale', async () => {
  const target = { ...releaseTarget, namespace: PROOF_NAMESPACE };
  const runner = buildHappyProofRunner(target);
  const result = await runRedisSmokeProof(target, 'release', {
    ...proofDeps(target, runner),
    run: (command, args) => {
      const response = runner.run(command, args);
      if (args.includes('endpointslices.discovery.k8s.io') && args.includes('json')) {
        const body = JSON.parse(response.stdout);
        body.items[0].endpoints = null;
        return ok(JSON.stringify(body));
      }
      return response;
    },
  });
  assert.equal(result.ok, false);
  assert.equal(result.detail, 'endpoints-slice-shape');
  assert.equal(runner.commands.some(([, args]) => args.includes('scale')), false);
});
