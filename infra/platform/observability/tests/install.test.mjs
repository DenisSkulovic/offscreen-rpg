import assert from 'node:assert/strict';
import process from 'node:process';
import test from 'node:test';

import { readKindProfile } from '../../../clusters/kind/manager/config.mjs';
import { readPlatformProfile } from '../../common/profile.mjs';
import { helmValuesArgv, loadArtifacts } from '../artifacts.mjs';
import { GRAFANA_ADMIN_SECRET } from '../inventory.mjs';
import {
  assertPhaseBudget,
  helmInstallArgv,
  parseNamespaceCreateResponse,
  PHASE_TIMEOUT_MS,
  runObservability,
  runObservabilityEnsure,
  verifyCompletedPhasePrefix,
  WORKER_BUDGET_MS,
} from '../install.mjs';
import { buildCompleteDevSnapshot } from './snapshot-fixtures.mjs';

const devKind = readKindProfile('dev');
const devProfile = readPlatformProfile('dev');
const artifacts = loadArtifacts('dev', { verifyArchive: false });

/**
 * @param {object} base
 */
function absentSnapshot(base = {}) {
  return {
    profileId: 'dev',
    namespace: { absent: true },
    objects: {},
    helmReleases: [],
    helmManifests: {},
    persistentVolumes: [],
    legacy: [],
    pending: false,
    pendingValid: true,
    ...base,
  };
}

/**
 * @param {string[]} phases
 */
function snapshotForPhases(phases) {
  if (!phases.includes('namespace')) {
    return absentSnapshot();
  }
  const complete = buildCompleteDevSnapshot(artifacts);
  /** @type {Record<string, object>} */
  const objects = {};
  const releaseNames = new Set(
    phases.filter((phase) => phase.startsWith('obs-')),
  );
  if (
    phases.includes('secret') &&
    complete.objects[`Secret/${GRAFANA_ADMIN_SECRET}`]
  ) {
    objects[`Secret/${GRAFANA_ADMIN_SECRET}`] =
      complete.objects[`Secret/${GRAFANA_ADMIN_SECRET}`];
  }
  for (const row of artifacts.expectedInventory.direct) {
    if (!releaseNames.has(row[4])) {
      continue;
    }
    const key = `${row[1]}/${row[3]}`;
    if (complete.objects[key]) {
      objects[key] = complete.objects[key];
    }
  }
  for (const row of artifacts.expectedInventory.generatedClaims) {
    if (!releaseNames.has(row[4])) {
      continue;
    }
    const key = `${row[1]}/${row[3]}`;
    if (complete.objects[key]) {
      objects[key] = complete.objects[key];
    }
  }
  if (releaseNames.size > 0) {
    for (const release of releaseNames) {
      const secretName = `sh.helm.release.v1.${release}.v1`;
      if (complete.objects[`Secret/${secretName}`]) {
        objects[`Secret/${secretName}`] =
          complete.objects[`Secret/${secretName}`];
      }
    }
  }
  return {
    ...complete,
    namespace: {
      absent: false,
      uid: complete.namespace.uid,
      object: {
        metadata: {
          name: devProfile.namespaces.observability,
          labels: {
            [devProfile.ownerLabel]: devProfile.ownerValue,
          },
        },
      },
    },
    objects,
    helmReleases: complete.helmReleases.filter((row) =>
      releaseNames.has(row.name),
    ),
    pending: false,
    pendingValid: true,
  };
}

const STAGED_NAMESPACE_UID = 'uid-target-namespace';

function namespaceCreateStdout(uid = STAGED_NAMESPACE_UID) {
  return JSON.stringify({
    kind: 'Namespace',
    metadata: {
      name: devProfile.namespaces.observability,
      uid,
      labels: { [devProfile.ownerLabel]: devProfile.ownerValue },
    },
    status: { phase: 'Active' },
  });
}

