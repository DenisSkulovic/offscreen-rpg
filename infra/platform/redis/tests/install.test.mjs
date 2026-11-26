import assert from 'node:assert/strict';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  rmSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import process from 'node:process';
import test from 'node:test';

import { readPlatformProfile } from '../../common/profile.mjs';
import { DEFAULT_WRITE_RESERVE_MS } from '../custody.mjs';
import { observeInventory, redisTargetFromProfile } from '../inventory.mjs';
import {
  ensureRedisInstall,
  planRedisInstall,
  runRedisInstallLifecycle,
} from '../install.mjs';

const devProfile = readPlatformProfile('dev');
const devTarget = redisTargetFromProfile('dev');
const DEV_CONTEXT = devProfile.contextName;
const OWNER_KEY = devTarget.ownerKey;
const OWNER_VALUE = devTarget.ownerValue;
const NAMESPACE = devTarget.namespace;

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
 * @param {Parameters<typeof observeInventory>[1]} scenario
 */
function createInventoryHarness(scenario = {}) {
  /** @type {Array<[string, string[]]>} */
  const commands = [];
  let namespaceChecks = 0;

  const deploymentLabels = {
    [OWNER_KEY]: scenario.ownerOnLive === false ? 'wrong-owner' : OWNER_VALUE,
    'app.kubernetes.io/name': 'redis',
    'app.kubernetes.io/instance': 'redis',
  };

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
    if (args.includes('namespace') && getIdx >= 0 && args[getIdx + 1] === 'namespace') {
      namespaceChecks += 1;
      if (scenario.namespaceRace && namespaceChecks === 1) {
        return fail(1, 'NotFound');
      }
      if (scenario.namespacePresent === false) {
        return fail(1, 'NotFound');
      }
      return ok(`namespace/${NAMESPACE}\n`);
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
        names.map((n) => `secret/${n}`).join('\n') +
          (names.length ? '\n' : ''),
      );
    }

    if (
      args.includes('configmap') &&
      args.includes('-o') &&
      args[args.indexOf('-o') + 1] === 'name'
    ) {
      return ok('');
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

  return { run, commands };
}

/** @param {string} stateRoot */
function pendingPath(stateRoot) {
  return join(
    stateRoot,
    'platform-locks',
    `${DEV_CONTEXT}-redis.pending`,
  );
}

/** @param {string} stateRoot @param {Record<string, unknown>} scenario */
function buildMutationDeps(stateRoot, scenario) {
  const { run } = createInventoryHarness(scenario.harness ?? {});
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
    if (command === 'kubectl' && args.includes('create')) {
      return scenario.namespaceCreateResult ?? ok();
    }
    if (command === 'kubectl' && args.includes('label')) {
      return scenario.namespaceLabelResult ?? ok();
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
        cmd === 'kubectl' && args.includes('create') && args.includes('namespace'),
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
    assert.equal(
      mutations.filter(
        ([cmd, args]) =>
          cmd === 'kubectl' && args.includes('create') && args.includes('namespace'),
      ).length,
      1,
    );
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
    inventoryByPass: [
      { state: 'absent', reason: 'empty', snapshot: {} },
    ],
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
    const code = await runRedisInstallLifecycle(
      ['plan', 'dev', DEV_CONTEXT],
      { run },
    );
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