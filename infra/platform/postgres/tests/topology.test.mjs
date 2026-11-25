import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { runPlatformCommand } from '../../common/commands.mjs';
import { readPlatformProfile } from '../../common/profile.mjs';
import { renderPlatformDocuments } from '../../common/render.mjs';
import {
  CNPG_HEALTHY_PHASE,
  assertPositiveCnpgInstances,
  assessCnpgClusterTopologyReadiness,
  buildInstancesCasPatch,
  buildOwnedCnpgEndpoints,
  ensureCnpgTopology,
  ensureOwnedCnpgTopology,
  parseTopologyCliArgs,
  planCnpgTopology,
  planOwnedCnpgTopology,
  resolveExpectedCnpgInstances,
  runCnpgTopologyControl,
  waitForCnpgTopologyReadiness,
} from '../topology.mjs';
import {
  DEV_CNPG_CLUSTER,
  DEV_CNPG_OWNER,
  RELEASE_CNPG_CLUSTER,
  parseCnpgPin,
} from '../dev-bootstrap.mjs';
import { RELEASE_CNPG_CONTEXT } from '../release-install.mjs';

const postgresRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const pin = parseCnpgPin(
  readFileSync(join(postgresRoot, 'operator.pin'), 'utf8'),
);

function helmRun(command, args, options) {
  if (command !== 'helm') {
    return {
      ok: false,
      status: 1,
      stdout: '',
      stderr: 'unexpected command',
      timedOut: false,
      missing: false,
    };
  }
  return runPlatformCommand(command, args, options);
}

function renderedCluster(profile) {
  return renderPlatformDocuments(
    { service: 'postgres', profile, section: 'cluster' },
    { run: helmRun },
  )[0];
}

function healthyCluster(instances) {
  return {
    spec: { instances },
    status: {
      instances,
      readyInstances: instances,
      phase: CNPG_HEALTHY_PHASE,
      conditions: [{ type: 'Ready', status: 'True' }],
      currentPrimary: `pg-${instances}-primary`,
    },
  };
}

test('topology predicate accepts aligned counts and healthy status', () => {
  assert.deepEqual(assessCnpgClusterTopologyReadiness(healthyCluster(4), 4), {
    ok: true,
    currentPrimary: 'pg-4-primary',
  });
});

test('topology predicate rejects bad instance alignment', () => {
  const cluster = healthyCluster(4);
  cluster.status.readyInstances = 3;
  const result = assessCnpgClusterTopologyReadiness(cluster, 4);
  assert.equal(result.ok, false);
  assert.match(result.detail, /readyInstances/);
});

test('topology predicate rejects stale Ready, phase, and missing primary', () => {
  const stale = healthyCluster(1);
  stale.status.conditions = [{ type: 'Ready', status: 'False' }];
  assert.match(assessCnpgClusterTopologyReadiness(stale, 1).detail, /Ready/);

  const phase = healthyCluster(1);
  phase.status.phase = 'Waiting';
  assert.match(assessCnpgClusterTopologyReadiness(phase, 1).detail, /phase/);

  const primary = healthyCluster(1);
  delete primary.status.currentPrimary;
  assert.match(
    assessCnpgClusterTopologyReadiness(primary, 1).detail,
    /currentPrimary/,
  );
});

test('assertPositiveCnpgInstances rejects non-positive values', () => {
  assert.doesNotThrow(() => assertPositiveCnpgInstances(1));
  for (const value of [0, -1, 1.5, Number.MAX_SAFE_INTEGER + 1]) {
    assert.throws(
      () => assertPositiveCnpgInstances(value),
      /positive safe integer/,
    );
  }
});

test('resolveExpectedCnpgInstances prefers observed count on reuse', () => {
  const rendered = { spec: { instances: 1 } };
  const probe = {
    resources: [{ kind: 'Cluster', name: RELEASE_CNPG_CLUSTER, instances: 4 }],
  };
  assert.equal(
    resolveExpectedCnpgInstances(
      'compatible',
      rendered,
      probe,
      RELEASE_CNPG_CLUSTER,
    ),
    4,
  );
  assert.equal(
    resolveExpectedCnpgInstances(
      'absent',
      rendered,
      probe,
      RELEASE_CNPG_CLUSTER,
    ),
    1,
  );
});

function healthyClusterStatus(instances) {
  return {
    instances,
    readyInstances: instances,
    phase: CNPG_HEALTHY_PHASE,
    conditions: [{ type: 'Ready', status: 'True' }],
    currentPrimary: `pg-${instances}-primary`,
  };
}

