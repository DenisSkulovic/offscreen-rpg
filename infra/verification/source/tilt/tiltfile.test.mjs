import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '../../../..');
const rootTiltfilePath = join(repoRoot, 'Tiltfile');
const releaseTiltfilePath = join(
  repoRoot,
  'infra/environments/release/Tiltfile',
);
const releaseBuildScriptPath = join(
  repoRoot,
  'infra/images/release/build-release-images.sh',
);
const releaseInstallPath = join(
  repoRoot,
  'infra/environments/release/install.sh',
);
const rootTiltfile = readFileSync(rootTiltfilePath, 'utf8');

test('release Tiltfile is retired (single release install authority)', () => {
  assert.equal(existsSync(releaseTiltfilePath), false);
});

test('release image build and install.sh remain explicit release owners', () => {
  assert.equal(existsSync(releaseBuildScriptPath), true);
  assert.equal(existsSync(releaseInstallPath), true);
  const buildScript = readFileSync(releaseBuildScriptPath, 'utf8');
  const install = readFileSync(releaseInstallPath, 'utf8');
  assert.match(buildScript, /OFFSCREEN_IMAGE_BUILD_CONCURRENCY/);
  assert.match(install, /build-release-images\.sh|KIND_IMAGE_LOADER/);
});

test('root Tiltfile pins kubectl context kind-offscreen-dev', () => {
  assert.match(
    rootTiltfile,
    /allow_k8s_contexts\s*\(\s*['"]kind-offscreen-dev['"]\s*\)/,
  );
  assert.match(rootTiltfile, /assert_dev_slot_env/);
  assert.doesNotMatch(rootTiltfile, /kind-offscreen-lab/);
});

test('root Tiltfile owns the consolidated dev graph', () => {
  assert.doesNotMatch(rootTiltfile, /include\s*\(/);
  assert.doesNotMatch(rootTiltfile, /app-release-images/);
  assert.doesNotMatch(rootTiltfile, /build-release-images\.sh/);
  assert.match(rootTiltfile, /custom_build\s*\(/);
  assert.match(rootTiltfile, /live_update\s*\(/);
});

test('root Tiltfile does not use Docker Compose or compose.yaml', () => {
  assert.doesNotMatch(rootTiltfile, /docker_compose/);
  assert.doesNotMatch(rootTiltfile, /compose\.yaml/);
});

test('root Tiltfile does not load lab skeleton manifests', () => {
  assert.doesNotMatch(rootTiltfile, /infra\/kubernetes\/lab\/skeletons/);
  assert.doesNotMatch(rootTiltfile, /skeletons\/workloads/);
});

