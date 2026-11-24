import assert from 'node:assert/strict';
import { describe, test, beforeEach } from 'node:test';

import {
  buildPodDeleteKubectlArgs,
  resetPodDeleteMemo,
  runController,
} from '../controller.mjs';
import {
  LAB_CONTEXT_NAME,
  MIN_MEM_AVAILABLE_KIB,
  isMutatingKubectlInvocation,
} from '../preflight.mjs';
import { TURN03_DISTRIBUTED_POC_PROOF_SCHEMA } from '../../release-acceptance/turn03/report.mjs';

const DIGEST =
  'sha256:1111111111111111111111111111111111111111111111111111111111111111';
const RELEASE_SHA = 'release-sha-abc123';
const CLUSTER_UID = 'cluster-uid-1111';
const RUN_ID = 'run-2026-lab-01';
const POD_UID = 'pod-eligible-1';
const POD_NAME = 'storyteller-worker-abc';
const NAMESPACE = 'lab-workers';

const EXPECTED = {
  releaseSha: RELEASE_SHA,
  clusterUid: CLUSTER_UID,
  imageDigests: {
    'offscreen-lab-app-release-worker:turn02': DIGEST,
  },
};

const OPT_IN = { 'offscreen.rpg/chaos-eligible': 'true' };

const RELEASE_REF = {
  schema: 'offscreen.chaos-release-ref.v1',
  releaseOwners: [
    {
      namespace: NAMESPACE,
      name: 'storyteller-worker',
      uid: 'dep-uid-aaaa',
      kind: 'Deployment',
      imageDigest: DIGEST,
      imageRef: 'offscreen-lab-app-release-worker:turn02',
      labels: { ...OPT_IN },
    },
  ],
};

function passReport() {
  return {
    schema: TURN03_DISTRIBUTED_POC_PROOF_SCHEMA,
    sourceSha: RELEASE_SHA,
    clusterUid: CLUSTER_UID,
    imageDigests: { ...EXPECTED.imageDigests },
    overall: 'PASS',
    gates: [
      {
        id: 'cluster-real-app',
        status: 'PASS',
        evidence: { tier: 'kind-cross-pod', mocked: false, incomplete: false },
      },
    ],
  };
}

