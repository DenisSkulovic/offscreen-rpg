import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import process from 'node:process';
import { verifyManifestBytes } from '../common/pins.mjs';
import { readPlatformObject, runPlatformCommand } from '../common/commands.mjs';
import {
  renderPlatformDocuments,
  renderPlatformYaml,
} from '../common/render.mjs';
import { readPlatformProfile } from '../common/profile.mjs';
import {
  RELEASE_CNPG_CLUSTER,
  RELEASE_CNPG_NAMESPACE,
  parseCnpgPin,
} from './dev-bootstrap.mjs';

const postgresRoot = dirname(fileURLToPath(import.meta.url));
const operatorPinPath = join(postgresRoot, 'operator.pin');
const releaseProfile = readPlatformProfile('release');

export const RELEASE_CNPG_CONTEXT = releaseProfile.contextName;
export const RELEASE_CNPG_CLUSTER_NAME = releaseProfile.clusterName;
export const RELEASE_LAB_LABEL_KEY = 'offscreen.rpg/lab';
export const RELEASE_LAB_LABEL_VALUE = 'disposable';
export const RELEASE_CNPG_MIN_MEMORY_MIB = 4096;
export const RELEASE_OPERATOR_FIELD_MANAGER = 'offscreen-lab-cnpg';

export function assertReleaseClusterPin(documents, pin) {
  if (documents.length !== 1 || documents[0]?.kind !== 'Cluster' ||
      documents[0]?.metadata?.name !== RELEASE_CNPG_CLUSTER ||
      documents[0]?.metadata?.namespace !== RELEASE_CNPG_NAMESPACE) {
    throw new Error('unexpected rendered release PostgreSQL cluster identity');
  }
  const spec = documents[0].spec;
  if (spec?.imageName !== pin.postgresImage) {
    throw new Error('rendered cluster imageName does not match operator.pin');
  }
  if (spec?.instances !== 1) {
    throw new Error('rendered cluster must request one instance');
  }
}

/**
 * @param {{ run?: typeof runPlatformCommand }} [deps]
 */
function renderReleaseManifests(deps = {}) {
  const run = deps.run ?? runPlatformCommand;
  const namespaceDocs = renderPlatformDocuments(
    { service: 'postgres', profile: 'release', section: 'namespace' },
    { run },
  );
  const clusterDocs = renderPlatformDocuments(
    { service: 'postgres', profile: 'release', section: 'cluster' },
    { run },
  );
  assertReleaseClusterPin(clusterDocs, parseCnpgPin(readFileSync(operatorPinPath, 'utf8')));
  return {
    namespaceManifest: renderPlatformYaml(namespaceDocs),
    clusterManifest: renderPlatformYaml(clusterDocs),
    expectedCluster: clusterDocs[0],
  };
}

/**
 * @param {object | undefined} resource
 * @returns {'absent' | 'compatible' | 'foreign'}
 */
function classifyNamespace(resource) {
  if (!resource) return 'absent';
  if (
    resource.name === RELEASE_CNPG_NAMESPACE &&
    resource.labLabel === RELEASE_LAB_LABEL_VALUE
  ) {
    return 'compatible';
  }
  return 'foreign';
}

/**
 * @param {object | undefined} resource
 * @param {object} expected
 * @returns {'absent' | 'compatible' | 'foreign'}
 */
function classifyCluster(resource, expected) {
  if (!resource) return 'absent';
  const initdb = expected.spec?.bootstrap?.initdb;
  const storage = expected.spec?.storage;
  const matches =
    resource.name === RELEASE_CNPG_CLUSTER &&
    resource.namespace === RELEASE_CNPG_NAMESPACE &&
    resource.instances === expected.spec?.instances &&
    resource.image === expected.spec?.imageName &&
    resource.storageClass === storage?.storageClass &&
    resource.storageSize === storage?.size &&
    resource.bootstrap?.database === initdb?.database &&
    resource.bootstrap?.owner === initdb?.owner &&
    resource.bootstrap?.localeCType === initdb?.localeCType &&
    resource.bootstrap?.localeCollate === initdb?.localeCollate;
  return matches ? 'compatible' : 'foreign';
}

