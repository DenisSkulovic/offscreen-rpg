import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execPath } from 'node:process';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const RELEASE_PLATFORM_ENSURE = join(
  REPO_ROOT,
  'infra/environments/release/platform.mjs',
);
import {
  runStackPreflight,
  readInfraPinFiles,
  CONTEXT_NAME,
  MIN_MEM_AVAILABLE_KIB,
} from './stack-preflight.mjs';
import { assertReleaseDownAllowlist, buildStackPlan } from './stack-lifecycle.mjs';
import { EXPECTED_IMPORT_ROOTS } from '../../infra/verification/release-acceptance/turn03/fixture-import-roots.mjs';
import { readFileSync } from 'node:fs';

const PRESERVE_NAMESPACES = ['lab-postgres', 'lab-objects', 'lab-temporal', 'lab-content-bootstrap'];

function healthyProbes(overrides = {}) {
  const pins = readInfraPinFiles();
  return {
    commandsPresent: { docker: true, kind: true, kubectl: true },
    dockerDaemonOk: true,
    currentContext: CONTEXT_NAME,
    ownedClusterExists: false,
    memAvailableKib: MIN_MEM_AVAILABLE_KIB,
    apiPort: { occupied: false, ownedByCluster: false },
    kindYamlText: pins.kindYamlText,
    libShText: pins.libShText,
    ...overrides,
  };
}

function defaultObservation(overrides = {}) {
  return {
    clusterPresent: false,
    migration: 'complete',
    importRoots: { ...EXPECTED_IMPORT_ROOTS },
    ...overrides,
  };
}

function mutateEquivalentCommands(commands) {
  return commands.filter((cmd) => {
    const joined = cmd.join(' ');
    if (cmd[0] === 'bash') return true;
    if (joined.includes('kubectl') && joined.includes('delete')) return true;
    return false;
  });
}

function assertNoForbiddenDownPattern(commands) {
  const flat = commands.map((c) => c.join(' ')).join('\n');
  for (const ns of PRESERVE_NAMESPACES) {
    assert.ok(!flat.includes(ns), `down must not target preserve namespace ${ns}`);
  }
  assert.ok(!/pvc/i.test(flat), 'down must not delete pvc');
  assert.ok(!/\bkind\s+delete\b/i.test(flat), 'down must not kind delete');
  assert.ok(!/docker\s+volume/i.test(flat), 'down must not touch docker volume');
  assert.ok(!/port-forward/i.test(flat), 'plan must not port-forward');
}

test('foreign context probes refuse up/down/reset with empty commands', () => {
  const probes = healthyProbes({ currentContext: 'minikube' });
  assert.equal(runStackPreflight(probes).ok, false);
  const observation = defaultObservation();
  for (const command of /** @type {const} */ (['up', 'down', 'reset'])) {
    const plan = buildStackPlan({
      command,
      probes,
      observation,
      confirmation: command === 'reset' ? 'kind-offscreen-release' : undefined,
    });
    assert.equal(plan.ok, false);
    assert.deepEqual(plan.commands, []);
    assert.equal(mutateEquivalentCommands(plan.commands).length, 0);
    assert.deepEqual(plan.urls, []);
  }
});

test('up cold path: cluster absent => up.sh, platform ensure, install.sh', () => {
  const plan = buildStackPlan({
    command: 'up',
    probes: healthyProbes({ currentContext: null }),
    observation: defaultObservation({ clusterPresent: false }),
  });
  assert.equal(plan.ok, true);
  assert.deepEqual(plan.commands, [
    ['bash', 'infra/clusters/kind/release/up.sh'],
    [execPath, RELEASE_PLATFORM_ENSURE, 'ensure', 'kind-offscreen-release'],
    ['bash', 'infra/environments/release/install.sh'],
  ]);
  assert.deepEqual(plan.urls, []);
});

test('up warm path: cluster present => platform ensure then install.sh', () => {
  const plan = buildStackPlan({
    command: 'up',
    probes: healthyProbes({ ownedClusterExists: true }),
    observation: defaultObservation({ clusterPresent: true }),
  });
  assert.equal(plan.ok, true);
  assert.deepEqual(plan.commands, [
    [execPath, RELEASE_PLATFORM_ENSURE, 'ensure', 'kind-offscreen-release'],
    ['bash', 'infra/environments/release/install.sh'],
  ]);
  const flat = plan.commands.flat().join(' ');
  assert.ok(!flat.includes('down.sh'), 'warm up must not include down.sh');
  assert.ok(!/docker\s+volume/i.test(flat), 'warm up must not touch volumes');
});

test('up warm migration unreadable => empty commands', () => {
  const plan = buildStackPlan({
    command: 'up',
    probes: healthyProbes({ ownedClusterExists: true }),
    observation: defaultObservation({
      clusterPresent: true,
      migration: 'unreadable',
    }),
  });
  assert.equal(plan.ok, false);
  assert.deepEqual(plan.commands, []);
  assert.ok(plan.messages.some((m) => /unreadable/i.test(m)));
});

