import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { buildFixtureJob, fixtureRootsFromReceipt, ensureReleaseContent } from '../content.mjs';
import { EXPECTED_IMPORT_ROOTS } from '../../../verification/release-acceptance/turn03/fixture-import-roots.mjs';

const digest = 'sha256:' + 'a'.repeat(64);
const body = { ok: true, fixtureId: 'seyda-neen-prisoner', campaignCreated: false,
  catalogue: false, openingCandidate: false, match: 'yes', pinPath: null,
  worldRootHash: EXPECTED_IMPORT_ROOTS.world, ruleRootHash: EXPECTED_IMPORT_ROOTS.rule, startRootHash: EXPECTED_IMPORT_ROOTS.start };

test('release fixture receipts reject wrong roots and unverified reads', () => {
  assert.deepEqual(fixtureRootsFromReceipt(JSON.stringify(body), 'reader'), EXPECTED_IMPORT_ROOTS);
  assert.deepEqual(fixtureRootsFromReceipt(JSON.stringify(body), 'importer'), EXPECTED_IMPORT_ROOTS);
  assert.throws(() => fixtureRootsFromReceipt(JSON.stringify({ ...body, ruleRootHash: 'wrong' }), 'reader'), /root mismatch/);
  assert.throws(() => fixtureRootsFromReceipt(JSON.stringify({ ...body, match: 'no' }), 'reader'), /invalid/);
});
test('content Jobs reference runtime S3 identity without embedding credentials or mounting source', () => {
  for (const action of ['importer', 'reader']) {
    const job = buildFixtureJob(action, digest);
    const spec = job.spec.template.spec;
    assert.equal(spec.automountServiceAccountToken, false);
    assert.equal(spec.containers[0].imagePullPolicy, 'Never');
    assert.equal(spec.containers[0].image, 'offscreen-lab-content-bootstrap:sha256-' + 'a'.repeat(64));
    assert.deepEqual(spec.volumes, [{ name: 'scratch', emptyDir: {} }]);
    assert.equal(spec.containers[0].env.filter(e => e.valueFrom?.secretKeyRef?.name === 'game-runtime').length, 2);
    assert.ok(spec.containers[0].args[0].endsWith((action === 'importer' ? 'import' : 'read') + '-pinned-fixture.mjs'));
  }
});
test('foreign runtime credentials refuse before build and Job mutation', () => {
  const calls = [];
  assert.throws(() => ensureReleaseContent({ verifyTarget() {}, run(command, args) {
    calls.push([command, args]); return { ok: true, stdout: JSON.stringify({ metadata: { name: 'game-runtime', namespace: 'lab-edge', labels: {} } }) };
  } }), /credential projection/);
  assert.equal(calls.length, 1);
  assert.equal(calls[0][0], 'kubectl');
  assert.ok(calls[0][1].includes('get'));
});
test('release install gates migration and application rollout on content reconciliation', () => {
  const source = readFileSync(new URL('../install.sh', import.meta.url), 'utf8');
  assert.ok(source.indexOf('/credentials.mjs') < source.indexOf('/content.mjs'));
  assert.ok(source.indexOf('/content.mjs') < source.indexOf('/migration.mjs'));
  assert.ok(source.indexOf('/content.mjs') < source.indexOf('Applying authority overlay'));
});
test('content build uses lockfile-backed workspace closure, not detached package dist copies', () => {
  const build = readFileSync(new URL('../../../verification/release-acceptance/content-bootstrap/build.sh', import.meta.url), 'utf8');
  const dockerfile = readFileSync(new URL('../../../verification/release-acceptance/content-bootstrap/Dockerfile', import.meta.url), 'utf8');
  assert.match(build, /turbo prune @offscreen\/content-packages/);
  assert.match(dockerfile, /pnpm install --frozen-lockfile --offline/);
  assert.match(dockerfile, /prepare-runtime-tree.sh packages\/content-packages/);
});
