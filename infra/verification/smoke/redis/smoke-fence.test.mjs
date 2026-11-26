import assert from 'node:assert/strict';
import { Buffer } from 'node:buffer';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import process from 'node:process';
import test from 'node:test';

import {
  DEV_BASELINE_NAMESPACE,
  DEV_CLUSTER_OWNER,
} from '../../../clusters/kind/manager/dev-bootstrap.mjs';
import {
  kindKubeconfigClusterName,
  RELEASE_BASELINE_NAMESPACE,
} from '../../../platform/common/commands.mjs';
import { readPlatformProfile } from '../../../platform/common/profile.mjs';
import { DEFAULT_WRITE_RESERVE_MS } from '../../../platform/redis/custody.mjs';
import {
  observeInventory,
  redisTargetFromProfile,
} from '../../../platform/redis/inventory.mjs';

const devProfile = readPlatformProfile('dev');
const devTarget = redisTargetFromProfile('dev');
const DEV_CONTEXT = devProfile.contextName;
const DEV_CANONICAL_NAMESPACE = devTarget.namespace;
import {
  ensureRedisInstall,
  runRedisInstallLifecycle,
  smokeRedisInstall,
} from '../../../platform/redis/install.mjs';
import {
  RESTART_MARKER_KEY,
  TTL_KEY,
  refuseFlushallUnlessProofNamespace,
} from '../../../platform/redis/smoke-proof.mjs';
import { buildHappyProofRunner } from '../../../platform/redis/tests/smoke-proof.test.mjs';

const releaseProfile = readPlatformProfile('release');
const releaseTarget = redisTargetFromProfile('release');
const RELEASE_CONTEXT = releaseProfile.contextName;
const CANONICAL_NAMESPACE = releaseTarget.namespace;
const FIXED_NONCE = '0123456789abcdef0123456789abcdef';
const EXPECTED_SMOKE_NAMESPACE = `offscreen-redis-proof-${FIXED_NONCE}`;
const PROOF_NAMESPACE_UID = 'namespace-uid';

/**
 * @param {'dev' | 'release'} profileId
 * @param {string} command
 * @param {string[]} args
 */
function stubPlatformTarget(profileId, command, args) {
  const profile = readPlatformProfile(profileId);
  if (command === 'kind' && args[0] === 'get' && args[1] === 'clusters') {
    return ok(`${profile.clusterName}\n`);
  }
  if (
    command === 'kubectl' &&
    args.includes('config') &&
    args.includes('view')
  ) {
    const clusterName = kindKubeconfigClusterName(profile.clusterName);
    const port = profileId === 'release' ? 6443 : 24443;
    return ok(
      JSON.stringify({
        clusters: [
          {
            name: clusterName,
            cluster: { server: `https://127.0.0.1:${port}` },
          },
        ],
        contexts: [
          {
            name: profile.contextName,
            context: { cluster: clusterName, namespace: 'default' },
          },
        ],
        'current-context': profile.contextName,
      }),
    );
  }
  const getIdx = args.indexOf('get');
  const name = getIdx >= 0 ? args[getIdx + 2] : '';
  if (
    command === 'kubectl' &&
    getIdx >= 0 &&
    args[getIdx + 1] === 'namespace' &&
    args.includes('json')
  ) {
    if (name === DEV_BASELINE_NAMESPACE) {
      return ok(
        JSON.stringify({
          metadata: {
            name: DEV_BASELINE_NAMESPACE,
            uid: 'dev-baseline-uid',
            labels: { [`${profile.ownerLabel}/owner`]: DEV_CLUSTER_OWNER },
          },
        }),
      );
    }
    if (name === RELEASE_BASELINE_NAMESPACE) {
      return ok(
        JSON.stringify({
          metadata: {
            name: RELEASE_BASELINE_NAMESPACE,
            uid: 'release-baseline-uid',
            labels: { [`${profile.ownerLabel}/lab`]: profile.ownerValue },
          },
        }),
      );
    }
  }
  return null;
}

