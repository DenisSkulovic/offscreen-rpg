import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '../../../..');
const tiltfilePath = join(repoRoot, 'Tiltfile');
const tiltfile = readFileSync(tiltfilePath, 'utf8');

const APP_RESOURCES = [
  'game-web',
  'game-api',
  'game-authority',
  'game-control',
  'game-executor',
  'game-relay',
];

test('Tiltfile pins kubectl context kind-offscreen-lab', () => {
  assert.match(
    tiltfile,
    /allow_k8s_contexts\s*\(\s*['"]kind-offscreen-lab['"]\s*\)/,
  );
});

test('Tiltfile names the lab app resources', () => {
  for (const name of APP_RESOURCES) {
    assert.match(
      tiltfile,
      new RegExp(`k8s_resource\\(\\s*['"]${name}['"]`),
      `expected k8s_resource for ${name}`,
    );
  }
});

test('Tiltfile does not use Docker Compose or compose.yaml', () => {
  assert.doesNotMatch(tiltfile, /docker_compose/);
  assert.doesNotMatch(tiltfile, /compose\.yaml/);
});

test('Tiltfile does not load lab skeleton manifests', () => {
  assert.doesNotMatch(tiltfile, /infra\/kubernetes\/lab\/skeletons/);
  assert.doesNotMatch(tiltfile, /skeletons\/workloads/);
});

test('Tiltfile does not use live_update on app images', () => {
  assert.doesNotMatch(tiltfile, /live_update\s*\(/);
});

test('game-web port-forward is loopback-only on local port 3000', () => {
  assert.match(
    tiltfile,
    /k8s_resource\s*\(\s*['"]game-web['"][\s\S]*?port_forwards\s*=\s*\[[\s\S]*?['"]127\.0\.0\.1:3000:3000['"]/,
  );
  assert.doesNotMatch(tiltfile, /0\.0\.0\.0/);
  assert.doesNotMatch(tiltfile, /\[::\]/);
});