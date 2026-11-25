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
import { observeRedis, planRedisInstall } from '../observations.mjs';
import { readPlatformProfile } from '../../common/profile.mjs';
import { renderPlatformDocuments } from '../../common/render.mjs';
import {
  manifestHasAuthMaterial,
  validateRenderedRedisDocs,
} from '../reconcile.mjs';

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
      {
        name: 'kind-offscreen-dev',
        context: { cluster: 'kind-offscreen-dev' },
      },
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

function readyDeploymentObject(configData) {
  return {
    metadata: {
      name: 'redis',
      namespace: DEV_REDIS_NAMESPACE,
      uid: 'dep-uid',
      resourceVersion: 'dep-rv-1',
      generation: 1,
      labels: { app: 'redis', 'offscreen.dev/owner': DEV_CLUSTER_OWNER },
    },
    spec: { replicas: 1, selector: { matchLabels: { app: 'redis' } } },
    status: {
      observedGeneration: 1,
      updatedReplicas: 1,
      readyReplicas: 1,
      availableReplicas: 1,
      replicas: 1,
    },
  };
}

function readyServiceObject() {
  return {
    metadata: {
      name: 'redis',
      namespace: DEV_REDIS_NAMESPACE,
      uid: 'svc-uid',
      resourceVersion: 'svc-rv-1',
      labels: { app: 'redis', 'offscreen.dev/owner': DEV_CLUSTER_OWNER },
    },
    spec: {
      type: 'ClusterIP',
      selector: { app: 'redis' },
      ports: [
        { name: 'redis', port: 6379, protocol: 'TCP', targetPort: 'redis' },
      ],
    },
  };
}

function readyConfigMapObject(data) {
  return {
    metadata: {
      name: 'redis-config',
      namespace: DEV_REDIS_NAMESPACE,
      uid: 'cm-uid',
      resourceVersion: 'cm-rv-1',
      labels: { app: 'redis', 'offscreen.dev/owner': DEV_CLUSTER_OWNER },
    },
    data,
  };
}

/**
 * @param {{
 *   reuseNamespace?: boolean,
 *   presentChildren?: boolean | 'configMapOnly',
 *   immutableConfigMap?: boolean,
 *   badServiceType?: boolean,
 *   namespaceCreateFails?: boolean,
 *   namespaceCreateTimedOut?: boolean,
 *   alreadyExistsChild?: 'configMap' | 'deployment' | 'service',
 *   patchConflict?: 'configMap' | 'deployment',
 *   namespaceUidDrift?: boolean,
 *   rolloutFails?: boolean,
 *   finalReadiness?: 'ready' | 'stale' | 'missing-config' | 'bad-service',
 * }} [options]
 */