function operatorObject() {
  return {
    spec: {
      template: { spec: { containers: [{ image: pin.operatorImage }] } },
    },
    status: { conditions: [{ type: 'Available', status: 'True' }] },
  };
}

function buildObservation(profile, instances, overrides = {}) {
  const expected = renderedCluster(profile);
  const baselineName =
    profile === 'dev' ? DEV_CNPG_CLUSTER : RELEASE_CNPG_CLUSTER;
  const cluster = {
    ...expected,
    metadata: {
      ...expected.metadata,
      uid: 'cluster-uid-1',
      resourceVersion: 'rv-10',
    },
    spec: { ...expected.spec, instances },
    status: healthyClusterStatus(instances),
  };
  return {
    env: profile,
    kindClusterName: profile === 'dev' ? 'offscreen-dev' : 'offscreen-release',
    target: {
      ok: true,
      profileId: profile,
      clusterName: profile === 'dev' ? 'offscreen-dev' : 'offscreen-release',
      contextName:
        profile === 'dev' ? 'kind-offscreen-dev' : RELEASE_CNPG_CONTEXT,
    },
    targetError: null,
    postgresNamespace: {
      metadata: {
        uid: 'postgres-ns-1',
        labels:
          profile === 'dev'
            ? { 'offscreen.dev/owner': DEV_CNPG_OWNER }
            : { 'offscreen.rpg/lab': 'disposable' },
      },
    },
    crdPresent: true,
    operator: operatorObject(),
    operatorAvailable: true,
    pin,
    expectedCluster: expected,
    cluster,
    clusterIdentity: 'compatible',
    memoryMiB: 16384,
    unreadable: [],
    ...overrides,
  };
}

test('parseTopologyCliArgs accepts exact argv for release plan', () => {
  const parsed = parseTopologyCliArgs([
    'node',
    'infra/platform/postgres/topology-cli.mjs',
    'plan',
    '--env',
    'release',
    '--cluster',
    RELEASE_CNPG_CLUSTER,
    '--instances',
    '2',
  ]);
  assert.deepEqual(parsed, {
    command: 'plan',
    env: 'release',
    clusterName: RELEASE_CNPG_CLUSTER,
    instances: 2,
    allowScaleDown: false,
    outputMode: 'human',
    noColor: false,
  });
});

test('parseTopologyCliArgs defaults to human and accepts --json', () => {
  const human = parseTopologyCliArgs([
    'node',
    'cli.mjs',
    'status',
    '--env',
    'dev',
    '--cluster',
    DEV_CNPG_CLUSTER,
    '--instances',
    '1',
    '--human',
  ]);
  assert.equal(/** @type {{ outputMode: string }} */ (human).outputMode, 'human');

  const json = parseTopologyCliArgs([
    'node',
    'cli.mjs',
    'status',
    '--env',
    'dev',
    '--cluster',
    DEV_CNPG_CLUSTER,
    '--instances',
    '1',
    '--json',
  ]);
  assert.equal(/** @type {{ outputMode: string }} */ (json).outputMode, 'json');

  assert.throws(
    () =>
      parseTopologyCliArgs([
        'node',
        'cli.mjs',
        'status',
        '--env',
        'dev',
        '--cluster',
        DEV_CNPG_CLUSTER,
        '--instances',
        '1',
        '--human',
        '--json',
      ]),
    /conflicting options/,
  );
  assert.throws(
    () =>
      parseTopologyCliArgs([
        'node',
        'cli.mjs',
        'status',
        '--env',
        'dev',
        '--cluster',
        DEV_CNPG_CLUSTER,
        '--instances',
        '1',
        '--json',
        '--no-color',
      ]),
    /--no-color requires human output/,
  );
});

test('parseTopologyCliArgs returns help without requiring target flags', () => {
  assert.deepEqual(parseTopologyCliArgs(['node', 'cli.mjs', '--help']), {
    help: true,
  });
  assert.deepEqual(
    parseTopologyCliArgs(['node', 'cli.mjs', 'plan', '--help']),
    {
      help: true,
      command: 'plan',
    },
  );
});