/**
 * @param {object} probe
 * @param {object} expectedCluster
 */
export function assessReleaseCnpg(probe, expectedCluster) {
  /** @type {{ id: string, detail: string }[]} */
  const refusals = [];
  const unreadable = probe.unreadableReads ?? [];
  if (unreadable.length > 0) {
    refusals.push({
      id: 'unreadable-observation',
      detail: unreadable.map((item) => item.id).join(', '),
    });
  }
  if (probe.context !== RELEASE_CNPG_CONTEXT) {
    refusals.push({
      id: 'wrong-context',
      detail: `kubectl context is ${probe.context ?? 'unset'}`,
    });
  }
  if (probe.clusterName !== RELEASE_CNPG_CLUSTER_NAME) {
    refusals.push({
      id: 'wrong-cluster',
      detail: `cluster is ${probe.clusterName ?? 'unset'}`,
    });
  }
  if (
    probe.apiServer &&
    !String(probe.apiServer).startsWith('https://127.0.0.1:')
  ) {
    refusals.push({
      id: 'api-not-loopback',
      detail: 'release API is not a loopback endpoint',
    });
  }
  if ((probe.timedOutCommands ?? []).length > 0) {
    refusals.push({
      id: 'command-timeout',
      detail: probe.timedOutCommands.join(', '),
    });
  }
  if ((probe.memoryMiB ?? 0) < RELEASE_CNPG_MIN_MEMORY_MIB) {
    refusals.push({
      id: 'insufficient-memory',
      detail: `available memory ${probe.memoryMiB ?? 0}MiB is below ${RELEASE_CNPG_MIN_MEMORY_MIB}MiB`,
    });
  }
  let pin = probe.pin ?? null;
  if (
    !pin ||
    !/^[0-9a-f]{64}$/.test(pin.sha256 ?? '') ||
    !pin.operatorImage ||
    !pin.postgresImage
  ) {
    refusals.push({
      id: 'unverified-pin',
      detail: 'CNPG operator pin is missing or invalid',
    });
    pin = null;
  }
  const resources = probe.resources ?? [];
  const namespace = resources.find(
    (item) => item.kind === 'Namespace' && item.name === RELEASE_CNPG_NAMESPACE,
  );
  const cluster = resources.find(
    (item) => item.kind === 'Cluster' && item.name === RELEASE_CNPG_CLUSTER,
  );
  const operator = resources.find(
    (item) =>
      item.kind === 'Deployment' && item.name === 'cnpg-controller-manager',
  );
  if (classifyNamespace(namespace) === 'foreign') {
    refusals.push({
      id: 'foreign-namespace',
      detail: `${RELEASE_CNPG_NAMESPACE} exists without the disposable lab label`,
    });
  }
  const clusterState = classifyCluster(cluster, expectedCluster);
  if (clusterState === 'foreign') {
    refusals.push({
      id: 'cluster-spec-mismatch',
      detail: `${RELEASE_CNPG_CLUSTER} exists with incompatible image, storage, or bootstrap identity`,
    });
  }
  if (operator && pin && operator.image !== pin.operatorImage) {
    refusals.push({
      id: 'operator-image-mismatch',
      detail: `operator image is ${operator.image}`,
    });
  }
  const crdState = probe.crdState ?? 'unknown';
  if (crdState === 'present' && !operator) {
    refusals.push({
      id: 'crd-without-operator',
      detail:
        'clusters.postgresql.cnpg.io CRD is present but the operator deployment is absent',
    });
  }
  return {
    refusals,
    pin,
    namespace: classifyNamespace(namespace),
    cluster: clusterState,
    operatorPresent: Boolean(operator),
    operatorMatches: Boolean(
      operator && pin && operator.image === pin.operatorImage,
    ),
    crdState,
  };
}

