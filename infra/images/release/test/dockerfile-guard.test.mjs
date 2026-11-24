import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { LAB_NEST_SERVICE_ORIGIN } from '../release-service-origin.mjs';

const appReleaseDir = dirname(dirname(fileURLToPath(import.meta.url)));
const commonDir = join(appReleaseDir, '../common');
const repoRoot = join(appReleaseDir, '../../..');
const NODE_DIGEST =
  'sha256:a9f5f7c91a432850b2a8a7797adf5eadb6c733ceed61167806cee7ea7fbc29df';

function toolchainResolved() {
  const pin = Object.fromEntries(
    readFileSync(join(commonDir, 'toolchain.pin'), 'utf8')
      .trim()
      .split('\n')
      .map((line) => line.split('=', 2)),
  );
  return `${pin.NODE_IMAGE}@${pin.NODE_DIGEST}`;
}

function assertArgPlumbing(text, { targets = [] } = {}) {
  assert.match(text, /^ARG NODE_IMAGE$/m);
  assert.match(text, /^ARG PNPM_VERSION$/m);
  assert.doesNotMatch(text, /^FROM docker\.io\/library\/node/m);
  assert.match(text, /^FROM \$\{NODE_IMAGE\}/m);
  assert.match(text, /corepack prepare pnpm@\$\{PNPM_VERSION\}/);
  for (const target of targets) {
    assert.match(text, new RegExp(`FROM runtime-base AS ${target}`));
  }
}

test('release service Dockerfile keeps API and authority runtime invariants', () => {
  const text = readFileSync(join(appReleaseDir, 'Dockerfile.services'), 'utf8');
  assertArgPlumbing(text, { targets: ['api', 'game-authority', 'worker'] });
  const api = text.slice(text.indexOf('FROM runtime-base AS api'));
  const authority = text.slice(
    text.indexOf('FROM runtime-base AS game-authority'),
    text.indexOf('FROM runtime-base AS worker'),
  );
  for (const section of [api, authority]) {
    assert.doesNotMatch(section, /\bCOPY\b[^\n]*\bcontent\//);
    assert.doesNotMatch(section, /\bARG\b[^\n]*(SECRET|TOKEN|PASSWORD|KEY)/i);
    assert.match(section, /0\.0\.0\.0/);
    assert.match(section, /release-process-env-shim\.mjs/);
    assert.match(section, /USER node/);
  }
});

test('Dockerfile.services worker target pins toolchain args and has no database URL', () => {
  const text = readFileSync(join(appReleaseDir, 'Dockerfile.services'), 'utf8');
  const worker = text.slice(text.indexOf('FROM runtime-base AS worker'));
  assert.match(worker, /control-main\.js/);
  assert.match(worker, /executor-main\.js/);
  assert.doesNotMatch(worker, /\bCOPY\b[^\n]*\bcontent\//);
  assert.doesNotMatch(worker, /\bARG\b[^\n]*(SECRET|TOKEN|PASSWORD|KEY)/i);
  assert.doesNotMatch(worker, /DATABASE_URL|POSTGRES_URL|PGPASSWORD/);
  assert.match(worker, /test ! -e content/);
  assert.match(worker, /USER node/);
});

test('toolchain.pin matches builders and recipes consume ARG plumbing', () => {
  const resolved = toolchainResolved();
  assert.match(resolved, new RegExp(NODE_DIGEST.replace('.', '\\.')));
  for (const name of ['Dockerfile.services', 'Dockerfile.web']) {
    const dockerfile = readFileSync(join(appReleaseDir, name), 'utf8');
    assertArgPlumbing(dockerfile);
  }
  const dev = readFileSync(join(repoRoot, 'infra/images/development/Dockerfile'), 'utf8');
  assertArgPlumbing(dev);
  const lib = readFileSync(join(appReleaseDir, 'lib-build.sh'), 'utf8');
  assert.match(lib, /--build-arg "NODE_IMAGE=\$\{TOOLCHAIN_NODE_IMAGE\}"/);
  assert.match(lib, /--build-arg "PNPM_VERSION=\$\{PNPM_VERSION\}"/);
  assert.match(lib, /--target "\$image"/);
});

test('Dockerfile.web binds Pod-wide and targets lab Nest Service', () => {
  const text = readFileSync(join(appReleaseDir, 'Dockerfile.web'), 'utf8');
  assertArgPlumbing(text);
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