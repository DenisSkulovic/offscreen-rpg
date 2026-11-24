import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import { parseControllerArgs, runController } from '../controller.mjs';
import {
  CLUSTER_LOCK_PATH,
  LAB_CONTEXT_NAME,
  MIN_MEM_AVAILABLE_KIB,
  buildChaosPlan,
  createKubectlAdapter,
  isConflictingClusterRun,
  isMutatingKubectlInvocation,
  parseReleaseRef,
  runPreflightPlan,
} from '../preflight.mjs';

const DIGEST =
  'sha256:1111111111111111111111111111111111111111111111111111111111111111';

const RELEASE_REF = {
  schema: 'offscreen.chaos-release-ref.v1',
  releaseOwners: [
    {
      namespace: 'lab-workers',
      name: 'storyteller-worker',
      uid: 'dep-uid-aaaa',
      kind: 'Deployment',
      imageDigest: DIGEST,
      imageRef: 'offscreen-lab-app-release-worker:turn02',
      labels: { 'offscreen.rpg/chaos-eligible': 'true' },
    },
  ],
};

const KUBE_SYSTEM_UID = 'cluster-uid-1111';

/** @param {{ spy?: { calls: string[][] }, overrides?: Record<string, unknown> }} [opts] */
function labExecFixture(opts = {}) {
  const spy = opts.spy ?? { calls: [] };
  const deployment = {
    metadata: {
      uid: 'dep-uid-aaaa',
      name: 'storyteller-worker',
      namespace: 'lab-workers',
    },
    spec: {
      template: {
        metadata: { labels: { 'offscreen.rpg/chaos-eligible': 'true' } },
        spec: {
          containers: [{ image: 'offscreen-lab-app-release-worker:turn02' }],
        },
      },
    },
    status: {
      containerStatuses: [
        { imageID: `registry.example/app@${DIGEST}`, ready: true },
      ],
    },
  };
  const replicaSet = {
    metadata: {
      name: 'storyteller-worker-77f',
      uid: 'rs-uid-77f',
      namespace: 'lab-workers',
      ownerReferences: [
        {
          kind: 'Deployment',
          name: 'storyteller-worker',
          uid: 'dep-uid-aaaa',
          controller: true,
        },
      ],
    },
  };
  const pod = {
    metadata: {
      uid: 'pod-eligible-1',
      name: 'storyteller-worker-abc',
      namespace: 'lab-workers',
      labels: { 'offscreen.rpg/chaos-eligible': 'true' },
      ownerReferences: [
        {
          kind: 'ReplicaSet',
          name: 'storyteller-worker-77f',
          uid: 'rs-uid-77f',
          controller: true,
        },
      ],
    },
    status: {
      containerStatuses: [
        {
          ready: true,
          imageID: `docker.io/app@sha256:1111111111111111111111111111111111111111111111111111111111111111`,
        },
      ],
    },
  };

  /** @param {string} file @param {string[]} args */
  function execFile(file, args) {
    spy.calls.push([file, ...args]);
    const joined = [file, ...args].join('\0');

    if (file === 'kind' && args[0] === 'get' && args[1] === 'clusters') {
      return {
        argv: [file, ...args],
        stdout: 'offscreen-release\n',
        stderr: '',
        status: 0,
      };
    }
    if (joined.includes('config\0current-context')) {
      return {
        argv: [file, ...args],
        stdout: `${opts.context ?? LAB_CONTEXT_NAME}\n`,
        stderr: '',
        status: 0,
      };
    }
    if (joined.includes('namespace\0kube-system')) {
      return {
        argv: [file, ...args],
        stdout: KUBE_SYSTEM_UID,
        stderr: '',
        status: 0,
      };
    }
    if (joined.includes('deployment\0storyteller-worker')) {
      return {
        argv: [file, ...args],
        stdout: JSON.stringify(deployment),
        stderr: '',
        status: 0,
      };
    }
    if (joined.includes('replicasets') && joined.includes('lab-workers')) {
      return {
        argv: [file, ...args],
        stdout: JSON.stringify({ items: [opts.replicaSet ?? replicaSet] }),
        stderr: '',
        status: 0,
      };
    }
    if (joined.includes('pods') && joined.includes('lab-workers')) {
      return {
        argv: [file, ...args],
        stdout: JSON.stringify({ items: [opts.pod ?? pod] }),
        stderr: '',
        status: 0,
      };
    }
    return {
      argv: [file, ...args],
      stdout: '',
      stderr: 'unexpected',
      status: 1,
    };
  }

  return { execFile, spy };
}

describe('isMutatingKubectlInvocation', () => {
  test('detects delete and apply', () => {
    assert.ok(
      isMutatingKubectlInvocation([
        'kubectl',
        '--context',
        LAB_CONTEXT_NAME,
        'delete',
        'pod',
        'x',
      ]),
    );
    assert.ok(
      !isMutatingKubectlInvocation([
        'kubectl',
        '--context',
        LAB_CONTEXT_NAME,
        'get',
        'pods',
      ]),
    );
  });
});

