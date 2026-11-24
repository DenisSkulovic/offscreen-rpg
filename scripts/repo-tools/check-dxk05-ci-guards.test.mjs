import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import {
  assertImagePin,
  assertLabContext,
  assertNoStaleComposeCommand,
  checkDxk05CiGuards,
} from './check-dxk05-ci-guards.mjs';

const repoRoot = join(
  fileURLToPath(new URL('.', import.meta.url)),
  '../..',
);
const scriptPath = join(repoRoot, 'scripts/repo-tools/check-dxk05-ci-guards.mjs');

test('current repo passes DXK05 CI guards', () => {
  const result = checkDxk05CiGuards(repoRoot);
  assert.ok(result.composeScanCount >= 1);
  assert.ok(result.dockerfileCount === 4);

  const spawned = spawnSync(process.execPath, [scriptPath], {
    cwd: repoRoot,
    encoding: 'utf8',
  });
  assert.equal(spawned.status, 0, spawned.stderr || spawned.stdout);
  assert.match(spawned.stdout, /DXK05 CI guards OK/);
});

test('assertNoStaleComposeCommand rejects docker compose text', () => {
  assert.throws(
    () => assertNoStaleComposeCommand('fixture', 'docker compose config'),
    /stale docker compose/i,
  );
});

test('assertImagePin rejects pin missing NODE_DIGEST', () => {
  assert.throws(
    () => assertImagePin('NODE_IMAGE=docker.io/library/node:24\n'),
    /NODE_DIGEST/,
  );
});

test('assertLabContext rejects non-lab context', () => {
  assert.throws(() => assertLabContext('minikube'), /kind-offscreen-lab/);
});

test('assertImagePin accepts real pin and dockerfiles from repo', () => {
  const releaseDir = join(repoRoot, 'infra/images/release');
  const pinText = readFileSync(join(releaseDir, 'images.pin'), 'utf8');
  const dockerTexts = [
    'Dockerfile.api',
    'Dockerfile.web',
    'Dockerfile.worker',
    'Dockerfile.game-authority',
  ].map((name) => readFileSync(join(releaseDir, name), 'utf8'));
  assert.doesNotThrow(() => assertImagePin(pinText, dockerTexts));
});