/**
 * @param {object} probe
 * @param {{ run?: typeof runPlatformCommand }} [deps]
 */
export function planReleaseCnpg(probe, deps = {}) {
  const manifests = renderReleaseManifests(deps);
  const assessment = assessReleaseCnpg(probe, manifests.expectedCluster);
  return {
    mode: 'plan',
    readOnly: true,
    context: RELEASE_CNPG_CONTEXT,
    namespace: RELEASE_CNPG_NAMESPACE,
    cluster: RELEASE_CNPG_CLUSTER,
    operatorImage: assessment.pin?.operatorImage ?? null,
    postgresImage: assessment.pin?.postgresImage ?? null,
    namespaceManifest: manifests.namespaceManifest,
    clusterManifest: manifests.clusterManifest,
    namespaceState: assessment.namespace,
    clusterState: assessment.cluster,
    refusals: assessment.refusals,
    actions: [],
  };
}

/**
 * @param {object} probe
 * @param {{ authorize?: boolean, operatorManifestSha256?: string, failOperatorWaits?: boolean, failClusterWait?: boolean, run?: typeof runPlatformCommand }} [options]
 */
export function ensureReleaseCnpg(probe, options = {}) {
  const deps = { run: options.run ?? runPlatformCommand };
  const plan = planReleaseCnpg(probe, deps);
  if (!options.authorize) {
    return {
      ...plan,
      mode: 'ensure',
      readOnly: false,
      ok: false,
      mutated: false,
      refusals: [
        ...plan.refusals,
        {
          id: 'ensure-not-authorized',
          detail: 'live CNPG release install was not authorized',
        },
      ],
    };
  }
  if (plan.refusals.length > 0) {
    return {
      ...plan,
      mode: 'ensure',
      readOnly: false,
      ok: false,
      mutated: false,
    };
  }
  if (
    options.operatorManifestSha256 &&
    options.operatorManifestSha256 !== probe.pin?.sha256
  ) {
    return {
      ...plan,
      mode: 'ensure',
      readOnly: false,
      ok: false,
      mutated: false,
      refusals: [
        {
          id: 'operator-manifest-sha-mismatch',
          detail: 'downloaded operator manifest does not match operator.pin',
        },
      ],
    };
  }
  const assessment = assessReleaseCnpg(
    probe,
    renderReleaseManifests(deps).expectedCluster,
  );
  if (
    assessment.namespace === 'compatible' &&
    assessment.cluster === 'compatible' &&
    assessment.operatorMatches
  ) {
    /** @type {{ op: string, context: string }[]} */
    const waits = [
      { op: 'verify-operator', context: RELEASE_CNPG_CONTEXT },
      { op: 'wait-webhook-endpoint', context: RELEASE_CNPG_CONTEXT },
      { op: 'wait-cluster-ready', context: RELEASE_CNPG_CONTEXT },
    ];
    return {
      ...plan,
      mode: 'ensure',
      readOnly: false,
      ok: true,
      mutated: false,
      actions: waits,
    };
  }
  /** @type {{ op: string, context: string, [key: string]: unknown }[]} */
  const actions = [];
  const needsOperatorApply = !assessment.operatorMatches;
  if (!needsOperatorApply) {
    actions.push({
      op: 'verify-operator',
      context: RELEASE_CNPG_CONTEXT,
      image: plan.operatorImage,
    });
  } else if (assessment.crdState === 'present' && !assessment.operatorPresent) {
    return {
      ...plan,
      mode: 'ensure',
      readOnly: false,
      ok: false,
      mutated: false,
      refusals: [
        {
          id: 'crd-without-operator',
          detail:
            'clusters.postgresql.cnpg.io CRD is present but the operator deployment is absent',
        },
      ],
      actions: [],
    };
  } else {
    actions.push({
      op: 'apply-operator',
      context: RELEASE_CNPG_CONTEXT,
      image: plan.operatorImage,
      sha256: probe.pin.sha256,
      args: [
        '--context',
        RELEASE_CNPG_CONTEXT,
        'apply',
        '--server-side',
        `--field-manager=${RELEASE_OPERATOR_FIELD_MANAGER}`,
        '-f',
        '-',
      ],
    });
    actions.push({
      op: 'wait-established-crd',
      context: RELEASE_CNPG_CONTEXT,
      args: [
        'wait',
        '--for=condition=Established',
        'crd/clusters.postgresql.cnpg.io',
        '--timeout=180s',
      ],
    });
    actions.push({
      op: 'wait-operator-rollout',
      context: RELEASE_CNPG_CONTEXT,
      args: [
        '-n',
        'cnpg-system',
        'rollout',
        'status',
        'deployment/cnpg-controller-manager',
        '--timeout=240s',
      ],
    });
  }
  if (options.failOperatorWaits) {
    return {
      ...plan,
      mode: 'ensure',
      readOnly: false,
      ok: false,
      mutated: true,
      refusals: [
        {
          id: 'operator-readiness-failed',
          detail: 'operator CRD or rollout did not become ready',
        },
      ],
      actions,
    };
  }
  actions.push({ op: 'wait-webhook-endpoint', context: RELEASE_CNPG_CONTEXT });
  if (assessment.namespace !== 'compatible') {
    actions.push({
      op: 'apply-namespace',
      context: RELEASE_CNPG_CONTEXT,
      manifest: plan.namespaceManifest,
      args: ['--context', RELEASE_CNPG_CONTEXT, 'apply', '-f', '-'],
    });
  }
  if (assessment.cluster !== 'compatible') {
    actions.push({
      op: 'apply-cluster',
      context: RELEASE_CNPG_CONTEXT,
      manifest: plan.clusterManifest,
      args: ['--context', RELEASE_CNPG_CONTEXT, 'apply', '-f', '-'],
    });
  }
  actions.push({ op: 'wait-cluster-ready', context: RELEASE_CNPG_CONTEXT });
  if (options.failClusterWait) {
    return {
      ...plan,
      mode: 'ensure',
      readOnly: false,
      ok: false,
      mutated: actions.some((action) => action.op.startsWith('apply-')),
      refusals: [
        {
          id: 'cluster-readiness-failed',
          detail: 'cluster did not reach healthy ready state',
        },
      ],
      actions,
    };
  }
  return {
    ...plan,
    mode: 'ensure',
    readOnly: false,
    ok: true,
    mutated: actions.some((action) => action.op.startsWith('apply-')),
    actions,
  };
}