describe('parseReleaseRef', () => {
  test('accepts valid release owners', () => {
    const parsed = parseReleaseRef(RELEASE_REF);
    assert.equal(parsed.ok, true);
    assert.equal(parsed.releaseOwners.length, 1);
  });

  test('refuses empty releaseOwners', () => {
    const parsed = parseReleaseRef({ releaseOwners: [] });
    assert.equal(parsed.ok, false);
    assert.equal(parsed.reason, 'unknown-release');
  });
});

describe('runPreflightPlan positive', () => {
  test('fixture cluster yields plan with one eligible app Pod UID', () => {
    const { execFile, spy } = labExecFixture();
    const plan = runPreflightPlan({
      runId: 'run-2026-lab-01',
      seed: 'chaos-round-7',
      maxEvents: 1,
      releaseRefPath: 'fixture-release.json',
      execFile,
      readReleaseRef: () => RELEASE_REF,
      readMeminfo: () => MIN_MEM_AVAILABLE_KIB + 1_000_000,
      clusterLockExists: () => false,
    });

    assert.equal(plan.status, 'planned');
    assert.equal(plan.target.podUid, 'pod-eligible-1');
    assert.equal(plan.cluster.uid, KUBE_SYSTEM_UID);
    assert.equal(plan.preflight.mutatingInvocations, 0);

    const mutating = spy.calls.filter((call) =>
      isMutatingKubectlInvocation(call),
    );
    assert.equal(mutating.length, 0);
    assert.ok(
      spy.calls.some(
        (c) =>
          c[0] === 'kubectl' &&
          c.includes('--context') &&
          c.includes(LAB_CONTEXT_NAME),
      ),
    );
  });
});

