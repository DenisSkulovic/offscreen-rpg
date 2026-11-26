import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import test from 'node:test';
import { redisTargetFromProfile } from '../inventory.mjs';
import {
  REDIS_CONFIG_HASH_ANNOTATION,
  assessRedisReadyState,
  buildDesiredProjection,
  compareObservationSnapshots,
  observeRedisReady,
  observeTargetReady,
  parseConfigGetReply,
  parseInfoServerReply,
  parsePingReply,
  runReadinessProtocol,
} from '../readiness.mjs';

const devTarget = redisTargetFromProfile('dev');
const OWNER_KEY = devTarget.ownerKey;
const OWNER_VALUE = devTarget.ownerValue;
const NAMESPACE = devTarget.namespace;
const RUN_ID = 'a'.repeat(40);
const EXPECTED_IMAGE =
  'docker.io/library/redis@sha256:987c376c727652f99625c7d205a1cba3cb2c53b92b0b62aade2bd48ee1593232';

const REDIS_CONF = [
  'bind 0.0.0.0',
  'protected-mode no',
  'port 6379',
  'save ""',
  'appendonly no',
  'dir /data',
  'maxmemory 32mb',
  'maxmemory-policy allkeys-lru',
].join('\n');

const CONFIG_SHA256 = createHash('sha256').update(REDIS_CONF).digest('hex');

function ok(stdout = '', stderr = '') {
  return {
    ok: true,
    status: 0,
    stdout,
    stderr,
    timedOut: false,
    missing: false,
  };
}

function probeFail({ timedOut = false, stderr = 'boom' } = {}) {
  return {
    ok: false,
    status: timedOut ? null : 1,
    stdout: '',
    stderr,
    timedOut,
    missing: false,
  };
}

function infoBody({ runId = RUN_ID, version = '8.2.1' } = {}) {
  return `# Server\r\nredis_version:${version}\r\nrun_id:${runId}\r\n`;
}

function configBody(key, value) {
  return `${key}\n${value}\n`;
}

function baseDeploymentTemplate(overrides = {}) {
  return {
    metadata: {
      labels: {
        'app.kubernetes.io/name': 'redis',
        'app.kubernetes.io/instance': 'redis',
        [OWNER_KEY]: OWNER_VALUE,
      },
      annotations: {
        [REDIS_CONFIG_HASH_ANNOTATION]: CONFIG_SHA256,
      },
    },
    spec: {
      automountServiceAccountToken: false,
      enableServiceLinks: false,
      securityContext: {
        runAsNonRoot: true,
        runAsUser: 999,
        runAsGroup: 1000,
        fsGroup: 1000,
        seccompProfile: { type: 'RuntimeDefault' },
      },
      containers: [
        {
          name: 'redis',
          image: EXPECTED_IMAGE,
          imagePullPolicy: 'IfNotPresent',
          command: ['redis-server', '/config/redis.conf'],
          ports: [{ name: 'redis', containerPort: 6379 }],
          securityContext: {
            allowPrivilegeEscalation: false,
            capabilities: { drop: ['ALL'] },
          },
          resources: {
            requests: { cpu: '20m', memory: '32Mi' },
            limits: { cpu: '500m', memory: '128Mi' },
          },
          readinessProbe: {
            exec: { command: ['redis-cli', 'ping'] },
            periodSeconds: 2,
            timeoutSeconds: 2,
            failureThreshold: 3,
            successThreshold: 1,
          },
          livenessProbe: {
            exec: { command: ['redis-cli', 'ping'] },
            periodSeconds: 10,
            timeoutSeconds: 2,
            failureThreshold: 3,
            successThreshold: 1,
          },
          volumeMounts: [
            { name: 'config', mountPath: '/config', readOnly: true },
            { name: 'data', mountPath: '/data' },
          ],
          ...overrides.container,
        },
      ],
      volumes: overrides.volumes ?? [
        { name: 'config', configMap: { name: 'redis-config' } },
        { name: 'data', emptyDir: { sizeLimit: '32Mi' } },
      ],
    },
  };
}