test('up migration failed => exitCode 1 and empty commands', () => {
  const plan = buildStackPlan({
    command: 'up',
    probes: healthyProbes({ currentContext: null }),
    observation: defaultObservation({ migration: 'failed' }),
  });
  assert.equal(plan.ok, false);
  assert.equal(plan.exitCode, 1);
  assert.deepEqual(plan.commands, []);
  assert.ok(plan.messages.some((m) => /migration/i.test(m)));
});

test('up wrong import world hash => exitCode 1 and empty commands', () => {
  const plan = buildStackPlan({
    command: 'up',
    probes: healthyProbes({ ownedClusterExists: true }),
    observation: defaultObservation({
      clusterPresent: true,
      importRoots: { ...EXPECTED_IMPORT_ROOTS, world: '0'.repeat(64) },
    }),
  });
  assert.equal(plan.ok, false);
  assert.equal(plan.exitCode, 1);
  assert.deepEqual(plan.commands, []);
  assert.ok(plan.messages.some((m) => m.includes('wrong-root-world')));
});

test('down deletes allowlist only; preserves cluster data namespaces', () => {
  const plan = buildStackPlan({
    command: 'down',
    probes: healthyProbes(),
    observation: defaultObservation({ clusterPresent: true }),
  });
  assert.equal(plan.ok, true);
  assert.equal(plan.exitCode, 0);
  assert.ok(plan.commands.length > 0);
  assert.ok(plan.commands.every((c) => c[0] === 'kubectl' && c.includes('delete')));
  assertNoForbiddenDownPattern(plan.commands);
});

test('reset without confirmation => empty commands and refusal', () => {
  const plan = buildStackPlan({
    command: 'reset',
    probes: healthyProbes({ currentContext: null }),
    observation: defaultObservation(),
  });
  assert.equal(plan.ok, false);
  assert.equal(plan.exitCode, 1);
  assert.deepEqual(plan.commands, []);
  assert.ok(plan.messages.some((m) => /confirmation/i.test(m) && m.includes('kind-offscreen-release')));
});

test('reset with exact confirmation => destroy.sh with confirmation arg', () => {
  const plan = buildStackPlan({
    command: 'reset',
    probes: healthyProbes({ currentContext: null }),
    confirmation: 'kind-offscreen-release',
    observation: defaultObservation(),
  });
  assert.equal(plan.ok, true);
  assert.deepEqual(plan.commands, [
    ['bash', 'infra/clusters/kind/release/destroy.sh', 'kind-offscreen-release'],
  ]);
  assert.deepEqual(plan.urls, []);
});

test('down and reset plans do not mutate cluster or platform backing', () => {
  const down = buildStackPlan({
    command: 'down',
    probes: healthyProbes(),
    observation: defaultObservation({ clusterPresent: true }),
  });
  const reset = buildStackPlan({
    command: 'reset',
    probes: healthyProbes({ currentContext: null }),
    confirmation: 'kind-offscreen-release',
    observation: defaultObservation(),
  });
  const flat = [...down.commands, ...reset.commands]
    .map((cmd) => cmd.join(' '))
    .join('\n');
  assert.ok(!flat.includes('platform.mjs'), 'down/reset must not run platform ensure');
  assert.ok(!flat.includes('install.sh'), 'down/reset must not install app release');
});

test('reset with cluster name missing kind- prefix => empty commands', () => {
  const plan = buildStackPlan({
    command: 'reset',
    probes: healthyProbes({ currentContext: null }),
    confirmation: 'offscreen-release',
    observation: defaultObservation(),
  });
  assert.equal(plan.ok, false);
  assert.deepEqual(plan.commands, []);
});

test('owned downAllowlist matches eleven release workloads and fixture import roots stay canonical', () => {
  const ownedPath = join(REPO_ROOT, 'infra/environments/release/owned-app-resources.json');
  const owned = JSON.parse(readFileSync(ownedPath, 'utf8'));
  assertReleaseDownAllowlist(owned.downAllowlist);
  assert.deepEqual(owned.preserveNamespaces, PRESERVE_NAMESPACES);
  assert.equal(owned.downAllowlist.length, 11);
  assert.ok(owned.downAllowlist.some((e) => e.kind === 'Job' && e.name === 'game-migrate'));
  assert.ok(owned.downAllowlist.some((e) => e.kind === 'HTTPRoute' && e.name === 'game-edge-routes'));
  assert.ok(!('clusterName' in owned));
  assert.ok(!('contextName' in owned));
  assert.ok(!('resetConfirmation' in owned));
  assert.ok(!('expectedImportRoots' in owned));
});

test('assertReleaseDownAllowlist refuses extra resources and forbidden kinds', () => {
  const ownedPath = join(REPO_ROOT, 'infra/environments/release/owned-app-resources.json');
  const owned = JSON.parse(readFileSync(ownedPath, 'utf8'));
  const extra = [...owned.downAllowlist, { namespace: 'lab-edge', kind: 'Secret', name: 'leak' }];
  assert.throws(() => assertReleaseDownAllowlist(extra), /exactly 11 entries/);
  assert.throws(() => assertReleaseDownAllowlist(null), /must be an array/);
  const forbiddenKind = owned.downAllowlist.map((entry, index) =>
    index === 0 ? { ...entry, kind: 'Namespace' } : entry,
  );
  assert.throws(() => assertReleaseDownAllowlist(forbiddenKind), /forbids kind/);
});