function fixedRandomBytes() {
  return Buffer.from(FIXED_NONCE, 'hex');
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
 * @param {string} namespace
 * @param {ReturnType<typeof redisTargetFromProfile>} target
 * @param {Record<string, unknown>} [scenario]
 */
function createSmokeHarness(namespace, target, scenario = {}) {
  const ownerKey = target.ownerKey;
  const ownerValue = target.ownerValue;
  const profileId =
    target.contextName === devProfile.contextName ? 'dev' : 'release';
  /** @type {Array<[string, string[]]>} */
  const commands = [];

  const run = (command, args) => {
    commands.push([command, args]);
    const stub = stubPlatformTarget(profileId, command, args);
    if (stub) {
      return stub;
    }
    if (command === 'helm') {
      const verb = args[0];
      if (verb === 'version' && args[1] === '--short') {
        return ok('v3.22.1\n');
      }
      if (verb === 'lint' || verb === 'template') {
        return ok(scenario.helmTemplate ?? 'ok');
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
      if (args.includes(namespace)) {
        return scenario.namespacePresent === false
          ? fail(1, 'NotFound')
          : ok(`namespace/${namespace}\n`);
      }
      if (args.includes(CANONICAL_NAMESPACE)) {
        return scenario.canonicalNamespacePresent === false
          ? fail(1, 'NotFound')
          : ok(`namespace/${CANONICAL_NAMESPACE}\n`);
      }
      return fail(1, 'NotFound');
    }

    if (
      args.includes('secret') &&
      args.includes('-o') &&
      args[args.indexOf('-o') + 1] === 'name'
    ) {
      const names = scenario.secrets ?? [];
      return ok(
        names.map((n) => `secret/${n}`).join('\n') + (names.length ? '\n' : ''),
      );
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

    if (args.includes('jsonpath={.metadata.labels}')) {
      return ok(
        JSON.stringify({
          [ownerKey]: ownerValue,
          'app.kubernetes.io/name': 'redis',
          'app.kubernetes.io/instance': 'redis',
        }),
      );
    }

    if (args.includes('jsonpath={.spec.selector.matchLabels}')) {
      return ok(
        JSON.stringify({
          'app.kubernetes.io/name': 'redis',
          'app.kubernetes.io/instance': 'redis',
        }),
      );
    }

    if (args.includes('jsonpath={.spec.selector}')) {
      return ok(
        JSON.stringify({
          'app.kubernetes.io/name': 'redis',
          'app.kubernetes.io/instance': 'redis',
        }),
      );
    }

    if (args.includes('endpoints')) {
      return scenario.endpointsPresent ? ok('[{}]') : ok('');
    }

    return fail(1, 'unexpected kubectl');
  };

  return { run, commands };
}

/** @param {string} stateRoot @param {Record<string, unknown>} scenario */
function buildSmokeDeps(stateRoot, scenario) {
  const namespace = scenario.namespace ?? EXPECTED_SMOKE_NAMESPACE;
  const inventoryTarget = scenario.inventoryTarget ?? releaseTarget;
  const { run: installRun, commands } = createSmokeHarness(
    namespace,
    inventoryTarget,
    scenario.harness ?? {},
  );
  const proofTarget = { ...inventoryTarget, namespace };
  const proof = buildHappyProofRunner(proofTarget);

  const run = (command, args) => {
    const stub = stubPlatformTarget('release', command, args);
    if (stub) {
      return stub;
    }
    const proofAttempt = proof.run(command, args);
    const stderr = proofAttempt.stderr ?? '';
    if (
      !stderr.startsWith('unexpected kubectl') &&
      !stderr.startsWith('unexpected command') &&
      !stderr.startsWith('unexpected redis-cli')
    ) {
      return proofAttempt;
    }
    return installRun(command, args);
  };

  let inventoryReads = 0;
  const observeInventoryStub = (target, deps = {}) => {
    inventoryReads += 1;
    const phase = scenario.inventoryByPass?.[inventoryReads - 1];
    if (phase) {
      return phase;
    }
    if (target.namespace === namespace) {
      return proof.inventory;
    }
    return observeInventory(target, { run: deps.run ?? run });
  };

  const spawn = (command, args, options) => {
    commands.push([command, args]);
    if (
      command === 'kubectl' &&
      args.includes('create') &&
      args.includes('-f') &&
      !args.includes('-n')
    ) {
      return (
        scenario.namespaceCreateResult ??
        ok(
          JSON.stringify({
            metadata: {
              uid: PROOF_NAMESPACE_UID,
              resourceVersion: '9001',
              name: namespace,
            },
          }),
        )
      );
    }
    if (
      command === 'kubectl' &&
      args.includes('create') &&
      args.includes('-f')
    ) {
      return proof.runWrite(command, args, options);
    }
    if (command === 'kubectl' && args.includes('label')) {
      return scenario.namespaceLabelResult ?? ok();
    }
    if (command === 'helm' && args[0] === 'install') {
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
      (args.includes('scale') ||
        args.includes('exec') ||
        (args.includes('delete') && args.includes('--raw')))
    ) {
      return proof.runWrite(command, args, options);
    }
    return fail(1, `unexpected mutation ${command}`);
  };

  return {
    deps: {
      stateRoot,
      run,
      spawn,
      randomBytes: fixedRandomBytes,
      observeInventory: observeInventoryStub,
      observeRedisReady: () =>
        scenario.ready ?? {
          ok: true,
          state: 'ready',
          detail: 'installed-ready',
        },
      budgetMs: scenario.budgetMs ?? 600_000,
      writeReserveMs: scenario.writeReserveMs ?? DEFAULT_WRITE_RESERVE_MS,
    },
    commands,
  };
}

function mutatingKubectl(commands) {
  return commands.filter(
    ([cmd, args]) =>
      cmd === 'kubectl' &&
      ['create', 'delete', 'apply', 'patch', 'replace', 'scale'].some((verb) =>
        args.includes(verb),
      ),
  );
}

function helmInstalls(commands) {
  return commands.filter(
    ([cmd, args]) => cmd === 'helm' && args[0] === 'install',
  );
}

test('smoke lifecycle rejects extra argv including caller namespace', async () => {
  await assert.rejects(
    () =>
      runRedisInstallLifecycle(['smoke', 'release', RELEASE_CONTEXT, 'lab-a']),
    /invalid redis install invocation/,
  );
});

test('unauthorized smoke performs zero helm install and zero kubectl create', async () => {
  const stateRoot = mkdtempSync(join(tmpdir(), 'redis-smoke-unauth-'));
  const priorDisposable = process.env.OFFSCREEN_REDIS_SMOKE_DISPOSABLE;
  const priorEnsure = process.env.OFFSCREEN_REDIS_ENSURE;
  delete process.env.OFFSCREEN_REDIS_SMOKE_DISPOSABLE;
  delete process.env.OFFSCREEN_REDIS_ENSURE;
  const { deps, commands } = buildSmokeDeps(stateRoot, {});
  try {
    const receipt = await smokeRedisInstall('release', RELEASE_CONTEXT, deps);
    assert.equal(receipt.ok, false);
    assert.equal(receipt.mutated, false);
    assert.equal(receipt.detail, 'smoke-not-disposable');
    assert.equal(helmInstalls(commands).length, 0);
    assert.equal(mutatingKubectl(commands).length, 0);
    assert.equal(receipt.namespace, undefined);
  } finally {
    if (priorDisposable === undefined) {
      delete process.env.OFFSCREEN_REDIS_SMOKE_DISPOSABLE;
    } else {
      process.env.OFFSCREEN_REDIS_SMOKE_DISPOSABLE = priorDisposable;
    }
    if (priorEnsure === undefined) {
      delete process.env.OFFSCREEN_REDIS_ENSURE;
    } else {
      process.env.OFFSCREEN_REDIS_ENSURE = priorEnsure;
    }
    rmSync(stateRoot, { recursive: true, force: true });
  }
});

test('authorized smoke uses generated namespace on helm install', async () => {
  const stateRoot = mkdtempSync(join(tmpdir(), 'redis-smoke-install-'));
  const priorDisposable = process.env.OFFSCREEN_REDIS_SMOKE_DISPOSABLE;
  const priorEnsure = process.env.OFFSCREEN_REDIS_ENSURE;
  process.env.OFFSCREEN_REDIS_SMOKE_DISPOSABLE = 'confirmed';
  process.env.OFFSCREEN_REDIS_ENSURE = 'authorized';
  const { deps, commands } = buildSmokeDeps(stateRoot, {
    harness: { namespacePresent: false, secrets: [], helmList: [] },
    inventoryByPass: [
      { state: 'absent', reason: 'namespace-missing', snapshot: {} },
      { state: 'absent', reason: 'empty', snapshot: {} },
      { state: 'installed', reason: 'compatible', snapshot: {} },
    ],
    ready: { ok: true, state: 'ready', detail: 'installed-ready' },
  });
  try {
    const receipt = await smokeRedisInstall('release', RELEASE_CONTEXT, deps);
    assert.equal(receipt.ok, true);
    assert.equal(receipt.namespace, EXPECTED_SMOKE_NAMESPACE);
    assert.match(receipt.namespace, /^offscreen-redis-proof-[0-9a-f]{32}$/);
    assert.notEqual(receipt.namespace, CANONICAL_NAMESPACE);

    const installs = helmInstalls(commands);
    assert.equal(installs.length, 1);
    const helmArgs = installs[0][1];
    const nsIdx = helmArgs.indexOf('--namespace');
    assert.equal(helmArgs[nsIdx + 1], EXPECTED_SMOKE_NAMESPACE);
    assert.ok(!helmArgs.includes(CANONICAL_NAMESPACE));
    assert.ok(!helmArgs.includes('offscreen-dev-redis'));

    const namespaceCreates = mutatingKubectl(commands).filter(
      ([, args]) =>
        args.includes('create') && args.includes('-f') && !args.includes('-n'),
    );
    assert.equal(namespaceCreates.length, 1);
    assert.equal(namespaceCreates[0][1].includes(CANONICAL_NAMESPACE), false);

    assert.ok(
      commands.some(
        ([, args]) => args.includes('scale') && args.includes('--replicas=0'),
      ),
    );
    assert.ok(
      commands.some(
        ([, args]) => args.includes('delete') && args.includes('--raw'),
      ),
    );
  } finally {
    if (priorDisposable === undefined) {
      delete process.env.OFFSCREEN_REDIS_SMOKE_DISPOSABLE;
    } else {
      process.env.OFFSCREEN_REDIS_SMOKE_DISPOSABLE = priorDisposable;
    }
    if (priorEnsure === undefined) {
      delete process.env.OFFSCREEN_REDIS_ENSURE;
    } else {
      process.env.OFFSCREEN_REDIS_ENSURE = priorEnsure;
    }
    rmSync(stateRoot, { recursive: true, force: true });
  }
});

test('FLUSHALL refused for lab-a and offscreen-dev-redis namespaces', () => {
  for (const namespace of ['lab-a', 'offscreen-dev-redis']) {
    const refusal = refuseFlushallUnlessProofNamespace(namespace);
    assert.equal(refusal.ok, false);
    assert.equal(refusal.reason, 'flushall-canonical-refused');
  }
});

test('canonical ensure never dispatches smoke proof mutations', async () => {
  const stateRoot = mkdtempSync(join(tmpdir(), 'redis-smoke-ensure-proof-'));
  process.env.OFFSCREEN_REDIS_ENSURE = 'authorized';
  const { run, commands } = createSmokeHarness(
    DEV_CANONICAL_NAMESPACE,
    devTarget,
    {
      namespacePresent: true,
      deployment: true,
    },
  );
  const spawn = (command, args) => {
    commands.push([command, args]);
    return fail(1, 'unexpected');
  };
  try {
    const receipt = await ensureRedisInstall('dev', DEV_CONTEXT, {
      stateRoot,
      run,
      spawn,
    });
    assert.equal(receipt.ok, false);
    const allArgs = commands.flatMap(([, args]) => args).join(' ');
    assert.doesNotMatch(allArgs, /FLUSHALL/);
    assert.doesNotMatch(allArgs, new RegExp(TTL_KEY));
    assert.doesNotMatch(allArgs, new RegExp(RESTART_MARKER_KEY));
    assert.doesNotMatch(allArgs, /--replicas=0/);
  } finally {
    delete process.env.OFFSCREEN_REDIS_ENSURE;
    rmSync(stateRoot, { recursive: true, force: true });
  }
});

test('canonical ensure still refuses occupied canonical namespace with zero mutations', async () => {
  const stateRoot = mkdtempSync(join(tmpdir(), 'redis-smoke-ensure-legacy-'));
  process.env.OFFSCREEN_REDIS_ENSURE = 'authorized';
  const { run, commands } = createSmokeHarness(
    DEV_CANONICAL_NAMESPACE,
    devTarget,
    {
      namespacePresent: true,
      deployment: true,
      deploymentSelectors: { app: 'redis' },
      serviceSelectors: { app: 'redis' },
    },
  );
  /** @type {Array<[string, string[]]>} */
  const mutations = [];
  const spawn = (command, args) => {
    mutations.push([command, args]);
    return fail(1, 'unexpected');
  };
  try {
    const receipt = await ensureRedisInstall('dev', DEV_CONTEXT, {
      stateRoot,
      run,
      spawn,
    });
    assert.equal(receipt.ok, false);
    assert.equal(receipt.mutated, false);
    assert.notEqual(receipt.state, 'absent');
    assert.equal(helmInstalls(mutations).length, 0);
    assert.equal(mutatingKubectl(mutations).length, 0);
    assert.equal(receipt.namespace, undefined);
    assert.equal(
      helmInstalls(commands).length + mutatingKubectl(commands).length,
      0,
    );
    assert.notEqual(DEV_CANONICAL_NAMESPACE, EXPECTED_SMOKE_NAMESPACE);
  } finally {
    delete process.env.OFFSCREEN_REDIS_ENSURE;
    rmSync(stateRoot, { recursive: true, force: true });
  }
});
