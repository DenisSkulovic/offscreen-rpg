import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import { runController } from '../controller.mjs';
import {
  LAB_CONTEXT_NAME,
  MIN_MEM_AVAILABLE_KIB,
  isMutatingKubectlInvocation,
} from '../preflight.mjs';
import { evaluateTurn03LiveEligibility } from '../turn03-proof-adapter.mjs';
import { TURN03_DISTRIBUTED_POC_PROOF_SCHEMA } from '../../release-acceptance/turn03/report.mjs';

const DIGEST =
  'sha256:1111111111111111111111111111111111111111111111111111111111111111';
const RELEASE_SHA = 'release-sha-abc123';
const CLUSTER_UID = 'cluster-uid-1111';

const EXPECTED = {
  releaseSha: RELEASE_SHA,
  clusterUid: CLUSTER_UID,
  imageDigests: {
    'offscreen-lab-app-release-worker:turn02': DIGEST,
  },
};

const OPT_IN = { 'offscreen.rpg/chaos-eligible': 'true' };

/** @param {Record<string, unknown>} [overrides] */
function passReport(overrides = {}) {
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
        evidence: {
          tier: 'kind-cross-pod',
          mocked: false,
          incomplete: false,
          summary: 'live',
        },
      },
    ],
    ...overrides,
  };
}

/** @param {Record<string, unknown>} [targetOverrides] */
function planWithOptIn(targetOverrides = {}) {
  return {
    status: 'planned',
    target: {
      podLabels: { ...OPT_IN },
      templateLabels: { ...OPT_IN },
      ...targetOverrides,
    },
  };
}

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
      labels: { ...OPT_IN },
    },
  ],
};

/** @param {{ spy?: { calls: string[][] } }} [opts] */
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
      containerStatuses: [
        {
          ready: true,
          imageID: `docker.io/app@${DIGEST}`,
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
        stdout: 'offscreen-lab\n',
        stderr: '',
        status: 0,
      };
    }
    if (joined.includes('config\0current-context')) {
      return {
        argv: [file, ...args],
        stdout: `${LAB_CONTEXT_NAME}\n`,
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
    if (joined.includes('replicasets') && joined.includes('lab-workers')) {
      return {
        argv: [file, ...args],
        stdout: JSON.stringify({ items: [replicaSet] }),
        stderr: '',
        status: 0,
      };
    }
    if (joined.includes('pods') && joined.includes('lab-workers')) {
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

describe('evaluateTurn03LiveEligibility', () => {
  test('PASS report with matching refs and opt-in plan => ELIGIBLE', () => {
    const result = evaluateTurn03LiveEligibility({
      turn03Report: passReport(),
      expected: EXPECTED,
      plan: planWithOptIn(),
    });
    assert.equal(result.eligible, true);
    assert.equal(result.liveStatus, 'ELIGIBLE');
    assert.equal(result.reason, 'turn03-pass');
    assert.equal(result.releaseSha, RELEASE_SHA);
    assert.equal(result.clusterUid, CLUSTER_UID);
  });

  test('missing report => turn03-proof-missing', () => {
    const result = evaluateTurn03LiveEligibility({
      turn03Report: null,
      expected: EXPECTED,
    });
    assert.equal(result.eligible, false);
    assert.equal(result.liveStatus, 'NOT-ELIGIBLE');
    assert.equal(result.reason, 'turn03-proof-missing');
  });

  test('FAIL overall => turn03-proof-failed', () => {
    const result = evaluateTurn03LiveEligibility({
      turn03Report: passReport({ overall: 'FAIL' }),
      expected: EXPECTED,
    });
    assert.equal(result.reason, 'turn03-proof-failed');
  });

  test('BLOCKED overall => turn03-proof-blocked', () => {
    const result = evaluateTurn03LiveEligibility({
      turn03Report: passReport({ overall: 'BLOCKED' }),
      expected: EXPECTED,
    });
    assert.equal(result.reason, 'turn03-proof-blocked');
  });

  test('stale sourceSha => turn03-release-sha-mismatch', () => {
    const result = evaluateTurn03LiveEligibility({
      turn03Report: passReport({ sourceSha: 'old-sha' }),
      expected: EXPECTED,
    });
    assert.equal(result.reason, 'turn03-release-sha-mismatch');
  });

  test('missing expected releaseSha => missing-release-ref', () => {
    const result = evaluateTurn03LiveEligibility({
      turn03Report: passReport(),
      expected: { ...EXPECTED, releaseSha: undefined },
    });
    assert.equal(result.reason, 'missing-release-ref');
  });

  test('plan target without pod opt-in => missing-pod-opt-in', () => {
    const result = evaluateTurn03LiveEligibility({
      turn03Report: passReport(),
      expected: EXPECTED,
      plan: planWithOptIn({ podLabels: {} }),
    });
    assert.equal(result.reason, 'missing-pod-opt-in');
  });

  test('mocked gate evidence => turn03-inadmissible-evidence', () => {
    const result = evaluateTurn03LiveEligibility({
      turn03Report: passReport({
        gates: [
          {
            id: 'auth-ssr',
            status: 'PASS',
            evidence: { tier: 'pure', mocked: true, incomplete: false },
          },
        ],
      }),
      expected: EXPECTED,
    });
    assert.equal(result.reason, 'turn03-inadmissible-evidence');
  });
});

describe('runController turn03 liveEligibility hook', () => {
  test('missing TURN03 report: not eligible and no mutating kubectl', () => {
    const spy = { calls: [] };
    const { execFile } = labExecFixture({ spy });
    const chunks = [];
    const result = runController({
      argv: [
        '--mode',
        'plan',
        '--run-id',
        'run-turn03-miss',
        '--seed',
        '1',
        '--release-ref',
        'fixture-release.json',
      ],
      execFile,
      readReleaseRef: () => RELEASE_REF,
      readMeminfo: () => MIN_MEM_AVAILABLE_KIB + 1,
      clusterLockExists: () => false,
      turn03Report: undefined,
      turn03Expected: EXPECTED,
      write: (c) => chunks.push(c),
    });

    const plan = JSON.parse(chunks.join(''));
    assert.equal(plan.liveEligibility?.eligible, false);
    assert.equal(plan.liveEligibility?.reason, 'turn03-proof-missing');
    assert.equal(result.exitCode, 0);

    for (const call of spy.calls) {
      assert.equal(
        isMutatingKubectlInvocation(call),
        false,
        `unexpected mutating kubectl: ${call.join(' ')}`,
      );
      assert.ok(!call.join(' ').includes('--force'));
      assert.ok(!call.join(' ').includes('--grace-period'));
    }
  });
});