function buildReconcileHarness(options = {}) {
  /** @type {Array<[string, string[]]>} */
  const commands = [];
  /** @type {unknown[]} */
  const patches = [];
  let uidCounter = 0;
  const nextUid = () => `uid-${++uidCounter}`;
  const nextRv = () => `rv-${uidCounter}`;

  const renderedDocs = renderPlatformDocuments(
    { service: 'redis', profile: 'dev', section: 'all' },
    { run: helmRun, chartRoot },
  );
  const renderedByKind = Object.fromEntries(
    renderedDocs.map((doc) => [doc.kind, doc]),
  );
  const configData = renderedByKind.ConfigMap.data;

  /** @type {{ uid: string, owner: string, rv: string } | null} */
  let namespace =
    options.reuseNamespace === true
      ? { uid: 'ns-owned', owner: DEV_CLUSTER_OWNER, rv: 'ns-rv-1' }
      : null;
  const childrenPresent =
    options.presentChildren === true ||
    options.presentChildren === 'configMapOnly';
  /** @type {object | null} */
  let configMap =
    childrenPresent && !options.finalReadiness?.includes('missing')
      ? readyConfigMapObject(configData)
      : null;
  /** @type {object | null} */
  let deployment =
    options.presentChildren === true ? readyDeploymentObject(configData) : null;
  /** @type {object | null} */
  let service = options.presentChildren === true ? readyServiceObject() : null;
  let rolloutComplete = false;

  if (options.immutableConfigMap && configMap) {
    configMap = { ...configMap, immutable: true };
  }
  if (options.badServiceType && service) {
    service = {
      ...service,
      spec: { ...service.spec, type: 'NodePort' },
    };
  }

  function namespaceObject() {
    if (!namespace) {
      return null;
    }
    return {
      metadata: {
        name: DEV_REDIS_NAMESPACE,
        uid: options.namespaceUidDrift ? 'drifted-ns' : namespace.uid,
        resourceVersion: namespace.rv,
        labels: { 'offscreen.dev/owner': namespace.owner },
      },
    };
  }

  function run(command, args, runOptions = {}) {
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
      command === 'kubectl' &&
      joined.includes('get deployment') &&
      joined.includes(' redis')
    ) {
      if (rolloutComplete && options.finalReadiness === 'stale') {
        return {
          ok: true,
          stdout: JSON.stringify({
            ...readyDeploymentObject(configData),
            status: {
              observedGeneration: 0,
              updatedReplicas: 0,
              readyReplicas: 0,
              availableReplicas: 0,
              replicas: 1,
            },
          }),
        };
      }
      return {
        ok: true,
        stdout: deployment ? JSON.stringify(deployment) : '',
      };
    }
    if (
      command === 'kubectl' &&
      joined.includes('get service') &&
      joined.includes(' redis')
    ) {
      if (rolloutComplete && options.finalReadiness === 'bad-service') {
        return {
          ok: true,
          stdout: JSON.stringify({
            ...readyServiceObject(),
            spec: { type: 'NodePort', selector: { app: 'redis' }, ports: [] },
          }),
        };
      }
      return { ok: true, stdout: service ? JSON.stringify(service) : '' };
    }
    if (
      command === 'kubectl' &&
      joined.includes('get configmap') &&
      joined.includes('redis-config')
    ) {
      if (rolloutComplete && options.finalReadiness === 'missing-config') {
        return { ok: true, stdout: '' };
      }
      return { ok: true, stdout: configMap ? JSON.stringify(configMap) : '' };
    }
    if (
      command === 'kubectl' &&
      joined.includes('create') &&
      joined.includes('-o') &&
      joined.includes('json')
    ) {
      if (options.namespaceCreateTimedOut) {
        return {
          ok: false,
          timedOut: true,
          stdout: '',
          stderr: 'timeout',
        };
      }
      if (options.namespaceCreateFails) {
        return {
          ok: false,
          status: 1,
          stdout: '',
          stderr: 'namespaces "offscreen-dev-redis" already exists',
        };
      }
      namespace = {
        uid: nextUid(),
        owner: DEV_CLUSTER_OWNER,
        rv: nextRv(),
      };
      return {
        ok: true,
        stdout: JSON.stringify({
          metadata: {
            name: DEV_REDIS_NAMESPACE,
            uid: namespace.uid,
            resourceVersion: namespace.rv,
            labels: { 'offscreen.dev/owner': namespace.owner },
          },
        }),
      };
    }
    if (
      command === 'kubectl' &&
      args.includes('create') &&
      args.includes('-f') &&
      !args.includes('-o')
    ) {
      const doc = JSON.parse(String(runOptions.input ?? '').trim());
      const childKey =
        doc.kind === 'ConfigMap'
          ? 'configMap'
          : doc.kind === 'Deployment'
            ? 'deployment'
            : 'service';
      if (options.alreadyExistsChild === childKey) {
        return {
          ok: false,
          status: 1,
          stderr: `Error from server (AlreadyExists): ${doc.kind.toLowerCase()}s "${doc.metadata.name}" already exists`,
          stdout: '',
        };
      }
      const object = {
        ...doc,
        metadata: {
          ...doc.metadata,
          uid: nextUid(),
          resourceVersion: nextRv(),
          generation: 1,
        },
      };
      if (childKey === 'configMap') {
        configMap = object;
      } else if (childKey === 'deployment') {
        deployment = {
          ...object,
          status: readyDeploymentObject(configData).status,
        };
      } else {
        service = object;
      }
      return { ok: true, stdout: `${doc.kind}/${doc.metadata.name} created\n` };
    }
    if (command === 'kubectl' && joined.includes(' patch ')) {
      const patchArgIndex = args.indexOf('-p');
      const patch = JSON.parse(args[patchArgIndex + 1] ?? '[]');
      patches.push(patch);
      const kind = args[args.indexOf('patch') + 1];
      const target =
        kind === 'configmap'
          ? configMap
          : kind === 'deployment'
            ? deployment
            : null;
      if (!target) {
        return {
          ok: false,
          status: 1,
          stderr: 'patch target missing',
          stdout: '',
        };
      }
      for (const op of patch) {
        if (
          op.op === 'test' &&
          op.path === '/metadata/uid' &&
          op.value !== target.metadata.uid
        ) {
          return {
            ok: false,
            status: 1,
            stderr: 'uid test failed',
            stdout: '',
          };
        }
        if (
          op.op === 'test' &&
          op.path === '/metadata/resourceVersion' &&
          op.value !== target.metadata.resourceVersion
        ) {
          return {
            ok: false,
            status: 1,
            stderr: 'resourceVersion test failed',
            stdout: '',
          };
        }
      }
      if (
        (kind === 'configmap' && options.patchConflict === 'configMap') ||
        (kind === 'deployment' && options.patchConflict === 'deployment')
      ) {
        return { ok: false, status: 1, stderr: 'patch conflict', stdout: '' };
      }
      for (const op of patch) {
        if (op.op === 'add' && op.path === '/data') {
          configMap = { ...target, data: op.value };
        }
        if (op.op === 'add' && op.path === '/spec') {
          deployment = {
            ...target,
            spec: op.value,
            status: readyDeploymentObject(configData).status,
          };
        }
      }
      return { ok: true, stdout: `${kind}/redis patched\n` };
    }
    if (
      command === 'kubectl' &&
      joined.includes('rollout status deployment/redis')
    ) {
      if (options.rolloutFails) {
        return { ok: false, status: 1, stderr: 'rollout failed', stdout: '' };
      }
      rolloutComplete = true;
      if (deployment) {
        deployment = {
          ...deployment,
          status: readyDeploymentObject(configData).status,
        };
      }
      return {
        ok: true,
        stdout: 'deployment "redis" successfully rolled out\n',
      };
    }
    if (command === 'helm') {
      return helmRun(command, args, runOptions);
    }
    return {
      ok: false,
      stderr: `unhandled ${command} ${joined}`,
      stdout: '',
    };
  }

  /**
   * @param {string[]} args
   */
  function isRedisNamespaceGet(args) {
    const getIndex = args.indexOf('get');
    return (
      getIndex >= 0 &&
      args[getIndex + 1] === 'namespace' &&
      args[getIndex + 2] === DEV_REDIS_NAMESPACE
    );
  }

  const wrappedRun = (command, args, runOptions = {}) => {
    commands.push([command, args]);
    if (command === 'kubectl' && isRedisNamespaceGet(args)) {
      const object = namespaceObject();
      return {
        ok: true,
        stdout: object ? JSON.stringify(object) : '',
      };
    }
    return run(command, args, runOptions);
  };

  return {
    commands,
    patches,
    run: wrappedRun,
    renderedDocs,
    renderedByKind,
    configData,
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
    configMap: { state: 'absent' },
  };
  const plan = planDevRedisInstall(observations);
  assert.equal(plan.ok, false);
  assert.equal(plan.refusals[0]?.id, 'namespace-foreign');
});

