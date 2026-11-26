import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { stringify } from 'yaml';

import { readPlatformProfile } from '../common/profile.mjs';
import { runPlatformCommand } from '../common/commands.mjs';
import {
  renderPlatformDocuments,
  renderPlatformYaml,
} from '../common/render.mjs';
import {
  acquireRabbitmqLock,
  assertBaselineNamespaceUid,
  assertInheritedLockFd,
  assertRabbitmqInstallTarget,
  assertRabbitmqRunnerEnv,
  readBaselineNamespaceUid,
  remainingBudgetMs,
  runBoundedWithLockFd,
  RABBITMQ_API_TIMEOUT_MS,
  RABBITMQ_ENSURE_BUDGET_MS,
  RABBITMQ_REPORTING_RESERVE_MS,
  STAGE_BROKER_CEILING_MS,
  STAGE_DEPENDENCY_CEILING_MS,
  workerDeadlineNs,
} from './custody.mjs';
import {
  CERT_MANAGER_NAMESPACE,
  discoverApiVersion,
  observeRabbitmqInventory,
  rabbitmqTargetFromProfile,
} from './inventory.mjs';
import { observeRabbitmqReady } from './readiness.mjs';
import {
  loadVendorBundle,
  NATIVE_DESIGN_LABEL,
  NATIVE_DESIGN_VALUE,
} from './vendor-bundles.mjs';

/** @typedef {'dev' | 'release'} RabbitmqProfileId */
/** @typedef {'none' | 'confirmed' | 'possible'} MutationState */

const moduleDir = dirname(fileURLToPath(import.meta.url));
const chartRoot = join(moduleDir, 'chart');
const installModulePath = fileURLToPath(import.meta.url);

const CERT_MANAGER_CRDS = [
  'certificates.cert-manager.io',
  'certificaterequests.cert-manager.io',
  'challenges.acme.cert-manager.io',
  'clusterissuers.cert-manager.io',
  'issuers.cert-manager.io',
  'orders.acme.cert-manager.io',
];

const CERT_MANAGER_DEPLOYMENTS = [
  'cert-manager',
  'cert-manager-cainjector',
  'cert-manager-webhook',
];

const OPERATOR_CRD = 'rabbitmqclusters.rabbitmq.com';

/**
 * @param {boolean} ok
 * @param {RabbitmqProfileId} profile
 * @param {string} phase
 * @param {string} state
 * @param {MutationState} mutation
 * @param {string} reasonCode
 */
export function rabbitmqInstallResult(
  ok,
  profile,
  phase,
  state,
  mutation,
  reasonCode,
) {
  return { schema: 1, ok, profile, phase, state, mutation, reasonCode };
}

/**
 * @param {RabbitmqProfileId} profileId
 * @param {string} contextName
 */
function assertInstallContext(profileId, contextName) {
  if (profileId !== 'dev' && profileId !== 'release') {
    throw new Error(`unsupported platform profile: ${profileId}`);
  }
  const profile = readPlatformProfile(profileId);
  if (contextName !== profile.contextName) {
    throw new Error(
      `refused: rabbitmq context must be exactly ${profile.contextName}`,
    );
  }
  return profile;
}

/**
 * @param {string[]} argv
 */
function exitCodeForResult(argv, result) {
  const [command] = argv;
  if (command !== 'plan' && command !== 'ensure' && command !== 'status') {
    return 2;
  }
  if (result.ok) {
    return 0;
  }
  if (
    result.reasonCode === 'invalid-invocation' ||
    result.reasonCode === 'ensure-not-authorized' ||
    result.reasonCode === 'context-mismatch'
  ) {
    return 2;
  }
  return 1;
}

/**
 * @param {RabbitmqProfileId} profileId
 * @param {import('./inventory.mjs').RabbitmqInventoryTarget} target
 * @param {import('./inventory.mjs').PlatformRun} run
 * @param {{ validateStorageClass?: boolean, runMemoryGuard?: boolean, libPath?: string }} [deps]
 */
