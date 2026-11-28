import assert from 'node:assert/strict';
import test from 'node:test';
import { ENTRYPOINTS, REPO_ROOT, observeCluster, runOffscreenCli } from './offscreen.mjs';

const PROFILES = {
  dev: { clusterName: 'offscreen-dev', contextName: 'kind-offscreen-dev' },
  release: { clusterName: 'offscreen-release', contextName: 'kind-offscreen-release' },
};

function harness({ docker = {}, kind = '', runResult = { status: 0 }, kindOk = true } = {}) {
  const calls = { run: [], probe: [] };
  const out = [];
  const err = [];
  const deps = {
    run: (cmd, args, opts) => {
      calls.run.push({ cmd, args, opts });
      return typeof runResult === 'function' ? runResult(args) : runResult;
    },
    probe: (cmd, args) => {
      calls.probe.push({ cmd, args });
      if (cmd === 'kind') return { ok: kindOk, stdout: kind };
      const name = args.find((a) => a.startsWith('label='))?.split('=').pop();
      const v = docker[name];
      return v === undefined ? { ok: true, stdout: '' } : typeof v === 'string' ? { ok: true, stdout: v } : v;
    },
    readProfile: (id) => PROFILES[id],
    write: (s) => out.push(s),
    writeError: (s) => err.push(s),
  };
  return { deps, calls, out, err, text: () => out.join(''), errText: () => err.join('') };
}
const pair = (c, a = 'running', b = 'running') =>
  `${c}-control-plane\t${a}\tcontrol-plane\n${c}-worker\t${b}\tworker\n`;
const cli = (h, argv) => runOffscreenCli(argv, h.deps);
const none = (h) => assert.equal(h.calls.run.length + h.calls.probe.length, 0);

test('help and malformed args make zero host calls', () => {
  for (const argv of [[], ['--help'], ['-h'], ['cluster', '--help'], ['platform', 'plan', '--help'], ['postgres', '--help'], ['verify', '-h']]) {
    const h = harness();
    assert.equal(cli(h, argv).exitCode, 0, argv.join(' '));
    none(h);
  }
  for (const argv of [
    ['bogus'], ['platform', 'up'], ['platform', 'up', 'prod'], ['platform', 'up', 'dev', '--services', 'nope'],
    ['platform', 'up', 'dev', '--json', '--json'], ['platform', 'up', 'dev', '--x'], ['dev', 'attach'],
    ['dev', 'new', '--instance', 'dev-1'], ['release', 'up', '--json'], ['release', 'down', 'extra'],
    ['cluster', 'start'], ['cluster', 'start', 'prod'], ['cluster', 'start', 'dev', '--json'], ['postgres', 'plan'],
    ['verify'], ['obs'], ['status', 'x'], ['--help', 'x'], ['cluster', 'list', '--help', '--help'],
  ]) {
    const h = harness();
    assert.equal(cli(h, argv).exitCode, 2, argv.join(' '));
    none(h);
  }
});

test('platform routes: exact argv, both profiles, default human, json, none', () => {
  const cases = [
    [['platform', 'plan', 'dev'], ['plan', '--env', 'dev', '--services', 'core', '--human']],
    [['platform', 'up', 'release', '--services', 'none'], ['up', '--env', 'release', '--services', 'none', '--human']],
    [['platform', 'status', 'dev', '--json'], ['status', '--env', 'dev', '--services', 'core', '--json']],
  ];
  for (const [argv, expected] of cases) {
    const h = harness({ runResult: { status: 0 } });
    assert.equal(cli(h, argv).exitCode, 0);
    assert.deepEqual(h.calls.run[0].args, [ENTRYPOINTS.infra, ...expected]);
    assert.equal(h.calls.run[0].cmd, process.execPath);
    assert.equal(h.calls.run[0].opts.cwd, REPO_ROOT);
    assert.equal(h.calls.run[0].opts.stdio, 'inherit');
    assert.equal(h.calls.probe.length, 0);
  }
});