/**
 * @param {{
 *   failAt?: string,
 *   failHelmAt?: number,
 *   badNamespaceCreateStdout?: boolean,
 *   emptyNamespaceCreateStdout?: boolean,
 *   wrongNamespaceCreateUid?: string,
 *   failCustodyAdvanceAt?: string,
 *   timeoutAt?: string,
 *   closeUnconfirmed?: boolean,
 *   unknownAttempt?: boolean,
 *   cancelAfterFirst?: boolean,
 *   replacedBeforeClear?: boolean,
 *   calls?: { command: string, args: string[] }[],
 *   outputs?: string[],
 *   helmDurationMs?: number,
 * }} [options]
 */
function makeEnsureDeps(options = {}) {
  let phase = 0;
  /** @type {{ command: string, args: string[] }[]} */
  const calls = options.calls ?? [];
  const outputs = options.outputs ?? [];
  const pendingWrites = [];
  let clock = 0;
  const complete = snapshotForPhases([
    'namespace',
    'secret',
    'obs-prometheus',
    'obs-loki',
    'obs-tempo',
    'obs-collector',
    'obs-grafana',
  ]);
  const stages = [
    absentSnapshot(),
    snapshotForPhases(['namespace']),
    snapshotForPhases(['namespace', 'secret']),
    snapshotForPhases(['namespace', 'secret', 'obs-prometheus']),
    snapshotForPhases(['namespace', 'secret', 'obs-prometheus', 'obs-loki']),
    snapshotForPhases([
      'namespace',
      'secret',
      'obs-prometheus',
      'obs-loki',
      'obs-tempo',
    ]),
    snapshotForPhases([
      'namespace',
      'secret',
      'obs-prometheus',
      'obs-loki',
      'obs-tempo',
      'obs-collector',
    ]),
    complete,
  ];

  const identity = {
    profile: devProfile,
    profileId: 'dev',
    contextName: devKind.contextName,
    clusterName: devProfile.clusterName,
    namespace: devProfile.namespaces.observability,
    snapshotPath: '/tmp/observability-fake-kubeconfig',
    tuple: {
      profileId: 'dev',
      contextName: devKind.contextName,
      clusterName: devProfile.clusterName,
      port: 24443,
      dockerContext: 'ensure-fixture-ctx',
      dockerControlPlaneId: 'cp',
      dockerEndpointHost: 'unix:///var/run/docker.sock',
      caSha256:
        'a3b5c7d9e1f2031425364758697a8b9cadbecfd0e1f2a3b4c5d6e7f8091a2b3c',
      kubeSystemUid: 'kube-system',
      baselineUid: 'baseline',
      targetNamespaceUid: null,
    },
    cleanup: () => ({ ok: true }),
  };

  /** @type {Record<string, unknown> | null} */
  let stored = null;
  const custody = {
    fd: 9,
    mode: 'exclusive',
    pendingPath: '/tmp/observability-ensure-pending',
    lockDirectory: '/tmp',
    cancelled: false,
    cancel() {
      this.cancelled = true;
    },
    begin(record) {
      if (this.cancelled || stored) {
        throw new Error('begin refused');
      }
      stored = {
        schema: 2,
        operationId: '00000000-0000-4000-8000-000000000010',
        service: 'observability',
        context: devKind.contextName,
        start: '2026-11-27T00:00:00.000Z',
        operation: record.operation ?? 'ensure',
        phase: record.phase,
        tuple: globalThis.structuredClone(record.tuple),
        details: globalThis.structuredClone(record.details ?? {}),
      };
      pendingWrites.push(globalThis.structuredClone(stored));
    },
    advance(record) {
      if (this.cancelled || !stored) {
        throw new Error('advance refused');
      }
      if (options.failCustodyAdvanceAt === record.phase) {
        throw new Error('advance refused');
      }
      stored = {
        ...stored,
        phase: record.phase,
        tuple: globalThis.structuredClone(record.tuple),
        details: globalThis.structuredClone(record.details ?? {}),
      };
      pendingWrites.push(globalThis.structuredClone(stored));
    },
    assertOwnPending() {
      if (this.cancelled || !stored) {
        throw new Error('pending record is not owned');
      }
      return globalThis.structuredClone(stored);
    },
    clear() {
      if (this.cancelled || !stored || options.replacedBeforeClear) {
        throw new Error('clear refused');
      }
      stored = null;
    },
    close() {},
  };

  return {
    pendingWrites,
    custody,
    verifyArchive: false,
    now: () => clock,
    captureIdentity: async () => identity,
    acquireCustody: async () => custody,
    readPending: () =>
      stored ? { pending: true, valid: true } : { pending: false, valid: true },
    collectInventorySnapshot: () => stages[Math.min(phase, stages.length - 1)],
    recheckIdentity: (bound, { expectedNamespaceUid }) => {
      const observed = stages[Math.min(phase, stages.length - 1)].namespace;
      const uid = observed.absent ? null : observed.uid;
      return {
        ok:
          expectedNamespaceUid === uid &&
          bound.tuple.targetNamespaceUid === uid,
        reason: 'namespace-uid-changed',
      };
    },
    runMutation: async (command, args) => {
      calls.push({ command, args: args.slice() });
      if (options.cancelAfterFirst && calls.length === 1) {
        custody.cancel();
        return {
          ok: false,
          stdout: '',
          exitCode: null,
          signal: null,
          timedOut: false,
          cancelled: true,
          attempted: true,
          closeUnconfirmed: false,
        };
      }
      if (options.closeUnconfirmed && calls.length === 1) {
        return {
          ok: false,
          stdout: '',
          exitCode: null,
          signal: null,
          timedOut: false,
          cancelled: false,
          attempted: true,
          closeUnconfirmed: true,
        };
      }
      if (options.unknownAttempt && calls.length === 1) {
        return {
          ok: false,
          stdout: '',
          exitCode: null,
          signal: null,
          timedOut: false,
          cancelled: false,
          attempted: true,
          closeUnconfirmed: false,
        };
      }
      if (options.timeoutAt === 'namespace' && calls.length === 1) {
        return {
          ok: false,
          stdout: '',
          exitCode: null,
          signal: 'SIGKILL',
          timedOut: true,
          cancelled: false,
          attempted: true,
          closeUnconfirmed: false,
        };
      }
      if (
        options.failAt &&
        calls.length === 1 &&
        options.failAt === 'namespace'
      ) {
        return {
          ok: false,
          stdout: '',
          exitCode: 1,
          signal: null,
          timedOut: false,
        };
      }
      if (command === 'helm' && options.failHelmAt != null) {
        const helmCalls = calls.filter(
          (call) => call.command === 'helm',
        ).length;
        if (helmCalls === options.failHelmAt) {
          return {
            ok: false,
            stdout: '',
            exitCode: 1,
            signal: null,
            timedOut: false,
          };
        }
      }
      if (command === 'helm') {
        const slowMs = options.helmDurationMs ?? 1;
        clock += slowMs;
      } else {
        clock += 1;
      }
      phase += 1;
      outputs.push(`${command} ${args.join(' ')}`);
      const kubectlCreates = calls.filter(
        (call) => call.command === 'kubectl' && call.args.includes('create'),
      ).length;
      const isNamespaceCreate =
        command === 'kubectl' &&
        args.includes('create') &&
        kubectlCreates === 1;
      let stdout = '';
      if (isNamespaceCreate) {
        if (options.badNamespaceCreateStdout) {
          stdout = 'not-json';
        } else if (options.emptyNamespaceCreateStdout) {
          stdout = '';
        } else {
          const uid = options.wrongNamespaceCreateUid ?? STAGED_NAMESPACE_UID;
          stdout = namespaceCreateStdout(uid);
        }
      }
      return {
        ok: true,
        stdout,
        exitCode: 0,
        signal: null,
        timedOut: false,
      };
    },
    finalObservation: () => ({
      state: 'ready',
      reasonCode: 'ready',
      pending: false,
      snapshot: buildCompleteDevSnapshot(artifacts),
    }),
    get calls() {
      return calls;
    },
    advanceClock(ms) {
      clock += ms;
    },
    get clock() {
      return clock;
    },
  };
}

