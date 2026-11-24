import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { LAB_NEST_SERVICE_ORIGIN } from '../release-service-origin.mjs';

const appReleaseDir = dirname(dirname(fileURLToPath(import.meta.url)));
const repoRoot = join(appReleaseDir, '../../..');
const NODE_DIGEST =
  'sha256:a9f5f7c91a432850b2a8a7797adf5eadb6c733ceed61167806cee7ea7fbc29df';

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

test('Dockerfile.worker pins Node, ships both entrypoints, and has no database URL', () => {
  const text = readFileSync(join(appReleaseDir, 'Dockerfile.worker'), 'utf8');
  assert.match(text, new RegExp(NODE_DIGEST.replace('.', '\\.')));
  assert.match(text, /node:24\.19\.0-bookworm-slim/);
  assert.match(text, /pnpm@11\.19\.0/);
  assert.match(text, /control-main\.js/);
  assert.match(text, /executor-main\.js/);
  assert.doesNotMatch(text, /\bCOPY\b[^\n]*\bcontent\//);
  assert.doesNotMatch(text, /\bARG\b[^\n]*(SECRET|TOKEN|PASSWORD|KEY)/i);
  assert.doesNotMatch(text, /DATABASE_URL|POSTGRES_URL|PGPASSWORD/);
});

test('images.pin matches Dockerfile base digest', () => {
  const pin = Object.fromEntries(
    readFileSync(join(appReleaseDir, 'images.pin'), 'utf8')
      .trim()
      .split('\n')
      .map((line) => line.split('=', 2)),
  );
  const dockerfile = readFileSync(join(appReleaseDir, 'Dockerfile.api'), 'utf8');
  assert.equal(pin.NODE_DIGEST, NODE_DIGEST);
  assert.match(dockerfile, new RegExp(pin.NODE_DIGEST.replace('.', '\\.')));
});

test('Dockerfile.web pins Node, binds Pod-wide, and targets lab Nest Service', () => {
  const text = readFileSync(join(appReleaseDir, 'Dockerfile.web'), 'utf8');
  assert.match(text, new RegExp(NODE_DIGEST.replace('.', '\\.')));
  assert.match(text, /node:24\.19\.0-bookworm-slim/);
  assert.match(text, /pnpm@11\.19\.0/);
  assert.doesNotMatch(text, /\bCOPY\b[^\n]*\bcontent\//);
  assert.doesNotMatch(text, /\bARG\b[^\n]*(SECRET|TOKEN|PASSWORD|KEY)/i);

  const runner = text.slice(text.indexOf('FROM base AS runner'));
  assert.match(runner, /HOSTNAME=0\.0\.0\.0/);
  assert.match(
    runner,
    new RegExp(
      `ENV API_PROXY_ORIGIN=${LAB_NEST_SERVICE_ORIGIN.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`,
    ),
  );
  assert.match(
    runner,
    new RegExp(
      `ENV API_INTERNAL_ORIGIN=${LAB_NEST_SERVICE_ORIGIN.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`,
    ),
  );
  assert.doesNotMatch(runner, /127\.0\.0\.1|localhost/i);

  const webPkg = readFileSync(
    join(repoRoot, 'apps/web/package.json'),
    'utf8',
  );
  assert.match(webPkg, /"dev":\s*"[^"]*127\.0\.0\.1/);
  assert.match(webPkg, /"start":\s*"[^"]*127\.0\.0\.1/);
});