test('parseTopologyCliArgs rejects unknown and duplicate flags', () => {
  assert.throws(
    () =>
      parseTopologyCliArgs([
        'node',
        'cli.mjs',
        'plan',
        '--env',
        'dev',
        '--cluster',
        DEV_CNPG_CLUSTER,
        '--instances',
        '2',
        '--unexpected',
        'x',
      ]),
    /unknown flag/,
  );
  assert.throws(
    () =>
      parseTopologyCliArgs([
        'node',
        'cli.mjs',
        'plan',
        '--env',
        'dev',
        '--env',
        'dev',
        '--cluster',
        DEV_CNPG_CLUSTER,
        '--instances',
        '2',
      ]),
    /duplicate flag/,
  );
  assert.throws(
    () =>
      parseTopologyCliArgs([
        'node',
        'cli.mjs',
        'plan',
        '--env',
        'dev',
        '--cluster',
        DEV_CNPG_CLUSTER,
        '--instances',
        '01',
      ]),
    /canonical positive integer/,
  );
  assert.throws(
    () =>
      parseTopologyCliArgs([
        'node',
        'cli.mjs',
        'ensure',
        '--env',
        'dev',
        '--cluster',
        DEV_CNPG_CLUSTER,
        '--instances',
        '2',
      ]),
    /ensure requires --confirm-context/,
  );
});

test('buildInstancesCasPatch includes uid, resourceVersion, and current count', () => {
  const patch = buildInstancesCasPatch('uid-1', 'rv-9', 2, 3);
  assert.equal(patch.length, 4);
  assert.deepEqual(patch[0], {
    op: 'test',
    path: '/metadata/uid',
    value: 'uid-1',
  });
  assert.deepEqual(patch[2], {
    op: 'test',
    path: '/spec/instances',
    value: 2,
  });
  assert.deepEqual(patch[3], {
    op: 'replace',
    path: '/spec/instances',
    value: 3,
  });
});

test('planCnpgTopology reports release and dev baselines', () => {
  for (const profile of ['release', 'dev']) {
    const request = {
      command: 'plan',
      env: profile,
      clusterName: profile === 'dev' ? DEV_CNPG_CLUSTER : RELEASE_CNPG_CLUSTER,
      instances: 2,
      allowScaleDown: false,
    };
    const plan = planCnpgTopology(request, buildObservation(profile, 1));
    assert.equal(plan.ok, true, profile);
    assert.equal(plan.currentInstances, 1);
    assert.equal(plan.targetInstances, 2);
    assert.equal(plan.resources?.delta.instances, 1);
  }
});

test('planCnpgTopology refuses postgres namespace owner mismatch', () => {
  const request = {
    command: 'plan',
    env: 'release',
    clusterName: RELEASE_CNPG_CLUSTER,
    instances: 2,
    allowScaleDown: false,
  };
  const plan = planCnpgTopology(
    request,
    buildObservation('release', 1, {
      postgresNamespace: {
        metadata: {
          uid: 'postgres-ns-1',
          labels: { 'offscreen.rpg/lab': 'foreign' },
        },
      },
    }),
  );
  assert.equal(plan.ok, false);
  assert.ok(
    plan.refusals.some(
      (item) => item.id === 'postgres-namespace-owner-mismatch',
    ),
    'owner mismatch',
  );
});

test('parseTopologyCliArgs requires owner for non-baseline clusters', () => {
  assert.throws(
    () =>
      parseTopologyCliArgs([
        'node',
        'cli.mjs',
        'plan',
        '--env',
        'dev',
        '--cluster',
        'pg-agent01',
        '--instances',
        '2',
      ]),
    /--owner is required/,
  );
  assert.throws(
    () =>
      parseTopologyCliArgs([
        'node',
        'cli.mjs',
        'plan',
        '--env',
        'dev',
        '--cluster',
        DEV_CNPG_CLUSTER,
        '--instances',
        '2',
        '--owner',
        'agent01',
      ]),
    /baseline cluster name cannot be used with --owner/,
  );
});