test('executeAuthorizedDevRedis ensures dev namespace then creates rendered redis in order', () => {
  const harness = buildReconcileHarness();
  const result = executeAuthorizedDevRedis({
    run: harness.run,
    renderDeps: { run: harness.run, chartRoot },
  });
  assert.equal(result.ok, true);
  assert.equal(result.mutated, true);
  const joined = harness.commands
    .map(([cmd, args]) => `${cmd} ${args.join(' ')}`)
    .join('\n');
  assert.match(joined, /--context kind-offscreen-dev/);
  assert.doesNotMatch(joined, /kind-offscreen-release/);
  assert.doesNotMatch(joined, /install\.sh/);
  assert.match(joined, /offscreen-dev-redis/);
  assert.match(joined, /helm template/);
  assert.match(joined, /development\.yaml/);
  assert.equal(
    harness.commands.filter(
      ([cmd, args]) => cmd === 'kubectl' && args.join(' ').includes(' apply '),
    ).length,
    0,
  );
  assert.equal(
    harness.commands.filter(
      ([cmd, args]) =>
        cmd === 'kubectl' && args.join(' ').includes('create -f - -o json'),
    ).length,
    1,
  );
  assert.equal(
    harness.commands.filter(
      ([cmd, args]) =>
        cmd === 'kubectl' &&
        args.includes('create') &&
        args.includes('-f') &&
        !args.includes('-o'),
    ).length,
    3,
  );
  assert.deepEqual(
    result.actions.map((action) => action.op),
    [
      'ensure-namespace',
      'ensure-configMap',
      'ensure-deployment',
      'ensure-service',
      'verify-rollout',
      'verify-readiness',
    ],
  );
});