function runPreflight(profileId, target, run, deps = {}) {
  if (deps.skipTargetAssert !== true) {
    assertRabbitmqInstallTarget(profileId, run);
  }
  if (deps.runMemoryGuard === true && deps.libPath) {
    const guard = run(
      'bash',
      ['-c', `set -euo pipefail; source "$1"; require_memory`, deps.libPath],
      { timeoutMs: 30_000 },
    );
    if (!guard.ok) {
      return {
        ok: false,
        reasonCode: 'memory-guard-failed',
        phase: 'preflight',
      };
    }
  }
  if (deps.skipTargetAssert === true) {
    return { ok: true, phase: 'preflight' };
  }
  if (deps.validateStorageClass !== false) {
    const sc = run('kubectl', [
      '--context',
      target.contextName,
      '--request-timeout=10s',
      'get',
      'storageclass',
      target.storageClass,
      '--ignore-not-found',
      '-o',
      'name',
    ]);
    if (!sc.ok || !String(sc.stdout).includes(target.storageClass)) {
      return {
        ok: false,
        reasonCode: 'storage-class-missing',
        phase: 'preflight',
      };
    }
  }
  return { ok: true, phase: 'preflight' };
}

/**
 * @param {ReturnType<typeof observeRabbitmqInventory>} inventory
 * @param {ReturnType<typeof observeRabbitmqReady>} ready
 */
function censusOutcome(inventory, ready) {
  if (
    inventory.state === 'legacy_occupied' ||
    inventory.state === 'foreign' ||
    inventory.state === 'partial' ||
    inventory.state === 'unreadable'
  ) {
    return {
      action: 'refuse',
      state: inventory.state,
      reasonCode: inventory.reason ?? inventory.state,
      mutation: /** @type {MutationState} */ ('none'),
    };
  }
  if (inventory.state === 'recognized') {
    if (ready.ok) {
      return {
        action: 'observe',
        state: 'ready',
        reasonCode: 'repeat-ready',
        mutation: /** @type {MutationState} */ ('none'),
      };
    }
    return {
      action: 'refuse',
      state: 'recognized',
      reasonCode: ready.reason ?? 'structural-not-ready',
      mutation: /** @type {MutationState} */ ('none'),
    };
  }
  if (inventory.state === 'absent') {
    return {
      action: 'fresh',
      state: 'absent',
      reasonCode: 'fresh-absent',
      mutation: /** @type {MutationState} */ ('none'),
    };
  }
  return {
    action: 'refuse',
    state: inventory.state,
    reasonCode: inventory.reason ?? 'census-refused',
    mutation: /** @type {MutationState} */ ('none'),
  };
}

/**
 * @param {import('./inventory.mjs').PlatformRun} run
 * @param {RabbitmqProfileId} profileId
 */
function createReadRun(run, profileId) {
  return (command, args, options) => {
    if (command === 'kubectl' && args[0] !== '--context') {
      const profile = readPlatformProfile(profileId);
      return run(command, ['--context', profile.contextName, ...args], options);
    }
    return run(command, args, options);
  };
}

/**
 * @param {RabbitmqProfileId} profileId
 * @param {string} contextName
 * @param {{ run?: import('./inventory.mjs').PlatformRun, skipTargetAssert?: boolean }} [deps]
 */
export function planRabbitmqInstall(profileId, contextName, deps = {}) {
  try {
    assertInstallContext(profileId, contextName);
  } catch {
    return rabbitmqInstallResult(
      false,
      /** @type {RabbitmqProfileId} */ (profileId),
      'invocation',
      'refused',
      'none',
      'context-mismatch',
    );
  }
  assertRabbitmqRunnerEnv();
  const run = deps.run ?? runPlatformCommand;
  const target = rabbitmqTargetFromProfile(profileId);
  const readRun = createReadRun(run, profileId);
  const preflight = runPreflight(profileId, target, readRun, {
    ...deps,
    validateStorageClass: deps.skipTargetAssert === true ? false : undefined,
  });
  if (!preflight.ok) {
    return rabbitmqInstallResult(
      false,
      profileId,
      preflight.phase,
      'refused',
      'none',
      preflight.reasonCode ?? 'preflight-failed',
    );
  }
  const inventory = observeRabbitmqInventory(target, {
    run: readRun,
    skipTargetAssert: deps.skipTargetAssert,
  });
  const ready =
    inventory.state === 'recognized'
      ? observeRabbitmqReady(profileId, {
          run: readRun,
          inventory,
          skipTargetAssert: true,
        })
      : { ok: false, reason: 'not-recognized' };
  const outcome = censusOutcome(inventory, ready);
  return rabbitmqInstallResult(
    outcome.action !== 'refuse',
    profileId,
    'plan',
    outcome.state,
    outcome.mutation,
    outcome.reasonCode,
  );
}