describe('runPreflightPlan negative', () => {
  test('wrong kube context refuses with zero mutating invocations', () => {
    const { execFile, spy } = labExecFixture({ context: 'prod' });
    const plan = runPreflightPlan({
      runId: 'run-wrong-ctx',
      seed: '1',
      maxEvents: 1,
      releaseRefPath: 'fixture-release.json',
      execFile,
      readReleaseRef: () => RELEASE_REF,
      readMeminfo: () => MIN_MEM_AVAILABLE_KIB + 1,
      clusterLockExists: () => false,
    });
    assert.equal(plan.status, 'refused');
    assert.equal(plan.reason, 'wrong-context');
    assert.equal(
      spy.calls.filter((c) => isMutatingKubectlInvocation(c)).length,
      0,
    );
  });

  test('kind cluster absent refuses', () => {
    const { execFile } = labExecFixture();
    const execNoCluster = (file, args) => {
      if (file === 'kind') {
        return {
          argv: [file, ...args],
          stdout: 'other-lab\n',
          stderr: '',
          status: 0,
        };
      }
      return execFile(file, args);
    };
    const plan = runPreflightPlan({
      runId: 'run-no-cluster',
      seed: '1',
      maxEvents: 1,
      releaseRefPath: 'fixture-release.json',
      execFile: execNoCluster,
      readReleaseRef: () => RELEASE_REF,
      readMeminfo: () => MIN_MEM_AVAILABLE_KIB + 1,
      clusterLockExists: () => false,
    });
    assert.equal(plan.reason, 'cluster-absent');
  });

  test('unknown release refuses', () => {
    const { execFile } = labExecFixture();
    const plan = runPreflightPlan({
      runId: 'run-bad-release',
      seed: '1',
      maxEvents: 1,
      releaseRefPath: 'missing.json',
      execFile,
      readReleaseRef: () => ({ releaseOwners: [] }),
      readMeminfo: () => MIN_MEM_AVAILABLE_KIB + 1,
      clusterLockExists: () => false,
    });
    assert.equal(plan.reason, 'unknown-release');
  });

  test('low memory refuses', () => {
    const { execFile } = labExecFixture();
    const plan = runPreflightPlan({
      runId: 'run-low-mem',
      seed: '1',
      maxEvents: 1,
      releaseRefPath: 'fixture-release.json',
      execFile,
      readReleaseRef: () => RELEASE_REF,
      readMeminfo: () => MIN_MEM_AVAILABLE_KIB - 1,
      clusterLockExists: () => false,
    });
    assert.equal(plan.reason, 'low-memory');
  });

  test('conflicting cluster run refuses when lock path exists', () => {
    const { execFile } = labExecFixture();
    const plan = runPreflightPlan({
      runId: 'run-locked',
      seed: '1',
      maxEvents: 1,
      releaseRefPath: 'fixture-release.json',
      execFile,
      readReleaseRef: () => RELEASE_REF,
      readMeminfo: () => MIN_MEM_AVAILABLE_KIB + 1,
      clusterLockExists: () => true,
    });
    assert.equal(plan.reason, 'conflicting-run');
    assert.equal(plan.detail, CLUSTER_LOCK_PATH);
    assert.ok(isConflictingClusterRun({ clusterLockExists: () => true }));
  });

  test('tag-only Deployment is eligible when Pod imageID matches pinned digest', () => {
    const { execFile } = labExecFixture();
    const plan = runPreflightPlan({
      runId: 'run-tagged-image',
      seed: '1',
      maxEvents: 1,
      releaseRefPath: 'fixture-release.json',
      execFile,
      readReleaseRef: () => RELEASE_REF,
      readMeminfo: () => MIN_MEM_AVAILABLE_KIB + 1,
      clusterLockExists: () => false,
    });
    assert.equal(plan.status, 'planned');
    assert.equal(plan.target.imageDigest, DIGEST);
  });

  test('live Deployment template must be opted in, local label alone is insufficient', () => {
    const { execFile } = labExecFixture();
    const badDeployment = (file, args) => {
      const result = execFile(file, args);
      if (file === 'kubectl' && args.includes('deployment')) {
        const deployment = JSON.parse(result.stdout);
        delete deployment.spec.template.metadata.labels[
          'offscreen.rpg/chaos-eligible'
        ];
        return { ...result, stdout: JSON.stringify(deployment) };
      }
      return result;
    };
    const plan = runPreflightPlan({
      runId: 'run-fake-local-label',
      seed: '1',
      maxEvents: 1,
      releaseRefPath: 'fixture-release.json',
      execFile: badDeployment,
      readReleaseRef: () => RELEASE_REF,
      readMeminfo: () => MIN_MEM_AVAILABLE_KIB + 1,
      clusterLockExists: () => false,
    });
    assert.equal(plan.reason, 'missing-chaos-eligibility');
  });

  test('Pod ReplicaSet UID mismatch refuses selection', () => {
    const { execFile } = labExecFixture();
    const badRs = (file, args) => {
      const result = execFile(file, args);
      if (file === 'kubectl' && args.includes('replicasets')) {
        const row = JSON.parse(result.stdout);
        row.items[0].metadata.uid = 'a-different-replicaset-uid';
        return { ...result, stdout: JSON.stringify(row) };
      }
      return result;
    };
    const plan = runPreflightPlan({
      runId: 'run-wrong-rs',
      seed: '1',
      maxEvents: 1,
      releaseRefPath: 'fixture-release.json',
      execFile: badRs,
      readReleaseRef: () => RELEASE_REF,
      readMeminfo: () => MIN_MEM_AVAILABLE_KIB + 1,
      clusterLockExists: () => false,
    });
    assert.equal(plan.reason, 'no-eligible-targets');
  });

  test('a ReplicaSet owned by a different Deployment UID cannot qualify', () => {
    const { execFile } = labExecFixture();
    const badRsParent = (file, args) => {
      const result = execFile(file, args);
      if (file === 'kubectl' && args.includes('replicasets')) {
        const row = JSON.parse(result.stdout);
        row.items[0].metadata.ownerReferences[0].uid = 'wrong-deployment-uid';
        return { ...result, stdout: JSON.stringify(row) };
      }
      return result;
    };
    const plan = runPreflightPlan({
      runId: 'run-wrong-deployment-owner',
      seed: '1',
      maxEvents: 1,
      releaseRefPath: 'fixture-release.json',
      execFile: badRsParent,
      readReleaseRef: () => RELEASE_REF,
      readMeminfo: () => MIN_MEM_AVAILABLE_KIB + 1,
      clusterLockExists: () => false,
    });
    assert.equal(plan.reason, 'no-eligible-targets');
  });

  test('live Pod must itself carry chaos eligibility, not just template', () => {
    const { execFile } = labExecFixture();
    const podNotOpted = (file, args) => {
      const result = execFile(file, args);
      if (file === 'kubectl' && args.includes('pods')) {
        const row = JSON.parse(result.stdout);
        delete row.items[0].metadata.labels['offscreen.rpg/chaos-eligible'];
        return { ...result, stdout: JSON.stringify(row) };
      }
      return result;
    };
    const plan = runPreflightPlan({
      runId: 'run-pod-not-opted',
      seed: '1',
      maxEvents: 1,
      releaseRefPath: 'fixture-release.json',
      execFile: podNotOpted,
      readReleaseRef: () => RELEASE_REF,
      readMeminfo: () => MIN_MEM_AVAILABLE_KIB + 1,
      clusterLockExists: () => false,
    });
    assert.equal(plan.reason, 'no-eligible-targets');
  });

  test('a changed Deployment image tag is refused even with same Pod digest', () => {
    const { execFile } = labExecFixture();
    const changedDeployment = (file, args) => {
      const result = execFile(file, args);
      if (file === 'kubectl' && args.includes('deployment')) {
        const row = JSON.parse(result.stdout);
        row.spec.template.spec.containers[0].image = 'unapproved:latest';
        return { ...result, stdout: JSON.stringify(row) };
      }
      return result;
    };
    const plan = runPreflightPlan({
      runId: 'run-wrong-tag',
      seed: '1',
      maxEvents: 1,
      releaseRefPath: 'fixture-release.json',
      execFile: changedDeployment,
      readReleaseRef: () => RELEASE_REF,
      readMeminfo: () => MIN_MEM_AVAILABLE_KIB + 1,
      clusterLockExists: () => false,
    });
    assert.equal(plan.reason, 'release-provenance-drift');
  });

  test('unknown or protected app namespace fails closed', () => {
    const { execFile } = labExecFixture();
    const plan = runPreflightPlan({
      runId: 'run-data-pod',
      seed: '1',
      maxEvents: 1,
      releaseRefPath: 'fixture-release.json',
      execFile,
      readReleaseRef: () => ({
        ...RELEASE_REF,
        releaseOwners: [
          { ...RELEASE_REF.releaseOwners[0], namespace: 'lab-postgres' },
        ],
      }),
      readMeminfo: () => MIN_MEM_AVAILABLE_KIB + 1,
      clusterLockExists: () => false,
    });
    assert.equal(plan.reason, 'unowned-app-namespace');
  });
});

