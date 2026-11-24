import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  API_IMAGE,
  CLUSTER_NAME,
  CONTEXT_NAME,
  GA_IMAGE,
  WEB_IMAGE,
  WORKER_IMAGE,
  runTurn03Preflight,
} from './preflight.mjs';
import {
  assertNoFakePass,
  buildBlockedPreflightReport,
  computeTurn03DistributedPocProofOverall,
  createEmptyTurn03DistributedPocProofReport,
  renderReport,
} from './report.mjs';

const SECRET_CANARY_VALUE = 'SECRET_CANARY_VALUE_do_not_leak_0123456789abcdef';

function makeAllPresentRun() {
  /** @type {Array<{ cmd: string, args: string[] }>} */
  const invocations = [];

  const run = (cmd, args) => {
    invocations.push({ cmd, args });
    if (cmd === 'kubectl' && args[0] === 'config' && args[1] === 'get-contexts') {
      return { status: 0, stdout: `${CONTEXT_NAME}\n`, stderr: '' };
    }
    if (cmd === 'kind' && args[0] === 'get' && args[1] === 'clusters') {
      return { status: 0, stdout: `${CLUSTER_NAME}\n`, stderr: '' };
    }
    if (cmd === 'kubectl' && args[0] === '--context') {
      return { status: 0, stdout: 'ok\n', stderr: '' };
    }
    if (cmd === 'git' && args[0] === 'rev-parse') {
      return { status: 0, stdout: 'bc562b77663472c8cccdd1bb68f79a00bddb619a\n', stderr: '' };
    }
    if (cmd === 'docker' && args[0] === 'image' && args[1] === 'inspect') {
      return { status: 0, stdout: '[]\n', stderr: '' };
    }
    return { status: 0, stdout: '', stderr: '' };
  };

  const dockerInspect = () => 'sha256:deadbeef';

  return { run, dockerInspect, invocations };
}

describe('TURN03 T01 preflight and blocked report', () => {
  it('missing oauth env => auth-ssr BLOCKED, overall BLOCKED, no secret canary in JSON', async () => {
    const { run, dockerInspect } = makeAllPresentRun();

    const preflight = await runTurn03Preflight({
      run,
      dockerInspect,
      repoRoot: '/fake/repo',
      readEnvFile: () =>
        [
          'GITHUB_CLIENT_ID=',
          `GITHUB_CLIENT_SECRET=${SECRET_CANARY_VALUE}`,
          'BETTER_AUTH_SECRET=short',
        ].join('\n'),
    });

    assert.equal(preflight.runAllowed, false);
    assert.ok(preflight.missing.includes('oauthEnv'));
    assert.match(preflight.blockedReason ?? '', /OAuth|auth/i);

    const report = buildBlockedPreflightReport(preflight);
    const authGate = report.gates.find((g) => g.id === 'auth-ssr');
    assert.equal(authGate?.status, 'BLOCKED');
    assert.equal(report.overall, 'BLOCKED');

    const json = renderReport(report);
    assert.ok(!json.includes(SECRET_CANARY_VALUE));
    assertNoFakePass(report);
  });

  it('inadmissible PASS on cluster-real-app is rejected and overall is FAIL', () => {
    const report = createEmptyTurn03DistributedPocProofReport();
    report.gates = report.gates.map((gate) => {
      if (gate.id === 'cluster-real-app') {
        return {
          id: gate.id,
          status: 'PASS',
          evidence: { tier: 'pure', mocked: true, incomplete: false, summary: 'fake' },
        };
      }
      return { ...gate, status: 'PASS', evidence: { tier: 'kind-cross-pod', mocked: false } };
    });

    assert.throws(() => assertNoFakePass(report), /Inadmissible PASS/);
    const overall = computeTurn03DistributedPocProofOverall(report.gates);
    assert.equal(overall, 'FAIL');
  });

  it('missing kubectl context => cluster-real-app BLOCKED, no mutating cluster commands', async () => {
    /** @type {Array<{ cmd: string, args: string[] }>} */
    const invocations = [];

    const run = (cmd, args) => {
      invocations.push({ cmd, args });
      if (cmd === 'kubectl' && args[0] === 'config' && args[1] === 'get-contexts') {
        return { status: 0, stdout: 'other-context\n', stderr: '' };
      }
      if (cmd === 'kind' && args[0] === 'get' && args[1] === 'clusters') {
        return { status: 0, stdout: `${CLUSTER_NAME}\n`, stderr: '' };
      }
      if (cmd === 'kubectl' && args[0] === '--context') {
        return { status: 1, stdout: '', stderr: 'not found' };
      }
      if (cmd === 'git' && args[0] === 'rev-parse') {
        return { status: 0, stdout: 'abc\n', stderr: '' };
      }
      return { status: 0, stdout: '', stderr: '' };
    };

    const preflight = await runTurn03Preflight({
      run,
      dockerInspect: (image) => `digest:${image}`,
      readEnvFile: () =>
        [
          'GITHUB_CLIENT_ID=id',
          'GITHUB_CLIENT_SECRET=secret',
          'BETTER_AUTH_SECRET=abcdefghijklmnopqrstuvwxyz012345',
        ].join('\n'),
    });

    assert.equal(preflight.runAllowed, false);
    assert.ok(preflight.missing.includes('context'));

    const report = buildBlockedPreflightReport(preflight);
    const clusterGate = report.gates.find((g) => g.id === 'cluster-real-app');
    assert.equal(clusterGate?.status, 'BLOCKED');

    for (const { cmd, args } of invocations) {
      const joined = [cmd, ...args].join(' ');
      assert.ok(!joined.includes(' apply '), `unexpected apply: ${joined}`);
      assert.ok(!joined.includes(' delete '), `unexpected delete: ${joined}`);
      assert.ok(
        !(cmd === 'kind' && args.includes('create')),
        `unexpected kind create: ${joined}`,
      );
    }

    assert.equal(preflight.images.web, WEB_IMAGE);
    assert.equal(preflight.images.api, API_IMAGE);
    assert.equal(preflight.images.ga, GA_IMAGE);
    assert.equal(preflight.images.worker, WORKER_IMAGE);
  });
});