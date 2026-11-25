import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { chmodSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { RELEASE_API_PORT } from '../../../clusters/kind/manager/config.mjs';
import { RELEASE_BASELINE_NAMESPACE } from '../../common/commands.mjs';
import { readPlatformProfile } from '../../common/profile.mjs';
import { runPlatformCommand } from '../../common/commands.mjs';
import { renderPlatformDocuments } from '../../common/render.mjs';
import {
  executeAuthorizedReleaseRedis,
  RELEASE_REDIS_CONTEXT,
  RELEASE_REDIS_NAMESPACE,
} from '../release-install.mjs';
import { observeRedis } from '../observations.mjs';
import { manifestHasAuthMaterial } from '../reconcile.mjs';

const redisDir = dirname(dirname(fileURLToPath(import.meta.url)));
const chartRoot = join(redisDir, 'chart');
const installPath = join(redisDir, 'install.sh');
const releaseProfile = readPlatformProfile('release');
const RELEASE_OWNER = releaseProfile.ownerValue;
const RELEASE_OWNER_LABEL = `${releaseProfile.ownerLabel}/lab`;

function releaseKubectlConfigJson() {
  return JSON.stringify({
    clusters: [
      {
        name: 'kind-offscreen-release',
        cluster: { server: `https://127.0.0.1:${RELEASE_API_PORT}` },
      },
    ],
    contexts: [
      {
        name: RELEASE_REDIS_CONTEXT,
        context: { cluster: 'kind-offscreen-release' },
      },
    ],
    'current-context': RELEASE_REDIS_CONTEXT,
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
      namespace: RELEASE_REDIS_NAMESPACE,
      uid: 'dep-uid',
      resourceVersion: 'dep-rv-1',
      generation: 1,
      labels: { app: 'redis', [RELEASE_OWNER_LABEL]: RELEASE_OWNER },
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
      namespace: RELEASE_REDIS_NAMESPACE,
      uid: 'svc-uid',
      resourceVersion: 'svc-rv-1',
      labels: { app: 'redis', [RELEASE_OWNER_LABEL]: RELEASE_OWNER },
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
      namespace: RELEASE_REDIS_NAMESPACE,
      uid: 'cm-uid',
      resourceVersion: 'cm-rv-1',
      labels: { app: 'redis', [RELEASE_OWNER_LABEL]: RELEASE_OWNER },
    },
    data,
  };
}

/**
 * @param {{
 *   reuseNamespace?: boolean,
 *   presentChildren?: boolean,
 *   immutableConfigMap?: boolean,
 *   badServiceType?: boolean,
 *   patchConflict?: 'configMap' | 'deployment',
 *   rolloutFails?: boolean,
 *   finalReadiness?: 'ready' | 'stale' | 'missing-config' | 'bad-service',
 * }} [options]
 */
function buildReleaseReconcileHarness(options = {}) {
  /** @type {Array<[string, string[]]>} */
  const commands = [];
  let uidCounter = 0;
  const nextUid = () => `uid-${++uidCounter}`;
  const nextRv = () => `rv-${uidCounter}`;

  const renderedDocs = renderPlatformDocuments(
    { service: 'redis', profile: 'release', section: 'all' },
    { run: helmRun, chartRoot },
  );
  const renderedByKind = Object.fromEntries(
    renderedDocs.map((doc) => [doc.kind, doc]),
  );
  const configData = renderedByKind.ConfigMap.data;

  /** @type {{ uid: string, owner: string, rv: string } | null} */
  let namespace =
    options.reuseNamespace === true
      ? { uid: 'ns-owned', owner: RELEASE_OWNER, rv: 'ns-rv-1' }
      : null;
  const childrenPresent = options.presentChildren === true;
  /** @type {object | null} */
  let configMap = childrenPresent ? readyConfigMapObject(configData) : null;
  /** @type {object | null} */
  let deployment = childrenPresent ? readyDeploymentObject(configData) : null;
  /** @type {object | null} */
  let service = childrenPresent ? readyServiceObject() : null;
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
        name: RELEASE_REDIS_NAMESPACE,
        uid: namespace.uid,
        resourceVersion: namespace.rv,
        labels: { [RELEASE_OWNER_LABEL]: namespace.owner },
      },
    };
  }

  function baselineNamespaceObject() {
    return {
      metadata: {
        name: RELEASE_BASELINE_NAMESPACE,
        uid: 'release-baseline-uid',
        labels: { [RELEASE_OWNER_LABEL]: RELEASE_OWNER },
      },
    };
  }

  function run(command, args, runOptions = {}) {
    if (command === 'kind' && args[0] === 'get' && args[1] === 'clusters') {
      return { ok: true, stdout: 'offscreen-release\n' };
    }
    if (command === 'kubectl' && args.join(' ').includes('config view')) {
      return { ok: true, stdout: releaseKubectlConfigJson() };
    }
    const joined = args.join(' ');
    if (
      command === 'kubectl' &&
      joined.includes(`get namespace ${RELEASE_BASELINE_NAMESPACE}`)
    ) {
      return { ok: true, stdout: JSON.stringify(baselineNamespaceObject()) };
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
      namespace = {
        uid: nextUid(),
        owner: RELEASE_OWNER,
        rv: nextRv(),
      };
      return {
        ok: true,
        stdout: JSON.stringify({
          metadata: {
            name: RELEASE_REDIS_NAMESPACE,
            uid: namespace.uid,
            resourceVersion: namespace.rv,
            labels: { [RELEASE_OWNER_LABEL]: namespace.owner },
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

  function isRedisNamespaceGet(args) {
    const getIndex = args.indexOf('get');
    return (
      getIndex >= 0 &&
      args[getIndex + 1] === 'namespace' &&
      args[getIndex + 2] === RELEASE_REDIS_NAMESPACE
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

  return { commands, run: wrappedRun, renderedByKind, configData };
}

/** @param {{ includeForeignContexts?: boolean }} [options] */
function stubShellBinDir(options = {}) {
  const binDir = mkdtempSync(join(tmpdir(), 'redis-release-install-'));
  const writeStub = (name, body) => {
    const path = join(binDir, name);
    writeFileSync(path, body, 'utf8');
    chmodSync(path, 0o755);
    return path;
  };

  writeStub(
    'kind',
    `#!/usr/bin/env bash
set -euo pipefail
if [[ "\${1:-}" == "get" && "\${2:-}" == "clusters" ]]; then
  echo offscreen-release
  exit 0
fi
echo "unexpected kind: $*" >&2
exit 2
`,
  );

  writeStub(
    'docker',
    `#!/usr/bin/env bash
set -euo pipefail
if [[ "\${1:-}" == "ps" ]]; then
  echo "offscreen-release-control-plane 127.0.0.1:6443->6443/tcp"
  exit 0
fi
echo "unexpected docker: $*" >&2
exit 2
`,
  );

  const foreignContextBlock = options.includeForeignContexts
    ? `echo kind-foreign
echo kind-offscreen-release`
    : `echo kind-offscreen-release`;

  const mutateLog = join(binDir, 'mutate-log');
  writeFileSync(mutateLog, '', 'utf8');

  const readyDeployment = JSON.stringify(
    readyDeploymentObject({ 'redis.conf': 'port 6379\n' }),
  );
  const readyService = JSON.stringify(readyServiceObject());
  const readyConfigMap = JSON.stringify(
    readyConfigMapObject({ 'redis.conf': 'port 6379\n' }),
  );
  const labNamespaceOwned = JSON.stringify({
    metadata: {
      name: RELEASE_REDIS_NAMESPACE,
      uid: 'ns-created-uid',
      resourceVersion: 'ns-rv-1',
      labels: { [RELEASE_OWNER_LABEL]: RELEASE_OWNER },
    },
  });

  writeStub(
    'kubectl',
    `#!/usr/bin/env bash
set -euo pipefail
joined="$*"
state_file="${mutateLog}"
mutate_count() {
  if [[ ! -f "$state_file" ]]; then echo 0; return; fi
  wc -l <"$state_file" | tr -d ' '
}
namespace_ready() { [[ "$(mutate_count)" -ge 1 ]]; }
install_ready() { [[ "$(mutate_count)" -ge 4 ]]; }
if [[ "\${1:-}" == "config" && "\${2:-}" == "get-contexts" ]]; then
  ${foreignContextBlock}
  exit 0
fi
if [[ "$joined" == *"config view --minify -o json"* ]]; then
  cat <<'JSON'
${releaseKubectlConfigJson()}
JSON
  exit 0
fi
if [[ "$joined" == *"get namespace ${RELEASE_BASELINE_NAMESPACE}"* ]]; then
  cat <<'JSON'
{"metadata":{"name":"${RELEASE_BASELINE_NAMESPACE}","uid":"release-baseline-uid","labels":{"${RELEASE_OWNER_LABEL}":"${RELEASE_OWNER}"}}}
JSON
  exit 0
fi
if [[ "$joined" == *"get namespace ${RELEASE_REDIS_NAMESPACE}"* ]]; then
  if namespace_ready; then
    echo '${labNamespaceOwned}'
    exit 0
  fi
  exit 0
fi
if [[ "$joined" == *"get configmap"*"redis-config"* ]]; then
  if install_ready; then
    echo '${readyConfigMap}'
    exit 0
  fi
  exit 0
fi
if [[ "$joined" == *"get deployment"*" redis"* ]]; then
  if install_ready; then
    echo '${readyDeployment}'
    exit 0
  fi
  exit 0
fi
if [[ "$joined" == *"get service"*" redis"* ]]; then
  if install_ready; then
    echo '${readyService}'
    exit 0
  fi
  exit 0
fi
if [[ "$joined" == *" create "* ]]; then
  echo mutate >> "${mutateLog}"
  if [[ "$joined" == *"create -f - -o json"* ]]; then
    cat <<'JSON'
{"metadata":{"name":"${RELEASE_REDIS_NAMESPACE}","uid":"ns-created-uid","resourceVersion":"ns-rv-1","labels":{"${RELEASE_OWNER_LABEL}":"${RELEASE_OWNER}"}}}
JSON
    exit 0
  fi
  exit 0
fi
if [[ "$joined" == *" patch "* ]]; then
  echo mutate >> "${mutateLog}"
  exit 0
fi
if [[ "$joined" == *"rollout status deployment/redis"* ]]; then exit 0; fi
if [[ "$joined" == *"get svc -A"* ]]; then exit 0; fi
echo "unexpected kubectl: $*" >&2
exit 2
`,
  );

  return { binDir, mutateLog };
}

test('install.sh delegates to release-install without ensure-lab-namespace', () => {
  const text = readFileSync(installPath, 'utf8');
  assert.doesNotMatch(text, /ensure-lab-namespace/);
  assert.match(text, /release-install\.mjs/);
  const firstLoopback = text.indexOf('assert_loopback_only');
  const nodeIndex = text.indexOf('release-install.mjs');
  const secondLoopback = text.indexOf(
    'assert_loopback_only',
    firstLoopback + 1,
  );
  assert.ok(firstLoopback > 0 && firstLoopback < nodeIndex);
  assert.ok(secondLoopback > nodeIndex);
});

test('install.sh rejects arguments', () => {
  const result = spawnSync('bash', [installPath, 'extra'], {
    encoding: 'utf8',
  });
  assert.equal(result.status, 2);
});

test('install.sh stub run completes without kubectl apply', () => {
  const { binDir, mutateLog } = stubShellBinDir();
  const result = spawnSync('bash', [installPath], {
    encoding: 'utf8',
    env: { ...process.env, PATH: `${binDir}:${process.env.PATH ?? ''}` },
  });
  assert.equal(result.status, 0, result.stderr);
  const mutated = readFileSync(mutateLog, 'utf8');
  assert.doesNotMatch(mutated, / apply /);
  assert.match(result.stdout, /Redis install is ready/);
});

test('executeAuthorizedReleaseRedis creates release redis with loopback context only', () => {
  const harness = buildReleaseReconcileHarness();
  const result = executeAuthorizedReleaseRedis({
    run: harness.run,
    renderDeps: { run: harness.run, chartRoot },
  });
  assert.equal(result.ok, true);
  assert.equal(result.mutated, true);
  const joined = harness.commands
    .map(([cmd, args]) => `${cmd} ${args.join(' ')}`)
    .join('\n');
  assert.match(joined, /--context kind-offscreen-release/);
  assert.doesNotMatch(joined, /kind-offscreen-dev/);
  assert.match(joined, /release\.yaml/);
  assert.match(joined, /lab-a/);
  assert.match(
    releaseKubectlConfigJson(),
    new RegExp(`127\\.0\\.0\\.1:${RELEASE_API_PORT}`),
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
        cmd === 'kubectl' &&
        args.join(' ').includes(`namespace ${RELEASE_BASELINE_NAMESPACE}`),
    ).length,
    1,
  );
  assert.equal(
    harness.commands.filter(
      ([, args]) =>
        args.includes('create') && args.includes('-f') && !args.includes('-o'),
    ).length,
    3,
  );
  for (const doc of Object.values(harness.renderedByKind)) {
    assert.equal(doc.metadata?.labels?.[RELEASE_OWNER_LABEL], RELEASE_OWNER);
  }
});

test('executeAuthorizedReleaseRedis refuses foreign release namespace before writes', () => {
  const harness = buildReleaseReconcileHarness();
  const foreignObserve = () => ({
    namespace: {
      state: 'present',
      classification: 'foreign',
      object: {
        metadata: {
          name: RELEASE_REDIS_NAMESPACE,
          labels: { [RELEASE_OWNER_LABEL]: 'foreign' },
        },
      },
    },
    deployment: { state: 'absent' },
    service: { state: 'absent' },
    configMap: { state: 'absent' },
  });
  const result = executeAuthorizedReleaseRedis({
    run: harness.run,
    renderDeps: { run: harness.run, chartRoot },
    observe: foreignObserve,
  });
  assert.equal(result.ok, false);
  assert.equal(result.mutated, false);
  assert.equal(result.refusals[0]?.id, 'namespace-foreign');
  assert.equal(
    harness.commands.some(
      ([cmd, args]) => cmd === 'kubectl' && args.join(' ').includes(' create '),
    ),
    false,
  );
});

test('executeAuthorizedReleaseRedis refuses unreadable release ConfigMap', () => {
  const harness = buildReleaseReconcileHarness();
  const observe = () => ({
    namespace: { state: 'absent' },
    deployment: { state: 'absent' },
    service: { state: 'absent' },
    configMap: { state: 'unreadable', reason: 'malformed json' },
  });
  const result = executeAuthorizedReleaseRedis({
    run: harness.run,
    renderDeps: { run: harness.run, chartRoot },
    observe,
  });
  assert.equal(result.ok, false);
  assert.equal(result.refusals[0]?.id, 'configMap-unreadable');
  assert.equal(result.mutated, false);
});

test('executeAuthorizedReleaseRedis performs zero writes when render is refused for auth material', () => {
  const harness = buildReleaseReconcileHarness();
  const authManifest = `${JSON.stringify({
    kind: 'ConfigMap',
    metadata: {
      name: 'redis-config',
      namespace: RELEASE_REDIS_NAMESPACE,
      labels: { [RELEASE_OWNER_LABEL]: RELEASE_OWNER },
    },
    data: { 'redis.conf': 'requirepass blocked\n' },
  })}\n${JSON.stringify({
    kind: 'Deployment',
    metadata: {
      name: 'redis',
      namespace: RELEASE_REDIS_NAMESPACE,
      labels: { [RELEASE_OWNER_LABEL]: RELEASE_OWNER },
    },
    spec: { replicas: 1, selector: { matchLabels: { app: 'redis' } } },
  })}\n${JSON.stringify({
    kind: 'Service',
    metadata: {
      name: 'redis',
      namespace: RELEASE_REDIS_NAMESPACE,
      labels: { [RELEASE_OWNER_LABEL]: RELEASE_OWNER },
    },
    spec: {
      type: 'ClusterIP',
      selector: { app: 'redis' },
      ports: [
        { name: 'redis', port: 6379, protocol: 'TCP', targetPort: 'redis' },
      ],
    },
  })}\n`;
  assert.equal(manifestHasAuthMaterial(authManifest), true);
  const result = executeAuthorizedReleaseRedis({
    run: harness.run,
    renderDeps: {
      run: (command, args, opts) => {
        if (command === 'helm' && args[0] === 'template') {
          return { ok: true, stdout: authManifest };
        }
        return harness.run(command, args, opts);
      },
      chartRoot,
    },
  });
  assert.equal(result.ok, false);
  assert.equal(result.refusals[0]?.id, 'auth-material');
  assert.equal(result.mutated, false);
  assert.equal(
    harness.commands.some(
      ([cmd, args]) => cmd === 'kubectl' && args.includes('create'),
    ),
    false,
  );
});

test('executeAuthorizedReleaseRedis treats post-check readiness failure as install failure', () => {
  const harness = buildReleaseReconcileHarness({ finalReadiness: 'stale' });
  const result = executeAuthorizedReleaseRedis({
    run: harness.run,
    renderDeps: { run: harness.run, chartRoot },
  });
  assert.equal(result.ok, false);
  assert.equal(result.refusals[0]?.id, 'readiness-failed');
  assert.equal(result.mutated, true);
  assert.match(result.refusals[0]?.detail ?? '', /not ready/);
});

test('observeRedis for release uses lab-a and release owner labels', () => {
  const harness = buildReleaseReconcileHarness();
  const observations = observeRedis('release', { run: harness.run });
  assert.equal(observations.namespace.state, 'absent');
  assert.match(
    harness.commands.map(([, args]) => args.join(' ')).join('\n'),
    /namespace lab-a/,
  );
});

test('executeAuthorizedReleaseRedis refuses wrong kubectl context before foreign context use', () => {
  const commands = [];
  const run = (command, args) => {
    commands.push([command, args]);
    if (command === 'kind' && args[0] === 'get') {
      return { ok: true, stdout: 'offscreen-release\n' };
    }
    if (command === 'kubectl' && args.join(' ').includes('config view')) {
      return {
        ok: true,
        stdout: JSON.stringify({
          clusters: [
            {
              name: 'kind-other-cluster',
              cluster: { server: `https://127.0.0.1:${RELEASE_API_PORT}` },
            },
          ],
          contexts: [
            {
              name: 'kind-other-cluster',
              context: { cluster: 'kind-other-cluster' },
            },
          ],
          'current-context': 'kind-other-cluster',
        }),
      };
    }
    return { ok: true, stdout: '', stderr: '' };
  };
  assert.throws(
    () => executeAuthorizedReleaseRedis({ run }),
    /selected context cluster mismatch/,
  );
  assert.equal(
    commands.some(
      ([cmd, args]) =>
        cmd === 'kubectl' && args.includes('offscreen-release-system'),
    ),
    false,
  );
});
