import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import {
  assertArtifactPin,
  assertImagePin,
  assertLabContext,
  assertNoStaleComposeCommand,
  assertRecipeUsesToolchainArgs,
  assertServicesTargets,
  assertToolchainPin,
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
  assert.equal(result.dockerfileCount, 3);

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

test('assertToolchainPin rejects pin missing NODE_DIGEST', () => {
  assert.throws(
    () => assertToolchainPin('NODE_IMAGE=docker.io/library/node:24\n'),
    /NODE_DIGEST/,
  );
});

test('assertArtifactPin rejects toolchain fields in release images.pin', () => {
  assert.throws(
  () =>
    assertArtifactPin(
      'NODE_DIGEST=sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa\nWEB_IMAGE=tag\n',
    ),
    /must not contain NODE_DIGEST/,
  );
});

test('assertLabContext rejects non-lab context', () => {
  assert.throws(() => assertLabContext('minikube'), /kind-offscreen-lab/);
});

test('assertRecipeUsesToolchainArgs rejects literal node FROM lines', () => {
  const literal = `FROM docker.io/library/node:24@sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa AS base`;
  assert.throws(
    () => assertRecipeUsesToolchainArgs(literal, 'fixture'),
    /literal node FROM/i,
  );
});

test('assertImagePin accepts toolchain pin and current release recipes', () => {
  const commonDir = join(repoRoot, 'infra/images/common');
  const releaseDir = join(repoRoot, 'infra/images/release');
  const pinText = readFileSync(join(commonDir, 'toolchain.pin'), 'utf8');
  const dockerTexts = [
    readFileSync(join(releaseDir, 'Dockerfile.services'), 'utf8'),
    readFileSync(join(releaseDir, 'Dockerfile.web'), 'utf8'),
    readFileSync(join(repoRoot, 'infra/images/development/Dockerfile'), 'utf8'),
  ];
  assert.doesNotThrow(() => assertImagePin(pinText, dockerTexts));
  assert.doesNotThrow(() => assertServicesTargets(dockerTexts[0]));
  assert.throws(() => assertArtifactPin(pinText), /must not contain NODE_DIGEST/);
});