/**
 * @param {{
 *   collect: () => object,
 *   run: (command: string, args: string[], options?: { input?: string, timeoutMs?: number }) => { ok: boolean, stdout?: string, stderr?: string },
 *   readOperatorManifest?: () => { body: string, sha256: string },
 *   sleep?: (ms: number) => void,
 * }} deps
 */
export function executeAuthorizedReleaseCnpg(deps) {
  const first = deps.collect();
  const decision = ensureReleaseCnpg(first, { authorize: true });
  if (
    !decision.ok &&
    decision.refusals.some((item) => item.id !== 'ensure-not-authorized')
  ) {
    return { ...decision, mutated: false };
  }
  if (!decision.ok) {
    return { ...decision, mutated: false };
  }
  const needsOperatorManifest = decision.actions.some(
    (action) => action.op === 'apply-operator',
  );
  const manifest =
    needsOperatorManifest && deps.readOperatorManifest
      ? deps.readOperatorManifest()
      : { body: '', sha256: first.pin?.sha256 ?? '' };
  if (
    needsOperatorManifest &&
    (manifest.sha256 !== first.pin?.sha256 ||
      !manifest.body.includes(`image: ${first.pin.operatorImage}`))
  ) {
    return {
      ...decision,
      ok: false,
      mutated: false,
      refusals: [
        {
          id: 'operator-manifest-sha-mismatch',
          detail: 'downloaded operator manifest does not match operator.pin',
        },
      ],
      actions: [],
    };
  }
  const again = deps.collect();
  const recheck = ensureReleaseCnpg(again, {
    authorize: true,
    operatorManifestSha256: manifest.sha256,
  });
  if (!recheck.ok) {
    return { ...recheck, mutated: false };
  }
  const completed = [];
  for (const action of recheck.actions) {
    if (action.op === 'verify-operator' || action.op === 'noop') {
      completed.push(action);
      continue;
    }
    if (
      action.op === 'wait-established-crd' ||
      action.op === 'wait-operator-rollout'
    ) {
      const waited = deps.run(
        'kubectl',
        ['--context', RELEASE_CNPG_CONTEXT, ...action.args],
        { timeoutMs: 260000 },
      );
      completed.push(action);
      if (!waited.ok) {
        return {
          ...recheck,
          ok: false,
          mutated: true,
          refusals: [
            {
              id: `${action.op}-failed`,
              detail: waited.stderr || `${action.op} failed`,
            },
          ],
          actions: completed,
        };
      }
      continue;
    }
    if (action.op === 'wait-webhook-endpoint') {
      let ready = false;
      for (let attempt = 0; attempt < 60; attempt += 1) {
        const endpoints = deps.run('kubectl', [
          '--context',
          RELEASE_CNPG_CONTEXT,
          '-n',
          'cnpg-system',
          'get',
          'endpoints',
          'cnpg-webhook-service',
          '-o',
          'jsonpath={.subsets[0].addresses[0].ip}',
        ]);
        if (endpoints.ok && String(endpoints.stdout ?? '').trim().length > 0) {
          ready = true;
          break;
        }
        if (deps.sleep) deps.sleep(2000);
      }
      completed.push(action);
      if (!ready) {
        return {
          ...recheck,
          ok: false,
          mutated: completed.some((item) => item.op?.startsWith('apply-')),
          refusals: [
            {
              id: 'webhook-endpoint-missing',
              detail: 'CloudNativePG webhook has no endpoint',
            },
          ],
          actions: completed,
        };
      }
      continue;
    }
    if (action.op === 'wait-cluster-ready') {
      const deadline = Date.now() + 600_000;
      let phase = '';
      let ready = '';
      while (Date.now() < deadline) {
        const phaseResult = deps.run('kubectl', [
          '--context',
          RELEASE_CNPG_CONTEXT,
          '-n',
          RELEASE_CNPG_NAMESPACE,
          'get',
          'cluster',
          RELEASE_CNPG_CLUSTER,
          '-o',
          `jsonpath={.status.phase}`,
        ]);
        const readyResult = deps.run('kubectl', [
          '--context',
          RELEASE_CNPG_CONTEXT,
          '-n',
          RELEASE_CNPG_NAMESPACE,
          'get',
          'cluster',
          RELEASE_CNPG_CLUSTER,
          '-o',
          "jsonpath={range .status.conditions[?(@.type=='Ready')]}{.status}{end}",
        ]);
        phase = String(phaseResult.stdout ?? '').trim();
        ready = String(readyResult.stdout ?? '').trim();
        if (phase === 'Cluster in healthy state' && ready === 'True') {
          break;
        }
        if (deps.sleep) deps.sleep(5000);
      }
      completed.push(action);
      if (phase !== 'Cluster in healthy state' || ready !== 'True') {
        return {
          ...recheck,
          ok: false,
          mutated: completed.some((item) => item.op?.startsWith('apply-')),
          refusals: [
            {
              id: 'cluster-readiness-failed',
              detail: `phase=${phase || 'unknown'} ready=${ready || 'unknown'}`,
            },
          ],
          actions: completed,
        };
      }
      continue;
    }
    let applyResult = deps.run('kubectl', action.args, {
      input: action.op === 'apply-operator' ? manifest.body : action.manifest,
      timeoutMs: action.op === 'apply-operator' ? 180000 : 60000,
    });
    if (!applyResult.ok && action.op === 'apply-cluster') {
      for (let attempt = 0; attempt < 12 && !applyResult.ok; attempt += 1) {
        if (deps.sleep) deps.sleep(5000);
        applyResult = deps.run('kubectl', action.args, {
          input: action.manifest,
          timeoutMs: 60000,
        });
      }
    }
    completed.push(action);
    if (!applyResult.ok) {
      return {
        ...recheck,
        ok: false,
        mutated: true,
        refusals: [
          {
            id: `${action.op}-failed`,
            detail: applyResult.stderr || `${action.op} failed`,
          },
        ],
        actions: completed,
      };
    }
  }
  const instances = deps.run('kubectl', [
    '--context',
    RELEASE_CNPG_CONTEXT,
    '-n',
    RELEASE_CNPG_NAMESPACE,
    'get',
    'cluster',
    RELEASE_CNPG_CLUSTER,
    '-o',
    'jsonpath={.spec.instances}',
  ]);
  if (!instances.ok || String(instances.stdout ?? '').trim() !== '1') {
    return {
      ...recheck,
      ok: false,
      mutated: completed.some((item) => item.op?.startsWith('apply-')),
      refusals: [
        {
          id: 'cluster-instance-mismatch',
          detail: `lab-pg instances is ${String(instances.stdout ?? '').trim() || 'unknown'}, expected 1`,
        },
      ],
      actions: completed,
    };
  }
  return {
    ...recheck,
    ok: true,
    mutated: completed.some((item) => item.op?.startsWith('apply-')),
    actions: completed,
    phase: 'Cluster in healthy state',
    instances: '1',
  };
}

