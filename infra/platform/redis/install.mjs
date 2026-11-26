import { spawnSync } from 'node:child_process';
import { join } from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

import { runPlatformCommand } from '../common/commands.mjs';
import { readPlatformProfile } from '../common/profile.mjs';
import { withRedisMutation, DEFAULT_WRITE_RESERVE_MS } from './custody.mjs';
import { prepareValidatedChartCopy } from './config.mjs';
import { observeInventory, redisTargetFromProfile } from './inventory.mjs';
import { observeRedisReady } from './readiness.mjs';

/** @typedef {'dev' | 'release'} RedisProfileId */

const RELEASE_NAME = 'redis';
const NAMESPACE_CREATE_TIMEOUT_MS = 15_000;
const HELM_INSTALL_TIMEOUT_MS = 210_000;
const HELM_WAIT_TIMEOUT = '180s';
const INSTALL_MIN_REMAINING_MS = 330_000;
const HELM_LINT_TIMEOUT_MS = 30_000;

const REFUSED_RUNNER_ENV_KEYS = [
  'HELM_DRIVER',
  'KUBECONFIG',
  'KUBERNETES_SERVICE_HOST',
  'KUBERNETES_SERVICE_PORT',
  'HTTPS_PROXY',
  'HTTP_PROXY',
  'ALL_PROXY',
  'NO_PROXY',
  'HELM_KUBEAPISERVER',
  'HELM_KUBETOKEN',
  'HELM_BEARER_TOKEN',
  'AWS_ROLE_ARN',
  'AWS_WEB_IDENTITY_TOKEN_FILE',
];

function assertRedisHelmRunnerEnv() {
  for (const key of REFUSED_RUNNER_ENV_KEYS) {
    const value = process.env[key];
    if (value != null && String(value).length > 0) {
      throw new Error(`redis helm runner env refused: ${key}`);
    }
  }
}

/**
 * @param {string} command
 * @param {string[]} args
 * @param {{ input?: string, timeoutMs?: number }} [options]
 */
function productionPlatformRun(command, args, options = {}) {
  assertRedisHelmRunnerEnv();
  if (command === 'helm') {
    const result = spawnSync(command, args, {
      encoding: 'utf8',
      input: options.input,
      timeout: options.timeoutMs ?? HELM_LINT_TIMEOUT_MS,
      maxBuffer: 10 * 1024 * 1024,
      windowsHide: true,
      env: {
        PATH: process.env.PATH,
        HOME: process.env.HOME,
        LANG: process.env.LANG,
        HELM_DRIVER: 'secret',
      },
    });
    const timedOut =
      result.error?.code === 'ETIMEDOUT' || result.signal === 'SIGTERM';
    const missing = result.error?.code === 'ENOENT';
    const status = result.status ?? null;
    return {
      ok: !timedOut && !missing && !result.error && status === 0,
      status,
      stdout: result.stdout ?? '',
      stderr: result.stderr ?? '',
      timedOut,
      missing,
    };
  }
  return runPlatformCommand(command, args, {
    timeoutMs: options.timeoutMs,
    input: options.input,
  });
}

function profileValuesFileName(profileId) {
  return profileId === 'dev' ? 'development.yaml' : 'release.yaml';
}

/**
 * @param {RedisProfileId} profileId
 * @param {string} contextName
 */
function assertExactContext(profileId, contextName) {
  if (profileId !== 'dev' && profileId !== 'release') {
    throw new Error(`unsupported platform profile: ${profileId}`);
  }
  const profile = readPlatformProfile(profileId);
  if (contextName !== profile.contextName) {
    throw new Error(
      `refused: redis platform context must be exactly ${profile.contextName}`,
    );
  }
  return profile;
}

/**
 * @param {boolean} ok
 * @param {boolean} mutated
 * @param {string} detail
 * @param {string} state
 */
function installReceipt(ok, mutated, detail, state) {
  return { ok, mutated, detail, state };
}

/**
 * @param {ReturnType<typeof observeInventory>} inventory
 */
