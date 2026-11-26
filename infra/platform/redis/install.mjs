import { randomBytes } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { parseAllDocuments } from 'yaml';

import {
  assertPlatformTarget,
  runPlatformCommand,
} from '../common/commands.mjs';
import { readPlatformProfile } from '../common/profile.mjs';
import {
  withRedisMutation,
  DEFAULT_WRITE_RESERVE_MS,
  DEFAULT_SMOKE_BUDGET_MS,
  assertRedisRunnerEnv,
  sanitizedHelmChildEnv,
} from './custody.mjs';
import {
  FAULT_ONLY_REDIS_IMAGE,
  prepareFaultValidatedChartCopy,
  prepareValidatedChartCopy,
} from './config.mjs';
import { observeInventory, redisTargetFromProfile } from './inventory.mjs';
import {
  buildDesiredProjection,
  observeRedisReady,
  observeTargetReady,
} from './readiness.mjs';
import {
  runRedisSmokeProof,
  runVerifiedSmokeNamespaceCleanup,
} from './smoke-proof.mjs';

/** @typedef {'dev' | 'release'} RedisProfileId */

const RELEASE_NAME = 'redis';
const SMOKE_NAMESPACE_PREFIX = 'offscreen-redis-proof-';
const SMOKE_NAMESPACE_PATTERN = /^offscreen-redis-proof-[0-9a-f]{32}$/;
const OBSERVATION_BUDGET_MS = 120_000;
const NAMESPACE_CREATE_TIMEOUT_MS = 15_000;
const HELM_INSTALL_TIMEOUT_MS = 210_000;
const HELM_WAIT_TIMEOUT = '180s';
const FAULT_HELM_WAIT_TIMEOUT = '30s';
const FAULT_HELM_INSTALL_TIMEOUT_MS = 60_000;
const INSTALL_MIN_REMAINING_MS = 330_000;
const HELM_LINT_TIMEOUT_MS = 30_000;
const MALFORMED_HELM_SECRET_NAME = 'sh.helm.release.v1.redis.v1.bad';