function buildDesiredManifestDocs() {
  const configMap = {
    apiVersion: 'v1',
    kind: 'ConfigMap',
    metadata: {
      name: 'redis-config',
      namespace: NAMESPACE,
      labels: {
        'app.kubernetes.io/name': 'redis',
        'app.kubernetes.io/instance': 'redis',
        [OWNER_KEY]: OWNER_VALUE,
      },
    },
    data: { 'redis.conf': REDIS_CONF },
  };
  const deployment = {
    apiVersion: 'apps/v1',
    kind: 'Deployment',
    metadata: {
      name: 'redis',
      namespace: NAMESPACE,
      labels: {
        'app.kubernetes.io/name': 'redis',
        'app.kubernetes.io/instance': 'redis',
        [OWNER_KEY]: OWNER_VALUE,
      },
    },
    spec: {
      replicas: 1,
      strategy: { type: 'Recreate' },
      selector: {
        matchLabels: {
          'app.kubernetes.io/name': 'redis',
          'app.kubernetes.io/instance': 'redis',
        },
      },
      template: baseDeploymentTemplate(),
    },
  };
  const service = {
    apiVersion: 'v1',
    kind: 'Service',
    metadata: {
      name: 'redis',
      namespace: NAMESPACE,
      labels: {
        'app.kubernetes.io/name': 'redis',
        'app.kubernetes.io/instance': 'redis',
        [OWNER_KEY]: OWNER_VALUE,
      },
    },
    spec: {
      type: 'ClusterIP',
      selector: {
        'app.kubernetes.io/name': 'redis',
        'app.kubernetes.io/instance': 'redis',
      },
      ports: [
        {
          name: 'redis',
          port: 6379,
          protocol: 'TCP',
          targetPort: 'redis',
        },
      ],
    },
  };
  return [configMap, deployment, service];
}

function buildDesired() {
  return buildDesiredProjection(buildDesiredManifestDocs());
}

function liveBundle({
  deploymentRv = 'dep-rv-1',
  afterRv = deploymentRv,
  containerId = 'docker://cid-1',
  afterContainerId = containerId,
  podRv = 'pod-rv-1',
  extraEndpoint = false,
  deploymentTemplate = baseDeploymentTemplate(),
} = {}) {
  const podUid = 'pod-uid-1';
  const pod = {
    metadata: {
      name: 'redis-pod-1',
      namespace: NAMESPACE,
      uid: podUid,
      resourceVersion: podRv,
    },
    status: {
      podIP: '10.0.0.7',
      conditions: [{ type: 'Ready', status: 'True' }],
      containerStatuses: [
        {
          name: 'redis',
          containerID: containerId,
          imageID: EXPECTED_IMAGE,
          restartCount: 0,
          ready: true,
          state: {
            running: { startedAt: '2026-11-26T10:00:00Z' },
          },
        },
      ],
    },
  };
  const afterPod = {
    ...pod,
    status: {
      ...pod.status,
      containerStatuses: [
        {
          ...pod.status.containerStatuses[0],
          containerID: afterContainerId,
        },
      ],
    },
  };
  const serviceUid = 'svc-uid-1';
  const endpointSlice = {
    metadata: {
      name: 'redis-endpoints',
      uid: 'ep-uid-1',
      resourceVersion: 'ep-rv-1',
      ownerReferences: [
        {
          apiVersion: 'v1',
          kind: 'Service',
          name: 'redis',
          uid: serviceUid,
          controller: true,
          blockOwnerDeletion: true,
        },
      ],
    },
    addressType: 'IPv4',
    ports: [{ name: 'redis', protocol: 'TCP', port: 6379 }],
    endpoints: [
      {
        addresses: ['10.0.0.7'],
        conditions: { ready: true, serving: true, terminating: false },
        targetRef: {
          kind: 'Pod',
          namespace: NAMESPACE,
          name: 'redis-pod-1',
          uid: podUid,
        },
        nodeName: 'worker',
      },
    ],
  };
  const extraSlice = extraEndpoint
    ? {
        ...endpointSlice,
        metadata: {
          ...endpointSlice.metadata,
          name: 'redis-endpoints-extra',
          uid: 'ep-uid-2',
        },
      }
    : null;
  const deployment = {
    metadata: {
      name: 'redis',
      namespace: NAMESPACE,
      uid: 'dep-uid-1',
      resourceVersion: deploymentRv,
      generation: 1,
    },
    spec: {
      replicas: 1,
      selector: {
        matchLabels: {
          'app.kubernetes.io/name': 'redis',
          'app.kubernetes.io/instance': 'redis',
        },
      },
      template: deploymentTemplate,
    },
    status: {
      observedGeneration: 1,
      updatedReplicas: 1,
      readyReplicas: 1,
      availableReplicas: 1,
      replicas: 1,
    },
  };
  const afterDeployment = {
    ...deployment,
    metadata: { ...deployment.metadata, resourceVersion: afterRv },
  };
  return {
    namespace: {
      metadata: {
        name: NAMESPACE,
        uid: 'ns-uid-1',
        resourceVersion: 'ns-rv-1',
      },
    },
    configMap: {
      metadata: {
        name: 'redis-config',
        uid: 'cm-uid-1',
        resourceVersion: 'cm-rv-1',
      },
      data: { 'redis.conf': REDIS_CONF },
    },
    deployment,
    afterDeployment,
    service: {
      metadata: {
        name: 'redis',
        namespace: NAMESPACE,
        uid: serviceUid,
        resourceVersion: 'svc-rv-1',
      },
      spec: buildDesiredManifestDocs()[2].spec,
    },
    replicaSets: [
      {
        metadata: {
          name: 'redis-rs-1',
          uid: 'rs-uid-1',
          resourceVersion: 'rs-rv-1',
        },
      },
    ],
    pod,
    afterPod,
    endpointSlices: extraSlice ? [endpointSlice, extraSlice] : [endpointSlice],
  };
}