/**
 * @param {RabbitmqProfileId} profileId
 * @param {string} contextName
 * @param {{ run?: import('./inventory.mjs').PlatformRun, skipTargetAssert?: boolean }} [deps]
 */
export function statusRabbitmqInstall(profileId, contextName, deps = {}) {
  const plan = planRabbitmqInstall(profileId, contextName, deps);
  return {
    ...plan,
    phase: 'status',
    state: plan.state === 'ready' ? 'ready' : plan.state,
  };
}

/**
 * @param {object} doc
 */
function manifestText(doc) {
  return `${stringify(doc).trimEnd()}\n---\n`;
}

/**
 * @param {object[]} objects
 * @param {string} namespaceName
 */
function splitBundleObjects(objects, namespaceName) {
  /** @type {object | null} */
  let namespaceDoc = null;
  /** @type {object[]} */
  const remainder = [];
  for (const object of objects) {
    if (
      object.kind === 'Namespace' &&
      object.metadata?.name === namespaceName
    ) {
      namespaceDoc = object;
      continue;
    }
    remainder.push(object);
  }
  return { namespaceDoc, remainder };
}

/**
 * @param {ReturnType<typeof runBoundedWithLockFd>} result
 */
function classifyWriteResult(result) {
  if (result.ok) {
    return { outcome: 'confirmed', ambiguous: false };
  }
  if (
    result.status === 409 ||
    String(result.stderr).includes('AlreadyExists')
  ) {
    return { outcome: 'refused', ambiguous: false, alreadyExists: true };
  }
  if (result.ambiguous) {
    return { outcome: 'possible', ambiguous: true };
  }
  return { outcome: 'failed', ambiguous: false };
}

/**
 * @param {{
 *   profileId: RabbitmqProfileId,
 *   target: import('./inventory.mjs').RabbitmqInventoryTarget,
 *   lockFd: number,
 *   deadlineNs: bigint,
 *   baselineUid: string,
 *   runKubectl: import('./inventory.mjs').PlatformRun,
 *   waitStage?: (name: string, ceilingMs: number, poll: () => boolean) => boolean,
 *   poll?: (ms: number) => void,
 *   writeRun?: (command: string, args: string[], options?: { input?: string, timeoutMs?: number }) => ReturnType<typeof runBoundedWithLockFd>,
 * }} ctx
 */
