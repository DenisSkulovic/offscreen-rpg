import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import test from 'node:test';
import { deriveDevWorkloadBindings } from './helpers/dev-bindings.mjs';
import { documentKey, helmTemplate, parseHelmJsonDocuments } from './helpers/helm-render.mjs';
import {
  indexDocuments,
  normalizeDevDocument,
  normalizeReleaseDocument,
} from './helpers/normalize.mjs';

const testsRoot = dirname(fileURLToPath(import.meta.url));
const workloadsRoot = join(testsRoot, '..');
const chartPath = join(workloadsRoot, 'chart');
const fixtures = join(testsRoot, 'fixtures');
const releaseBaseline = JSON.parse(readFileSync(join(fixtures, 'release-baseline.json'), 'utf8'));
const dev1Baseline = JSON.parse(readFileSync(join(fixtures, 'dev-1-baseline.json'), 'utf8'));
const dev2Baseline = JSON.parse(readFileSync(join(fixtures, 'dev-2-baseline.json'), 'utf8'));

function loadYamlHttpRoute() {
  const text = readFileSync(join(workloadsRoot, '../environments/release/game-edge-route.yaml'), 'utf8');
  const script = `import json,sys,yaml; print(json.dumps(list(yaml.safe_load_all(sys.stdin.read()))[0]))`;
  const result = spawnSync('python3', ['-c', script], { input: text, encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
  return JSON.parse(result.stdout);
}

function render(profile, overlay = {}) {
  const result = helmTemplate({ profile, overlay });
  assert.equal(result.status, 0, result.stderr || result.stdout);
  return parseHelmJsonDocuments(result.stdout);
}

function expectHelmFails(profile, overlay, pattern) {
  const result = helmTemplate({ profile, overlay });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, pattern);
}

test('helm lint: release profile', () => {
  const result = spawnSync('helm', ['lint', chartPath, '-f', join(workloadsRoot, 'profiles/release.yaml')], {
    encoding: 'utf8',
  });
  assert.equal(result.status, 0, result.stdout + result.stderr);
});

test('helm lint: development profile with dev-1 bindings', () => {
  const overlay = deriveDevWorkloadBindings('dev-1', 3100);
  const result = spawnSync(
    'helm',
    ['lint', chartPath, '-f', join(workloadsRoot, 'profiles/development.yaml'), '-f', '-'],
    { input: `${JSON.stringify(overlay)}\n`, encoding: 'utf8' },
  );
  assert.equal(result.status, 0, result.stdout + result.stderr);
});

test('release all: structural equivalence to captured baseline (chart resources)', () => {
  const rendered = render('release', { section: 'all' });
  const renderedByKey = indexDocuments(rendered.map(normalizeReleaseDocument));
  const baselineWorkload = releaseBaseline.filter((doc) => doc.kind !== 'HTTPRoute' && doc.kind !== 'Job');
  for (const expected of baselineWorkload) {
    const key = `${expected.kind}/${expected.metadata.namespace}/${expected.metadata.name}`;
    assert.ok(renderedByKey.has(key), `missing ${key}`);
    assert.deepEqual(renderedByKey.get(key), normalizeReleaseDocument(expected));
  }
  assert.equal(rendered.length, 12);
});

test('release migration job matches migrate.yaml baseline', () => {
  const rendered = render('release', { section: 'migration' });
  assert.equal(rendered.length, 1);
  const expected = releaseBaseline.find((doc) => doc.kind === 'Job');
  assert.deepEqual(normalizeReleaseDocument(rendered[0]), normalizeReleaseDocument(expected));
});

test('moved HTTPRoute matches release baseline object', () => {
  const route = loadYamlHttpRoute();
  const expected = releaseBaseline.find((doc) => doc.kind === 'HTTPRoute');
  assert.deepEqual(route, expected);
});

test('dev-1 and dev-2 graphs match baselines except selected deltas', () => {
  for (const [slot, baseline, port] of [
    ['dev-1', dev1Baseline, 3100],
    ['dev-2', dev2Baseline, 3200],
  ]) {
    const rendered = render('development', { section: 'all', ...deriveDevWorkloadBindings(slot, port) });
    assert.equal(rendered.length, 10);
    const renderedByKey = indexDocuments(rendered.map(normalizeDevDocument));
    for (const expected of baseline) {
      const key = `${expected.kind}/${expected.metadata.namespace}/${expected.metadata.name}`;
      assert.ok(renderedByKey.has(key), `${slot} missing ${key}`);
      assert.deepEqual(renderedByKey.get(key), normalizeDevDocument(expected), key);
    }
  }
});

test('dev refuses release sections', () => {
  expectHelmFails('development', { section: 'migration', ...deriveDevWorkloadBindings('dev-1', 3100) }, /release section/);
});

test('negative: defaults without profile mode refuse', () => {
  const result = spawnSync('helm', ['template', 'offscreen-app', chartPath], { encoding: 'utf8' });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /missing property 'mode'|profile must set mode/);
});

test('negative: development without bindings refuses', () => {
  expectHelmFails('development', { section: 'all' }, /missing property 'bindings'|development bindings are required/);
});

test('negative: foreign slot namespace refuses', () => {
  const overlay = deriveDevWorkloadBindings('dev-1', 3100);
  overlay.bindings.namespace = 'offscreen-dev-2';
  expectHelmFails('development', overlay, /bindings\.namespace must derive/);
});

test('negative: missing secret name refuses', () => {
  const overlay = deriveDevWorkloadBindings('dev-1', 3100);
  overlay.bindings.dbSecret = '';
  expectHelmFails('development', overlay, /missing bindings\.dbSecret|minLength/);
});

test('negative: unsupported section refuses', () => {
  expectHelmFails('release', { section: 'not-a-section' }, /unsupported section|value must be one of/);
});

test('negative: release profile with bindings refuses', () => {
  expectHelmFails('release', { section: 'all', bindings: { slotId: 'dev-1' } }, /does not accept bindings|maxProperties/);
});

test('parsed documents use unique kind/namespace/name keys', () => {
  const docs = render('release', { section: 'all' });
  const keys = docs.map(documentKey);
  assert.equal(new Set(keys).size, keys.length);
});