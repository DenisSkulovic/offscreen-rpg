import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const releaseDir = dirname(fileURLToPath(import.meta.url));
const upPath = join(releaseDir, 'up.sh');

test('up.sh does not bootstrap verification probe namespaces', () => {
  const text = readFileSync(upPath, 'utf8');
  assert.doesNotMatch(text, /RELEASE_ENV_ROOT/);
  assert.doesNotMatch(text, /environments\/release\/namespaces\.yaml/);
  assert.doesNotMatch(text, /fixtures\/probes\/namespaces\.yaml/);
  assert.match(text, /local-path-storage\.yaml/);
  assert.match(text, /manager\/cli\.mjs.*create release/);
});