test('ready observation is a no-op without writes', async () => {
  const prior = process.env.OFFSCREEN_OBSERVABILITY_ENSURE;
  process.env.OFFSCREEN_OBSERVABILITY_ENSURE = 'authorized';
  try {
    const deps = makeEnsureDeps();
    const ready = buildCompleteDevSnapshot(artifacts);
    deps.collectInventorySnapshot = () => ({
      ...ready,
      pending: false,
      pendingValid: true,
    });
    const receipt = await runObservabilityEnsure(
      'dev',
      devKind.contextName,
      deps,
    );
    assert.equal(receipt.ok, true);
    assert.equal(receipt.mutation, 'none');
    assert.equal(receipt.pending, false);
    assert.equal(deps.calls.length, 0);
  } finally {
    if (prior === undefined) delete process.env.OFFSCREEN_OBSERVABILITY_ENSURE;
    else process.env.OFFSCREEN_OBSERVABILITY_ENSURE = prior;
  }
});

test('ensure refuses missing authorization before lock', async () => {
  const prior = process.env.OFFSCREEN_OBSERVABILITY_ENSURE;
  delete process.env.OFFSCREEN_OBSERVABILITY_ENSURE;
  try {
    const receipt = await runObservabilityEnsure('dev', devKind.contextName, {
      verifyArchive: false,
      captureIdentity: async () => {
        throw new Error('should not capture');
      },
    });
    assert.equal(receipt.reasonCode, 'ensure-not-authorized');
    assert.equal(receipt.mutation, 'none');
  } finally {
    if (prior === undefined) {
      delete process.env.OFFSCREEN_OBSERVABILITY_ENSURE;
    } else {
      process.env.OFFSCREEN_OBSERVABILITY_ENSURE = prior;
    }
  }
});