test('executeAuthorizedDevRedis reuses existing owned namespace', () => {
  const harness = buildReconcileHarness({ reuseNamespace: true });
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
    0,
  );
  assert.equal(
    harness.commands.filter(
      ([cmd, args]) =>
        cmd === 'kubectl' && args.join(' ').includes('create -f - -o json'),
    ).length,
    0,
  );
});

test('harness reuse namespace observation carries uid', () => {
  const harness = buildReconcileHarness({
    reuseNamespace: true,
    presentChildren: true,
  });
  const observations = observeDevRedis({ run: harness.run });
  assert.equal(observations.namespace.state, 'present');
  assert.equal(observations.namespace.object?.metadata?.uid, 'ns-owned');
});

test('executeAuthorizedDevRedis patches present children with uid and resourceVersion tests first', () => {
  const harness = buildReconcileHarness({
    reuseNamespace: true,
    presentChildren: 'configMapOnly',
  });
  const result = executeAuthorizedDevRedis({
    run: harness.run,
    renderDeps: { run: harness.run, chartRoot },
  });
  if (!result.ok) {
    assert.fail(JSON.stringify(result.refusals ?? []));
  }
  assert.equal(harness.patches.length, 1);
  for (const patch of harness.patches) {
    assert.equal(patch[0]?.op, 'test');
    assert.equal(patch[0]?.path, '/metadata/uid');
    assert.equal(patch[1]?.op, 'test');
    assert.equal(patch[1]?.path, '/metadata/resourceVersion');
  }
  assert.equal(
    result.actions.some((action) => action.op === 'ensure-deployment'),
    true,
  );
  assert.equal(
    result.actions.some((action) => action.op === 'ensure-service'),
    true,
  );
});

test('executeAuthorizedDevRedis reports namespace create failure as mutated', () => {
  const harness = buildReconcileHarness({ namespaceCreateFails: true });
  const result = executeAuthorizedDevRedis({
    run: harness.run,
    renderDeps: { run: harness.run, chartRoot },
  });
  assert.equal(result.ok, false);
  assert.equal(result.mutated, true);
  assert.equal(result.refusals[0]?.id, 'ensure-namespace-failed');
});

test('executeAuthorizedDevRedis reports namespace create timeout as mutated', () => {
  const harness = buildReconcileHarness({ namespaceCreateTimedOut: true });
  const result = executeAuthorizedDevRedis({
    run: harness.run,
    renderDeps: { run: harness.run, chartRoot },
  });
  assert.equal(result.ok, false);
  assert.equal(result.mutated, true);
  assert.equal(result.refusals[0]?.id, 'ensure-namespace-failed');
});

test('executeAuthorizedDevRedis stops on child AlreadyExists without adopt', () => {
  const harness = buildReconcileHarness({ alreadyExistsChild: 'deployment' });
  const result = executeAuthorizedDevRedis({
    run: harness.run,
    renderDeps: { run: harness.run, chartRoot },
  });
  assert.equal(result.ok, false);
  assert.equal(result.mutated, true);
  assert.equal(result.refusals[0]?.id, 'child-already-exists');
});

test('executeAuthorizedDevRedis stops on failed CAS without further writes', () => {
  const harness = buildReconcileHarness({
    reuseNamespace: true,
    presentChildren: true,
    patchConflict: 'configMap',
  });
  const result = executeAuthorizedDevRedis({
    run: harness.run,
    renderDeps: { run: harness.run, chartRoot },
  });
  assert.equal(result.ok, false);
  assert.equal(result.mutated, true);
  assert.equal(result.refusals[0]?.id, 'patch-conflict');
  assert.equal(harness.patches.length, 1);
  assert.equal(
    harness.commands.some(
      ([cmd, args]) =>
        cmd === 'kubectl' && args.join(' ').includes(' patch deployment '),
    ),
    false,
  );
});