function isFreshAbsent(inventory) {
  return (
    inventory.state === 'absent' &&
    (inventory.reason === 'empty' || inventory.reason === 'namespace-missing')
  );
}

/**
 * @param {ReturnType<typeof observeInventory>} inventory
 */
function buildInventoryRun(inventoryDeps, target) {
  const observe =
    inventoryDeps.observeInventory ??
    ((t, deps) => observeInventory(t, deps));
  const run = inventoryDeps.run;
  return () => observe(target, run ? { run } : {});
}

/**
 * @param {RedisProfileId} profileId
 * @param {string} contextName
 * @param {{
 *   run?: import('./inventory.mjs').PlatformRun,
 *   observeInventory?: typeof observeInventory,
 * }} [deps]
 */
export function planRedisInstall(profileId, contextName, deps = {}) {
  assertExactContext(profileId, contextName);
  const target = redisTargetFromProfile(profileId);
  const inventory = buildInventoryRun(deps, target)();
  if (inventory.state === 'unreadable') {
    return {
      receipt: installReceipt(
        false,
        false,
        inventory.reason ?? 'unreadable',
        'unreadable',
      ),
      exitCode: 1,
    };
  }
  return {
    receipt: installReceipt(
      true,
      false,
      inventory.reason ?? inventory.state,
      inventory.state,
    ),
    exitCode: 0,
  };
}

/**
 * @param {RedisProfileId} profileId
 * @param {string} contextName
 * @param {{
 *   run?: import('./inventory.mjs').PlatformRun,
 *   observeInventory?: typeof observeInventory,
 *   observeRedisReady?: typeof observeRedisReady,
 *   stateRoot?: string,
 *   budgetMs?: number,
 *   writeReserveMs?: number,
 *   spawn?: typeof import('node:child_process').spawnSync,
 * }} [deps]
 */