test('failed namespace phase stops before later mutations', async () => {
  const prior = process.env.OFFSCREEN_OBSERVABILITY_ENSURE;
  process.env.OFFSCREEN_OBSERVABILITY_ENSURE = 'authorized';
  try {
    const deps = makeEnsureDeps({ failAt: 'namespace' });
    const receipt = await runObservabilityEnsure(
      'dev',
      devKind.contextName,
      deps,
    );
    assert.equal(receipt.ok, false);
    assert.equal(receipt.mutation, 'possible');
    assert.equal(receipt.pending, true);
    assert.deepEqual(receipt.completedPhases, []);
    assert.equal(deps.calls.length, 1);
    assert.equal(deps.calls[0]?.command, 'kubectl');
  } finally {
    if (prior === undefined) {
      delete process.env.OFFSCREEN_OBSERVABILITY_ENSURE;
    } else {
      process.env.OFFSCREEN_OBSERVABILITY_ENSURE = prior;
    }
  }
});

test('failed helm phase retains prefix and skips later helm calls', async () => {
  const prior = process.env.OFFSCREEN_OBSERVABILITY_ENSURE;
  process.env.OFFSCREEN_OBSERVABILITY_ENSURE = 'authorized';
  try {
    const deps = makeEnsureDeps({ failHelmAt: 3 });
    const receipt = await runObservabilityEnsure(
      'dev',
      devKind.contextName,
      deps,
    );
    assert.equal(receipt.ok, false);
    assert.deepEqual(receipt.completedPhases, [
      'namespace',
      'secret',
      'obs-prometheus',
      'obs-loki',
    ]);
    const helmCalls = deps.calls.filter((call) => call.command === 'helm');
    assert.equal(helmCalls.length, 3);
  } finally {
    if (prior === undefined) {
      delete process.env.OFFSCREEN_OBSERVABILITY_ENSURE;
    } else {
      process.env.OFFSCREEN_OBSERVABILITY_ENSURE = prior;
    }
  }
});