function buildOwnedObservation(
  profile,
  ownerId,
  clusterName,
  instances,
  overrides = {},
) {
  const expected = renderedCluster(profile);
  const platform = readPlatformProfile(profile);
  const namespaceName = `offscreen-pg-${ownerId}`;
  const ownerLabelKey = `${platform.ownerLabel}/owner`;
  const labels = {
    [ownerLabelKey]: platform.ownerValue,
    'offscreen.rpg/pg-experiment': ownerId,
  };
  const cluster = {
    ...expected,
    metadata: {
      ...expected.metadata,
      name: clusterName,
      namespace: namespaceName,
      uid: 'owned-cluster-uid',
      resourceVersion: 'owned-rv-1',
      labels,
    },
    spec: { ...expected.spec, instances },
    status: healthyClusterStatus(instances),
  };
  const expectedCluster = structuredClone(cluster);
  delete expectedCluster.status;
  return {
    env: profile,
    ownerId,
    clusterName,
    namespaceName,
    kindClusterName: profile === 'dev' ? 'offscreen-dev' : 'offscreen-release',
    target: {
      ok: true,
      profileId: profile,
      clusterName: profile === 'dev' ? 'offscreen-dev' : 'offscreen-release',
      contextName:
        profile === 'dev' ? 'kind-offscreen-dev' : RELEASE_CNPG_CONTEXT,
    },
    targetError: null,
    ownedNamespace: {
      metadata: { uid: 'owned-ns-uid', labels, name: namespaceName },
    },
    namespaceOwnership: 'owned',
    crdPresent: true,
    operator: operatorObject(),
    operatorAvailable: true,
    pin,
    expectedCluster,
    cluster,
    clusterIdentity: 'compatible',
    memoryMiB: 16384,
    unreadable: [],
    ...overrides,
  };
}

test('ensureCnpgTopology refuses scale-down without flag and wrong confirm context', () => {
  const request = {
    command: 'ensure',
    env: 'release',
    clusterName: RELEASE_CNPG_CLUSTER,
    instances: 1,
    confirmContext: 'wrong-context',
    allowScaleDown: false,
  };
  const refused = ensureCnpgTopology(
    request,
    buildObservation('release', 2),
    {},
  );
  assert.equal(refused.ok, false);
  assert.equal(refused.refusals[0].id, 'confirm-context-mismatch');

  const downscale = ensureCnpgTopology(
    {
      ...request,
      confirmContext: RELEASE_CNPG_CONTEXT,
      instances: 1,
    },
    buildObservation('release', 2),
    {},
  );
  assert.equal(downscale.ok, false);
  assert.equal(downscale.refusals[0].id, 'scale-down-not-allowed');
});

test('ensureCnpgTopology refuses insufficient memory for scale-up', () => {
  const request = {
    command: 'ensure',
    env: 'release',
    clusterName: RELEASE_CNPG_CLUSTER,
    instances: 4,
    confirmContext: RELEASE_CNPG_CONTEXT,
    allowScaleDown: false,
  };
  const result = ensureCnpgTopology(
    request,
    buildObservation('release', 1, { memoryMiB: 5000 }),
    {},
  );
  assert.equal(result.ok, false);
  assert.equal(result.refusals[0].id, 'insufficient-memory');
});

test('ensureCnpgTopology reports CAS patch failure without blind retry', () => {
  const request = {
    command: 'ensure',
    env: 'release',
    clusterName: RELEASE_CNPG_CLUSTER,
    instances: 2,
    confirmContext: RELEASE_CNPG_CONTEXT,
    allowScaleDown: false,
  };
  const observation = buildObservation('release', 1);
  let patchCalls = 0;
  const run = (command, args) => {
    if (command === 'kubectl' && args.includes('patch')) {
      patchCalls += 1;
      return {
        ok: false,
        status: 1,
        stdout: '',
        stderr: 'conflict',
        timedOut: false,
        missing: false,
      };
    }
    if (command === 'kubectl' && args.includes('get')) {
      return {
        ok: true,
        status: 0,
        stdout: JSON.stringify(observation.cluster),
        stderr: '',
        timedOut: false,
        missing: false,
      };
    }
    return {
      ok: false,
      status: 1,
      stdout: '',
      stderr: 'unexpected',
      timedOut: false,
      missing: false,
    };
  };
  const result = ensureCnpgTopology(request, observation, {
    run,
    collect: () => observation,
  });
  assert.equal(result.ok, false);
  assert.equal(result.refusals[0].id, 'patch-failed');
  assert.equal(patchCalls, 1);
});