test('dev routes: up has no positional, instance passes, exit code propagates', () => {
  let h = harness();
  cli(h, ['dev', 'up']);
  assert.deepEqual(h.calls.run[0].args, [ENTRYPOINTS.dev]);
  h = harness();
  cli(h, ['dev', 'status', '--instance', 'dev-2']);
  assert.deepEqual(h.calls.run[0].args, [ENTRYPOINTS.dev, 'status', '--instance', 'dev-2']);
  h = harness();
  cli(h, ['dev', 'attach', '--instance', 'dev-2']);
  assert.deepEqual(h.calls.run[0].args, [ENTRYPOINTS.dev, 'attach', '--instance', 'dev-2']);
  h = harness({ runResult: { status: 7 } });
  assert.equal(cli(h, ['dev', 'new']).exitCode, 7);
  h = harness({ runResult: { status: null, signal: 'SIGKILL' } });
  assert.equal(cli(h, ['dev', 'stop']).exitCode, 1);
  h = harness({ runResult: { error: new Error('boom') } });
  assert.equal(cli(h, ['dev', 'stop']).exitCode, 1);
});

test('other delegated routes pass through unchanged', () => {
  const cases = [
    [['release', 'up'], [ENTRYPOINTS.stack, 'up']],
    [['release', 'down'], [ENTRYPOINTS.stack, 'down']],
    [['release', 'status', '--json'], [ENTRYPOINTS.stack, 'status']],
    [['postgres', 'status', '--env', 'dev', '--json'], [ENTRYPOINTS.postgres, 'status', '--env', 'dev', '--json']],
    [['obs', 'connect', '--queries'], [ENTRYPOINTS.obs, '--queries']],
    [['obs', 'connect'], [ENTRYPOINTS.obs]],
    [['verify', '--suite', 'source', '--json'], [ENTRYPOINTS.verify, '--suite', 'source', '--json']],
  ];
  for (const [argv, expected] of cases) {
    const h = harness();
    assert.equal(cli(h, argv).exitCode, 0, argv.join(' '));
    assert.deepEqual(h.calls.run[0].args, expected);
    assert.equal(h.calls.run[0].opts.stdio, 'inherit');
  }
});