/**
 * @param {object} scenario
 */
function createObserverRun(scenario = {}) {
  const bundle = liveBundle(scenario);
  const desired = buildDesired();
  let snapshotIndex = -1;
  let probeIndex = 0;
  /** @type {Array<[string, string[]]>} */
  const commands = [];

  const protocolSteps = [
    () => ok(infoBody({ version: scenario.infoVersion ?? '8.2.1' })),
    () => ok(infoBody({ version: scenario.infoVersion ?? '8.2.1' })),
    () => ok(scenario.pingResponse ?? 'PONG\n'),
    () => ok(configBody('maxmemory', scenario.maxmemory ?? '33554432')),
    () => ok(configBody('maxmemory-policy', 'allkeys-lru')),
    () => ok(configBody('save', '')),
    () => ok(configBody('appendonly', 'no')),
    () => ok(configBody('maxclients', '10000')),
    () => ok(configBody('maxmemory-clients', '0')),
    () => ok(infoBody({ version: scenario.infoVersion ?? '8.2.1' })),
    () => ok(infoBody({ version: scenario.infoVersion ?? '8.2.1' })),
  ];

  /**
   * @param {string} command
   * @param {string[]} args
   */
  const run = (command, args) => {
    commands.push([command, args]);
    if (command !== 'kubectl') {
      return {
        ok: false,
        status: 1,
        stdout: '',
        stderr: 'unexpected',
        timedOut: false,
        missing: false,
      };
    }
    if (args.includes('exec')) {
      if (scenario.probeTimedOut) {
        return probeFail({ timedOut: true });
      }
      if (scenario.probeStderr) {
        return probeFail({ stderr: scenario.probeStderr });
      }
      const reply = protocolSteps[probeIndex]?.() ?? ok('');
      probeIndex += 1;
      if (scenario.afterRunId && probeIndex > 2) {
        return ok(infoBody({ runId: scenario.afterRunId }));
      }
      return reply;
    }
    const resourceIdx = args.indexOf('get') + 1;
    const resourceKind = args[resourceIdx];
    const resourceName = args[resourceIdx + 1];
    if (
      args.includes('get') &&
      resourceKind === 'namespace' &&
      resourceName === NAMESPACE
    ) {
      snapshotIndex += 1;
      return ok(JSON.stringify(bundle.namespace));
    }
    if (
      args.includes('get') &&
      resourceKind === 'configmap' &&
      resourceName === 'redis-config'
    ) {
      return ok(JSON.stringify(bundle.configMap));
    }
    if (
      args.includes('get') &&
      resourceKind === 'deployment' &&
      resourceName === 'redis'
    ) {
      const deploy =
        snapshotIndex < 1 ? bundle.deployment : bundle.afterDeployment;
      return ok(JSON.stringify(deploy));
    }
    if (
      args.includes('get') &&
      resourceKind === 'service' &&
      resourceName === 'redis'
    ) {
      return ok(JSON.stringify(bundle.service));
    }
    if (args.includes('replicaset')) {
      return ok(JSON.stringify({ items: bundle.replicaSets }));
    }
    if (args.includes('pods')) {
      const pod = snapshotIndex < 1 ? bundle.pod : bundle.afterPod;
      return ok(JSON.stringify({ items: [pod] }));
    }
    if (args.includes('endpointslice')) {
      return ok(JSON.stringify({ items: bundle.endpointSlices }));
    }
    return {
      ok: false,
      status: 1,
      stdout: '',
      stderr: 'unhandled kubectl',
      timedOut: false,
      missing: false,
    };
  };

  return { run, commands, desired, bundle };
}