test('executeAuthorizedDevRedis refuses immutable existing ConfigMap before write', () => {
  const harness = buildReconcileHarness({
    reuseNamespace: true,
    presentChildren: true,
    immutableConfigMap: true,
  });
  const result = executeAuthorizedDevRedis({
    run: harness.run,
    renderDeps: { run: harness.run, chartRoot },
  });
  assert.equal(result.ok, false);
  assert.equal(result.mutated, false);
  assert.equal(result.refusals[0]?.id, 'configmap-immutable');
});

test('executeAuthorizedDevRedis refuses incompatible existing Deployment selector before write', () => {
  const harness = buildReconcileHarness({
    reuseNamespace: true,
    presentChildren: true,
  });
  if (harness.renderedByKind.Deployment.spec.selector) {
    harness.renderedByKind.Deployment.spec.selector.matchLabels.app = 'other';
  }
  const deployment = readyDeploymentObject(harness.configData);
  deployment.spec.selector = { matchLabels: { app: 'other' } };
  const run = (command, args, options) => {
    const joined = args.join(' ');
    if (
      command === 'kubectl' &&
      joined.includes('get deployment') &&
      joined.includes(' redis')
    ) {
      return { ok: true, stdout: JSON.stringify(deployment) };
    }
    return harness.run(command, args, options);
  };
  const result = executeAuthorizedDevRedis({
    run,
    renderDeps: { run: harness.run, chartRoot },
  });
  assert.equal(result.ok, false);
  assert.equal(result.mutated, false);
  assert.equal(result.refusals[0]?.id, 'incompatible-selector');
});

test('executeAuthorizedDevRedis refuses incompatible existing Service before write', () => {
  const harness = buildReconcileHarness({
    reuseNamespace: true,
    presentChildren: true,
    badServiceType: true,
  });
  const result = executeAuthorizedDevRedis({
    run: harness.run,
    renderDeps: { run: harness.run, chartRoot },
  });
  assert.equal(result.ok, false);
  assert.equal(result.mutated, false);
  assert.equal(result.refusals[0]?.id, 'incompatible-service');
});

test('executeAuthorizedDevRedis stops on namespace identity drift with partial receipt', () => {
  const harness = buildReconcileHarness({ namespaceUidDrift: true });
  const result = executeAuthorizedDevRedis({
    run: harness.run,
    renderDeps: { run: harness.run, chartRoot },
  });
  assert.equal(result.ok, false);
  assert.equal(result.mutated, true);
  assert.equal(result.refusals[0]?.id, 'namespace-identity-changed');
  assert.equal(
    result.actions.some((action) => action.op === 'ensure-namespace'),
    true,
  );
});

test('executeAuthorizedDevRedis refuses stale observations before write', () => {
  let readCount = 0;
  const base = buildReconcileHarness();
  const run = (command, args, options) => {
    const joined = args.join(' ');
    if (
      command === 'kubectl' &&
      joined.includes('get deployment') &&
      joined.includes(' redis')
    ) {
      readCount += 1;
      if (readCount > 1) {
        return {
          ok: true,
          stdout: JSON.stringify({
            metadata: {
              name: 'redis',
              namespace: DEV_REDIS_NAMESPACE,
              uid: 'changed-dep',
              resourceVersion: 'dep-rv-2',
              labels: { 'offscreen.dev/owner': DEV_CLUSTER_OWNER },
            },
            spec: { replicas: 1, selector: { matchLabels: { app: 'redis' } } },
          }),
        };
      }
    }
    return base.run(command, args, options);
  };
  const result = executeAuthorizedDevRedis({
    run,
    renderDeps: { run, chartRoot },
    observe: (deps) => observeRedis('dev', deps),
  });
  assert.equal(result.ok, false);
  assert.equal(result.mutated, false);
  assert.equal(result.refusals[0]?.id, 'stale-observation');
});

test('executeAuthorizedDevRedis reports rollout failure as mutated', () => {
  const harness = buildReconcileHarness({ rolloutFails: true });
  const result = executeAuthorizedDevRedis({
    run: harness.run,
    renderDeps: { run: harness.run, chartRoot },
  });
  assert.equal(result.ok, false);
  assert.equal(result.mutated, true);
  assert.equal(result.refusals[0]?.id, 'rollout-failed');
});