/**
 * @param {ReturnType<typeof readPlatformObject>} observation
 * @param {string} id
 * @param {{ id: string, reason: string }[]} unreadableReads
 * @returns {'absent' | 'present' | 'unreadable'}
 */
function observeState(observation, id, unreadableReads) {
  if (observation.state === 'unreadable') {
    unreadableReads.push({ id, reason: observation.reason });
    return 'unreadable';
  }
  if (observation.state === 'absent') return 'absent';
  return 'present';
}

/**
 * @param {(command: string, args: string[], options?: { timeoutMs?: number }) => ReturnType<typeof runPlatformCommand>} run
 */
function platformRead(run) {
  return (spec) => readPlatformObject(spec, { run });
}

/**
 * @param {{ run?: typeof runPlatformCommand, readMeminfo?: () => string, readPin?: () => string }} [deps]
 */
export function collectReleaseCnpgProbe(deps = {}) {
  const timedOutCommands = [];
  const kubectlRun = (command, args, options = {}) => {
    const result = deps.run
      ? deps.run(command, args, { timeoutMs: options.timeoutMs ?? 15000 })
      : runPlatformCommand(command, args, {
          timeoutMs: options.timeoutMs ?? 15000,
        });
    if (result.timedOut) timedOutCommands.push(command);
    return result;
  };
  const read = platformRead(kubectlRun);

  const kind = kubectlRun('kind', ['get', 'clusters'], { timeoutMs: 8000 });
  const current = kubectlRun('kubectl', ['config', 'current-context'], {
    timeoutMs: 8000,
  });
  const info = kubectlRun(
    'kubectl',
    ['--context', RELEASE_CNPG_CONTEXT, 'cluster-info'],
    { timeoutMs: 15000 },
  );

  /** @type {{ id: string, reason: string }[]} */
  const unreadableReads = [];

  const namespaceObservation = read({
    profileId: 'release',
    resource: 'namespace',
    name: RELEASE_CNPG_NAMESPACE,
  });
  const namespaceState = observeState(
    namespaceObservation,
    'postgres-namespace',
    unreadableReads,
  );

  const operatorObservation = read({
    profileId: 'release',
    resource: 'deployment',
    name: 'cnpg-controller-manager',
    namespace: 'cnpg-system',
  });
  const operatorState = observeState(
    operatorObservation,
    'cnpg-operator',
    unreadableReads,
  );

  const clusterObservation = read({
    profileId: 'release',
    resource: 'cluster.postgresql.cnpg.io',
    name: RELEASE_CNPG_CLUSTER,
    namespace: RELEASE_CNPG_NAMESPACE,
  });
  const clusterState = observeState(
    clusterObservation,
    'postgres-cluster',
    unreadableReads,
  );

  const crdObservation = read({
    profileId: 'release',
    resource: 'crd',
    name: 'clusters.postgresql.cnpg.io',
  });
  const crdProbeState = observeState(
    crdObservation,
    'postgres-crd',
    unreadableReads,
  );

  let memoryMiB;
  try {
    const text = deps.readMeminfo
      ? deps.readMeminfo()
      : readFileSync('/proc/meminfo', 'utf8');
    const available = text.match(/^MemAvailable:\s+(\d+)\s+kB/m);
    memoryMiB = available ? Math.floor(Number(available[1]) / 1024) : 0;
  } catch {
    memoryMiB = 0;
  }

  let pin;
  try {
    pin = parseCnpgPin(
      deps.readPin ? deps.readPin() : readFileSync(operatorPinPath, 'utf8'),
    );
  } catch {
    pin = null;
  }

  const apiServer =
    info.stdout.match(/https:\/\/127\.0\.0\.1:\d+/)?.[0] ?? null;
  /** @type {object[]} */
  const resources = [];
  if (namespaceState === 'present') {
    const namespaceBody = namespaceObservation.object;
    resources.push({
      kind: 'Namespace',
      name: RELEASE_CNPG_NAMESPACE,
      labLabel: namespaceBody.metadata?.labels?.[RELEASE_LAB_LABEL_KEY] ?? null,
      uid: namespaceBody.metadata?.uid ?? null,
    });
  }
  if (operatorState === 'present') {
    const operatorBody = operatorObservation.object;
    const operatorImage =
      operatorBody?.spec?.template?.spec?.containers?.[0]?.image ?? null;
    if (operatorImage) {
      resources.push({
        kind: 'Deployment',
        name: 'cnpg-controller-manager',
        namespace: 'cnpg-system',
        image: operatorImage,
      });
    }
  }
  if (clusterState === 'present') {
    const clusterBody = clusterObservation.object;
    const initdb = clusterBody.spec?.bootstrap?.initdb ?? {};
    resources.push({
      kind: 'Cluster',
      name: RELEASE_CNPG_CLUSTER,
      namespace: RELEASE_CNPG_NAMESPACE,
      uid: clusterBody.metadata?.uid ?? null,
      image: clusterBody.spec?.imageName ?? null,
      instances: clusterBody.spec?.instances ?? null,
      storageClass: clusterBody.spec?.storage?.storageClass ?? null,
      storageSize: clusterBody.spec?.storage?.size ?? null,
      bootstrap: {
        database: initdb.database ?? null,
        owner: initdb.owner ?? null,
        localeCType: initdb.localeCType ?? null,
        localeCollate: initdb.localeCollate ?? null,
      },
    });
  }

  return {
    context:
      info.ok && apiServer ? RELEASE_CNPG_CONTEXT : current.stdout.trim(),
    clusterName:
      kind.ok && kind.stdout.split('\n').includes(RELEASE_CNPG_CLUSTER_NAME)
        ? RELEASE_CNPG_CLUSTER_NAME
        : null,
    apiServer,
    memoryMiB,
    timedOutCommands,
    pin,
    resources,
    unreadableReads,
    crdState: crdProbeState === 'unreadable' ? 'unreadable' : crdProbeState,
  };
}