test('protocol parsers accept canonical replies and refuse false success', () => {
  const info = parseInfoServerReply(infoBody());
  assert.equal(info.ok, true);
  assert.equal(info.runId, RUN_ID);
  assert.equal(parsePingReply('PONG\n').ok, true);
  assert.equal(parseConfigGetReply('save\n\n', 'save').ok, true);
  assert.equal(parsePingReply('PONG extra\n').ok, false);
  assert.equal(parsePingReply('OK\n').ok, false);
  assert.equal(parseInfoServerReply(infoBody({ version: '7.0.0' })).ok, false);
  assert.equal(parseConfigGetReply('maxmemory\n1\n', 'maxmemory').ok, false);
});

test('ready path with identical snapshots and strict protocol succeeds', () => {
  const { run, desired } = createObserverRun();
  const result = observeTargetReady(devTarget, desired, {
    run,
    deadline: Date.now() + 60_000,
  });
  assert.equal(result.state, 'ready');
  assert.equal(result.detail, 'compatible-ready');
});

test('resourceVersion churn with same UID yields unstable', () => {
  const { run, desired } = createObserverRun({ afterRv: 'dep-rv-2' });
  const result = observeTargetReady(devTarget, desired, {
    run,
    deadline: Date.now() + 60_000,
  });
  assert.equal(result.state, 'unstable');
});

test('containerID change across snapshots is not ready', () => {
  const { run, desired } = createObserverRun({
    afterContainerId: 'docker://cid-2',
  });
  const result = observeTargetReady(devTarget, desired, {
    run,
    deadline: Date.now() + 60_000,
  });
  assert.equal(result.state, 'unready');
});

test('extra endpoint refuses readiness', () => {
  const { run, desired } = createObserverRun({ extraEndpoint: true });
  const result = observeTargetReady(devTarget, desired, {
    run,
    deadline: Date.now() + 60_000,
  });
  assert.equal(result.state, 'unready');
});

test('false PONG refuses readiness', () => {
  const { run, desired } = createObserverRun({ pingResponse: 'PONG extra\n' });
  const result = observeTargetReady(devTarget, desired, {
    run,
    deadline: Date.now() + 60_000,
  });
  assert.equal(result.state, 'unready');
});

test('wrong redis version and maxmemory refuse readiness', () => {
  const harness = createObserverRun({ infoVersion: '7.0.0' });
  const versionResult = observeTargetReady(devTarget, harness.desired, {
    run: harness.run,
    deadline: Date.now() + 60_000,
  });
  assert.equal(versionResult.state, 'unready');

  const badMem = createObserverRun({ maxmemory: '1' });
  const memResult = observeTargetReady(devTarget, badMem.desired, {
    run: badMem.run,
    deadline: Date.now() + 60_000,
  });
  assert.equal(memResult.state, 'unready');
});