test('release status separates booleans and handles malformed output', () => {
  const report = (c, s, p) => JSON.stringify({ cluster: { ready: c, diagnostics: ['SECRET'] }, service: { ready: s }, playable: { ready: p } });
  let h = harness({ runResult: { status: 0, stdout: report(true, false, false) } });
  assert.equal(cli(h, ['release', 'status']).exitCode, 0);
  assert.match(h.text(), /cluster\s+READY/);
  assert.match(h.text(), /service\s+NOT READY/);
  assert.match(h.text(), /playable\s+NOT READY \(NOT QUALIFIED/);
  assert.doesNotMatch(h.text(), /SECRET/);
  for (const bad of [{ status: 1, stdout: report(true, true, true) }, { status: 0, stdout: 'not json' }, { status: 0, stdout: '{"cluster":{}}' }]) {
    h = harness({ runResult: bad });
    assert.equal(cli(h, ['release', 'status']).exitCode, 1);
    assert.match(h.errText(), /UNKNOWN/);
  }
});

test('inventory states', () => {
  const state = (docker, kind = 'offscreen-dev\n', extra = {}) =>
    observeCluster('dev', harness({ docker: { 'io.x-k8s.kind.cluster=x': 0, 'offscreen-dev': docker }, kind, ...extra }).deps);
  assert.equal(state(pair('offscreen-dev')).state, 'RUNNING');
  assert.equal(state(pair('offscreen-dev')).runningNodes, 2);
  assert.equal(state('', '').state, 'ABSENT');
  assert.equal(state(pair('offscreen-dev', 'exited', 'exited'), '').state, 'STOPPED');
  assert.equal(state(pair('offscreen-dev', 'running', 'exited')).state, 'INCOMPLETE');
  assert.equal(state(pair('offscreen-dev', 'paused', 'paused')).state, 'INCOMPLETE');
  assert.equal(state('', 'offscreen-dev\n').state, 'INCOMPLETE');
  assert.equal(state(pair('offscreen-dev'), '').state, 'INCOMPLETE');
  assert.equal(state('offscreen-dev-control-plane\trunning\tcontrol-plane\n').state, 'INCOMPLETE');
  assert.equal(state('foo-offscreen-dev-worker\trunning\tworker\nx\trunning\tworker\n').state, 'INCOMPLETE');
  assert.equal(state('garbage line').state, 'UNKNOWN');
  assert.equal(state({ ok: false, stdout: '' }).state, 'UNKNOWN');
  assert.equal(state('', '', { kindOk: false }).state, 'UNKNOWN');
});

test('status prints stable JSON once and exit code reflects unknown', () => {
  let h = harness({ docker: { 'offscreen-dev': pair('offscreen-dev') }, kind: 'offscreen-dev\n' });
  assert.equal(cli(h, ['status', '--json']).exitCode, 0);
  const parsed = JSON.parse(h.text());
  assert.equal(parsed.schemaVersion, 1);
  assert.deepEqual(parsed.clusters.map((c) => [c.profile, c.state]), [['dev', 'RUNNING'], ['release', 'ABSENT']]);
  assert.deepEqual(Object.keys(parsed.clusters[0]).sort(), ['clusterName', 'contextName', 'expectedNodes', 'profile', 'runningNodes', 'state']);
  assert.equal(h.calls.run.length, 0);
  h = harness({ kindOk: false });
  assert.equal(cli(h, ['cluster', 'status', 'dev']).exitCode, 1);
  assert.match(h.text(), /UNKNOWN/);
  h = harness({ docker: { 'offscreen-dev': pair('offscreen-dev', 'exited', 'exited') } });
  assert.equal(cli(h, ['cluster', 'list']).exitCode, 0);
  assert.match(h.text(), /STOPPED/);
});

test('cluster start dispatches only on RUNNING/ABSENT; stopped refuses without mutation', () => {
  for (const docker of [pair('offscreen-release'), '']) {
    const h = harness({ docker: { 'offscreen-release': docker }, kind: docker ? 'offscreen-release\n' : '' });
    assert.equal(cli(h, ['cluster', 'start', 'release']).exitCode, 0);
    assert.deepEqual(h.calls.run[0].args, [ENTRYPOINTS.infra, 'up', '--env', 'release', '--services', 'none', '--human']);
  }
  let h = harness({ docker: { 'offscreen-dev': pair('offscreen-dev', 'exited', 'exited') } });
  assert.equal(cli(h, ['cluster', 'start', 'dev']).exitCode, 1);
  assert.equal(h.calls.run.length, 0);
  assert.ok(h.calls.probe.every((p) => (p.cmd === 'docker' && p.args[0] === 'ps') || (p.cmd === 'kind' && p.args.join(' ') === 'get clusters')));
  assert.match(h.errText(), /docker start offscreen-dev-control-plane offscreen-dev-worker/);
  assert.match(h.errText(), /kubectl --context kind-offscreen-dev wait --for=condition=Ready nodes --all --timeout=180s/);
  h = harness({ docker: { 'offscreen-dev': pair('offscreen-dev', 'running', 'exited') }, kind: 'offscreen-dev\n' });
  assert.equal(cli(h, ['cluster', 'start', 'dev']).exitCode, 1);
  assert.equal(h.calls.run.length, 0);
  h = harness({ kindOk: false });
  assert.equal(cli(h, ['cluster', 'start', 'dev']).exitCode, 1);
  assert.equal(h.calls.run.length, 0);
});