test('ensureCnpgTopology marks uncertain write when patch fails but target applied', () => {
  const request = {
    command: 'ensure',
    env: 'release',
    clusterName: RELEASE_CNPG_CLUSTER,
    instances: 2,
    confirmContext: RELEASE_CNPG_CONTEXT,
    allowScaleDown: false,
  };
  const observation = buildObservation('release', 1);
  const scaled = {
    ...observation.cluster,
    spec: { ...observation.cluster.spec, instances: 2 },
    status: healthyClusterStatus(2),
  };
  const run = (command, args) => {
    if (command === 'kubectl' && args.includes('patch')) {
      return {
        ok: false,
        status: 1,
        stdout: '',
        stderr: 'timeout',
        timedOut: true,
        missing: false,
      };
    }
    if (command === 'kubectl' && args.includes('get')) {
      return {
        ok: true,
        status: 0,
        stdout: JSON.stringify(scaled),
        stderr: '',
        timedOut: false,
        missing: false,
      };
    }
    return {
      ok: false,
      status: 1,
      stdout: '',
      stderr: 'unexpected',
      timedOut: false,
      missing: false,
    };
  };
  const result = ensureCnpgTopology(request, observation, {
    run,
    collect: () => observation,
  });
  assert.equal(result.ok, false);
  assert.equal(result.refusals[0].id, 'patch-result-uncertain');
  assert.equal(result.mutated, true);
});

test('ensureCnpgTopology allows explicit downscale and polls readiness', () => {
  const request = {
    command: 'ensure',
    env: 'release',
    clusterName: RELEASE_CNPG_CLUSTER,
    instances: 1,
    confirmContext: RELEASE_CNPG_CONTEXT,
    allowScaleDown: true,
  };
  const observation = buildObservation('release', 2);
  const scaled = {
    ...observation.cluster,
    spec: { ...observation.cluster.spec, instances: 1 },
    status: healthyClusterStatus(1),
  };
  const run = (command, args) => {
    if (command === 'kubectl' && args.includes('patch')) {
      return {
        ok: true,
        status: 0,
        stdout: JSON.stringify(scaled),
        stderr: '',
        timedOut: false,
        missing: false,
      };
    }
    if (command === 'kubectl' && args.includes('get')) {
      return {
        ok: true,
        status: 0,
        stdout: JSON.stringify(scaled),
        stderr: '',
        timedOut: false,
        missing: false,
      };
    }
    return {
      ok: false,
      status: 1,
      stdout: '',
      stderr: 'unexpected',
      timedOut: false,
      missing: false,
    };
  };
  let clock = 0;
  const result = ensureCnpgTopology(request, observation, {
    run,
    collect: () => observation,
    now: () => clock,
    sleep: (ms) => {
      clock += ms;
    },
  });
  assert.equal(result.ok, true);
  assert.equal(result.mutated, true);
  assert.equal(result.targetInstances, 1);
});

test('waitForCnpgTopologyReadiness fails on bounded timeout', () => {
  const stale = buildObservation('dev', 2).cluster;
  stale.status.readyInstances = 1;
  let clock = 0;
  const result = waitForCnpgTopologyReadiness('dev', 2, {
    run: () => ({
      ok: true,
      status: 0,
      stdout: JSON.stringify(stale),
      stderr: '',
      timedOut: false,
      missing: false,
    }),
    now: () => clock,
    sleep: (ms) => {
      clock += ms;
    },
    readinessTimeoutMs: 1,
  });
  assert.equal(result.ok, false);
});

test('runCnpgTopologyControl uses injected collect for both envs', () => {
  for (const profile of ['dev', 'release']) {
    const receipt = runCnpgTopologyControl(
      {
        command: 'status',
        env: profile,
        clusterName:
          profile === 'dev' ? DEV_CNPG_CLUSTER : RELEASE_CNPG_CLUSTER,
        instances: 2,
        allowScaleDown: false,
      },
      { collect: () => buildObservation(profile, 1) },
    );
    assert.equal(receipt.command, 'status');
    assert.equal(receipt.ok, true);
  }
});

test('owned plan and status report endpoints without secrets', () => {
  const ownerId = 'agent01';
  const clusterName = 'pg-agent01';
  const observation = buildOwnedObservation('dev', ownerId, clusterName, 2);
  const request = {
    command: 'plan',
    env: 'dev',
    ownerId,
    clusterName,
    instances: 4,
    allowScaleDown: false,
  };
  const plan = planOwnedCnpgTopology(request, observation);
  assert.equal(plan.ok, true);
  assert.equal(plan.mode, 'owned');
  assert.equal(plan.resources?.delta.instances, 2);

  const status = runCnpgTopologyControl(
    { ...request, command: 'status' },
    { collectOwned: () => observation },
  );
  assert.deepEqual(
    status.endpoints,
    buildOwnedCnpgEndpoints(clusterName, observation.namespaceName),
  );
  assert.equal(status.clusterUid, 'owned-cluster-uid');
  assert.equal(JSON.stringify(status).includes('password'), false);
});