test('probe stderr and timeout are unreadable', () => {
  const stderrCase = createObserverRun({ probeStderr: 'exec failed' });
  const stderrResult = observeTargetReady(devTarget, stderrCase.desired, {
    run: stderrCase.run,
    deadline: Date.now() + 60_000,
  });
  assert.equal(stderrResult.state, 'unreadable');

  const timeoutCase = createObserverRun({ probeTimedOut: true });
  const timeoutResult = observeTargetReady(devTarget, timeoutCase.desired, {
    run: timeoutCase.run,
    deadline: Date.now() + 60_000,
  });
  assert.equal(timeoutResult.state, 'unreadable');
});

test('unexpected env, volume, and security context refuse compatibility', () => {
  const desired = buildDesired();
  const bundle = liveBundle();
  const badEnv = assessRedisReadyState(
    {
      ...bundle,
      deployment: {
        ...bundle.deployment,
        spec: {
          ...bundle.deployment.spec,
          template: baseDeploymentTemplate({
            container: { env: [{ name: 'X', value: 'y' }] },
          }),
        },
      },
    },
    desired,
  );
  assert.equal(badEnv.ok, false);

  const badVol = assessRedisReadyState(
    {
      ...bundle,
      deployment: {
        ...bundle.deployment,
        spec: {
          ...bundle.deployment.spec,
          template: baseDeploymentTemplate({
            volumes: [
              { name: 'config', configMap: { name: 'redis-config' } },
              { name: 'data', emptyDir: { sizeLimit: '32Mi' } },
              { name: 'extra', emptyDir: {} },
            ],
          }),
        },
      },
    },
    desired,
  );
  assert.equal(badVol.ok, false);

  const badSec = assessRedisReadyState(
    {
      deployment: {
        ...bundle.deployment,
        spec: {
          ...bundle.deployment.spec,
          template: {
            ...baseDeploymentTemplate(),
            spec: {
              ...baseDeploymentTemplate().spec,
              securityContext: {
                runAsUser: 0,
                runAsGroup: 0,
                runAsNonRoot: false,
              },
            },
          },
        },
      },
      service: bundle.service,
      configMap: bundle.configMap,
    },
    desired,
  );
  assert.equal(badSec.ok, false);
});

test('inventory absent does not exec redis probes', () => {
  /** @type {Array<[string, string[]]>} */
  const commands = [];
  const run = (command, args) => {
    commands.push([command, args]);
    if (command === 'helm' && args[0] === 'version' && args[1] === '--short') {
      return ok('v3.22.1\n');
    }
    if (command === 'kubectl' && args.includes('namespace')) {
      // Empty successful stdout is absence. Stderr would be unreadable.
      return ok('');
    }
    return ok('');
  };
  const result = observeRedisReady('dev', { run });
  assert.equal(result.state, 'absent');
  assert.equal(
    commands.some(([cmd, args]) => cmd === 'kubectl' && args.includes('exec')),
    false,
  );
});

test('compareObservationSnapshots detects resourceVersion churn', () => {
  const before = {
    ok: true,
    namespace: { metadata: { uid: 'u1', resourceVersion: '1' } },
    configMap: { metadata: { uid: 'u2', resourceVersion: '1' } },
    deployment: { metadata: { uid: 'u3', resourceVersion: '1' } },
    service: { metadata: { uid: 'u4', resourceVersion: '1' } },
    pods: [{ metadata: { uid: 'u5', resourceVersion: '1' } }],
    replicaSets: [{ metadata: { uid: 'u6', resourceVersion: '1' } }],
    endpointSlices: [{ metadata: { uid: 'u7', resourceVersion: '1' } }],
  };
  const after = {
    ...before,
    deployment: { metadata: { uid: 'u3', resourceVersion: '2' } },
  };
  const unstable = compareObservationSnapshots(before, after);
  assert.equal(unstable.ok, false);
  assert.equal(unstable.state, 'unstable');
});

test('runReadinessProtocol enforces identical run_id across four INFO replies', () => {
  let infoCount = 0;
  const run = () => {
    infoCount += 1;
    const runId = infoCount < 3 ? RUN_ID : 'b'.repeat(40);
    return ok(infoBody({ runId }));
  };
  const result = runReadinessProtocol(
    devTarget,
    'redis-pod-1',
    NAMESPACE,
    run,
    Date.now() + 30_000,
  );
  assert.equal(result.ok, false);
  assert.equal(result.state, 'unready');
});