test('helm install argv preserves helmValueArgs parity with render', () => {
  const releaseProfile = readPlatformProfile('release');
  const bundles = [
    [
      'dev',
      artifacts,
      devKind.contextName,
      devProfile.namespaces.observability,
    ],
    [
      'release',
      loadArtifacts('release', { verifyArchive: false }),
      readKindProfile('release').contextName,
      releaseProfile.namespaces.observability,
    ],
  ];
  for (const [profileId, bundle, contextName, namespace] of bundles) {
    for (const release of bundle.releases) {
      assert.equal(release.valuesPaths.length, 1, profileId);
      assert.equal(release.valuesPath, undefined);
      const slice = helmValuesArgv(release);
      const argv = helmInstallArgv(
        {
          snapshotPath: '/tmp/kubeconfig',
          contextName,
          namespace,
        },
        release,
      );
      const start = argv.indexOf('-f');
      assert.deepEqual(argv.slice(start, start + slice.length), slice);
      assert.equal(argv.at(-3), '--wait');
      assert.equal(argv.at(-2), '--timeout');
      assert.equal(argv.at(-1), '180s');
      assert.ok(!argv.includes('--atomic'));
      assert.ok(!argv.includes('--cleanup-on-fail'));
    }
  }
});

test('five slow helm calls still fit the 1500s worker budget', () => {
  let now = 0;
  const helmDuration = 250_000;
  for (const phase of [
    'namespace',
    'secret',
    'obs-prometheus',
    'obs-loki',
    'obs-tempo',
    'obs-collector',
    'obs-grafana',
  ]) {
    assert.doesNotThrow(() => assertPhaseBudget(WORKER_BUDGET_MS - now, phase));
    now += PHASE_TIMEOUT_MS[phase] ?? 0;
    if (phase.startsWith('obs-')) {
      assert.ok(now <= WORKER_BUDGET_MS);
    }
  }
  now += helmDuration;
  assert.ok(now < WORKER_BUDGET_MS);
});

test('ensure output never contains generated admin secret material', async () => {
  const prior = process.env.OFFSCREEN_OBSERVABILITY_ENSURE;
  process.env.OFFSCREEN_OBSERVABILITY_ENSURE = 'authorized';
  try {
    const deps = makeEnsureDeps();
    const receipt = await runObservabilityEnsure(
      'dev',
      devKind.contextName,
      deps,
    );
    const joined = JSON.stringify(receipt);
    for (const call of deps.calls) {
      assert.ok(!call.args.some((arg) => arg.includes('admin-password=')));
    }
    assert.ok(!joined.includes('admin-password'));
    if (receipt.ok) {
      assert.equal(receipt.mutation, 'confirmed');
    }
  } finally {
    if (prior === undefined) {
      delete process.env.OFFSCREEN_OBSERVABILITY_ENSURE;
    } else {
      process.env.OFFSCREEN_OBSERVABILITY_ENSURE = prior;
    }
  }
});

test('stale identity is refused before writes proceed', async () => {
  const prior = process.env.OFFSCREEN_OBSERVABILITY_ENSURE;
  process.env.OFFSCREEN_OBSERVABILITY_ENSURE = 'authorized';
  try {
    const deps = makeEnsureDeps();
    let recheckCount = 0;
    deps.recheckIdentity = () => {
      recheckCount += 1;
      if (recheckCount === 1) {
        return { ok: true };
      }
      return { ok: false, reason: 'identity-changed' };
    };
    const receipt = await runObservabilityEnsure(
      'dev',
      devKind.contextName,
      deps,
    );
    assert.equal(receipt.reasonCode, 'identity-changed');
    assert.equal(deps.calls.length, 1);
  } finally {
    if (prior === undefined) {
      delete process.env.OFFSCREEN_OBSERVABILITY_ENSURE;
    } else {
      process.env.OFFSCREEN_OBSERVABILITY_ENSURE = prior;
    }
  }
});

