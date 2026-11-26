import assert from 'node:assert/strict';
import { Buffer } from 'node:buffer';
import { existsSync, mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import process from 'node:process';
import test from 'node:test';

import {
  DEV_API_PORT_RANGE,
  readKindProfile,
} from '../../../clusters/kind/manager/config.mjs';
import {
  DEV_BASELINE_NAMESPACE,
  DEV_CLUSTER_OWNER,
} from '../../../clusters/kind/manager/dev-bootstrap.mjs';
import { readPlatformProfile } from '../../common/profile.mjs';
import { DEFAULT_WRITE_RESERVE_MS } from '../custody.mjs';
import { observeInventory, redisTargetFromProfile } from '../inventory.mjs';
import {
  ensureRedisInstall,
  planRedisInstall,
  repeatEnsureGeneratedSmokeNamespace,
  runRedisInstallLifecycle,
  smokeRedisAdmissionFixture,
  smokeRedisInstallFailure,
} from '../install.mjs';
import {
  FAULT_ONLY_REDIS_IMAGE,
  assertOrdinaryRedisImage,
  prepareFaultValidatedChartCopy,
  prepareValidatedChartCopy,
} from '../config.mjs';

const devProfile = readPlatformProfile('dev');
const devKind = readKindProfile('dev');
const devPort = DEV_API_PORT_RANGE.start;
const devTarget = redisTargetFromProfile('dev');
const DEV_CONTEXT = devProfile.contextName;
const OWNER_KEY = devTarget.ownerKey;
const OWNER_VALUE = devTarget.ownerValue;
const NAMESPACE = devTarget.namespace;
const FIXED_PROOF_NONCE = '0123456789abcdef0123456789abcdef';
const PROOF_NAMESPACE = `offscreen-redis-proof-${FIXED_PROOF_NONCE}`;
const PRODUCTION_REDIS_IMAGE =
  'docker.io/library/redis@sha256:987c376c727652f99625c7d205a1cba3cb2c53b92b0b62aade2bd48ee1593232';

/**
 * @param {boolean} fault
 */
function helmTemplateYaml(fault) {
  const image = fault ? FAULT_ONLY_REDIS_IMAGE : PRODUCTION_REDIS_IMAGE;
  return `---
apiVersion: v1
kind: ConfigMap
metadata:
  name: redis-config
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: redis
spec:
  template:
    spec:
      containers:
        - name: redis
          image: ${image}
---
apiVersion: v1
kind: Service
metadata:
  name: redis
`;
}

/**
 * @param {number} size
 */
function fixedProofRandomBytes(size) {
  return Buffer.from(FIXED_PROOF_NONCE, 'hex').subarray(0, size);
}

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

function kubectlConfigJson(port) {
  const kubeconfigCluster = `kind-${devKind.clusterName}`;
  return JSON.stringify({
    clusters: [
      {
        name: kubeconfigCluster,
        cluster: { server: `https://127.0.0.1:${port}` },
      },
    ],
    contexts: [
      {
        name: devKind.contextName,
        context: { cluster: kubeconfigCluster, user: kubeconfigCluster },
      },
    ],
    users: [{ name: kubeconfigCluster, user: {} }],
  });
}

/**
 * @param {string} command
 * @param {string[]} args
 */
function platformTargetRead(command, args) {
  if (command === 'kind' && args[0] === 'get' && args[1] === 'clusters') {
    return ok(`${devKind.clusterName}\n`);
  }
  if (
    command === 'kubectl' &&
    args.includes('config') &&
    args.includes('view') &&
    args.includes('json')
  ) {
    return ok(kubectlConfigJson(devPort));
  }
  if (
    command === 'kubectl' &&
    args.includes('namespace') &&
    args.includes(DEV_BASELINE_NAMESPACE) &&
    args.includes('json')
  ) {
    return ok(
      JSON.stringify({
        apiVersion: 'v1',
        kind: 'Namespace',
        metadata: {
          name: DEV_BASELINE_NAMESPACE,
          uid: 'dev-baseline-uid',
          labels: { 'offscreen.dev/owner': DEV_CLUSTER_OWNER },
        },
      }),
    );
  }
  return null;
}

function fail(status = 1, stderr = 'failed') {
  return {
    ok: false,
    status,
    stdout: '',
    stderr,
    timedOut: false,
    missing: false,
  };
}

/**
 * @param {Parameters<typeof observeInventory>[1]} scenario
 */
function createInventoryHarness(scenario = {}) {
  /** @type {Array<[string, string[]]>} */
  const commands = [];
  let namespaceChecks = 0;
  let namespaceLive = scenario.namespacePresent !== false;
  const activeNamespace = scenario.activeNamespace ?? NAMESPACE;

  const deploymentLabels = {
    [OWNER_KEY]: scenario.ownerOnLive === false ? 'wrong-owner' : OWNER_VALUE,
    'app.kubernetes.io/name': 'redis',
    'app.kubernetes.io/instance': 'redis',
  };

  const run = (command, args) => {
    const platform = platformTargetRead(command, args);
    if (platform) {
      commands.push([command, args]);
      return platform;
    }
    commands.push([command, args]);
    if (command === 'helm') {
      const verb = args[0];
      if (verb === 'version' && args[1] === '--short') {
        return ok('v3.22.1\n');
      }
      if (verb === 'lint' || verb === 'template') {
        if (scenario.helmTemplate != null) {
          return ok(scenario.helmTemplate);
        }
        const chartPath = args.find((entry) =>
          String(entry).includes('offscreen-redis'),
        );
        const fault = String(chartPath ?? '').includes(
          'offscreen-redis-fault-chart-',
        );
        return ok(helmTemplateYaml(fault));
      }
      if (verb === 'list') {
        return ok(JSON.stringify(scenario.helmList ?? []));
      }
      if (verb === 'get' && args[1] === 'manifest') {
        return ok(scenario.helmManifest ?? '');
      }
      if (verb === 'get' && args[1] === 'values') {
        return ok(JSON.stringify(scenario.helmValues ?? {}));
      }
      if (verb === 'history') {
        return ok(JSON.stringify(scenario.helmHistory ?? []));
      }
      return fail(1, 'unexpected helm');
    }

    if (command !== 'kubectl') {
      return fail(1, 'unexpected command');
    }

    const getIdx = args.indexOf('get');
    if (
      args.includes('namespace') &&
      getIdx >= 0 &&
      args[getIdx + 1] === 'namespace'
    ) {
      namespaceChecks += 1;
      if (scenario.namespaceRace && namespaceChecks === 1) {
        return fail(1, 'NotFound');
      }
      if (!namespaceLive) {
        if (args.includes('--ignore-not-found') && args.includes('json')) {
          return ok('');
        }
        return fail(1, 'NotFound');
      }
      if (args.includes('-o') && args[args.indexOf('-o') + 1] === 'json') {
        return ok(
          JSON.stringify({
            apiVersion: 'v1',
            kind: 'Namespace',
            metadata: {
              name: activeNamespace,
              uid: scenario.namespaceUid ?? 'created-ns-uid',
              resourceVersion: scenario.namespaceRv ?? '900',
              labels: {
                [OWNER_KEY]: OWNER_VALUE,
                ...(scenario.proofNonce
                  ? {
                      'offscreen.dev/redis-proof': scenario.proofNonce,
                    }
                  : {}),
              },
            },
          }),
        );
      }
      return ok(`namespace/${activeNamespace}\n`);
    }

    if (command === 'kubectl' && args.includes('api-resources')) {
      return ok('pods\nservices\n');
    }

    if (
      args.includes('secret') &&
      args.includes('-o') &&
      args[args.indexOf('-o') + 1] === 'name'
    ) {
      if (scenario.listFail) {
        return fail(1, scenario.listStderr ?? 'Forbidden');
      }
      const labelIdx = args.indexOf('-l');
      const names =
        labelIdx >= 0
          ? (scenario.labelSecrets ?? [])
          : (scenario.secrets ?? []);
      return ok(
        names.map((n) => `secret/${n}`).join('\n') + (names.length ? '\n' : ''),
      );
    }

    if (
      args.includes('configmap') &&
      args.includes('-o') &&
      args[args.indexOf('-o') + 1] === 'name'
    ) {
      return ok('');
    }

    if (
      getIdx >= 0 &&
      args[getIdx + 1] === 'deployment' &&
      args.includes('-o') &&
      args[args.indexOf('-o') + 1] === 'json'
    ) {
      if (scenario.deployment !== true) {
        return ok('');
      }
      return ok(
        JSON.stringify({
          apiVersion: 'apps/v1',
          kind: 'Deployment',
          metadata: { name: 'redis', namespace: NAMESPACE },
        }),
      );
    }

    if (
      getIdx >= 0 &&
      args[getIdx + 1] === 'service' &&
      args.includes('-o') &&
      args[args.indexOf('-o') + 1] === 'json'
    ) {
      if (scenario.service !== true) {
        return ok('');
      }
      return ok(
        JSON.stringify({
          apiVersion: 'v1',
          kind: 'Service',
          metadata: { name: 'redis', namespace: NAMESPACE },
        }),
      );
    }

    if (
      getIdx >= 0 &&
      args[getIdx + 1] === 'configmap' &&
      args.includes('-o') &&
      args[args.indexOf('-o') + 1] === 'json'
    ) {
      if (scenario.configMap !== true) {
        return ok('');
      }
      return ok(
        JSON.stringify({
          apiVersion: 'v1',
          kind: 'ConfigMap',
          metadata: { name: 'redis', namespace: NAMESPACE },
        }),
      );
    }

    if (args.includes('jsonpath={.metadata.labels}')) {
      const name = args[getIdx + 2];
      if (args.includes('secret')) {
        return ok(
          JSON.stringify(
            scenario.secretLabels?.[name] ?? {
              owner: 'helm',
              name: 'redis',
              status: 'deployed',
            },
          ),
        );
      }
      return ok(JSON.stringify(deploymentLabels));
    }

    if (args.includes('jsonpath={.spec.selector.matchLabels}')) {
      return ok(
        JSON.stringify(
          scenario.deploymentSelectors ?? {
            'app.kubernetes.io/name': 'redis',
            'app.kubernetes.io/instance': 'redis',
          },
        ),
      );
    }

    if (args.includes('jsonpath={.spec.selector}')) {
      return ok(
        JSON.stringify(
          scenario.serviceSelectors ?? {
            'app.kubernetes.io/name': 'redis',
            'app.kubernetes.io/instance': 'redis',
          },
        ),
      );
    }

    if (args.includes('endpoints')) {
      return scenario.endpointsPresent ? ok('[{}]') : ok('');
    }

    const resource = args[getIdx + 1];
    const name = args[getIdx + 2];
    const present =
      (resource === 'deployment' && scenario.deployment === true) ||
      (resource === 'service' && scenario.service === true) ||
      (resource === 'configmap' && scenario.configMap === true);

    if (args[args.indexOf('-o') + 1] === 'name') {
      return present ? ok(`${resource}/${name}\n`) : ok('');
    }
    return fail(1, 'unexpected kubectl');
  };

  return {
    run,
    commands,
    markNamespaceLive: () => {
      namespaceLive = true;
    },
    markNamespaceAbsent: () => {
      namespaceLive = false;
    },
  };
}

/** @param {string} stateRoot */
function pendingPath(stateRoot) {
  return join(stateRoot, 'platform-locks', `${DEV_CONTEXT}-redis.pending`);
}

/** @param {string} stateRoot @param {Record<string, unknown>} scenario */
function buildMutationDeps(stateRoot, scenario) {
  const harness = {
    ...(scenario.harness ?? {}),
    ...(scenario.proofNamespace
      ? {
          activeNamespace: scenario.proofNamespace,
          proofNonce: scenario.proofNonce ?? FIXED_PROOF_NONCE,
        }
      : {}),
  };
  const { run, markNamespaceLive, markNamespaceAbsent } =
    createInventoryHarness(harness);
  /** @type {Array<[string, string[]]>} */
  const mutations = [];
  let inventoryReads = 0;

  const observeInventoryStub = (target, deps = {}) => {
    inventoryReads += 1;
    const phase = scenario.inventoryByPass?.[inventoryReads - 1];
    if (phase) {
      return phase;
    }
    return observeInventory(target, { run: deps.run ?? run });
  };

  const observeRedisReadyStub = () =>
    scenario.ready ?? { ok: false, state: 'unready', detail: 'unready' };

  const spawn = (command, args) => {
    mutations.push([command, args]);
    if (
      command === 'kubectl' &&
      args.includes('create') &&
      args.includes('-f')
    ) {
      const created =
        scenario.namespaceCreateResult ??
        ok(
          JSON.stringify({
            metadata: {
              name: scenario.proofNamespace ?? NAMESPACE,
              uid: 'created-ns-uid',
              resourceVersion: '900',
            },
          }),
        );
      if (created.ok) {
        markNamespaceLive();
      }
      return created;
    }
    if (command === 'kubectl' && args.includes('label')) {
      throw new Error('forbidden namespace label overwrite path');
    }
    if (command === 'helm' && args[0] === 'install') {
      scenario.helmInstallCalls = (scenario.helmInstallCalls ?? 0) + 1;
      return (
        scenario.helmInstallResult ?? {
          ok: true,
          status: 0,
          stdout: '',
          stderr: '',
        }
      );
    }
    if (command === 'helm' && (args[0] === 'lint' || args[0] === 'template')) {
      return ok('');
    }
    if (
      command === 'kubectl' &&
      args.includes('delete') &&
      args.includes('--raw')
    ) {
      markNamespaceAbsent();
      return scenario.namespaceDeleteResult ?? ok('');
    }
    if (
      command === 'kubectl' &&
      args.includes('create') &&
      args.includes('-f') &&
      !args.includes('namespace')
    ) {
      return scenario.fixtureCreateResult ?? ok('');
    }
    if (
      command === 'kubectl' &&
      args.includes('-o') &&
      args.includes('name') &&
      !args.includes('namespace')
    ) {
      return ok('configmap/kube-root-ca.crt\nserviceaccount/default\n');
    }
    return fail(1, `unexpected mutation ${command}`);
  };

  return {
    deps: {
      stateRoot,
      run,
      spawn,
      observeInventory: observeInventoryStub,
      observeRedisReady: observeRedisReadyStub,
      budgetMs: scenario.budgetMs ?? 600_000,
      writeReserveMs: scenario.writeReserveMs ?? DEFAULT_WRITE_RESERVE_MS,
      ...(scenario.randomBytes ? { randomBytes: scenario.randomBytes } : {}),
    },
    mutations,
    observeInventoryStub,
  };
}

test('wrong context refuses before mutation', () => {
  assert.throws(
    () => planRedisInstall('dev', 'kind-offscreen-release', {}),
    /must be exactly/,
  );
});

test('ensure without OFFSCREEN_REDIS_ENSURE refuses and does not lock-write', async () => {
  const stateRoot = mkdtempSync(join(tmpdir(), 'redis-install-noauth-'));
  const prior = process.env.OFFSCREEN_REDIS_ENSURE;
  delete process.env.OFFSCREEN_REDIS_ENSURE;
  try {
    const receipt = await ensureRedisInstall('dev', DEV_CONTEXT, {
      stateRoot,
    });
    assert.equal(receipt.ok, false);
    assert.equal(receipt.mutated, false);
    assert.equal(receipt.detail, 'ensure-not-authorized');
    assert.equal(existsSync(pendingPath(stateRoot)), false);
  } finally {
    if (prior === undefined) {
      delete process.env.OFFSCREEN_REDIS_ENSURE;
    } else {
      process.env.OFFSCREEN_REDIS_ENSURE = prior;
    }
    rmSync(stateRoot, { recursive: true, force: true });
  }
});

test('legacy inventory refuses with zero mutations', async () => {
  const stateRoot = mkdtempSync(join(tmpdir(), 'redis-install-legacy-'));
  const prior = process.env.OFFSCREEN_REDIS_ENSURE;
  process.env.OFFSCREEN_REDIS_ENSURE = 'authorized';
  const { deps, mutations } = buildMutationDeps(stateRoot, {
    harness: {
      namespacePresent: true,
      deployment: true,
      deploymentSelectors: { app: 'redis' },
      serviceSelectors: { app: 'redis' },
    },
  });
  try {
    const receipt = await ensureRedisInstall('dev', DEV_CONTEXT, deps);
    assert.equal(receipt.ok, false);
    assert.equal(receipt.mutated, false);
    assert.equal(receipt.state, 'legacy');
    assert.equal(mutations.length, 0);
    assert.equal(existsSync(pendingPath(stateRoot)), false);
  } finally {
    if (prior === undefined) {
      delete process.env.OFFSCREEN_REDIS_ENSURE;
    } else {
      process.env.OFFSCREEN_REDIS_ENSURE = prior;
    }
    rmSync(stateRoot, { recursive: true, force: true });
  }
});

test('matching orphan refuses with zero mutations', async () => {
  const stateRoot = mkdtempSync(join(tmpdir(), 'redis-install-orphan-'));
  process.env.OFFSCREEN_REDIS_ENSURE = 'authorized';
  const { deps, mutations } = buildMutationDeps(stateRoot, {
    harness: {
      namespacePresent: true,
      secrets: ['sh.helm.release.v1.redis.v1'],
      deployment: true,
      service: false,
      configMap: false,
      helmList: [
        {
          name: 'redis',
          namespace: NAMESPACE,
          revision: '1',
          status: 'deployed',
          chart: 'offscreen-redis-specimen-0.1.0',
        },
      ],
    },
  });
  try {
    const receipt = await ensureRedisInstall('dev', DEV_CONTEXT, deps);
    assert.equal(receipt.ok, false);
    assert.equal(receipt.mutated, false);
    assert.equal(receipt.state, 'partial');
    assert.equal(mutations.length, 0);
  } finally {
    delete process.env.OFFSCREEN_REDIS_ENSURE;
    rmSync(stateRoot, { recursive: true, force: true });
  }
});

test('partial inventory refuses with zero mutations', async () => {
  const stateRoot = mkdtempSync(join(tmpdir(), 'redis-install-partial-'));
  process.env.OFFSCREEN_REDIS_ENSURE = 'authorized';
  const { deps, mutations } = buildMutationDeps(stateRoot, {
    harness: {
      namespacePresent: true,
      deployment: true,
      service: true,
      configMap: false,
      secrets: ['sh.helm.release.v1.redis.v1'],
      helmList: [
        {
          name: 'redis',
          namespace: NAMESPACE,
          revision: '1',
          status: 'deployed',
          chart: 'offscreen-redis-specimen-0.1.0',
        },
      ],
    },
  });
  try {
    const receipt = await ensureRedisInstall('dev', DEV_CONTEXT, deps);
    assert.equal(receipt.ok, false);
    assert.equal(receipt.mutated, false);
    assert.equal(receipt.state, 'partial');
    assert.equal(mutations.length, 0);
  } finally {
    delete process.env.OFFSCREEN_REDIS_ENSURE;
    rmSync(stateRoot, { recursive: true, force: true });
  }
});

test('unexpected helm revision refuses with zero mutations', async () => {
  const stateRoot = mkdtempSync(join(tmpdir(), 'redis-install-revision-'));
  process.env.OFFSCREEN_REDIS_ENSURE = 'authorized';
  const { deps, mutations } = buildMutationDeps(stateRoot, {
    harness: {
      namespacePresent: true,
      secrets: ['sh.helm.release.v1.redis.v1'],
      helmList: [
        {
          name: 'redis',
          namespace: NAMESPACE,
          revision: '2',
          status: 'deployed',
          chart: 'offscreen-redis-specimen-0.1.0',
        },
      ],
    },
  });
  try {
    const receipt = await ensureRedisInstall('dev', DEV_CONTEXT, deps);
    assert.equal(receipt.ok, false);
    assert.equal(receipt.mutated, false);
    assert.equal(receipt.state, 'partial');
    assert.equal(mutations.length, 0);
  } finally {
    delete process.env.OFFSCREEN_REDIS_ENSURE;
    rmSync(stateRoot, { recursive: true, force: true });
  }
});

test('malformed helm history refuses with zero mutations', async () => {
  const stateRoot = mkdtempSync(join(tmpdir(), 'redis-install-history-'));
  process.env.OFFSCREEN_REDIS_ENSURE = 'authorized';
  const { deps, mutations } = buildMutationDeps(stateRoot, {
    inventoryByPass: [
      {
        state: 'unreadable',
        reason: 'helm-history-too-long',
        snapshot: {},
      },
    ],
  });
  try {
    const receipt = await ensureRedisInstall('dev', DEV_CONTEXT, deps);
    assert.equal(receipt.ok, false);
    assert.equal(receipt.mutated, false);
    assert.equal(receipt.state, 'unreadable');
    assert.equal(mutations.length, 0);
  } finally {
    delete process.env.OFFSCREEN_REDIS_ENSURE;
    rmSync(stateRoot, { recursive: true, force: true });
  }
});

test('compatible installed ready is a no-op with zero helm install', async () => {
  const stateRoot = mkdtempSync(join(tmpdir(), 'redis-install-noop-'));
  process.env.OFFSCREEN_REDIS_ENSURE = 'authorized';
  const { deps, mutations } = buildMutationDeps(stateRoot, {
    harness: {
      namespacePresent: true,
      secrets: ['sh.helm.release.v1.redis.v1'],
      deployment: true,
      service: true,
      configMap: true,
      endpointsPresent: true,
      helmList: [
        {
          name: 'redis',
          namespace: NAMESPACE,
          revision: '1',
          status: 'deployed',
          chart: 'offscreen-redis-specimen-0.1.0',
        },
      ],
      helmManifest: '---\napiVersion: v1\nkind: ConfigMap\n',
      helmValues: { image: 'x' },
      helmHistory: [{ revision: 1, status: 'deployed' }],
      helmTemplate: '---\napiVersion: v1\nkind: ConfigMap\n',
    },
    ready: { ok: true, state: 'ready', detail: 'compatible-ready' },
    inventoryByPass: [
      {
        state: 'installed',
        reason: 'compatible',
        snapshot: {
          fetchedManifest: 'manifest',
          fetchedValues: {},
        },
      },
    ],
  });
  try {
    const receipt = await ensureRedisInstall('dev', DEV_CONTEXT, deps);
    assert.equal(receipt.ok, true);
    assert.equal(receipt.mutated, false);
    assert.equal(receipt.state, 'installed');
    assert.equal(
      mutations.filter(([cmd, args]) => cmd === 'helm' && args[0] === 'install')
        .length,
      0,
    );
    assert.equal(
      mutations.filter(
        ([cmd, args]) => cmd === 'kubectl' && args.includes('create'),
      ).length,
      0,
    );
    assert.equal(existsSync(pendingPath(stateRoot)), false);
  } finally {
    delete process.env.OFFSCREEN_REDIS_ENSURE;
    rmSync(stateRoot, { recursive: true, force: true });
  }
});

test('unknown helm install result leaves the pending file', async () => {
  const stateRoot = mkdtempSync(join(tmpdir(), 'redis-install-pending-'));
  process.env.OFFSCREEN_REDIS_ENSURE = 'authorized';
  const { deps } = buildMutationDeps(stateRoot, {
    harness: { namespacePresent: false },
    inventoryByPass: [
      { state: 'absent', reason: 'namespace-missing', snapshot: {} },
      { state: 'absent', reason: 'empty', snapshot: {} },
    ],
    helmInstallResult: {
      ok: false,
      status: null,
      stdout: '',
      stderr: 'timeout',
      timedOut: true,
    },
  });
  try {
    const receipt = await ensureRedisInstall('dev', DEV_CONTEXT, deps);
    assert.equal(receipt.ok, false);
    assert.equal(receipt.mutated, true);
    assert.equal(existsSync(pendingPath(stateRoot)), true);
  } finally {
    delete process.env.OFFSCREEN_REDIS_ENSURE;
    rmSync(stateRoot, { recursive: true, force: true });
  }
});

test('fresh empty namespace creates chart install and clears pending', async () => {
  const stateRoot = mkdtempSync(join(tmpdir(), 'redis-install-fresh-'));
  process.env.OFFSCREEN_REDIS_ENSURE = 'authorized';
  const { deps, mutations } = buildMutationDeps(stateRoot, {
    harness: {
      namespacePresent: true,
      secrets: [],
      configmaps: [],
      helmList: [],
    },
    inventoryByPass: [
      { state: 'absent', reason: 'empty', snapshot: { namespace: NAMESPACE } },
      { state: 'absent', reason: 'empty', snapshot: { namespace: NAMESPACE } },
      { state: 'installed', reason: 'compatible', snapshot: {} },
    ],
    ready: { ok: true, state: 'ready', detail: 'installed-ready' },
  });
  try {
    const receipt = await ensureRedisInstall('dev', DEV_CONTEXT, deps);
    assert.equal(receipt.ok, true);
    assert.equal(receipt.mutated, true);

    const kubectlCreate = mutations.filter(
      ([cmd, args]) =>
        cmd === 'kubectl' &&
        args.includes('create') &&
        args.includes('namespace'),
    );
    assert.equal(kubectlCreate.length, 0);

    const helmInstalls = mutations.filter(
      ([cmd, args]) => cmd === 'helm' && args[0] === 'install',
    );
    assert.equal(helmInstalls.length, 1);
    const args = helmInstalls[0][1];
    assert.equal(args[0], 'install');
    assert.equal(args[1], 'redis');
    assert.match(args.join(' '), /--kube-context/);
    assert.match(args.join(' '), new RegExp(`--namespace ${NAMESPACE}`));
    assert.ok(args.includes('--wait'));
    assert.ok(args.includes('180s'));
    assert.ok(!args.includes('--create-namespace'));

    assert.equal(existsSync(pendingPath(stateRoot)), false);
  } finally {
    delete process.env.OFFSCREEN_REDIS_ENSURE;
    rmSync(stateRoot, { recursive: true, force: true });
  }
});

test('namespace-missing path creates namespace then installs once', async () => {
  const stateRoot = mkdtempSync(join(tmpdir(), 'redis-install-ns-'));
  process.env.OFFSCREEN_REDIS_ENSURE = 'authorized';
  const { deps, mutations } = buildMutationDeps(stateRoot, {
    harness: { namespacePresent: false },
    inventoryByPass: [
      { state: 'absent', reason: 'namespace-missing', snapshot: {} },
      { state: 'absent', reason: 'empty', snapshot: {} },
      { state: 'installed', reason: 'compatible', snapshot: {} },
    ],
    ready: { ok: true, state: 'ready', detail: 'installed-ready' },
  });
  try {
    const receipt = await ensureRedisInstall('dev', DEV_CONTEXT, deps);
    assert.equal(receipt.ok, true);
    const kubectlCreates = mutations.filter(
      ([cmd, args]) => cmd === 'kubectl' && args.includes('create'),
    );
    assert.equal(kubectlCreates.length, 1);
    assert.ok(kubectlCreates[0][1].includes('-f'));
    assert.ok(kubectlCreates[0][1].includes('-o'));
    assert.equal(
      mutations.filter(([cmd, args]) => cmd === 'helm' && args[0] === 'install')
        .length,
      1,
    );
  } finally {
    delete process.env.OFFSCREEN_REDIS_ENSURE;
    rmSync(stateRoot, { recursive: true, force: true });
  }
});

test('deadline: budget below write reserve refuses before helm install', async () => {
  const stateRoot = mkdtempSync(join(tmpdir(), 'redis-install-deadline-'));
  process.env.OFFSCREEN_REDIS_ENSURE = 'authorized';
  const { deps, mutations } = buildMutationDeps(stateRoot, {
    harness: {
      namespacePresent: true,
      secrets: [],
      helmList: [],
    },
    inventoryByPass: [{ state: 'absent', reason: 'empty', snapshot: {} }],
    budgetMs: DEFAULT_WRITE_RESERVE_MS - 1,
    writeReserveMs: DEFAULT_WRITE_RESERVE_MS,
  });
  try {
    const receipt = await ensureRedisInstall('dev', DEV_CONTEXT, deps);
    assert.equal(receipt.ok, false);
    assert.equal(receipt.mutated, false);
    assert.equal(
      mutations.filter(([cmd, args]) => cmd === 'helm' && args[0] === 'install')
        .length,
      0,
    );
    assert.equal(existsSync(pendingPath(stateRoot)), false);
  } finally {
    delete process.env.OFFSCREEN_REDIS_ENSURE;
    rmSync(stateRoot, { recursive: true, force: true });
  }
});

test('plan emits readable receipt without mutations', () => {
  const { run } = createInventoryHarness({
    namespacePresent: true,
    secrets: [],
    helmList: [],
  });
  const { receipt, exitCode } = planRedisInstall('dev', DEV_CONTEXT, {
    run,
  });
  assert.equal(exitCode, 0);
  assert.equal(receipt.ok, true);
  assert.equal(receipt.mutated, false);
  assert.equal(receipt.state, 'absent');
});

test('plan unreadable inventory exits nonzero', () => {
  const { run } = createInventoryHarness({
    namespacePresent: true,
    listFail: true,
    listStderr: 'Forbidden',
    secrets: ['sh.helm.release.v1.redis.v1'],
  });
  const { receipt, exitCode } = planRedisInstall('dev', DEV_CONTEXT, { run });
  assert.equal(exitCode, 1);
  assert.equal(receipt.ok, false);
  assert.equal(receipt.state, 'unreadable');
});

test('lifecycle CLI plan prints JSON receipt', async () => {
  const { run } = createInventoryHarness({ namespacePresent: false });
  const priorWrite = process.stdout.write;
  /** @type {string[]} */
  const lines = [];
  process.stdout.write = (chunk) => {
    lines.push(String(chunk));
    return true;
  };
  try {
    const code = await runRedisInstallLifecycle(['plan', 'dev', DEV_CONTEXT], {
      run,
    });
    assert.equal(code, 0);
    const parsed = JSON.parse(lines.join('').trim());
    assert.equal(parsed.mutated, false);
    assert.equal(parsed.state, 'absent');
  } finally {
    process.stdout.write = priorWrite;
  }
});

test('ensure does not export unlocked ensure helper', () => {
  assert.equal(typeof ensureRedisInstall, 'function');
  assert.equal(typeof runRedisInstallLifecycle, 'function');
});

test('lifecycle CLI rejects recovery argv forms', async () => {
  for (const command of ['recover', 'clear-pending', 'unlock']) {
    await assert.rejects(
      () => runRedisInstallLifecycle([command, 'dev', DEV_CONTEXT]),
      /invalid redis install invocation/,
    );
  }
});

test('wrong platform target refuses before mutations', async () => {
  const stateRoot = mkdtempSync(join(tmpdir(), 'redis-install-target-'));
  process.env.OFFSCREEN_REDIS_ENSURE = 'authorized';
  const run = (command, args) => {
    if (command === 'kind' && args[0] === 'get' && args[1] === 'clusters') {
      return ok('other-cluster\n');
    }
    return platformTargetRead(command, args) ?? fail(1, 'unexpected');
  };
  try {
    await assert.rejects(
      () => ensureRedisInstall('dev', DEV_CONTEXT, { stateRoot, run }),
      /not found/,
    );
    assert.equal(existsSync(pendingPath(stateRoot)), false);
  } finally {
    delete process.env.OFFSCREEN_REDIS_ENSURE;
    rmSync(stateRoot, { recursive: true, force: true });
  }
});

test('helm runner env override refuses ensure before lock', async () => {
  const stateRoot = mkdtempSync(join(tmpdir(), 'redis-install-helm-env-'));
  process.env.OFFSCREEN_REDIS_ENSURE = 'authorized';
  const prior = process.env.HELM_DRIVER;
  process.env.HELM_DRIVER = 'config';
  try {
    await assert.rejects(
      () => ensureRedisInstall('dev', DEV_CONTEXT, { stateRoot }),
      /HELM_DRIVER/,
    );
    assert.equal(existsSync(pendingPath(stateRoot)), false);
  } finally {
    if (prior === undefined) {
      delete process.env.HELM_DRIVER;
    } else {
      process.env.HELM_DRIVER = prior;
    }
    delete process.env.OFFSCREEN_REDIS_ENSURE;
    rmSync(stateRoot, { recursive: true, force: true });
  }
});

test('namespace create failure keeps pending with target metadata', async () => {
  const stateRoot = mkdtempSync(join(tmpdir(), 'redis-install-ns-fail-'));
  process.env.OFFSCREEN_REDIS_ENSURE = 'authorized';
  const { deps } = buildMutationDeps(stateRoot, {
    harness: { namespacePresent: false },
    inventoryByPass: [
      { state: 'absent', reason: 'namespace-missing', snapshot: {} },
    ],
    namespaceCreateResult: {
      ok: false,
      status: 1,
      stdout: '',
      stderr: 'create failed',
      timedOut: false,
    },
  });
  try {
    const receipt = await ensureRedisInstall('dev', DEV_CONTEXT, deps);
    assert.equal(receipt.ok, false);
    assert.equal(receipt.mutated, true);
    assert.equal(existsSync(pendingPath(stateRoot)), true);
  } finally {
    delete process.env.OFFSCREEN_REDIS_ENSURE;
    rmSync(stateRoot, { recursive: true, force: true });
  }
});

test('ordinary render rejects fault-only redis image pin', () => {
  assert.throws(
    () => assertOrdinaryRedisImage(FAULT_ONLY_REDIS_IMAGE),
    /fault-only redis image pin/,
  );
});

test('fault chart copy substitutes zero digest; ordinary copy keeps production pin', () => {
  const run = (command, args) => {
    if (command === 'helm' && args[0] === 'version' && args[1] === '--short') {
      return ok('v3.22.1\n');
    }
    if (command === 'helm' && (args[0] === 'lint' || args[0] === 'template')) {
      const chartPath = args.find((entry) =>
        String(entry).includes('offscreen-redis'),
      );
      const fault = String(chartPath ?? '').includes(
        'offscreen-redis-fault-chart-',
      );
      return ok(helmTemplateYaml(fault));
    }
    return fail(1, 'unexpected helm');
  };

  const ordinary = prepareValidatedChartCopy(run, 'dev', PROOF_NAMESPACE);
  try {
    assert.match(ordinary.chartRoot, /offscreen-redis-chart-/);
  } finally {
    ordinary.dispose();
  }

  const fault = prepareFaultValidatedChartCopy(run, 'dev', PROOF_NAMESPACE);
  try {
    assert.match(fault.chartRoot, /offscreen-redis-fault-chart-/);
  } finally {
    fault.dispose();
  }
});

test('smoke-failure uses bounded helm wait and child cap', async () => {
  const stateRoot = mkdtempSync(join(tmpdir(), 'redis-install-smoke-fail-'));
  process.env.OFFSCREEN_REDIS_SMOKE_DISPOSABLE = 'confirmed';
  process.env.OFFSCREEN_REDIS_ENSURE = 'authorized';
  const { deps, mutations } = buildMutationDeps(stateRoot, {
    proofNamespace: PROOF_NAMESPACE,
    harness: { namespacePresent: false },
    inventoryByPass: [
      { state: 'absent', reason: 'namespace-missing', snapshot: {} },
      { state: 'absent', reason: 'empty', snapshot: {} },
    ],
    helmInstallResult: {
      ok: false,
      status: 1,
      stdout: '',
      stderr: 'ImagePullBackOff',
      timedOut: false,
    },
    randomBytes: fixedProofRandomBytes,
  });
  try {
    const receipt = await smokeRedisInstallFailure('dev', DEV_CONTEXT, deps);
    assert.equal(receipt.ok, false);
    assert.equal(receipt.mutated, true);
    assert.equal(receipt.detail, 'smoke-failure-expected');
    assert.equal(receipt.state, 'fault');
    assert.equal(receipt.namespace, PROOF_NAMESPACE);
    assert.equal(existsSync(pendingPath(stateRoot)), true);

    const helmInstalls = mutations.filter(
      ([cmd, args]) => cmd === 'helm' && args[0] === 'install',
    );
    assert.equal(helmInstalls.length, 1);
    const args = helmInstalls[0][1];
    const timeoutIdx = args.indexOf('--timeout');
    assert.equal(args[timeoutIdx + 1], '30s');
    assert.ok(args.join(' ').includes('offscreen-redis-fault-chart-'));
  } finally {
    delete process.env.OFFSCREEN_REDIS_SMOKE_DISPOSABLE;
    delete process.env.OFFSCREEN_REDIS_ENSURE;
    rmSync(stateRoot, { recursive: true, force: true });
  }
});

test('smoke-failure pending blocks following ensure before writes', async () => {
  const stateRoot = mkdtempSync(join(tmpdir(), 'redis-install-smoke-pending-'));
  process.env.OFFSCREEN_REDIS_SMOKE_DISPOSABLE = 'confirmed';
  process.env.OFFSCREEN_REDIS_ENSURE = 'authorized';
  const { deps } = buildMutationDeps(stateRoot, {
    proofNamespace: PROOF_NAMESPACE,
    harness: { namespacePresent: false },
    inventoryByPass: [
      { state: 'absent', reason: 'namespace-missing', snapshot: {} },
      { state: 'absent', reason: 'empty', snapshot: {} },
    ],
    helmInstallResult: {
      ok: false,
      status: 1,
      stdout: '',
      stderr: 'failed',
      timedOut: false,
    },
    randomBytes: fixedProofRandomBytes,
  });
  try {
    await smokeRedisInstallFailure('dev', DEV_CONTEXT, deps);
    assert.equal(existsSync(pendingPath(stateRoot)), true);
    await assert.rejects(
      () => ensureRedisInstall('dev', DEV_CONTEXT, deps),
      /pending receipt already exists/,
    );
  } finally {
    delete process.env.OFFSCREEN_REDIS_SMOKE_DISPOSABLE;
    delete process.env.OFFSCREEN_REDIS_ENSURE;
    rmSync(stateRoot, { recursive: true, force: true });
  }
});

test('smoke-failure unexpected helm success retains receipt', async () => {
  const stateRoot = mkdtempSync(
    join(tmpdir(), 'redis-install-smoke-unexpected-'),
  );
  process.env.OFFSCREEN_REDIS_SMOKE_DISPOSABLE = 'confirmed';
  process.env.OFFSCREEN_REDIS_ENSURE = 'authorized';
  const { deps } = buildMutationDeps(stateRoot, {
    proofNamespace: PROOF_NAMESPACE,
    harness: { namespacePresent: false },
    inventoryByPass: [
      { state: 'absent', reason: 'namespace-missing', snapshot: {} },
      { state: 'absent', reason: 'empty', snapshot: {} },
    ],
    helmInstallResult: {
      ok: true,
      status: 0,
      stdout: 'ok',
      stderr: '',
      timedOut: false,
    },
    randomBytes: fixedProofRandomBytes,
  });
  try {
    const receipt = await smokeRedisInstallFailure('dev', DEV_CONTEXT, deps);
    assert.equal(receipt.ok, false);
    assert.equal(receipt.mutated, true);
    assert.equal(receipt.detail, 'smoke-failure-unexpected-success');
    assert.equal(existsSync(pendingPath(stateRoot)), true);
  } finally {
    delete process.env.OFFSCREEN_REDIS_SMOKE_DISPOSABLE;
    delete process.env.OFFSCREEN_REDIS_ENSURE;
    rmSync(stateRoot, { recursive: true, force: true });
  }
});

test('malformed release fixture refuses admission and clears after verified cleanup', async () => {
  const stateRoot = mkdtempSync(join(tmpdir(), 'redis-install-malformed-'));
  process.env.OFFSCREEN_REDIS_SMOKE_DISPOSABLE = 'confirmed';
  process.env.OFFSCREEN_REDIS_ENSURE = 'authorized';
  const { deps, mutations } = buildMutationDeps(stateRoot, {
    proofNamespace: PROOF_NAMESPACE,
    harness: { namespacePresent: false },
    inventoryByPass: [
      { state: 'absent', reason: 'namespace-missing', snapshot: {} },
      { state: 'absent', reason: 'empty', snapshot: {} },
      { state: 'partial', reason: 'malformed-record', snapshot: {} },
    ],
    randomBytes: fixedProofRandomBytes,
  });
  try {
    const receipt = await smokeRedisAdmissionFixture(
      'dev',
      DEV_CONTEXT,
      'malformed-secret',
      deps,
    );
    assert.equal(receipt.ok, true);
    assert.equal(receipt.detail, 'fixture-malformed-secret-refusal-cleanup');
    assert.equal(
      mutations.filter(([cmd, args]) => cmd === 'helm' && args[0] === 'install')
        .length,
      0,
    );
    assert.equal(existsSync(pendingPath(stateRoot)), false);
  } finally {
    delete process.env.OFFSCREEN_REDIS_SMOKE_DISPOSABLE;
    delete process.env.OFFSCREEN_REDIS_ENSURE;
    rmSync(stateRoot, { recursive: true, force: true });
  }
});

test('matching orphan fixture refuses admission and clears after verified cleanup', async () => {
  const stateRoot = mkdtempSync(
    join(tmpdir(), 'redis-install-orphan-fixture-'),
  );
  process.env.OFFSCREEN_REDIS_SMOKE_DISPOSABLE = 'confirmed';
  process.env.OFFSCREEN_REDIS_ENSURE = 'authorized';
  const { deps, mutations } = buildMutationDeps(stateRoot, {
    proofNamespace: PROOF_NAMESPACE,
    harness: { namespacePresent: false },
    inventoryByPass: [
      { state: 'absent', reason: 'namespace-missing', snapshot: {} },
      { state: 'absent', reason: 'empty', snapshot: {} },
      { state: 'partial', reason: 'matching-orphan', snapshot: {} },
    ],
    randomBytes: fixedProofRandomBytes,
  });
  try {
    const receipt = await smokeRedisAdmissionFixture(
      'dev',
      DEV_CONTEXT,
      'matching-orphan',
      deps,
    );
    assert.equal(receipt.ok, true);
    assert.equal(
      mutations.filter(([cmd, args]) => cmd === 'helm' && args[0] === 'install')
        .length,
      0,
    );
    assert.equal(existsSync(pendingPath(stateRoot)), false);
  } finally {
    delete process.env.OFFSCREEN_REDIS_SMOKE_DISPOSABLE;
    delete process.env.OFFSCREEN_REDIS_ENSURE;
    rmSync(stateRoot, { recursive: true, force: true });
  }
});

test('repeat ensure on generated namespace is no-op without second helm install', async () => {
  const stateRoot = mkdtempSync(join(tmpdir(), 'redis-install-smoke-repeat-'));
  process.env.OFFSCREEN_REDIS_SMOKE_DISPOSABLE = 'confirmed';
  process.env.OFFSCREEN_REDIS_ENSURE = 'authorized';
  const target = { ...devTarget, namespace: PROOF_NAMESPACE };
  const { deps, mutations } = buildMutationDeps(stateRoot, {
    proofNamespace: PROOF_NAMESPACE,
    harness: {
      namespacePresent: true,
      secrets: ['sh.helm.release.v1.redis.v1'],
      deployment: true,
      service: true,
      configMap: true,
      endpointsPresent: true,
      helmList: [
        {
          name: 'redis',
          namespace: PROOF_NAMESPACE,
          revision: '1',
          status: 'deployed',
          chart: 'offscreen-redis-specimen-0.1.0',
        },
      ],
    },
    ready: { ok: true, state: 'ready', detail: 'compatible-ready' },
    inventoryByPass: [
      {
        state: 'installed',
        reason: 'compatible',
        snapshot: { fetchedManifest: 'manifest', fetchedValues: {} },
      },
    ],
    randomBytes: fixedProofRandomBytes,
  });
  try {
    const receipt = await repeatEnsureGeneratedSmokeNamespace(
      'dev',
      DEV_CONTEXT,
      target,
      { ...deps, proofNonce: FIXED_PROOF_NONCE },
    );
    assert.equal(receipt.ok, true);
    assert.equal(receipt.mutated, false);
    assert.equal(
      mutations.filter(([cmd, args]) => cmd === 'helm' && args[0] === 'install')
        .length,
      0,
    );
    assert.equal(existsSync(pendingPath(stateRoot)), false);
  } finally {
    delete process.env.OFFSCREEN_REDIS_SMOKE_DISPOSABLE;
    delete process.env.OFFSCREEN_REDIS_ENSURE;
    rmSync(stateRoot, { recursive: true, force: true });
  }
});

test('lifecycle CLI smoke-failure prints JSON receipt', async () => {
  const stateRoot = mkdtempSync(
    join(tmpdir(), 'redis-install-smoke-failure-cli-'),
  );
  process.env.OFFSCREEN_REDIS_SMOKE_DISPOSABLE = 'confirmed';
  process.env.OFFSCREEN_REDIS_ENSURE = 'authorized';
  const { deps } = buildMutationDeps(stateRoot, {
    proofNamespace: PROOF_NAMESPACE,
    harness: { namespacePresent: false },
    inventoryByPass: [
      { state: 'absent', reason: 'namespace-missing', snapshot: {} },
      { state: 'absent', reason: 'empty', snapshot: {} },
    ],
    helmInstallResult: {
      ok: false,
      status: 1,
      stdout: '',
      stderr: 'fault',
      timedOut: false,
    },
    randomBytes: fixedProofRandomBytes,
  });
  const priorWrite = process.stdout.write;
  /** @type {string[]} */
  const lines = [];
  process.stdout.write = (chunk) => {
    lines.push(String(chunk));
    return true;
  };
  try {
    const code = await runRedisInstallLifecycle(
      ['smoke-failure', 'dev', DEV_CONTEXT],
      deps,
    );
    assert.equal(code, 1);
    const parsed = JSON.parse(lines.join('').trim());
    assert.equal(parsed.detail, 'smoke-failure-expected');
    assert.equal(parsed.namespace, PROOF_NAMESPACE);
  } finally {
    process.stdout.write = priorWrite;
    delete process.env.OFFSCREEN_REDIS_SMOKE_DISPOSABLE;
    delete process.env.OFFSCREEN_REDIS_ENSURE;
    rmSync(stateRoot, { recursive: true, force: true });
  }
});

test('pending directory untouched when ensure unauthorized', async () => {
  const stateRoot = mkdtempSync(join(tmpdir(), 'redis-install-lock-'));
  mkdirSync(join(stateRoot, 'platform-locks'), { recursive: true });
  const lock = join(stateRoot, 'platform-locks', `${DEV_CONTEXT}-redis.lock`);
  delete process.env.OFFSCREEN_REDIS_ENSURE;
  try {
    await ensureRedisInstall('dev', DEV_CONTEXT, { stateRoot });
    assert.equal(existsSync(lock), false);
    assert.equal(existsSync(pendingPath(stateRoot)), false);
  } finally {
    rmSync(stateRoot, { recursive: true, force: true });
  }
});
