import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { runPlatformCommand } from '../../common/commands.mjs';
import { renderPlatformDocuments } from '../../common/render.mjs';
import {
  CNPG_HEALTHY_PHASE,
  assertPositiveCnpgInstances,
  assessCnpgClusterTopologyReadiness,
  buildInstancesCasPatch,
  ensureCnpgTopology,
  parseTopologyCliArgs,
  planCnpgTopology,
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
    'offscreen-release',
    '--instances',
    '2',
  ]);
  assert.deepEqual(parsed, {
    command: 'plan',
    env: 'release',
    kindClusterName: 'offscreen-release',
    instances: 2,
    allowScaleDown: false,
  });
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
        'offscreen-dev',
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
        'offscreen-dev',
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
        'offscreen-dev',
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
        'offscreen-dev',
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
      kindClusterName:
        profile === 'dev' ? 'offscreen-dev' : 'offscreen-release',
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

test('planCnpgTopology refuses wrong kind cluster and owner mismatch', () => {
  const request = {
    command: 'plan',
    env: 'release',
    kindClusterName: 'wrong-kind',
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
    plan.refusals.some((item) => item.id === 'wrong-cluster'),
    'wrong cluster',
  );
  assert.ok(
    plan.refusals.some(
      (item) => item.id === 'postgres-namespace-owner-mismatch',
    ),
    'owner mismatch',
  );
});

test('ensureCnpgTopology refuses scale-down without flag and wrong confirm context', () => {
  const request = {
    command: 'ensure',
    env: 'release',
    kindClusterName: 'offscreen-release',
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
    kindClusterName: 'offscreen-release',
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
    kindClusterName: 'offscreen-release',
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
    kindClusterName: 'offscreen-release',
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
    kindClusterName: 'offscreen-release',
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
        kindClusterName:
          profile === 'dev' ? 'offscreen-dev' : 'offscreen-release',
        instances: 2,
        allowScaleDown: false,
      },
      { collect: () => buildObservation(profile, 1) },
    );
    assert.equal(receipt.command, 'status');
    assert.equal(receipt.ok, true);
  }
});