test('foreign pending refuses at admission', async () => {
  const prior = process.env.OFFSCREEN_OBSERVABILITY_ENSURE;
  process.env.OFFSCREEN_OBSERVABILITY_ENSURE = 'authorized';
  try {
    const deps = makeEnsureDeps();
    deps.foreignPendingAtAdmission = true;
    deps.collectInventorySnapshot = () =>
      absentSnapshot({ pending: true, pendingValid: true });
    const receipt = await runObservabilityEnsure(
      'dev',
      devKind.contextName,
      deps,
    );
    assert.equal(receipt.reasonCode, 'pending');
    assert.equal(receipt.mutation, 'none');
    assert.equal(deps.calls.length, 0);
  } finally {
    if (prior === undefined) {
      delete process.env.OFFSCREEN_OBSERVABILITY_ENSURE;
    } else {
      process.env.OFFSCREEN_OBSERVABILITY_ENSURE = prior;
    }
  }
});

test('own pending finalization succeeds when shape is ready', async () => {
  const prior = process.env.OFFSCREEN_OBSERVABILITY_ENSURE;
  process.env.OFFSCREEN_OBSERVABILITY_ENSURE = 'authorized';
  try {
    const deps = makeEnsureDeps();
    deps.finalObservation = () => ({
      state: 'ready',
      reasonCode: 'pending',
      pending: true,
      snapshot: buildCompleteDevSnapshot(artifacts),
    });
    const receipt = await runObservabilityEnsure(
      'dev',
      devKind.contextName,
      deps,
    );
    assert.equal(receipt.ok, true);
    assert.equal(receipt.mutation, 'confirmed');
    assert.equal(receipt.pending, false);
  } finally {
    if (prior === undefined) {
      delete process.env.OFFSCREEN_OBSERVABILITY_ENSURE;
    } else {
      process.env.OFFSCREEN_OBSERVABILITY_ENSURE = prior;
    }
  }
});

test('foreign pending refuses during finalization even when shape is ready', async () => {
  const prior = process.env.OFFSCREEN_OBSERVABILITY_ENSURE;
  process.env.OFFSCREEN_OBSERVABILITY_ENSURE = 'authorized';
  try {
    const deps = makeEnsureDeps();
    deps.foreignPendingAtFinalize = true;
    deps.finalObservation = () => ({
      state: 'ready',
      reasonCode: 'pending',
      pending: true,
      snapshot: buildCompleteDevSnapshot(artifacts),
    });
    const receipt = await runObservabilityEnsure(
      'dev',
      devKind.contextName,
      deps,
    );
    assert.equal(receipt.ok, false);
    assert.equal(receipt.reasonCode, 'pending');
  } finally {
    if (prior === undefined) {
      delete process.env.OFFSCREEN_OBSERVABILITY_ENSURE;
    } else {
      process.env.OFFSCREEN_OBSERVABILITY_ENSURE = prior;
    }
  }
});

test('phase-prefix acceptance allows partial snapshot only', () => {
  const partial = snapshotForPhases(['namespace', 'secret', 'obs-prometheus']);
  const pass = verifyCompletedPhasePrefix(
    partial,
    artifacts,
    ['namespace', 'secret', 'obs-prometheus'],
    devProfile,
  );
  assert.equal(pass.ok, true);
  const fail = verifyCompletedPhasePrefix(
    partial,
    artifacts,
    ['namespace', 'secret', 'obs-prometheus', 'obs-loki'],
    devProfile,
  );
  assert.equal(fail.ok, false);
});

test('plan and status stay read-only', async () => {
  const receipt = await runObservability(
    'plan',
    'dev',
    'kind-offscreen-release',
    {
      verifyArchive: false,
      run: () => {
        throw new Error('plan must not invoke cluster IO');
      },
    },
  );
  assert.equal(receipt.reasonCode, 'context-mismatch');
  assert.equal(receipt.mutation, 'none');
});

