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
      namespace: 'lab-app',
      name: 'storyteller-worker',
      uid: 'dep-uid-aaaa',
      kind: 'Deployment',
      imageDigest: DIGEST,
      labels: { 'offscreen.rpg/chaos-eligible': 'true' },
    },
  ],
};

const KUBE_SYSTEM_UID = 'cluster-uid-1111';

/** @param {{ spy?: { calls: string[][] }, overrides?: Record<string, unknown> }} [opts] */
function labExecFixture(opts = {}) {
  const spy = opts.spy ?? { calls: [] };
  const deployment = {
    metadata: { uid: 'dep-uid-aaaa', name: 'storyteller-worker', namespace: 'lab-app' },
    spec: {
      template: {
        spec: {
          containers: [
            {
              image: `registry.example/app@${DIGEST}`,
            },
          ],
        },
      },
    },
    status: {
      containerStatuses: [
        { imageID: `registry.example/app@${DIGEST}`, ready: true },
      ],
    },
  };
  const pod = {
    metadata: {
      uid: 'pod-eligible-1',
      name: 'storyteller-worker-abc',
      namespace: 'lab-app',
      labels: {},
      ownerReferences: [
        {
          kind: 'Deployment',
          name: 'storyteller-worker',
          uid: 'dep-uid-aaaa',
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
      return { argv: [file, ...args], stdout: 'offscreen-lab\n', stderr: '', status: 0 };
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
    if (joined.includes('pods') && joined.includes('lab-app')) {
      return {
        argv: [file, ...args],
        stdout: JSON.stringify({ items: [pod] }),
        stderr: '',
        status: 0,
      };
    }
    return { argv: [file, ...args], stdout: '', stderr: 'unexpected', status: 1 };
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
    assert.ok(!isMutatingKubectlInvocation(['kubectl', '--context', LAB_CONTEXT_NAME, 'get', 'pods']));
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
        (c) => c[0] === 'kubectl' && c.includes('--context') && c.includes(LAB_CONTEXT_NAME),
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
        return { argv: [file, ...args], stdout: 'other-lab\n', stderr: '', status: 0 };
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

  test('image digest unavailable when deployment manifest lacks sha256', () => {
    const { execFile } = labExecFixture();
    const noDigestExec = (file, args) => {
      const joined = [file, ...args].join('\0');
      if (joined.includes('deployment\0storyteller-worker')) {
        return {
          argv: [file, ...args],
          stdout: JSON.stringify({
            metadata: { uid: 'dep-uid-aaaa' },
            spec: { template: { spec: { containers: [{ image: 'app:latest' }] } } },
          }),
          stderr: '',
          status: 0,
        };
      }
      return execFile(file, args);
    };
    const plan = runPreflightPlan({
      runId: 'run-no-digest',
      seed: '1',
      maxEvents: 1,
      releaseRefPath: 'fixture-release.json',
      execFile: noDigestExec,
      readReleaseRef: () => RELEASE_REF,
      readMeminfo: () => MIN_MEM_AVAILABLE_KIB + 1,
      clusterLockExists: () => false,
    });
    assert.equal(plan.reason, 'image-digest-unavailable');
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
      () => adapter.runKubectl(['delete', 'pod', 'x', '-n', 'lab-app']),
      /mutating kubectl/,
    );
    assert.equal(adapter.invocations.length, 0);
  });
});

describe('controller CLI', () => {
  test('--execute is rejected until T04', () => {
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
      execFile: () => ({ argv: [], stdout: '', stderr: '', status: 0 }),
    });
    const plan = JSON.parse(chunks.join(''));
    assert.equal(plan.reason, 'execute-not-implemented');
    assert.equal(result.exitCode, 2);
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
    const args = parseControllerArgs(['--run-id', 'a', '--seed', 'b', '--release-ref', 'c']);
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
      kindClusters: ['offscreen-lab'],
      currentContext: LAB_CONTEXT_NAME,
      clusterUid: null,
      memAvailableKib: MIN_MEM_AVAILABLE_KIB + 1,
      conflictingRun: false,
    });
    assert.equal(plan.reason, 'cluster-uid-unavailable');
  });
});