test('owned ensure create/reuse/scale uses kubectl create targets only', () => {
  const ownerId = 'run01';
  const clusterName = 'pg-run01';
  const nsName = `offscreen-pg-${ownerId}`;
  const request = {
    command: 'ensure',
    env: 'release',
    ownerId,
    clusterName,
    instances: 2,
    confirmContext: RELEASE_CNPG_CONTEXT,
    allowScaleDown: false,
  };
  const absent = buildOwnedObservation('release', ownerId, clusterName, 1, {
    cluster: null,
    clusterIdentity: 'absent',
    namespaceOwnership: 'absent',
    ownedNamespace: null,
  });
  /** @type {string[]} */
  const commandLog = [];
  let clock = 0;
  let phase = 'create-ns';
  const scaled = buildOwnedObservation('release', ownerId, clusterName, 2);
  const run = (command, args, options) => {
    commandLog.push([command, ...args].join(' '));
    if (command === 'kubectl' && args.includes('create')) {
      if (phase === 'create-ns') {
        phase = 'create-cluster';
        return {
          ok: true,
          status: 0,
          stdout: JSON.stringify({
            metadata: { uid: 'new-ns-uid', name: nsName },
          }),
          stderr: '',
          timedOut: false,
          missing: false,
        };
      }
      return {
        ok: true,
        status: 0,
        stdout: JSON.stringify({
          metadata: { uid: 'new-cluster-uid', name: clusterName },
        }),
        stderr: '',
        timedOut: false,
        missing: false,
      };
    }
    if (command === 'kubectl' && args.includes('get')) {
      return {
        ok: true,
        status: 0,
        stdout: JSON.stringify(scaled.cluster),
        stderr: '',
        timedOut: false,
        missing: false,
      };
    }
    return {
      ok: false,
      status: 1,
      stdout: '',
      stderr: 'unexpected',
      timedOut: false,
      missing: false,
    };
  };
  const created = ensureOwnedCnpgTopology(request, absent, {
    run,
    collect: () =>
      phase === 'create-ns'
        ? absent
        : buildOwnedObservation('release', ownerId, clusterName, 2, {
            ownedNamespace: {
              metadata: { uid: 'new-ns-uid', name: nsName },
            },
            namespaceOwnership: 'owned',
            cluster: null,
            clusterIdentity: 'absent',
          }),
    renderOwned: () => ({
      namespace: { metadata: { name: nsName } },
      cluster: scaled.expectedCluster,
    }),
    now: () => clock,
    sleep: (ms) => {
      clock += ms;
    },
  });
  assert.equal(created.ok, true);
  assert.equal(
    created.endpoints.readWrite,
    `${clusterName}-rw.${nsName}.svc.cluster.local:5432`,
  );
  assert.ok(
    commandLog.some(
      (line) =>
        line.includes(' create ') && line.includes(RELEASE_CNPG_CONTEXT),
    ),
  );
  assert.equal(
    commandLog.some((line) => line.includes('delete')),
    false,
  );
  assert.equal(
    commandLog.some((line) => line.includes(' apply')),
    false,
  );
});

