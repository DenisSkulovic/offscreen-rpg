import assert from 'node:assert/strict';
import test from 'node:test';
import { runTopologyCliArgv } from '../topology-cli.mjs';
import {
  buildTopologyCliHelp,
  formatTopologyResult,
} from '../topology-presentation.mjs';

const MALICIOUS = 'SECRET_ECHO_INJECTED_DO_NOT_PRINT';

function assertNoLeak(text) {
  assert.equal(text.includes(MALICIOUS), false);
  assert.equal(/\x1b\[[0-9;]*m/.test(text), false);
  assert.match(text, /^OFFSCREEN\nPOSTGRES TOPOLOGY/m);
}

test('help lists plan status ensure and owned examples', () => {
  const help = buildTopologyCliHelp();
  assert.match(help, /pnpm infra:postgres/);
  assert.match(help, /plan/);
  assert.match(help, /status/);
  assert.match(help, /ensure/);
  assert.match(help, /--owner RUN_ID/);
  assert.match(help, /--json/);
  assert.match(help, /kind-offscreen-release/);
  assert.doesNotMatch(help, /kubectl apply/);
});

test('formatTopologyResult shows instances budget readiness and refusals', () => {
  const text = formatTopologyResult({
    command: 'plan',
    ok: false,
    readOnly: true,
    env: 'release',
    baselineCluster: 'lab-pg',
    currentInstances: 1,
    targetInstances: 2,
    resources: {
      current: {
        instances: 1,
        memoryLimitPerInstanceMiB: 768,
        memoryRequestPerInstanceMiB: 256,
        cpuLimitPerInstance: '500m',
        cpuRequestPerInstance: '100m',
        storagePerInstance: '1Gi',
      },
      target: {
        instances: 2,
        memoryLimitTotalMiB: 1536,
        memoryRequestTotalMiB: 512,
        cpuLimitPerInstance: '500m',
        cpuRequestPerInstance: '100m',
        storagePerInstance: '1Gi',
      },
      delta: {
        instances: 1,
        memoryLimitMiB: 768,
        memoryRequestMiB: 256,
      },
    },
    refusals: [
      {
        id: 'insufficient-memory',
        detail: `need more memory ${MALICIOUS}`,
      },
      {
        id: 'not-a-real-refusal',
        detail: MALICIOUS,
      },
    ],
    mutated: false,
    complete: false,
  });
  assertNoLeak(text);
  assert.match(text, /result: REFUSED/);
  assert.match(text, /instances: current 1 desired 2/);
  assert.match(text, /budget:/);
  assert.match(text, /desired instances 2/);
  assert.match(text, /delta instances \+1/);
  assert.match(text, /readiness: BLOCKED/);
  assert.match(
    text,
    /insufficient-memory: host memory budget refuses the instance delta/,
  );
  assert.doesNotMatch(text, /not-a-real-refusal/);
  assert.match(text, /next: pnpm infra:postgres status/);
});

test('formatTopologyResult formats owned status endpoints', () => {
  const text = formatTopologyResult({
    command: 'status',
    ok: true,
    readOnly: true,
    mode: 'owned',
    env: 'dev',
    ownerId: 'run01',
    clusterName: 'pg-repl-a',
    namespace: 'offscreen-pg-run01',
    currentInstances: 2,
    targetInstances: 2,
    resources: null,
    refusals: [],
    mutated: false,
    complete: true,
    endpoints: {
      readWrite: 'pg-repl-a-rw.offscreen-pg-run01.svc.cluster.local:5432',
      readOnly: 'pg-repl-a-ro.offscreen-pg-run01.svc.cluster.local:5432',
    },
  });
  assert.match(text, /mode: owned/);
  assert.match(text, /owner: run01/);
  assert.match(text, /cluster: pg-repl-a/);
  assert.match(text, /namespace: offscreen-pg-run01/);
  assert.match(text, /instances: current 2 desired 2/);
  assert.match(text, /endpoint-rw:/);
  assert.match(text, /endpoint-ro:/);
  assert.match(text, /result: OK/);
  assert.match(text, /readiness: observation complete/);
  assert.doesNotMatch(text, /readiness: READY/);
});

test('formatTopologyResult readiness: plan ok+complete is not READY', () => {
  const text = formatTopologyResult({
    command: 'plan',
    ok: true,
    readOnly: true,
    env: 'release',
    baselineCluster: 'lab-pg',
    currentInstances: 1,
    targetInstances: 2,
    resources: null,
    refusals: [],
    mutated: false,
    complete: true,
  });
  assert.match(text, /readiness: not observed \(plan is read-only preview\)/);
  assert.doesNotMatch(text, /readiness: READY/);
});

test('formatTopologyResult readiness: ensure ok+complete is READY', () => {
  const text = formatTopologyResult({
    command: 'ensure',
    ok: true,
    readOnly: false,
    env: 'release',
    baselineCluster: 'lab-pg',
    currentInstances: 1,
    targetInstances: 2,
    resources: null,
    refusals: [],
    mutated: true,
    complete: true,
    currentPrimary: 'lab-pg-1',
  });
  assert.match(text, /readiness: READY/);
  assert.match(text, /primary: lab-pg-1/);
  assert.match(text, /complete: yes/);
});

test('formatTopologyResult marks readiness timeout distinctly', () => {
  const text = formatTopologyResult({
    command: 'ensure',
    ok: false,
    readOnly: false,
    env: 'release',
    baselineCluster: 'lab-pg',
    currentInstances: 1,
    targetInstances: 2,
    resources: {
      current: {
        instances: 1,
        memoryLimitPerInstanceMiB: 768,
        memoryRequestPerInstanceMiB: 256,
        cpuLimitPerInstance: '500m',
        cpuRequestPerInstance: '100m',
        storagePerInstance: '1Gi',
      },
      target: {
        instances: 2,
        memoryLimitTotalMiB: 1536,
        memoryRequestTotalMiB: 512,
        cpuLimitPerInstance: '500m',
        cpuRequestPerInstance: '100m',
        storagePerInstance: '1Gi',
      },
      delta: { instances: 1, memoryLimitMiB: 768, memoryRequestMiB: 256 },
    },
    refusals: [
      {
        id: 'readiness-timeout',
        detail: 'cluster Ready condition is not True',
      },
    ],
    mutated: true,
    complete: false,
  });
  assert.match(text, /readiness: NOT READY/);
  assert.match(text, /mutated: yes/);
  assert.match(text, /readiness-timeout/);
});

test('runTopologyCliArgv help exits 0 without control', () => {
  /** @type {string[]} */
  const out = [];
  const result = runTopologyCliArgv(['node', 'topology-cli.mjs', '--help'], {
    write: (chunk) => {
      out.push(chunk);
    },
    writeError: () => {
      assert.fail('help should not write stderr');
    },
    runControl: () => {
      assert.fail('help must not run topology control');
    },
  });
  assert.equal(result.exitCode, 0);
  assert.match(out.join(''), /OFFSCREEN POSTGRES TOPOLOGY/);
});

test('runTopologyCliArgv defaults to human and supports --json', () => {
  const receipt = {
    command: 'plan',
    ok: true,
    readOnly: true,
    env: 'release',
    baselineCluster: 'lab-pg',
    currentInstances: 1,
    targetInstances: 2,
    resources: null,
    refusals: [],
    mutated: false,
    complete: true,
  };

  /** @type {string[]} */
  const humanOut = [];
  const human = runTopologyCliArgv(
    [
      'node',
      'topology-cli.mjs',
      'plan',
      '--env',
      'release',
      '--cluster',
      'lab-pg',
      '--instances',
      '2',
    ],
    {
      write: (chunk) => humanOut.push(chunk),
      runControl: () => receipt,
    },
  );
  assert.equal(human.exitCode, 0);
  assert.match(humanOut.join(''), /^OFFSCREEN\nPOSTGRES TOPOLOGY/m);
  assert.doesNotMatch(humanOut.join(''), /^\{/);

  /** @type {string[]} */
  const jsonOut = [];
  const json = runTopologyCliArgv(
    [
      'node',
      'topology-cli.mjs',
      'plan',
      '--env',
      'release',
      '--cluster',
      'lab-pg',
      '--instances',
      '2',
      '--json',
    ],
    {
      write: (chunk) => jsonOut.push(chunk),
      runControl: () => receipt,
    },
  );
  assert.equal(json.exitCode, 0);
  const parsed = JSON.parse(jsonOut.join(''));
  assert.equal(parsed.command, 'plan');
  assert.equal(parsed.ok, true);
});

test('runTopologyCliArgv preserves non-zero exit on refused receipt', () => {
  /** @type {string[]} */
  const out = [];
  const result = runTopologyCliArgv(
    [
      'node',
      'topology-cli.mjs',
      'ensure',
      '--env',
      'release',
      '--cluster',
      'lab-pg',
      '--instances',
      '2',
      '--confirm-context',
      'kind-offscreen-release',
      '--json',
    ],
    {
      write: (chunk) => out.push(chunk),
      runControl: () => ({
        command: 'ensure',
        ok: false,
        refusals: [{ id: 'confirm-context-mismatch', detail: 'nope' }],
        mutated: false,
        complete: false,
      }),
    },
  );
  assert.equal(result.exitCode, 1);
  assert.equal(JSON.parse(out.join('')).ok, false);
});
