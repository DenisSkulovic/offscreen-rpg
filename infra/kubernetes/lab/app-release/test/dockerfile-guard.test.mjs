import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const appReleaseDir = dirname(dirname(fileURLToPath(import.meta.url)));

test('release Dockerfiles do not copy runtime content or accept secret build args', () => {
  for (const name of ['Dockerfile.api', 'Dockerfile.game-authority']) {
    const text = readFileSync(join(appReleaseDir, name), 'utf8');
    assert.doesNotMatch(text, /\bCOPY\b[^\n]*\bcontent\//);
    assert.doesNotMatch(text, /\bARG\b[^\n]*(SECRET|TOKEN|PASSWORD|KEY)/i);
    assert.match(text, /0\.0\.0\.0/);
    assert.match(text, /pnpm@11\.19\.0/);
    assert.match(text, /node:24\.19\.0-bookworm-slim/);
  }
});

test('images.pin matches Dockerfile base digest', () => {
  const pin = Object.fromEntries(
    readFileSync(join(appReleaseDir, 'images.pin'), 'utf8')
      .trim()
      .split('\n')
      .map((line) => line.split('=', 2)),
  );
  const dockerfile = readFileSync(join(appReleaseDir, 'Dockerfile.api'), 'utf8');
  assert.equal(pin.NODE_DIGEST, 'sha256:a9f5f7c91a432850b2a8a7797adf5eadb6c733ceed61167806cee7ea7fbc29df');
  assert.match(dockerfile, new RegExp(pin.NODE_DIGEST.replace('.', '\\.')));
});