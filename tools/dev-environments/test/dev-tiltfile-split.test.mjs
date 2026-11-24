import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '../../..');
const rootTiltfile = readFileSync(join(repoRoot, 'Tiltfile'), 'utf8');
const releaseTiltfile = readFileSync(
  join(repoRoot, 'infra/environments/release/Tiltfile'),
  'utf8',
);

test('root Tiltfile is the dev profile without release image builds', () => {
  assert.doesNotMatch(rootTiltfile, /app-release-images/);
  assert.doesNotMatch(rootTiltfile, /build-release-images\.sh/);
  assert.match(
    rootTiltfile,
    /allow_k8s_contexts\s*\(\s*['"]kind-offscreen-lab['"]\s*\)/,
  );
  assert.match(rootTiltfile, /include\s*\(\s*['"]\.\/infra\/dev\/Tiltfile['"]\s*\)/);
});

test('release Tiltfile still owns app-release-images', () => {
  assert.match(releaseTiltfile, /app-release-images/);
  assert.match(releaseTiltfile, /build-release-images\.sh/);
});