test('executeAuthorizedDevRedis fails readiness when deployment generation is stale', () => {
  const harness = buildReconcileHarness({ finalReadiness: 'stale' });
  const result = executeAuthorizedDevRedis({
    run: harness.run,
    renderDeps: { run: harness.run, chartRoot },
  });
  assert.equal(result.ok, false);
  assert.equal(result.mutated, true);
  assert.equal(result.refusals[0]?.id, 'readiness-failed');
});

test('executeAuthorizedDevRedis fails readiness when ConfigMap is missing', () => {
  const harness = buildReconcileHarness({ finalReadiness: 'missing-config' });
  const result = executeAuthorizedDevRedis({
    run: harness.run,
    renderDeps: { run: harness.run, chartRoot },
  });
  assert.equal(result.ok, false);
  assert.equal(result.mutated, true);
  assert.equal(result.refusals[0]?.id, 'readiness-failed');
});

test('validateRenderedRedisDocs accepts current dev manifest', () => {
  const docs = renderPlatformDocuments(
    { service: 'redis', profile: 'dev', section: 'all' },
    { run: helmRun, chartRoot },
  );
  const validation = validateRenderedRedisDocs(docs, 'dev');
  assert.equal(validation.ok, true);
});

test('manifestHasAuthMaterial detects auth-bearing manifests', () => {
  assert.equal(manifestHasAuthMaterial('requirepass secret'), true);
  assert.equal(manifestHasAuthMaterial('port 6379'), false);
});

test('observeDevRedis reads exact dev redis namespace', () => {
  const harness = buildReconcileHarness();
  const observations = observeDevRedis({ run: harness.run });
  assert.equal(observations.namespace.state, 'absent');
  assert.equal(observations.deployment.state, 'absent');
  assert.equal(observations.configMap.state, 'absent');
  assert.match(
    harness.commands.map(([cmd, args]) => args.join(' ')).join('\n'),
    new RegExp(`namespace ${DEV_REDIS_NAMESPACE}`),
  );
});

const devProfile = readPlatformProfile('dev');
const releaseProfile = readPlatformProfile('release');

function ownedDevObservations() {
  return {
    namespace: {
      state: 'present',
      classification: 'owned',
      object: {
        metadata: {
          name: DEV_REDIS_NAMESPACE,
          labels: { 'offscreen.dev/owner': DEV_CLUSTER_OWNER },
        },
      },
    },
    deployment: { state: 'absent' },
    service: { state: 'absent' },
    configMap: { state: 'absent' },
  };
}

function ownedReleaseObservations() {
  return {
    namespace: {
      state: 'present',
      classification: 'owned',
      object: {
        metadata: {
          name: 'lab-a',
          labels: { 'offscreen.rpg/lab': releaseProfile.ownerValue },
        },
      },
    },
    deployment: { state: 'absent' },
    service: { state: 'absent' },
    configMap: { state: 'absent' },
  };
}

test('plan allows create when dev namespace and children are absent', () => {
  const observations = {
    namespace: { state: 'absent' },
    deployment: { state: 'absent' },
    service: { state: 'absent' },
    configMap: { state: 'absent' },
  };
  const plan = planRedisInstall('dev', observations);
  assert.equal(plan.ok, true);
  assert.equal(plan.namespace, DEV_REDIS_NAMESPACE);
  assert.equal(plan.context, devProfile.contextName);
  assert.equal(
    plan.actions.some((action) => action.op === 'ensure-namespace'),
    true,
  );
});

test('plan allows create when release namespace and children are absent', () => {
  const observations = {
    namespace: { state: 'absent' },
    deployment: { state: 'absent' },
    service: { state: 'absent' },
    configMap: { state: 'absent' },
  };
  const plan = planRedisInstall('release', observations);
  assert.equal(plan.ok, true);
  assert.equal(plan.namespace, 'lab-a');
  assert.equal(plan.context, releaseProfile.contextName);
});

test('plan reuses owned dev namespace', () => {
  const plan = planDevRedisInstall(ownedDevObservations());
  assert.equal(plan.ok, true);
  assert.equal(
    plan.actions.some((action) => action.op === 'ensure-namespace'),
    true,
  );
});

test('plan reuses owned release namespace', () => {
  const plan = planRedisInstall('release', ownedReleaseObservations());
  assert.equal(plan.ok, true);
  assert.equal(plan.namespace, 'lab-a');
});