function runFreshInstall(ctx) {
  const {
    profileId,
    target,
    lockFd,
    deadlineNs,
    baselineUid,
    runKubectl,
    waitStage = defaultWaitStage,
    poll = () => {},
    writeRun,
  } = ctx;
  const dispatchWrite =
    writeRun ??
    ((command, args, options) =>
      runBoundedWithLockFd(lockFd, deadlineNs, command, args, options));
  /** @type {MutationState} */
  let mutation = 'none';
  let writes = 0;

  const kubectlCreate = (manifest, phase) => {
    try {
      assertBaselineNamespaceUid(profileId, baselineUid, runKubectl);
    } catch {
      return {
        ok: false,
        result: rabbitmqInstallResult(
          false,
          profileId,
          phase,
          'refused',
          mutation,
          'baseline-uid-mismatch',
        ),
      };
    }
    const remaining = remainingBudgetMs(deadlineNs);
    if (remaining < RABBITMQ_REPORTING_RESERVE_MS) {
      return {
        ok: false,
        result: rabbitmqInstallResult(
          false,
          profileId,
          phase,
          'refused',
          mutation === 'none' && writes === 0 ? 'none' : mutation,
          'budget-exhausted',
        ),
      };
    }
    const create = dispatchWrite(
      'kubectl',
      [
        '--context',
        target.contextName,
        `--request-timeout=${RABBITMQ_API_TIMEOUT_MS / 1000}s`,
        'create',
        '-f',
        '-',
      ],
      { input: manifest, timeoutMs: RABBITMQ_API_TIMEOUT_MS },
    );
    const classified = classifyWriteResult(create);
    if (classified.alreadyExists) {
      return {
        ok: false,
        result: rabbitmqInstallResult(
          false,
          profileId,
          phase,
          'refused',
          mutation,
          'already-exists',
        ),
      };
    }
    if (classified.outcome === 'possible') {
      mutation = 'possible';
      return {
        ok: false,
        result: rabbitmqInstallResult(
          false,
          profileId,
          phase,
          'failed',
          'possible',
          'ambiguous-write',
        ),
      };
    }
    if (!create.ok) {
      return {
        ok: false,
        result: rabbitmqInstallResult(
          false,
          profileId,
          phase,
          'failed',
          mutation,
          'create-failed',
        ),
      };
    }
    mutation = 'confirmed';
    writes += 1;
    return { ok: true };
  };

  const certBundle = loadVendorBundle('cert-manager');
  const operatorBundle = loadVendorBundle('cluster-operator');
  const certParts = splitBundleObjects(
    certBundle.objects,
    CERT_MANAGER_NAMESPACE,
  );
  if (!certParts.namespaceDoc) {
    return rabbitmqInstallResult(
      false,
      profileId,
      'cert-manager',
      'refused',
      mutation,
      'cert-manager-namespace-missing',
    );
  }

  certParts.namespaceDoc.metadata ??= {};
  certParts.namespaceDoc.metadata.labels ??= {};
  certParts.namespaceDoc.metadata.labels[NATIVE_DESIGN_LABEL] =
    NATIVE_DESIGN_VALUE;

  let step = kubectlCreate(
    manifestText(certParts.namespaceDoc),
    'cert-manager',
  );
  if (!step.ok) return step.result;
  for (const object of certParts.remainder) {
    step = kubectlCreate(manifestText(object), 'cert-manager');
    if (!step.ok) return step.result;
  }

  if (
    !waitStage('cert-manager', STAGE_DEPENDENCY_CEILING_MS, () =>
      pollCertManagerReady(target, runKubectl),
    )
  ) {
    return rabbitmqInstallResult(
      false,
      profileId,
      'cert-manager',
      'failed',
      mutation,
      'cert-manager-not-ready',
    );
  }

  const operatorParts = splitBundleObjects(
    operatorBundle.objects,
    'rabbitmq-system',
  );
  if (!operatorParts.namespaceDoc) {
    return rabbitmqInstallResult(
      false,
      profileId,
      'operator',
      'refused',
      mutation,
      'operator-namespace-missing',
    );
  }
  operatorParts.namespaceDoc.metadata ??= {};
  operatorParts.namespaceDoc.metadata.labels ??= {};
  operatorParts.namespaceDoc.metadata.labels[NATIVE_DESIGN_LABEL] =
    NATIVE_DESIGN_VALUE;

  step = kubectlCreate(manifestText(operatorParts.namespaceDoc), 'operator');
  if (!step.ok) return step.result;
  for (const object of operatorParts.remainder) {
    step = kubectlCreate(manifestText(object), 'operator');
    if (!step.ok) return step.result;
  }

  if (!refreshDiscovery(target, runKubectl)) {
    return rabbitmqInstallResult(
      false,
      profileId,
      'operator',
      'failed',
      mutation,
      'discovery-refresh-failed',
    );
  }

  if (
    !waitStage('operator', STAGE_DEPENDENCY_CEILING_MS, () =>
      pollOperatorReady(target, runKubectl),
    )
  ) {
    return rabbitmqInstallResult(
      false,
      profileId,
      'operator',
      'failed',
      mutation,
      'operator-not-ready',
    );
  }

  const brokerNamespaceDoc = renderPlatformDocuments(
    { service: 'rabbitmq', profile: profileId, section: 'namespace' },
    { chartRoot },
  )[0];
  const brokerDoc = renderPlatformDocuments(
    { service: 'rabbitmq', profile: profileId, section: 'broker' },
    { chartRoot },
  )[0];
  brokerDoc.metadata ??= {};
  brokerDoc.metadata.labels ??= {};
  brokerDoc.metadata.labels[NATIVE_DESIGN_LABEL] = NATIVE_DESIGN_VALUE;

  step = kubectlCreate(renderPlatformYaml([brokerNamespaceDoc]), 'broker');
  if (!step.ok) return step.result;

  const dryRun = dispatchWrite(
    'kubectl',
    [
      '--context',
      target.contextName,
      `--request-timeout=${RABBITMQ_API_TIMEOUT_MS / 1000}s`,
      'create',
      '--dry-run=server',
      '-f',
      '-',
    ],
    {
      input: renderPlatformYaml([brokerDoc]),
      timeoutMs: RABBITMQ_API_TIMEOUT_MS,
    },
  );
  if (!dryRun.ok) {
    const classified = classifyWriteResult(dryRun);
    return rabbitmqInstallResult(
      false,
      profileId,
      'broker',
      'refused',
      classified.outcome === 'possible' ? 'possible' : mutation,
      classified.outcome === 'possible'
        ? 'ambiguous-dry-run'
        : 'broker-dry-run-failed',
    );
  }

  step = kubectlCreate(renderPlatformYaml([brokerDoc]), 'broker');
  if (!step.ok) return step.result;

  if (
    !waitStage('broker', STAGE_BROKER_CEILING_MS, () => {
      const ready = observeRabbitmqReady(profileId, {
        run: runKubectl,
        skipTargetAssert: true,
      });
      return ready.ok;
    })
  ) {
    return rabbitmqInstallResult(
      false,
      profileId,
      'broker',
      'failed',
      mutation,
      'broker-not-ready',
    );
  }
  poll(0);
  return rabbitmqInstallResult(
    true,
    profileId,
    'complete',
    'ready',
    'confirmed',
    'fresh-installed',
  );
}

