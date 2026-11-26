import assert from 'node:assert/strict';
import { Buffer } from 'node:buffer';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import process from 'node:process';
import test from 'node:test';

import { readPlatformProfile } from '../../../platform/common/profile.mjs';
import { DEFAULT_WRITE_RESERVE_MS } from '../../../platform/redis/custody.mjs';
import { observeInventory, redisTargetFromProfile } from '../../../platform/redis/inventory.mjs';

const devProfile = readPlatformProfile('dev');
const devTarget = redisTargetFromProfile('dev');
const DEV_CONTEXT = devProfile.contextName;
const DEV_CANONICAL_NAMESPACE = devTarget.namespace;
import {
  ensureRedisInstall,
  runRedisInstallLifecycle,
  smokeRedisInstall,
} from '../../../platform/redis/install.mjs';

const releaseProfile = readPlatformProfile('release');
const releaseTarget = redisTargetFromProfile('release');
const RELEASE_CONTEXT = releaseProfile.contextName;
const CANONICAL_NAMESPACE = releaseTarget.namespace;
const FIXED_NONCE = '0123456789abcdef0123456789abcdef';
const EXPECTED_SMOKE_NAMESPACE = `offscreen-redis-proof-${FIXED_NONCE}`;

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
  /** @type {Array<[string, string[]]>} */
  const commands = [];

  const run = (command, args) => {
    commands.push([command, args]);
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
  const { run, commands } = createSmokeHarness(
    scenario.namespace ?? EXPECTED_SMOKE_NAMESPACE,
    scenario.inventoryTarget ?? releaseTarget,
    scenario.harness ?? {},
  );
  let inventoryReads = 0;
  const observeInventoryStub = (target, deps = {}) => {
    inventoryReads += 1;
    const phase = scenario.inventoryByPass?.[inventoryReads - 1];
    if (phase) {
      return phase;
    }
    return observeInventory(target, { run: deps.run ?? run });
  };

  const spawn = (command, args) => {
    commands.push([command, args]);
    if (command === 'kubectl' && args.includes('create')) {
      return scenario.namespaceCreateResult ?? ok();
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
        scenario.ready ?? { ok: true, state: 'ready', detail: 'installed-ready' },
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
  return commands.filter(([cmd, args]) => cmd === 'helm' && args[0] === 'install');
}

test('smoke lifecycle rejects extra argv including caller namespace', async () => {
  await assert.rejects(
    () =>
      runRedisInstallLifecycle([
        'smoke',
        'release',
        RELEASE_CONTEXT,
        'lab-a',
      ]),
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

    const creates = mutatingKubectl(commands).filter(([, args]) =>
      args.includes('create'),
    );
    assert.equal(creates.length, 1);
    assert.equal(creates[0][1].includes(EXPECTED_SMOKE_NAMESPACE), true);
    assert.equal(creates[0][1].includes(CANONICAL_NAMESPACE), false);
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