test('plan refuses foreign dev ConfigMap', () => {
  const observations = ownedDevObservations();
  observations.configMap = {
    state: 'present',
    classification: 'foreign',
    object: {
      metadata: {
        name: 'redis-config',
        namespace: DEV_REDIS_NAMESPACE,
        labels: { 'offscreen.dev/owner': 'foreign' },
      },
    },
  };
  const plan = planDevRedisInstall(observations);
  assert.equal(plan.ok, false);
  assert.equal(
    plan.refusals.some((item) => item.id === 'configMap-foreign'),
    true,
  );
});

test('plan refuses foreign release ConfigMap', () => {
  const observations = ownedReleaseObservations();
  observations.configMap = {
    state: 'present',
    classification: 'foreign',
    object: {
      metadata: {
        name: 'redis-config',
        namespace: 'lab-a',
        labels: { 'offscreen.rpg/lab': 'other-lab' },
      },
    },
  };
  const plan = planRedisInstall('release', observations);
  assert.equal(plan.ok, false);
  assert.equal(
    plan.refusals.some((item) => item.id === 'configMap-foreign'),
    true,
  );
});

test('plan refuses unreadable dev ConfigMap', () => {
  const observations = ownedDevObservations();
  observations.configMap = {
    state: 'unreadable',
    reason: 'malformed json',
  };
  const plan = planDevRedisInstall(observations);
  assert.equal(plan.ok, false);
  assert.equal(
    plan.refusals.some((item) => item.id === 'configMap-unreadable'),
    true,
  );
});

test('plan refuses missing owner label on dev namespace', () => {
  const observations = {
    namespace: {
      state: 'present',
      classification: 'foreign',
      object: {
        metadata: {
          name: DEV_REDIS_NAMESPACE,
          labels: {},
        },
      },
    },
    deployment: { state: 'absent' },
    service: { state: 'absent' },
    configMap: { state: 'absent' },
  };
  const plan = planDevRedisInstall(observations);
  assert.equal(plan.ok, false);
  assert.equal(
    plan.refusals.some((item) => item.id === 'namespace-foreign'),
    true,
  );
});

test('plan refuses inconsistent observation when namespace absent but child present', () => {
  const observations = {
    namespace: { state: 'absent' },
    deployment: {
      state: 'present',
      classification: 'owned',
      object: {
        metadata: {
          name: 'redis',
          namespace: DEV_REDIS_NAMESPACE,
          labels: { 'offscreen.dev/owner': DEV_CLUSTER_OWNER },
        },
      },
    },
    service: { state: 'absent' },
    configMap: { state: 'absent' },
  };
  const plan = planDevRedisInstall(observations);
  assert.equal(plan.ok, false);
  assert.equal(
    plan.refusals.some((item) => item.id === 'inconsistent-observation'),
    true,
  );
});

test('observeRedis classifies malformed dev reads as unreadable', () => {
  const run = (command, args) => {
    const joined = args.join(' ');
    if (
      command === 'kubectl' &&
      joined.includes('get configmap') &&
      joined.includes('redis-config')
    ) {
      return { ok: true, stdout: 'not-json' };
    }
    if (
      command === 'kubectl' &&
      joined.includes(`namespace ${DEV_REDIS_NAMESPACE}`)
    ) {
      return { ok: true, stdout: '' };
    }
    if (command === 'kubectl' && joined.includes('get deployment')) {
      return { ok: true, stdout: '' };
    }
    if (command === 'kubectl' && joined.includes('get service')) {
      return { ok: true, stdout: '' };
    }
    return { ok: false, stderr: 'unhandled' };
  };
  const observations = observeRedis('dev', { run });
  assert.equal(observations.configMap.state, 'unreadable');
  assert.equal(observations.configMap.reason, 'malformed json');
});

test('observeRedis reads release identities in lab-a', () => {
  const commands = [];
  const run = (command, args) => {
    commands.push(args.join(' '));
    return { ok: true, stdout: '' };
  };
  const observations = observeRedis('release', { run });
  assert.equal(observations.namespace.state, 'absent');
  assert.match(commands.join('\n'), /namespace lab-a/);
  assert.match(commands.join('\n'), /-n lab-a/);
  assert.match(commands.join('\n'), /get configmap.*redis-config/);
});