/** @param {{ spy?: { calls: string[][] }, context?: string }} [opts] */
function labExecFixture(opts = {}) {
  const spy = opts.spy ?? { calls: [] };
  const deployment = {
    metadata: {
      uid: 'dep-uid-aaaa',
      name: 'storyteller-worker',
      namespace: NAMESPACE,
    },
    spec: {
      template: {
        metadata: { labels: { ...OPT_IN } },
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
      namespace: NAMESPACE,
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
      uid: POD_UID,
      name: POD_NAME,
      namespace: NAMESPACE,
      labels: { ...OPT_IN },
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
      containerStatuses: [{ ready: true, imageID: `docker.io/app@${DIGEST}` }],
    },
  };

  /** @param {string} file @param {string[]} args */
  function execFile(file, args) {
    spy.calls.push([file, ...args]);
    const joined = [file, ...args].join('\0');

    if (file === 'kubectl' && args.includes('delete') && args.includes('pod')) {
      return { argv: [file, ...args], stdout: '', stderr: '', status: 0 };
    }

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
        stdout: CLUSTER_UID,
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
    if (joined.includes('replicasets') && joined.includes(NAMESPACE)) {
      return {
        argv: [file, ...args],
        stdout: JSON.stringify({ items: [replicaSet] }),
        stderr: '',
        status: 0,
      };
    }
    if (joined.includes('pods') && joined.includes(NAMESPACE)) {
      return {
        argv: [file, ...args],
        stdout: JSON.stringify({ items: [pod] }),
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

function deleteCalls(spy) {
  return spy.calls.filter(
    (call) =>
      call[0] === 'kubectl' && call.includes('delete') && call.includes('pod'),
  );
}

function executeArgv(overrides = {}) {
  return [
    '--execute',
    '--run-id',
    RUN_ID,
    '--confirm-run-id',
    overrides.confirmRunId ?? RUN_ID,
    '--confirm-pod-uid',
    overrides.confirmPodUid ?? POD_UID,
    '--seed',
    'chaos-round-7',
    '--release-ref',
    'fixture-release.json',
    '--max-events',
    '1',
    ...(overrides.extra ?? []),
  ];
}

beforeEach(() => {
  resetPodDeleteMemo();
});

describe('buildPodDeleteKubectlArgs', () => {
  test('uses kind lab context and wait=false without force', () => {
    const args = buildPodDeleteKubectlArgs(NAMESPACE, POD_NAME);
    assert.deepEqual(args, [
      '--context',
      LAB_CONTEXT_NAME,
      '-n',
      NAMESPACE,
      'delete',
      'pod',
      POD_NAME,
      '--wait=false',
    ]);
    assert.ok(!args.includes('--force'));
  });
});

describe('runController execute pod delete', () => {
  test('eligible execute with matching confirm => exactly one delete argv', () => {
    const spy = { calls: [] };
    const { execFile } = labExecFixture({ spy });
    const chunks = [];
    const result = runController({
      argv: executeArgv(),
      execFile,
      readReleaseRef: () => RELEASE_REF,
      readMeminfo: () => MIN_MEM_AVAILABLE_KIB + 1,
      clusterLockExists: () => false,
      turn03Report: passReport(),
      turn03Expected: EXPECTED,
      write: (c) => chunks.push(c),
    });

    const plan = JSON.parse(chunks.join(''));
    assert.equal(result.exitCode, 0);
    assert.equal(plan.execution?.status, 'deleted');

    const deletes = deleteCalls(spy);
    assert.equal(deletes.length, 1);
    assert.deepEqual(
      deletes[0].slice(1),
      buildPodDeleteKubectlArgs(NAMESPACE, POD_NAME),
    );
    assert.ok(!deletes[0].join(' ').includes('--force'));
  });

  test('stale confirm pod UID => zero delete', () => {
    const spy = { calls: [] };
    const { execFile } = labExecFixture({ spy });
    const chunks = [];
    const result = runController({
      argv: executeArgv({ confirmPodUid: 'stale-pod-uid' }),
      execFile,
      readReleaseRef: () => RELEASE_REF,
      readMeminfo: () => MIN_MEM_AVAILABLE_KIB + 1,
      clusterLockExists: () => false,
      turn03Report: passReport(),
      turn03Expected: EXPECTED,
      write: (c) => chunks.push(c),
    });

    const plan = JSON.parse(chunks.join(''));
    assert.equal(plan.reason, 'stale-pod-uid');
    assert.equal(result.exitCode, 2);
    assert.equal(deleteCalls(spy).length, 0);
  });

  test('wrong kube context preflight => zero delete', () => {
    const spy = { calls: [] };
    const { execFile } = labExecFixture({ spy, context: 'prod' });
    const chunks = [];
    runController({
      argv: executeArgv(),
      execFile,
      readReleaseRef: () => RELEASE_REF,
      readMeminfo: () => MIN_MEM_AVAILABLE_KIB + 1,
      clusterLockExists: () => false,
      turn03Report: passReport(),
      turn03Expected: EXPECTED,
      write: (c) => chunks.push(c),
    });

    assert.equal(deleteCalls(spy).length, 0);
    for (const call of spy.calls) {
      if (call[0] === 'kubectl' && call.includes('--context')) {
        const ctxIndex = call.indexOf('--context');
        assert.equal(call[ctxIndex + 1], LAB_CONTEXT_NAME);
      }
    }
  });

  test('second execute same runId and pod uid => one delete total', () => {
    const spy = { calls: [] };
    const { execFile } = labExecFixture({ spy });
    const shared = {
      argv: executeArgv(),
      execFile,
      readReleaseRef: () => RELEASE_REF,
      readMeminfo: () => MIN_MEM_AVAILABLE_KIB + 1,
      clusterLockExists: () => false,
      turn03Report: passReport(),
      turn03Expected: EXPECTED,
    };

    runController({ ...shared, write: () => {} });
    const chunks = [];
    const secondResult = runController({
      ...shared,
      write: (c) => chunks.push(c),
    });

    assert.equal(deleteCalls(spy).length, 1);
    const plan = JSON.parse(chunks.join(''));
    assert.equal(plan.execution?.memoHit, true);
    assert.equal(secondResult.exitCode, 0);
  });

  test('plan mode => zero delete invocations', () => {
    const spy = { calls: [] };
    const { execFile } = labExecFixture({ spy });
    runController({
      argv: [
        '--mode',
        'plan',
        '--run-id',
        RUN_ID,
        '--seed',
        '1',
        '--release-ref',
        'fixture-release.json',
      ],
      execFile,
      readReleaseRef: () => RELEASE_REF,
      readMeminfo: () => MIN_MEM_AVAILABLE_KIB + 1,
      clusterLockExists: () => false,
      write: () => {},
    });

    assert.equal(deleteCalls(spy).length, 0);
    const mutating = spy.calls.filter((call) =>
      isMutatingKubectlInvocation(call),
    );
    assert.equal(mutating.length, 0);
    assert.ok(spy.calls.every((call) => !call.includes('delete')));
  });
});
