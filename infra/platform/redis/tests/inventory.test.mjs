import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import test from 'node:test';
import { runPlatformCommand } from '../../common/commands.mjs';
import { readPlatformProfile } from '../../common/profile.mjs';
import { observeInventory, redisTargetFromProfile } from '../inventory.mjs';
import { renderRedisChart } from '../config.mjs';

const devProfile = readPlatformProfile('dev');
const devTarget = redisTargetFromProfile('dev');
const OWNER_KEY = devTarget.ownerKey;
const OWNER_VALUE = devTarget.ownerValue;
const NAMESPACE = devTarget.namespace;

const MUTATING_HELM = new Set([
  'install',
  'upgrade',
  'uninstall',
  'delete',
  'rollback',
]);
const MUTATING_KUBECTL = new Set([
  'apply',
  'delete',
  'create',
  'patch',
  'replace',
  'edit',
]);

function assertReadOnlyCommands(commands) {
  for (const [command, args] of commands) {
    if (command === 'helm') {
      assert.ok(
        !MUTATING_HELM.has(args[0]),
        `unexpected helm mutation: ${args[0]}`,
      );
    }
    if (command === 'kubectl') {
      assert.equal(args.includes('get') || args[0] === 'get', true);
      for (const arg of args) {
        assert.ok(
          !MUTATING_KUBECTL.has(arg),
          `unexpected kubectl mutation: ${arg}`,
        );
      }
    }
  }
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

function fail(code = 1, stderr = 'failed') {
  return {
    ok: false,
    status: code,
    stdout: '',
    stderr,
    timedOut: false,
    missing: false,
  };
}

/**
 * @param {{
 *   namespacePresent?: boolean,
 *   namespaceRace?: boolean,
 *   secrets?: string[],
 *   secretLabels?: Record<string, Record<string, string>>,
 *   labelSecrets?: string[],
 *   configmaps?: string[],
 *   labelConfigmaps?: string[],
 *   helmList?: object[],
 *   deployment?: boolean,
 *   service?: boolean,
 *   configMap?: boolean,
 *   deploymentSelectors?: Record<string, string>,
 *   serviceSelectors?: Record<string, string>,
 *   ownerOnLive?: boolean,
 *   endpointsPresent?: boolean,
 *   helmManifest?: string,
 *   helmValues?: Record<string, unknown>,
 *   helmHistory?: object[],
 *   helmTemplate?: string,
 *   listStderr?: string,
 *   listFail?: boolean,
 *   malformedHelmList?: string,
 *   truncation?: boolean,
 * }} scenario
 */
function createHarness(scenario = {}) {
  /** @type {Array<[string, string[]]>} */
  const commands = [];
  let namespaceChecks = 0;

  const deploymentLabels = {
    [OWNER_KEY]: scenario.ownerOnLive === false ? 'wrong-owner' : OWNER_VALUE,
    'app.kubernetes.io/name': 'redis',
    'app.kubernetes.io/instance': 'redis',
  };
  const configMapLabels = { ...deploymentLabels };

  const deploymentSelectors = scenario.deploymentSelectors ?? {
    'app.kubernetes.io/name': 'redis',
    'app.kubernetes.io/instance': 'redis',
  };
  const serviceSelectors = scenario.serviceSelectors ?? {
    'app.kubernetes.io/name': 'redis',
    'app.kubernetes.io/instance': 'redis',
  };

  /**
   * @param {string} command
   * @param {string[]} args
   */
  const run = (command, args) => {
    commands.push([command, args]);

    if (command === 'helm') {
      const verb = args[0];
      if (verb === 'version' && args[1] === '--short') {
        return ok('v3.22.1\n');
      }
      if (verb === 'lint') {
        return ok('');
      }
      if (verb === 'template') {
        return ok(scenario.helmTemplate ?? '');
      }
      if (verb === 'list') {
        if (scenario.malformedHelmList != null) {
          return ok(scenario.malformedHelmList);
        }
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
      return fail(1, 'unexpected helm command');
    }

    if (command !== 'kubectl') {
      return fail(1, 'unexpected command');
    }

    if (args.includes('namespace') && args.includes('get')) {
      namespaceChecks += 1;
      if (scenario.namespaceRace && namespaceChecks === 1) {
        return fail(1, 'NotFound');
      }
      if (scenario.namespacePresent === false) {
        return fail(1, 'NotFound');
      }
      return ok(`namespace/${NAMESPACE}\n`);
    }

    const getIdx = args.indexOf('get');
    const namespacedGet = getIdx >= 0 ? args[getIdx + 2] : undefined;
    const isCollectionGet =
      namespacedGet === '-o' ||
      namespacedGet === '-l' ||
      namespacedGet === '--request-timeout=10s';

    if (
      args.includes('secret') &&
      args.includes('-o') &&
      args[args.indexOf('-o') + 1] === 'name' &&
      isCollectionGet
    ) {
      if (scenario.listFail) {
        return fail(1, scenario.listStderr ?? 'Forbidden');
      }
      const labelIdx = args.indexOf('-l');
      const names =
        labelIdx >= 0
          ? (scenario.labelSecrets ?? [])
          : (scenario.secrets ?? []);
      if (scenario.truncation === true) {
        return ok(
          `${names.map((n) => `secret/${n}`).join('\n')}\nInvalidKind/foo`,
        );
      }
      return ok(
        names.map((n) => `secret/${n}`).join('\n') + (names.length ? '\n' : ''),
      );
    }

    if (
      args.includes('configmap') &&
      args.includes('-o') &&
      args[args.indexOf('-o') + 1] === 'name' &&
      isCollectionGet
    ) {
      const labelIdx = args.indexOf('-l');
      const names =
        labelIdx >= 0
          ? (scenario.labelConfigmaps ?? [])
          : (scenario.configmaps ?? []);
      return ok(
        names.map((n) => `configmap/${n}`).join('\n') +
          (names.length ? '\n' : ''),
      );
    }

    if (args.includes('jsonpath={.metadata.labels}')) {
      const name = args[args.indexOf('get') + 2];
      if (args.includes('secret')) {
        const labels = scenario.secretLabels?.[name] ?? {
          owner: 'helm',
          name: 'redis',
          status: 'deployed',
        };
        return ok(JSON.stringify(labels));
      }
      if (args.includes('configmap') && name === 'redis-config') {
        return ok(JSON.stringify(configMapLabels));
      }
      return ok(JSON.stringify(deploymentLabels));
    }

    if (args.includes('jsonpath={.spec.selector.matchLabels}')) {
      return ok(JSON.stringify(deploymentSelectors));
    }

    if (args.includes('jsonpath={.spec.selector}')) {
      return ok(JSON.stringify(serviceSelectors));
    }

    if (args.includes('endpoints') && args.includes('jsonpath={.subsets}')) {
      if (scenario.endpointsPresent) {
        return ok('[{"addresses":[{"ip":"10.0.0.1"}]}]');
      }
      return ok('');
    }

    const resource = args[getIdx + 1];
    const name = args[getIdx + 2];
    const output = args[args.indexOf('-o') + 1];
    const present =
      (resource === 'deployment' && scenario.deployment === true) ||
      (resource === 'service' && scenario.service === true) ||
      (resource === 'configmap' && scenario.configMap === true);

    if (output === 'name') {
      return present ? ok(`${resource}/${name}\n`) : ok('');
    }
    return fail(1, 'unexpected kubectl');
  };

  return { run, commands };
}

const helmProbe = spawnSync('helm', ['version', '--short'], {
  encoding: 'utf8',
});
const helmPinned =
  !helmProbe.error && (helmProbe.stdout ?? '').trim().startsWith('v3.22.1');

/** @type {{ manifest: string, values: Record<string, unknown> } | null} */
let installedFixture = null;
if (helmPinned) {
  let templateStdout = '';
  const recordingRun = (command, args, options) => {
    const result = runPlatformCommand(command, args, options);
    if (command === 'helm' && args[0] === 'template') {
      templateStdout = result.stdout;
    }
    return result;
  };
  const rendered = renderRedisChart('dev', { run: recordingRun });
  installedFixture = {
    manifest: templateStdout,
    values: rendered.values,
  };
}

test('redisTargetFromProfile maps dev owner labels', () => {
  const target = redisTargetFromProfile('dev');
  assert.equal(target.release, 'redis');
  assert.equal(target.ownerKey, 'offscreen.dev/owner');
  assert.equal(target.ownerValue, devProfile.ownerValue);
  assert.equal(target.namespace, devProfile.namespaces.redis);
});

test('unsupported configmap driver residue', () => {
  const { run, commands } = createHarness({
    namespacePresent: true,
    labelConfigmaps: ['sh.helm.release.v1.redis.v1'],
    helmList: [],
  });
  const result = observeInventory(devTarget, { run });
  assert.equal(result.state, 'partial');
  assert.equal(result.reason, 'unsupported-driver');
  assertReadOnlyCommands(commands);
});

test('key-label mismatch on helm release secret', () => {
  const { run, commands } = createHarness({
    namespacePresent: true,
    secrets: ['sh.helm.release.v1.redis.v1'],
    secretLabels: {
      'sh.helm.release.v1.redis.v1': { owner: 'helm', name: 'not-redis' },
    },
    helmList: [
      {
        name: 'redis',
        namespace: NAMESPACE,
        revision: '1',
        status: 'deployed',
        chart: 'offscreen-redis-specimen-0.1.0',
      },
    ],
  });
  const result = observeInventory(devTarget, { run });
  assert.equal(result.state, 'partial');
  assert.equal(result.reason, 'key-label-mismatch');
  assertReadOnlyCommands(commands);
});

test('malformed helm list json is unreadable', () => {
  const { run, commands } = createHarness({
    namespacePresent: true,
    malformedHelmList: '{not-json',
  });
  const result = observeInventory(devTarget, { run });
  assert.equal(result.state, 'unreadable');
  assert.equal(result.reason, 'helm-list-json');
  assertReadOnlyCommands(commands);
});

test('unexpected helm revision', () => {
  const { run, commands } = createHarness({
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
  });
  const result = observeInventory(devTarget, { run });
  assert.equal(result.state, 'partial');
  assert.equal(result.reason, 'unexpected-revision');
  assertReadOnlyCommands(commands);
});

test('kubectl list truncation line is unreadable', () => {
  const { run, commands } = createHarness({
    namespacePresent: true,
    secrets: ['sh.helm.release.v1.redis.v1'],
    truncation: true,
  });
  const result = observeInventory(devTarget, { run });
  assert.equal(result.state, 'unreadable');
  assert.equal(result.reason, 'malformed-list-line');
  assertReadOnlyCommands(commands);
});

test('kubectl list permission failure is unreadable', () => {
  const { run, commands } = createHarness({
    namespacePresent: true,
    listFail: true,
    listStderr: 'Forbidden',
  });
  const result = observeInventory(devTarget, { run });
  assert.equal(result.state, 'unreadable');
  assert.equal(result.reason, 'kubectl-list-secret-stderr');
  assertReadOnlyCommands(commands);
});

test('missing namespace is absent namespace-missing', () => {
  const { run, commands } = createHarness({ namespacePresent: false });
  const result = observeInventory(devTarget, { run });
  assert.equal(result.state, 'absent');
  assert.equal(result.reason, 'namespace-missing');
  assertReadOnlyCommands(commands);
});

test('existing empty namespace is absent empty', () => {
  const { run, commands } = createHarness({
    namespacePresent: true,
    secrets: [],
    configmaps: [],
    helmList: [],
  });
  const result = observeInventory(devTarget, { run });
  assert.equal(result.state, 'absent');
  assert.equal(result.reason, 'empty');
  assertReadOnlyCommands(commands);
});

test('matching orphan when storage and live disagree', () => {
  const { run, commands } = createHarness({
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
  });
  const result = observeInventory(devTarget, { run });
  assert.equal(result.state, 'partial');
  assert.equal(result.reason, 'matching-orphan');
  assertReadOnlyCommands(commands);
});

test('hidden helm record when list is empty but secret exists', () => {
  const { run, commands } = createHarness({
    namespacePresent: true,
    secrets: ['sh.helm.release.v1.redis.v1'],
    helmList: [],
  });
  const result = observeInventory(devTarget, { run });
  assert.equal(result.state, 'partial');
  assert.equal(result.reason, 'hidden-record');
  assertReadOnlyCommands(commands);
});

test('malformed helm release suffix', () => {
  const { run, commands } = createHarness({
    namespacePresent: true,
    secrets: ['sh.helm.release.v1.redis.v2'],
    helmList: [],
  });
  const result = observeInventory(devTarget, { run });
  assert.equal(result.state, 'partial');
  assert.equal(result.reason, 'malformed-record');
  assertReadOnlyCommands(commands);
});

test('namespace race is unreadable', () => {
  const { run, commands } = createHarness({
    namespaceRace: true,
    namespacePresent: true,
  });
  const result = observeInventory(devTarget, { run });
  assert.equal(result.state, 'unreadable');
  assert.equal(result.reason, 'namespace-race');
  assertReadOnlyCommands(commands);
});

test('duplicate kubectl list names are unreadable', () => {
  const { run, commands } = createHarness({
    namespacePresent: true,
    secrets: ['sh.helm.release.v1.redis.v1', 'sh.helm.release.v1.redis.v1'],
  });
  const result = observeInventory(devTarget, { run });
  assert.equal(result.state, 'unreadable');
  assert.equal(result.reason, 'duplicate-name');
  assertReadOnlyCommands(commands);
});

test('installed compatible dev path', { skip: !installedFixture }, () => {
  assert.ok(installedFixture);
  const { run, commands } = createHarness({
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
    helmManifest: installedFixture.manifest,
    helmValues: installedFixture.values,
    helmHistory: [{ revision: 1, status: 'deployed' }],
    helmTemplate: installedFixture.manifest,
  });
  const result = observeInventory(devTarget, { run });
  assert.equal(result.state, 'installed');
  assert.equal(result.reason, 'compatible');
  assert.ok(result.snapshot.fetchedManifest);
  assert.ok(result.snapshot.fetchedValues);
  assertReadOnlyCommands(commands);
});

test('foreign owner on live deployment', () => {
  const { run, commands } = createHarness({
    namespacePresent: true,
    deployment: true,
    ownerOnLive: false,
    deploymentSelectors: { app: 'redis' },
  });
  const result = observeInventory(devTarget, { run });
  assert.equal(result.state, 'foreign');
  assert.equal(result.reason, 'owner-mismatch');
  assertReadOnlyCommands(commands);
});

test('legacy old selector without exact release secret', () => {
  const { run, commands } = createHarness({
    namespacePresent: true,
    secrets: [],
    deployment: true,
    deploymentSelectors: { app: 'redis' },
    serviceSelectors: { app: 'redis' },
  });
  const result = observeInventory(devTarget, { run });
  assert.equal(result.state, 'legacy');
  assert.equal(result.reason, 'old-selector');
  assertReadOnlyCommands(commands);
});