export async function ensureRedisInstall(profileId, contextName, deps = {}) {
  assertExactContext(profileId, contextName);
  if (process.env.OFFSCREEN_REDIS_ENSURE !== 'authorized') {
    return installReceipt(
      false,
      false,
      'ensure-not-authorized',
      'refused',
    );
  }

  const target = redisTargetFromProfile(profileId);
  const observeInventoryFn = deps.observeInventory ?? observeInventory;
  const observeReadyFn = deps.observeRedisReady ?? observeRedisReady;
  const inventoryRun = deps.run;

  return withRedisMutation(
    profileId,
    async ({ runWrite, remainingMs, finishPending }) => {
      let writesStarted = false;
      const trackWrite = async (command, args, options) => {
        writesStarted = true;
        return runWrite(command, args, options);
      };

      const readInventory = () =>
        observeInventoryFn(target, inventoryRun ? { run: inventoryRun } : {});

      const refuse = (detail, state) => {
        if (!writesStarted) {
          finishPending();
        }
        return installReceipt(false, writesStarted, detail, state);
      };

      const inventory = readInventory();
      if (inventory.state === 'unreadable') {
        return refuse(inventory.reason ?? 'unreadable', 'unreadable');
      }

      if (inventory.state === 'installed') {
        const ready = observeReadyFn(profileId, inventoryRun ? { run: inventoryRun } : {});
        if (ready.ok && ready.state === 'ready') {
          return installReceipt(
            true,
            false,
            ready.detail ?? 'compatible-ready',
            'installed',
          );
        }
        return refuse(ready.detail ?? 'not-ready', 'installed');
      }

      if (!isFreshAbsent(inventory)) {
        return refuse(
          inventory.reason ?? inventory.state,
          inventory.state,
        );
      }

      const needsNamespaceCreate = inventory.reason === 'namespace-missing';

      if (remainingMs() < DEFAULT_WRITE_RESERVE_MS) {
        return refuse('budget-reserve-exhausted', 'refused');
      }

      if (needsNamespaceCreate) {
        if (remainingMs() < INSTALL_MIN_REMAINING_MS) {
          return refuse('install-budget-insufficient', 'refused');
        }
        const create = await trackWrite(
          'kubectl',
          [
            '--context',
            target.contextName,
            'create',
            'namespace',
            target.namespace,
          ],
          { timeoutMs: NAMESPACE_CREATE_TIMEOUT_MS },
        );
        if (!create.ok) {
          const unclear =
            create.status == null ||
            create.timedOut ||
            (create.stderr?.includes('AlreadyExists') ?? false);
          const detail = unclear ? 'namespace-create-unclear' : 'namespace-create-failed';
          return refuse(detail, 'refused');
        }
        const label = await trackWrite(
          'kubectl',
          [
            '--context',
            target.contextName,
            'label',
            'namespace',
            target.namespace,
            `${target.ownerKey}=${target.ownerValue}`,
            '--overwrite',
          ],
          { timeoutMs: NAMESPACE_CREATE_TIMEOUT_MS },
        );
        if (!label.ok) {
          return refuse('namespace-label-failed', 'refused');
        }
      }

      const afterCreate = readInventory();
      if (!isFreshAbsent(afterCreate)) {
        return refuse(
          afterCreate.reason ?? afterCreate.state,
          afterCreate.state,
        );
      }

      if (remainingMs() < INSTALL_MIN_REMAINING_MS) {
        return refuse('install-budget-insufficient', 'refused');
      }

      const chartRun = inventoryRun ?? productionPlatformRun;
      const prepared = prepareValidatedChartCopy(
        chartRun,
        profileId,
        target.namespace,
      );
      try {
        const chartRoot = prepared.chartRoot;
        const helmArgs = [
          'install',
          RELEASE_NAME,
          chartRoot,
          '--namespace',
          target.namespace,
          '--kube-context',
          target.contextName,
          '-f',
          join(chartRoot, 'values.yaml'),
          '-f',
          join(chartRoot, 'profiles', profileValuesFileName(profileId)),
          '--wait',
          '--timeout',
          HELM_WAIT_TIMEOUT,
        ];
        const helm = await trackWrite('helm', helmArgs, {
          timeoutMs: HELM_INSTALL_TIMEOUT_MS,
        });
        if (!helm.ok || helm.status == null || helm.timedOut) {
          return refuse('helm-install-unclear', 'refused');
        }

        const postInventory = readInventory();
        if (postInventory.state !== 'installed') {
          return refuse(
            postInventory.reason ?? postInventory.state,
            postInventory.state,
          );
        }
        const ready = observeReadyFn(
          profileId,
          inventoryRun ? { run: inventoryRun } : {},
        );
        if (!ready.ok || ready.state !== 'ready') {
          return refuse(ready.detail ?? 'post-install-not-ready', ready.state);
        }

        return installReceipt(
          true,
          true,
          ready.detail ?? 'installed-ready',
          'installed',
        );
      } finally {
        prepared.dispose();
      }
    },
    deps,
  );
}

/**
 * Guarded lifecycle entry for platform CLI integration.
 *
 * @param {string[]} argv
 * @param {Parameters<typeof ensureRedisInstall>[2]} [deps]
 */
export async function runRedisInstallLifecycle(argv, deps = {}) {
  const [command, profileId, contextName, extra] = argv;
  if (
    extra !== undefined ||
    (command !== 'plan' && command !== 'ensure') ||
  (profileId !== 'dev' && profileId !== 'release') ||
    typeof contextName !== 'string' ||
    contextName.length === 0
  ) {
    throw new Error('invalid redis install invocation');
  }

  if (command === 'plan') {
    const { receipt, exitCode } = planRedisInstall(
      profileId,
      contextName,
      deps,
    );
    process.stdout.write(`${JSON.stringify(receipt)}\n`);
    return exitCode;
  }

  const receipt = await ensureRedisInstall(profileId, contextName, deps);
  process.stdout.write(`${JSON.stringify(receipt)}\n`);
  return receipt.ok ? 0 : 1;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  runRedisInstallLifecycle(process.argv.slice(2))
    .then((code) => {
      process.exitCode = code;
    })
    .catch((error) => {
      process.stderr.write(
        `${error instanceof Error ? error.message : 'redis install failed'}\n`,
      );
      process.exitCode = 1;
    });
}