/**
 * @param {string} name
 * @param {number} ceilingMs
 * @param {() => boolean} poll
 */
function defaultWaitStage(name, ceilingMs, poll) {
  const start = Date.now();
  while (Date.now() - start < ceilingMs) {
    if (poll()) {
      return true;
    }
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 500);
  }
  return false;
}

/**
 * @param {import('./inventory.mjs').RabbitmqInventoryTarget} target
 * @param {import('./inventory.mjs').PlatformRun} run
 */
function pollCertManagerReady(target, run) {
  for (const crd of CERT_MANAGER_CRDS) {
    const read = run('kubectl', [
      'get',
      'crd',
      crd,
      '-o',
      'jsonpath={.status.conditions[?(@.type=="Established")].status}',
    ]);
    if (!read.ok || read.stdout.trim() !== 'True') {
      return false;
    }
  }
  for (const deployment of CERT_MANAGER_DEPLOYMENTS) {
    const ready = run('kubectl', [
      '-n',
      CERT_MANAGER_NAMESPACE,
      'get',
      'deployment',
      deployment,
      '-o',
      'jsonpath={.status.availableReplicas}',
    ]);
    if (!ready.ok || ready.stdout.trim() !== '1') {
      return false;
    }
  }
  return true;
}

/**
 * @param {import('./inventory.mjs').RabbitmqInventoryTarget} target
 * @param {import('./inventory.mjs').PlatformRun} run
 */
function pollOperatorReady(target, run) {
  const crd = run('kubectl', [
    'get',
    'crd',
    OPERATOR_CRD,
    '-o',
    'jsonpath={.status.conditions[?(@.type=="Established")].status}',
  ]);
  if (!crd.ok || crd.stdout.trim() !== 'True') {
    return false;
  }
  const cert = run('kubectl', [
    '-n',
    'rabbitmq-system',
    'get',
    'certificate',
    'cluster-operator-serving-cert',
    '-o',
    'jsonpath={.status.conditions[?(@.type=="Ready")].status}',
  ]);
  if (!cert.ok || cert.stdout.trim() !== 'True') {
    return false;
  }
  const issuer = run('kubectl', [
    '-n',
    'rabbitmq-system',
    'get',
    'issuer',
    'selfsigned-issuer',
    '-o',
    'jsonpath={.status.conditions[?(@.type=="Ready")].status}',
  ]);
  if (!issuer.ok || issuer.stdout.trim() !== 'True') {
    return false;
  }
  const deployment = run('kubectl', [
    '-n',
    'rabbitmq-system',
    'get',
    'deployment',
    'rabbitmq-cluster-operator',
    '-o',
    'jsonpath={.status.availableReplicas}',
  ]);
  return deployment.ok && deployment.stdout.trim() === '1';
}

/**
 * @param {import('./inventory.mjs').RabbitmqInventoryTarget} target
 * @param {import('./inventory.mjs').PlatformRun} run
 */
function refreshDiscovery(target, run) {
  // Explicit context and the version URL. A fixed cache directory would
  // ignore the selected cluster and write outside this run's custody.
  for (const [group, version] of [
    ['cert-manager.io', 'v1'],
    ['rabbitmq.com', 'v1beta1'],
  ]) {
    const discovered = discoverApiVersion(target, group, version, run);
    if (discovered.state !== 'present') return false;
  }
  return true;
}