export function assertRedisHelmRunnerEnv() {
  assertRedisRunnerEnv();
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
      env: sanitizedHelmChildEnv(),
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
function assertInstallContext(profileId, contextName) {
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
 * @param {import('./inventory.mjs').RedisInventoryTarget} target
 * @param {{ uid: string, resourceVersion: string }} identity
 * @param {import('./inventory.mjs').PlatformRun} run
 */
function revalidateNamespaceIdentity(target, identity, run) {
  const read = run('kubectl', [
    '--context',
    target.contextName,
    'get',
    'namespace',
    target.namespace,
    '-o',
    'json',
  ]);
  if (!read.ok) {
    throw new Error('refused: namespace identity unreadable before write');
  }
  let body;
  try {
    body = JSON.parse(read.stdout);
  } catch {
    throw new Error('refused: namespace identity response malformed');
  }
  const uid = body?.metadata?.uid;
  const rv = body?.metadata?.resourceVersion;
  if (uid !== identity.uid || typeof rv !== 'string' || rv.length === 0) {
    throw new Error('refused: namespace identity mismatch before write');
  }
  return { uid, resourceVersion: rv };
}

/**
 * @param {import('./inventory.mjs').RedisInventoryTarget} target
 * @param {RedisProfileId} profileId
 * @param {string | undefined} proofNonce
 */
/**
 * @param {import('./inventory.mjs').RedisInventoryTarget} target
 */
function malformedReleaseSecretManifest(target) {
  return `${JSON.stringify({
    apiVersion: 'v1',
    kind: 'Secret',
    metadata: {
      name: MALFORMED_HELM_SECRET_NAME,
      namespace: target.namespace,
      labels: {
        owner: 'helm',
        name: 'redis',
        status: 'deployed',
      },
    },
    type: 'helm.sh/release.v1',
    data: {
      release: 'dGVzdA==',
    },
  })}\n`;
}

/**
 * @param {import('./inventory.mjs').RedisInventoryTarget} target
 */
function matchingOrphanDeploymentManifest(target) {
  const ownerKey = target.ownerKey;
  const ownerValue = target.ownerValue;
  return `${JSON.stringify({
    apiVersion: 'apps/v1',
    kind: 'Deployment',
    metadata: {
      name: 'redis',
      namespace: target.namespace,
      labels: {
        [ownerKey]: ownerValue,
        'app.kubernetes.io/name': 'redis',
        'app.kubernetes.io/instance': 'redis',
      },
    },
    spec: {
      replicas: 1,
      selector: {
        matchLabels: {
          'app.kubernetes.io/name': 'redis',
          'app.kubernetes.io/instance': 'redis',
        },
      },
      template: {
        metadata: {
          labels: {
            'app.kubernetes.io/name': 'redis',
            'app.kubernetes.io/instance': 'redis',
          },
        },
        spec: {
          containers: [
            {
              name: 'redis',
              image: 'docker.io/library/redis:8.2.1',
            },
          ],
        },
      },
    },
  })}\n`;
}

/**
 * @param {import('./inventory.mjs').RedisInventoryTarget} target
 */
function matchingOrphanReleaseSecretManifest(target) {
  return `${JSON.stringify({
    apiVersion: 'v1',
    kind: 'Secret',
    metadata: {
      name: 'sh.helm.release.v1.redis.v1',
      namespace: target.namespace,
      labels: {
        owner: 'helm',
        name: 'redis',
        status: 'deployed',
        version: '1',
      },
    },
    type: 'helm.sh/release.v1',
    data: {
      release: 'dGVzdA==',
    },
  })}\n`;
}

function namespaceCreateManifest(target, profileId, proofNonce) {
  const labels = { [target.ownerKey]: target.ownerValue };
  if (proofNonce) {
    labels[proofNonceLabelKey(profileId)] = proofNonce;
  }
  return `${JSON.stringify({
    apiVersion: 'v1',
    kind: 'Namespace',
    metadata: { name: target.namespace, labels },
  })}\n`;
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
 * @param {RedisProfileId} profileId
 */
function proofNonceLabelKey(profileId) {
  return profileId === 'dev'
    ? 'offscreen.dev/redis-proof'
    : 'offscreen.rpg/redis-proof';
}

/**
 * @param {import('./inventory.mjs').RedisInventoryTarget} target
 * @param {RedisProfileId} profileId
 */
function assertSmokeNamespace(target, profileId) {
  const canonical = redisTargetFromProfile(profileId);
  if (target.namespace === canonical.namespace) {
    throw new Error('refused: smoke cannot target canonical namespace');
  }
  if (!SMOKE_NAMESPACE_PATTERN.test(target.namespace)) {
    throw new Error('refused: smoke namespace pattern invalid');
  }
}

/**
 * @param {string} manifest
 */
function parseInstallManifest(manifest) {
  if (!manifest.trim()) {
    throw new Error('empty manifest');
  }
  const docs = parseAllDocuments(manifest);
  /** @type {Record<string, unknown>[]} */
  const out = [];
  for (const doc of docs) {
    if (doc.errors.length > 0) {
      throw new Error('malformed manifest document');
    }
    const value = doc.toJS();
    if (value != null) {
      out.push(value);
    }
  }
  return out;
}

/**
 * @param {import('./inventory.mjs').RedisInventoryTarget} target
 * @param {ReturnType<typeof observeInventory>} inventory
 * @param {RedisProfileId} profileId
 * @param {{ observeRedisReady?: typeof observeRedisReady, run?: import('./inventory.mjs').PlatformRun }} deps
 */
function observeReadyAtTarget(target, inventory, profileId, deps) {
  const observeReadyFn = deps.observeRedisReady ?? observeRedisReady;
  const inventoryRun = deps.run;
  const runOpts = inventoryRun ? { run: inventoryRun } : {};
  const canonicalNs = redisTargetFromProfile(profileId).namespace;
  if (
    target.namespace === canonicalNs ||
    observeReadyFn !== observeRedisReady
  ) {
    return observeReadyFn(profileId, runOpts);
  }

  if (inventory.state !== 'installed') {
    return {
      ok: false,
      state: inventory.state,
      detail: inventory.reason ?? inventory.state,
    };
  }
  const manifestText = inventory.snapshot?.fetchedManifest;
  if (typeof manifestText !== 'string' || manifestText.trim().length === 0) {
    return {
      ok: false,
      state: 'unreadable',
      detail: 'missing-installed-manifest',
    };
  }
  let desired;
  try {
    desired = buildDesiredProjection(parseInstallManifest(manifestText));
  } catch {
    return {
      ok: false,
      state: 'unreadable',
      detail: 'installed-manifest-parse',
    };
  }
  const observed = observeTargetReady(target, desired, {
    run: inventoryRun ?? runPlatformCommand,
    deadline: Date.now() + OBSERVATION_BUDGET_MS,
  });
  return {
    ok: observed.state === 'ready',
    state: observed.state,
    detail: observed.detail ?? observed.state,
  };
}

/**
 * @typedef {{ mode: 'canonical' }} CanonicalInstallMode
 * @typedef {{ mode: 'smoke', proofNonce: string }} SmokeInstallMode
 * @typedef {{ mode: 'smoke-failure', proofNonce: string }} SmokeFailureInstallMode
 * @typedef {{ mode: 'smoke-repeat', proofNonce: string }} SmokeRepeatInstallMode
 * @typedef {{ mode: 'smoke-fixture', proofNonce: string, fixture: 'malformed-secret' | 'matching-orphan' }} SmokeFixtureInstallMode
 * @typedef {CanonicalInstallMode | SmokeInstallMode | SmokeFailureInstallMode | SmokeRepeatInstallMode | SmokeFixtureInstallMode} RedisInstallMode
 */

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
    inventoryDeps.observeInventory ?? ((t, deps) => observeInventory(t, deps));
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
  assertInstallContext(profileId, contextName);
  assertRedisHelmRunnerEnv();
  const identityRun = deps.run ?? productionPlatformRun;
  assertPlatformTarget(profileId, { run: identityRun });
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
/**
 * @param {RedisProfileId} profileId
 * @param {import('./inventory.mjs').RedisInventoryTarget} target
 * @param {RedisInstallMode} installMode
 * @param {Parameters<typeof ensureRedisInstall>[2]} deps
 */
async function runLockedRedisInstall(
  profileId,
  target,
  installMode,
  deps = {},
) {
  const observeInventoryFn = deps.observeInventory ?? observeInventory;
  const observeReadyFn = deps.observeRedisReady ?? observeRedisReady;
  const inventoryRun = deps.run;

  const proofNonce =
    installMode.mode === 'smoke' ||
    installMode.mode === 'smoke-failure' ||
    installMode.mode === 'smoke-repeat' ||
    installMode.mode === 'smoke-fixture'
      ? installMode.proofNonce
      : undefined;

  return withRedisMutation(
    profileId,
    async ({ runWrite, remainingMs, finishPending, updatePending }) => {
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

      if (installMode.mode === 'smoke-repeat') {
        assertSmokeNamespace(target, profileId);
        if (inventory.state !== 'installed') {
          return refuse(inventory.reason ?? inventory.state, inventory.state);
        }
        const ready = observeReadyAtTarget(target, inventory, profileId, {
          observeRedisReady: observeReadyFn,
          run: inventoryRun,
        });
        if (!ready.ok || ready.state !== 'ready') {
          return refuse(ready.detail ?? 'not-ready', ready.state);
        }
        return installReceipt(
          true,
          false,
          'smoke-repeat-compatible-ready',
          'installed',
        );
      }

      if (inventory.state === 'installed') {
        const ready = observeReadyAtTarget(target, inventory, profileId, {
          observeRedisReady: observeReadyFn,
          run: inventoryRun,
        });
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

      if (
        installMode.mode === 'smoke' ||
        installMode.mode === 'smoke-failure' ||
        installMode.mode === 'smoke-fixture'
      ) {
        if (inventory.reason !== 'namespace-missing') {
          return refuse(inventory.reason ?? inventory.state, inventory.state);
        }
      } else if (!isFreshAbsent(inventory)) {
        return refuse(inventory.reason ?? inventory.state, inventory.state);
      }

      if (remainingMs() < DEFAULT_WRITE_RESERVE_MS) {
        return refuse('budget-reserve-exhausted', 'refused');
      }

      const needsNamespaceCreate =
        installMode.mode === 'smoke' ||
        installMode.mode === 'smoke-failure' ||
        installMode.mode === 'smoke-fixture' ||
        inventory.reason === 'namespace-missing';

      /** @type {{ uid: string, resourceVersion: string } | undefined} */
      let namespaceIdentity;

      if (needsNamespaceCreate) {
        if (remainingMs() < INSTALL_MIN_REMAINING_MS) {
          return refuse('install-budget-insufficient', 'refused');
        }
        const create = await trackWrite(
          'kubectl',
          ['--context', target.contextName, 'create', '-f', '-', '-o', 'json'],
          {
            input: namespaceCreateManifest(target, profileId, proofNonce),
            timeoutMs: NAMESPACE_CREATE_TIMEOUT_MS,
          },
        );
        if (!create.ok) {
          if (
            (installMode.mode === 'smoke' ||
              installMode.mode === 'smoke-failure' ||
              installMode.mode === 'smoke-fixture') &&
            (create.stderr?.includes('AlreadyExists') ?? false)
          ) {
            return refuse('namespace-already-exists', 'refused');
          }
          const unclear =
            create.status == null ||
            create.timedOut ||
            (create.stderr?.includes('AlreadyExists') ?? false);
          const detail = unclear
            ? 'namespace-create-unclear'
            : 'namespace-create-failed';
          return refuse(detail, 'refused');
        }
        let created;
        try {
          created = JSON.parse(create.stdout);
        } catch {
          return refuse('namespace-create-unclear', 'refused');
        }
        const originalUid = created?.metadata?.uid;
        const originalResourceVersion = created?.metadata?.resourceVersion;
        if (
          typeof originalUid !== 'string' ||
          typeof originalResourceVersion !== 'string'
        ) {
          return refuse('namespace-create-unclear', 'refused');
        }
        try {
          updatePending({
            target: target.namespace,
            ...(proofNonce ? { nonce: proofNonce } : {}),
            originalUid,
            originalResourceVersion,
          });
        } catch {
          return refuse('pending-receipt-update-failed', 'refused');
        }
        namespaceIdentity = {
          uid: originalUid,
          resourceVersion: originalResourceVersion,
        };
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

      if (namespaceIdentity) {
        const readRunner = inventoryRun ?? productionPlatformRun;
        try {
          revalidateNamespaceIdentity(target, namespaceIdentity, readRunner);
        } catch (error) {
          return refuse(
            error instanceof Error
              ? error.message
              : 'namespace-identity-mismatch',
            'refused',
          );
        }
      }

      if (installMode.mode === 'smoke-fixture' && namespaceIdentity) {
        const fixtureCreates =
          installMode.fixture === 'malformed-secret'
            ? [
                {
                  manifest: malformedReleaseSecretManifest(target),
                  detail: 'malformed-record',
                },
              ]
            : [
                {
                  manifest: matchingOrphanDeploymentManifest(target),
                  detail: 'matching-orphan',
                },
                {
                  manifest: matchingOrphanReleaseSecretManifest(target),
                  detail: 'matching-orphan',
                },
              ];

        for (const fixture of fixtureCreates) {
          const created = await trackWrite(
            'kubectl',
            ['--context', target.contextName, 'create', '-f', '-'],
            {
              input: fixture.manifest,
              timeoutMs: NAMESPACE_CREATE_TIMEOUT_MS,
            },
          );
          if (!created.ok || created.status == null || created.timedOut) {
            return refuse('fixture-create-unclear', 'refused');
          }
        }

        const admission = readInventory();
        const expectedFixtureReason =
          installMode.fixture === 'malformed-secret'
            ? 'malformed-record'
            : 'matching-orphan';
        if (
          admission.state !== 'partial' ||
          admission.reason !== expectedFixtureReason
        ) {
          return refuse(
            admission.reason ?? 'fixture-admission-unexpected',
            admission.state,
          );
        }

        try {
          updatePending({
            fixture: installMode.fixture,
            admissionReason: admission.reason,
          });
        } catch {
          return refuse('pending-receipt-update-failed', 'refused');
        }

        const cleanup = await runVerifiedSmokeNamespaceCleanup(
          target,
          profileId,
          {
            run: inventoryRun ?? runPlatformCommand,
            runWrite: trackWrite,
            remainingMs,
            namespaceIdentity,
            proofNonce,
          },
        );
        if (!cleanup.ok) {
          return refuse(cleanup.detail ?? 'fixture-cleanup-failed', 'refused');
        }

        return installReceipt(
          true,
          true,
          `fixture-${installMode.fixture}-refusal-cleanup`,
          'refused',
        );
      }

      const chartRun = inventoryRun ?? productionPlatformRun;
      const prepared =
        installMode.mode === 'smoke-failure'
          ? prepareFaultValidatedChartCopy(
              chartRun,
              profileId,
              target.namespace,
            )
          : prepareValidatedChartCopy(chartRun, profileId, target.namespace);
      try {
        const chartRoot = prepared.chartRoot;
        const faultInstall = installMode.mode === 'smoke-failure';
        const helmWaitTimeout = faultInstall
          ? FAULT_HELM_WAIT_TIMEOUT
          : HELM_WAIT_TIMEOUT;
        const helmInstallTimeout = faultInstall
          ? FAULT_HELM_INSTALL_TIMEOUT_MS
          : HELM_INSTALL_TIMEOUT_MS;
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
          helmWaitTimeout,
        ];
        const helm = await trackWrite('helm', helmArgs, {
          timeoutMs: helmInstallTimeout,
        });
        if (faultInstall) {
          if (helm.ok && !helm.timedOut && helm.status === 0) {
            try {
              updatePending({
                target: target.namespace,
                nonce: proofNonce,
                faultImage: FAULT_ONLY_REDIS_IMAGE,
                faultEvidence: {
                  unexpectedSuccess: true,
                  helmStatus: helm.status,
                },
              });
            } catch {
              return refuse('pending-receipt-update-failed', 'refused');
            }
            return refuse('smoke-failure-unexpected-success', 'refused');
          }
          try {
            updatePending({
              target: target.namespace,
              nonce: proofNonce,
              ...(namespaceIdentity?.uid
                ? { originalUid: namespaceIdentity.uid }
                : {}),
              faultImage: FAULT_ONLY_REDIS_IMAGE,
              faultEvidence: {
                expectedFailure: true,
                helmStatus: helm.status,
                helmTimedOut: helm.timedOut,
                helmStderr: (helm.stderr ?? '').slice(0, 400),
                helmStdout: (helm.stdout ?? '').slice(0, 400),
              },
            });
          } catch {
            return refuse('pending-receipt-update-failed', 'refused');
          }
          return installReceipt(false, true, 'smoke-failure-expected', 'fault');
        }
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
        const ready = observeReadyAtTarget(target, postInventory, profileId, {
          observeRedisReady: observeReadyFn,
          run: inventoryRun,
        });
        if (!ready.ok || ready.state !== 'ready') {
          return refuse(ready.detail ?? 'post-install-not-ready', ready.state);
        }

        if (installMode.mode === 'smoke') {
          const proof = await runRedisSmokeProof(target, profileId, {
            run: inventoryRun ?? runPlatformCommand,
            runWrite: trackWrite,
            remainingMs,
            observeInventory: deps.observeInventory,
            ...(namespaceIdentity
              ? {
                  namespaceIdentity,
                  proofNonce,
                }
              : {}),
          });
          if (!proof.ok) {
            return refuse(
              proof.detail ?? 'smoke-proof-failed',
              proof.state ?? 'refused',
            );
          }
        }

        return installReceipt(
          true,
          true,
          installMode.mode === 'smoke'
            ? 'smoke-proof-complete'
            : (ready.detail ?? 'installed-ready'),
          'installed',
        );
      } finally {
        prepared.dispose();
      }
    },
    {
      ...deps,
      pendingTarget: target.namespace,
      ...(proofNonce ? { pendingNonce: proofNonce } : {}),
    },
  );
}

/**
 * @param {RedisProfileId} profileId
 * @param {string} contextName
 * @param {Parameters<typeof ensureRedisInstall>[2] & { randomBytes?: typeof randomBytes }} [deps]
 */
export async function ensureRedisInstall(profileId, contextName, deps = {}) {
  assertInstallContext(profileId, contextName);
  assertRedisHelmRunnerEnv();
  const identityRun = deps.run ?? productionPlatformRun;
  assertPlatformTarget(profileId, { run: identityRun });
  if (process.env.OFFSCREEN_REDIS_ENSURE !== 'authorized') {
    return installReceipt(false, false, 'ensure-not-authorized', 'refused');
  }

  const target = redisTargetFromProfile(profileId);
  return runLockedRedisInstall(profileId, target, { mode: 'canonical' }, deps);
}

/**
 * @param {RedisProfileId} profileId
 * @param {string} contextName
 * @param {Parameters<typeof ensureRedisInstall>[2] & { randomBytes?: typeof randomBytes }} [deps]
 */
/**
 * @param {RedisProfileId} profileId
 * @param {string} contextName
 * @param {Parameters<typeof ensureRedisInstall>[2] & { randomBytes?: typeof randomBytes }} deps
 */
function assertSmokeDisposableGuards(profileId, contextName, deps = {}) {
  assertInstallContext(profileId, contextName);
  assertRedisHelmRunnerEnv();
  const identityRun = deps.run ?? productionPlatformRun;
  assertPlatformTarget(profileId, { run: identityRun });
  if (process.env.OFFSCREEN_REDIS_SMOKE_DISPOSABLE !== 'confirmed') {
    return installReceipt(false, false, 'smoke-not-disposable', 'refused');
  }
  if (process.env.OFFSCREEN_REDIS_ENSURE !== 'authorized') {
    return installReceipt(false, false, 'smoke-not-authorized', 'refused');
  }
  return null;
}

/**
 * @param {RedisProfileId} profileId
 * @param {Parameters<typeof ensureRedisInstall>[2] & { randomBytes?: typeof randomBytes }} deps
 */
function buildGeneratedSmokeTarget(profileId, deps = {}) {
  const randomBytesFn = deps.randomBytes ?? randomBytes;
  const proofNonce = randomBytesFn(16).toString('hex');
  const namespace = `${SMOKE_NAMESPACE_PREFIX}${proofNonce}`;
  const base = redisTargetFromProfile(profileId);
  /** @type {import('./inventory.mjs').RedisInventoryTarget} */
  const target = { ...base, namespace };
  assertSmokeNamespace(target, profileId);
  return { target, proofNonce };
}

export async function smokeRedisInstall(profileId, contextName, deps = {}) {
  const guard = assertSmokeDisposableGuards(profileId, contextName, deps);
  if (guard) {
    return guard;
  }
  const { target, proofNonce } = buildGeneratedSmokeTarget(profileId, deps);
  const receipt = await runLockedRedisInstall(
    profileId,
    target,
    { mode: 'smoke', proofNonce },
    { ...deps, budgetMs: deps.budgetMs ?? DEFAULT_SMOKE_BUDGET_MS },
  );
  return { ...receipt, namespace: target.namespace };
}

/**
 * @param {RedisProfileId} profileId
 * @param {string} contextName
 * @param {Parameters<typeof ensureRedisInstall>[2] & { randomBytes?: typeof randomBytes }} [deps]
 */
export async function smokeRedisInstallFailure(
  profileId,
  contextName,
  deps = {},
) {
  const guard = assertSmokeDisposableGuards(profileId, contextName, deps);
  if (guard) {
    return guard;
  }
  const { target, proofNonce } = buildGeneratedSmokeTarget(profileId, deps);
  const receipt = await runLockedRedisInstall(
    profileId,
    target,
    { mode: 'smoke-failure', proofNonce },
    { ...deps, budgetMs: deps.budgetMs ?? DEFAULT_SMOKE_BUDGET_MS },
  );
  return { ...receipt, namespace: target.namespace };
}

/**
 * @param {RedisProfileId} profileId
 * @param {string} contextName
 * @param {'malformed-secret' | 'matching-orphan'} fixture
 * @param {Parameters<typeof ensureRedisInstall>[2] & { randomBytes?: typeof randomBytes }} [deps]
 */
export async function smokeRedisAdmissionFixture(
  profileId,
  contextName,
  fixture,
  deps = {},
) {
  const guard = assertSmokeDisposableGuards(profileId, contextName, deps);
  if (guard) {
    return guard;
  }
  const { target, proofNonce } = buildGeneratedSmokeTarget(profileId, deps);
  const receipt = await runLockedRedisInstall(
    profileId,
    target,
    { mode: 'smoke-fixture', proofNonce, fixture },
    { ...deps, budgetMs: deps.budgetMs ?? DEFAULT_SMOKE_BUDGET_MS },
  );
  return { ...receipt, namespace: target.namespace };
}

/**
 * @param {RedisProfileId} profileId
 * @param {string} contextName
 * @param {import('./inventory.mjs').RedisInventoryTarget} target
 * @param {Parameters<typeof ensureRedisInstall>[2] & { proofNonce?: string }} [deps]
 */
export async function repeatEnsureGeneratedSmokeNamespace(
  profileId,
  contextName,
  target,
  deps = {},
) {
  const guard = assertSmokeDisposableGuards(profileId, contextName, deps);
  if (guard) {
    return guard;
  }
  assertSmokeNamespace(target, profileId);
  const proofNonce = deps.proofNonce;
  if (typeof proofNonce !== 'string' || proofNonce.length === 0) {
    return installReceipt(
      false,
      false,
      'smoke-repeat-missing-nonce',
      'refused',
    );
  }
  return runLockedRedisInstall(
    profileId,
    target,
    { mode: 'smoke-repeat', proofNonce },
    { ...deps, budgetMs: deps.budgetMs ?? DEFAULT_SMOKE_BUDGET_MS },
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
    (command !== 'plan' &&
      command !== 'ensure' &&
      command !== 'smoke' &&
      command !== 'smoke-failure') ||
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

  if (command === 'smoke') {
    const receipt = await smokeRedisInstall(profileId, contextName, deps);
    process.stdout.write(`${JSON.stringify(receipt)}\n`);
    return receipt.ok ? 0 : 1;
  }

  if (command === 'smoke-failure') {
    const receipt = await smokeRedisInstallFailure(
      profileId,
      contextName,
      deps,
    );
    process.stdout.write(`${JSON.stringify(receipt)}\n`);
    return receipt.ok ? 0 : 1;
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