/**
 * @param {{ operatorManifestPath: string, repoRoot: string }} options
 */
export function installReleaseCnpg({ operatorManifestPath, repoRoot }) {
  const pinText = readFileSync(operatorPinPath, 'utf8');
  const pin = parseCnpgPin(pinText);
  const manifestBody = operatorManifestPath
    ? readFileSync(operatorManifestPath, 'utf8')
    : '';
  if (operatorManifestPath) verifyManifestBytes(manifestBody, pin.sha256);

  const target = runPlatformCommand(process.execPath, [
    join(repoRoot, 'infra/platform/common/cli.mjs'),
    'target',
    'release',
  ]);
  if (!target.ok) {
    process.stderr.write(target.stderr || 'target verification failed\n');
    process.exit(1);
  }

  const result = executeAuthorizedReleaseCnpg({
    collect: () => collectReleaseCnpgProbe(),
    readOperatorManifest: operatorManifestPath
      ? () => ({ body: manifestBody, sha256: pin.sha256 })
      : undefined,
    sleep: (ms) => {
      spawnSync('sleep', [String(Math.max(1, Math.ceil(ms / 1000)))]);
    },
    run: runPlatformCommand,
  });

  if (!result.ok) {
    const message =
      result.refusals[0]?.detail ?? 'release CNPG install refused';
    process.stderr.write(`${message}\n`);
    process.exit(1);
  }

  process.stdout.write(`CloudNativePG ${pin.version} is ready.\n`);
  process.stdout.write(`Operator image: ${pin.operatorImage}\n`);
  process.stdout.write(`Postgres image: ${pin.postgresImage}\n`);
  process.stdout.write(`Instances: ${result.instances ?? '1'}\n`);
  process.stdout.write(
    `Phase: ${result.phase ?? 'Cluster in healthy state'}\n`,
  );
  const pvc = runPlatformCommand('kubectl', [
    '--context',
    RELEASE_CNPG_CONTEXT,
    '-n',
    RELEASE_CNPG_NAMESPACE,
    'get',
    'pvc',
    '-o',
    'custom-columns=NAME:.metadata.name,CLASS:.spec.storageClassName,STATUS:.status.phase',
    '--no-headers',
  ]);
  if (pvc.ok) {
    process.stdout.write(pvc.stdout);
  }
  return result;
}