/**
 * @param {RabbitmqProfileId} profileId
 * @param {string} contextName
 * @param {bigint} workerDeadline
 * @param {number} lockFd
 * @param {{ run?: import('./inventory.mjs').PlatformRun, skipWaits?: boolean, skipTargetAssert?: boolean, waitStage?: typeof defaultWaitStage, libPath?: string, baselineUid?: string, observeInventory?: (target: import('./inventory.mjs').RabbitmqInventoryTarget) => ReturnType<typeof observeRabbitmqInventory>, observeReady?: (profileId: RabbitmqProfileId) => ReturnType<typeof observeRabbitmqReady> }} [deps]
 */
export function lockedEnsureRabbitmq(
  profileId,
  contextName,
  workerDeadline,
  lockFd,
  deps = {},
) {
  assertInstallContext(profileId, contextName);
  assertRabbitmqRunnerEnv();
  if (process.env.OFFSCREEN_RABBITMQ_ENSURE !== 'authorized') {
    return rabbitmqInstallResult(
      false,
      profileId,
      'authorization',
      'refused',
      'none',
      'ensure-not-authorized',
    );
  }
  assertInheritedLockFd(lockFd);
  const run =
    deps.run ??
    ((command, args, options) =>
      runBoundedWithLockFd(lockFd, workerDeadline, command, args, options));
  const readRun = createReadRun(run, profileId);
  const target = rabbitmqTargetFromProfile(profileId);
  const baselineUid =
    typeof deps.baselineUid === 'string'
      ? deps.baselineUid
      : readBaselineNamespaceUid(profileId, readRun);
  const preflight = runPreflight(profileId, target, readRun, deps);
  if (!preflight.ok) {
    return rabbitmqInstallResult(
      false,
      profileId,
      preflight.phase,
      'refused',
      'none',
      preflight.reasonCode ?? 'preflight-failed',
    );
  }

  const inventoryBefore = deps.observeInventory
    ? deps.observeInventory(target)
    : observeRabbitmqInventory(target, {
        run: readRun,
        skipTargetAssert: true,
      });
  const readyBefore =
    inventoryBefore.state === 'recognized'
      ? deps.observeReady
        ? deps.observeReady(profileId)
        : observeRabbitmqReady(profileId, {
            run: readRun,
            inventory: inventoryBefore,
            skipTargetAssert: true,
          })
      : { ok: false, reason: 'not-recognized' };
  const admission = censusOutcome(inventoryBefore, readyBefore);
  if (admission.action === 'observe') {
    return rabbitmqInstallResult(
      true,
      profileId,
      'ensure',
      'ready',
      'none',
      admission.reasonCode,
    );
  }
  if (admission.action === 'refuse') {
    return rabbitmqInstallResult(
      false,
      profileId,
      'ensure',
      admission.state,
      admission.mutation,
      admission.reasonCode,
    );
  }

  const waitStage = deps.skipWaits
    ? () => true
    : (deps.waitStage ?? defaultWaitStage);

  return runFreshInstall({
    profileId,
    target,
    lockFd,
    deadlineNs: workerDeadline,
    baselineUid,
    runKubectl: readRun,
    waitStage,
    writeRun: deps.run
      ? (command, args, options) => deps.run(command, args, options)
      : undefined,
  });
}

/**
 * @param {RabbitmqProfileId} profileId
 * @param {string} contextName
 * @param {{ run?: import('./inventory.mjs').PlatformRun, commonDir?: string, skipWaits?: boolean }} [deps]
 */