test('owned ensure refuses wrong context operator conflict and partial create', () => {
  const ownerId = 'run02';
  const clusterName = 'pg-run02';
  const request = {
    command: 'ensure',
    env: 'dev',
    ownerId,
    clusterName,
    instances: 2,
    confirmContext: 'kind-wrong',
    allowScaleDown: false,
  };
  const obs = buildOwnedObservation('dev', ownerId, clusterName, 1, {
    namespaceOwnership: 'absent',
    ownedNamespace: null,
    cluster: null,
    clusterIdentity: 'absent',
  });
  const wrongContext = ensureOwnedCnpgTopology(request, obs, {});
  assert.equal(wrongContext.refusals[0].id, 'confirm-context-mismatch');

  const noOperator = planOwnedCnpgTopology(
    {
      command: 'plan',
      env: 'dev',
      ownerId,
      clusterName,
      instances: 2,
      allowScaleDown: false,
    },
    buildOwnedObservation('dev', ownerId, clusterName, 1, {
      operator: null,
    }),
  );
  assert.equal(noOperator.ok, false);
  assert.ok(noOperator.refusals.some((item) => item.id === 'operator-absent'));

  const foreignNs = planOwnedCnpgTopology(
    {
      command: 'plan',
      env: 'dev',
      ownerId,
      clusterName,
      instances: 2,
      allowScaleDown: false,
    },
    buildOwnedObservation('dev', ownerId, clusterName, 1, {
      namespaceOwnership: 'foreign',
      ownedNamespace: {
        metadata: {
          uid: 'foreign-uid',
          labels: { 'offscreen.dev/owner': 'foreign' },
        },
      },
    }),
  );
  assert.ok(
    foreignNs.refusals.some((item) => item.id === 'owned-namespace-foreign'),
  );

  let patchCalls = 0;
  const reuse = buildOwnedObservation('release', ownerId, clusterName, 1);
  const scaleRequest = {
    ...request,
    env: 'release',
    confirmContext: RELEASE_CNPG_CONTEXT,
    instances: 2,
  };
  const scaleRun = (command, args) => {
    if (command === 'kubectl' && args.includes('patch')) {
      patchCalls += 1;
      return {
        ok: false,
        status: 1,
        stdout: '',
        stderr: 'AlreadyExists',
        timedOut: false,
        missing: false,
      };
    }
    if (command === 'kubectl' && args.includes('get')) {
      return {
        ok: true,
        status: 0,
        stdout: JSON.stringify(reuse.cluster),
        stderr: '',
        timedOut: false,
        missing: false,
      };
    }
    return {
      ok: false,
      status: 1,
      stdout: '',
      stderr: 'unexpected',
      timedOut: false,
      missing: false,
    };
  };
  const conflict = ensureOwnedCnpgTopology(scaleRequest, reuse, {
    run: scaleRun,
    collect: () => reuse,
    renderOwned: () => ({
      namespace: reuse.ownedNamespace,
      cluster: reuse.expectedCluster,
    }),
  });
  assert.equal(conflict.ok, false);
  assert.equal(patchCalls, 1);

  let namespaceCreated = false;
  let clusterCreateAttempts = 0;
  const partial = ensureOwnedCnpgTopology(
    {
      command: 'ensure',
      env: 'release',
      ownerId,
      clusterName,
      instances: 2,
      confirmContext: RELEASE_CNPG_CONTEXT,
      allowScaleDown: false,
    },
    absentObservationForPartial(ownerId, clusterName),
    {
      run: (command, args) => {
        if (command === 'kubectl' && args.includes('create')) {
          clusterCreateAttempts += 1;
          if (clusterCreateAttempts === 1) {
            namespaceCreated = true;
            return {
              ok: true,
              status: 0,
              stdout: JSON.stringify({ metadata: { uid: 'partial-ns' } }),
              stderr: '',
              timedOut: false,
              missing: false,
            };
          }
          return {
            ok: false,
            status: 1,
            stdout: '',
            stderr: 'AlreadyExists',
            timedOut: false,
            missing: false,
          };
        }
        return {
          ok: false,
          status: 1,
          stdout: '',
          stderr: 'unexpected',
          timedOut: false,
          missing: false,
        };
      },
      collect: () =>
        namespaceCreated
          ? buildOwnedObservation('release', ownerId, clusterName, 1, {
              namespaceOwnership: 'owned',
              ownedNamespace: {
                metadata: {
                  uid: 'partial-ns',
                  name: `offscreen-pg-${ownerId}`,
                  labels: {
                    'offscreen.rpg/lab': 'disposable',
                    'offscreen.rpg/pg-experiment': ownerId,
                  },
                },
              },
              cluster: null,
              clusterIdentity: 'absent',
            })
          : absentObservationForPartial(ownerId, clusterName),
      renderOwned: () => {
        const rendered = buildOwnedObservation(
          'release',
          ownerId,
          clusterName,
          2,
        );
        return {
          namespace: { metadata: { name: `offscreen-pg-${ownerId}` } },
          cluster: rendered.expectedCluster,
        };
      },
    },
  );
  assert.equal(partial.ok, false);
  assert.equal(partial.refusals[0].id, 'create-conflict');
  assert.equal(partial.recoveryIdentity.namespaceUid, 'partial-ns');
});

function absentObservationForPartial(ownerId, clusterName) {
  return buildOwnedObservation('release', ownerId, clusterName, 1, {
    namespaceOwnership: 'absent',
    ownedNamespace: null,
    cluster: null,
    clusterIdentity: 'absent',
  });
}