function parseInstallArgs(argv) {
  let operatorManifestPath = '';
  let repoRoot = '';
  for (let index = 2; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--operator-manifest') {
      operatorManifestPath = argv[index + 1] ?? '';
      index += 1;
      continue;
    }
    if (arg === '--repo-root') {
      repoRoot = argv[index + 1] ?? '';
      index += 1;
    }
  }
  if (!repoRoot) {
    process.stderr.write(
      'usage: node release-install.mjs install [--operator-manifest PATH] --repo-root PATH\n',
    );
    process.exit(2);
  }
  return { operatorManifestPath, repoRoot };
}

function main() {
  const cmd = process.argv[2];
  if (cmd === 'verify-render') {
    renderReleaseManifests();
    process.stdout.write('release PostgreSQL render verified\n');
    return;
  }
  if (cmd === 'prepare') {
    const probe = collectReleaseCnpgProbe();
    const decision = ensureReleaseCnpg(probe, { authorize: true });
    if (!decision.ok) {
      process.stderr.write(
        `${decision.refusals[0]?.detail ?? 'release CNPG install refused'}\n`,
      );
      process.exit(1);
    }
    const fetch = decision.actions.some(
      (action) => action.op === 'apply-operator',
    );
    process.stdout.write(fetch ? 'fetch\n' : 'skip\n');
    return;
  }
  if (cmd === 'install') {
    const options = parseInstallArgs(process.argv);
    installReleaseCnpg(options);
    return;
  }
  process.stderr.write(
    'usage: node release-install.mjs prepare | install [--operator-manifest PATH] --repo-root PATH\n',
  );
  process.exit(2);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main();
}