export function ensureRabbitmqInstall(profileId, contextName, deps = {}) {
  try {
    assertInstallContext(profileId, contextName);
  } catch {
    return rabbitmqInstallResult(
      false,
      profileId,
      'invocation',
      'refused',
      'none',
      'context-mismatch',
    );
  }
  assertRabbitmqRunnerEnv();
  if (process.env.OFFSCREEN_RABBITMQ_ENSURE !== 'authorized') {
    return rabbitmqInstallResult(
      false,
      profileId,
      'authorization',
      'refused',
      'none',
      'ensure-not-authorized',
    );
  }

  const overallStart = process.hrtime.bigint();
  const overallDeadline =
    overallStart + BigInt(RABBITMQ_ENSURE_BUDGET_MS) * 1_000_000n;
  if (remainingBudgetMs(overallDeadline) <= RABBITMQ_REPORTING_RESERVE_MS) {
    return rabbitmqInstallResult(
      false,
      profileId,
      'launcher',
      'refused',
      'none',
      'budget-expired',
    );
  }

  const lock = acquireRabbitmqLock(contextName, deps);
  try {
    const workerDeadline = workerDeadlineNs(overallDeadline);
    const workerArgs = [
      'locked-ensure',
      profileId,
      contextName,
      workerDeadline.toString(),
    ];
    const spawnTimeout = Math.max(
      1,
      remainingBudgetMs(workerDeadline) + RABBITMQ_REPORTING_RESERVE_MS,
    );
    const worker = spawnSync(
      process.execPath,
      [installModulePath, ...workerArgs],
      {
        stdio: ['ignore', 'pipe', 'pipe', lock.lockFd],
        env: process.env,
        timeout: spawnTimeout,
        killSignal: 'SIGKILL',
        encoding: 'utf8',
        windowsHide: true,
      },
    );
    const line = String(worker.stdout ?? '')
      .trim()
      .split('\n')
      .filter(Boolean)
      .at(-1);
    if (!line) {
      return rabbitmqInstallResult(
        false,
        profileId,
        'launcher',
        'failed',
        'possible',
        'worker-receipt-missing',
      );
    }
    try {
      const parsed = JSON.parse(line);
      if (parsed?.schema !== 1) {
        return rabbitmqInstallResult(
          false,
          profileId,
          'launcher',
          'failed',
          'possible',
          'worker-receipt-malformed',
        );
      }
      if (
        worker.signal === 'SIGKILL' ||
        worker.status == null ||
        worker.error
      ) {
        return {
          ...parsed,
          ok: false,
          mutation: parsed.mutation === 'none' ? 'possible' : parsed.mutation,
          reasonCode: parsed.reasonCode ?? 'worker-terminated',
        };
      }
      return parsed;
    } catch {
      return rabbitmqInstallResult(
        false,
        profileId,
        'launcher',
        'failed',
        'possible',
        'worker-receipt-malformed',
      );
    }
  } finally {
    lock.release();
  }
}

/**
 * @param {string[]} argv
 * @param {object} [deps]
 */
export function runRabbitmqInstallLifecycle(argv, deps = {}) {
  const [command, profileId, contextName, extra] = argv;
  if (command === 'locked-ensure') {
    const workerDeadline = BigInt(extra ?? '0');
    const lockFd = 3;
    const result = lockedEnsureRabbitmq(
      /** @type {RabbitmqProfileId} */ (profileId),
      contextName,
      workerDeadline,
      lockFd,
      deps,
    );
    process.stdout.write(`${JSON.stringify(result)}\n`);
    return result.ok ? 0 : 1;
  }

  if (
    extra !== undefined ||
    (command !== 'plan' && command !== 'ensure' && command !== 'status') ||
    (profileId !== 'dev' && profileId !== 'release') ||
    typeof contextName !== 'string' ||
    contextName.length === 0
  ) {
    const invalid = rabbitmqInstallResult(
      false,
      /** @type {RabbitmqProfileId} */ (profileId ?? 'dev'),
      'invocation',
      'refused',
      'none',
      'invalid-invocation',
    );
    process.stdout.write(`${JSON.stringify(invalid)}\n`);
    return 2;
  }

  if (command === 'plan') {
    const result = planRabbitmqInstall(
      /** @type {RabbitmqProfileId} */ (profileId),
      contextName,
      deps,
    );
    process.stdout.write(`${JSON.stringify(result)}\n`);
    return exitCodeForResult(argv, result);
  }
  if (command === 'status') {
    const result = statusRabbitmqInstall(
      /** @type {RabbitmqProfileId} */ (profileId),
      contextName,
      deps,
    );
    process.stdout.write(`${JSON.stringify(result)}\n`);
    return exitCodeForResult(argv, result);
  }
  const result = ensureRabbitmqInstall(
    /** @type {RabbitmqProfileId} */ (profileId),
    contextName,
    deps,
  );
  process.stdout.write(`${JSON.stringify(result)}\n`);
  return exitCodeForResult(argv, result);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  try {
    const code = runRabbitmqInstallLifecycle(process.argv.slice(2));
    process.exitCode = code;
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'rabbitmq install failed';
    const fallback = rabbitmqInstallResult(
      false,
      'dev',
      'invocation',
      'refused',
      'none',
      'invalid-invocation',
    );
    process.stdout.write(
      `${JSON.stringify({ ...fallback, detail: message })}\n`,
    );
    process.stderr.write('rabbitmq install invocation refused\n');
    process.exitCode = 2;
  }
}
