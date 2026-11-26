import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { parse, parseAllDocuments, stringify } from 'yaml';
import { execPath } from 'node:process';
import { URL } from 'node:url';
import test from 'node:test';
import { runPlatformCommand } from '../platform/common/commands.mjs';
import { renderRedisChart } from '../platform/redis/config.mjs';
import { redisTargetFromProfile } from '../platform/redis/inventory.mjs';
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
import {
  GATEWAY_CLASS_NAME,
  GATEWAY_NAME,
  CONTROLLER_NAME,
  IMAGE_DIGEST,
  HELM_NAMESPACE,
  LAB_EDGE_NAMESPACE,
} from '../platform/gateway/install.mjs';

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
    contexts: [
      {
        name: contextName,
        context: { cluster: clusterName, user: contextName },
      },
    ],
    users: [{ name: contextName, user: {} }],
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

const RELEASE_LAB_OWNER = 'disposable';

/**
 * @param {'dev' | 'release'} profileId
 */
function redisNamespaceName(profileId) {
  return profileId === 'dev' ? 'offscreen-dev-redis' : 'lab-a';
}

/**
 * @param {'dev' | 'release'} profileId
 * @param {boolean} owned
 */
function redisNamespaceObject(profileId, owned = true) {
  const ownerKey =
    profileId === 'dev' ? 'offscreen.dev/owner' : 'offscreen.rpg/lab';
  const owner = profileId === 'dev' ? DEV_CLUSTER_OWNER : RELEASE_LAB_OWNER;
  return {
    apiVersion: 'v1',
    kind: 'Namespace',
    metadata: {
      name: redisNamespaceName(profileId),
      uid: `${profileId}-redis-ns`,
      labels: owned ? { [ownerKey]: owner } : { [ownerKey]: 'foreign-owner' },
    },
  };
}

/**
 * @param {'dev' | 'release'} profileId
 * @param {{ staleGeneration?: boolean, foreign?: boolean }} [options]
 */
function redisDeploymentObject(profileId, options = {}) {
  const ownerKey =
    profileId === 'dev' ? 'offscreen.dev/owner' : 'offscreen.rpg/lab';
  const owner = options.foreign
    ? 'foreign-owner'
    : profileId === 'dev'
      ? DEV_CLUSTER_OWNER
      : RELEASE_LAB_OWNER;
  const namespace = redisNamespaceName(profileId);
  return {
    apiVersion: 'apps/v1',
    kind: 'Deployment',
    metadata: {
      name: 'redis',
      namespace,
      uid: 'redis-dep-uid',
      resourceVersion: 'redis-dep-rv',
      generation: options.staleGeneration ? 2 : 1,
      labels: { app: 'redis', [ownerKey]: owner },
    },
    spec: { replicas: 1, selector: { matchLabels: { app: 'redis' } } },
    status: {
      observedGeneration: options.staleGeneration ? 1 : 1,
      updatedReplicas: options.staleGeneration ? 0 : 1,
      readyReplicas: options.staleGeneration ? 0 : 1,
      availableReplicas: options.staleGeneration ? 0 : 1,
      replicas: 1,
    },
  };
}

/**
 * @param {'dev' | 'release'} profileId
 */