describe('createKubectlAdapter', () => {
  test('rejects mutating subprocess before exec', () => {
    const adapter = createKubectlAdapter({
      execFile: () => ({
        argv: [],
        stdout: '',
        stderr: '',
        status: 0,
      }),
    });
    assert.throws(
      () => adapter.runKubectl(['delete', 'pod', 'x', '-n', 'lab-workers']),
      /mutating kubectl/,
    );
    assert.equal(adapter.invocations.length, 0);
  });
});

describe('controller CLI', () => {
  test('--execute without confirm flags refuses with zero mutating kubectl', () => {
    const spy = { calls: [] };
    const execFile = (file, args) => {
      spy.calls.push([file, ...args]);
      return { argv: [file, ...args], stdout: '', stderr: '', status: 0 };
    };
    const chunks = [];
    const result = runController({
      argv: [
        '--execute',
        '--run-id',
        'run-x',
        '--seed',
        '1',
        '--release-ref',
        'ref.json',
      ],
      write: (c) => chunks.push(c),
      execFile,
    });
    const plan = JSON.parse(chunks.join(''));
    assert.equal(plan.reason, 'missing-confirm-run-id');
    assert.equal(result.exitCode, 2);
    assert.equal(
      spy.calls.filter((c) => isMutatingKubectlInvocation(c)).length,
      0,
    );
  });

  test('default plan path uses dry-run preflight', () => {
    const { execFile } = labExecFixture();
    const chunks = [];
    const result = runController({
      argv: [
        '--mode',
        'plan',
        '--run-id',
        'run-plan',
        '--seed',
        '42',
        '--release-ref',
        'fixture-release.json',
      ],
      execFile,
      readReleaseRef: () => RELEASE_REF,
      readMeminfo: () => MIN_MEM_AVAILABLE_KIB + 1,
      clusterLockExists: () => false,
      write: (c) => chunks.push(c),
    });
    const plan = JSON.parse(chunks.join(''));
    assert.equal(plan.status, 'planned');
    assert.equal(plan.dryRun, true);
    assert.equal(result.exitCode, 0);
  });

  test('parseControllerArgs defaults', () => {
    const args = parseControllerArgs([
      '--run-id',
      'a',
      '--seed',
      'b',
      '--release-ref',
      'c',
    ]);
    assert.equal(args.mode, 'plan');
    assert.equal(args.dryRun, true);
    assert.equal(args.maxEvents, 1);
  });
});

describe('buildChaosPlan direct', () => {
  test('cluster uid unavailable refuses without guessing', () => {
    const kubectl = createKubectlAdapter({
      execFile: () => ({ argv: [], stdout: '', stderr: '', status: 0 }),
    });
    const plan = buildChaosPlan({
      runId: 'run-no-uid',
      seed: '1',
      maxEvents: 1,
      releaseRefPath: 'x.json',
      releaseRef: RELEASE_REF,
      kubectl,
      kindClusters: ['offscreen-release'],
      currentContext: LAB_CONTEXT_NAME,
      clusterUid: null,
      memAvailableKib: MIN_MEM_AVAILABLE_KIB + 1,
      conflictingRun: false,
    });
    assert.equal(plan.reason, 'cluster-uid-unavailable');
  });
});
