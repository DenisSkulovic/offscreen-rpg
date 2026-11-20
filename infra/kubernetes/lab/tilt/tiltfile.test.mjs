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
];

test('Tiltfile pins kubectl context kind-offscreen-lab', () => {
  assert.match(
    tiltfile,
    /allow_k8s_contexts\s*\(\s*['"]kind-offscreen-lab['"]\s*\)/,
  );
});

test('Tiltfile names the five lab app resources', () => {
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