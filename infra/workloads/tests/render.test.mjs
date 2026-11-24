import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { deriveDevWorkloadBindings } from './helpers/dev-bindings.mjs';
import {
  assertHelmAvailable,
  documentIdentity,
  parseWorkloadDocuments,
  renderWorkloadDocuments,
  renderWorkloadYaml,
} from '../render.mjs';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '../../..');
const renderCli = join(repoRoot, 'infra/workloads/render.mjs');

test('assertHelmAvailable accepts helm v3/v4', () => {
  const version = assertHelmAvailable();
  assert.match(version, /^v[34]\./);
});

test('renderWorkloadDocuments returns ordered dev-1 graph', () => {
  const { bindings } = deriveDevWorkloadBindings('dev-1', 3100);
  const docs = renderWorkloadDocuments({ profile: 'development', section: 'all', bindings });
  assert.equal(docs.length, 10);
  assert.equal(docs[0].kind, 'Namespace');
  assert.deepEqual(
    docs.filter((doc) => doc.kind === 'Deployment').map((doc) => doc.metadata.name),
    ['game-web', 'game-api', 'game-authority', 'game-control', 'game-executor', 'game-relay'],
  );
});

test('renderWorkloadYaml emits JSON documents separated by ---', () => {
  const docs = [{ apiVersion: 'v1', kind: 'Namespace', metadata: { name: 'x' } }];
  const text = renderWorkloadYaml(docs);
  assert.match(text, /^---\n\{/);
  assert.equal(parseWorkloadDocuments(text).length, 1);
});

test('release CLI prints manifest only', () => {
  const result = spawnSync(process.execPath, [renderCli, 'release', 'services'], {
    cwd: repoRoot,
    encoding: 'utf8',
  });
  assert.equal(result.status, 0, result.stderr);
  const docs = parseWorkloadDocuments(result.stdout);
  assert.ok(docs.every((doc) => doc.kind === 'Service'));
});

test('release CLI rejects unknown section', () => {
  const result = spawnSync(process.execPath, [renderCli, 'release', 'not-valid'], {
    cwd: repoRoot,
    encoding: 'utf8',
  });
  assert.notEqual(result.status, 0);
});

test('parseWorkloadDocuments rejects duplicates and unknown kinds', () => {
  const ok = parseWorkloadDocuments('---\n# comment\n{"apiVersion":"v1","kind":"Namespace","metadata":{"name":"a"}}\n');
  assert.equal(ok.length, 1);
  assert.throws(
    () => parseWorkloadDocuments('{"apiVersion":"v1","kind":"Namespace","metadata":{"name":"a"}}\n{"apiVersion":"v1","kind":"Namespace","metadata":{"name":"a"}}'),
    /duplicate workload identity/,
  );
  assert.throws(
    () => parseWorkloadDocuments('{"apiVersion":"v1","kind":"ConfigMap","metadata":{"name":"a"}}'),
    /unknown resource kind/,
  );
  assert.equal(documentIdentity({ kind: 'Deployment', metadata: { namespace: 'ns', name: 'x' } }), 'Deployment/ns/x');
});

test('renderWorkloadDocuments does not invoke kubectl', () => {
  const calls = [];
  const fakeRun = (cmd, args, opts) => {
    calls.push([cmd, ...args].join(' '));
    return spawnSync(cmd, args, opts);
  };
  const { bindings } = deriveDevWorkloadBindings('dev-2', 3200);
  renderWorkloadDocuments({ profile: 'development', section: 'all', bindings }, { run: fakeRun });
  assert.equal(calls.some((line) => line.startsWith('kubectl')), false);
  assert.ok(calls.some((line) => line.startsWith('helm template')));
});