function redisServiceObject(profileId) {
  const ownerKey =
    profileId === 'dev' ? 'offscreen.dev/owner' : 'offscreen.rpg/lab';
  const owner = profileId === 'dev' ? DEV_CLUSTER_OWNER : RELEASE_LAB_OWNER;
  const namespace = redisNamespaceName(profileId);
  return {
    apiVersion: 'v1',
    kind: 'Service',
    metadata: {
      name: 'redis',
      namespace,
      uid: 'redis-svc-uid',
      resourceVersion: 'redis-svc-rv',
      labels: { app: 'redis', [ownerKey]: owner },
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

/**
 * @param {'dev' | 'release'} profileId
 * @param {{ missingData?: boolean }} [options]
 */
function redisConfigMapObject(profileId, options = {}) {
  const ownerKey =
    profileId === 'dev' ? 'offscreen.dev/owner' : 'offscreen.rpg/lab';
  const owner = profileId === 'dev' ? DEV_CLUSTER_OWNER : RELEASE_LAB_OWNER;
  const namespace = redisNamespaceName(profileId);
  return {
    apiVersion: 'v1',
    kind: 'ConfigMap',
    metadata: {
      name: 'redis-config',
      namespace,
      uid: 'redis-cm-uid',
      resourceVersion: 'redis-cm-rv',
      labels: { app: 'redis', [ownerKey]: owner },
    },
    data: options.missingData ? {} : { 'redis.conf': 'maxmemory 64mb\n' },
  };
}

/**
 * @param {'dev' | 'release'} profileId
 * @param {{
 *   namespace?: object | null | 'unreadable',
 *   deployment?: object | null | 'unreadable',
 *   service?: object | null | 'unreadable',
 *   configMap?: object | null | 'unreadable',
 * }} fixtures
 */
function buildRedisObserveRun(profileId, fixtures) {
  const warm = profileId === 'dev' ? devWarmRun(true) : releaseWarmRun(true);
  const redisNs = redisNamespaceName(profileId);

  /**
   * @param {unknown} fixture
   */
  function fixtureResponse(fixture) {
    if (fixture === 'unreadable') {
      return { ok: false, stdout: '', stderr: 'observation failed' };
    }
    if (fixture == null) {
      return { ok: true, stdout: '' };
    }
    return { ok: true, stdout: JSON.stringify(fixture) };
  }

  const target = redisTargetFromProfile(profileId);
  const legacyInventory =
    fixtures.deployment != null &&
    fixtures.deployment?.spec?.selector?.matchLabels?.app === 'redis';

  return (command, args) => {
    if (command === 'helm') {
      const verb = args[0];
      if (verb === 'version' && args[1] === '--short') {
        return cmdOk('v3.22.1\n');
      }
      if (verb === 'list') {
        return cmdOk('[]');
      }
    }
    if (command === 'kubectl' && legacyInventory) {
      const getIdx = args.indexOf('get');
      if (
        getIdx >= 0 &&
        args[getIdx + 1] === 'namespace' &&
        args.includes('name')
      ) {
        return cmdOk(`namespace/${redisNs}\n`);
      }
      if (args.includes('jsonpath={.spec.selector.matchLabels}')) {
        return cmdOk(JSON.stringify({ app: 'redis' }));
      }
      if (args.includes('jsonpath={.spec.selector}')) {
        return cmdOk(JSON.stringify({ app: 'redis' }));
      }
      if (args.includes('jsonpath={.metadata.labels}')) {
        const labels = { app: 'redis', [target.ownerKey]: target.ownerValue };
        return cmdOk(JSON.stringify(labels));
      }
      const resource = getIdx >= 0 ? args[getIdx + 1] : '';
      const next = getIdx >= 0 ? args[getIdx + 2] : '';
      if (resource === 'endpointslices.discovery.k8s.io') {
        return cmdOk(
          JSON.stringify({ apiVersion: 'v1', kind: 'List', items: [] }),
        );
      }
      if (
        (resource === 'secret' || resource === 'configmap') &&
        next === '-o' &&
        args[getIdx + 3] === 'name'
      ) {
        return cmdOk('');
      }
      const out = args[args.indexOf('-o') + 1];
      if (out === 'name') {
        const present =
          (resource === 'deployment' && fixtures.deployment != null) ||
          (resource === 'service' && fixtures.service != null) ||
          (resource === 'configmap' && fixtures.configMap != null);
        const name = args[getIdx + 2];
        return present ? cmdOk(`${resource}/${name}\n`) : cmdOk('');
      }
    }
    if (command === 'kubectl') {
      const joined = args.join(' ');
      if (joined.includes(`namespace ${redisNs}`)) {
        return fixtureResponse(
          fixtures.namespace === undefined
            ? redisNamespaceObject(profileId)
            : fixtures.namespace,
        );
      }
      if (joined.includes('deployment') && joined.includes('redis')) {
        return fixtureResponse(fixtures.deployment);
      }
      if (joined.includes('service') && joined.includes('redis')) {
        return fixtureResponse(fixtures.service);
      }
      if (joined.includes('configmap') && joined.includes('redis-config')) {
        return fixtureResponse(fixtures.configMap);
      }
    }
    return warm(command, args);
  };
}

const NATIVE_REDIS_RUN_ID = 'a'.repeat(40);
const NATIVE_EXPECTED_IMAGE =
  'docker.io/library/redis@sha256:987c376c727652f99625c7d205a1cba3cb2c53b92b0b62aade2bd48ee1593232';
const helmProbe = spawnSync('helm', ['version', '--short'], {
  encoding: 'utf8',
});
const helmPinned =
  !helmProbe.error && (helmProbe.stdout ?? '').trim().startsWith('v3.22.1');

/**
 * @param {string} manifest
 */
function normalizeRedisServiceManifest(manifest) {
  const docs = parseAllDocuments(manifest).map((doc) => doc.toJSON());
  for (const doc of docs) {
    if (doc?.kind === 'Service' && Array.isArray(doc.spec?.ports)) {
      doc.spec.ports = doc.spec.ports.map((port) => ({
        protocol: 'TCP',
        ...port,
      }));
    }
  }
  return docs.map((doc) => stringify(doc)).join('---\n');
}

/** @type {Map<'dev' | 'release', { manifest: string, values: Record<string, unknown> }>} */
const nativeInstalledByProfile = new Map();
if (helmPinned) {
  for (const profileId of /** @type {const} */ (['dev', 'release'])) {
    let manifest = '';
    const recordingRun = (command, args, options) => {
      const result = runPlatformCommand(command, args, options);
      if (command === 'helm' && args[0] === 'template') {
        manifest = result.stdout;
      }
      return result;
    };
    const rendered = renderRedisChart(profileId, { run: recordingRun });
    nativeInstalledByProfile.set(profileId, {
      manifest: normalizeRedisServiceManifest(manifest),
      values: rendered.values,
    });
  }
}

/**
 * @param {string} stdout
 * @param {string} [stderr]
 */
function cmdOk(stdout = '', stderr = '') {
  return {
    ok: true,
    status: 0,
    stdout,
    stderr,
    timedOut: false,
    missing: false,
  };
}

/**
 * @param {number} status
 * @param {string} [stderr]
 */
function cmdFail(status = 1, stderr = 'failed') {
  return {
    ok: false,
    status,
    stdout: '',
    stderr,
    timedOut: false,
    missing: false,
  };
}

function nativeInfoBody() {
  return `# Server\r\nredis_version:8.2.1\r\nrun_id:${NATIVE_REDIS_RUN_ID}\r\n`;
}

function nativeConfigBody(key, value) {
  return `${key}\n${value}\n`;
}

/**
 * @param {ReturnType<typeof redisTargetFromProfile>} target
 * @param {{ manifest: string }} installed
 */
function nativeLiveBundle(target, installed) {
  const docs = parseAllDocuments(installed.manifest).map((doc) => doc.toJSON());
  const manifestDeployment = docs.find((doc) => doc?.kind === 'Deployment');
  const manifestService = docs.find((doc) => doc?.kind === 'Service');
  const manifestConfigMap = docs.find((doc) => doc?.kind === 'ConfigMap');
  assert.ok(manifestDeployment);
  assert.ok(manifestService);
  assert.ok(manifestConfigMap);
  const podUid = 'pod-uid-1';
  const pod = {
    metadata: {
      name: 'redis-pod-1',
      namespace: target.namespace,
      uid: podUid,
      resourceVersion: 'pod-rv-1',
    },
    status: {
      podIP: '10.0.0.7',
      conditions: [{ type: 'Ready', status: 'True' }],
      containerStatuses: [
        {
          name: 'redis',
          containerID: 'docker://cid-1',
          imageID: NATIVE_EXPECTED_IMAGE,
          restartCount: 0,
          ready: true,
          state: { running: { startedAt: '2026-11-26T10:00:00Z' } },
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
          namespace: target.namespace,
          name: 'redis-pod-1',
          uid: podUid,
        },
        nodeName: 'worker',
      },
    ],
  };
  const deployment = {
    ...manifestDeployment,
    metadata: {
      ...manifestDeployment.metadata,
      namespace: target.namespace,
      uid: 'dep-uid-1',
      resourceVersion: 'dep-rv-1',
      generation: 1,
    },
    status: {
      observedGeneration: 1,
      updatedReplicas: 1,
      readyReplicas: 1,
      availableReplicas: 1,
      replicas: 1,
    },
  };
  return {
    namespace: {
      apiVersion: 'v1',
      kind: 'Namespace',
      metadata: {
        name: target.namespace,
        uid: 'ns-uid-1',
        resourceVersion: 'ns-rv-1',
      },
    },
    configMap: {
      ...manifestConfigMap,
      metadata: {
        ...manifestConfigMap.metadata,
        namespace: target.namespace,
        uid: 'cm-uid-1',
        resourceVersion: 'cm-rv-1',
      },
    },
    deployment,
    service: {
      ...manifestService,
      metadata: {
        ...manifestService.metadata,
        namespace: target.namespace,
        uid: serviceUid,
        resourceVersion: 'svc-rv-1',
      },
      spec: manifestService.spec,
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
    endpointSlices: [endpointSlice],
  };
}

/**
 * @param {'dev' | 'release'} profileId
 * @param {'ready' | 'absent' | 'legacy' | 'partial' | 'drift' | 'unreadable'} scenario
 * @param {{ manifest: string, values: Record<string, unknown> }} [installed]
 */
function createNativeRedisStatusRun(profileId, scenario, installed) {
  const target = redisTargetFromProfile(profileId);
  const warm = profileId === 'dev' ? devWarmRun(true) : releaseWarmRun(true);
  const bundle =
    scenario === 'ready' && installed
      ? nativeLiveBundle(target, installed)
      : null;
  let probeIndex = 0;
  /** @type {Array<[string, string[]]>} */
  const commands = [];

  const deploymentLabels = {
    [target.ownerKey]: target.ownerValue,
    'app.kubernetes.io/name': 'redis',
    'app.kubernetes.io/instance': 'redis',
  };
  const deploymentSelectors =
    scenario === 'legacy'
      ? { app: 'redis' }
      : {
          'app.kubernetes.io/name': 'redis',
          'app.kubernetes.io/instance': 'redis',
        };
  const serviceSelectors = { ...deploymentSelectors };

  const helmListRow = {
    name: 'redis',
    namespace: target.namespace,
    revision: '1',
    status: 'deployed',
    chart: 'offscreen-redis-specimen-0.1.0',
  };

  const flags = {
    namespacePresent: scenario !== 'absent',
    secrets:
      scenario === 'legacy' || scenario === 'absent'
        ? []
        : ['sh.helm.release.v1.redis.v1'],
    deployment:
      scenario === 'legacy' ||
      scenario === 'partial' ||
      scenario === 'ready' ||
      scenario === 'drift',
    service:
      scenario === 'partial' || scenario === 'ready' || scenario === 'drift',
    configMap: scenario === 'ready' || scenario === 'drift',
    endpointsPresent: scenario === 'ready' || scenario === 'drift',
    helmList:
      scenario === 'partial' || scenario === 'ready' || scenario === 'drift'
        ? [helmListRow]
        : [],
    listFail: scenario === 'unreadable',
    listStderr: 'Forbidden',
  };

  const helmManifest = installed?.manifest ?? '';
  const helmValues =
    scenario === 'drift' && installed
      ? { drifted: true }
      : (installed?.values ?? {});
  const helmTemplate = installed?.manifest ?? '';

  const protocolSteps = [
    () => cmdOk(nativeInfoBody()),
    () => cmdOk(nativeInfoBody()),
    () => cmdOk('PONG\n'),
    () => cmdOk(nativeConfigBody('maxmemory', '33554432')),
    () => cmdOk(nativeConfigBody('maxmemory-policy', 'allkeys-lru')),
    () => cmdOk(nativeConfigBody('save', '')),
    () => cmdOk(nativeConfigBody('appendonly', 'no')),
    () => cmdOk(nativeConfigBody('maxclients', '10000')),
    () => cmdOk(nativeConfigBody('maxmemory-clients', '0')),
    () => cmdOk(nativeInfoBody()),
    () => cmdOk(nativeInfoBody()),
  ];

  /**
   * @param {string} command
   * @param {string[]} args
   */
  const run = (command, args) => {
    commands.push([command, args]);
    if (command === 'helm') {
      const verb = args[0];
      if (verb === 'version' && args[1] === '--short') {
        return cmdOk('v3.22.1\n');
      }
      if (verb === 'lint' || verb === 'template') {
        return cmdOk(helmTemplate);
      }
      if (verb === 'list') {
        return cmdOk(JSON.stringify(flags.helmList));
      }
      if (verb === 'get' && args[1] === 'manifest') {
        return cmdOk(helmManifest);
      }
      if (verb === 'get' && args[1] === 'values') {
        return cmdOk(JSON.stringify(helmValues));
      }
      if (verb === 'history') {
        return cmdOk(JSON.stringify([{ revision: 1, status: 'deployed' }]));
      }
      return cmdFail(1, 'unexpected helm');
    }

    if (command === 'kubectl' && bundle && args.includes('exec')) {
      const reply = protocolSteps[probeIndex]?.() ?? cmdOk('');
      probeIndex += 1;
      return reply;
    }

    if (command === 'kubectl' && bundle) {
      const resourceIdx = args.indexOf('get') + 1;
      const resourceKind = args[resourceIdx];
      const resourceName = args[resourceIdx + 1];
      const output = args[args.indexOf('-o') + 1];
      if (
        args.includes('get') &&
        resourceKind === 'namespace' &&
        output === 'json'
      ) {
        return cmdOk(JSON.stringify(bundle.namespace));
      }
      if (
        args.includes('get') &&
        resourceKind === 'configmap' &&
        resourceName === 'redis-config' &&
        output === 'json'
      ) {
        return cmdOk(JSON.stringify(bundle.configMap));
      }
      if (
        args.includes('get') &&
        resourceKind === 'deployment' &&
        resourceName === 'redis' &&
        output === 'json'
      ) {
        return cmdOk(JSON.stringify(bundle.deployment));
      }
      if (
        args.includes('get') &&
        resourceKind === 'service' &&
        resourceName === 'redis' &&
        output === 'json'
      ) {
        return cmdOk(JSON.stringify(bundle.service));
      }
      if (args.includes('replicaset')) {
        return cmdOk(JSON.stringify({ items: bundle.replicaSets }));
      }
      if (args.includes('pods') && args.includes('-l')) {
        return cmdOk(JSON.stringify({ items: [bundle.pod] }));
      }
      if (args.includes('endpointslice')) {
        return cmdOk(JSON.stringify({ items: bundle.endpointSlices }));
      }
    }

    if (command === 'kubectl') {
      const outputFlag = args.includes('-o')
        ? args[args.indexOf('-o') + 1]
        : '';
      const getIndex = args.indexOf('get');
      const gotten = getIndex >= 0 ? args[getIndex + 1] : '';
      const gottenName = getIndex >= 0 ? args[getIndex + 2] : '';
      if (outputFlag === 'json' && gotten === 'namespace') {
        if (!flags.namespacePresent) {
          return cmdOk('');
        }
        return cmdOk(
          JSON.stringify({
            apiVersion: 'v1',
            kind: 'Namespace',
            metadata: {
              name: target.namespace,
              uid: 'ns-uid-1',
              resourceVersion: 'ns-rv-1',
            },
          }),
        );
      }
      if (
        outputFlag === 'json' &&
        gotten === 'endpointslices.discovery.k8s.io'
      ) {
        return cmdOk(
          JSON.stringify({
            apiVersion: 'v1',
            kind: 'List',
            items: flags.endpointsPresent
              ? [
                  {
                    apiVersion: 'discovery.k8s.io/v1',
                    kind: 'EndpointSlice',
                    metadata: {
                      name: 'redis-fixture',
                      namespace: target.namespace,
                      labels: { 'kubernetes.io/service-name': 'redis' },
                    },
                    endpoints: [],
                  },
                ]
              : [],
          }),
        );
      }

      if (
        outputFlag === 'json' &&
        (gotten === 'deployment' ||
          gotten === 'service' ||
          gotten === 'configmap')
      ) {
        const present =
          (gotten === 'deployment' && flags.deployment) ||
          (gotten === 'service' && flags.service) ||
          (gotten === 'configmap' && flags.configMap);
        if (!present) {
          return cmdOk('');
        }
        const identity =
          gotten === 'deployment'
            ? { apiVersion: 'apps/v1', kind: 'Deployment' }
            : gotten === 'service'
              ? { apiVersion: 'v1', kind: 'Service' }
              : { apiVersion: 'v1', kind: 'ConfigMap' };
        return cmdOk(
          JSON.stringify({
            ...identity,
            metadata: { name: gottenName, namespace: target.namespace },
          }),
        );
      }

      const getIdx = args.indexOf('get');
      const resource = getIdx >= 0 ? args[getIdx + 1] : '';
      const next = getIdx >= 0 ? args[getIdx + 2] : '';
      if (
        (resource === 'secret' || resource === 'configmap') &&
        next === '-o' &&
        args[getIdx + 3] === 'name'
      ) {
        if (flags.listFail) {
          return cmdFail(1, flags.listStderr);
        }
        if (resource === 'configmap') {
          return cmdOk('');
        }
        const labelIdx = args.indexOf('-l');
        const names =
          labelIdx >= 0 && args[labelIdx + 1] === 'name=redis'
            ? flags.secrets
            : flags.secrets;
        return cmdOk(
          names.map((name) => `secret/${name}`).join('\n') +
            (names.length ? '\n' : ''),
        );
      }

      if (args.includes('jsonpath={.metadata.labels}')) {
        const name = args[args.indexOf('get') + 2];
        if (args.includes('secret')) {
          return cmdOk(
            JSON.stringify({
              owner: 'helm',
              name: 'redis',
              status: 'deployed',
            }),
          );
        }
        if (
          args.includes('configmap') &&
          name === 'redis-config' &&
          flags.configMap
        ) {
          return cmdOk(JSON.stringify(deploymentLabels));
        }
        if (
          (args.includes('deployment') && flags.deployment) ||
          (args.includes('service') && flags.service)
        ) {
          return cmdOk(JSON.stringify(deploymentLabels));
        }
        return cmdOk('{}');
      }

      if (args.includes('jsonpath={.spec.selector.matchLabels}')) {
        return cmdOk(JSON.stringify(deploymentSelectors));
      }

      if (args.includes('jsonpath={.spec.selector}')) {
        return cmdOk(JSON.stringify(serviceSelectors));
      }

      if (args.includes('endpoints') && args.includes('jsonpath={.subsets}')) {
        return cmdOk(
          flags.endpointsPresent ? '[{"addresses":[{"ip":"10.0.0.1"}]}]' : '',
        );
      }

      const reserved = args[getIdx + 1];
      const reservedName = args[getIdx + 2];
      const out = args[args.indexOf('-o') + 1];
      const present =
        (reserved === 'deployment' && flags.deployment) ||
        (reserved === 'service' && flags.service) ||
        (reserved === 'configmap' && flags.configMap);
      if (out === 'name' && reservedName !== '-o') {
        return present ? cmdOk(`${reserved}/${reservedName}\n`) : cmdOk('');
      }
    }

    return warm(command, args);
  };

  return { run, commands };
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
  // eslint-disable-next-line no-control-regex -- assert CLI default output is not colorized
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
  // eslint-disable-next-line no-control-regex -- assert human status output is not colorized
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
  // eslint-disable-next-line no-control-regex -- assert human status output is not colorized
  assert.equal(/\x1b\[[0-9;]*m/.test(releaseText), false);
});

test('human refusal uses formatter stdout without dispatch stderr', () => {
  /** @type {string[]} */
  const stdout = [];
  /** @type {string[]} */
  const stderr = [];
  const human = runInfraCliArgv(
    ['plan', '--env', 'dev', '--services', 'gateway', '--human'],
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
    ['plan', '--env', 'dev', '--services', 'gateway'],
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
    run: (command, args) => devWarmRun(runnerCalls.length > 0)(command, args),
    runner: (argv) => {
      runnerCalls.push(argv);
      return { ok: true, status: 0 };
    },
  });
  assert.equal(result.ok, true);
  assert.deepEqual(result.ran, ['cluster-ensure', 'cluster-verify']);
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
    run: (command, args) => releaseWarmRun(runnerCalls.length > 0)(command, args),
    runner: (argv) => {
      runnerCalls.push(argv);
      return { ok: true, status: 0 };
    },
  });
  assert.equal(result.ok, true);
  assert.deepEqual(result.ran, ['cluster-ensure', 'cluster-verify']);
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

for (const profileId of ['dev', 'release']) {
  test(`up cold ${profileId} refuses an unready foundation before platform ensure`, () => {
    const healthy = profileId === 'dev' ? devWarmRun : releaseWarmRun;
    const calls = [];
    const result = runInfraUp({
      profileId,
      services: 'core',
      run: (command, args) =>
        command === 'kubectl' && args.includes('nodes')
          ? { ok: true, stdout: JSON.stringify({ items: [] }) }
          : healthy(calls.length > 0)(command, args),
      runner: (argv) => {
        calls.push(argv);
        return { ok: true, status: 0 };
      },
    });
    assert.equal(result.ok, false);
    assert.equal(result.phase, 'cluster-verify');
    assert.equal(calls.length, 1);
  });
}

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

test('legacy redis observe fixtures never report installed', () => {
  for (const profileId of /** @type {const} */ (['dev', 'release'])) {
    const legacyFixtures = {
      deployment: redisDeploymentObject(profileId),
      service: redisServiceObject(profileId),
      configMap: redisConfigMapObject(profileId),
    };
    const mapped = observeSelectedServiceState(profileId, 'redis', {
      run: buildRedisObserveRun(profileId, legacyFixtures),
    });
    assert.equal(mapped.state, 'not-ready');
    assert.notEqual(mapped.state, 'installed');
  }
});

test(
  'redis status maps native readiness for dev and release',
  { skip: !helmPinned || nativeInstalledByProfile.size < 2 },
  () => {
    const cases = /** @type {const} */ ([
      ['ready', 'installed'],
      ['absent', 'not-installed'],
      ['legacy', 'not-ready'],
      ['partial', 'not-ready'],
      ['drift', 'not-ready'],
      ['unreadable', 'unreadable'],
    ]);

    for (const profileId of /** @type {const} */ (['dev', 'release'])) {
      const installed = nativeInstalledByProfile.get(profileId);
      assert.ok(installed);

      for (const [scenario, expected] of cases) {
        const { run } = createNativeRedisStatusRun(
          profileId,
          scenario,
          scenario === 'ready' || scenario === 'drift' ? installed : undefined,
        );
        const mapped = observeSelectedServiceState(profileId, 'redis', { run });
        assert.equal(
          mapped.state,
          expected,
          `${profileId} ${scenario} should map to ${expected} (${mapped.detail ?? ''})`,
        );
        if (scenario === 'legacy' || scenario === 'partial') {
          assert.notEqual(mapped.state, 'installed');
          assert.notEqual(mapped.state, 'not-installed');
        }
      }
    }

    const devReady = createNativeRedisStatusRun(
      'dev',
      'ready',
      nativeInstalledByProfile.get('dev'),
    );
    const releaseReady = createNativeRedisStatusRun(
      'release',
      'ready',
      nativeInstalledByProfile.get('release'),
    );
    assert.equal(
      observeSelectedServiceState('dev', 'redis', { run: devReady.run }).state,
      'installed',
    );
    assert.equal(
      observeSelectedServiceState('release', 'redis', {
        run: releaseReady.run,
      }).state,
      'installed',
    );
  },
);

test(
  'redis status path issues no helm install or kubectl apply/delete',
  { skip: !helmPinned },
  () => {
    const installed = nativeInstalledByProfile.get('dev');
    assert.ok(installed);
    const { run, commands } = createNativeRedisStatusRun(
      'dev',
      'ready',
      installed,
    );
    const result = runInfraStatus({
      profileId: 'dev',
      services: 'redis',
      run,
    });
    assert.equal(result.ok, true);
    assert.equal(result.services.redis.state, 'installed');
    const joined = commands
      .map(([cmd, args]) => `${cmd} ${args.join(' ')}`)
      .join('\n');
    assert.equal(/helm\s+install/i.test(joined), false);
    assert.equal(/\bapply\b/i.test(joined), false);
    assert.equal(/\bdelete\b/i.test(joined), false);
  },
);

test(
  'status reports redis absent through native inventory',
  { skip: !helmPinned },
  () => {
    const { run } = createNativeRedisStatusRun('dev', 'absent');
    const result = runInfraStatus({
      profileId: 'dev',
      services: 'redis',
      run,
    });
    assert.equal(result.ok, true);
    assert.equal(result.services.redis.state, 'not-installed');
  },
);

test('object-storage status maps native installer states on dev and release', () => {
  for (const profileId of ['dev', 'release']) {
    const cases = [
      ['absent', 'not-installed', 'namespace absent'],
      ['native-noop', 'installed', 'native compatible'],
      ['unknown', 'unreadable', 'cluster unreachable'],
      ['refused', 'not-ready', 'legacy structural'],
    ];
    for (const [nativeState, serviceState, reason] of cases) {
      const observed = observeSelectedServiceState(
        profileId,
        'object-storage',
        {
          statusObjectStorage: () => ({ state: nativeState, reason }),
        },
      );
      assert.equal(observed.state, serviceState);
      assert.equal(observed.detail, reason);
    }
  }
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
    services: 'gateway',
  });
  assert.equal(preview.ok, false);
  assert.equal(preview.exitCode, 2);
});

test('dev rabbitmq ensure preview lists native install phase', () => {
  const preview = buildInfraEnsurePreview({
    profileId: 'dev',
    services: 'rabbitmq',
  });
  assert.equal(preview.ok, true);
  assert.deepEqual(preview.selectedServices, ['rabbitmq']);
  assert.equal(preview.phases[0]?.id, 'rabbitmq');
  assert.match(preview.phases[0]?.argv.join(' '), /rabbitmq\/install\.mjs/);
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

test('release Temporal status observes Helm-owned workloads and frontend health without schema Jobs', () => {
  const calls = [];
  const context = 'kind-offscreen-release';
  const namespace = 'lab-temporal';
  const pinnedValues = parse(
    readFileSync(
      new URL('../platform/temporal/values.yaml', import.meta.url),
      'utf8',
    ),
  );
  const ok = (body) => ({
    ok: true,
    status: 0,
    stdout: typeof body === 'string' ? body : JSON.stringify(body),
  });
  function run(command, args) {
    calls.push({ command, args });
    if (command === 'kind') return ok('offscreen-release\n');
    if (command === 'helm')
      return ok([
        {
          name: 'temporal',
          namespace,
          chart: 'temporal-1.8.0',
          app_version: '1.32.2',
          revision: '1',
          status: 'deployed',
        },
      ]);
    assert.equal(command, 'kubectl');
    assert.equal(args[1], context);
    if (args.includes('config'))
      return ok({
        contexts: [{ name: context, context: { cluster: context } }],
        clusters: [
          { name: context, cluster: { server: 'https://127.0.0.1:6443' } },
        ],
      });
    if (args.includes('exec')) {
      assert.ok(args.includes('deploy/temporal-admintools'));
      return ok('SERVING\n');
    }
    const resource = args[3];
    if (resource === 'namespace') {
      return ok({
        metadata: {
          name: args[4],
          uid: 'baseline-uid',
          labels: {
            'offscreen.rpg/lab': 'disposable',
            'app.kubernetes.io/part-of': 'temporal',
          },
        },
      });
    }
    const metadata = {
      name: args[6],
      namespace,
      generation: 1,
      labels: {
        'app.kubernetes.io/instance': 'temporal',
        'app.kubernetes.io/managed-by': 'Helm',
      },
      annotations: {
        'meta.helm.sh/release-name': 'temporal',
        'meta.helm.sh/release-namespace': namespace,
      },
    };
    if (resource === 'service')
      return ok({
        metadata,
        spec: {
          type: 'ClusterIP',
          clusterIP: '10.96.0.20',
          selector: {
            'app.kubernetes.io/instance': 'temporal',
            'app.kubernetes.io/name': 'temporal',
            'app.kubernetes.io/component': 'frontend',
          },
          ports: [{ port: 7233, targetPort: 'rpc', protocol: 'TCP' }],
        },
      });
    assert.equal(resource, 'deployment');
    return ok({
      metadata,
      spec: {
        replicas: 1,
        template: {
          spec: {
            containers: [
              {
                image:
                  'temporalio/image:' +
                  pinnedValues[
                    metadata.name === 'temporal-web'
                      ? 'web'
                      : metadata.name === 'temporal-admintools'
                        ? 'admintools'
                        : 'server'
                  ].image.tag,
              },
            ],
          },
        },
      },
      status: {
        observedGeneration: 1,
        replicas: 1,
        updatedReplicas: 1,
        readyReplicas: 1,
        availableReplicas: 1,
      },
    });
  }
  assert.equal(
    observeSelectedServiceState('release', 'temporal', { run }).state,
    'installed',
  );
  assert.ok(
    calls.some(({ args }) => args.includes('deploy/temporal-admintools')),
  );
  assert.ok(
    calls.every(({ args }) => !args.includes('job') && !args.includes('psql')),
  );
  assert.equal(
    observeSelectedServiceState('release', 'temporal', {
      run: (command, args) =>
        args.includes('exec') ? ok('NOT_SERVING') : run(command, args),
    }).state,
    'not-ready',
  );
  assert.equal(
    observeSelectedServiceState('release', 'temporal', {
      run: (command, args) =>
        command === 'helm' ? ok([]) : run(command, args),
    }).state,
    'not-installed',
  );
});

test('release gateway status uses class, deployment, service, and gateway readiness', () => {
  const context = 'kind-offscreen-release';
  const generation = 3;
  const cond = (type) => ({
    type,
    status: 'True',
    observedGeneration: generation,
  });
  const gatewayClass = JSON.stringify({
    metadata: { name: GATEWAY_CLASS_NAME, generation },
    spec: { controllerName: CONTROLLER_NAME },
    status: { conditions: [cond('Accepted')] },
  });
  const deployment = JSON.stringify({
    metadata: {
      name: 'lab-gateway-traefik',
      namespace: HELM_NAMESPACE,
      generation,
    },
    spec: {
      replicas: 1,
      template: {
        spec: {
          containers: [
            {
              image: `docker.io/traefik@${IMAGE_DIGEST}`,
              args: [
                '--providers.kubernetesgateway',
                '--entryPoints.web.transport.respondingTimeouts.readTimeout=60s',
                '--entryPoints.web.transport.respondingTimeouts.writeTimeout=0s',
                '--entryPoints.web.transport.respondingTimeouts.idleTimeout=180s',
              ],
            },
          ],
        },
      },
    },
    status: {
      observedGeneration: generation,
      replicas: 1,
      updatedReplicas: 1,
      availableReplicas: 1,
      readyReplicas: 1,
    },
  });
  const service = (spec) =>
    JSON.stringify({
      metadata: { name: 'lab-gateway-traefik', namespace: HELM_NAMESPACE },
      spec,
    });
  const healthyService = service({
    type: 'ClusterIP',
    ports: [{ name: 'web', port: 80, targetPort: 'web' }],
  });
  const gateway = (conditions, listenerConditions = conditions) =>
    JSON.stringify({
      metadata: {
        name: GATEWAY_NAME,
        namespace: LAB_EDGE_NAMESPACE,
        generation,
      },
      spec: {
        gatewayClassName: GATEWAY_CLASS_NAME,
        listeners: [
          {
            name: 'web',
            port: 8000,
            protocol: 'HTTP',
            allowedRoutes: { namespaces: { from: 'Same' } },
          },
        ],
      },
      status: {
        conditions,
        listeners: [{ name: 'web', conditions: listenerConditions }],
      },
    });
  const listenerConds = ['Accepted', 'ResolvedRefs', 'Programmed'].map(cond);
  const healthyGateway = gateway(
    [cond('Accepted'), cond('Programmed')],
    listenerConds,
  );
  const respond = (responses) => (command, args) => {
    assert.equal(command, 'kubectl');
    assert.equal(args[1], context);
    const resource = args[3];
    const namespaced = args[4] === '-n';
    const namespace = namespaced ? args[5] : undefined;
    const name = namespaced ? args[6] : args[4];
    const key = namespace
      ? `${resource}/${namespace}/${name}`
      : `${resource}/${name}`;
    if (responses[key] === undefined) {
      return { ok: true, stdout: '' };
    }
    if (responses[key] === null) {
      return { ok: false, stdout: '', stderr: 'Forbidden' };
    }
    return { ok: true, stdout: responses[key] };
  };
  const healthyResponses = {
    [`gatewayclass/${GATEWAY_CLASS_NAME}`]: gatewayClass,
    [`deployment/${HELM_NAMESPACE}/lab-gateway-traefik`]: deployment,
    [`service/${HELM_NAMESPACE}/lab-gateway-traefik`]: healthyService,
    [`gateway/${LAB_EDGE_NAMESPACE}/${GATEWAY_NAME}`]: healthyGateway,
  };
  assert.equal(
    observeSelectedServiceState('release', 'gateway', {
      run: respond(healthyResponses),
    }).state,
    'installed',
  );
  assert.equal(
    observeSelectedServiceState('release', 'gateway', { run: respond({}) })
      .state,
    'not-installed',
  );
  assert.equal(
    observeSelectedServiceState('release', 'gateway', {
      run: respond({
        ...healthyResponses,
        [`gateway/${LAB_EDGE_NAMESPACE}/${GATEWAY_NAME}`]: null,
      }),
    }).state,
    'unreadable',
  );
  const staleGateway = gateway([
    { type: 'Accepted', status: 'True', observedGeneration: generation - 1 },
    cond('Programmed'),
  ]);
  assert.equal(
    observeSelectedServiceState('release', 'gateway', {
      run: respond({
        ...healthyResponses,
        [`gateway/${LAB_EDGE_NAMESPACE}/${GATEWAY_NAME}`]: staleGateway,
      }),
    }).state,
    'not-ready',
  );
  assert.equal(
    observeSelectedServiceState('release', 'gateway', {
      run: respond({
        ...healthyResponses,
        [`service/${HELM_NAMESPACE}/lab-gateway-traefik`]: service({
          type: 'LoadBalancer',
          ports: [{ name: 'web', port: 80, targetPort: 'web' }],
        }),
      }),
    }).state,
    'not-ready',
  );
});

test('rabbitmq observer maps unreadable inventory to unreadable service state', () => {
  for (const profileId of ['dev', 'release']) {
    assert.equal(
      observeSelectedServiceState(profileId, 'rabbitmq', {
        run: () => ({ ok: false, stdout: '', stderr: 'Forbidden' }),
      }).state,
      'unreadable',
    );
  }
});
