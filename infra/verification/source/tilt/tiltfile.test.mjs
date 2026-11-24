import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '../../../..');
const rootTiltfilePath = join(repoRoot, 'Tiltfile');
const releaseTiltfilePath = join(
  repoRoot,
  'infra/environments/release/Tiltfile',
);
const rootTiltfile = readFileSync(rootTiltfilePath, 'utf8');
const releaseTiltfile = readFileSync(releaseTiltfilePath, 'utf8');

const APP_RESOURCES = [
  'game-web',
  'game-api',
  'game-authority',
  'game-control',
  'game-executor',
  'game-relay',
];

test('root Tiltfile pins kubectl context kind-offscreen-lab', () => {
  assert.match(
    rootTiltfile,
    /allow_k8s_contexts\s*\(\s*['"]kind-offscreen-lab['"]\s*\)/,
  );
});

test('root Tiltfile loads the dev graph only', () => {
  assert.match(
    rootTiltfile,
    /include\s*\(\s*['"]\.\/infra\/dev\/Tiltfile['"]\s*\)/,
  );
  assert.doesNotMatch(rootTiltfile, /app-release-images/);
  assert.doesNotMatch(rootTiltfile, /build-release-images\.sh/);
});

test('release Tiltfile names the lab app resources', () => {
  for (const name of APP_RESOURCES) {
    assert.match(
      releaseTiltfile,
      new RegExp(`k8s_resource\\(\\s*['"]${name}['"]`),
      `expected k8s_resource for ${name}`,
    );
  }
});

test('root Tiltfile does not use Docker Compose or compose.yaml', () => {
  assert.doesNotMatch(rootTiltfile, /docker_compose/);
  assert.doesNotMatch(rootTiltfile, /compose\.yaml/);
});

test('root Tiltfile does not load lab skeleton manifests', () => {
  assert.doesNotMatch(rootTiltfile, /infra\/kubernetes\/lab\/skeletons/);
  assert.doesNotMatch(rootTiltfile, /skeletons\/workloads/);
});

test('root Tiltfile does not use live_update on app images', () => {
  assert.doesNotMatch(rootTiltfile, /live_update\s*\(/);
  assert.doesNotMatch(rootTiltfile, /docker_build\s*\(/);
});

test('release Tiltfile builds images through the app-release scripts', () => {
  assert.match(releaseTiltfile, /build-release-images\.sh/);
  assert.match(releaseTiltfile, /app-release-images/);
  assert.match(releaseTiltfile, /readiness_timeout\s*=\s*['"]45m['"]/);
  assert.match(releaseTiltfile, /docker tag/);
  assert.match(releaseTiltfile, /\$EXPECTED_REF/);
});

test('game-web port-forward is loopback-only on local port 3000', () => {
  assert.match(
    releaseTiltfile,
    /k8s_resource\s*\(\s*['"]game-web['"][\s\S]*?port_forwards\s*=\s*\[[\s\S]*?['"]127\.0\.0\.1:3000:3000['"]/,
  );
  assert.doesNotMatch(releaseTiltfile, /0\.0\.0\.0/);
  assert.doesNotMatch(releaseTiltfile, /\[::\]/);
});