test('fresh ensure binds namespace UID before secret and persists it under custody', async () => {
  const prior = process.env.OFFSCREEN_OBSERVABILITY_ENSURE;
  process.env.OFFSCREEN_OBSERVABILITY_ENSURE = 'authorized';
  try {
    const deps = makeEnsureDeps();
    const result = await runObservabilityEnsure(
      'dev',
      devKind.contextName,
      deps,
    );
    assert.equal(result.ok, true, JSON.stringify(result));
    const uid = snapshotForPhases(['namespace']).namespace.uid;
    assert.equal(deps.pendingWrites[0].tuple.targetNamespaceUid, null);
    assert.equal(deps.pendingWrites[1].phase, 'namespace');
    assert.equal(deps.pendingWrites[1].tuple.targetNamespaceUid, uid);
    assert.equal(deps.pendingWrites[2].phase, 'secret');
    assert.ok(
      deps.pendingWrites
        .slice(1)
        .every((row) => row.tuple.targetNamespaceUid === uid),
    );
    const nsCreate = deps.calls[0];
    assert.ok(nsCreate.args.includes('create'));
    const outIndex = nsCreate.args.indexOf('-o');
    assert.ok(outIndex >= 0);
    assert.equal(nsCreate.args[outIndex + 1], 'json');
    assert.ok(deps.calls[1].args.includes('create'));
  } finally {
    if (prior === undefined) delete process.env.OFFSCREEN_OBSERVABILITY_ENSURE;
    else process.env.OFFSCREEN_OBSERVABILITY_ENSURE = prior;
  }
});

test('malformed namespace create JSON retains pending and skips secret', async () => {
  const prior = process.env.OFFSCREEN_OBSERVABILITY_ENSURE;
  process.env.OFFSCREEN_OBSERVABILITY_ENSURE = 'authorized';
  try {
    const deps = makeEnsureDeps({ badNamespaceCreateStdout: true });
    const receipt = await runObservabilityEnsure(
      'dev',
      devKind.contextName,
      deps,
    );
    assert.equal(receipt.ok, false);
    assert.equal(receipt.mutation, 'possible');
    assert.equal(receipt.pending, true);
    assert.equal(deps.calls.length, 1);
    assert.equal(deps.calls[0].command, 'kubectl');
  } finally {
    if (prior === undefined) delete process.env.OFFSCREEN_OBSERVABILITY_ENSURE;
    else process.env.OFFSCREEN_OBSERVABILITY_ENSURE = prior;
  }
});

test('empty namespace create stdout retains pending as possible mutation', async () => {
  const prior = process.env.OFFSCREEN_OBSERVABILITY_ENSURE;
  process.env.OFFSCREEN_OBSERVABILITY_ENSURE = 'authorized';
  try {
    const deps = makeEnsureDeps({ emptyNamespaceCreateStdout: true });
    const receipt = await runObservabilityEnsure(
      'dev',
      devKind.contextName,
      deps,
    );
    assert.equal(receipt.mutation, 'possible');
    assert.equal(receipt.pending, true);
    assert.equal(deps.calls.length, 1);
  } finally {
    if (prior === undefined) delete process.env.OFFSCREEN_OBSERVABILITY_ENSURE;
    else process.env.OFFSCREEN_OBSERVABILITY_ENSURE = prior;
  }
});

test('create-response UID mismatch with inventory rejects before secret', async () => {
  const prior = process.env.OFFSCREEN_OBSERVABILITY_ENSURE;
  process.env.OFFSCREEN_OBSERVABILITY_ENSURE = 'authorized';
  try {
    const deps = makeEnsureDeps({
      wrongNamespaceCreateUid: 'wrong-create-uid',
    });
    const receipt = await runObservabilityEnsure(
      'dev',
      devKind.contextName,
      deps,
    );
    assert.equal(receipt.ok, false);
    assert.equal(receipt.reasonCode, 'identity-changed');
    assert.equal(deps.calls.length, 1);
  } finally {
    if (prior === undefined) delete process.env.OFFSCREEN_OBSERVABILITY_ENSURE;
    else process.env.OFFSCREEN_OBSERVABILITY_ENSURE = prior;
  }
});

test('failed custody advance after namespace bind prevents secret', async () => {
  const prior = process.env.OFFSCREEN_OBSERVABILITY_ENSURE;
  process.env.OFFSCREEN_OBSERVABILITY_ENSURE = 'authorized';
  try {
    const deps = makeEnsureDeps({ failCustodyAdvanceAt: 'namespace' });
    const receipt = await runObservabilityEnsure(
      'dev',
      devKind.contextName,
      deps,
    );
    assert.equal(receipt.ok, false);
    assert.equal(receipt.pending, true);
    assert.equal(deps.calls.length, 1);
  } finally {
    if (prior === undefined) delete process.env.OFFSCREEN_OBSERVABILITY_ENSURE;
    else process.env.OFFSCREEN_OBSERVABILITY_ENSURE = prior;
  }
});

test('parseNamespaceCreateResponse validates Namespace object', () => {
  const identity = {
    namespace: devProfile.namespaces.observability,
    tuple: { targetNamespaceUid: null },
  };
  const uid = parseNamespaceCreateResponse(
    { ok: true, stdout: namespaceCreateStdout(), timedOut: false },
    identity,
    devProfile,
  );
  assert.equal(uid, STAGED_NAMESPACE_UID);
  assert.throws(
    () =>
      parseNamespaceCreateResponse(
        { ok: true, stdout: '{"kind":"ConfigMap"}', timedOut: false },
        identity,
        devProfile,
      ),
    /namespace-response-invalid/,
  );
});

test('replacement namespace after binding prevents secret creation', async () => {
  const prior = process.env.OFFSCREEN_OBSERVABILITY_ENSURE;
  process.env.OFFSCREEN_OBSERVABILITY_ENSURE = 'authorized';
  try {
    const deps = makeEnsureDeps();
    const check = deps.recheckIdentity;
    let checks = 0;
    deps.recheckIdentity = (identity, options) => {
      checks += 1;
      if (checks === 3) return { ok: false, reason: 'namespace-uid-changed' };
      return check(identity, options);
    };
    const result = await runObservabilityEnsure(
      'dev',
      devKind.contextName,
      deps,
    );
    assert.equal(result.ok, false);
    assert.equal(result.reasonCode, 'identity-changed');
    assert.equal(result.pending, true);
    assert.equal(deps.calls.length, 1);
  } finally {
    if (prior === undefined) delete process.env.OFFSCREEN_OBSERVABILITY_ENSURE;
    else process.env.OFFSCREEN_OBSERVABILITY_ENSURE = prior;
  }
});

test('uncertain namespace outcomes stay possible and do not continue', async () => {
  const prior = process.env.OFFSCREEN_OBSERVABILITY_ENSURE;
  process.env.OFFSCREEN_OBSERVABILITY_ENSURE = 'authorized';
  try {
    for (const options of [
      { timeoutAt: 'namespace' },
      { closeUnconfirmed: true },
      { unknownAttempt: true },
      { cancelAfterFirst: true },
    ]) {
      const deps = makeEnsureDeps(options);
      const receipt = await runObservabilityEnsure(
        'dev',
        devKind.contextName,
        deps,
      );
      assert.equal(receipt.ok, false);
      assert.equal(receipt.mutation, 'possible');
      assert.equal(receipt.pending, true);
      assert.equal(deps.calls.length, 1);
      assert.equal(deps.custody.cancelled, options.cancelAfterFirst === true);
    }
  } finally {
    if (prior === undefined) delete process.env.OFFSCREEN_OBSERVABILITY_ENSURE;
    else process.env.OFFSCREEN_OBSERVABILITY_ENSURE = prior;
  }
});

test('replaced pending record cannot be cleared', async () => {
  const prior = process.env.OFFSCREEN_OBSERVABILITY_ENSURE;
  process.env.OFFSCREEN_OBSERVABILITY_ENSURE = 'authorized';
  try {
    const deps = makeEnsureDeps({ replacedBeforeClear: true });
    const receipt = await runObservabilityEnsure(
      'dev',
      devKind.contextName,
      deps,
    );
    assert.equal(receipt.ok, false);
    assert.equal(receipt.reasonCode, 'cleanup-failed');
    assert.equal(receipt.pending, true);
    assert.equal(deps.calls.length, 7);
  } finally {
    if (prior === undefined) delete process.env.OFFSCREEN_OBSERVABILITY_ENSURE;
    else process.env.OFFSCREEN_OBSERVABILITY_ENSURE = prior;
  }
});
